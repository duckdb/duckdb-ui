#pragma once

#include "utils/helpers.hpp"

#include <duckdb.hpp>

// DuckDB 2.0 replaced PendingQuery / PendingQueryResult / StreamQueryResult
// with a single QueryResult, submitted with Connection::Submit and optionally
// drained through a QueryResultStream. Feature-detect the new API rather than
// rely on the version: some 2.x dev builds report 2.x without it.
#if defined(__has_include) &&                                                  \
    __has_include("duckdb/main/query_result_stream.hpp")
#include "duckdb/main/query_result_stream.hpp"
#define DUCKDB_HAS_QUERY_RESULT_STREAM 1
#endif

namespace duckdb {
namespace ui {

#if DUCKDB_VERSION_AT_LEAST(2, 0, 0)
using ResultNames = vector<Identifier>;
#else
using ResultNames = vector<string>;
#endif

// Runs a statement whose result isn't needed. A statement that returns rows
// and writes nothing stops once it produces rows; others run to their end.
// Returns false and sets `error` if it fails. Runs on the calling thread, so
// it can be interrupted with Connection::Interrupt.
bool RunStatement(Connection &connection, unique_ptr<SQLStatement> statement,
                  string &error);

// The result of a statement, fetched chunk by chunk, so a caller can stop
// early without materializing the rest. Hides the differences between
// DuckDB's query APIs before and after 2.0.
class StatementResult {
public:
  // Runs a statement until its result can be fetched. Check HasError
  // afterward. Binds the parameter values, if any, as a prepared statement.
  static unique_ptr<StatementResult> Run(Connection &connection,
                                         unique_ptr<SQLStatement> statement,
                                         const vector<Value> &parameter_values);

  ~StatementResult();

  bool HasError() const { return !error.empty(); }
  const string &GetError() const { return error; }

  const ResultNames &GetNames() const { return names; }
  const vector<LogicalType> &GetTypes() const { return types; }

  // Returns the next chunk, with flat vectors, or null at the end of the
  // result or on an error (check HasError).
  unique_ptr<DataChunk> Fetch();

private:
  StatementResult() = default;

  string error;
  ResultNames names;
  vector<LogicalType> types;

  unique_ptr<QueryResult> result;
#ifdef DUCKDB_HAS_QUERY_RESULT_STREAM
  // Set instead of `result` when the result is streamed.
  unique_ptr<QueryResultStream<ChunkFormat>> stream;
#endif
};

} // namespace ui
} // namespace duckdb
