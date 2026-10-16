import { SQLNULL, VARCHAR } from '@duckdb/data-types';
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
  test('SQLNULL', () => {
    expect(duckDBTypeFromTypeIdAndInfo({ id: LogicalTypeId.SQLNULL })).toBe(
      SQLNULL,
    );
  });
});
