import {
  BinaryDeserializer,
  ListReader,
  Reader,
} from '../classes/BinaryDeserializer.js';

export function readUnsupported(deserializer: BinaryDeserializer): void {
  deserializer.throwUnsupported();
}

export function readNullable<T>(
  deserializer: BinaryDeserializer,
  reader: Reader<T>,
): T | null {
  return deserializer.readNullable(reader);
}

export function readUint8(deserializer: BinaryDeserializer): number {
  return deserializer.readUint8();
}

export function readBoolean(deserializer: BinaryDeserializer): boolean {
  return deserializer.readUint8() !== 0;
}

export function readVarInt(deserializer: BinaryDeserializer): number {
  return deserializer.readVarInt();
}

export function readSignedVarInt(deserializer: BinaryDeserializer): number {
  return deserializer.readSignedVarInt();
}

export function readVarIntList(deserializer: BinaryDeserializer): number[] {
  return readList(deserializer, readVarInt);
}

export function readData(deserializer: BinaryDeserializer): DataView {
  return deserializer.readData();
}

export function readDataList(deserializer: BinaryDeserializer): DataView[] {
  return readList(deserializer, readData);
}

export function readString(deserializer: BinaryDeserializer): string {
  return deserializer.readString();
}

export function readList<T>(
  deserializer: BinaryDeserializer,
  reader: ListReader<T>,
): T[] {
  return deserializer.readList(reader);
}

export function readStringList(deserializer: BinaryDeserializer): string[] {
  return readList(deserializer, readString);
}

export function readPair<T, U>(
  deserializer: BinaryDeserializer,
  firstReader: Reader<T>,
  secondReader: Reader<U>,
): [T, U] {
  return deserializer.readPair(firstReader, secondReader);
}
