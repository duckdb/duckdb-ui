import { BinaryDeserializer } from '../classes/BinaryDeserializer.js';
import { isRowValid } from '../../conversion/functions/isRowValid.js';
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

const decoder = new TextDecoder();

/**
 * Read the string data of a VARCHAR vector serialized in the DuckDB 2.0+ format: the total byte length (field 107),
 * a blob of one little-endian uint32 length per row (field 108), and a blob of the concatenated bytes of the valid
 * strings (field 109). Mirrors Vector::Deserialize: invalid rows consume no bytes, whatever their length, and are
 * decoded as empty strings.
 */
export function readStringBlobs(
  deserializer: BinaryDeserializer,
  validity: DataView | null,
): string[] {
  const byteDataLength = deserializer.readProperty(107, readVarInt);
  const lengthData = deserializer.readProperty(108, readData);
  const byteData = deserializer.readProperty(109, readData);
  if (lengthData.byteLength % 4 !== 0) {
    throw new Error(
      `string length data has byte length ${lengthData.byteLength}, which is not a multiple of 4`,
    );
  }
  if (byteData.byteLength !== byteDataLength) {
    throw new Error(
      `string byte data has byte length ${byteData.byteLength} but expected ${byteDataLength}`,
    );
  }
  const bytes = new Uint8Array(
    byteData.buffer,
    byteData.byteOffset,
    byteData.byteLength,
  );
  const count = lengthData.byteLength / 4;
  const strings: string[] = [];
  let position = 0;
  for (let i = 0; i < count; i++) {
    if (!isRowValid(validity, i)) {
      strings.push('');
      continue;
    }
    const length = lengthData.getUint32(i * 4, true);
    if (length > byteDataLength - position) {
      throw new Error(
        `string lengths exceed byte data length ${byteDataLength}`,
      );
    }
    strings.push(decoder.decode(bytes.subarray(position, position + length)));
    position += length;
  }
  return strings;
}

/** See Vector::Deserialize in https://github.com/duckdb/duckdb/blob/main/src/common/types/vector.cpp */
export function readVector(
  deserializer: BinaryDeserializer,
  type: TypeIdAndInfo,
): Vector {
  if (type.id === LogicalTypeId.GEOMETRY) {
    // The geometry storage format. Written whenever the type is serialized as GEOMETRY (rather than as a legacy
    // GEOMETRY-aliased BLOB), in which case the data is always WKB.
    deserializer.readPropertyWithDefault(99, readUint8, null);
  }
  const allValid = deserializer.readProperty(100, readUint8);
  const validity = allValid ? deserializer.readProperty(101, readData) : null;
  const baseVector: BaseVector = { allValid, validity };
  let vector: Vector | undefined;
  switch (type.id) {
    // SQLNULL is physically INT32, so it is serialized like INTEGER.
    case LogicalTypeId.SQLNULL:
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
        // DuckDB before 2.0 serializes strings as a list (field 102); 2.0+ uses two blobs (fields 107-109).
        const data =
          deserializer.readPropertyWithDefault<string[] | null>(
            102,
            readStringList,
            null,
          ) ?? readStringBlobs(deserializer, validity);
        vector = {
          ...baseVector,
          kind: 'string',
          data,
        };
      }
      break;
    case LogicalTypeId.BLOB:
    case LogicalTypeId.GEOMETRY:
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
    case LogicalTypeId.TUPLE:
    case LogicalTypeId.UNION:
      {
        const { typeInfo } = type;
        if (!typeInfo) {
          throw new Error(`STRUCT, TUPLE or UNION without typeInfo`);
        }
        if (typeInfo.kind !== 'struct') {
          throw new Error(
            `STRUCT, TUPLE or UNION with wrong typeInfo kind: ${typeInfo.kind}`,
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
