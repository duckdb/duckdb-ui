#include "settings.hpp"

#include "utils/helpers.hpp"

#include <duckdb.hpp>
#if DUCKDB_VERSION_AT_LEAST(1, 5, 0)
#include <duckdb/main/settings.hpp>
#endif

namespace duckdb {

std::string GetRemoteUrl(const ClientContext &context) {
#if DUCKDB_VERSION_AT_LEAST(1, 5, 0)
  if (!Settings::Get<AllowUnsignedExtensionsSetting>(context)) {
#else
  if (!context.db->config.options.allow_unsigned_extensions) {
#endif
    return UI_REMOTE_URL_SETTING_DEFAULT;
  }
  return internal::GetSetting<std::string>(context, UI_REMOTE_URL_SETTING_NAME);
}

uint16_t GetLocalPort(const ClientContext &context) {
  return internal::GetSetting<uint16_t>(context, UI_LOCAL_PORT_SETTING_NAME);
}

uint32_t GetPollingInterval(const ClientContext &context) {
  return internal::GetSetting<uint32_t>(context,
                                        UI_POLLING_INTERVAL_SETTING_NAME);
}
} // namespace duckdb
