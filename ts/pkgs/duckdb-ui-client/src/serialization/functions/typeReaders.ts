import { BinaryDeserializer } from '../classes/BinaryDeserializer.js';
import { LogicalTypeId } from '../constants/LogicalTypeId.js';
import {
  BaseTypeInfo,
  ExtensionTypeInfo,
  ScalarValue,
  TypeIdAndInfo,
  TypeInfo,
  TypeModifier,
} from '../types/TypeInfo.js';
import {
  readBoolean,
  readList,
  readNullable,
  readPair,
  readSignedVarInt,
  readString,
  readStringList,
  readUint8,
  readUnsupported,
  readVarInt,
} from './basicReaders.js';

export function readStructEntry(
  deserializer: BinaryDeserializer,
): [string, TypeIdAndInfo] {
  return readPair(deserializer, readString, readType);
}

export function readStructEntryList(
  deserializer: BinaryDeserializer,
): [string, TypeIdAndInfo][] {
  return readList(deserializer, readStructEntry);
}

/** See CoordinateReferenceSystem::Deserialize in https://github.com/duckdb/duckdb/blob/main/src/common/types/geometry_crs.cpp */
export function readCoordinateReferenceSystem(
  deserializer: BinaryDeserializer,
): string {
  const definition = deserializer.readPropertyWithDefault(100, readString, '');
  deserializer.expectObjectEnd();
  return definition;
}

/** Read the data of a non-null scalar Value of the given type. See Value::SerializeInternal. */
function readScalarValueData(
  deserializer: BinaryDeserializer,
  type: TypeIdAndInfo,
): ScalarValue {
  switch (type.id) {
    case LogicalTypeId.BOOLEAN:
      return readBoolean(deserializer);
    case LogicalTypeId.TINYINT:
    case LogicalTypeId.SMALLINT:
    case LogicalTypeId.INTEGER:
    case LogicalTypeId.BIGINT:
      return readSignedVarInt(deserializer);
    case LogicalTypeId.UTINYINT:
    case LogicalTypeId.USMALLINT:
    case LogicalTypeId.UINTEGER:
    case LogicalTypeId.UBIGINT:
      return readVarInt(deserializer);
    case LogicalTypeId.FLOAT:
      return deserializer.readFloat32();
    case LogicalTypeId.DOUBLE:
      return deserializer.readFloat64();
    case LogicalTypeId.CHAR:
    case LogicalTypeId.VARCHAR:
    case LogicalTypeId.BLOB: // as an escaped string, e.g. '\x01'
      return readString(deserializer);
    default:
      // The binary format can't be skipped without knowing its shape, so there's no way to ignore other values.
      throw new Error(`unsupported value type: ${type.id}`);
  }
}

/** Read a scalar Value. See Value::Deserialize in https://github.com/duckdb/duckdb/blob/main/src/common/types/value.cpp */
export function readScalarValue(deserializer: BinaryDeserializer): ScalarValue {
  // The type is written for every root (non-nested) value.
  const type = deserializer.readProperty(100, readType);
  const isNull = deserializer.readProperty(101, readBoolean);
  const value = isNull
    ? null
    : deserializer.readProperty(102, (d) => readScalarValueData(d, type));
  deserializer.expectObjectEnd();
  return value;
}

/** See LogicalTypeModifier::Deserialize in https://github.com/duckdb/duckdb/blob/main/src/storage/serialization/serialize_types.cpp */
export function readTypeModifier(
  deserializer: BinaryDeserializer,
): TypeModifier {
  const value = deserializer.readProperty(100, readScalarValue);
  const label = deserializer.readPropertyWithDefault(101, readString, '');
  deserializer.expectObjectEnd();
  return { value, label };
}

/** See ExtensionTypeInfo::Deserialize in https://github.com/duckdb/duckdb/blob/main/src/storage/serialization/serialize_types.cpp */
export function readExtensionTypeInfo(
  deserializer: BinaryDeserializer,
): ExtensionTypeInfo {
  const modifiers = deserializer.readPropertyWithDefault(
    100,
    (d) => readList(d, readTypeModifier),
    [],
  );
  const properties = deserializer.readPropertyWithDefault(
    101,
    (d) =>
      Object.fromEntries(
        readList(d, (pd) => readPair(pd, readString, readScalarValue)),
      ),
    {},
  );
  deserializer.expectObjectEnd();
  return { modifiers, properties };
}

/** See ExtraTypeInfo::Deserialize in https://github.com/duckdb/duckdb/blob/main/src/storage/serialization/serialize_types.cpp */
export function readTypeInfo(deserializer: BinaryDeserializer): TypeInfo {
  const typeInfoType = deserializer.readProperty(100, readUint8);
  const alias = deserializer.readPropertyWithDefault(101, readString, null);
  const modifiers = deserializer.readPropertyWithDefault(
    102,
    readUnsupported,
    null,
  );
  // Written for types with type modifiers or properties, typically ones defined by extensions.
  const extensionInfo = deserializer.readPropertyWithDefault(
    103,
    (d) => readNullable(d, readExtensionTypeInfo),
    null,
  );
  const baseInfo: BaseTypeInfo = {
    ...(alias ? { alias } : {}),
    ...(modifiers ? { modifiers } : {}),
    ...(extensionInfo ? { extensionInfo } : {}),
  };
  let typeInfo: TypeInfo | undefined;
  switch (typeInfoType) {
    case 1: // GENERIC_TYPE_INFO
      typeInfo = {
        ...baseInfo,
        kind: 'generic',
      };
      break;
    case 2: // DECIMAL_TYPE_INFO
      {
        const width = deserializer.readPropertyWithDefault(200, readUint8, 0);
        const scale = deserializer.readPropertyWithDefault(201, readUint8, 0);
        typeInfo = {
          ...baseInfo,
          kind: 'decimal',
          width,
          scale,
        };
      }
      break;
    case 3: // STRING_TYPE_INFO
      {
        // Not written when empty, which is the case for most string types.
        const collation = deserializer.readPropertyWithDefault(
          200,
          readString,
          '',
        );
        typeInfo = {
          ...baseInfo,
          kind: 'string',
          collation,
        };
      }
      break;
    case 4: // LIST_TYPE_INFO
      {
        const childType = deserializer.readProperty(200, readType);
        typeInfo = {
          ...baseInfo,
          kind: 'list',
          childType,
        };
      }
      break;
    case 5: // STRUCT_TYPE_INFO
      {
        // Not written for a struct with no entries (e.g. `STRUCT()`, new in DuckDB 2.0).
        const childTypes = deserializer.readPropertyWithDefault(
          200,
          readStructEntryList,
          [],
        );
        typeInfo = {
          ...baseInfo,
          kind: 'struct',
          childTypes,
        };
      }
      break;
    case 6: // ENUM_TYPE_INFO
      {
        const valuesCount = deserializer.readProperty(200, readVarInt);
        const values = deserializer.readProperty(201, readStringList);
        typeInfo = {
          ...baseInfo,
          kind: 'enum',
          valuesCount,
          values,
        };
      }
      break;
    case 9: // ARRAY_TYPE_INFO
      {
        const childType = deserializer.readProperty(200, readType);
        const size = deserializer.readPropertyWithDefault(201, readVarInt, 0);
        typeInfo = {
          ...baseInfo,
          kind: 'array',
          childType,
          size,
        };
      }
      break;
    case 13: // GEO_TYPE_INFO
      {
        const crs = deserializer.readProperty(
          200,
          readCoordinateReferenceSystem,
        );
        typeInfo = {
          ...baseInfo,
          kind: 'geo',
          crs,
        };
      }
      break;
    default:
      throw new Error(`unsupported type info: ${typeInfoType}`);
  }
  deserializer.expectObjectEnd();
  if (!typeInfo) {
    typeInfo = {
      ...baseInfo,
      kind: 'generic',
    };
  }
  return typeInfo;
}

export function readNullableTypeInfo(
  deserializer: BinaryDeserializer,
): TypeInfo | null {
  return readNullable(deserializer, readTypeInfo);
}

export function readType(deserializer: BinaryDeserializer): TypeIdAndInfo {
  const id = deserializer.readProperty(100, readUint8);
  const typeInfo = deserializer.readPropertyWithDefault(
    101,
    readNullableTypeInfo,
    null,
  );
  deserializer.expectObjectEnd();
  return { id, ...(typeInfo ? { typeInfo } : {}) };
}

export function readTypeList(
  deserializer: BinaryDeserializer,
): TypeIdAndInfo[] {
  return readList(deserializer, readType);
}
