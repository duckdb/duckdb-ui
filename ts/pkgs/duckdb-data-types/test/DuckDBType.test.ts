import { expect, suite, test } from 'vitest';
import { DuckDBTypeId } from '../src';
import {
  ANY,
  ARRAY,
  BIGINT,
  BIGNUM,
  BIT,
  BLOB,
  BOOLEAN,
  DATE,
  DECIMAL,
  DOUBLE,
  DuckDBAnyType,
  DuckDBBigIntType,
  DuckDBBigNumType,
  DuckDBBitType,
  DuckDBBlobType,
  DuckDBBooleanType,
  DuckDBDateType,
  DuckDBDoubleType,
  DuckDBFloatType,
  DuckDBHugeIntType,
  DuckDBIntegerLiteralType,
  DuckDBIntegerType,
  DuckDBIntervalType,
  DuckDBSmallIntType,
  DuckDBSQLNullType,
  DuckDBStringLiteralType,
  DuckDBTimestampMillisecondsType,
  DuckDBTimestampNanosecondsType,
  DuckDBTimestampSecondsType,
  DuckDBTimestampType,
  DuckDBTimestampTZType,
  DuckDBTimeType,
  DuckDBTimeTZType,
  DuckDBTinyIntType,
  DuckDBUBigIntType,
  DuckDBUHugeIntType,
  DuckDBUIntegerType,
  DuckDBUSmallIntType,
  DuckDBUTinyIntType,
  DuckDBUUIDType,
  DuckDBVarCharType,
  ENUM,
  FLOAT,
  HUGEINT,
  INTEGER,
  INTEGER_LITERAL,
  INTERVAL,
  LIST,
  MAP,
  SMALLINT,
  SQLNULL,
  STRING_LITERAL,
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

suite('DuckDBBooleanType', () => {
  test('toString', () => {
    expect(BOOLEAN.toString()).toBe('BOOLEAN');
  });
  test('toString short', () => {
    expect(BOOLEAN.toString({ short: true })).toBe('BOOLEAN');
  });
  test('toString with alias', () => {
    expect(DuckDBBooleanType.create('mybool').toString()).toBe('mybool');
  });
  test('toJson', () => {
    expect(BOOLEAN.toJson()).toStrictEqual({ typeId: DuckDBTypeId.BOOLEAN });
  });
  test('toJson with alias', () => {
    expect(DuckDBBooleanType.create('mybool').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.BOOLEAN,
      alias: 'mybool',
    });
  });
});

suite('DuckDBTinyIntType', () => {
  test('toString', () => {
    expect(TINYINT.toString()).toBe('TINYINT');
  });
  test('toString short', () => {
    expect(TINYINT.toString({ short: true })).toBe('TINYINT');
  });
  test('toString with alias', () => {
    expect(DuckDBTinyIntType.create('mytinyint').toString()).toBe('mytinyint');
  });
  test('toJson', () => {
    expect(TINYINT.toJson()).toStrictEqual({ typeId: DuckDBTypeId.TINYINT });
  });
  test('toJson with alias', () => {
    expect(DuckDBTinyIntType.create('mytinyint').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.TINYINT,
      alias: 'mytinyint',
    });
  });
});

suite('DuckDBSmallIntType', () => {
  test('toString', () => {
    expect(SMALLINT.toString()).toBe('SMALLINT');
  });
  test('toString short', () => {
    expect(SMALLINT.toString({ short: true })).toBe('SMALLINT');
  });
  test('toString with alias', () => {
    expect(DuckDBSmallIntType.create('mysmallint').toString()).toBe(
      'mysmallint',
    );
  });
  test('toJson', () => {
    expect(SMALLINT.toJson()).toStrictEqual({ typeId: DuckDBTypeId.SMALLINT });
  });
  test('toJson with alias', () => {
    expect(DuckDBSmallIntType.create('mysmallint').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.SMALLINT,
      alias: 'mysmallint',
    });
  });
});

suite('DuckDBIntegerType', () => {
  test('toString', () => {
    expect(INTEGER.toString()).toBe('INTEGER');
  });
  test('toString short', () => {
    expect(INTEGER.toString({ short: true })).toBe('INTEGER');
  });
  test('toString with alias', () => {
    expect(DuckDBIntegerType.create('myinteger').toString()).toBe('myinteger');
  });
  test('toJson', () => {
    expect(INTEGER.toJson()).toStrictEqual({ typeId: DuckDBTypeId.INTEGER });
  });
  test('toJson with alias', () => {
    expect(DuckDBIntegerType.create('myinteger').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.INTEGER,
      alias: 'myinteger',
    });
  });
});

suite('DuckDBBigIntType', () => {
  test('toString', () => {
    expect(BIGINT.toString()).toBe('BIGINT');
  });
  test('toString short', () => {
    expect(BIGINT.toString({ short: true })).toBe('BIGINT');
  });
  test('toString with alias', () => {
    expect(DuckDBBigIntType.create('mybigint').toString()).toBe('mybigint');
  });
  test('toJson', () => {
    expect(BIGINT.toJson()).toStrictEqual({ typeId: DuckDBTypeId.BIGINT });
  });
  test('toJson with alias', () => {
    expect(DuckDBBigIntType.create('mybigint').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.BIGINT,
      alias: 'mybigint',
    });
  });
});

suite('DuckDBUTinyIntType', () => {
  test('toString', () => {
    expect(UTINYINT.toString()).toBe('UTINYINT');
  });
  test('toString short', () => {
    expect(UTINYINT.toString({ short: true })).toBe('UTINYINT');
  });
  test('toString with alias', () => {
    expect(DuckDBUTinyIntType.create('myutinyint').toString()).toBe(
      'myutinyint',
    );
  });
  test('toJson', () => {
    expect(UTINYINT.toJson()).toStrictEqual({ typeId: DuckDBTypeId.UTINYINT });
  });
  test('toJson with alias', () => {
    expect(DuckDBUTinyIntType.create('myutinyint').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.UTINYINT,
      alias: 'myutinyint',
    });
  });
});

suite('DuckDBUSmallIntType', () => {
  test('toString', () => {
    expect(USMALLINT.toString()).toBe('USMALLINT');
  });
  test('toString short', () => {
    expect(USMALLINT.toString({ short: true })).toBe('USMALLINT');
  });
  test('toString with alias', () => {
    expect(DuckDBUSmallIntType.create('myusmallint').toString()).toBe(
      'myusmallint',
    );
  });
  test('toJson', () => {
    expect(USMALLINT.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.USMALLINT,
    });
  });
  test('toJson with alias', () => {
    expect(DuckDBUSmallIntType.create('myusmallint').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.USMALLINT,
      alias: 'myusmallint',
    });
  });
});

suite('DuckDBUIntegerType', () => {
  test('toString', () => {
    expect(UINTEGER.toString()).toBe('UINTEGER');
  });
  test('toString short', () => {
    expect(UINTEGER.toString({ short: true })).toBe('UINTEGER');
  });
  test('toString with alias', () => {
    expect(DuckDBUIntegerType.create('myuinteger').toString()).toBe(
      'myuinteger',
    );
  });
  test('toJson', () => {
    expect(UINTEGER.toJson()).toStrictEqual({ typeId: DuckDBTypeId.UINTEGER });
  });
  test('toJson with alias', () => {
    expect(DuckDBUIntegerType.create('myuinteger').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.UINTEGER,
      alias: 'myuinteger',
    });
  });
});

suite('DuckDBUBigIntType', () => {
  test('toString', () => {
    expect(UBIGINT.toString()).toBe('UBIGINT');
  });
  test('toString short', () => {
    expect(UBIGINT.toString({ short: true })).toBe('UBIGINT');
  });
  test('toString with alias', () => {
    expect(DuckDBUBigIntType.create('myubigint').toString()).toBe('myubigint');
  });
  test('toJson', () => {
    expect(UBIGINT.toJson()).toStrictEqual({ typeId: DuckDBTypeId.UBIGINT });
  });
  test('toJson with alias', () => {
    expect(DuckDBUBigIntType.create('myubigint').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.UBIGINT,
      alias: 'myubigint',
    });
  });
});

suite('DuckDBFloatType', () => {
  test('toString', () => {
    expect(FLOAT.toString()).toBe('FLOAT');
  });
  test('toString short', () => {
    expect(FLOAT.toString({ short: true })).toBe('FLOAT');
  });
  test('toString with alias', () => {
    expect(DuckDBFloatType.create('myfloat').toString()).toBe('myfloat');
  });
  test('toJson', () => {
    expect(FLOAT.toJson()).toStrictEqual({ typeId: DuckDBTypeId.FLOAT });
  });
  test('toJson with alias', () => {
    expect(DuckDBFloatType.create('myfloat').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.FLOAT,
      alias: 'myfloat',
    });
  });
});

suite('DuckDBDoubleType', () => {
  test('toString', () => {
    expect(DOUBLE.toString()).toBe('DOUBLE');
  });
  test('toString short', () => {
    expect(DOUBLE.toString({ short: true })).toBe('DOUBLE');
  });
  test('toString with alias', () => {
    expect(DuckDBDoubleType.create('mydouble').toString()).toBe('mydouble');
  });
  test('toJson', () => {
    expect(DOUBLE.toJson()).toStrictEqual({ typeId: DuckDBTypeId.DOUBLE });
  });
  test('toJson with alias', () => {
    expect(DuckDBDoubleType.create('mydouble').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.DOUBLE,
      alias: 'mydouble',
    });
  });
});

suite('DuckDBTimestampType', () => {
  test('toString', () => {
    expect(TIMESTAMP.toString()).toBe('TIMESTAMP');
  });
  test('toString short', () => {
    expect(TIMESTAMP.toString({ short: true })).toBe('TIMESTAMP');
  });
  test('toString with alias', () => {
    expect(DuckDBTimestampType.create('mytimestamp').toString()).toBe(
      'mytimestamp',
    );
  });
  test('toJson', () => {
    expect(TIMESTAMP.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.TIMESTAMP,
    });
  });
  test('toJson with alias', () => {
    expect(DuckDBTimestampType.create('mytimestamp').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.TIMESTAMP,
      alias: 'mytimestamp',
    });
  });
});

suite('DuckDBDateType', () => {
  test('toString', () => {
    expect(DATE.toString()).toBe('DATE');
  });
  test('toString short', () => {
    expect(DATE.toString({ short: true })).toBe('DATE');
  });
  test('toString with alias', () => {
    expect(DuckDBDateType.create('mydate').toString()).toBe('mydate');
  });
  test('toJson', () => {
    expect(DATE.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.DATE,
    });
  });
  test('toJson with alias', () => {
    expect(DuckDBDateType.create('mydate').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.DATE,
      alias: 'mydate',
    });
  });
});

suite('DuckDBTimeType', () => {
  test('toString', () => {
    expect(TIME.toString()).toBe('TIME');
  });
  test('toString short', () => {
    expect(TIME.toString({ short: true })).toBe('TIME');
  });
  test('toString with alias', () => {
    expect(DuckDBTimeType.create('mytime').toString()).toBe('mytime');
  });
  test('toJson', () => {
    expect(TIME.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.TIME,
    });
  });
  test('toJson with alias', () => {
    expect(DuckDBTimeType.create('mytime').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.TIME,
      alias: 'mytime',
    });
  });
});

suite('DuckDBIntervalType', () => {
  test('toString', () => {
    expect(INTERVAL.toString()).toBe('INTERVAL');
  });
  test('toString short', () => {
    expect(INTERVAL.toString({ short: true })).toBe('INTERVAL');
  });
  test('toString with alias', () => {
    expect(DuckDBIntervalType.create('myinterval').toString()).toBe(
      'myinterval',
    );
  });
  test('toJson', () => {
    expect(INTERVAL.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.INTERVAL,
    });
  });
  test('toJson with alias', () => {
    expect(DuckDBIntervalType.create('myinterval').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.INTERVAL,
      alias: 'myinterval',
    });
  });
});

suite('DuckDBHugeIntType', () => {
  test('toString', () => {
    expect(HUGEINT.toString()).toBe('HUGEINT');
  });
  test('toString short', () => {
    expect(HUGEINT.toString({ short: true })).toBe('HUGEINT');
  });
  test('toString with alias', () => {
    expect(DuckDBHugeIntType.create('myhugeint').toString()).toBe('myhugeint');
  });
  test('toJson', () => {
    expect(HUGEINT.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.HUGEINT,
    });
  });
  test('toJson with alias', () => {
    expect(DuckDBHugeIntType.create('myhugeint').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.HUGEINT,
      alias: 'myhugeint',
    });
  });
});

suite('DuckDBUHugeIntType', () => {
  test('toString', () => {
    expect(UHUGEINT.toString()).toBe('UHUGEINT');
  });
  test('toString short', () => {
    expect(UHUGEINT.toString({ short: true })).toBe('UHUGEINT');
  });
  test('toString with alias', () => {
    expect(DuckDBUHugeIntType.create('myuhugeint').toString()).toBe(
      'myuhugeint',
    );
  });
  test('toJson', () => {
    expect(UHUGEINT.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.UHUGEINT,
    });
  });
  test('toJson with alias', () => {
    expect(DuckDBUHugeIntType.create('myuhugeint').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.UHUGEINT,
      alias: 'myuhugeint',
    });
  });
});

suite('DuckDBVarCharType', () => {
  test('toString', () => {
    expect(VARCHAR.toString()).toBe('VARCHAR');
  });
  test('toString short', () => {
    expect(VARCHAR.toString({ short: true })).toBe('VARCHAR');
  });
  test('toString with alias', () => {
    expect(DuckDBVarCharType.create('myvarchar').toString()).toBe('myvarchar');
  });
  test('toJson', () => {
    expect(VARCHAR.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.VARCHAR,
    });
  });
  test('toJson with alias', () => {
    expect(DuckDBVarCharType.create('myvarchar').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.VARCHAR,
      alias: 'myvarchar',
    });
  });
});

suite('DuckDBBlobType', () => {
  test('toString', () => {
    expect(BLOB.toString()).toBe('BLOB');
  });
  test('toString short', () => {
    expect(BLOB.toString({ short: true })).toBe('BLOB');
  });
  test('toString with alias', () => {
    expect(DuckDBBlobType.create('myblob').toString()).toBe('myblob');
  });
  test('toJson', () => {
    expect(BLOB.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.BLOB,
    });
  });
  test('toJson with alias', () => {
    expect(DuckDBBlobType.create('myblob').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.BLOB,
      alias: 'myblob',
    });
  });
});

suite('DuckDBDecimalType', () => {
  test('toString default', () => {
    expect(DECIMAL().toString()).toBe('DECIMAL(18,3)');
  });
  test('toString explicit width and scale', () => {
    expect(DECIMAL(38, 10).toString()).toBe('DECIMAL(38,10)');
  });
  test('toString short', () => {
    expect(DECIMAL().toString({ short: true })).toBe('DECIMAL(18,3)');
  });
  test('toString with alias', () => {
    expect(DECIMAL(38, 10, 'mydecimal').toString()).toBe('mydecimal');
  });
  test('toJson', () => {
    expect(DECIMAL().toJson()).toStrictEqual({
      typeId: DuckDBTypeId.DECIMAL,
      width: 18,
      scale: 3,
    });
  });
  test('toJson with alias', () => {
    expect(DECIMAL(38, 10, 'mydecimal').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.DECIMAL,
      width: 38,
      scale: 10,
      alias: 'mydecimal',
    });
  });
});

suite('DuckDBTimestampSecondsType', () => {
  test('toString', () => {
    expect(TIMESTAMP_S.toString()).toBe('TIMESTAMP_S');
  });
  test('toString short', () => {
    expect(TIMESTAMP_S.toString({ short: true })).toBe('TIMESTAMP_S');
  });
  test('toString with alias', () => {
    expect(DuckDBTimestampSecondsType.create('mytimestamp_s').toString()).toBe(
      'mytimestamp_s',
    );
  });
  test('toJson', () => {
    expect(TIMESTAMP_S.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.TIMESTAMP_S,
    });
  });
  test('toJson with alias', () => {
    expect(
      DuckDBTimestampSecondsType.create('mytimestamp_s').toJson(),
    ).toStrictEqual({
      typeId: DuckDBTypeId.TIMESTAMP_S,
      alias: 'mytimestamp_s',
    });
  });
});

suite('DuckDBTimestampMillisecondsType', () => {
  test('toString', () => {
    expect(TIMESTAMP_MS.toString()).toBe('TIMESTAMP_MS');
  });
  test('toString short', () => {
    expect(TIMESTAMP_MS.toString({ short: true })).toBe('TIMESTAMP_MS');
  });
  test('toString with alias', () => {
    expect(
      DuckDBTimestampMillisecondsType.create('mytimestamp_ms').toString(),
    ).toBe('mytimestamp_ms');
  });
  test('toJson', () => {
    expect(TIMESTAMP_MS.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.TIMESTAMP_MS,
    });
  });
  test('toJson with alias', () => {
    expect(
      DuckDBTimestampMillisecondsType.create('mytimestamp_ms').toJson(),
    ).toStrictEqual({
      typeId: DuckDBTypeId.TIMESTAMP_MS,
      alias: 'mytimestamp_ms',
    });
  });
});

suite('DuckDBTimestampNanosecondsType', () => {
  test('toString', () => {
    expect(TIMESTAMP_NS.toString()).toBe('TIMESTAMP_NS');
  });
  test('toString short', () => {
    expect(TIMESTAMP_NS.toString({ short: true })).toBe('TIMESTAMP_NS');
  });
  test('toString with alias', () => {
    expect(
      DuckDBTimestampNanosecondsType.create('mytimestamp_ns').toString(),
    ).toBe('mytimestamp_ns');
  });
  test('toJson', () => {
    expect(TIMESTAMP_NS.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.TIMESTAMP_NS,
    });
  });
  test('toJson with alias', () => {
    expect(
      DuckDBTimestampNanosecondsType.create('mytimestamp_ns').toJson(),
    ).toStrictEqual({
      typeId: DuckDBTypeId.TIMESTAMP_NS,
      alias: 'mytimestamp_ns',
    });
  });
});

suite('DuckDBEnumType', () => {
  test('toString', () => {
    expect(ENUM(['abc', 'def']).toString()).toBe(`ENUM('abc', 'def')`);
  });
  test('toString short', () => {
    expect(ENUM(['abc', 'def']).toString({ short: true })).toBe('ENUM(…)');
  });
  test('toString with alias', () => {
    expect(ENUM(['abc', 'def'], 'myenum').toString()).toBe('myenum');
  });
  test('toJson', () => {
    expect(ENUM(['abc', 'def']).toJson()).toStrictEqual({
      typeId: DuckDBTypeId.ENUM,
      values: ['abc', 'def'],
      internalTypeId: DuckDBTypeId.UTINYINT,
    });
  });
  test('toJson with alias', () => {
    expect(ENUM(['abc', 'def'], 'myenum').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.ENUM,
      values: ['abc', 'def'],
      internalTypeId: DuckDBTypeId.UTINYINT,
      alias: 'myenum',
    });
  });
  test('indexForValue', () => {
    expect(ENUM(['abc', 'def']).indexForValue('def')).toBe(1);
  });
});

suite('DuckDBListType', () => {
  test('toString', () => {
    expect(LIST(INTEGER).toString()).toBe('INTEGER[]');
  });
  test('toString short', () => {
    expect(LIST(INTEGER).toString({ short: true })).toBe('INTEGER[]');
  });
  test('toString with alias', () => {
    expect(LIST(INTEGER, 'mylist').toString()).toBe('mylist');
  });
  test('toJson', () => {
    expect(LIST(INTEGER).toJson()).toStrictEqual({
      typeId: DuckDBTypeId.LIST,
      valueType: INTEGER.toJson(),
    });
  });
  test('toJson with alias', () => {
    expect(LIST(INTEGER, 'mylist').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.LIST,
      valueType: INTEGER.toJson(),
      alias: 'mylist',
    });
  });
});

suite('DuckDBStructType', () => {
  test('toString', () => {
    expect(STRUCT({ a: INTEGER, 'b"c': VARCHAR }).toString()).toBe(
      'STRUCT("a" INTEGER, "b""c" VARCHAR)',
    );
  });
  test('toString short', () => {
    expect(
      STRUCT({ a: INTEGER, 'b"c': VARCHAR }).toString({ short: true }),
    ).toBe('STRUCT(…)');
  });
  test('toString with alias', () => {
    expect(STRUCT({ a: INTEGER, 'b"c': VARCHAR }, 'mystruct').toString()).toBe(
      'mystruct',
    );
  });
  test('toJson', () => {
    expect(STRUCT({ a: INTEGER, 'b"c': VARCHAR }).toJson()).toStrictEqual({
      typeId: DuckDBTypeId.STRUCT,
      entryNames: ['a', 'b"c'],
      entryTypes: [INTEGER.toJson(), VARCHAR.toJson()],
    });
  });
  test('toJson with alias', () => {
    expect(
      STRUCT({ a: INTEGER, 'b"c': VARCHAR }, 'mystruct').toJson(),
    ).toStrictEqual({
      typeId: DuckDBTypeId.STRUCT,
      entryNames: ['a', 'b"c'],
      entryTypes: [INTEGER.toJson(), VARCHAR.toJson()],
      alias: 'mystruct',
    });
  });
  test('indexForEntry', () => {
    expect(STRUCT({ a: INTEGER, 'b"c': VARCHAR }).indexForEntry('b"c')).toBe(1);
  });
  test('typeForEntry', () => {
    expect(
      STRUCT({ a: INTEGER, 'b"c': VARCHAR }).typeForEntry('b"c'),
    ).toStrictEqual(VARCHAR);
  });
});

suite('DuckDBMapType', () => {
  test('toString', () => {
    expect(MAP(INTEGER, VARCHAR).toString()).toBe('MAP(INTEGER, VARCHAR)');
  });
  test('toString short', () => {
    expect(MAP(INTEGER, VARCHAR).toString({ short: true })).toBe('MAP(…)');
  });
  test('toString with alias', () => {
    expect(MAP(INTEGER, VARCHAR, 'mymap').toString()).toBe('mymap');
  });
  test('toJson', () => {
    expect(MAP(INTEGER, VARCHAR).toJson()).toStrictEqual({
      typeId: DuckDBTypeId.MAP,
      keyType: INTEGER.toJson(),
      valueType: VARCHAR.toJson(),
    });
  });
  test('toJson with alias', () => {
    expect(MAP(INTEGER, VARCHAR, 'mymap').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.MAP,
      keyType: INTEGER.toJson(),
      valueType: VARCHAR.toJson(),
      alias: 'mymap',
    });
  });
});

suite('DuckDBArrayType', () => {
  test('toString', () => {
    expect(ARRAY(INTEGER, 3).toString()).toBe('INTEGER[3]');
  });
  test('toString short', () => {
    expect(ARRAY(INTEGER, 3).toString({ short: true })).toBe('INTEGER[3]');
  });
  test('toString with alias', () => {
    expect(ARRAY(INTEGER, 3, 'myarray').toString()).toBe('myarray');
  });
  test('toJson', () => {
    expect(ARRAY(INTEGER, 3).toJson()).toStrictEqual({
      typeId: DuckDBTypeId.ARRAY,
      valueType: INTEGER.toJson(),
      length: 3,
    });
  });
  test('toJson with alias', () => {
    expect(ARRAY(INTEGER, 3, 'myarray').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.ARRAY,
      valueType: INTEGER.toJson(),
      length: 3,
      alias: 'myarray',
    });
  });
});

suite('DuckDBUUIDType', () => {
  test('toString', () => {
    expect(UUID.toString()).toBe('UUID');
  });
  test('toString short', () => {
    expect(UUID.toString({ short: true })).toBe('UUID');
  });
  test('toString with alias', () => {
    expect(DuckDBUUIDType.create('myuuid').toString()).toBe('myuuid');
  });
  test('toJson', () => {
    expect(UUID.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.UUID,
    });
  });
  test('toJson with alias', () => {
    expect(DuckDBUUIDType.create('myuuid').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.UUID,
      alias: 'myuuid',
    });
  });
});

suite('DuckDBUnionType', () => {
  test('toString', () => {
    expect(UNION({ a: INTEGER, 'b"c': VARCHAR }).toString()).toBe(
      'UNION("a" INTEGER, "b""c" VARCHAR)',
    );
  });
  test('toString short', () => {
    expect(
      UNION({ a: INTEGER, 'b"c': VARCHAR }).toString({ short: true }),
    ).toBe('UNION(…)');
  });
  test('toString with alias', () => {
    expect(UNION({ a: INTEGER, 'b"c': VARCHAR }, 'myunion').toString()).toBe(
      'myunion',
    );
  });
  test('toJson', () => {
    expect(UNION({ a: INTEGER, 'b"c': VARCHAR }).toJson()).toStrictEqual({
      typeId: DuckDBTypeId.UNION,
      memberTags: ['a', 'b"c'],
      memberTypes: [INTEGER.toJson(), VARCHAR.toJson()],
    });
  });
  test('toJson with alias', () => {
    expect(
      UNION({ a: INTEGER, 'b"c': VARCHAR }, 'myunion').toJson(),
    ).toStrictEqual({
      typeId: DuckDBTypeId.UNION,
      memberTags: ['a', 'b"c'],
      memberTypes: [INTEGER.toJson(), VARCHAR.toJson()],
      alias: 'myunion',
    });
  });
  test('memberIndexForTag', () => {
    expect(UNION({ a: INTEGER, 'b"c': VARCHAR }).memberIndexForTag('b"c')).toBe(
      1,
    );
  });
  test('memberTypeForTag', () => {
    expect(
      UNION({ a: INTEGER, 'b"c': VARCHAR }).memberTypeForTag('b"c'),
    ).toStrictEqual(VARCHAR);
  });
});

suite('DuckDBBitType', () => {
  test('toString', () => {
    expect(BIT.toString()).toBe('BIT');
  });
  test('toString short', () => {
    expect(BIT.toString({ short: true })).toBe('BIT');
  });
  test('toString with alias', () => {
    expect(DuckDBBitType.create('mybit').toString()).toBe('mybit');
  });
  test('toJson', () => {
    expect(BIT.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.BIT,
    });
  });
  test('toJson with alias', () => {
    expect(DuckDBBitType.create('mybit').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.BIT,
      alias: 'mybit',
    });
  });
});

suite('DuckDBTimeTZType', () => {
  test('toString', () => {
    expect(TIMETZ.toString()).toBe('TIME WITH TIME ZONE');
  });
  test('toString short', () => {
    expect(TIMETZ.toString({ short: true })).toBe('TIMETZ');
  });
  test('toString with alias', () => {
    expect(DuckDBTimeTZType.create('mytimetz').toString()).toBe('mytimetz');
  });
  test('toJson', () => {
    expect(TIMETZ.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.TIME_TZ,
    });
  });
  test('toJson with alias', () => {
    expect(DuckDBTimeTZType.create('mytimetz').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.TIME_TZ,
      alias: 'mytimetz',
    });
  });
});

suite('DuckDBTimestampTZType', () => {
  test('toString', () => {
    expect(TIMESTAMPTZ.toString()).toBe('TIMESTAMP WITH TIME ZONE');
  });
  test('toString short', () => {
    expect(TIMESTAMPTZ.toString({ short: true })).toBe('TIMESTAMPTZ');
  });
  test('toString with alias', () => {
    expect(DuckDBTimestampTZType.create('mytimestamptz').toString()).toBe(
      'mytimestamptz',
    );
  });
  test('toJson', () => {
    expect(TIMESTAMPTZ.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.TIMESTAMP_TZ,
    });
  });
  test('toJson with alias', () => {
    expect(
      DuckDBTimestampTZType.create('mytimestamptz').toJson(),
    ).toStrictEqual({
      typeId: DuckDBTypeId.TIMESTAMP_TZ,
      alias: 'mytimestamptz',
    });
  });
});

suite('DuckDBAnyType', () => {
  test('toString', () => {
    expect(ANY.toString()).toBe('ANY');
  });
  test('toString short', () => {
    expect(ANY.toString({ short: true })).toBe('ANY');
  });
  test('toString with alias', () => {
    expect(DuckDBAnyType.create('myany').toString()).toBe('myany');
  });
  test('toJson', () => {
    expect(ANY.toJson()).toStrictEqual({ typeId: DuckDBTypeId.ANY });
  });
  test('toJson with alias', () => {
    expect(DuckDBAnyType.create('myany').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.ANY,
      alias: 'myany',
    });
  });
});

suite('DuckDBBigNumType', () => {
  test('toString', () => {
    expect(BIGNUM.toString()).toBe('BIGNUM');
  });
  test('toString short', () => {
    expect(BIGNUM.toString({ short: true })).toBe('BIGNUM');
  });
  test('toString with alias', () => {
    expect(DuckDBBigNumType.create('mybignum').toString()).toBe('mybignum');
  });
  test('toJson', () => {
    expect(BIGNUM.toJson()).toStrictEqual({ typeId: DuckDBTypeId.BIGNUM });
  });
  test('toJson with alias', () => {
    expect(DuckDBBigNumType.create('mybignum').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.BIGNUM,
      alias: 'mybignum',
    });
  });
});

suite('DuckDBSQLNullType', () => {
  test('toString', () => {
    expect(SQLNULL.toString()).toBe('SQLNULL');
  });
  test('toString short', () => {
    expect(SQLNULL.toString({ short: true })).toBe('SQLNULL');
  });
  test('toString with alias', () => {
    expect(DuckDBSQLNullType.create('mysqlnull').toString()).toBe('mysqlnull');
  });
  test('toJson', () => {
    expect(SQLNULL.toJson()).toStrictEqual({ typeId: DuckDBTypeId.SQLNULL });
  });
  test('toJson with alias', () => {
    expect(DuckDBSQLNullType.create('mysqlnull').toJson()).toStrictEqual({
      typeId: DuckDBTypeId.SQLNULL,
      alias: 'mysqlnull',
    });
  });
});

suite('DuckDBStringLiteralType', () => {
  test('toString', () => {
    expect(STRING_LITERAL.toString()).toBe('STRING_LITERAL');
  });
  test('toString short', () => {
    expect(STRING_LITERAL.toString({ short: true })).toBe('STRING_LITERAL');
  });
  test('toString with alias', () => {
    expect(DuckDBStringLiteralType.create('mystringliteral').toString()).toBe(
      'mystringliteral',
    );
  });
  test('toJson', () => {
    expect(STRING_LITERAL.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.STRING_LITERAL,
    });
  });
  test('toJson with alias', () => {
    expect(
      DuckDBStringLiteralType.create('mystringliteral').toJson(),
    ).toStrictEqual({
      typeId: DuckDBTypeId.STRING_LITERAL,
      alias: 'mystringliteral',
    });
  });
});

suite('DuckDBIntegerLiteralType', () => {
  test('toString', () => {
    expect(INTEGER_LITERAL.toString()).toBe('INTEGER_LITERAL');
  });
  test('toString short', () => {
    expect(INTEGER_LITERAL.toString({ short: true })).toBe('INTEGER_LITERAL');
  });
  test('toString with alias', () => {
    expect(DuckDBIntegerLiteralType.create('myintegerliteral').toString()).toBe(
      'myintegerliteral',
    );
  });
  test('toJson', () => {
    expect(INTEGER_LITERAL.toJson()).toStrictEqual({
      typeId: DuckDBTypeId.INTEGER_LITERAL,
    });
  });
  test('toJson with alias', () => {
    expect(
      DuckDBIntegerLiteralType.create('myintegerliteral').toJson(),
    ).toStrictEqual({
      typeId: DuckDBTypeId.INTEGER_LITERAL,
      alias: 'myintegerliteral',
    });
  });
});
