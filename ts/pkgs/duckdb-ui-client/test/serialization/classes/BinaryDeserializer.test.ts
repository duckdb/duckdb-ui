import { expect, suite, test } from 'vitest';
import { BinaryDeserializer } from '../../../src/serialization/classes/BinaryDeserializer';
import { BinaryStreamReader } from '../../../src/serialization/classes/BinaryStreamReader';
import {
  readString,
  readUint8,
} from '../../../src/serialization/functions/basicReaders';
import { makeBuffer } from '../../helpers/makeBuffer';

suite('BinaryDeserializer', () => {
  test('read uint8', () => {
    const deserializer = new BinaryDeserializer(
      new BinaryStreamReader(makeBuffer([17, 42])),
    );
    expect(deserializer.readUint8()).toBe(17);
    expect(deserializer.readUint8()).toBe(42);
  });
  test('read varint', () => {
    const deserializer = new BinaryDeserializer(
      new BinaryStreamReader(makeBuffer([0x81, 0x82, 0x03])),
    );
    expect(deserializer.readVarInt()).toBe((3 << 14) | (2 << 7) | 1);
  });
  test('read varint of 2^31 and above', () => {
    const deserializer = new BinaryDeserializer(
      new BinaryStreamReader(
        makeBuffer([
          0x80, 0x80, 0x80, 0x80, 0x08, 0x85, 0x80, 0x80, 0x80, 0x10, 0xff,
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x0f,
        ]),
      ),
    );
    expect(deserializer.readVarInt()).toBe(2 ** 31);
    expect(deserializer.readVarInt()).toBe(2 ** 32 + 5);
    expect(deserializer.readVarInt()).toBe(Number.MAX_SAFE_INTEGER);
  });
  test('read varint too large for a number', () => {
    const deserializer = new BinaryDeserializer(
      new BinaryStreamReader(
        makeBuffer([0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x10]),
      ),
    );
    expect(() => deserializer.readVarInt()).toThrow(
      'varint exceeds Number.MAX_SAFE_INTEGER',
    );
  });
  test('read nullable', () => {
    const deserializer = new BinaryDeserializer(
      new BinaryStreamReader(makeBuffer([0, 1, 17])),
    );
    expect(deserializer.readNullable(readUint8)).toBe(null);
    expect(deserializer.readNullable(readUint8)).toBe(17);
  });
  test('read data', () => {
    const deserializer = new BinaryDeserializer(
      new BinaryStreamReader(makeBuffer([3, 0xa, 0xb, 0xc])),
    );
    const dv = deserializer.readData();
    expect(dv.byteLength).toBe(3);
    expect(dv.getUint8(0)).toBe(0xa);
    expect(dv.getUint8(1)).toBe(0xb);
    expect(dv.getUint8(2)).toBe(0xc);
  });
  test('read string', () => {
    const deserializer = new BinaryDeserializer(
      new BinaryStreamReader(makeBuffer([4, 0x64, 0x75, 0x63, 0x6b])),
    );
    expect(deserializer.readString()).toBe('duck');
  });
  test('read list (of string)', () => {
    const deserializer = new BinaryDeserializer(
      new BinaryStreamReader(
        makeBuffer([
          3, 4, 0x77, 0x61, 0x6c, 0x6b, 4, 0x73, 0x77, 0x69, 0x6d, 3, 0x66,
          0x6c, 0x79,
        ]),
      ),
    );
    expect(deserializer.readList(readString)).toEqual(['walk', 'swim', 'fly']);
  });
  test('read pair', () => {
    const deserializer = new BinaryDeserializer(
      new BinaryStreamReader(
        makeBuffer([0, 0, 4, 0x64, 0x75, 0x63, 0x6b, 1, 0, 42, 0xff, 0xff]),
      ),
    );
    expect(deserializer.readPair(readString, readUint8)).toEqual(['duck', 42]);
  });
  test('read property', () => {
    const deserializer = new BinaryDeserializer(
      new BinaryStreamReader(makeBuffer([100, 0, 4, 0x64, 0x75, 0x63, 0x6b])),
    );
    expect(deserializer.readProperty(100, readString)).toEqual('duck');
  });
  test('read property (not present)', () => {
    const deserializer = new BinaryDeserializer(
      new BinaryStreamReader(makeBuffer([100, 0, 4, 0x64, 0x75, 0x63, 0x6b])),
    );
    expect(() => deserializer.readProperty(101, readString)).toThrowError(
      'Expected field id 101 but got 100 (offset=0)',
    );
  });
  test('read property with default', () => {
    const deserializer = new BinaryDeserializer(
      new BinaryStreamReader(makeBuffer([101, 0, 42])),
    );
    expect(deserializer.readPropertyWithDefault(100, readUint8, 17)).toBe(17);
    expect(deserializer.readPropertyWithDefault(101, readUint8, 17)).toBe(42);
  });
});
