import { expect, suite, test } from 'vitest';
import { BinaryDeserializer } from '../../../src/serialization/classes/BinaryDeserializer';
import { BinaryStreamReader } from '../../../src/serialization/classes/BinaryStreamReader';
import { LogicalTypeId } from '../../../src/serialization/constants/LogicalTypeId';
import { readVector } from '../../../src/serialization/functions/vectorReaders';
import { makeBuffer } from '../../helpers/makeBuffer';

/** Field ids are serialized as little-endian uint16s. */
function field(id: number): number[] {
  return [id & 0xff, id >> 8];
}

/** Unsigned LEB128 varint. */
function varint(value: number): number[] {
  const bytes: number[] = [];
  do {
    let byte = value & 0x7f;
    value >>>= 7;
    if (value) {
      byte |= 0x80;
    }
    bytes.push(byte);
  } while (value);
  return bytes;
}

/** Blobs are serialized as a varint length followed by the bytes. */
function blob(bytes: number[]): number[] {
  return [...varint(bytes.length), ...bytes];
}

function uint32s(values: number[]): number[] {
  return values.flatMap((v) => [
    v & 0xff,
    (v >> 8) & 0xff,
    (v >> 16) & 0xff,
    (v >>> 24) & 0xff,
  ]);
}

function utf8(str: string): number[] {
  return Array.from(new TextEncoder().encode(str));
}

const OBJECT_END = field(0xffff);

function deserializer(bytes: number[]): BinaryDeserializer {
  return new BinaryDeserializer(new BinaryStreamReader(makeBuffer(bytes)));
}

/** A validity mask (one uint64 per 64 rows, bit set = valid) with the given rows valid. */
function validityMask(valid: boolean[]): number[] {
  const bytes = new Array<number>(Math.ceil(valid.length / 64) * 8).fill(0);
  valid.forEach((v, i) => {
    if (v) {
      bytes[i >> 3] |= 1 << (i & 7);
    }
  });
  return bytes;
}

/** Bytes of the validity part of a vector: field 100, then the mask (field 101) if there is one. */
function validityBytes(valid?: boolean[]): number[] {
  return valid
    ? [...field(100), 1, ...field(101), ...blob(validityMask(valid))]
    : [...field(100), 0];
}

/** Bytes of a VARCHAR vector in the DuckDB 2.0+ format. */
function stringBlobsVectorBytes(
  lengths: number[],
  byteData: number[],
  {
    byteDataLength = byteData.length,
    valid,
  }: { byteDataLength?: number; valid?: boolean[] } = {},
): number[] {
  return [
    ...validityBytes(valid),
    ...field(107),
    ...varint(byteDataLength),
    ...field(108),
    ...blob(uint32s(lengths)),
    ...field(109),
    ...blob(byteData),
    ...OBJECT_END,
  ];
}

suite('readVector', () => {
  test('VARCHAR in list format (DuckDB < 2.0)', () => {
    const d = deserializer([
      ...field(100),
      0,
      ...field(102),
      2,
      ...blob(utf8('duck')),
      ...blob(utf8('')),
      ...OBJECT_END,
    ]);
    expect(readVector(d, { id: LogicalTypeId.VARCHAR })).toStrictEqual({
      allValid: 0,
      validity: null,
      kind: 'string',
      data: ['duck', ''],
    });
  });
  test('VARCHAR in two-blob format (DuckDB 2.0+)', () => {
    const strings = ['duck', '', 'ü€😀'];
    const d = deserializer(
      stringBlobsVectorBytes(
        strings.map((s) => utf8(s).length),
        strings.flatMap(utf8),
      ),
    );
    expect(readVector(d, { id: LogicalTypeId.VARCHAR })).toStrictEqual({
      allValid: 0,
      validity: null,
      kind: 'string',
      data: strings,
    });
  });
  test('CHAR in two-blob format (DuckDB 2.0+)', () => {
    const d = deserializer(stringBlobsVectorBytes([1], utf8('x')));
    expect(readVector(d, { id: LogicalTypeId.CHAR })).toMatchObject({
      kind: 'string',
      data: ['x'],
    });
  });
  test('VARCHAR in two-blob format with zero rows', () => {
    const d = deserializer(stringBlobsVectorBytes([], []));
    expect(readVector(d, { id: LogicalTypeId.VARCHAR })).toMatchObject({
      kind: 'string',
      data: [],
    });
  });
  test('VARCHAR in two-blob format with mismatched byte data length', () => {
    const d = deserializer(
      stringBlobsVectorBytes([4], utf8('duck'), { byteDataLength: 5 }),
    );
    expect(() => readVector(d, { id: LogicalTypeId.VARCHAR })).toThrow(
      'string byte data has byte length 4 but expected 5',
    );
  });
  test('VARCHAR in two-blob format with lengths exceeding byte data', () => {
    const d = deserializer(stringBlobsVectorBytes([4, 1], utf8('duck')));
    expect(() => readVector(d, { id: LogicalTypeId.VARCHAR })).toThrow(
      'string lengths exceed byte data length 4',
    );
  });
  test('VARCHAR in two-blob format with unused byte data', () => {
    // Like DuckDB's reader, only lengths running past the byte data are an error.
    const d = deserializer(stringBlobsVectorBytes([3], utf8('duck')));
    expect(readVector(d, { id: LogicalTypeId.VARCHAR })).toMatchObject({
      kind: 'string',
      data: ['duc'],
    });
  });
  test('VARCHAR in two-blob format with invalid rows', () => {
    const d = deserializer(
      stringBlobsVectorBytes([0, 4, 0, 3, 0], utf8('duckfly'), {
        valid: [false, true, false, true, false],
      }),
    );
    expect(readVector(d, { id: LogicalTypeId.VARCHAR })).toMatchObject({
      allValid: 1,
      kind: 'string',
      data: ['', 'duck', '', 'fly', ''],
    });
  });
  test('VARCHAR in two-blob format with a nonzero length for an invalid row', () => {
    // Like DuckDB's reader, an invalid row consumes no bytes, whatever its length.
    const d = deserializer(
      stringBlobsVectorBytes([4, 9, 3], utf8('duckfly'), {
        valid: [true, false, true],
      }),
    );
    expect(readVector(d, { id: LogicalTypeId.VARCHAR })).toMatchObject({
      kind: 'string',
      data: ['duck', '', 'fly'],
    });
  });
  test('VARCHAR in two-blob format with more than 64 rows', () => {
    // The mask spans two uint64s; row 64 is the first row of the second.
    const valid = Array.from({ length: 70 }, (_, i) => i % 3 !== 0);
    const strings = valid.map((v, i) => (v ? String(i) : ''));
    const d = deserializer(
      stringBlobsVectorBytes(
        strings.map((s) => utf8(s).length),
        strings.flatMap(utf8),
        { valid },
      ),
    );
    expect(readVector(d, { id: LogicalTypeId.VARCHAR })).toMatchObject({
      kind: 'string',
      data: strings,
    });
  });
  test('LIST of VARCHAR in two-blob format', () => {
    const d = deserializer([
      ...validityBytes(),
      ...field(104),
      3,
      ...field(105),
      2,
      ...field(100),
      0,
      ...field(101),
      2,
      ...OBJECT_END,
      ...field(100),
      2,
      ...field(101),
      1,
      ...OBJECT_END,
      ...field(106),
      ...stringBlobsVectorBytes([1, 0, 3], utf8('afly'), {
        valid: [true, false, true],
      }),
      ...OBJECT_END,
    ]);
    expect(
      readVector(d, {
        id: LogicalTypeId.LIST,
        typeInfo: { kind: 'list', childType: { id: LogicalTypeId.VARCHAR } },
      }),
    ).toMatchObject({
      kind: 'list',
      listSize: 3,
      entries: [
        { offset: 0, length: 2 },
        { offset: 2, length: 1 },
      ],
      child: { kind: 'string', data: ['a', '', 'fly'] },
    });
  });
  test('VARCHAR in two-blob format with truncated length data', () => {
    const d = deserializer([
      ...field(100),
      0,
      ...field(107),
      0,
      ...field(108),
      ...blob([0, 0, 0]),
      ...field(109),
      ...blob([]),
      ...OBJECT_END,
    ]);
    expect(() => readVector(d, { id: LogicalTypeId.VARCHAR })).toThrow(
      'string length data has byte length 3, which is not a multiple of 4',
    );
  });
  test('GEOMETRY with storage format (DuckDB 2.0+)', () => {
    const d = deserializer([
      ...field(99),
      1,
      ...field(100),
      0,
      ...field(102),
      1,
      ...blob([1, 2, 3]),
      ...OBJECT_END,
    ]);
    expect(readVector(d, { id: LogicalTypeId.GEOMETRY })).toMatchObject({
      allValid: 0,
      kind: 'datalist',
      data: [new DataView(new Uint8Array([1, 2, 3]).buffer)],
    });
  });
  test('GEOMETRY without storage format', () => {
    const d = deserializer([
      ...field(100),
      0,
      ...field(102),
      1,
      ...blob([1, 2, 3]),
      ...OBJECT_END,
    ]);
    expect(readVector(d, { id: LogicalTypeId.GEOMETRY })).toMatchObject({
      kind: 'datalist',
    });
  });
  test('SQLNULL', () => {
    // A SQLNULL vector is physically INT32: a validity mask and 4 bytes of data per row.
    const d = deserializer([
      ...field(100),
      1,
      ...field(101),
      ...blob([0, 0, 0, 0, 0, 0, 0, 0]),
      ...field(102),
      ...blob([0, 0, 0, 0]),
      ...OBJECT_END,
    ]);
    expect(readVector(d, { id: LogicalTypeId.SQLNULL })).toMatchObject({
      allValid: 1,
      kind: 'data',
    });
  });
});
