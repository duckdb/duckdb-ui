#pragma once

#include <duckdb.hpp>
#ifndef DUCKDB_CPP_EXTENSION_ENTRY
#include <duckdb/main/extension_util.hpp>
#endif
#include <duckdb/main/settings.hpp>
#include <type_traits>

// DuckDB's `main` branch (post-1.5) replaced std::string with a dedicated,
// case-insensitive `duckdb::Identifier` type in catalog/parser/appender APIs.
// Its runtime-string constructor is explicit, so std::string values must be
// wrapped at the call site. Older releases don't have the type at all, so we
// feature-detect the header rather than rely on the (dev-suffixed) version.
#if defined(__has_include) && __has_include("duckdb/common/identifier.hpp")
#include "duckdb/common/identifier.hpp"
#define DUCKDB_HAS_IDENTIFIER 1
#endif

// TODO we cannot run these checks because they are not defined for DuckDB
// < 1.4.x #ifndef DUCKDB_MAJOR_VERSION #error "DUCKDB_MAJOR_VERSION is not
// defined"
// ...
#define DUCKDB_VERSION_AT_MOST(major, minor, patch)                            \
  (DUCKDB_MAJOR_VERSION < (major) ||                                           \
   (DUCKDB_MAJOR_VERSION == (major) && DUCKDB_MINOR_VERSION < (minor)) ||      \
   (DUCKDB_MAJOR_VERSION == (major) && DUCKDB_MINOR_VERSION == (minor) &&      \
    DUCKDB_PATCH_VERSION <= (patch)))

#define DUCKDB_VERSION_AT_LEAST(major, minor, patch)                           \
  (DUCKDB_MAJOR_VERSION > (major) ||                                           \
   (DUCKDB_MAJOR_VERSION == (major) && DUCKDB_MINOR_VERSION > (minor)) ||      \
   (DUCKDB_MAJOR_VERSION == (major) && DUCKDB_MINOR_VERSION == (minor) &&      \
    DUCKDB_PATCH_VERSION >= (patch)))

namespace duckdb {

// Wrap a runtime std::string for catalog/parser/appender APIs that take an
// `Identifier` on newer DuckDB. On older versions those APIs take std::string,
// so the value passes through unchanged.
#ifdef DUCKDB_HAS_IDENTIFIER
inline Identifier AsCatalogIdentifier(const std::string &name) {
  return Identifier(name);
}
inline const Identifier &AsCatalogIdentifier(const Identifier &name) {
  return name;
}
#else
inline const std::string &AsCatalogIdentifier(const std::string &name) {
  return name;
}
#endif

// DuckDB 2.0 table function bind callbacks return column names as Identifiers.
#if DUCKDB_VERSION_AT_LEAST(2, 0, 0)
typedef vector<Identifier> bind_names_t;
#else
typedef vector<std::string> bind_names_t;
#endif

inline bool ExternalAccessEnabled(DatabaseInstance &db) {
#if DUCKDB_VERSION_AT_LEAST(1, 5, 0)
  return Settings::Get<EnableExternalAccessSetting>(db);
#else
  return DBConfig::GetConfig(db).options.enable_external_access;
#endif
}

// Starting the UI spawns a process, listens on a socket and makes outbound HTTP
// requests, so it must respect enable_external_access = false.
inline void CheckExternalAccessEnabled(ClientContext &context) {
  if (!ExternalAccessEnabled(*context.db)) {
    throw PermissionException(
        "Starting the UI is disabled when enable_external_access is false");
  }
}

typedef std::string (*simple_tf_t)(ClientContext &);

struct RunOnceTableFunctionState : GlobalTableFunctionState {
  RunOnceTableFunctionState() : run(false){};
  std::atomic<bool> run;

  static unique_ptr<GlobalTableFunctionState> Init(ClientContext &,
                                                   TableFunctionInitInput &) {
    return make_uniq<RunOnceTableFunctionState>();
  }
};

namespace internal {

unique_ptr<FunctionData> SingleBoolResultBind(ClientContext &,
                                              TableFunctionBindInput &,
                                              vector<LogicalType> &out_types,
                                              bind_names_t &out_names);

unique_ptr<FunctionData> SingleStringResultBind(ClientContext &,
                                                TableFunctionBindInput &,
                                                vector<LogicalType> &,
                                                bind_names_t &);

bool ShouldRun(TableFunctionInput &input);

template <typename Func> struct CallFunctionHelper;

template <> struct CallFunctionHelper<std::string (*)(ClientContext &)> {
  static std::string call(ClientContext &context, TableFunctionInput &input,
                          std::string (*f)(ClientContext &)) {
    return f(context);
  }
};

template <>
struct CallFunctionHelper<std::string (*)(ClientContext &,
                                          TableFunctionInput &)> {
  static std::string call(ClientContext &context, TableFunctionInput &input,
                          std::string (*f)(ClientContext &,
                                           TableFunctionInput &)) {
    return f(context, input);
  }
};

template <typename Func, Func func>
void TableFunc(ClientContext &context, TableFunctionInput &input,
               DataChunk &output) {
  if (!ShouldRun(input)) {
    return;
  }

  const std::string result =
      CallFunctionHelper<Func>::call(context, input, func);
  output.SetCardinality(1);
  output.SetValue(0, 0, result);
}

#ifdef DUCKDB_CPP_EXTENSION_ENTRY
template <typename Func, Func func>
void RegisterTF(ExtensionLoader &loader, const char *name) {
  TableFunction tf(name, {}, internal::TableFunc<Func, func>,
                   internal::SingleStringResultBind,
                   RunOnceTableFunctionState::Init);
  loader.RegisterFunction(tf);
}
#else
template <typename Func, Func func>
void RegisterTF(DatabaseInstance &instance, const char *name) {
  TableFunction tf(name, {}, internal::TableFunc<Func, func>,
                   internal::SingleStringResultBind,
                   RunOnceTableFunctionState::Init);
  ExtensionUtil::RegisterFunction(instance, tf);
}
#endif

} // namespace internal

#ifdef DUCKDB_CPP_EXTENSION_ENTRY
#define REGISTER_TF(name, func)                                                \
  internal::RegisterTF<decltype(&func), &func>(loader, name)
#else
#define REGISTER_TF(name, func)                                                \
  internal::RegisterTF<decltype(&func), &func>(instance, name)
#endif

} // namespace duckdb
