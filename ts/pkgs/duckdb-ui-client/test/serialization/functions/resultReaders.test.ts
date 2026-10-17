import {
  DuckDBBlobValue,
  DuckDBListValue,
  DuckDBStructValue,
  DuckDBValue,
} from '@duckdb/data-values';
import { expect, suite, test } from 'vitest';
import { duckDBTypeFromTypeIdAndInfo } from '../../../src/conversion/functions/duckDBTypeFromTypeIdAndInfo';
import { duckDBValueFromVector } from '../../../src/conversion/functions/duckDBValueFromVector';
import { deserializerFromBuffer } from '../../../src/serialization/functions/deserializeFromBuffer';
import { readQueryResult } from '../../../src/serialization/functions/resultReaders';
import { TypeInfo } from '../../../src/serialization/types/TypeInfo';

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
  test(`select row(1, 'a') as r (v1.5.6)`, () => {
    // An unnamed struct: both entry names are empty.
    expect(
      decode(
        '64000165006400010172650001640064650001640005c80002000000010064000dffffffff0000000100640019ffffffffffffffffffff66000164000165000164000067000264000066000401000000ffff6400006600010161ffffffffffffffff',
      ),
    ).toStrictEqual({
      names: ['r'],
      types: ['STRUCT("" INTEGER, "" VARCHAR)'],
      rows: [
        [
          new DuckDBStructValue([
            { key: '', value: 1 },
            { key: '', value: 'a' },
          ]),
        ],
      ],
    });
  });

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

/** Bytes of a WKB geometry: little-endian byte order, a uint32 geometry type, then the body. */
function wkb(geometryType: number, body: number[]): DuckDBBlobValue {
  const doubles = new Float64Array(body.length);
  doubles.set(body);
  const bytes = new Uint8Array(5 + doubles.byteLength);
  const dv = new DataView(bytes.buffer);
  dv.setUint8(0, 1);
  dv.setUint32(1, geometryType, true);
  bytes.set(new Uint8Array(doubles.buffer), 5);
  return new DuckDBBlobValue(bytes);
}

/** WKB POINT(x y). */
function wkbPoint(x: number, y: number): DuckDBBlobValue {
  return wkb(1, [x, y]);
}

/** WKB LINESTRING of the given points. */
function wkbLineString(points: [number, number][]): DuckDBBlobValue {
  const point = wkb(2, points.flat());
  // Insert the uint32 point count after the header.
  const bytes = new Uint8Array(point.bytes.length + 4);
  bytes.set(point.bytes.subarray(0, 5));
  new DataView(bytes.buffer).setUint32(5, points.length, true);
  bytes.set(point.bytes.subarray(5), 9);
  return new DuckDBBlobValue(bytes);
}

function typeInfoOfFirstColumn(hex: string): TypeInfo | undefined {
  const result = readQueryResult(deserializerFromBuffer(bufferFromHex(hex)));
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.columnNamesAndTypes.types[0].typeInfo;
}

/**
 * Types DuckDB 2.0 serializes differently from 1.5, captured from the ui extension built against each. 2.0 sends
 * TUPLE (id 110) where 1.5 sent an unnamed STRUCT, and GEOMETRY (id 60, with an optional coordinate reference system
 * and WKB vectors) where 1.5 sent a BLOB aliased GEOMETRY.
 */
const tupleAndGeometryResponses = {
  geometryWithCrs: {
    'v1.5.6':
      '6400016500640001016765000164001a65000164000165000847454f4d45545259ffffffffffff6600016400016500016400006600012000000000000000000000000001000000000000000000f03f0000000000000040ffffffffffff',
    main: '6400016500640001016765000164003c65000164000dc8006400094f47433a4352533834ffffffffffffffff660001640001650001630001640000660001150101000000000000000000f03f0000000000000040ffffffffffff',
  },
  geometries: {
    'v1.5.6':
      '6400016500640001016765000164001a65000164000165000847454f4d45545259ffffffffffff660001640003650001640001650008fdffffffffffffff6600032000000000000000000000000001000000000000000000f03f0000000000000040018040010400000000000000000000000000000000803f0000803f010000000200000000000000000000000000000000000000000000000000f03f000000000000f03fffffffffffff',
    main: '6400016500640001016765000164003cffffffff660001640003650001630001640001650008fdffffffffffffff660003150101000000000000000000f03f000000000000004001802901020000000200000000000000000000000000000000000000000000000000f03f000000000000f03fffffffffffff',
  },
  geometryList: {
    'v1.5.6':
      '640001650064000102676c650001640065650001640004c80064001a65000164000165000847454f4d45545259ffffffffffffffffffff660001640001650001640000680002690001640000650002ffff6a00640001650008fdffffffffffffff6600022000000000000000000000000001000000000000000000f03f00000000000000400180ffffffffffffffff',
    main: '640001650064000102676c650001640065650001640004c80064003cffffffffffffffff660001640001650001640000680002690001640000650002ffff6a00630001640001650008fdffffffffffffff660002150101000000000000000000f03f00000000000000400180ffffffffffffffff',
  },
  tuples: {
    'v1.5.6':
      '6400016500640003017402746c027374650003640064650001640005c80003000000010064000dffffffff0000000100640019ffffffff000000010064000dffffffffffffffff640065650001640004c800640064650001640005c80002000000010064000dffffffff000000010064000dffffffffffffffffffffffff640064650001640005c80001000001780100640064650001640005c80002000000010064000dffffffff0000000100640019ffffffffffffffffffffffffffffffff66000164000165000364000067000364000066000401000000ffff6400006600010161ffff640001650008feffffffffffffff66000400000080ffffffff640000680002690001640000650002ffff6a006400006700026400006600080100000003000000ffff6400006600080200000004000000ffffffffffff64000067000164000067000264000066000401000000ffff6400006600010162ffffffffffffffffffff',
    main: '6400016500640003017402746c02737465000364006e650001640005c80003000000010064000dffffffff0000000100640019ffffffff0000000100640001ffffffffffffffff640065650001640004c80064006e650001640005c80002000000010064000dffffffff000000010064000dffffffffffffffffffffffff640064650001640005c8000100000178010064006e650001640005c80002000000010064000dffffffff0000000100640019ffffffffffffffffffffffffffffffff66000164000165000364000067000364000066000401000000ffff6400006b00016c0004010000006d000161ffff640001650008feffffffffffffff66000400000080ffffffff640000680002690001640000650002ffff6a006400006700026400006600080100000003000000ffff6400006600080200000004000000ffffffffffff64000067000164000067000264000066000401000000ffff6400006b00016c0004010000006d000162ffffffffffffffffffff',
  },
  tupleRows: {
    'v1.5.6':
      '64000165006400010172650001640064650001640005c80002000000010064000dffffffff0000000100640019ffffffffffffffffffff660001640003650001640001650008fdffffffffffffff670002640001650008fdffffffffffffff66000c010000000000008002000000ffff640001650008f9ffffffffffffff660003016101800180ffffffffffffffff',
    main: '6400016500640001017265000164006e650001640005c80002000000010064000dffffffff0000000100640019ffffffffffffffffffff660001640003650001640001650008fdffffffffffffff670002640001650008fdffffffffffffff66000c010000000000008002000000ffff640001650008f9ffffffffffffff6b00016c000c0100000000000000000000006d000161ffffffffffffffff',
  },
};

suite('readQueryResult: TUPLE and GEOMETRY', () => {
  for (const version of ['v1.5.6', 'main'] as const) {
    suite(version, () => {
      test(`select (1, 'a', NULL) as t, [(1, 2), (3, 4)] as tl, {'x': (1, 'b')} as st`, () => {
        expect(decode(tupleAndGeometryResponses.tuples[version])).toStrictEqual(
          {
            names: ['t', 'tl', 'st'],
            types: [
              `STRUCT("" INTEGER, "" VARCHAR, "" ${nullType[version]})`,
              'STRUCT("" INTEGER, "" INTEGER)[]',
              'STRUCT("x" STRUCT("" INTEGER, "" VARCHAR))',
            ],
            rows: [
              [
                new DuckDBStructValue([
                  { key: '', value: 1 },
                  { key: '', value: 'a' },
                  { key: '', value: null },
                ]),
                new DuckDBListValue([
                  new DuckDBStructValue([
                    { key: '', value: 1 },
                    { key: '', value: 2 },
                  ]),
                  new DuckDBStructValue([
                    { key: '', value: 3 },
                    { key: '', value: 4 },
                  ]),
                ]),
                new DuckDBStructValue([
                  {
                    key: 'x',
                    value: new DuckDBStructValue([
                      { key: '', value: 1 },
                      { key: '', value: 'b' },
                    ]),
                  },
                ]),
              ],
            ],
          },
        );
      });
      test(`select r from (values (row(1, 'a')), (NULL), (row(2, NULL))) v(r)`, () => {
        expect(
          decode(tupleAndGeometryResponses.tupleRows[version]),
        ).toStrictEqual({
          names: ['r'],
          types: ['STRUCT("" INTEGER, "" VARCHAR)'],
          rows: [
            [
              new DuckDBStructValue([
                { key: '', value: 1 },
                { key: '', value: 'a' },
              ]),
            ],
            [null],
            [
              new DuckDBStructValue([
                { key: '', value: 2 },
                { key: '', value: null },
              ]),
            ],
          ],
        });
      });
      test(`select g from (values ('POINT(1 2)'::GEOMETRY), (NULL), ('LINESTRING(0 0, 1 1)'::GEOMETRY)) t(g)`, () => {
        const decoded = decode(tupleAndGeometryResponses.geometries[version]);
        expect(decoded.names).toStrictEqual(['g']);
        expect(decoded.types).toStrictEqual(['GEOMETRY']);
        expect(decoded.rows).toHaveLength(3);
        expect(decoded.rows[0][0]).toBeInstanceOf(DuckDBBlobValue);
        expect(decoded.rows[1][0]).toBeNull();
        expect(decoded.rows[2][0]).toBeInstanceOf(DuckDBBlobValue);
      });
      test(`select ['POINT(1 2)'::GEOMETRY, NULL] as gl`, () => {
        const decoded = decode(tupleAndGeometryResponses.geometryList[version]);
        expect(decoded.types).toStrictEqual(['GEOMETRY[]']);
        const list = decoded.rows[0][0] as DuckDBListValue;
        expect(list.values).toHaveLength(2);
        expect(list.values[0]).toBeInstanceOf(DuckDBBlobValue);
        expect(list.values[1]).toBeNull();
      });
      test(`select 'POINT(1 2)'::GEOMETRY('OGC:CRS84') as g`, () => {
        const decoded = decode(
          tupleAndGeometryResponses.geometryWithCrs[version],
        );
        expect(decoded.types).toStrictEqual(['GEOMETRY']);
        expect(decoded.rows[0][0]).toBeInstanceOf(DuckDBBlobValue);
      });
    });
  }
  suite('main', () => {
    test('GEOMETRY values are WKB', () => {
      expect(
        decode(tupleAndGeometryResponses.geometries.main).rows,
      ).toStrictEqual([
        [wkbPoint(1, 2)],
        [null],
        [
          wkbLineString([
            [0, 0],
            [1, 1],
          ]),
        ],
      ]);
      expect(
        decode(tupleAndGeometryResponses.geometryList.main).rows,
      ).toStrictEqual([[new DuckDBListValue([wkbPoint(1, 2), null])]]);
    });
    test('GEOMETRY coordinate reference system', () => {
      expect(
        typeInfoOfFirstColumn(tupleAndGeometryResponses.geometryWithCrs.main),
      ).toStrictEqual({ kind: 'geo', crs: 'OGC:CRS84' });
      expect(
        typeInfoOfFirstColumn(tupleAndGeometryResponses.geometries.main),
      ).toBeUndefined();
    });
  });
});

/**
 * Responses for an extension-style type: EXT_VARCHAR, an alias over VARCHAR whose binder attaches ExtensionTypeInfo with
 * the given modifiers (like the mssql extension's MSSQL_NVARCHAR(n)). Captured from a program that registers it, linked
 * against the ui extension built for each DuckDB version. See duckdb/duckdb-ui#252.
 */
const extensionTypeResponses = {
  withModifier: {
    'v1.5.6':
      '6400016500640001016365000164001965000164000165000b4558545f564152434841526700016400016400640064000dffff6500006600e400ffffffffffffffffffffffff66000164000165000164000066000103616263ffffffffffff',
    main: '6400016500640001016365000164001965000164000165000b4558545f564152434841526700016400016400640064000dffff6500006600e400ffffffffffffffffffffffff6600016400016500016400006b00036c0004030000006d0003616263ffffffffffff',
  },
  withoutModifiers: {
    'v1.5.6':
      '6400016500640001016365000164001965000164000165000b4558545f56415243484152670001ffffffffffffffff66000164000165000164000066000103616263ffffffffffff',
    main: '6400016500640001016365000164001965000164000165000b4558545f56415243484152670001ffffffffffffffff6600016400016500016400006b00036c0004030000006d0003616263ffffffffffff',
  },
  withModifiers: {
    'v1.5.6':
      '6400016500640001016365000164001965000164000165000b4558545f5641524348415267000164000264006400640019ffff65000066000178ffffffff6400640064000dffff650000660007ffffffffffffffffffffffff66000164000165000164000066000103616263ffffffffffff',
    main: '6400016500640001016365000164001965000164000165000b4558545f5641524348415267000164000264006400640019ffff65000066000178ffffffff6400640064000dffff650000660007ffffffffffffffffffffffff6600016400016500016400006b00036c0004030000006d0003616263ffffffffffff',
  },
  inList: {
    'v1.5.6':
      '6400016500640001016c650001640065650001640004c80064001965000164000165000b4558545f564152434841526700016400016400640064000dffff6500006600e400ffffffffffffffffffffffffffffffff660001640001650001640000680001690001640000650001ffff6a0064000066000103616263ffffffffffffffff',
    main: '6400016500640001016c650001640065650001640004c80064001965000164000165000b4558545f564152434841526700016400016400640064000dffff6500006600e400ffffffffffffffffffffffffffffffff660001640001650001640000680001690001640000650001ffff6a006400006b00036c0004030000006d0003616263ffffffffffffffff',
  },
  withLabelAndProperties: {
    'v1.5.6':
      '64000165006400020163016965000264001965000164000165000b4558545f5641524348415267000164000264006400640019ffff65000066000178ffff6500076c6162656c5f78ffff6400640064000dffff650000660079ffffffff6500050000036e65670100640064000dffff65000066007bffffffff000004666c61670100640064000affff650000660001ffffffff0000036269670100640064001fffff650000660080d0acf30effffffff000005726174696f01006400640017ffff6500006600000000000000e03fffffffff0000016601006400640016ffff65000066000000a03fffffffffffffffffffff64000dffffffff66000164000165000264000066000103616263ffff6400006600042a000000ffffffffffff',
    main: '64000165006400020163016965000264001965000164000165000b4558545f5641524348415267000164000264006400640019ffff65000066000178ffff6500076c6162656c5f78ffff6400640064000dffff650000660079ffffffff6500060000036e65670100640064000dffff65000066007bffffffff0000046e6f6e6501006400640019ffff650001ffffffff000004666c61670100640064000affff650000660001ffffffff0000036269670100640064001fffff650000660080d0acf30effffffff000005726174696f01006400640017ffff6500006600000000000000e03fffffffff0000016601006400640016ffff65000066000000a03fffffffffffffffffffff64000dffffffff6600016400016500026400006b00036c0004030000006d0003616263ffff6400006600042a000000ffffffffffff',
  },
};

suite('readQueryResult: extension types (duckdb/duckdb-ui#252)', () => {
  for (const version of ['v1.5.6', 'main'] as const) {
    suite(version, () => {
      test(`select 'abc'::EXT_VARCHAR(100) as c`, () => {
        const response = extensionTypeResponses.withModifier[version];
        expect(decode(response)).toStrictEqual({
          names: ['c'],
          types: ['EXT_VARCHAR'],
          rows: [['abc']],
        });
        expect(typeInfoOfFirstColumn(response)).toStrictEqual({
          kind: 'generic',
          alias: 'EXT_VARCHAR',
          extensionInfo: {
            modifiers: [{ value: 100, label: '' }],
            properties: {},
          },
        });
      });
      test(`select 'abc'::EXT_VARCHAR as c`, () => {
        // Extension info is written even with no modifiers.
        const response = extensionTypeResponses.withoutModifiers[version];
        expect(decode(response).rows).toStrictEqual([['abc']]);
        expect(typeInfoOfFirstColumn(response)).toStrictEqual({
          kind: 'generic',
          alias: 'EXT_VARCHAR',
          extensionInfo: { modifiers: [], properties: {} },
        });
      });
      test(`select 'abc'::EXT_VARCHAR('x', 7) as c`, () => {
        const response = extensionTypeResponses.withModifiers[version];
        expect(decode(response).rows).toStrictEqual([['abc']]);
        expect(typeInfoOfFirstColumn(response)?.extensionInfo).toStrictEqual({
          modifiers: [
            { value: 'x', label: '' },
            { value: 7, label: '' },
          ],
          properties: {},
        });
      });
      test(`select ['abc'::EXT_VARCHAR(100)] as l`, () => {
        expect(decode(extensionTypeResponses.inList[version])).toStrictEqual({
          names: ['l'],
          types: ['EXT_VARCHAR[]'],
          rows: [[new DuckDBListValue(['abc'])]],
        });
      });
      test(`select 'abc'::EXT_VARCHAR('x', -7) as c, 42 as i (with label and properties)`, () => {
        const response = extensionTypeResponses.withLabelAndProperties[version];
        expect(decode(response)).toStrictEqual({
          names: ['c', 'i'],
          types: ['EXT_VARCHAR', 'INTEGER'],
          rows: [['abc', 42]],
        });
        expect(typeInfoOfFirstColumn(response)?.extensionInfo).toStrictEqual({
          modifiers: [
            { value: 'x', label: 'label_x' },
            { value: -7, label: '' },
          ],
          properties: {
            neg: -5,
            big: 4000000000,
            flag: true,
            ratio: 0.5,
            f: 1.25,
            // A null property makes DuckDB 1.5 throw comparing types, so it's only in the main capture.
            ...(version === 'main' ? { none: null } : {}),
          },
        });
      });
    });
  }
});
