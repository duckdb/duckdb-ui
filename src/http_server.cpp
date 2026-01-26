#include "http_server.hpp"

#include "event_dispatcher.hpp"
#include "settings.hpp"
#include "state.hpp"
#include "utils/encoding.hpp"
#include "utils/env.hpp"
#include "utils/helpers.hpp"
#include "utils/md_helpers.hpp"
#include "utils/serialization.hpp"
#include "version.hpp"
#include "watcher.hpp"

#if DUCKDB_VERSION_AT_LEAST(1, 5, 0)
#include <duckdb/common/enums/database_modification_type.hpp>
#include <duckdb/main/settings.hpp>
#endif
#include <duckdb/common/http_util.hpp>
#include <duckdb/common/serializer/binary_serializer.hpp>
#include <duckdb/common/serializer/memory_stream.hpp>
#include <duckdb/main/attached_database.hpp>
#include <duckdb/main/client_data.hpp>
#include <duckdb/parser/parsed_data/create_table_info.hpp>
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
  auto local_url = StringUtil::Format("http://localhost:%d", local_port);

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
  auto &http_util = HTTPUtil::Get(*context.db);
  // FIXME - https://github.com/duckdb/duckdb/pull/17655 will remove `unused`
  auto http_params = http_util.InitializeParameters(context, "unused");
  auto server = GetInstance(context);
  server->DoStart(port, remote_url, std::move(http_params));
  return *server;
}

void HttpServer::DoStart(const uint16_t _local_port,
                         const std::string &_remote_url,
                         unique_ptr<HTTPParams> _http_params) {
  if (Started()) {
    throw std::runtime_error("HttpServer already started");
  }

  local_port = _local_port;
  local_url = StringUtil::Format("http://localhost:%d", local_port);
  remote_url = _remote_url;
  http_params = std::move(_http_params);
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
  // First stop the watcher (since it needs a valid event dispatcher and server)
  if (watcher) {
    watcher->Stop();
    watcher = nullptr;
  }

  // Then, stop the event dispatcher
  if (event_dispatcher) {
    event_dispatcher->Close();
  }

  server.stop();

  if (main_thread) {
    main_thread->join();
    main_thread.reset();
  }

  ddb_instance.reset();
  http_params = nullptr;
  event_dispatcher = nullptr;
  remote_url = "";
  local_port = 0;
}

std::string HttpServer::LocalUrl() const {
  return StringUtil::Format("http://localhost:%d/", local_port);
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
  server.listen("localhost", local_port);
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
        if (event_dispatcher && event_dispatcher->WaitEvent(&sink)) {
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

// Adapted from
// https://github.com/duckdb/duckdb/blob/1f8b6839ea7864c3e3fb020574f67384cb58124c/src/main/http/http_util.cpp#L129-L147
// Which is not currently exposed.
void HttpServer::InitClientFromParams(httplib::Client &client) {
  auto sec = static_cast<time_t>(http_params->timeout);
  auto usec = static_cast<time_t>(http_params->timeout_usec);
  client.set_keep_alive(true);
  client.set_write_timeout(sec, usec);
  client.set_read_timeout(sec, usec);
  client.set_connection_timeout(sec, usec);

  if (!http_params->http_proxy.empty()) {
    client.set_proxy(http_params->http_proxy,
                     static_cast<int>(http_params->http_proxy_port));

    if (!http_params->http_proxy_username.empty()) {
      client.set_proxy_basic_auth(http_params->http_proxy_username,
                                  http_params->http_proxy_password);
    }
  }
}

void HttpServer::HandleGet(const httplib::Request &req,
                           httplib::Response &res) {
  // Create HTTP client to remote URL
  // TODO: Can this be created once and shared?
  httplib::Client client(remote_url);
  InitClientFromParams(client);

  if (IsEnvEnabled("ui_disable_server_certificate_verification")) {
    client.enable_server_certificate_verification(false);
  }

  httplib::Headers headers = {{"User-Agent", user_agent}};
  auto cookie = req.get_header_value("Cookie");
  if (!cookie.empty()) {
    headers.emplace("Cookie", cookie);
  }

  // forward GET to remote URL
  auto result = client.Get(req.path, req.params, headers);
  if (!result) {
    res.status = 500;
    res.set_content("Could not fetch: '" + req.path + "' from '" + remote_url +
                        "': " + to_string(result.error()),
                    "text/plain");
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

  // httplib will set Content-Length, remove it so it is not duplicated.
  res.headers.erase("Content-Length");
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

  auto database_name_option =
      DecodeBase64(req.get_header_value("X-DuckDB-UI-Database-Name"));
  auto schema_name_option =
      DecodeBase64(req.get_header_value("X-DuckDB-UI-Schema-Name"));

  std::vector<std::string> parameter_values;
  auto parameter_count_string =
      req.get_header_value("X-DuckDB-UI-Parameter-Count");
  if (!parameter_count_string.empty()) {
    auto parameter_count = std::stoi(parameter_count_string);
    for (auto i = 0; i < parameter_count; ++i) {
      auto parameter_value = DecodeBase64(req.get_header_value(
          StringUtil::Format("X-DuckDB-UI-Parameter-Value-%d", i)));
      parameter_values.push_back(parameter_value);
    }
  }

  // default to effectively no limit
  auto result_row_limit = INT_MAX;
  auto result_row_limit_string =
      req.get_header_value("X-DuckDB-UI-Result-Row-Limit");
  if (!result_row_limit_string.empty()) {
    result_row_limit = std::stoi(result_row_limit_string);
  }

  auto result_database_name_option =
      DecodeBase64(req.get_header_value("X-DuckDB-UI-Result-Database-Name"));
  auto result_schema_name_option =
      DecodeBase64(req.get_header_value("X-DuckDB-UI-Result-Schema-Name"));
  auto result_table_name =
      DecodeBase64(req.get_header_value("X-DuckDB-UI-Result-Table-Name"));

  // If no result table is specified, then the result table row limit is zero.
  // Otherwise, default to effectively no limit.
  auto result_table_row_limit = result_table_name.empty() ? 0 : INT_MAX;
  auto result_table_row_limit_string =
      req.get_header_value("X-DuckDB-UI-Result-Table-Row-Limit");
  // Only set the result table row limit if a result table name is specified.
  if (!result_table_name.empty() && !result_table_row_limit_string.empty()) {
    result_table_row_limit = std::stoi(result_table_row_limit_string);
  }

  auto errors_as_json_string =
      req.get_header_value("X-DuckDB-UI-Errors-As-JSON");

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
  auto &context = *connection->context;
  // Set errors_as_json
  if (!errors_as_json_string.empty()) {
#if DUCKDB_VERSION_AT_MOST(1, 4, 4)
	auto &config = ClientConfig::GetConfig(context);
    config.errors_as_json = errors_as_json_string == "true";
#else
	auto &config = DBConfig::GetConfig(context);
	config.user_settings.SetUserSetting(ErrorsAsJSONSetting::SettingIndex, true);
#endif
  }

  // Set current database & schema
  if (!database_name_option.empty() || !schema_name_option.empty()) {
    // It's fine if the database name is empty, but we need a valid schema name.
    auto schema_name =
        schema_name_option.empty() ? DEFAULT_SCHEMA : schema_name_option;
    context.RunFunctionInTransaction([&] {
      duckdb::ClientData::Get(context).catalog_search_path->Set(
          {database_name_option, schema_name},
          duckdb::CatalogSetPathType::SET_SCHEMA);
    });
  }

  vector<unique_ptr<SQLStatement>> statements;
  try {
    statements = connection->ExtractStatements(content);
  } catch (std::exception &ex) {
    ErrorData error(ex);
    SetResponseErrorResult(res, error.RawMessage());
    return;
  }

  auto statement_count = statements.size();

  if (statement_count == 0) {
    SetResponseErrorResult(res, "No statements");
    return;
  }

  // If there's more than one statement, run all but the last.
  if (statement_count > 1) {
    for (size_t i = 0; i < statement_count - 1; ++i) {
      auto pending = connection->PendingQuery(std::move(statements[i]), true);
      // Return any error found before execution.
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
      // Return any error found during execution.
      switch (exec_result) {
      case PendingExecutionResult::EXECUTION_ERROR:
        SetResponseErrorResult(res, pending->GetError());
        return;
      case PendingExecutionResult::EXECUTION_FINISHED:
      case PendingExecutionResult::RESULT_READY:
        // ignore the result
        pending->Execute();
        break;
      default:
        SetResponseErrorResult(
            res, StringUtil::Format("Unexpected PendingExecutionResult: %s",
                                    exec_result));
        return;
      }
    }
  }

  // Get the last statement.
  auto &statement_to_run = statements[statement_count - 1];

  // We use a pending query so we can execute tasks and fetch chunks
  // incrementally. This enables cancellation.
  unique_ptr<PendingQueryResult> pending;

  // Create pending query, with request content as SQL.
  if (parameter_values.size() > 0) {
    auto prepared = connection->Prepare(std::move(statement_to_run));
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
    pending = connection->PendingQuery(std::move(statement_to_run), true);
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

    // We use a separate connection for the appender, including creating the
    // result table, because we still need to fetch chunks from the pending
    // query on the user's connection.
    unique_ptr<duckdb::Connection> appender_connection;
    unique_ptr<duckdb::Appender> appender;

    if (!result_table_name.empty()) {
      auto result_database_name = result_database_name_option.empty()
                                      ? "memory"
                                      : result_database_name_option;
      auto result_schema_name = result_schema_name_option.empty()
                                    ? "main"
                                    : result_schema_name_option;

      auto result_table_info = make_uniq<duckdb::CreateTableInfo>(
          result_database_name, result_schema_name, result_table_name);
      for (idx_t i = 0; i < result->names.size(); i++) {
        result_table_info->columns.AddColumn(
            ColumnDefinition(result->names[i], result->types[i]));
      }

      appender_connection = make_uniq<duckdb::Connection>(*db);
      auto appender_context = appender_connection->context;
      appender_context->RunFunctionInTransaction([&] {
        auto &catalog = duckdb::Catalog::GetCatalog(*appender_context,
                                                    result_database_name);
#if DUCKDB_MAJOR_VERSION == 1 && DUCKDB_MINOR_VERSION == 5
        MetaTransaction::Get(*appender_context)
            .ModifyDatabase(catalog.GetAttached(),
                            DatabaseModificationType::CREATE_CATALOG_ENTRY);
#else
        MetaTransaction::Get(*appender_context)
            .ModifyDatabase(catalog.GetAttached());
#endif
        catalog.CreateTable(*appender_context, std::move(result_table_info));
      });

      appender = make_uniq<duckdb::Appender>(
          *appender_connection, result_database_name, result_schema_name,
          result_table_name);
    }

    // Fetch the chunks and serialize the result.
    SuccessResult success_result;
    success_result.column_names_and_types = {std::move(result->names),
                                             std::move(result->types)};

    auto row_limit = std::max(result_row_limit, result_table_row_limit);
    auto rows_fetched = 0;
    auto rows_appended = 0;
    auto rows_in_result = 0;
    unique_ptr<duckdb::DataChunk> chunk;
    while (rows_fetched < row_limit) {
      chunk = result->Fetch();
      if (!chunk) {
        break;
      }
      rows_fetched += chunk->size();
      if (appender && rows_appended < result_table_row_limit) {
        duckdb::DataChunk *chunk_to_append = chunk.get();
        duckdb::DataChunk chunk_prefix;
        const idx_t rows_left = result_table_row_limit - rows_appended;
        if (chunk->size() > rows_left) {
          HttpServer::CopyAndSlice(*chunk, chunk_prefix, rows_left);
          chunk_to_append = &chunk_prefix;
        }
        appender->AppendDataChunk(*chunk_to_append);
        rows_appended += chunk_to_append->size();
      }
      if (rows_in_result < result_row_limit) {
        duckdb::DataChunk *chunk_to_add = chunk.get();
        duckdb::DataChunk chunk_prefix;
        const idx_t rows_left = result_row_limit - rows_in_result;
        if (chunk->size() > rows_left) {
          HttpServer::CopyAndSlice(*chunk, chunk_prefix, rows_left);
          chunk_to_add = &chunk_prefix;
        }
        success_result.chunks.push_back(
            {static_cast<uint16_t>(chunk_to_add->size()),
             std::move(chunk_to_add->data)});
        rows_in_result += chunk_to_add->size();
      }
    }

    if (appender) {
      appender->Close();
    }

    MemoryStream success_response_content;
    BinarySerializer::Serialize(success_result, success_response_content);
    SetResponseContent(res, success_response_content);
    break;
  }
  default:
    SetResponseErrorResult(
        res, StringUtil::Format("Unexpected PendingExecutionResult: %s",
                                exec_result));
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

void HttpServer::CopyAndSlice(duckdb::DataChunk &source,
                              duckdb::DataChunk &target, idx_t row_count) {
  target.InitializeEmpty(source.GetTypes());
  target.Reference(source);
  target.Slice(0, row_count);
}

} // namespace ui
} // namespace duckdb
