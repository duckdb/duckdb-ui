#include "utils/statement_execution.hpp"

#include <chrono>
#include <thread>

namespace duckdb {
namespace ui {

#ifdef DUCKDB_HAS_QUERY_RESULT_STREAM

namespace {

// Executes tasks of the query on the calling thread until `done` returns true
// for its state, or it fails. Executing tasks here, rather than calling a
// blocking method, lets Connection::Interrupt cancel the query.
template <class DONE>
QueryResultState ExecuteTasksUntil(QueryResult &result, QueryResultState state,
                                   DONE done) {
  while (!done(state) && state != QueryResultState::EXECUTION_ERROR) {
    state = result.ExecuteTask();
    if (state == QueryResultState::BLOCKED ||
        state == QueryResultState::NO_TASKS_AVAILABLE) {
      std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }
  }
  return state;
}

// Submits a statement and runs it until its result can be observed: rows are
// ready to fetch (READY), or it finished or failed. Returns null and sets
// `error` if it fails.
unique_ptr<QueryResult> Submit(Connection &connection,
                               unique_ptr<SQLStatement> statement,
                               const vector<Value> &parameter_values,
                               QueryResultState &state, string &error) {
  unique_ptr<QueryResult> result;
  if (parameter_values.empty()) {
    result = connection.Submit(std::move(statement));
  } else {
    auto values = parameter_values;
    result = connection.Submit(std::move(statement), values);
  }
  if (!result->HasError()) {
    state =
        ExecuteTasksUntil(*result, QueryResultState::NOT_READY,
                          [](QueryResultState s) { return IsObservable(s); });
  }
  if (result->HasError() || state == QueryResultState::EXECUTION_ERROR) {
    error = result->GetError();
    return nullptr;
  }
  return result;
}

// Runs the query to its end, retaining its result. Like QueryResult::Complete,
// but interruptible. Returns false and sets `error` if it fails.
bool Materialize(QueryResult &result, QueryResultState state, string &error) {
  if (!IsTerminal(state)) {
    result.Materialize();
    state = ExecuteTasksUntil(result, state,
                              [](QueryResultState s) { return IsTerminal(s); });
  }
  if (result.HasError() || state == QueryResultState::EXECUTION_ERROR) {
    error = result.GetError();
    return false;
  }
  return true;
}

// Whether the query can stop before the end of its result, or be read as a
// stream: it returns rows and writes nothing, so ending it early rolls nothing
// back. A stream can only be opened while the engine waits on the consumer
// (READY) with a buffer to drain. This covers the SELECTs DuckDB before 2.0
// streamed, and also other read-only statements that return rows (e.g. CALL),
// which DuckDB before 2.0 ran to their end.
bool CanStream(QueryResultState state, const QueryResult &result) {
  if (state != QueryResultState::READY || !result.HasBufferedData() ||
      !result.MetadataAvailable()) {
    return false;
  }
  auto &properties = result.GetStatementProperties();
  return properties.return_type == StatementReturnType::QUERY_RESULT &&
         properties.IsReadOnly();
}

} // namespace

bool RunStatement(Connection &connection, unique_ptr<SQLStatement> statement,
                  string &error) {
  auto state = QueryResultState::NOT_READY;
  auto result = Submit(connection, std::move(statement), {}, state, error);
  if (!result) {
    return false;
  }
  // A statement that returns rows and writes nothing can stop as soon as it
  // produces rows: they would be discarded anyway.
  if (CanStream(state, *result)) {
    result->Close();
    return true;
  }
  // Otherwise the statement must run to its end: closing a result early rolls
  // back what it wrote.
  return Materialize(*result, state, error);
}

unique_ptr<StatementResult>
StatementResult::Run(Connection &connection, unique_ptr<SQLStatement> statement,
                     const vector<Value> &parameter_values) {
  auto statement_result = unique_ptr<StatementResult>(new StatementResult());
  auto state = QueryResultState::NOT_READY;
  auto result = Submit(connection, std::move(statement), parameter_values,
                       state, statement_result->error);
  if (!result) {
    return statement_result;
  }
  statement_result->names = result->GetNames();
  statement_result->types = result->GetTypes();
  // The caller may stop fetching before the end, which would roll back a
  // statement that writes, so only stream statements that write nothing.
  // Others are materialized first, as DuckDB before 2.0 did.
  if (CanStream(state, *result)) {
    statement_result->stream =
        make_uniq<QueryResultStream<ChunkFormat>>(std::move(result));
    return statement_result;
  }
  if (!Materialize(*result, state, statement_result->error)) {
    return statement_result;
  }
  statement_result->result = std::move(result);
  return statement_result;
}

unique_ptr<DataChunk> StatementResult::Fetch() {
  if (stream) {
    auto chunk = stream->Fetch();
    if (!chunk) {
      if (stream->HasError()) {
        error = stream->GetError();
      }
      return nullptr;
    }
    chunk->Flatten();
    return chunk;
  }
  if (result) {
    auto chunk = result->Fetch();
    if (!chunk && result->HasError()) {
      error = result->GetError();
    }
    return chunk;
  }
  return nullptr;
}

#else // DUCKDB_HAS_QUERY_RESULT_STREAM

namespace {

// Executes tasks on the calling thread until the result is ready (or there's
// an error). Executing tasks here, rather than blocking, lets
// Connection::Interrupt cancel the query.
PendingExecutionResult ExecuteUntilReady(PendingQueryResult &pending) {
  auto exec_result = PendingExecutionResult::RESULT_NOT_READY;
  while (!PendingQueryResult::IsResultReady(exec_result)) {
    exec_result = pending.ExecuteTask();
    if (exec_result == PendingExecutionResult::BLOCKED ||
        exec_result == PendingExecutionResult::NO_TASKS_AVAILABLE) {
      std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }
  }
  return exec_result;
}

string UnexpectedExecutionResultError(PendingExecutionResult exec_result) {
  return StringUtil::Format("Unexpected PendingExecutionResult: %s",
                            exec_result);
}

} // namespace

bool RunStatement(Connection &connection, unique_ptr<SQLStatement> statement,
                  string &error) {
  auto pending = connection.PendingQuery(std::move(statement), true);
  // Return any error found before execution.
  if (pending->HasError()) {
    error = pending->GetError();
    return false;
  }
  auto exec_result = ExecuteUntilReady(*pending);
  // Return any error found during execution.
  switch (exec_result) {
  case PendingExecutionResult::EXECUTION_ERROR:
    error = pending->GetError();
    return false;
  case PendingExecutionResult::EXECUTION_FINISHED:
  case PendingExecutionResult::RESULT_READY:
    // ignore the result
    pending->Execute();
    return true;
  default:
    error = UnexpectedExecutionResultError(exec_result);
    return false;
  }
}

unique_ptr<StatementResult>
StatementResult::Run(Connection &connection, unique_ptr<SQLStatement> statement,
                     const vector<Value> &parameter_values) {
  auto statement_result = unique_ptr<StatementResult>(new StatementResult());

  // We use a pending query so we can execute tasks and fetch chunks
  // incrementally. This enables cancellation.
  unique_ptr<PendingQueryResult> pending;
  if (!parameter_values.empty()) {
    auto prepared = connection.Prepare(std::move(statement));
    if (prepared->HasError()) {
      statement_result->error = prepared->GetError();
      return statement_result;
    }
    auto values = parameter_values;
    pending = prepared->PendingQuery(values, true);
  } else {
    pending = connection.PendingQuery(std::move(statement), true);
  }

  if (pending->HasError()) {
    statement_result->error = pending->GetError();
    return statement_result;
  }

  auto exec_result = ExecuteUntilReady(*pending);
  switch (exec_result) {
  case PendingExecutionResult::EXECUTION_ERROR:
    statement_result->error = pending->GetError();
    return statement_result;
  case PendingExecutionResult::EXECUTION_FINISHED:
  case PendingExecutionResult::RESULT_READY:
    // Get the result. This should be quick because it's ready.
    statement_result->result = pending->Execute();
    break;
  default:
    statement_result->error = UnexpectedExecutionResultError(exec_result);
    return statement_result;
  }

  auto &result = *statement_result->result;
  if (result.HasError()) {
    statement_result->error = result.GetError();
    return statement_result;
  }
#if DUCKDB_VERSION_AT_LEAST(2, 0, 0)
  statement_result->names = result.GetNames();
  statement_result->types = result.GetTypes();
#else
  statement_result->names = result.names;
  statement_result->types = result.types;
#endif
  return statement_result;
}

unique_ptr<DataChunk> StatementResult::Fetch() {
  if (!result) {
    return nullptr;
  }
  auto chunk = result->Fetch();
  if (!chunk && result->HasError()) {
    error = result->GetError();
  }
  return chunk;
}

#endif // DUCKDB_HAS_QUERY_RESULT_STREAM

StatementResult::~StatementResult() = default;

} // namespace ui
} // namespace duckdb
