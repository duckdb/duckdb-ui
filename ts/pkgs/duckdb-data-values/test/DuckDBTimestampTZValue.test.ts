import { expect, suite, test } from 'vitest';
import { DuckDBTimestampTZValue } from '../src/DuckDBTimestampTZValue';

suite('DuckDBTimestampTZValue', () => {
  test('should render a timestamptz value with no time zone to the correct string', () => {
    expect(
      new DuckDBTimestampTZValue(1612325106007800n).toDuckDBString(),
    ).toStrictEqual('2021-02-03 04:05:06.0078+00'); // should default to UTC
  });
  test('should render a timestamptz value with a UTC time zone offset to the correct string', () => {
    expect(
      new DuckDBTimestampTZValue(1612325106007800n).toDuckDBString({
        timeZone: 'UTC',
      }),
    ).toStrictEqual('2021-02-03 04:05:06.0078+00');
  });
  test('should render a timestamptz value with a time zone west of GMT to the correct string', () => {
    expect(
      new DuckDBTimestampTZValue(1612325106007800n).toDuckDBString({
        timeZone: 'America/New_York',
      }),
    ).toStrictEqual('2021-02-02 23:05:06.0078-05');
  });
  test('should render a timestamptz value with a time zone west of GMT on DST to the correct string', () => {
    expect(
      new DuckDBTimestampTZValue(1627963506007800n).toDuckDBString({
        timeZone: 'America/New_York',
      }),
    ).toStrictEqual('2021-08-03 00:05:06.0078-04');
  });
  test('should render a timestamptz value with a time zone west of GMT to the correct string', () => {
    expect(
      new DuckDBTimestampTZValue(1612325106007800n).toDuckDBString({
        timeZone: 'America/Phoenix',
      }),
    ).toStrictEqual('2021-02-02 21:05:06.0078-07');
  });
  test('should render a timestamptz value with a time zone west of GMT without DST to the correct string', () => {
    expect(
      new DuckDBTimestampTZValue(1627963506007800n).toDuckDBString({
        timeZone: 'America/Phoenix',
      }),
    ).toStrictEqual('2021-08-02 21:05:06.0078-07');
  });
  test('should render a timestamptz value with a time zone east of GMT to the correct string', () => {
    expect(
      new DuckDBTimestampTZValue(1612325106007800n).toDuckDBString({
        timeZone: 'Europe/Amsterdam',
      }),
    ).toStrictEqual('2021-02-03 05:05:06.0078+01');
  });
  test('should render a timestamptz value with a time zone east of GMT on DST to the correct string', () => {
    expect(
      new DuckDBTimestampTZValue(1627963506007800n).toDuckDBString({
        timeZone: 'Europe/Amsterdam',
      }),
    ).toStrictEqual('2021-08-03 06:05:06.0078+02');
  });
  test('should render a timestamptz value with a time zone containing minutes on DST in the southern hemisphere to the correct string', () => {
    expect(
      new DuckDBTimestampTZValue(1612325106007800n).toDuckDBString({
        timeZone: 'Pacific/Chatham',
      }),
    ).toStrictEqual('2021-02-03 17:50:06.0078+13:45');
  });
  test('should render a timestamptz value with a time zone containing minutes in the southern hemisphere to the correct string', () => {
    expect(
      new DuckDBTimestampTZValue(1627963506007800n).toDuckDBString({
        timeZone: 'Pacific/Chatham',
      }),
    ).toStrictEqual('2021-08-03 16:50:06.0078+12:45');
  });

  suite('toSql', () => {
    test('should render timestamptz to SQL', () => {
      const timestamp = new DuckDBTimestampTZValue(
        BigInt(1697212800) * 1000000n,
      );
      expect(timestamp.toSql()).toMatch(/^TIMESTAMPTZ '.+'$/);
    });

    test('should render epoch to SQL', () => {
      expect(new DuckDBTimestampTZValue(0n).toSql()).toStrictEqual(
        "TIMESTAMPTZ '1970-01-01 00:00:00+00'",
      );
    });
  });
});
