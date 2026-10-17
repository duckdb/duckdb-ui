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
  test('type info with extension info', () => {
    // A generic type info with alias EXT and extension info: modifiers [100, 'x' labeled 'lbl'], properties {p: true}.
    const intValue = [
      ...field(100),
      ...typeBytes(13),
      ...field(101),
      0,
      ...field(102),
      0xe4,
      0x00,
      ...OBJECT_END,
    ];
    const varcharValue = [
      ...field(100),
      ...typeBytes(25),
      ...field(101),
      0,
      ...field(102),
      ...string('x'),
      ...OBJECT_END,
    ];
    const boolValue = [
      ...field(100),
      ...typeBytes(10),
      ...field(101),
      0,
      ...field(102),
      1,
      ...OBJECT_END,
    ];
    const extensionInfo = [
      ...field(100),
      2,
      ...field(100),
      ...intValue,
      ...OBJECT_END,
      ...field(100),
      ...varcharValue,
      ...field(101),
      ...string('lbl'),
      ...OBJECT_END,
      ...field(101),
      1,
      ...field(0),
      ...string('p'),
      ...field(1),
      ...boolValue,
      ...OBJECT_END,
      ...OBJECT_END,
    ];
    expect(
      readTypeInfo(
        deserializer([
          ...field(100),
          1,
          ...field(101),
          ...string('EXT'),
          ...field(103),
          1,
          ...extensionInfo,
          ...OBJECT_END,
        ]),
      ),
    ).toEqual({
      kind: 'generic',
      alias: 'EXT',
      extensionInfo: {
        modifiers: [
          { value: 100, label: '' },
          { value: 'x', label: 'lbl' },
        ],
        properties: { p: true },
      },
    });
  });
  test('type info with empty extension info', () => {
    expect(
      readTypeInfo(
        deserializer([
          ...field(100),
          1,
          ...field(103),
          1,
          ...OBJECT_END,
          ...OBJECT_END,
        ]),
      ),
    ).toEqual({
      kind: 'generic',
      extensionInfo: { modifiers: [], properties: {} },
    });
  });
  test('type info with null modifier value', () => {
    expect(
      readTypeInfo(
        deserializer([
          ...field(100),
          1,
          ...field(103),
          1,
          ...field(100),
          1,
          ...field(100),
          ...field(100),
          ...typeBytes(13),
          ...field(101),
          1,
          ...OBJECT_END,
          ...OBJECT_END,
          ...OBJECT_END,
          ...OBJECT_END,
        ]),
      ),
    ).toEqual({
      kind: 'generic',
      extensionInfo: {
        modifiers: [{ value: null, label: '' }],
        properties: {},
      },
    });
  });
  test('type info with unsupported modifier value type', () => {
    // A DATE modifier value isn't supported.
    expect(() =>
      readTypeInfo(
        deserializer([
          ...field(100),
          1,
          ...field(103),
          1,
          ...field(100),
          1,
          ...field(100),
          ...field(100),
          ...typeBytes(15),
          ...field(101),
          0,
          ...field(102),
          0,
          ...OBJECT_END,
          ...OBJECT_END,
          ...OBJECT_END,
          ...OBJECT_END,
        ]),
      ),
    ).toThrowError('unsupported value type: 15');
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
