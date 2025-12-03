import { expect, suite, test } from 'vitest';
import {
  ARRAY,
  BIGINT,
  BIGNUM,
  BIT,
  BLOB,
  BOOLEAN,
  DATE,
  DECIMAL,
  DOUBLE,
  ENUM,
  FLOAT,
  HUGEINT,
  INTEGER,
  INTERVAL,
  LIST,
  MAP,
  SMALLINT,
  STRUCT,
  TIME,
  TIMESTAMP,
  TIMESTAMP_MS,
  TIMESTAMP_NS,
  TIMESTAMP_S,
  TIMESTAMPTZ,
  TIMETZ,
  TINYINT,
  UBIGINT,
  UHUGEINT,
  UINTEGER,
  UNION,
  USMALLINT,
  UTINYINT,
  UUID,
  VARCHAR,
} from '../src/DuckDBType';
import {
  BOX_2D,
  BOX_2DF,
  GEOMETRY,
  INET,
  JSONType,
  LINESTRING_2D,
  POINT_2D,
  POINT_3D,
  POINT_4D,
  POLYGON_2D,
  WKB_BLOB,
} from '../src/extensionTypes';
import { parseLogicalTypeString } from '../src/parseLogicalTypeString';

suite('parseLogicalTypeString', () => {
  test('BOOLEAN', () => {
    expect(parseLogicalTypeString('BOOLEAN')).toStrictEqual(BOOLEAN);
  });
  test('TINYINT', () => {
    expect(parseLogicalTypeString('TINYINT')).toStrictEqual(TINYINT);
  });
  test('GEOMETRY', () => {
    expect(parseLogicalTypeString('GEOMETRY')).toStrictEqual(GEOMETRY);
  });
  test('LINESTRING_2D', () => {
    expect(parseLogicalTypeString('LINESTRING_2D')).toStrictEqual(
      LINESTRING_2D,
    );
  });
  test('BOX_2D', () => {
    expect(parseLogicalTypeString('BOX_2D')).toStrictEqual(BOX_2D);
  });
  test('BOX_2DF', () => {
    expect(parseLogicalTypeString('BOX_2DF')).toStrictEqual(BOX_2DF);
  });
  test('POINT_2D', () => {
    expect(parseLogicalTypeString('POINT_2D')).toStrictEqual(POINT_2D);
  });
  test('POINT_3D', () => {
    expect(parseLogicalTypeString('POINT_3D')).toStrictEqual(POINT_3D);
  });
  test('POINT_4D', () => {
    expect(parseLogicalTypeString('POINT_4D')).toStrictEqual(POINT_4D);
  });
  test('POLYGON_2D', () => {
    expect(parseLogicalTypeString('POLYGON_2D')).toStrictEqual(POLYGON_2D);
  });
  test('INET', () => {
    expect(parseLogicalTypeString('INET')).toStrictEqual(INET);
  });
  test('JSON', () => {
    expect(parseLogicalTypeString('JSON')).toStrictEqual(JSONType);
  });
  test('WKB_BLOB', () => {
    expect(parseLogicalTypeString('WKB_BLOB')).toStrictEqual(WKB_BLOB);
  });
  test('SMALLINT', () => {
    expect(parseLogicalTypeString('SMALLINT')).toStrictEqual(SMALLINT);
  });
  test('INTEGER', () => {
    expect(parseLogicalTypeString('INTEGER')).toStrictEqual(INTEGER);
  });
  test('BIGINT', () => {
    expect(parseLogicalTypeString('BIGINT')).toStrictEqual(BIGINT);
  });
  test('HUGEINT', () => {
    expect(parseLogicalTypeString('HUGEINT')).toStrictEqual(HUGEINT);
  });
  test('UTINYINT', () => {
    expect(parseLogicalTypeString('UTINYINT')).toStrictEqual(UTINYINT);
  });
  test('UHUGEINT', () => {
    expect(parseLogicalTypeString('UHUGEINT')).toStrictEqual(UHUGEINT);
  });
  test('USMALLINT', () => {
    expect(parseLogicalTypeString('USMALLINT')).toStrictEqual(USMALLINT);
  });
  test('UINTEGER', () => {
    expect(parseLogicalTypeString('UINTEGER')).toStrictEqual(UINTEGER);
  });
  test('UBIGINT', () => {
    expect(parseLogicalTypeString('UBIGINT')).toStrictEqual(UBIGINT);
  });
  test('DATE', () => {
    expect(parseLogicalTypeString('DATE')).toStrictEqual(DATE);
  });
  test('TIME', () => {
    expect(parseLogicalTypeString('TIME')).toStrictEqual(TIME);
  });
  test('TIMESTAMP', () => {
    expect(parseLogicalTypeString('TIMESTAMP')).toStrictEqual(TIMESTAMP);
  });
  test('TIMESTAMP_S', () => {
    expect(parseLogicalTypeString('TIMESTAMP_S')).toStrictEqual(TIMESTAMP_S);
  });
  test('TIMESTAMP_MS', () => {
    expect(parseLogicalTypeString('TIMESTAMP_MS')).toStrictEqual(TIMESTAMP_MS);
  });
  test('TIMESTAMP_NS', () => {
    expect(parseLogicalTypeString('TIMESTAMP_NS')).toStrictEqual(TIMESTAMP_NS);
  });
  test('TIME WITH TIME ZONE', () => {
    expect(parseLogicalTypeString('TIME WITH TIME ZONE')).toStrictEqual(TIMETZ);
  });
  test('TIMESTAMP WITH TIME ZONE', () => {
    expect(parseLogicalTypeString('TIMESTAMP WITH TIME ZONE')).toStrictEqual(
      TIMESTAMPTZ,
    );
  });
  test('FLOAT', () => {
    expect(parseLogicalTypeString('FLOAT')).toStrictEqual(FLOAT);
  });
  test('DOUBLE', () => {
    expect(parseLogicalTypeString('DOUBLE')).toStrictEqual(DOUBLE);
  });

  test('DECIMAL(18,6)', () => {
    expect(parseLogicalTypeString('DECIMAL(18,6)')).toStrictEqual(
      DECIMAL(18, 6),
    );
  });

  test(`ENUM('DUCK_DUCK_ENUM', 'GOOSE')`, () => {
    expect(
      parseLogicalTypeString(`ENUM('DUCK_DUCK_ENUM', 'GOOSE')`),
    ).toStrictEqual(ENUM(['DUCK_DUCK_ENUM', 'GOOSE']));
  });

  test('DOUBLE[]', () => {
    expect(parseLogicalTypeString('DOUBLE[]')).toStrictEqual(LIST(DOUBLE));
  });

  test('STRUCT(a INTEGER, b VARCHAR)', () => {
    expect(
      parseLogicalTypeString('STRUCT(a INTEGER, b VARCHAR)'),
    ).toStrictEqual(
      STRUCT({
        a: INTEGER,
        b: VARCHAR,
      }),
    );
  });

  test('STRUCT(a INTEGER[], b VARCHAR[])', () => {
    expect(
      parseLogicalTypeString('STRUCT(a INTEGER[], b VARCHAR[])'),
    ).toStrictEqual(
      STRUCT({
        a: LIST(INTEGER),
        b: LIST(VARCHAR),
      }),
    );
  });

  test('STRUCT(a INTEGER, b VARCHAR)[]', () => {
    expect(
      parseLogicalTypeString('STRUCT(a INTEGER, b VARCHAR)[]'),
    ).toStrictEqual(
      LIST(
        STRUCT({
          a: INTEGER,
          b: VARCHAR,
        }),
      ),
    );
  });

  // addition: nested struct
  test('STRUCT(a STRUCT(b INTEGER), b VARCHAR)', () => {
    expect(
      parseLogicalTypeString('STRUCT(a STRUCT(b INTEGER), b VARCHAR)'),
    ).toStrictEqual(
      STRUCT({
        a: STRUCT({ b: INTEGER }),
        b: VARCHAR,
      }),
    );
  });
  test('STRUCT("my weird ""key" INTEGER, b VARCHAR)', () => {
    expect(
      parseLogicalTypeString('STRUCT("my weird ""key" INTEGER, b VARCHAR)'),
    ).toStrictEqual(
      STRUCT({
        '"my weird ""key"': INTEGER,
        b: VARCHAR,
      }),
    );
  });
  test('STRUCT("my weird ""key" STRUCT("my other ""weird key" INTEGER), b VARCHAR)', () => {
    expect(
      parseLogicalTypeString(
        'STRUCT("my weird ""key" STRUCT("my other ""weird key" INTEGER), b VARCHAR)',
      ),
    ).toStrictEqual(
      STRUCT({
        '"my weird ""key"': STRUCT({
          '"my other ""weird key"': INTEGER,
        }),
        b: VARCHAR,
      }),
    );
  });

  test('MAP(INTEGER, VARCHAR)', () => {
    expect(parseLogicalTypeString('MAP(INTEGER, VARCHAR)')).toStrictEqual(
      MAP(INTEGER, VARCHAR),
    );
  });

  test('MAP(VARCHAR, STRUCT(b INTEGER))', () => {
    expect(
      parseLogicalTypeString('MAP(VARCHAR, STRUCT(b INTEGER))'),
    ).toStrictEqual(MAP(VARCHAR, STRUCT({ b: INTEGER })));
  });

  test('UNION("name" VARCHAR, age SMALLINT)', () => {
    expect(
      parseLogicalTypeString('UNION("name" VARCHAR, age SMALLINT)'),
    ).toStrictEqual(
      UNION({
        '"name"': VARCHAR,
        age: SMALLINT,
      }),
    );
  });

  test('INTEGER[3]', () => {
    expect(parseLogicalTypeString('INTEGER[3]')).toStrictEqual(
      ARRAY(INTEGER, 3),
    );
  });

  test('STRUCT(a INTEGER, b VARCHAR)[3]', () => {
    expect(
      parseLogicalTypeString('STRUCT(a INTEGER, b VARCHAR)[3]'),
    ).toStrictEqual(
      ARRAY(
        STRUCT({
          a: INTEGER,
          b: VARCHAR,
        }),
        3,
      ),
    );
  });

  test('STRUCT(a INTEGER[3], b VARCHAR[3])', () => {
    expect(
      parseLogicalTypeString('STRUCT(a INTEGER[3], b VARCHAR[3])'),
    ).toStrictEqual(
      STRUCT({
        a: ARRAY(INTEGER, 3),
        b: ARRAY(VARCHAR, 3),
      }),
    );
  });

  test('INTEGER[][3]', () => {
    expect(parseLogicalTypeString('INTEGER[][3]')).toStrictEqual(
      ARRAY(LIST(INTEGER), 3),
    );
  });

  test('INTEGER[3][]', () => {
    expect(parseLogicalTypeString('INTEGER[3][]')).toStrictEqual(
      LIST(ARRAY(INTEGER, 3)),
    );
  });

  test('UUID', () => {
    expect(parseLogicalTypeString('UUID')).toStrictEqual(UUID);
  });
  test('INTERVAL', () => {
    expect(parseLogicalTypeString('INTERVAL')).toStrictEqual(INTERVAL);
  });
  test('VARCHAR', () => {
    expect(parseLogicalTypeString('VARCHAR')).toStrictEqual(VARCHAR);
  });
  test('BIGNUM', () => {
    expect(parseLogicalTypeString('BIGNUM')).toStrictEqual(BIGNUM);
  });
  test('BLOB', () => {
    expect(parseLogicalTypeString('BLOB')).toStrictEqual(BLOB);
  });
  test('BIT', () => {
    expect(parseLogicalTypeString('BIT')).toStrictEqual(BIT);
  });
});
