#define CPPHTTPLIB_OPENSSL_SUPPORT
#include "httplib.hpp"

using namespace duckdb_httplib_openssl;

int main() {
  Client client("https://ui.duckdb.org");
  auto res = client.Get("/");
  if (res) {
    std::cout << "Status: " << res->status << std::endl;
    std::cout << "Body: " << res->body.substr(0, 42) << "... (" << res->body.size() << ")" << std::endl;
  } else {
    std::cout << "Error: " << res.error() << std::endl;
  }
  return 0;
}