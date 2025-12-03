/**
 * Returns the JS bigint value represented by the byte array of a BIGNUM in DuckDB's internal format.
 *
 * DuckDB stores BIGNUMs as an array of bytes consisting of a three-byte header followed by a variable number of bytes
 * (at least one). The header specifies the number of bytes after the header, and whether the number is positive or
 * negative. The bytes after the header specify the absolute value of the number, in big endian format.
 *
 * The sign of the number is determined by the MSB of the header, which is 1 for positive and 0 for negative. Negative
 * numbers also have all bytes of both the header and value inverted. (For negative numbers, the MSB is 0 after this
 * inversion. Put another way: the MSB of the header is always 1, but it's inverted for negative numbers.)
 */
export function getBigNumFromBytes(bytes: Uint8Array): bigint {
  const firstByte = bytes[0];
  const positive = (firstByte & 0x80) > 0;
  const uint64Mask = positive ? 0n : 0xffffffffffffffffn;
  const uint8Mask = positive ? 0 : 0xff;
  const dv = new DataView(
    bytes.buffer,
    bytes.byteOffset + 3,
    bytes.byteLength - 3,
  );
  const lastUint64Offset = dv.byteLength - 8;
  let offset = 0;
  let result = 0n;
  while (offset <= lastUint64Offset) {
    result = (result << 64n) | (dv.getBigUint64(offset) ^ uint64Mask);
    offset += 8;
  }
  while (offset < dv.byteLength) {
    result = (result << 8n) | BigInt(dv.getUint8(offset) ^ uint8Mask);
    offset += 1;
  }
  return positive ? result : -result;
}
