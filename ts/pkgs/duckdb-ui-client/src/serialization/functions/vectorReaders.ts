import { BinaryDeserializer } from '../classes/BinaryDeserializer.js';
import { LogicalTypeId } from '../constants/LogicalTypeId.js';
import { TypeIdAndInfo } from '../types/TypeInfo.js';
import { BaseVector, ListEntry, Vector } from '../types/Vector.js';
import {
  readData,
  readDataList,
  readList,
  readStringList,
  readUint8,
  readVarInt,
} from './basicReaders.js';

export function readListEntry(deserializer: BinaryDeserializer): ListEntry {
  const offset = deserializer.readProperty(100, readVarInt);
  const length = deserializer.readProperty(101, readVarInt);
  deserializer.expectObjectEnd();
  return { offset, length };
}

export function readListEntryList(
  deserializer: BinaryDeserializer,
): ListEntry[] {
  return readList(deserializer, readListEntry);
}

/** See Vector::Deserialize in https://github.com/duckdb/duckdb/blob/main/src/common/types/vector.cpp */
export function readVector(
  deserializer: BinaryDeserializer,
  type: TypeIdAndInfo,
): Vector {
  const allValid = deserializer.readProperty(100, readUint8);
  const validity = allValid ? deserializer.readProperty(101, readData) : null;
  const baseVector: BaseVector = { allValid, validity };
  let vector: Vector | undefined;
  switch (type.id) {
    case LogicalTypeId.BOOLEAN:
    case LogicalTypeId.TINYINT:
    case LogicalTypeId.SMALLINT:
    case LogicalTypeId.INTEGER:
    case LogicalTypeId.BIGINT:
    case LogicalTypeId.DATE:
    case LogicalTypeId.TIME:
    case LogicalTypeId.TIMESTAMP_SEC:
    case LogicalTypeId.TIMESTAMP_MS:
    case LogicalTypeId.TIMESTAMP:
    case LogicalTypeId.TIMESTAMP_NS:
    case LogicalTypeId.DECIMAL:
    case LogicalTypeId.FLOAT:
    case LogicalTypeId.DOUBLE:
    case LogicalTypeId.INTERVAL:
    case LogicalTypeId.UTINYINT:
    case LogicalTypeId.USMALLINT:
    case LogicalTypeId.UINTEGER:
    case LogicalTypeId.UBIGINT:
    case LogicalTypeId.TIMESTAMP_TZ:
    case LogicalTypeId.TIME_TZ:
    case LogicalTypeId.UHUGEINT:
    case LogicalTypeId.HUGEINT:
    case LogicalTypeId.UUID:
    case LogicalTypeId.ENUM:
      {
        const data = deserializer.readProperty(102, readData);
        vector = {
          ...baseVector,
          kind: 'data',
          data,
        };
      }
      break;
    case LogicalTypeId.CHAR:
    case LogicalTypeId.VARCHAR:
      {
        const data = deserializer.readProperty(102, readStringList);
        vector = {
          ...baseVector,
          kind: 'string',
          data,
        };
      }
      break;
    case LogicalTypeId.BLOB:
    case LogicalTypeId.BIT:
    case LogicalTypeId.BIGNUM:
      {
        const data = deserializer.readProperty(102, readDataList);
        vector = {
          ...baseVector,
          kind: 'datalist',
          data,
        };
      }
      break;
    case LogicalTypeId.STRUCT:
    case LogicalTypeId.UNION:
      {
        const { typeInfo } = type;
        if (!typeInfo) {
          throw new Error(`STRUCT or UNION without typeInfo`);
        }
        if (typeInfo.kind !== 'struct') {
          throw new Error(
            `STRUCT or UNION with wrong typeInfo kind: ${typeInfo.kind}`,
          );
        }
        const types = typeInfo.childTypes.map((e) => e[1]);
        const data = deserializer.readProperty(103, (d) =>
          readVectorList(d, types),
        );
        vector = {
          ...baseVector,
          kind: 'vectorlist',
          data,
        };
      }
      break;
    case LogicalTypeId.LIST:
    case LogicalTypeId.MAP:
      {
        const { typeInfo } = type;
        if (!typeInfo) {
          throw new Error(`LIST or MAP without typeInfo`);
        }
        if (typeInfo.kind !== 'list') {
          throw new Error(
            `LIST or MAP with wrong typeInfo kind: ${typeInfo.kind}`,
          );
        }
        const listSize = deserializer.readProperty(104, readVarInt);
        const entries = deserializer.readProperty(105, readListEntryList);
        const child = deserializer.readProperty(106, (d) =>
          readVector(d, typeInfo.childType),
        );
        vector = {
          ...baseVector,
          kind: 'list',
          listSize,
          entries,
          child,
        };
      }
      break;
    case LogicalTypeId.ARRAY:
      {
        const { typeInfo } = type;
        if (!typeInfo) {
          throw new Error(`ARRAY without typeInfo`);
        }
        if (typeInfo.kind !== 'array') {
          throw new Error(`ARRAY with wrong typeInfo kind: ${typeInfo.kind}`);
        }
        const arraySize = deserializer.readProperty(103, readVarInt);
        const child = deserializer.readProperty(104, (d) =>
          readVector(d, typeInfo.childType),
        );
        vector = {
          ...baseVector,
          kind: 'array',
          arraySize,
          child,
        };
      }
      break;
    default:
      throw new Error(`unrecognized type id: ${type.id}`);
  }
  deserializer.expectObjectEnd();
  if (!vector) {
    throw new Error('unknown vector type');
  }
  return vector;
}

export function readVectorList(
  deserializer: BinaryDeserializer,
  types: TypeIdAndInfo[],
): Vector[] {
  return readList(deserializer, (d: BinaryDeserializer, i: number) =>
    readVector(d, types[i]),
  );
}
