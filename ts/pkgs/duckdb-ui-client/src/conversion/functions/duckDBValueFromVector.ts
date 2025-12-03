import {
  DuckDBArrayValue,
  DuckDBBitValue,
  DuckDBBlobValue,
  DuckDBDateValue,
  DuckDBDecimalValue,
  DuckDBIntervalValue,
  DuckDBListValue,
  DuckDBMapValue,
  DuckDBStructValue,
  DuckDBTimeTZValue,
  DuckDBTimeValue,
  DuckDBTimestampMicrosecondsValue,
  DuckDBTimestampMillisecondsValue,
  DuckDBTimestampNanosecondsValue,
  DuckDBTimestampSecondsValue,
  DuckDBTimestampTZValue,
  DuckDBUUIDValue,
  DuckDBValue,
  getBigNumFromBytes,
} from '@duckdb/data-values';
import { LogicalTypeId } from '../../serialization/constants/LogicalTypeId.js';
import { TypeIdAndInfo } from '../../serialization/types/TypeInfo.js';
import { Vector } from '../../serialization/types/Vector.js';
import {
  getBoolean,
  getFloat32,
  getFloat64,
  getInt128,
  getInt16,
  getInt32,
  getInt64,
  getInt8,
  getUInt128,
  getUInt16,
  getUInt32,
  getUInt64,
  getUInt8,
} from './dataViewReaders.js';
import { isRowValid } from './isRowValid.js';
import {
  getArrayTypeInfo,
  getDecimalTypeInfo,
  getEnumTypeInfo,
  getListTypeInfo,
  getMapTypeInfos,
  getStructTypeInfo,
} from './typeInfoGetters.js';
import {
  getArrayVector,
  getDataListVector,
  getDataVector,
  getListVector,
  getStringVector,
  getVectorListVector,
} from './vectorGetters.js';

/** Return the DuckDBValue at the given index in the given Vector with the type described by the given TypeIdAndInfo. */
export function duckDBValueFromVector(
  typeIdAndInfo: TypeIdAndInfo,
  vector: Vector,
  rowIndex: number,
): DuckDBValue {
  if (!isRowValid(vector.validity, rowIndex)) return null;

  const { id, typeInfo } = typeIdAndInfo;
  switch (id) {
    case LogicalTypeId.BOOLEAN:
      return getBoolean(getDataVector(vector).data, rowIndex);

    case LogicalTypeId.TINYINT:
      return getInt8(getDataVector(vector).data, rowIndex);
    case LogicalTypeId.SMALLINT:
      return getInt16(getDataVector(vector).data, rowIndex * 2);
    case LogicalTypeId.INTEGER:
      return getInt32(getDataVector(vector).data, rowIndex * 4);
    case LogicalTypeId.BIGINT:
      return getInt64(getDataVector(vector).data, rowIndex * 8);

    case LogicalTypeId.DATE:
      return new DuckDBDateValue(
        getInt32(getDataVector(vector).data, rowIndex * 4),
      );
    case LogicalTypeId.TIME:
      return new DuckDBTimeValue(
        getInt64(getDataVector(vector).data, rowIndex * 8),
      );
    case LogicalTypeId.TIMESTAMP_SEC:
      return new DuckDBTimestampSecondsValue(
        getInt64(getDataVector(vector).data, rowIndex * 8),
      );
    case LogicalTypeId.TIMESTAMP_MS:
      return new DuckDBTimestampMillisecondsValue(
        getInt64(getDataVector(vector).data, rowIndex * 8),
      );
    case LogicalTypeId.TIMESTAMP:
      return new DuckDBTimestampMicrosecondsValue(
        getInt64(getDataVector(vector).data, rowIndex * 8),
      );
    case LogicalTypeId.TIMESTAMP_NS:
      return new DuckDBTimestampNanosecondsValue(
        getInt64(getDataVector(vector).data, rowIndex * 8),
      );

    case LogicalTypeId.DECIMAL: {
      const { width, scale } = getDecimalTypeInfo(typeInfo);
      if (width <= 4) {
        return new DuckDBDecimalValue(
          BigInt(getInt16(getDataVector(vector).data, rowIndex * 2)),
          scale,
        );
      } else if (width <= 9) {
        return new DuckDBDecimalValue(
          BigInt(getInt32(getDataVector(vector).data, rowIndex * 4)),
          scale,
        );
      } else if (width <= 18) {
        return new DuckDBDecimalValue(
          getInt64(getDataVector(vector).data, rowIndex * 8),
          scale,
        );
      } else if (width <= 38) {
        return new DuckDBDecimalValue(
          getInt128(getDataVector(vector).data, rowIndex * 16),
          scale,
        );
      }
      throw new Error(`unsupported decimal width: ${width}`);
    }

    case LogicalTypeId.FLOAT:
      return getFloat32(getDataVector(vector).data, rowIndex * 4);
    case LogicalTypeId.DOUBLE:
      return getFloat64(getDataVector(vector).data, rowIndex * 8);

    case LogicalTypeId.CHAR:
    case LogicalTypeId.VARCHAR:
      return getStringVector(vector).data[rowIndex];

    case LogicalTypeId.BLOB: {
      const dv = getDataListVector(vector).data[rowIndex];
      return new DuckDBBlobValue(
        new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength),
      );
    }

    case LogicalTypeId.INTERVAL: {
      const { data } = getDataVector(vector);
      const months = getInt32(data, rowIndex * 16 + 0);
      const days = getInt32(data, rowIndex * 16 + 4);
      const micros = getInt64(data, rowIndex * 16 + 8);
      return new DuckDBIntervalValue(months, days, micros);
    }

    case LogicalTypeId.UTINYINT:
      return getUInt8(getDataVector(vector).data, rowIndex);
    case LogicalTypeId.USMALLINT:
      return getUInt16(getDataVector(vector).data, rowIndex * 2);
    case LogicalTypeId.UINTEGER:
      return getUInt32(getDataVector(vector).data, rowIndex * 4);
    case LogicalTypeId.UBIGINT:
      return getUInt64(getDataVector(vector).data, rowIndex * 8);

    case LogicalTypeId.TIMESTAMP_TZ:
      return new DuckDBTimestampTZValue(
        getInt64(getDataVector(vector).data, rowIndex * 8),
      );
    case LogicalTypeId.TIME_TZ:
      return DuckDBTimeTZValue.fromBits(
        getUInt64(getDataVector(vector).data, rowIndex * 8),
      );

    case LogicalTypeId.BIT: {
      const dv = getDataListVector(vector).data[rowIndex];
      return new DuckDBBitValue(
        new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength),
      );
    }

    case LogicalTypeId.BIGNUM: {
      const dv = getDataListVector(vector).data[rowIndex];
      return getBigNumFromBytes(
        new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength),
      );
    }

    case LogicalTypeId.UHUGEINT:
      return getUInt128(getDataVector(vector).data, rowIndex * 16);
    case LogicalTypeId.HUGEINT:
      return getInt128(getDataVector(vector).data, rowIndex * 16);

    case LogicalTypeId.UUID:
      return DuckDBUUIDValue.fromStoredHugeint(
        getInt128(getDataVector(vector).data, rowIndex * 16),
      );

    case LogicalTypeId.STRUCT: {
      const { childTypes } = getStructTypeInfo(typeInfo);
      const { data } = getVectorListVector(vector);
      return new DuckDBStructValue(
        Array.from({ length: childTypes.length }).map((_, i) => ({
          key: childTypes[i][0],
          value: duckDBValueFromVector(childTypes[i][1], data[i], rowIndex),
        })),
      );
    }

    case LogicalTypeId.LIST: {
      const { childType } = getListTypeInfo(typeInfo);
      const { child, entries } = getListVector(vector);
      const { offset, length } = entries[rowIndex];
      return new DuckDBListValue(
        Array.from({ length }).map((_, i) =>
          duckDBValueFromVector(childType, child, offset + i),
        ),
      );
    }

    case LogicalTypeId.MAP: {
      const { keyType, valueType } = getMapTypeInfos(typeInfo);
      const { child, entries } = getListVector(vector);
      const { offset, length } = entries[rowIndex];
      const { data } = getVectorListVector(child);
      return new DuckDBMapValue(
        Array.from({ length }).map((_, i) => ({
          key: duckDBValueFromVector(keyType, data[0], offset + i),
          value: duckDBValueFromVector(valueType, data[1], offset + i),
        })),
      );
    }

    case LogicalTypeId.ENUM: {
      const { values } = getEnumTypeInfo(typeInfo);
      if (values.length < 256) {
        return values[getUInt8(getDataVector(vector).data, rowIndex)];
      } else if (values.length < 65536) {
        return values[getUInt16(getDataVector(vector).data, rowIndex * 2)];
      } else if (values.length < 4294967296) {
        return values[getUInt32(getDataVector(vector).data, rowIndex * 4)];
      }
      throw new Error(`unsupported enum size: values.length=${values.length}`);
    }

    case LogicalTypeId.UNION: {
      const { childTypes } = getStructTypeInfo(typeInfo);
      const { data } = getVectorListVector(vector);
      const tag = Number(
        duckDBValueFromVector(childTypes[0][1], data[0], rowIndex),
      );
      const altIndex = tag + 1;
      return duckDBValueFromVector(
        childTypes[altIndex][1],
        data[altIndex],
        rowIndex,
      );
    }

    case LogicalTypeId.ARRAY: {
      const { childType, size } = getArrayTypeInfo(typeInfo);
      const { child } = getArrayVector(vector);
      return new DuckDBArrayValue(
        Array.from({ length: size }).map((_, i) =>
          duckDBValueFromVector(childType, child, rowIndex * size + i),
        ),
      );
    }

    default:
      throw new Error(`type not implemented: ${id}`);
  }
}
