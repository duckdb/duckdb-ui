#pragma once

#include <duckdb.hpp>
#ifndef DUCKDB_CPP_EXTENSION_ENTRY
#include <duckdb/main/extension_util.hpp>
#endif
#include <type_traits>

namespace duckdb {

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
                                              vector<std::string> &out_names);

unique_ptr<FunctionData> SingleStringResultBind(ClientContext &,
                                                TableFunctionBindInput &,
                                                vector<LogicalType> &,
                                                vector<std::string> &);

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
