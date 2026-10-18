import { expect, suite, test } from 'vitest';
import { DuckDBTimestampSecondsValue } from '../src/DuckDBTimestampSecondsValue';

suite('DuckDBTimestampSecondsValue', () => {
  test('should render a normal timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampSecondsValue(1612325106n).toString(),
    ).toStrictEqual('2021-02-03 04:05:06');
  });
  test('should render a zero timestamp value to the correct string', () => {
    expect(new DuckDBTimestampSecondsValue(0n).toString()).toStrictEqual(
      '1970-01-01 00:00:00',
    );
  });
  test('should render a negative timestamp value to the correct string', () => {
    expect(new DuckDBTimestampSecondsValue(-7n).toString()).toStrictEqual(
      '1969-12-31 23:59:53',
    );
  });
  test('should render a large positive timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampSecondsValue(2353318271999n).toString(),
    ).toStrictEqual('76543-09-08 23:59:59');
  });
  test('should render a large negative (AD) timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampSecondsValue(-58261244277n).toString(),
    ).toStrictEqual('0123-10-11 01:02:03');
  });
  test('should render a large negative (BC) timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampSecondsValue(-65992661877n).toString(),
    ).toStrictEqual('0123-10-11 (BC) 01:02:03');
  });
  test('should render the max timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampSecondsValue(9223372036854n).toString(),
    ).toStrictEqual('294247-01-10 04:00:54');
  });
  test('should render the min timestamp value to the correct string', () => {
    expect(
      new DuckDBTimestampSecondsValue(-9223372022400n).toString(),
    ).toStrictEqual('290309-12-22 (BC) 00:00:00');
  });

  test('should render infinity and -infinity', () => {
    expect(
      new DuckDBTimestampSecondsValue(9223372036854775807n).toString(),
    ).toStrictEqual('infinity');
    expect(
      new DuckDBTimestampSecondsValue(-9223372036854775807n).toString(),
    ).toStrictEqual('-infinity');
  });

  suite('toSql', () => {
    test('should render timestamp to SQL', () => {
      const timestamp = new DuckDBTimestampSecondsValue(BigInt(1697212800));
      expect(timestamp.toSql()).toMatch(/^TIMESTAMP_S '.+'$/);
    });

    test('should render epoch to SQL', () => {
      expect(new DuckDBTimestampSecondsValue(0n).toSql()).toStrictEqual(
        "TIMESTAMP_S '1970-01-01 00:00:00'",
      );
    });
  });
});
