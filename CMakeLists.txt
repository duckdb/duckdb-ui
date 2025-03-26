cmake_minimum_required(VERSION 3.5...3.31.5)

# Set extension name here
set(TARGET_NAME ui)

# DuckDB's extension distribution supports vcpkg. As such, dependencies can be
# added in ./vcpkg.json and then used in cmake with find_package. Feel free to
# remove or replace with other dependencies. Note that it should also be removed
# from vcpkg.json to prevent needlessly installing it..
find_package(OpenSSL REQUIRED)
include_directories(${OPENSSL_INCLUDE_DIR})

# mingw only?
set(OPENSSL_USE_STATIC_LIBS TRUE)

set(EXTENSION_NAME ${TARGET_NAME}_extension)

project(${TARGET_NAME})
include_directories(src/include ${PROJECT_SOURCE_DIR}/third_party/httplib)

set(EXTENSION_SOURCES
    src/event_dispatcher.cpp
    src/http_server.cpp
    src/settings.cpp
    src/state.cpp
    src/ui_extension.cpp
    src/utils/encoding.cpp
    src/utils/env.cpp
    src/utils/helpers.cpp
    src/utils/md_helpers.cpp
    src/utils/serialization.cpp
    src/watcher.cpp)

find_package(Git)
if(NOT Git_FOUND)
  message(FATAL_ERROR "Git not found, unable to determine git sha")
endif()

execute_process(
  COMMAND ${GIT_EXECUTABLE} rev-list --count HEAD
  WORKING_DIRECTORY ${PROJECT_SOURCE_DIR}
  OUTPUT_VARIABLE UI_EXTENSION_SEQ_NUM
  OUTPUT_STRIP_TRAILING_WHITESPACE)

message(STATUS "UI_EXTENSION_SEQ_NUM=${UI_EXTENSION_SEQ_NUM}")
add_definitions(-DUI_EXTENSION_SEQ_NUM="${UI_EXTENSION_SEQ_NUM}")

execute_process(
  COMMAND ${GIT_EXECUTABLE} rev-parse --short=10 HEAD
  WORKING_DIRECTORY ${PROJECT_SOURCE_DIR}
  OUTPUT_VARIABLE UI_EXTENSION_GIT_SHA
  OUTPUT_STRIP_TRAILING_WHITESPACE)

message(STATUS "UI_EXTENSION_GIT_SHA=${UI_EXTENSION_GIT_SHA}")
add_definitions(-DUI_EXTENSION_GIT_SHA="${UI_EXTENSION_GIT_SHA}")

build_static_extension(${TARGET_NAME} ${EXTENSION_SOURCES})
build_loadable_extension(${TARGET_NAME} " " ${EXTENSION_SOURCES})

target_link_libraries(ui_loadable_extension ${OPENSSL_LIBRARIES})
target_link_libraries(ui_extension ${OPENSSL_LIBRARIES})

install(
  TARGETS ${EXTENSION_NAME}
  EXPORT "${DUCKDB_EXPORT_SET}"
  LIBRARY DESTINATION "${INSTALL_LIB_DIR}"
  ARCHIVE DESTINATION "${INSTALL_LIB_DIR}")
