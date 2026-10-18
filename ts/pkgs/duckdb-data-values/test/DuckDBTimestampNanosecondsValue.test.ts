import { expect, suite, test } from 'vitest';
import { DuckDBTimestampNanosecondsValue } from '../src/DuckDBTimestampNanosecondsValue';

suite('DuckDBTimestampNanosecondsValue', () => {
  test('should render a normal timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampNanosecondsValue(1612325106007891000n).toString(),
    ).toStrictEqual('2021-02-03 04:05:06.007891');
  });
  test('should render a zero timestamp value to the correct string', () => {
    expect(new DuckDBTimestampNanosecondsValue(0n).toString()).toStrictEqual(
      '1970-01-01 00:00:00',
    );
  });
  test('should render a negative timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampNanosecondsValue(-7000n).toString(),
    ).toStrictEqual('1969-12-31 23:59:59.999993');
  });
  test('should render a large positive timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampNanosecondsValue(8857641599999123000n).toString(),
    ).toStrictEqual('2250-09-08 23:59:59.999123');
  });
  test('should render a large negative timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampNanosecondsValue(-8495881076543211000n).toString(),
    ).toStrictEqual('1700-10-11 01:02:03.456789');
  });
  test('should render the max timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampNanosecondsValue(9223372036854775806n).toString(),
    ).toStrictEqual('2262-04-11 23:47:16.854775806');
  });
  test('should render the min timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampNanosecondsValue(-9223372036854775806n).toString(),
    ).toStrictEqual('1677-09-21 00:12:43.145224194');
  });
  test('should render all nine digits of the fraction', () => {
    expect(
      new DuckDBTimestampNanosecondsValue(1612325106007891234n).toString(),
    ).toStrictEqual('2021-02-03 04:05:06.007891234');
  });
  test('should render a nanosecond before the epoch', () => {
    expect(new DuckDBTimestampNanosecondsValue(-1n).toString()).toStrictEqual(
      '1969-12-31 23:59:59.999999999',
    );
  });
  test('should render infinity and -infinity', () => {
    expect(
      new DuckDBTimestampNanosecondsValue(9223372036854775807n).toString(),
    ).toStrictEqual('infinity');
    expect(
      new DuckDBTimestampNanosecondsValue(-9223372036854775807n).toString(),
    ).toStrictEqual('-infinity');
  });

  suite('toSql', () => {
    test('should render timestamp to SQL', () => {
      const timestamp = new DuckDBTimestampNanosecondsValue(
        BigInt(1697212800) * 1000000000n,
      );
      expect(timestamp.toSql()).toMatch(/^TIMESTAMP_NS '.+'$/);
    });

    test('should render epoch to SQL', () => {
      expect(new DuckDBTimestampNanosecondsValue(0n).toSql()).toStrictEqual(
        "TIMESTAMP_NS '1970-01-01 00:00:00'",
      );
    });
  });
});
