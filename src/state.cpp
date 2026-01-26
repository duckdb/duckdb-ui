#include "state.hpp"

#include "utils/helpers.hpp"

#include <duckdb/main/database.hpp>

namespace duckdb {

UIStorageExtensionInfo &
UIStorageExtensionInfo::GetState(const DatabaseInstance &instance) {
  auto &config = instance.config;
#if DUCKDB_VERSION_AT_LEAST(1, 5, 0)
  auto ext = StorageExtension::Find(config, STORAGE_EXTENSION_KEY);
  if (!ext) {
    throw std::runtime_error("Fatal error: couldn't find the extension state.");
  }
  return *static_cast<UIStorageExtensionInfo *>(ext->storage_info.get());
#else
  auto it = config.storage_extensions.find(STORAGE_EXTENSION_KEY);
  if (it == config.storage_extensions.end()) {
    throw std::runtime_error("Fatal error: couldn't find the extension state.");
  }
  return *static_cast<UIStorageExtensionInfo *>(it->second->storage_info.get());
#endif
}

shared_ptr<Connection>
UIStorageExtensionInfo::FindConnection(const std::string &connection_name) {
  if (connection_name.empty()) {
    return nullptr;
  }

  // Need to protect access to the connections map because this can be called
  // from multiple threads.
  std::lock_guard<std::mutex> guard(connections_mutex);

  auto result = connections.find(connection_name);
  if (result != connections.end()) {
    return result->second;
  }

  return nullptr;
}

shared_ptr<Connection> UIStorageExtensionInfo::FindOrCreateConnection(
    DatabaseInstance &db, const std::string &connection_name) {
  if (connection_name.empty()) {
    // If no connection name was provided, create and return a new connection
    // but don't remember it.
    return make_shared_ptr<Connection>(db);
  }

  // If an existing connection with the provided name was found, return it.
  auto connection = FindConnection(connection_name);
  if (connection) {
    return connection;
  }

  // Otherwise, create a new one, remember it, and return it.
  auto new_con = make_shared_ptr<Connection>(db);

  // Need to protect access to the connections map because this can be called
  // from multiple threads.
  std::lock_guard<std::mutex> guard(connections_mutex);
  connections[connection_name] = new_con;
  return new_con;
}

} // namespace duckdb
