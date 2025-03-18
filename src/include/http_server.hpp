#pragma once

#include <duckdb.hpp>

#define CPPHTTPLIB_OPENSSL_SUPPORT
#include "httplib.hpp"

#include <memory>
#include <string>
#include <thread>

#include "event_dispatcher.hpp"
#include "watcher.hpp"

namespace httplib = duckdb_httplib_openssl;

namespace duckdb {
class MemoryStream;

namespace ui {

class HttpServer {

public:
  HttpServer(shared_ptr<DatabaseInstance> _ddb_instance)
      : ddb_instance(_ddb_instance) {}

  static HttpServer *GetInstance(ClientContext &);
  static void UpdateDatabaseInstanceIfRunning(shared_ptr<DatabaseInstance>);
  static bool IsRunningOnMachine(ClientContext &);
  static bool Started();
  static void StopInstance();

  static const HttpServer &Start(ClientContext &, bool *was_started = nullptr);
  static bool Stop();

  std::string LocalUrl() const;

private:
  friend class Watcher;

  // Lifecycle
  void DoStart(const uint16_t local_port, const std::string &local_host,
               const std::string &remote_url);
  void DoStop();
  void Run();
  void UpdateDatabaseInstance(shared_ptr<DatabaseInstance> context_db);

  // Http handlers
  void HandleGetInfo(const httplib::Request &req, httplib::Response &res);
  void HandleGetLocalEvents(const httplib::Request &req,
                            httplib::Response &res);
  void HandleGetLocalToken(const httplib::Request &req, httplib::Response &res);
  void HandleGet(const httplib::Request &req, httplib::Response &res);
  void HandleInterrupt(const httplib::Request &req, httplib::Response &res);
  void DoHandleRun(const httplib::Request &req, httplib::Response &res,
                   const httplib::ContentReader &content_reader);
  void HandleRun(const httplib::Request &req, httplib::Response &res,
                 const httplib::ContentReader &content_reader);
  void HandleTokenize(const httplib::Request &req, httplib::Response &res,
                      const httplib::ContentReader &content_reader);
  std::string ReadContent(const httplib::ContentReader &content_reader);

  // Http responses
  void SetResponseContent(httplib::Response &res, const MemoryStream &content);
  void SetResponseEmptyResult(httplib::Response &res);
  void SetResponseErrorResult(httplib::Response &res, const std::string &error);

  // Misc
  shared_ptr<DatabaseInstance> LockDatabaseInstance();

  uint16_t local_port;
  std::string local_host;
  std::string local_url;
  std::string remote_url;
  weak_ptr<DatabaseInstance> ddb_instance;
  std::string user_agent;
  httplib::Server server;
  unique_ptr<std::thread> main_thread;
  unique_ptr<EventDispatcher> event_dispatcher;
  unique_ptr<Watcher> watcher;

  static unique_ptr<HttpServer> server_instance;
};
;

} // namespace ui
} // namespace duckdb
