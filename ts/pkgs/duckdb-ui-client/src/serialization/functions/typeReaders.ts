import { BinaryDeserializer } from '../classes/BinaryDeserializer.js';
import { BaseTypeInfo, TypeIdAndInfo, TypeInfo } from '../types/TypeInfo.js';
import {
  readList,
  readNullable,
  readPair,
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

/** See ExtraTypeInfo::Deserialize in https://github.com/duckdb/duckdb/blob/main/src/storage/serialization/serialize_types.cpp */
export function readTypeInfo(deserializer: BinaryDeserializer): TypeInfo {
  const typeInfoType = deserializer.readProperty(100, readUint8);
  const alias = deserializer.readPropertyWithDefault(101, readString, null);
  const modifiers = deserializer.readPropertyWithDefault(
    102,
    readUnsupported,
    null,
  );
  const baseInfo: BaseTypeInfo = {
    ...(alias ? { alias } : {}),
    ...(modifiers ? { modifiers } : {}),
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
        const childTypes = deserializer.readProperty(200, readStructEntryList);
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
