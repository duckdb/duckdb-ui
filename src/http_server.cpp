#include "http_server.hpp"

#include "event_dispatcher.hpp"
#include "settings.hpp"
#include "state.hpp"
#include "utils/encoding.hpp"
#include "utils/env.hpp"
#include "utils/md_helpers.hpp"
#include "utils/serialization.hpp"
#include "version.hpp"
#include "watcher.hpp"
#include <duckdb/common/serializer/binary_serializer.hpp>
#include <duckdb/common/serializer/memory_stream.hpp>
#include <duckdb/main/attached_database.hpp>
#include <duckdb/parser/parser.hpp>

namespace duckdb {
namespace ui {

unique_ptr<HttpServer> HttpServer::server_instance;

HttpServer *HttpServer::GetInstance(ClientContext &context) {
  if (server_instance) {
    // We already have an instance, make sure we're running on the right DB
    server_instance->UpdateDatabaseInstance(context.db);
  } else {
    server_instance = make_uniq<HttpServer>(context.db);
    std::atexit(HttpServer::StopInstance);
  }
  return server_instance.get();
}

void HttpServer::UpdateDatabaseInstanceIfRunning(
    shared_ptr<DatabaseInstance> db) {
  if (server_instance) {
    server_instance->UpdateDatabaseInstance(db);
  }
}

void HttpServer::UpdateDatabaseInstance(
    shared_ptr<DatabaseInstance> context_db) {
  const auto current_db = server_instance->LockDatabaseInstance();
  if (current_db == context_db) {
    return;
  }

  bool has_watcher = !!server_instance->watcher;
  if (has_watcher) {
    server_instance->watcher->Stop();
    server_instance->watcher = nullptr;
  }

  server_instance->ddb_instance = context_db;

  if (has_watcher) {
    server_instance->watcher = make_uniq<Watcher>(*this);
    server_instance->watcher->Start();
  }
}

bool HttpServer::IsRunningOnMachine(ClientContext &context) {
  if (Started()) {
    return true;
  }

  const auto local_port = GetLocalPort(context);
  const auto local_host = GetLocalHost(context);
  auto local_url = StringUtil::Format("http://%s:%d", local_host, local_port);

  httplib::Client client(local_url);
  return client.Get("/info");
}

bool HttpServer::Started() {
  return server_instance && server_instance->main_thread;
}

void HttpServer::StopInstance() {
  if (Started()) {
    server_instance->DoStop();
  }
}

const HttpServer &HttpServer::Start(ClientContext &context, bool *was_started) {
  if (Started()) {
    if (was_started) {
      *was_started = true;
    }
    return *GetInstance(context);
  }

  if (was_started) {
    *was_started = false;
  }

  const auto remote_url = GetRemoteUrl(context);
  const auto port = GetLocalPort(context);
  const auto host = GetLocalHost(context);
  auto server = GetInstance(context);
  server->DoStart(port, host, remote_url);
  return *server;
}

void HttpServer::DoStart(const uint16_t _local_port,
                         const std::string &_local_host,
                         const std::string &_remote_url) {
  if (Started()) {
    throw std::runtime_error("HttpServer already started");
  }

  local_port = _local_port;
  local_host = _local_host;
  local_url = StringUtil::Format("http://%s:%d", local_host, local_port);
  remote_url = _remote_url;
  user_agent =
      StringUtil::Format("duckdb-ui/%s-%s(%s)", DuckDB::LibraryVersion(),
                         UI_EXTENSION_VERSION, DuckDB::Platform());
  event_dispatcher = make_uniq<EventDispatcher>();
  main_thread = make_uniq<std::thread>(&HttpServer::Run, this);
  watcher = make_uniq<Watcher>(*this);
  watcher->Start();
}

bool HttpServer::Stop() {
  if (!Started()) {
    return false;
  }

  server_instance->DoStop();
  return true;
}

void HttpServer::DoStop() {
  if (event_dispatcher) {
    event_dispatcher->Close();
    event_dispatcher = nullptr;
  }
  server.stop();

  if (watcher) {
    watcher->Stop();
    watcher = nullptr;
  }

  if (main_thread) {
    main_thread->join();
    main_thread.reset();
  }

  ddb_instance.reset();
  remote_url = "";
  local_port = 0;
  local_host = "";
}

std::string HttpServer::LocalUrl() const {
  return StringUtil::Format("http://%s:%d/", local_host, local_port);
}

shared_ptr<DatabaseInstance> HttpServer::LockDatabaseInstance() {
  return ddb_instance.lock();
}

void HttpServer::Run() {
  server.Get("/info", [&](const httplib::Request &req, httplib::Response &res) {
    HandleGetInfo(req, res);
  });
  server.Get("/localEvents",
             [&](const httplib::Request &req, httplib::Response &res) {
               HandleGetLocalEvents(req, res);
             });
  server.Get("/localToken",
             [&](const httplib::Request &req, httplib::Response &res) {
               HandleGetLocalToken(req, res);
             });
  server.Get("/.*", [&](const httplib::Request &req, httplib::Response &res) {
    HandleGet(req, res);
  });
  server.Post("/ddb/interrupt",
              [&](const httplib::Request &req, httplib::Response &res) {
                HandleInterrupt(req, res);
              });
  server.Post("/ddb/run",
              [&](const httplib::Request &req, httplib::Response &res,
                  const httplib::ContentReader &content_reader) {
                HandleRun(req, res, content_reader);
              });
  server.Post("/ddb/tokenize",
              [&](const httplib::Request &req, httplib::Response &res,
                  const httplib::ContentReader &content_reader) {
                HandleTokenize(req, res, content_reader);
              });
  server.listen(local_host, local_port);
}

void HttpServer::HandleGetInfo(const httplib::Request &req,
                               httplib::Response &res) {
  res.set_header("Access-Control-Allow-Origin", "*");
  res.set_header("X-DuckDB-Version", DuckDB::LibraryVersion());
  res.set_header("X-DuckDB-Platform", DuckDB::Platform());
  res.set_header("X-DuckDB-UI-Extension-Version", UI_EXTENSION_VERSION);
  res.set_content("", "text/plain");
}

void HttpServer::HandleGetLocalEvents(const httplib::Request &req,
                                      httplib::Response &res) {
  res.set_chunked_content_provider(
      "text/event-stream", [&](size_t /*offset*/, httplib::DataSink &sink) {
        if (event_dispatcher->WaitEvent(&sink)) {
          return true;
        }

        sink.done();
        return false;
      });
}

void HttpServer::HandleGetLocalToken(const httplib::Request &req,
                                     httplib::Response &res) {
  // GET requests don't include Origin, so use Referer instead.
  // Referer includes the path, so only compare the start.
  auto referer = req.get_header_value("Referer");
  if (referer.compare(0, local_url.size(), local_url) != 0) {
    res.status = 401;
    return;
  }

  auto db = ddb_instance.lock();
  if (!db) {
    res.status = 500;
    res.set_content("Database was invalidated, UI needs to be restarted",
                    "text/plain");
    return;
  }

  Connection connection{*db};
  try {
    auto token = GetMDToken(connection);
    res.status = 200;
    res.set_content(token, "text/plain");
  } catch (std::exception &ex) {
    res.status = 500;
    res.set_content("Could not get token: " + std::string(ex.what()),
                    "text/plain");
  }
}

void HttpServer::HandleGet(const httplib::Request &req,
                           httplib::Response &res) {
  // Create HTTP client to remote URL
  // TODO: Can this be created once and shared?
  httplib::Client client(remote_url);
  client.set_keep_alive(true);

  // Provide a way to turn on or off server certificate verification, at least
  // for now, because it requires httplib to correctly get the root certficates
  // on each platform, which doesn't appear to always work. Currently, default
  // to no verification, until we understand when it breaks things.
  if (IsEnvEnabled("ui_enable_server_certificate_verification")) {
    client.enable_server_certificate_verification(true);
  } else {
    client.enable_server_certificate_verification(false);
  }

  // forward GET to remote URL
  auto result = client.Get(req.path, req.params, {{"User-Agent", user_agent}});
  if (!result) {
    res.status = 500;
    return;
  }

  // Repond with result of forwarded GET
  res = result.value();

  // If this is the config request, return additional information.
  if (req.path == "/config") {
    res.set_header("X-DuckDB-Version", DuckDB::LibraryVersion());
    res.set_header("X-DuckDB-Platform", DuckDB::Platform());
    // The UI looks for this to select the appropriate DuckDB mode (HTTP or
    // Wasm).
    res.set_header("X-DuckDB-UI-Extension-Version", UI_EXTENSION_VERSION);
  }
}

void HttpServer::HandleInterrupt(const httplib::Request &req,
                                 httplib::Response &res) {
  auto origin = req.get_header_value("Origin");
  if (origin != local_url) {
    res.status = 401;
    return;
  }

  auto description = req.get_header_value("X-DuckDB-UI-Request-Description");

  auto connection_name = req.get_header_value("X-DuckDB-UI-Connection-Name");

  auto db = ddb_instance.lock();
  if (!db) {
    res.status = 404;
    return;
  }

  auto connection =
      UIStorageExtensionInfo::GetState(*db).FindConnection(connection_name);
  if (!connection) {
    res.status = 404;
    return;
  }

  connection->Interrupt();

  SetResponseEmptyResult(res);
}

void HttpServer::HandleRun(const httplib::Request &req, httplib::Response &res,
                           const httplib::ContentReader &content_reader) {
  try {
    DoHandleRun(req, res, content_reader);
  } catch (const std::exception &ex) {
    SetResponseErrorResult(res, ex.what());
  }
}

void HttpServer::DoHandleRun(const httplib::Request &req,
                             httplib::Response &res,
                             const httplib::ContentReader &content_reader) {
  auto origin = req.get_header_value("Origin");
  if (origin != local_url) {
    res.status = 401;
    return;
  }

  auto description = req.get_header_value("X-DuckDB-UI-Request-Description");

  auto connection_name = req.get_header_value("X-DuckDB-UI-Connection-Name");

  auto database_name =
      DecodeBase64(req.get_header_value("X-DuckDB-UI-Database-Name"));

  std::vector<std::string> parameter_values;
  auto parameter_count_string =
      req.get_header_value("X-DuckDB-UI-Parameter-Count");
  if (!parameter_count_string.empty()) {
    auto parameter_count = std::stoi(parameter_count_string);
    for (idx_t i = 0; i < parameter_count; ++i) {
      auto parameter_value = DecodeBase64(req.get_header_value(
          StringUtil::Format("X-DuckDB-UI-Parameter-Value-%d", i)));
      parameter_values.push_back(parameter_value);
    }
  }

  std::string content = ReadContent(content_reader);

  auto db = ddb_instance.lock();
  if (!db) {
    SetResponseErrorResult(
        res, "Database was invalidated, UI needs to be restarted");
    return;
  }

  auto connection =
      UIStorageExtensionInfo::GetState(*db).FindOrCreateConnection(
          *db, connection_name);

  // Set current database if optional header is provided.
  if (!database_name.empty()) {
    auto &context = *connection->context;
    context.RunFunctionInTransaction([&] {
      auto &manager = context.db->GetDatabaseManager();
      manager.SetDefaultDatabase(context, database_name);
    });
  }

  // We use a pending query so we can execute tasks and fetch chunks
  // incrementally. This enables cancellation.
  unique_ptr<PendingQueryResult> pending;

  // Create pending query, with request content as SQL.
  if (parameter_values.size() > 0) {
    auto prepared = connection->Prepare(content);
    if (prepared->HasError()) {
      SetResponseErrorResult(res, prepared->GetError());
      return;
    }

    vector<Value> values;
    for (auto &parameter_value : parameter_values) {
      // TODO: support non-string parameters?
      values.push_back(Value(parameter_value));
    }
    pending = prepared->PendingQuery(values, true);
  } else {
    pending = connection->PendingQuery(content, true);
  }

  if (pending->HasError()) {
    SetResponseErrorResult(res, pending->GetError());
    return;
  }

  // Execute tasks until result is ready (or there's an error).
  auto exec_result = PendingExecutionResult::RESULT_NOT_READY;
  while (!PendingQueryResult::IsResultReady(exec_result)) {
    exec_result = pending->ExecuteTask();
    if (exec_result == PendingExecutionResult::BLOCKED ||
        exec_result == PendingExecutionResult::NO_TASKS_AVAILABLE) {
      std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }
  }

  switch (exec_result) {

  case PendingExecutionResult::EXECUTION_ERROR:
    SetResponseErrorResult(res, pending->GetError());
    break;

  case PendingExecutionResult::EXECUTION_FINISHED:
  case PendingExecutionResult::RESULT_READY: {
    // Get the result. This should be quick because it's ready.
    auto result = pending->Execute();

    // Fetch the chunks and serialize the result.
    SuccessResult success_result;
    success_result.column_names_and_types = {std::move(result->names),
                                             std::move(result->types)};

    // TODO: support limiting the number of chunks fetched
    auto chunk = result->Fetch();
    while (chunk) {
      success_result.chunks.push_back(
          {static_cast<uint16_t>(chunk->size()), std::move(chunk->data)});
      chunk = result->Fetch();
    }

    MemoryStream success_response_content;
    BinarySerializer::Serialize(success_result, success_response_content);
    SetResponseContent(res, success_response_content);
    break;
  }
  default:
    SetResponseErrorResult(res, "Unexpected PendingExecutionResult");
    break;
  }
}

void HttpServer::HandleTokenize(const httplib::Request &req,
                                httplib::Response &res,
                                const httplib::ContentReader &content_reader) {
  auto origin = req.get_header_value("Origin");
  if (origin != local_url) {
    res.status = 401;
    return;
  }

  auto description = req.get_header_value("X-DuckDB-UI-Request-Description");

  std::string content = ReadContent(content_reader);

  auto tokens = Parser::Tokenize(content);

  // Read and serialize result
  TokenizeResult result;
  result.offsets.reserve(tokens.size());
  result.types.reserve(tokens.size());

  for (auto token : tokens) {
    result.offsets.push_back(token.start);
    result.types.push_back(token.type);
  }

  MemoryStream response_content;
  BinarySerializer::Serialize(result, response_content);
  SetResponseContent(res, response_content);
}

std::string
HttpServer::ReadContent(const httplib::ContentReader &content_reader) {
  std::ostringstream oss;
  content_reader([&](const char *data, size_t data_length) {
    oss.write(data, data_length);
    return true;
  });
  return oss.str();
}

void HttpServer::SetResponseContent(httplib::Response &res,
                                    const MemoryStream &content) {
  auto data = content.GetData();
  auto length = content.GetPosition();
  res.set_content(reinterpret_cast<const char *>(data), length,
                  "application/octet-stream");
}

void HttpServer::SetResponseEmptyResult(httplib::Response &res) {
  EmptyResult empty_result;
  MemoryStream response_content;
  BinarySerializer::Serialize(empty_result, response_content);
  SetResponseContent(res, response_content);
}

void HttpServer::SetResponseErrorResult(httplib::Response &res,
                                        const std::string &error) {
  ErrorResult error_result;
  error_result.error = error;
  MemoryStream response_content;
  BinarySerializer::Serialize(error_result, response_content);
  SetResponseContent(res, response_content);
}

} // namespace ui
} // namespace duckdb
