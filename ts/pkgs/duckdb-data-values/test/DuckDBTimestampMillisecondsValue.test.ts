import { expect, suite, test } from 'vitest';
import { DuckDBTimestampMillisecondsValue } from '../src/DuckDBTimestampMillisecondsValue';

suite('DuckDBTimestampMillisecondsValue', () => {
  test('should render a normal timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampMillisecondsValue(1612325106007n).toString(),
    ).toStrictEqual('2021-02-03 04:05:06.007');
  });
  test('should render a zero timestamp value to the correct string', () => {
    expect(new DuckDBTimestampMillisecondsValue(0n).toString()).toStrictEqual(
      '1970-01-01 00:00:00',
    );
  });
  test('should render a negative timestamp value to the correct string', () => {
    expect(new DuckDBTimestampMillisecondsValue(-7n).toString()).toStrictEqual(
      '1969-12-31 23:59:59.993',
    );
  });
  test('should render a large positive timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampMillisecondsValue(2353318271999999n).toString(),
    ).toStrictEqual('76543-09-08 23:59:59.999');
  });
  test('should render a large negative (AD) timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampMillisecondsValue(-58261244276544n).toString(),
    ).toStrictEqual('0123-10-11 01:02:03.456');
  });
  test('should render a large negative (BC) timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampMillisecondsValue(-65992661876544n).toString(),
    ).toStrictEqual('0123-10-11 (BC) 01:02:03.456');
  });
  test('should render the max timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampMillisecondsValue(9223372036854775n).toString(),
    ).toStrictEqual('294247-01-10 04:00:54.775');
  });
  test('should render the min timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampMillisecondsValue(-9223372022400000n).toString(),
    ).toStrictEqual('290309-12-22 (BC) 00:00:00');
  });

  test('should render infinity and -infinity', () => {
    expect(
      new DuckDBTimestampMillisecondsValue(9223372036854775807n).toString(),
    ).toStrictEqual('infinity');
    expect(
      new DuckDBTimestampMillisecondsValue(-9223372036854775807n).toString(),
    ).toStrictEqual('-infinity');
  });

  suite('toSql', () => {
    test('should render timestamp to SQL', () => {
      const timestamp = new DuckDBTimestampMillisecondsValue(
        BigInt(1697212800) * 1000n,
      );
      expect(timestamp.toSql()).toMatch(/^TIMESTAMP_MS '.+'$/);
    });

    test('should render epoch to SQL', () => {
      expect(new DuckDBTimestampMillisecondsValue(0n).toSql()).toStrictEqual(
        "TIMESTAMP_MS '1970-01-01 00:00:00'",
      );
    });
  });
});
