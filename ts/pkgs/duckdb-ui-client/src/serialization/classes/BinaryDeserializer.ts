import { BinaryStreamReader } from './BinaryStreamReader.js';

export type Reader<T> = (deserializer: BinaryDeserializer) => T;
export type ListReader<T> = (
  deserializer: BinaryDeserializer,
  index: number,
) => T;

const decoder = new TextDecoder();

/**
 * An implementation of a subset of DuckDB's BinaryDeserializer.
 *
 * See:
 * - https://github.com/duckdb/duckdb/blob/main/src/include/duckdb/common/serializer/binary_deserializer.hpp
 * - https://github.com/duckdb/duckdb/blob/main/src/common/serializer/binary_deserializer.cpp
 */
export class BinaryDeserializer {
  private reader: BinaryStreamReader;

  public constructor(reader: BinaryStreamReader) {
    this.reader = reader;
  }

  private peekFieldId() {
    return this.reader.peekUint16(true);
  }

  private consumeFieldId() {
    this.reader.consume(2);
  }

  private checkFieldId(possibleFieldId: number) {
    const fieldId = this.peekFieldId();
    if (fieldId === possibleFieldId) {
      this.consumeFieldId();
      return true;
    }
    return false;
  }

  private expectFieldId(expectedFieldId: number) {
    const fieldId = this.peekFieldId();
    if (fieldId === expectedFieldId) {
      this.consumeFieldId();
    } else {
      throw new Error(
        `Expected field id ${expectedFieldId} but got ${fieldId} (offset=${this.reader.getOffset()})`,
      );
    }
  }

  public expectObjectEnd() {
    this.expectFieldId(0xffff);
  }

  public throwUnsupported() {
    throw new Error(`unsupported type, offset=${this.reader.getOffset()}`);
  }

  public readUint8() {
    return this.reader.readUint8();
  }

  /**
   * Read an unsigned LEB128 varint. Uses arithmetic rather than bitwise operators, which are limited to 32 bits.
   * Throws if the value can't be represented exactly as a number.
   */
  public readVarInt() {
    let result = 0;
    let byte = 0;
    let multiplier = 1;
    do {
      byte = this.reader.readUint8();
      result += (byte & 0x7f) * multiplier;
      multiplier *= 0x80;
    } while (byte & 0x80);
    if (!Number.isSafeInteger(result)) {
      throw new Error(
        `varint exceeds Number.MAX_SAFE_INTEGER (offset=${this.reader.getOffset()})`,
      );
    }
    return result;
  }

  /**
   * Read a signed LEB128 varint, as DuckDB writes signed integers. Throws if the value can't be represented exactly as
   * a number.
   */
  public readSignedVarInt() {
    let result = 0;
    let multiplier = 1;
    let byte = this.reader.readUint8();
    while (byte & 0x80) {
      result += (byte & 0x7f) * multiplier;
      multiplier *= 0x80;
      byte = this.reader.readUint8();
    }
    // The last byte's 0x40 bit is the sign. Apply it within that byte's contribution, rather than sign-extending the
    // whole result afterwards, so values near the safe integer limits don't lose precision.
    result += ((byte & 0x3f) - (byte & 0x40)) * multiplier;
    if (!Number.isSafeInteger(result)) {
      throw new Error(
        `signed varint exceeds the safe integer range (offset=${this.reader.getOffset()})`,
      );
    }
    return result;
  }

  public readFloat32() {
    return this.reader.readData(4).getFloat32(0, true);
  }

  public readFloat64() {
    return this.reader.readData(8).getFloat64(0, true);
  }

  public readNullable<T>(reader: Reader<T>) {
    const present = this.readUint8();
    if (present) {
      return reader(this);
    }
    return null;
  }

  public readData() {
    const length = this.readVarInt();
    return this.reader.readData(length);
  }

  public readString() {
    const length = this.readVarInt();
    const dv = this.reader.readData(length);
    return decoder.decode(dv);
  }

  public readList<T>(reader: ListReader<T>) {
    const count = this.readVarInt();
    const items: T[] = [];
    for (let i = 0; i < count; i++) {
      items.push(reader(this, i));
    }
    return items;
  }

  public readPair<T, U>(
    firstReader: Reader<T>,
    secondReader: Reader<U>,
  ): [T, U] {
    const first = this.readProperty(0, firstReader);
    const second = this.readProperty(1, secondReader);
    this.expectObjectEnd();
    return [first, second];
  }

  public readProperty<T>(expectedFieldId: number, reader: Reader<T>) {
    this.expectFieldId(expectedFieldId);
    return reader(this);
  }

  public readPropertyWithDefault<T>(
    possibleFieldId: number,
    reader: Reader<T>,
    defaultValue: T,
  ): T {
    if (this.checkFieldId(possibleFieldId)) {
      return reader(this);
    }
    return defaultValue;
  }
}
