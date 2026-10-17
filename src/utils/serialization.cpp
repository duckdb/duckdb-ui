#include "utils/serialization.hpp"

#include "utils/helpers.hpp"

#include "duckdb/common/serializer/deserializer.hpp"
#include "duckdb/common/serializer/serializer.hpp"

namespace duckdb {
namespace ui {

void EmptyResult::Serialize(Serializer &) const {}

void TokenizeResult::Serialize(Serializer &serializer) const {
  serializer.WriteProperty(100, "offsets", offsets);
  serializer.WriteProperty(101, "types", types);
}

// Adapted from parts of DataChunk::Serialize
void ColumnNamesAndTypes::Serialize(Serializer &serializer) const {
  serializer.WriteProperty(100, "names", names);
  serializer.WriteProperty(101, "types", types);
}

// Serializes the first `count` rows of a vector without compression (e.g. as
// a dictionary or constant vector), which the client doesn't read.
static void SerializeUncompressed(Vector &vector, Serializer &serializer,
                                  idx_t count) {
#if DUCKDB_VERSION_AT_LEAST(2, 0, 0)
  // The vector carries its own size, and serializes that many rows. It can
  // differ from the chunk's row count, which the client relies on to read the
  // vector, so serialize exactly `count` rows.
  if (vector.size() == count) {
    vector.Serialize(serializer, false);
    return;
  }
  if (vector.size() < count) {
    throw InternalException(
        "Cannot serialize %llu rows of a vector of size %llu", count,
        vector.size());
  }
  SelectionVector sel(count);
  for (idx_t i = 0; i < count; i++) {
    sel.set_index(i, i);
  }
  Vector prefix(vector, sel, count);
  prefix.Serialize(serializer, false);
#else
  vector.Serialize(serializer, count, false);
#endif
}

// Adapted from parts of DataChunk::Serialize
void Chunk::Serialize(Serializer &serializer) const {
  serializer.WriteProperty(100, "row_count", row_count);
  serializer.WriteList(101, "vectors", vectors.size(),
                       [&](Serializer::List &list, idx_t i) {
                         list.WriteObject([&](Serializer &object) {
                           // Reference the vector to avoid potentially mutating
                           // it during serialization
                           Vector serialized_vector(vectors[i].GetType());
                           serialized_vector.Reference(vectors[i]);
                           SerializeUncompressed(serialized_vector, object,
                                                 row_count);
                         });
                       });
}

void SuccessResult::Serialize(Serializer &serializer) const {
  serializer.WriteProperty(100, "success", true);
  serializer.WriteProperty(101, "column_names_and_types",
                           column_names_and_types);
  serializer.WriteList(
      102, "chunks", chunks.size(),
      [&](Serializer::List &list, idx_t i) { list.WriteElement(chunks[i]); });
}

void ErrorResult::Serialize(Serializer &serializer) const {
  serializer.WriteProperty(100, "success", false);
  serializer.WriteProperty(101, "error", error);
}

} // namespace ui
} // namespace duckdb
