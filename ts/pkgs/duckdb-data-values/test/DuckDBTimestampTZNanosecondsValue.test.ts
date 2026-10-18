import { expect, suite, test } from 'vitest';
import { DuckDBTimestampTZNanosecondsValue } from '../src/DuckDBTimestampTZNanosecondsValue';

// 2021-02-03 04:05:06.007800009 UTC
const value = new DuckDBTimestampTZNanosecondsValue(1612325106007800009n);

suite('DuckDBTimestampTZNanosecondsValue', () => {
  test('should default to UTC', () => {
    expect(value.toDuckDBString()).toStrictEqual(
      '2021-02-03 04:05:06.007800009+00',
    );
  });
  test('should render in a time zone west of GMT', () => {
    expect(
      value.toDuckDBString({ timeZone: 'America/New_York' }),
    ).toStrictEqual('2021-02-02 23:05:06.007800009-05');
  });
  test('should render in a time zone with a half-hour offset', () => {
    expect(value.toDuckDBString({ timeZone: 'Asia/Kolkata' })).toStrictEqual(
      '2021-02-03 09:35:06.007800009+05:30',
    );
  });
  test('should render an offset with seconds', () => {
    // 1900-01-01 00:00:00 UTC, when Asia/Kolkata used a local mean time offset of +05:21:10.
    expect(
      new DuckDBTimestampTZNanosecondsValue(
        -2208988800000000000n,
      ).toDuckDBString({ timeZone: 'Asia/Kolkata' }),
    ).toStrictEqual('1900-01-01 05:21:10+05:21:10');
  });
  test('should render a nanosecond before the epoch', () => {
    expect(
      new DuckDBTimestampTZNanosecondsValue(-1n).toDuckDBString(),
    ).toStrictEqual('1969-12-31 23:59:59.999999999+00');
  });
  test('should render infinity and -infinity', () => {
    expect(
      new DuckDBTimestampTZNanosecondsValue(
        9223372036854775807n,
      ).toDuckDBString(),
    ).toStrictEqual('infinity');
    expect(
      new DuckDBTimestampTZNanosecondsValue(
        -9223372036854775807n,
      ).toDuckDBString(),
    ).toStrictEqual('-infinity');
  });
  test('toSql', () => {
    expect(value.toSql({ timeZone: 'UTC' })).toStrictEqual(
      "TIMESTAMPTZ_NS '2021-02-03 04:05:06.007800009+00'",
    );
  });
  test('toJson', () => {
    expect(value.toJson()).toStrictEqual('2021-02-03 04:05:06.007800009+00');
  });
});
