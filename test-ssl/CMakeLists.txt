cmake_minimum_required(VERSION 3.5...3.31.5)

find_package(OpenSSL REQUIRED)

project("Test ssl")
set(CMAKE_CXX_STANDARD 11)

add_definitions(-DNO_DUCKDB_RE2 -DCMAKE_BUILD_TYPE=Debug)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -O0")

include_directories(
    ${PROJECT_SOURCE_DIR}/../third_party/httplib
    ${PROJECT_SOURCE_DIR}/../duckdb/src/include)

add_executable("test_ssl" "test_ssl.cc")

target_link_libraries("test_ssl" OpenSSL::SSL OpenSSL::Crypto)

install(TARGETS "test_ssl")

# cmake -S . -G Ninja -B build && cmake --build build