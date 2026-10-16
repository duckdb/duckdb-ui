import { expect, suite, test } from 'vitest';
import { BinaryDeserializer } from '../../../src/serialization/classes/BinaryDeserializer';
import { BinaryStreamReader } from '../../../src/serialization/classes/BinaryStreamReader';
import { LogicalTypeId } from '../../../src/serialization/constants/LogicalTypeId';
import {
  readType,
  readTypeInfo,
} from '../../../src/serialization/functions/typeReaders';
import { makeBuffer } from '../../helpers/makeBuffer';

/** Field ids are serialized as little-endian uint16s. */
function field(id: number): number[] {
  return [id & 0xff, id >> 8];
}

/** Strings are serialized as a varint length followed by UTF-8 bytes. */
function string(str: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(str));
  if (bytes.length > 0x7f) {
    throw new Error('this helper supports only strings shorter than 128 bytes');
  }
  return [bytes.length, ...bytes];
}

const OBJECT_END = field(0xffff);

function deserializer(bytes: number[]): BinaryDeserializer {
  return new BinaryDeserializer(new BinaryStreamReader(makeBuffer(bytes)));
}

/** Bytes of a serialized ExtraTypeInfo with the given tag, optional alias, and body. */
function typeInfoBytes(
  typeInfoType: number,
  body: number[],
  alias?: string,
): number[] {
  return [
    ...field(100),
    typeInfoType,
    ...(alias ? [...field(101), ...string(alias)] : []),
    ...body,
    ...OBJECT_END,
  ];
}

/** Bytes of a serialized LogicalType with the given id and optional type info. */
function typeBytes(id: number, typeInfo?: number[]): number[] {
  return [
    ...field(100),
    id,
    ...(typeInfo ? [...field(101), 1, ...typeInfo] : []),
    ...OBJECT_END,
  ];
}

/** Body of a STRING_TYPE_INFO with a non-empty collation. */
function collationBytes(collation: string): number[] {
  return [...field(200), ...string(collation)];
}

suite('readTypeInfo', () => {
  test('string type info with collation', () => {
    expect(
      readTypeInfo(deserializer(typeInfoBytes(3, collationBytes('NOCASE')))),
    ).toEqual({
      kind: 'string',
      collation: 'NOCASE',
    });
  });
  test('string type info without collation', () => {
    // An empty collation is not written, since it's the default.
    expect(readTypeInfo(deserializer(typeInfoBytes(3, [])))).toEqual({
      kind: 'string',
      collation: '',
    });
  });
  test('string type info with alias', () => {
    expect(
      readTypeInfo(
        deserializer(typeInfoBytes(3, collationBytes('NOCASE'), 'my_string')),
      ),
    ).toEqual({
      kind: 'string',
      alias: 'my_string',
      collation: 'NOCASE',
    });
  });
  test('geo type info with coordinate reference system', () => {
    expect(
      readTypeInfo(
        deserializer(
          typeInfoBytes(13, [
            ...field(200),
            ...field(100),
            ...string('OGC:CRS84'),
            ...OBJECT_END,
          ]),
        ),
      ),
    ).toEqual({
      kind: 'geo',
      crs: 'OGC:CRS84',
    });
  });
  test('geo type info with empty coordinate reference system', () => {
    // An empty definition is not written, since it's the default.
    expect(
      readTypeInfo(
        deserializer(typeInfoBytes(13, [...field(200), ...OBJECT_END])),
      ),
    ).toEqual({
      kind: 'geo',
      crs: '',
    });
  });
  test('unsupported type info', () => {
    // AGGREGATE_STATE_TYPE_INFO is not yet supported.
    expect(() => readTypeInfo(deserializer(typeInfoBytes(8, [])))).toThrowError(
      'unsupported type info: 8',
    );
  });
});

suite('readType', () => {
  test('VARCHAR with collation', () => {
    expect(
      readType(
        deserializer(
          typeBytes(
            LogicalTypeId.VARCHAR,
            typeInfoBytes(3, collationBytes('NOCASE')),
          ),
        ),
      ),
    ).toEqual({
      id: LogicalTypeId.VARCHAR,
      typeInfo: { kind: 'string', collation: 'NOCASE' },
    });
  });
  test('LIST of VARCHAR with collation', () => {
    const childTypeBytes = typeBytes(
      LogicalTypeId.VARCHAR,
      typeInfoBytes(3, collationBytes('NOCASE')),
    );
    expect(
      readType(
        deserializer(
          typeBytes(
            LogicalTypeId.LIST,
            typeInfoBytes(4, [...field(200), ...childTypeBytes]),
          ),
        ),
      ),
    ).toEqual({
      id: LogicalTypeId.LIST,
      typeInfo: {
        kind: 'list',
        childType: {
          id: LogicalTypeId.VARCHAR,
          typeInfo: { kind: 'string', collation: 'NOCASE' },
        },
      },
    });
  });
});
