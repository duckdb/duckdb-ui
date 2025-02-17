#define DUCKDB_EXTENSION_MAIN

#include "utils/env.hpp"
#include "utils/helpers.hpp"
#include "ui_extension.hpp"
#include "http_server.hpp"
#include <duckdb.hpp>
#include <duckdb/common/string_util.hpp>

#ifdef _WIN32
#define OPEN_COMMAND "start"
#elif __linux__
#define OPEN_COMMAND "xdg-open"
#else
#define OPEN_COMMAND "open"
#endif

#define UI_LOCAL_PORT_SETTING_NAME        "ui_local_port"
#define UI_LOCAL_PORT_SETTING_DESCRIPTION "Local port on which the UI server listens"
#define UI_LOCAL_PORT_SETTING_DEFAULT     4213

#define UI_REMOTE_URL_SETTING_NAME        "ui_remote_url"
#define UI_REMOTE_URL_SETTING_DESCRIPTION "Remote URL to which the UI server forwards GET requests"
#define UI_REMOTE_URL_SETTING_DEFAULT     "https://app.motherduck.com"

namespace duckdb {

namespace internal {

bool StartHttpServer(const ClientContext &context) {
	const auto url = GetSetting<std::string>(context, UI_REMOTE_URL_SETTING_NAME,
		GetEnvOrDefault(UI_REMOTE_URL_SETTING_NAME, UI_REMOTE_URL_SETTING_DEFAULT));
	const uint16_t port = GetSetting(context, UI_LOCAL_PORT_SETTING_NAME, UI_LOCAL_PORT_SETTING_DEFAULT);;
	return ui::HttpServer::instance()->Start(port, url, context.db);
}

std::string GetHttpServerLocalURL() {
	return StringUtil::Format("http://localhost:%d/", ui::HttpServer::instance()->LocalPort());
}

} // namespace internal

void OutputResult(const std::string &result, DataChunk &out_chunk) {
	out_chunk.SetCardinality(1);
	out_chunk.SetValue(0, 0, result);
}

void StartUIFunction(ClientContext &context, TableFunctionInput &input,
							DataChunk &out_chunk) {
	if (!ShouldRun(input)) {
		return;
	}

	internal::StartHttpServer(context);
	auto local_url = internal::GetHttpServerLocalURL();

	const std::string command = StringUtil::Format("%s %s", OPEN_COMMAND, local_url);
	std::string result = system(command.c_str()) ?
		  StringUtil::Format("Navigate browser to %s", local_url) // open command failed
	 	: StringUtil::Format("MotherDuck UI started at %s", local_url);
	OutputResult(result, out_chunk);
}

void StartUIServerFunction(ClientContext &context, TableFunctionInput &input,
									DataChunk &out_chunk) {
	if (!ShouldRun(input)) {
		return;
	}

	const bool already = internal::StartHttpServer(context);
	const char* already_str = already ? "already " : "";
	auto result = StringUtil::Format("MotherDuck UI server %sstarted at %s", already_str, internal::GetHttpServerLocalURL());
	OutputResult(result, out_chunk);
}

void StopUIServerFunction(ClientContext &, TableFunctionInput &input,
									DataChunk &out_chunk) {
	if (!ShouldRun(input)) {
		return;
	}

	auto result = ui::HttpServer::instance()->Stop() ? "UI server stopped" : "UI server already stopped";
	OutputResult(result, out_chunk);
}

// FIXME
// void HandleConnected(const std::string &token) {
// 	ui::HttpServer::instance()->SendConnectedEvent(token);
// }

// FIXME
// void HandleCatalogChanged() {
// 	ui::HttpServer::instance()->SendCatalogChangedEvent();
// }

static void LoadInternal(DatabaseInstance &instance) {
    auto &config = DBConfig::GetConfig(instance);

	config.AddExtensionOption(UI_LOCAL_PORT_SETTING_NAME, UI_LOCAL_PORT_SETTING_DESCRIPTION,
								LogicalType::USMALLINT, Value::USMALLINT(UI_LOCAL_PORT_SETTING_DEFAULT));

	config.AddExtensionOption(
		UI_REMOTE_URL_SETTING_NAME, UI_REMOTE_URL_SETTING_DESCRIPTION, LogicalType::VARCHAR,
		Value(GetEnvOrDefault(UI_REMOTE_URL_SETTING_NAME, UI_REMOTE_URL_SETTING_DEFAULT)));

	RegisterTF(instance, "start_ui", StartUIFunction);
	RegisterTF(instance, "start_ui_server", StartUIServerFunction);
	RegisterTF(instance, "stop_ui_server", StopUIServerFunction);
}

void UiExtension::Load(DuckDB &db) {
	LoadInternal(*db.instance);
}
std::string UiExtension::Name() {
	return "ui";
}

std::string UiExtension::Version() const {
#ifdef EXT_VERSION_UI
	return EXT_VERSION_UI;
#else
	return "";
#endif
}

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
