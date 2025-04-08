#define DUCKDB_EXTENSION_MAIN

#include <duckdb.hpp>
#include <duckdb/common/string_util.hpp>

#include "http_server.hpp"
#include "settings.hpp"
#include "state.hpp"
#include "ui_extension.hpp"
#include "utils/env.hpp"
#include "utils/helpers.hpp"
#include "version.hpp"

#ifdef _WIN32
#define OPEN_COMMAND "start"
#elif __linux__
#define OPEN_COMMAND "xdg-open"
#else
#define OPEN_COMMAND "open"
#endif

namespace duckdb {

std::string StartUIFunction(ClientContext &context) {
  if (!ui::HttpServer::Started() &&
      ui::HttpServer::IsRunningOnMachine(context)) {
    return "UI already running in a different DuckDB instance";
  }

  const auto &server = ui::HttpServer::Start(context);
  const auto local_url = server.LocalUrl();

  const auto command = StringUtil::Format("%s %s", OPEN_COMMAND, local_url);
  return system(command.c_str())
             ? StringUtil::Format("Navigate browser to %s",
                                  local_url) // open command failed
             : StringUtil::Format("UI started at %s", local_url);
}

std::string StartUIServerFunction(ClientContext &context) {
  if (!ui::HttpServer::Started() &&
      ui::HttpServer::IsRunningOnMachine(context)) {
    return "UI already running in a different DuckDB instance";
  }

  bool was_started = false;
  const auto &server = ui::HttpServer::Start(context, &was_started);
  const char *already = was_started ? "already " : "";
  return StringUtil::Format("UI server %sstarted at %s", already,
                            server.LocalUrl());
}

std::string StopUIServerFunction(ClientContext &context) {
  return ui::HttpServer::Stop() ? "UI server stopped"
                                : "UI server already stopped";
}

std::string GetUIURLFunction(ClientContext &context) {
  if (!ui::HttpServer::Started()) {
    throw ExecutorException("UI server not started");
  }

  auto server = ui::HttpServer::GetInstance(context);
  return server->LocalUrl();
}

void IsUIStartedTableFunc(ClientContext &context, TableFunctionInput &input,
                          DataChunk &output) {
  if (!internal::ShouldRun(input)) {
    return;
  }

  output.SetCardinality(1);
  output.SetValue(0, 0, ui::HttpServer::Started());
}

void InitStorageExtension(duckdb::DatabaseInstance &db) {
  auto &config = db.config;
  auto ext = duckdb::make_uniq<duckdb::StorageExtension>();
  ext->storage_info = duckdb::make_uniq<UIStorageExtensionInfo>();
  config.storage_extensions[STORAGE_EXTENSION_KEY] = std::move(ext);
}

static void LoadInternal(DatabaseInstance &instance) {
  InitStorageExtension(instance);

  // If the server is already running we need to update the database instance
  // since the previous one was invalidated (eg. in the shell when we '.open'
  // a new database)
  ui::HttpServer::UpdateDatabaseInstanceIfRunning(instance.shared_from_this());

  auto &fs = FileSystem::GetFileSystem(instance);
  fs.CreateDirectory(fs.ExpandPath("~/.duckdb/extension_data"));
  fs.CreateDirectory(fs.ExpandPath("~/.duckdb/extension_data/ui"));

  auto &config = DBConfig::GetConfig(instance);
  {
    auto default_port = GetEnvOrDefaultInt(UI_LOCAL_PORT_SETTING_NAME,
                                           UI_LOCAL_PORT_SETTING_DEFAULT);
    config.AddExtensionOption(
        UI_LOCAL_PORT_SETTING_NAME, "Local port on which the UI server listens",
        LogicalType::USMALLINT, Value::USMALLINT(default_port));
  }

  {
    auto default_host = GetEnvOrDefault(UI_LOCAL_HOST_SETTING_NAME,
                                        UI_LOCAL_HOST_SETTING_DEFAULT);
    config.AddExtensionOption(UI_LOCAL_HOST_SETTING_NAME,
                              "Local host on which the UI server listens",
                              LogicalType::VARCHAR, Value(default_host));
  }

  {
    auto def = GetEnvOrDefault(UI_REMOTE_URL_SETTING_NAME,
                               UI_REMOTE_URL_SETTING_DEFAULT);
    config.AddExtensionOption(
        UI_REMOTE_URL_SETTING_NAME,
        "Remote URL to which the UI server forwards GET requests",
        LogicalType::VARCHAR, Value(def));
  }

  {
    auto def = GetEnvOrDefaultInt(UI_POLLING_INTERVAL_SETTING_NAME,
                                  UI_POLLING_INTERVAL_SETTING_DEFAULT);
    config.AddExtensionOption(
        UI_POLLING_INTERVAL_SETTING_NAME,
        "Period of time between UI polling requests (in ms)",
        LogicalType::UINTEGER, Value::UINTEGER(def));
  }

  REGISTER_TF("start_ui", StartUIFunction);
  REGISTER_TF("start_ui_server", StartUIServerFunction);
  REGISTER_TF("stop_ui_server", StopUIServerFunction);
  REGISTER_TF("get_ui_url", GetUIURLFunction);
  {
    TableFunction tf("ui_is_started", {}, IsUIStartedTableFunc,
                     internal::SingleBoolResultBind,
                     RunOnceTableFunctionState::Init);
    ExtensionUtil::RegisterFunction(instance, tf);
  }
}

void UiExtension::Load(DuckDB &db) { LoadInternal(*db.instance); }
std::string UiExtension::Name() { return "ui"; }

std::string UiExtension::Version() const { return UI_EXTENSION_VERSION; }

} // namespace duckdb

extern "C" {

DUCKDB_EXTENSION_API void ui_init(duckdb::DatabaseInstance &db) {
  duckdb::DuckDB db_wrapper(db);
  db_wrapper.LoadExtension<duckdb::UiExtension>();
}

DUCKDB_EXTENSION_API const char *ui_version() {
  return duckdb::DuckDB::LibraryVersion();
}
}

#ifndef DUCKDB_EXTENSION_MAIN
#error DUCKDB_EXTENSION_MAIN not defined
#endif
