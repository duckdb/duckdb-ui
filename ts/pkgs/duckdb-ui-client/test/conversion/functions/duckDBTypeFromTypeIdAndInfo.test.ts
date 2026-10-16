import {
  DuckDBStructType,
  GEOMETRY,
  INTEGER,
  SQLNULL,
  STRUCT,
  VARCHAR,
} from '@duckdb/data-types';
import { expect, suite, test } from 'vitest';
import { duckDBTypeFromTypeIdAndInfo } from '../../../src/conversion/functions/duckDBTypeFromTypeIdAndInfo';
import { LogicalTypeId } from '../../../src/serialization/constants/LogicalTypeId';

suite('duckDBTypeFromTypeIdAndInfo', () => {
  test('VARCHAR with collation', () => {
    // A collation doesn't change how the type is displayed or how values are read.
    expect(
      duckDBTypeFromTypeIdAndInfo({
        id: LogicalTypeId.VARCHAR,
        typeInfo: { kind: 'string', collation: 'NOCASE' },
      }),
    ).toBe(VARCHAR);
  });
  test('STRUCT', () => {
    expect(
      duckDBTypeFromTypeIdAndInfo({
        id: LogicalTypeId.STRUCT,
        typeInfo: {
          kind: 'struct',
          childTypes: [
            ['a', { id: LogicalTypeId.INTEGER }],
            ['b', { id: LogicalTypeId.VARCHAR }],
          ],
        },
      }),
    ).toStrictEqual(STRUCT({ a: INTEGER, b: VARCHAR }));
  });
  test('unnamed STRUCT', () => {
    // e.g. `row(1, 'a')`: every entry name is empty, so the entries must not be collapsed by name.
    expect(
      duckDBTypeFromTypeIdAndInfo({
        id: LogicalTypeId.STRUCT,
        typeInfo: {
          kind: 'struct',
          childTypes: [
            ['', { id: LogicalTypeId.INTEGER }],
            ['', { id: LogicalTypeId.VARCHAR }],
          ],
        },
      }),
    ).toStrictEqual(new DuckDBStructType(['', ''], [INTEGER, VARCHAR]));
  });
  test('TUPLE', () => {
    // Serialized like an unnamed STRUCT.
    expect(
      duckDBTypeFromTypeIdAndInfo({
        id: LogicalTypeId.TUPLE,
        typeInfo: {
          kind: 'struct',
          childTypes: [
            ['', { id: LogicalTypeId.INTEGER }],
            ['', { id: LogicalTypeId.VARCHAR }],
          ],
        },
      }),
    ).toStrictEqual(new DuckDBStructType(['', ''], [INTEGER, VARCHAR]));
  });
  test('GEOMETRY', () => {
    expect(duckDBTypeFromTypeIdAndInfo({ id: LogicalTypeId.GEOMETRY })).toBe(
      GEOMETRY,
    );
  });
  test('GEOMETRY with coordinate reference system', () => {
    expect(
      duckDBTypeFromTypeIdAndInfo({
        id: LogicalTypeId.GEOMETRY,
        typeInfo: { kind: 'geo', crs: 'OGC:CRS84' },
      }),
    ).toBe(GEOMETRY);
  });
  test('SQLNULL', () => {
    expect(duckDBTypeFromTypeIdAndInfo({ id: LogicalTypeId.SQLNULL })).toBe(
      SQLNULL,
    );
  });
});
