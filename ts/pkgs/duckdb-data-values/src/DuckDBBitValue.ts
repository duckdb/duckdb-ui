import { Json } from './Json.js';
import { SpecialDuckDBValue } from './SpecialDuckDBValue.js';

export class DuckDBBitValue extends SpecialDuckDBValue {
  public readonly data: Uint8Array;

  constructor(data: Uint8Array) {
    super();
    this.data = data;
  }

  public padding(): number {
    return this.data[0];
  }

  public get length(): number {
    return (this.data.length - 1) * 8 - this.padding();
  }

  public getBool(index: number): boolean {
    const offset = index + this.padding();
    const dataIndex = Math.floor(offset / 8) + 1;
    const byte = this.data[dataIndex] >> (7 - (offset % 8));
    return (byte & 1) !== 0;
  }

  public toBools(): boolean[] {
    const bools: boolean[] = [];
    const length = this.length;
    for (let i = 0; i < length; i++) {
      bools.push(this.getBool(i));
    }
    return bools;
  }

  public getBit(index: number): 0 | 1 {
    return this.getBool(index) ? 1 : 0;
  }

  public toBits(): number[] {
    const bits: number[] = [];
    const length = this.length;
    for (let i = 0; i < length; i++) {
      bits.push(this.getBit(i));
    }
    return bits;
  }

  public toDuckDBString(): string {
    const length = this.length;
    const chars = Array.from<string>({ length });
    for (let i = 0; i < length; i++) {
      chars[i] = this.getBool(i) ? '1' : '0';
    }
    return chars.join('');
  }

  public toJson(): Json {
    return this.toDuckDBString();
  }

  public static fromString(str: string, on: string = '1'): DuckDBBitValue {
    return DuckDBBitValue.fromLengthAndPredicate(
      str.length,
      (i) => str[i] === on,
    );
  }

  public static fromBits(
    bits: readonly number[],
    on: number = 1,
  ): DuckDBBitValue {
    return DuckDBBitValue.fromLengthAndPredicate(
      bits.length,
      (i) => bits[i] === on,
    );
  }

  public static fromBools(bools: readonly boolean[]): DuckDBBitValue {
    return DuckDBBitValue.fromLengthAndPredicate(bools.length, (i) => bools[i]);
  }

  public static fromLengthAndPredicate(
    length: number,
    predicate: (index: number) => boolean,
  ): DuckDBBitValue {
    const byteCount = Math.ceil(length / 8) + 1;
    const paddingBitCount = (8 - (length % 8)) % 8;

    const data = new Uint8Array(byteCount);
    let byteIndex = 0;

    // first byte contains count of padding bits
    data[byteIndex++] = paddingBitCount;

    let byte = 0;
    let byteBit = 0;

    // padding consists of 1s in MSB of second byte
    while (byteBit < paddingBitCount) {
      byte <<= 1;
      byte |= 1;
      byteBit++;
    }

    let bitIndex = 0;

    while (byteIndex < byteCount) {
      while (byteBit < 8) {
        byte <<= 1;
        if (predicate(bitIndex++)) {
          byte |= 1;
        }
        byteBit++;
      }
      data[byteIndex++] = byte;
      byte = 0;
      byteBit = 0;
    }

    return new DuckDBBitValue(data);
  }
}
