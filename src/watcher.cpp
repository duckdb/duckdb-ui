#include "watcher.hpp"

#include <duckdb/main/attached_database.hpp>

#include "utils/md_helpers.hpp"
#include "http_server.hpp"
#include "settings.hpp"

namespace duckdb {
namespace ui {

Watcher::Watcher(HttpServer &_server) : should_run(false), server(_server) {}

bool WasCatalogUpdated(DatabaseInstance &db, Connection &connection,
                       CatalogState &last_state) {
  bool has_change = false;
  auto &context = *connection.context;
  connection.BeginTransaction();

  const auto &databases = db.GetDatabaseManager().GetDatabases(context);
  std::set<idx_t> db_oids;

  // Check currently attached databases
  for (const auto &db_ref : databases) {
    auto &db = db_ref.get();
    if (db.IsTemporary()) {
      continue; // ignore temp databases
    }

    db_oids.insert(db.oid);
    auto &catalog = db.GetCatalog();
    auto current_version = catalog.GetCatalogVersion(context);
    auto last_version_it = last_state.db_to_catalog_version.find(db.oid);
    if (last_version_it == last_state.db_to_catalog_version.end() // first time
        || !(last_version_it->second == current_version)) {       // updated
      has_change = true;
      last_state.db_to_catalog_version[db.oid] = current_version;
    }
  }

  // Now check if any databases have been detached
  for (auto it = last_state.db_to_catalog_version.begin();
       it != last_state.db_to_catalog_version.end();) {
    if (db_oids.find(it->first) == db_oids.end()) {
      has_change = true;
      it = last_state.db_to_catalog_version.erase(it);
    } else {
      ++it;
    }
  }

  connection.Rollback();
  return has_change;
}

void Watcher::Watch() {
  CatalogState last_state;
  bool is_md_connected = false;
  while (should_run) {
    auto db = server.LockDatabaseInstance();
    if (!db) {
      break; // DB went away, nothing to watch
    }

	if (watched_database == nullptr) {
	  watched_database = db.get();
	} else if (watched_database != db.get()) {
	  break; // DB changed, stop watching, will be restarted
	}

    duckdb::Connection con{*db};
    auto polling_interval = GetPollingInterval(*con.context);
    if (polling_interval == 0) {
      return; // Disable watcher
    }

    try {
      if (WasCatalogUpdated(*db, con, last_state)) {
        server.event_dispatcher->SendCatalogChangedEvent();
      }

      if (!is_md_connected && IsMDConnected(con)) {
        is_md_connected = true;
        server.event_dispatcher->SendConnectedEvent(GetMDToken(con));
      }
    } catch (std::exception &ex) {
      // Do not crash with uncaught exception, but quit.
      std::cerr << "Error in watcher: " << ex.what() << std::endl;
      std::cerr << "Will now terminate." << std::endl;
      return;
    }

    {
      std::unique_lock<std::mutex> lock(mutex);
      cv.wait_for(lock, std::chrono::milliseconds(polling_interval));
    }
  }
}

void Watcher::Start() {
  {
    std::lock_guard<std::mutex> guard(mutex);
    should_run = true;
  }

  if (!thread) {
    thread = make_uniq<std::thread>(&Watcher::Watch, this);
  }
}

void Watcher::Stop() {
  if (!thread) {
    return;
  }

  {
    std::lock_guard<std::mutex> guard(mutex);
    should_run = false;
  }
  cv.notify_all();
  thread->join();
  thread.reset();
}

} // namespace ui
} // namespace duckdb
