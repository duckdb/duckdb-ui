import { SpecialDuckDBValue } from '@duckdb/data-values';
import { expect, suite, test } from 'vitest';
import { duckDBTypeFromTypeIdAndInfo } from '../../../src/conversion/functions/duckDBTypeFromTypeIdAndInfo';
import { duckDBValueFromVector } from '../../../src/conversion/functions/duckDBValueFromVector';
import { deserializerFromBuffer } from '../../../src/serialization/functions/deserializeFromBuffer';
import { readQueryResult } from '../../../src/serialization/functions/resultReaders';
import { timeOracleResponses } from '../../fixtures/timeOracleResponses';

function bufferFromHex(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

interface Row {
  /** The value's string, as formatted by @duckdb/data-values. */
  formatted: string | null;
  /** The value's string, as formatted by DuckDB. */
  expected: string | null;
}

/** Decodes a response of columns `t` (the value) and `s` (`t::varchar`). */
function decodeRows(
  hex: string,
  timeZone?: string,
): { type: string; rows: Row[] } {
  const result = readQueryResult(deserializerFromBuffer(bufferFromHex(hex)));
  if (!result.success) {
    throw new Error(result.error);
  }
  const [valueType, stringType] = result.columnNamesAndTypes.types;
  const rows: Row[] = [];
  for (const chunk of result.chunks) {
    for (let i = 0; i < chunk.rowCount; i++) {
      const value = duckDBValueFromVector(valueType, chunk.vectors[0], i);
      const expected = duckDBValueFromVector(stringType, chunk.vectors[1], i);
      if (value !== null && !(value instanceof SpecialDuckDBValue)) {
        throw new Error(`unexpected value: ${String(value)}`);
      }
      rows.push({
        formatted: value === null ? null : value.toDuckDBString({ timeZone }),
        expected: expected as string | null,
      });
    }
  }
  return { type: duckDBTypeFromTypeIdAndInfo(valueType).toString(), rows };
}

suite('TIME_NS', () => {
  for (const version of ['v1.5.6', 'main'] as const) {
    test(`formats like DuckDB (${version})`, () => {
      const { type, rows } = decodeRows(timeOracleResponses.timeNs[version]);
      expect(type).toBe('TIME_NS');
      expect(rows.length).toBe(12);
      for (const row of rows) {
        expect(row.formatted).toBe(row.expected);
      }
      expect(rows.map((row) => row.expected)).toContain('23:59:59.999999999');
      expect(rows.map((row) => row.expected)).toContain('24:00:00');
    });
  }
});

suite('TIMESTAMP_NS', () => {
  for (const version of ['v1.5.6', 'main'] as const) {
    test(`formats like DuckDB (${version})`, () => {
      const { type, rows } = decodeRows(
        timeOracleResponses.timestampNs[version],
      );
      expect(type).toBe('TIMESTAMP_NS');
      expect(rows.length).toBe(version === 'main' ? 24 : 23);
      for (const row of rows) {
        expect(row.formatted).toBe(row.expected);
      }
      const expected = rows.map((row) => row.expected);
      expect(expected).toContain('2262-04-11 23:47:16.854775806');
      expect(expected).toContain('2021-02-03 04:05:06.007891234');
      expect(expected).toContain('infinity');
      expect(expected).toContain('-infinity');
    });
  }
});

for (const [key, typeName] of [
  ['timestampS', 'TIMESTAMP_S'],
  ['timestampMs', 'TIMESTAMP_MS'],
] as const) {
  suite(typeName, () => {
    for (const version of ['v1.5.6', 'main'] as const) {
      test(`formats like DuckDB (${version})`, () => {
        const { type, rows } = decodeRows(timeOracleResponses[key][version]);
        expect(type).toBe(typeName);
        expect(rows.length).toBe(11);
        for (const row of rows) {
          expect(row.formatted).toBe(row.expected);
        }
        const expected = rows.map((row) => row.expected);
        expect(expected).toContain('infinity');
        expect(expected).toContain('-infinity');
      });
    }
  });
}

/**
 * DuckDB 1.5.6 prints offsets with seconds truncated to minutes (e.g. +05:21 for +05:21:10), though it shifts the time
 * by the whole offset. We match DuckDB 2.0, which prints the whole offset, so compare 1.5.6's strings with ours after
 * dropping the seconds of the offset.
 */
function withOffsetInMinutes(str: string | null): string | null {
  return str === null ? null : str.replace(/([+-]\d\d:\d\d):\d\d$/, '$1');
}

suite('TIMESTAMPTZ', () => {
  for (const version of ['v1.5.6', 'main'] as const) {
    for (const [timeZone, hex] of Object.entries(
      timeOracleResponses.timestampTz[version],
    )) {
      test(`formats like DuckDB in ${timeZone} (${version})`, () => {
        const { type, rows } = decodeRows(hex, timeZone);
        expect(type).toBe('TIMESTAMP WITH TIME ZONE');
        expect(rows.length).toBe(16);
        for (const row of rows) {
          if (version === 'main') {
            expect(row.formatted).toBe(row.expected);
          } else if (row.expected?.startsWith('294247-01-')) {
            // DuckDB 1.5.6 prints the maximum TIMESTAMPTZ (from test_all_types(), on January 9 or 10 depending on the
            // time zone) with a fraction that's off by a millisecond, e.g. 294247-01-10 04:00:54.776806+00 for
            // 04:00:54.775806+00. DuckDB 2.0 prints it correctly.
          } else {
            expect(withOffsetInMinutes(row.formatted)).toBe(row.expected);
          }
        }
      });
    }
  }
  test('includes offsets with seconds', () => {
    const { rows } = decodeRows(
      timeOracleResponses.timestampTz.main['Asia/Kolkata'],
      'Asia/Kolkata',
    );
    expect(rows.map((row) => row.formatted)).toContain(
      '1900-01-01 05:21:10.000001+05:21:10',
    );
  });
});

suite('TIMESTAMPTZ_NS', () => {
  for (const [timeZone, hex] of Object.entries(
    timeOracleResponses.timestampTzNs,
  )) {
    test(`formats like DuckDB in ${timeZone}`, () => {
      const { type, rows } = decodeRows(hex, timeZone);
      expect(type).toBe('TIMESTAMPTZ_NS');
      expect(rows.length).toBe(17);
      for (const row of rows) {
        expect(row.formatted).toBe(row.expected);
      }
      expect(rows.map((row) => row.expected)).toContain('infinity');
      expect(rows.map((row) => row.expected)).toContain('-infinity');
    });
  }
  test('includes offsets with seconds', () => {
    // Local mean time, before standard time zones.
    const { rows } = decodeRows(
      timeOracleResponses.timestampTzNs['America/Los_Angeles'],
      'America/Los_Angeles',
    );
    expect(rows.map((row) => row.expected)).toContain(
      '1677-09-21 16:07:02-07:52:58',
    );
  });
});
