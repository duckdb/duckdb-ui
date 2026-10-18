import { expect, suite, test } from 'vitest';
import { DuckDBTimeNanosecondsValue } from '../src/DuckDBTimeNanosecondsValue';

suite('DuckDBTimeNanosecondsValue', () => {
  test('should render a whole second with no fraction', () => {
    expect(
      new DuckDBTimeNanosecondsValue(45296000000000n).toDuckDBString(),
    ).toStrictEqual('12:34:56');
  });
  test('should render all nine digits of the fraction', () => {
    expect(
      new DuckDBTimeNanosecondsValue(45296123456789n).toDuckDBString(),
    ).toStrictEqual('12:34:56.123456789');
  });
  test('should omit trailing zeros of the fraction', () => {
    expect(
      new DuckDBTimeNanosecondsValue(45296120000000n).toDuckDBString(),
    ).toStrictEqual('12:34:56.12');
  });
  test('should render a single nanosecond', () => {
    expect(new DuckDBTimeNanosecondsValue(1n).toDuckDBString()).toStrictEqual(
      '00:00:00.000000001',
    );
  });
  test('should render the end of the day', () => {
    expect(
      new DuckDBTimeNanosecondsValue(86400000000000n).toDuckDBString(),
    ).toStrictEqual('24:00:00');
  });
  test('toSql', () => {
    expect(
      new DuckDBTimeNanosecondsValue(45296123456789n).toSql(),
    ).toStrictEqual("TIME_NS '12:34:56.123456789'");
  });
  test('toJson', () => {
    expect(
      new DuckDBTimeNanosecondsValue(45296123456789n).toJson(),
    ).toStrictEqual('12:34:56.123456789');
  });
});
