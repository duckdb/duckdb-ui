import {
  ARRAY,
  DECIMAL,
  DuckDBBigIntType,
  DuckDBBigNumType,
  DuckDBBitType,
  DuckDBBlobType,
  DuckDBBooleanType,
  DuckDBDateType,
  DuckDBDoubleType,
  DuckDBFloatType,
  DuckDBHugeIntType,
  DuckDBIntegerType,
  DuckDBIntervalType,
  DuckDBSmallIntType,
  DuckDBSQLNullType,
  DuckDBStructType,
  DuckDBTimestampMillisecondsType,
  DuckDBTimestampNanosecondsType,
  DuckDBTimestampSecondsType,
  DuckDBTimestampType,
  DuckDBTimestampTZType,
  DuckDBTimeType,
  DuckDBTimeTZType,
  DuckDBTinyIntType,
  DuckDBType,
  DuckDBUBigIntType,
  DuckDBUHugeIntType,
  DuckDBUIntegerType,
  DuckDBUSmallIntType,
  DuckDBUTinyIntType,
  DuckDBUUIDType,
  DuckDBVarCharType,
  ENUM,
  GEOMETRY,
  JSONType,
  LIST,
  MAP,
  UNION,
} from '@duckdb/data-types';
import { LogicalTypeId } from '../../serialization/constants/LogicalTypeId.js';
import { TypeIdAndInfo } from '../../serialization/types/TypeInfo.js';
import {
  getArrayTypeInfo,
  getDecimalTypeInfo,
  getEnumTypeInfo,
  getListTypeInfo,
  getMapTypeInfos,
  getStructTypeInfo,
} from './typeInfoGetters.js';

/** Return the DuckDBType corresponding to the given TypeIdAndInfo. */
export function duckDBTypeFromTypeIdAndInfo(
  typeIdAndInfo: TypeIdAndInfo,
): DuckDBType {
  const { id, typeInfo } = typeIdAndInfo;
  const alias = typeInfo?.alias;
  switch (id) {
    case LogicalTypeId.SQLNULL:
      return DuckDBSQLNullType.create(alias);

    case LogicalTypeId.BOOLEAN:
      return DuckDBBooleanType.create(alias);

    case LogicalTypeId.TINYINT:
      return DuckDBTinyIntType.create(alias);
    case LogicalTypeId.SMALLINT:
      return DuckDBSmallIntType.create(alias);
    case LogicalTypeId.INTEGER:
      return DuckDBIntegerType.create(alias);
    case LogicalTypeId.BIGINT:
      return DuckDBBigIntType.create(alias);

    case LogicalTypeId.DATE:
      return DuckDBDateType.create(alias);
    case LogicalTypeId.TIME:
      return DuckDBTimeType.create(alias);
    case LogicalTypeId.TIMESTAMP_SEC:
      return DuckDBTimestampSecondsType.create(alias);
    case LogicalTypeId.TIMESTAMP_MS:
      return DuckDBTimestampMillisecondsType.create(alias);
    case LogicalTypeId.TIMESTAMP:
      return DuckDBTimestampType.create(alias);
    case LogicalTypeId.TIMESTAMP_NS:
      return DuckDBTimestampNanosecondsType.create(alias);

    case LogicalTypeId.DECIMAL: {
      const { width, scale } = getDecimalTypeInfo(typeInfo);
      return DECIMAL(width, scale, alias);
    }

    case LogicalTypeId.FLOAT:
      return DuckDBFloatType.create(alias);
    case LogicalTypeId.DOUBLE:
      return DuckDBDoubleType.create(alias);

    case LogicalTypeId.CHAR:
    case LogicalTypeId.VARCHAR:
      // Minor optimization for JSON type to avoid creating new type object.
      if (alias === JSONType.alias) {
        return JSONType;
      }
      return DuckDBVarCharType.create(alias);
    case LogicalTypeId.BLOB:
      return DuckDBBlobType.create(alias);
    case LogicalTypeId.GEOMETRY:
      // Matches how DuckDB before 1.5 (and later DuckDB targeting older storage) serializes geometry: as a BLOB
      // aliased GEOMETRY. Any coordinate reference system is not reflected in the type.
      return alias ? DuckDBBlobType.create(alias) : GEOMETRY;

    case LogicalTypeId.INTERVAL:
      return DuckDBIntervalType.create(alias);

    case LogicalTypeId.UTINYINT:
      return DuckDBUTinyIntType.create(alias);
    case LogicalTypeId.USMALLINT:
      return DuckDBUSmallIntType.create(alias);
    case LogicalTypeId.UINTEGER:
      return DuckDBUIntegerType.create(alias);
    case LogicalTypeId.UBIGINT:
      return DuckDBUBigIntType.create(alias);

    case LogicalTypeId.TIMESTAMP_TZ:
      return DuckDBTimestampTZType.create(alias);
    case LogicalTypeId.TIME_TZ:
      return DuckDBTimeTZType.create(alias);

    case LogicalTypeId.BIT:
      return DuckDBBitType.create(alias);

    case LogicalTypeId.BIGNUM:
      return DuckDBBigNumType.create(alias);

    case LogicalTypeId.UHUGEINT:
      return DuckDBUHugeIntType.create(alias);
    case LogicalTypeId.HUGEINT:
      return DuckDBHugeIntType.create(alias);

    case LogicalTypeId.UUID:
      return DuckDBUUIDType.create(alias);

    case LogicalTypeId.STRUCT:
    case LogicalTypeId.TUPLE: {
      const { childTypes } = getStructTypeInfo(typeInfo);
      // Built from arrays rather than a record, because entry names aren't unique in an unnamed struct (e.g.
      // `row(1, 'a')`), where every name is empty.
      return new DuckDBStructType(
        childTypes.map(([name]) => name),
        childTypes.map(([, type]) => duckDBTypeFromTypeIdAndInfo(type)),
        alias,
      );
    }

    case LogicalTypeId.LIST: {
      const { childType } = getListTypeInfo(typeInfo);
      return LIST(duckDBTypeFromTypeIdAndInfo(childType), alias);
    }

    case LogicalTypeId.MAP: {
      const { keyType, valueType } = getMapTypeInfos(typeInfo);
      return MAP(
        duckDBTypeFromTypeIdAndInfo(keyType),
        duckDBTypeFromTypeIdAndInfo(valueType),
        alias,
      );
    }

    case LogicalTypeId.ENUM: {
      const { values } = getEnumTypeInfo(typeInfo);
      return ENUM(values, alias);
    }

    case LogicalTypeId.UNION: {
      const { childTypes } = getStructTypeInfo(typeInfo);
      const members: Record<string, DuckDBType> = {};
      for (const [key, valueTypeIdAndInfo] of childTypes) {
        members[key] = duckDBTypeFromTypeIdAndInfo(valueTypeIdAndInfo);
      }
      return UNION(members, alias);
    }

    case LogicalTypeId.ARRAY: {
      const { childType, size } = getArrayTypeInfo(typeInfo);
      return ARRAY(duckDBTypeFromTypeIdAndInfo(childType), size, alias);
    }

    default:
      throw new Error(`type id not implemented: ${typeIdAndInfo.id}`);
  }
}
