import {
  DuckDBListValue,
  DuckDBStructValue,
  DuckDBValue,
} from '@duckdb/data-values';
import { expect, suite, test } from 'vitest';
import { duckDBTypeFromTypeIdAndInfo } from '../../../src/conversion/functions/duckDBTypeFromTypeIdAndInfo';
import { duckDBValueFromVector } from '../../../src/conversion/functions/duckDBValueFromVector';
import { deserializerFromBuffer } from '../../../src/serialization/functions/deserializeFromBuffer';
import { readQueryResult } from '../../../src/serialization/functions/resultReaders';

/**
 * Responses from /ddb/run, captured from the ui extension built against the given DuckDB versions. `main` is
 * duckdb@2bb5316a8b, which serializes VARCHAR vectors in the two-blob format and types bare NULLs as SQLNULL.
 */
const responses: Record<'v1.5.6' | 'main', Record<string, string>> = {
  'v1.5.6': {
    varchar:
      '64000165006400030173016e0174650003640019ffff640019ffff640019ffffffff6600016400016500036400006600010161ffff640001650008feffffffffffffff6600010180ffff64000066000103636363ffffffffffff',
    integer:
      '6400016500640001016965000164000dffffffff6600016400016500016400006600042a000000ffffffffffff',
    null: '6400016500640001017865000164000dffffffff660001640001650001640001650008feffffffffffffff66000400000080ffffffffffff',
    nestedNull:
      '6400016500640002027374016c650002640064650001640005c8000100000161010064000dffffffffffffffff640065650001640004c80064000dffffffffffffffff660001640001650002640000670001640001650008feffffffffffffff66000400000080ffffffff640000680001690001640000650001ffff6a00640001650008feffffffffffffff66000400000080ffffffffffffffff',
    typeofNull:
      '64000165006400010174650001640019ffffffff66000164000165000164000066000106224e554c4c22ffffffffffff',
    databases:
      '64000165006400030d64617461626173655f6e616d65096861735f6572726f720d6572726f725f6d657373616765650003640019ffff64000affff64000dffffffff660001640001650003640000660001066d656d6f7279ffff64000066000100ffff640001650008feffffffffffffff66000400000080ffffffffffff',
  },
  main: {
    varchar:
      '64000165006400030173016e0174650003640019ffff640019ffff640019ffffffff6600016400016500036400006b00016c0004010000006d000161ffff640001650008feffffffffffffff6b00006c0004000000006d0000ffff6400006b00036c0004030000006d0003636363ffffffffffff',
    integer:
      '6400016500640001016965000164000dffffffff6600016400016500016400006600042a000000ffffffffffff',
    null: '64000165006400010178650001640001ffffffff660001640001650001640001650008feffffffffffffff66000400000080ffffffffffff',
    nestedNull:
      '6400016500640002027374016c650002640064650001640005c80001000001610100640001ffffffffffffffff640065650001640004c800640001ffffffffffffffff660001640001650002640000670001640001650008feffffffffffffff66000400000080ffffffff640000680001690001640000650001ffff6a00640001650008feffffffffffffff66000400000080ffffffffffffffff',
    typeofNull:
      '64000165006400010174650001640019ffffffff6600016400016500016400006b00066c0004060000006d0006224e554c4c22ffffffffffff',
    databases:
      '64000165006400030d64617461626173655f6e616d65096861735f6572726f720d6572726f725f6d657373616765650003640019ffff64000affff640001ffffffff6600016400016500036400006b00066c0004060000006d00066d656d6f7279ffff64000066000100ffff640001650008feffffffffffffff66000400000080ffffffffffff',
  },
};

function bufferFromHex(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

interface DecodedResult {
  names: string[];
  types: string[];
  rows: DuckDBValue[][];
}

function decode(hex: string): DecodedResult {
  const result = readQueryResult(deserializerFromBuffer(bufferFromHex(hex)));
  if (!result.success) {
    throw new Error(result.error);
  }
  const { names, types } = result.columnNamesAndTypes;
  const rows: DuckDBValue[][] = [];
  for (const chunk of result.chunks) {
    for (let rowIndex = 0; rowIndex < chunk.rowCount; rowIndex++) {
      rows.push(
        types.map((type, columnIndex) =>
          duckDBValueFromVector(type, chunk.vectors[columnIndex], rowIndex),
        ),
      );
    }
  }
  return {
    names,
    types: types.map((type) => duckDBTypeFromTypeIdAndInfo(type).toString()),
    rows,
  };
}

/** The type DuckDB gives a bare NULL: INTEGER before 2.0, SQLNULL after. */
const nullType = { 'v1.5.6': 'INTEGER', main: 'NULL' };

suite('readQueryResult', () => {
  for (const version of ['v1.5.6', 'main'] as const) {
    suite(version, () => {
      const response = responses[version];
      test(`select 'a' as s, NULL::varchar as n, 'ccc' as t`, () => {
        expect(decode(response.varchar)).toStrictEqual({
          names: ['s', 'n', 't'],
          types: ['VARCHAR', 'VARCHAR', 'VARCHAR'],
          rows: [['a', null, 'ccc']],
        });
      });
      test('select 42 as i', () => {
        expect(decode(response.integer)).toStrictEqual({
          names: ['i'],
          types: ['INTEGER'],
          rows: [[42]],
        });
      });
      test('select NULL as x', () => {
        expect(decode(response.null)).toStrictEqual({
          names: ['x'],
          types: [nullType[version]],
          rows: [[null]],
        });
      });
      test(`select {'a': NULL} as st, [NULL] as l`, () => {
        expect(decode(response.nestedNull)).toStrictEqual({
          names: ['st', 'l'],
          types: [`STRUCT("a" ${nullType[version]})`, `${nullType[version]}[]`],
          rows: [
            [
              new DuckDBStructValue([{ key: 'a', value: null }]),
              new DuckDBListValue([null]),
            ],
          ],
        });
      });
      test('select typeof(NULL) as t', () => {
        expect(decode(response.typeofNull)).toStrictEqual({
          names: ['t'],
          types: ['VARCHAR'],
          rows: [['"NULL"']],
        });
      });
      test('from duckdb_databases() select database_name, false as has_error, null as error_message limit 1', () => {
        expect(decode(response.databases)).toStrictEqual({
          names: ['database_name', 'has_error', 'error_message'],
          types: ['VARCHAR', 'BOOLEAN', nullType[version]],
          rows: [['memory', false, null]],
        });
      });
    });
  }
});
