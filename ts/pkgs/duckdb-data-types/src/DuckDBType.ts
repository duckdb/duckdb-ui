import { Json } from '@duckdb/data-values';
import { DuckDBTypeId } from './DuckDBTypeId.js';
import { quotedIdentifier, quotedString } from './sql.js';

export interface DuckDBTypeToStringOptions {
  short?: boolean;
}
export abstract class BaseDuckDBType<T extends DuckDBTypeId> {
  public readonly typeId: T;
  public readonly alias?: string;
  protected constructor(typeId: T, alias?: string) {
    this.typeId = typeId;
    this.alias = alias;
  }
  public toString(_options?: DuckDBTypeToStringOptions): string {
    return this.alias ?? DuckDBTypeId[this.typeId];
  }
  public toJson(): Json {
    return {
      typeId: this.typeId,
      ...(this.alias ? { alias: this.alias } : {}),
    };
  }
}

export class DuckDBBooleanType extends BaseDuckDBType<DuckDBTypeId.BOOLEAN> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.BOOLEAN, alias);
  }
  public static readonly instance = new DuckDBBooleanType();
  public static create(alias?: string): DuckDBBooleanType {
    return alias ? new DuckDBBooleanType(alias) : DuckDBBooleanType.instance;
  }
}
export const BOOLEAN = DuckDBBooleanType.instance;

export class DuckDBTinyIntType extends BaseDuckDBType<DuckDBTypeId.TINYINT> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.TINYINT, alias);
  }
  public static readonly instance = new DuckDBTinyIntType();
  public static create(alias?: string): DuckDBTinyIntType {
    return alias ? new DuckDBTinyIntType(alias) : DuckDBTinyIntType.instance;
  }
  public static readonly Max = 2 ** 7 - 1;
  public static readonly Min = -(2 ** 7);
  public get max() {
    return DuckDBTinyIntType.Max;
  }
  public get min() {
    return DuckDBTinyIntType.Min;
  }
}
export const TINYINT = DuckDBTinyIntType.instance;

export class DuckDBSmallIntType extends BaseDuckDBType<DuckDBTypeId.SMALLINT> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.SMALLINT, alias);
  }
  public static readonly instance = new DuckDBSmallIntType();
  public static create(alias?: string): DuckDBSmallIntType {
    return alias ? new DuckDBSmallIntType(alias) : DuckDBSmallIntType.instance;
  }
  public static readonly Max = 2 ** 15 - 1;
  public static readonly Min = -(2 ** 15);
  public get max() {
    return DuckDBSmallIntType.Max;
  }
  public get min() {
    return DuckDBSmallIntType.Min;
  }
}
export const SMALLINT = DuckDBSmallIntType.instance;

export class DuckDBIntegerType extends BaseDuckDBType<DuckDBTypeId.INTEGER> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.INTEGER, alias);
  }
  public static readonly instance = new DuckDBIntegerType();
  public static create(alias?: string): DuckDBIntegerType {
    return alias ? new DuckDBIntegerType(alias) : DuckDBIntegerType.instance;
  }
  public static readonly Max = 2 ** 31 - 1;
  public static readonly Min = -(2 ** 31);
  public get max() {
    return DuckDBIntegerType.Max;
  }
  public get min() {
    return DuckDBIntegerType.Min;
  }
}
export const INTEGER = DuckDBIntegerType.instance;

export class DuckDBBigIntType extends BaseDuckDBType<DuckDBTypeId.BIGINT> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.BIGINT, alias);
  }
  public static readonly instance = new DuckDBBigIntType();
  public static create(alias?: string): DuckDBBigIntType {
    return alias ? new DuckDBBigIntType(alias) : DuckDBBigIntType.instance;
  }
  public static readonly Max: bigint = 2n ** 63n - 1n;
  public static readonly Min: bigint = -(2n ** 63n);
  public get max() {
    return DuckDBBigIntType.Max;
  }
  public get min() {
    return DuckDBBigIntType.Min;
  }
}
export const BIGINT = DuckDBBigIntType.instance;

export class DuckDBUTinyIntType extends BaseDuckDBType<DuckDBTypeId.UTINYINT> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.UTINYINT, alias);
  }
  public static readonly instance = new DuckDBUTinyIntType();
  public static create(alias?: string): DuckDBUTinyIntType {
    return alias ? new DuckDBUTinyIntType(alias) : DuckDBUTinyIntType.instance;
  }
  public static readonly Max = 2 ** 8 - 1;
  public static readonly Min = 0;
  public get max() {
    return DuckDBUTinyIntType.Max;
  }
  public get min() {
    return DuckDBUTinyIntType.Min;
  }
}
export const UTINYINT = DuckDBUTinyIntType.instance;

export class DuckDBUSmallIntType extends BaseDuckDBType<DuckDBTypeId.USMALLINT> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.USMALLINT, alias);
  }
  public static readonly instance = new DuckDBUSmallIntType();
  public static create(alias?: string): DuckDBUSmallIntType {
    return alias
      ? new DuckDBUSmallIntType(alias)
      : DuckDBUSmallIntType.instance;
  }
  public static readonly Max = 2 ** 16 - 1;
  public static readonly Min = 0;
  public get max() {
    return DuckDBUSmallIntType.Max;
  }
  public get min() {
    return DuckDBUSmallIntType.Min;
  }
}
export const USMALLINT = DuckDBUSmallIntType.instance;

export class DuckDBUIntegerType extends BaseDuckDBType<DuckDBTypeId.UINTEGER> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.UINTEGER, alias);
  }
  public static readonly instance = new DuckDBUIntegerType();
  public static create(alias?: string): DuckDBUIntegerType {
    return alias ? new DuckDBUIntegerType(alias) : DuckDBUIntegerType.instance;
  }
  public static readonly Max = 2 ** 32 - 1;
  public static readonly Min = 0;
  public get max() {
    return DuckDBUIntegerType.Max;
  }
  public get min() {
    return DuckDBUIntegerType.Min;
  }
}
export const UINTEGER = DuckDBUIntegerType.instance;

export class DuckDBUBigIntType extends BaseDuckDBType<DuckDBTypeId.UBIGINT> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.UBIGINT, alias);
  }
  public static readonly instance = new DuckDBUBigIntType();
  public static create(alias?: string): DuckDBUBigIntType {
    return alias ? new DuckDBUBigIntType(alias) : DuckDBUBigIntType.instance;
  }
  public static readonly Max: bigint = 2n ** 64n - 1n;
  public static readonly Min: bigint = 0n;
  public get max() {
    return DuckDBUBigIntType.Max;
  }
  public get min() {
    return DuckDBUBigIntType.Min;
  }
}
export const UBIGINT = DuckDBUBigIntType.instance;

export class DuckDBFloatType extends BaseDuckDBType<DuckDBTypeId.FLOAT> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.FLOAT, alias);
  }
  public static readonly instance = new DuckDBFloatType();
  public static create(alias?: string): DuckDBFloatType {
    return alias ? new DuckDBFloatType(alias) : DuckDBFloatType.instance;
  }
  public static readonly Max = Math.fround(3.4028235e38);
  public static readonly Min = Math.fround(-3.4028235e38);
  public get max() {
    return DuckDBFloatType.Max;
  }
  public get min() {
    return DuckDBFloatType.Min;
  }
}
export const FLOAT = DuckDBFloatType.instance;

export class DuckDBDoubleType extends BaseDuckDBType<DuckDBTypeId.DOUBLE> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.DOUBLE, alias);
  }
  public static readonly instance = new DuckDBDoubleType();
  public static create(alias?: string): DuckDBDoubleType {
    return alias ? new DuckDBDoubleType(alias) : DuckDBDoubleType.instance;
  }
  public static readonly Max = Number.MAX_VALUE;
  public static readonly Min = -Number.MAX_VALUE;
  public get max() {
    return DuckDBDoubleType.Max;
  }
  public get min() {
    return DuckDBDoubleType.Min;
  }
}
export const DOUBLE = DuckDBDoubleType.instance;

export class DuckDBTimestampType extends BaseDuckDBType<DuckDBTypeId.TIMESTAMP> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.TIMESTAMP, alias);
  }
  public static readonly instance = new DuckDBTimestampType();
  public static create(alias?: string): DuckDBTimestampType {
    return alias
      ? new DuckDBTimestampType(alias)
      : DuckDBTimestampType.instance;
  }
  // TODO: common DuckDBValues on type objects
  // public get epoch() {
  //   return DuckDBTimestampValue.Epoch;
  // }
  // public get max() {
  //   return DuckDBTimestampValue.Max;
  // }
  // public get min() {
  //   return DuckDBTimestampValue.Min;
  // }
  // public get posInf() {
  //   return DuckDBTimestampValue.PosInf;
  // }
  // public get negInf() {
  //   return DuckDBTimestampValue.NegInf;
  // }
}
export const TIMESTAMP = DuckDBTimestampType.instance;

export type DuckDBTimestampMicrosecondsType = DuckDBTimestampType;
export const DuckDBTimestampMicrosecondsType = DuckDBTimestampType;

export class DuckDBDateType extends BaseDuckDBType<DuckDBTypeId.DATE> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.DATE, alias);
  }
  public static readonly instance = new DuckDBDateType();
  public static create(alias?: string): DuckDBDateType {
    return alias ? new DuckDBDateType(alias) : DuckDBDateType.instance;
  }
  // TODO: common DuckDBValues on type objects
  // public get epoch() {
  //   return DuckDBDateValue.Epoch;
  // }
  // public get max() {
  //   return DuckDBDateValue.Max;
  // }
  // public get min() {
  //   return DuckDBDateValue.Min;
  // }
  // public get posInf() {
  //   return DuckDBDateValue.PosInf;
  // }
  // public get negInf() {
  //   return DuckDBDateValue.NegInf;
  // }
}
export const DATE = DuckDBDateType.instance;

export class DuckDBTimeType extends BaseDuckDBType<DuckDBTypeId.TIME> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.TIME, alias);
  }
  public static readonly instance = new DuckDBTimeType();
  public static create(alias?: string): DuckDBTimeType {
    return alias ? new DuckDBTimeType(alias) : DuckDBTimeType.instance;
  }
  // TODO: common DuckDBValues on type objects
  // public get max() {
  //   return DuckDBTimeValue.Max;
  // }
  // public get min() {
  //   return DuckDBTimeValue.Min;
  // }
}
export const TIME = DuckDBTimeType.instance;

export class DuckDBIntervalType extends BaseDuckDBType<DuckDBTypeId.INTERVAL> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.INTERVAL, alias);
  }
  public static readonly instance = new DuckDBIntervalType();
  public static create(alias?: string): DuckDBIntervalType {
    return alias ? new DuckDBIntervalType(alias) : DuckDBIntervalType.instance;
  }
}
export const INTERVAL = DuckDBIntervalType.instance;

export class DuckDBHugeIntType extends BaseDuckDBType<DuckDBTypeId.HUGEINT> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.HUGEINT, alias);
  }
  public static readonly instance = new DuckDBHugeIntType();
  public static create(alias?: string): DuckDBHugeIntType {
    return alias ? new DuckDBHugeIntType(alias) : DuckDBHugeIntType.instance;
  }
  public static readonly Max: bigint = 2n ** 127n - 1n;
  public static readonly Min: bigint = -(2n ** 127n);
  public get max() {
    return DuckDBHugeIntType.Max;
  }
  public get min() {
    return DuckDBHugeIntType.Min;
  }
}
export const HUGEINT = DuckDBHugeIntType.instance;

export class DuckDBUHugeIntType extends BaseDuckDBType<DuckDBTypeId.UHUGEINT> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.UHUGEINT, alias);
  }
  public static readonly instance = new DuckDBUHugeIntType();
  public static create(alias?: string): DuckDBUHugeIntType {
    return alias ? new DuckDBUHugeIntType(alias) : DuckDBUHugeIntType.instance;
  }
  public static readonly Max: bigint = 2n ** 128n - 1n;
  public static readonly Min: bigint = 0n;
  public get max() {
    return DuckDBUHugeIntType.Max;
  }
  public get min() {
    return DuckDBUHugeIntType.Min;
  }
}
export const UHUGEINT = DuckDBUHugeIntType.instance;

export class DuckDBVarCharType extends BaseDuckDBType<DuckDBTypeId.VARCHAR> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.VARCHAR, alias);
  }
  public static readonly instance = new DuckDBVarCharType();
  public static create(alias?: string): DuckDBVarCharType {
    return alias ? new DuckDBVarCharType(alias) : DuckDBVarCharType.instance;
  }
}
export const VARCHAR = DuckDBVarCharType.instance;

export class DuckDBBlobType extends BaseDuckDBType<DuckDBTypeId.BLOB> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.BLOB, alias);
  }
  public static readonly instance = new DuckDBBlobType();
  public static create(alias?: string): DuckDBBlobType {
    return alias ? new DuckDBBlobType(alias) : DuckDBBlobType.instance;
  }
}
export const BLOB = DuckDBBlobType.instance;

export class DuckDBDecimalType extends BaseDuckDBType<DuckDBTypeId.DECIMAL> {
  public readonly width: number;
  public readonly scale: number;
  public constructor(width: number, scale: number, alias?: string) {
    super(DuckDBTypeId.DECIMAL, alias);
    this.width = width;
    this.scale = scale;
  }
  public toString(_options?: DuckDBTypeToStringOptions): string {
    return this.alias ?? `DECIMAL(${this.width},${this.scale})`;
  }
  public override toJson(): Json {
    return {
      typeId: this.typeId,
      width: this.width,
      scale: this.scale,
      ...(this.alias ? { alias: this.alias } : {}),
    };
  }
  public static readonly default = new DuckDBDecimalType(18, 3);
}
export function DECIMAL(
  width?: number,
  scale?: number,
  alias?: string,
): DuckDBDecimalType {
  if (width === undefined) {
    return DuckDBDecimalType.default;
  }
  if (scale === undefined) {
    return new DuckDBDecimalType(width, 0);
  }
  return new DuckDBDecimalType(width, scale, alias);
}

export class DuckDBTimestampSecondsType extends BaseDuckDBType<DuckDBTypeId.TIMESTAMP_S> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.TIMESTAMP_S, alias);
  }
  public static readonly instance = new DuckDBTimestampSecondsType();
  public static create(alias?: string): DuckDBTimestampSecondsType {
    return alias
      ? new DuckDBTimestampSecondsType(alias)
      : DuckDBTimestampSecondsType.instance;
  }
  // TODO: common DuckDBValues on type objects
  // public get epoch() {
  //   return DuckDBTimestampSecondsValue.Epoch;
  // }
  // public get max() {
  //   return DuckDBTimestampSecondsValue.Max;
  // }
  // public get min() {
  //   return DuckDBTimestampSecondsValue.Min;
  // }
  // public get posInf() {
  //   return DuckDBTimestampSecondsValue.PosInf;
  // }
  // public get negInf() {
  //   return DuckDBTimestampSecondsValue.NegInf;
  // }
}
export const TIMESTAMP_S = DuckDBTimestampSecondsType.instance;

export class DuckDBTimestampMillisecondsType extends BaseDuckDBType<DuckDBTypeId.TIMESTAMP_MS> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.TIMESTAMP_MS, alias);
  }
  public static readonly instance = new DuckDBTimestampMillisecondsType();
  public static create(alias?: string): DuckDBTimestampMillisecondsType {
    return alias
      ? new DuckDBTimestampMillisecondsType(alias)
      : DuckDBTimestampMillisecondsType.instance;
  }
  // TODO: common DuckDBValues on type objects
  // public get epoch() {
  //   return DuckDBTimestampMillisecondsValue.Epoch;
  // }
  // public get max() {
  //   return DuckDBTimestampMillisecondsValue.Max;
  // }
  // public get min() {
  //   return DuckDBTimestampMillisecondsValue.Min;
  // }
  // public get posInf() {
  //   return DuckDBTimestampMillisecondsValue.PosInf;
  // }
  // public get negInf() {
  //   return DuckDBTimestampMillisecondsValue.NegInf;
  // }
}
export const TIMESTAMP_MS = DuckDBTimestampMillisecondsType.instance;

export class DuckDBTimestampNanosecondsType extends BaseDuckDBType<DuckDBTypeId.TIMESTAMP_NS> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.TIMESTAMP_NS, alias);
  }
  public static readonly instance = new DuckDBTimestampNanosecondsType();
  public static create(alias?: string): DuckDBTimestampNanosecondsType {
    return alias
      ? new DuckDBTimestampNanosecondsType(alias)
      : DuckDBTimestampNanosecondsType.instance;
  }
  // TODO: common DuckDBValues on type objects
  // public get epoch() {
  //   return DuckDBTimestampNanosecondsValue.Epoch;
  // }
  // public get max() {
  //   return DuckDBTimestampNanosecondsValue.Max;
  // }
  // public get min() {
  //   return DuckDBTimestampNanosecondsValue.Min;
  // }
  // public get posInf() {
  //   return DuckDBTimestampNanosecondsValue.PosInf;
  // }
  // public get negInf() {
  //   return DuckDBTimestampNanosecondsValue.NegInf;
  // }
}
export const TIMESTAMP_NS = DuckDBTimestampNanosecondsType.instance;

export class DuckDBEnumType extends BaseDuckDBType<DuckDBTypeId.ENUM> {
  public readonly values: readonly string[];
  public readonly valueIndexes: Readonly<Record<string, number>>;
  public readonly internalTypeId: DuckDBTypeId;
  public constructor(
    values: readonly string[],
    internalTypeId: DuckDBTypeId,
    alias?: string,
  ) {
    super(DuckDBTypeId.ENUM, alias);
    this.values = values;
    const valueIndexes: Record<string, number> = {};
    for (let i = 0; i < values.length; i++) {
      valueIndexes[values[i]] = i;
    }
    this.valueIndexes = valueIndexes;
    this.internalTypeId = internalTypeId;
  }
  public indexForValue(value: string): number {
    return this.valueIndexes[value];
  }
  public toString(options?: DuckDBTypeToStringOptions): string {
    if (this.alias) {
      return this.alias;
    }
    if (options?.short) {
      return `ENUM(…)`;
    }
    return `ENUM(${this.values.map(quotedString).join(', ')})`;
  }
  public override toJson(): Json {
    return {
      typeId: this.typeId,
      values: [...this.values],
      internalTypeId: this.internalTypeId,
      ...(this.alias ? { alias: this.alias } : {}),
    };
  }
}
export function ENUM8(
  values: readonly string[],
  alias?: string,
): DuckDBEnumType {
  return new DuckDBEnumType(values, DuckDBTypeId.UTINYINT, alias);
}
export function ENUM16(
  values: readonly string[],
  alias?: string,
): DuckDBEnumType {
  return new DuckDBEnumType(values, DuckDBTypeId.USMALLINT, alias);
}
export function ENUM32(
  values: readonly string[],
  alias?: string,
): DuckDBEnumType {
  return new DuckDBEnumType(values, DuckDBTypeId.UINTEGER, alias);
}
export function ENUM(
  values: readonly string[],
  alias?: string,
): DuckDBEnumType {
  if (values.length < 256) {
    return ENUM8(values, alias);
  } else if (values.length < 65536) {
    return ENUM16(values, alias);
  } else if (values.length < 4294967296) {
    return ENUM32(values, alias);
  } else {
    throw new Error(
      `ENUM types cannot have more than 4294967295 values; received ${values.length}`,
    );
  }
}

export class DuckDBListType extends BaseDuckDBType<DuckDBTypeId.LIST> {
  public readonly valueType: DuckDBType;
  public constructor(valueType: DuckDBType, alias?: string) {
    super(DuckDBTypeId.LIST, alias);
    this.valueType = valueType;
  }
  public toString(options?: DuckDBTypeToStringOptions): string {
    return this.alias ?? `${this.valueType.toString(options)}[]`;
  }
  public override toJson(): Json {
    return {
      typeId: this.typeId,
      valueType: this.valueType.toJson(),
      ...(this.alias ? { alias: this.alias } : {}),
    };
  }
}
export function LIST(valueType: DuckDBType, alias?: string): DuckDBListType {
  return new DuckDBListType(valueType, alias);
}

export class DuckDBStructType extends BaseDuckDBType<DuckDBTypeId.STRUCT> {
  public readonly entryNames: readonly string[];
  public readonly entryTypes: readonly DuckDBType[];
  public readonly entryIndexes: Readonly<Record<string, number>>;
  public constructor(
    entryNames: readonly string[],
    entryTypes: readonly DuckDBType[],
    alias?: string,
  ) {
    super(DuckDBTypeId.STRUCT, alias);
    if (entryNames.length !== entryTypes.length) {
      throw new Error(`Could not create DuckDBStructType: \
        entryNames length (${entryNames.length}) does not match entryTypes length (${entryTypes.length})`);
    }
    this.entryNames = entryNames;
    this.entryTypes = entryTypes;
    const entryIndexes: Record<string, number> = {};
    for (let i = 0; i < entryNames.length; i++) {
      entryIndexes[entryNames[i]] = i;
    }
    this.entryIndexes = entryIndexes;
  }
  public get entryCount() {
    return this.entryNames.length;
  }
  public indexForEntry(entryName: string): number {
    return this.entryIndexes[entryName];
  }
  public typeForEntry(entryName: string): DuckDBType {
    return this.entryTypes[this.entryIndexes[entryName]];
  }
  public toString(options?: DuckDBTypeToStringOptions): string {
    if (this.alias) {
      return this.alias;
    }
    if (options?.short) {
      return `STRUCT(…)`;
    }
    const parts: string[] = [];
    for (let i = 0; i < this.entryNames.length; i++) {
      parts.push(
        `${quotedIdentifier(this.entryNames[i])} ${this.entryTypes[i]}`,
      );
    }
    return `STRUCT(${parts.join(', ')})`;
  }
  public override toJson(): Json {
    return {
      typeId: this.typeId,
      entryNames: [...this.entryNames],
      entryTypes: this.entryTypes.map((t) => t.toJson()),
      ...(this.alias ? { alias: this.alias } : {}),
    };
  }
}
export function STRUCT(
  entries: Record<string, DuckDBType>,
  alias?: string,
): DuckDBStructType {
  const entryNames = Object.keys(entries);
  const entryTypes = Object.values(entries);
  return new DuckDBStructType(entryNames, entryTypes, alias);
}

export class DuckDBMapType extends BaseDuckDBType<DuckDBTypeId.MAP> {
  public readonly keyType: DuckDBType;
  public readonly valueType: DuckDBType;
  public constructor(
    keyType: DuckDBType,
    valueType: DuckDBType,
    alias?: string,
  ) {
    super(DuckDBTypeId.MAP, alias);
    this.keyType = keyType;
    this.valueType = valueType;
  }
  public toString(options?: DuckDBTypeToStringOptions): string {
    if (this.alias) {
      return this.alias;
    }
    if (options?.short) {
      return `MAP(…)`;
    }
    return `MAP(${this.keyType}, ${this.valueType})`;
  }
  public override toJson(): Json {
    return {
      typeId: this.typeId,
      keyType: this.keyType.toJson(),
      valueType: this.valueType.toJson(),
      ...(this.alias ? { alias: this.alias } : {}),
    };
  }
}
export function MAP(
  keyType: DuckDBType,
  valueType: DuckDBType,
  alias?: string,
): DuckDBMapType {
  return new DuckDBMapType(keyType, valueType, alias);
}

export class DuckDBArrayType extends BaseDuckDBType<DuckDBTypeId.ARRAY> {
  public readonly valueType: DuckDBType;
  public readonly length: number;
  public constructor(valueType: DuckDBType, length: number, alias?: string) {
    super(DuckDBTypeId.ARRAY, alias);
    this.valueType = valueType;
    this.length = length;
  }
  public toString(options?: DuckDBTypeToStringOptions): string {
    return this.alias ?? `${this.valueType.toString(options)}[${this.length}]`;
  }
  public override toJson(): Json {
    return {
      typeId: this.typeId,
      valueType: this.valueType.toJson(),
      length: this.length,
      ...(this.alias ? { alias: this.alias } : {}),
    };
  }
}
export function ARRAY(
  valueType: DuckDBType,
  length: number,
  alias?: string,
): DuckDBArrayType {
  return new DuckDBArrayType(valueType, length, alias);
}

export class DuckDBUUIDType extends BaseDuckDBType<DuckDBTypeId.UUID> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.UUID, alias);
  }
  public static readonly instance = new DuckDBUUIDType();
  public static create(alias?: string): DuckDBUUIDType {
    return alias ? new DuckDBUUIDType(alias) : DuckDBUUIDType.instance;
  }
  // TODO: common DuckDBValues on type objects
  // public get max() {
  //   return DuckDBUUIDValue.Max;
  // }
  // public get min() {
  //   return DuckDBUUIDValue.Min;
  // }
}
export const UUID = DuckDBUUIDType.instance;

export class DuckDBUnionType extends BaseDuckDBType<DuckDBTypeId.UNION> {
  public readonly memberTags: readonly string[];
  public readonly tagMemberIndexes: Readonly<Record<string, number>>;
  public readonly memberTypes: readonly DuckDBType[];
  public constructor(
    memberTags: readonly string[],
    memberTypes: readonly DuckDBType[],
    alias?: string,
  ) {
    super(DuckDBTypeId.UNION, alias);
    if (memberTags.length !== memberTypes.length) {
      throw new Error(`Could not create DuckDBUnionType: \
        tags length (${memberTags.length}) does not match valueTypes length (${memberTypes.length})`);
    }
    this.memberTags = memberTags;
    const tagMemberIndexes: Record<string, number> = {};
    for (let i = 0; i < memberTags.length; i++) {
      tagMemberIndexes[memberTags[i]] = i;
    }
    this.tagMemberIndexes = tagMemberIndexes;
    this.memberTypes = memberTypes;
  }
  public memberIndexForTag(tag: string): number {
    return this.tagMemberIndexes[tag];
  }
  public memberTypeForTag(tag: string): DuckDBType {
    return this.memberTypes[this.tagMemberIndexes[tag]];
  }
  public get memberCount() {
    return this.memberTags.length;
  }
  public toString(options?: DuckDBTypeToStringOptions): string {
    if (this.alias) {
      return this.alias;
    }
    if (options?.short) {
      return `UNION(…)`;
    }
    const parts: string[] = [];
    for (let i = 0; i < this.memberTags.length; i++) {
      parts.push(
        `${quotedIdentifier(this.memberTags[i])} ${this.memberTypes[i]}`,
      );
    }
    return `UNION(${parts.join(', ')})`;
  }
  public override toJson(): Json {
    return {
      typeId: this.typeId,
      memberTags: [...this.memberTags],
      memberTypes: this.memberTypes.map((t) => t.toJson()),
      ...(this.alias ? { alias: this.alias } : {}),
    };
  }
}
export function UNION(
  members: Record<string, DuckDBType>,
  alias?: string,
): DuckDBUnionType {
  const memberTags = Object.keys(members);
  const memberTypes = Object.values(members);
  return new DuckDBUnionType(memberTags, memberTypes, alias);
}

export class DuckDBBitType extends BaseDuckDBType<DuckDBTypeId.BIT> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.BIT, alias);
  }
  public static readonly instance = new DuckDBBitType();
  public static create(alias?: string): DuckDBBitType {
    return alias ? new DuckDBBitType(alias) : DuckDBBitType.instance;
  }
}
export const BIT = DuckDBBitType.instance;

export class DuckDBTimeTZType extends BaseDuckDBType<DuckDBTypeId.TIME_TZ> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.TIME_TZ, alias);
  }
  public toString(options?: DuckDBTypeToStringOptions): string {
    if (this.alias) {
      return this.alias;
    }
    if (options?.short) {
      return 'TIMETZ';
    }
    return 'TIME WITH TIME ZONE';
  }
  public static readonly instance = new DuckDBTimeTZType();
  public static create(alias?: string): DuckDBTimeTZType {
    return alias ? new DuckDBTimeTZType(alias) : DuckDBTimeTZType.instance;
  }
  // TODO: common DuckDBValues on type objects
  // public get max() {
  //   return DuckDBTimeTZValue.Max;
  // }
  // public get min() {
  //   return DuckDBTimeTZValue.Min;
  // }
}
export const TIMETZ = DuckDBTimeTZType.instance;

export class DuckDBTimestampTZType extends BaseDuckDBType<DuckDBTypeId.TIMESTAMP_TZ> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.TIMESTAMP_TZ, alias);
  }
  public toString(options?: DuckDBTypeToStringOptions): string {
    if (this.alias) {
      return this.alias;
    }
    if (options?.short) {
      return 'TIMESTAMPTZ';
    }
    return 'TIMESTAMP WITH TIME ZONE';
  }
  public static readonly instance = new DuckDBTimestampTZType();
  public static create(alias?: string): DuckDBTimestampTZType {
    return alias
      ? new DuckDBTimestampTZType(alias)
      : DuckDBTimestampTZType.instance;
  }
  // TODO: common DuckDBValues on type objects
  // public get epoch() {
  //   return DuckDBTimestampTZValue.Epoch;
  // }
  // public get max() {
  //   return DuckDBTimestampTZValue.Max;
  // }
  // public get min() {
  //   return DuckDBTimestampTZValue.Min;
  // }
  // public get posInf() {
  //   return DuckDBTimestampTZValue.PosInf;
  // }
  // public get negInf() {
  //   return DuckDBTimestampTZValue.NegInf;
  // }
}
export const TIMESTAMPTZ = DuckDBTimestampTZType.instance;

export class DuckDBAnyType extends BaseDuckDBType<DuckDBTypeId.ANY> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.ANY, alias);
  }
  public static readonly instance = new DuckDBAnyType();
  public static create(alias?: string): DuckDBAnyType {
    return alias ? new DuckDBAnyType(alias) : DuckDBAnyType.instance;
  }
}
export const ANY = DuckDBAnyType.instance;

export class DuckDBBigNumType extends BaseDuckDBType<DuckDBTypeId.BIGNUM> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.BIGNUM, alias);
  }
  public static readonly instance = new DuckDBBigNumType();
  public static create(alias?: string): DuckDBBigNumType {
    return alias ? new DuckDBBigNumType(alias) : DuckDBBigNumType.instance;
  }
  public static readonly Max: bigint =
    179769313486231570814527423731704356798070567525844996598917476803157260780028538760589558632766878171540458953514382464234321326889464182768467546703537516986049910576551282076245490090389328944075868508455133942304583236903222948165808559332123348274797826204144723168738177180919299881250404026184124858368n;
  public static readonly Min: bigint =
    -179769313486231570814527423731704356798070567525844996598917476803157260780028538760589558632766878171540458953514382464234321326889464182768467546703537516986049910576551282076245490090389328944075868508455133942304583236903222948165808559332123348274797826204144723168738177180919299881250404026184124858368n;
  public get max() {
    return DuckDBBigNumType.Max;
  }
  public get min() {
    return DuckDBBigNumType.Min;
  }
}
export const BIGNUM = DuckDBBigNumType.instance;

export class DuckDBSQLNullType extends BaseDuckDBType<DuckDBTypeId.SQLNULL> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.SQLNULL, alias);
  }
  public static readonly instance = new DuckDBSQLNullType();
  public static create(alias?: string): DuckDBSQLNullType {
    return alias ? new DuckDBSQLNullType(alias) : DuckDBSQLNullType.instance;
  }
}
export const SQLNULL = DuckDBSQLNullType.instance;

export class DuckDBStringLiteralType extends BaseDuckDBType<DuckDBTypeId.STRING_LITERAL> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.STRING_LITERAL, alias);
  }
  public static readonly instance = new DuckDBStringLiteralType();
  public static create(alias?: string): DuckDBStringLiteralType {
    return alias
      ? new DuckDBStringLiteralType(alias)
      : DuckDBStringLiteralType.instance;
  }
}
export const STRING_LITERAL = DuckDBStringLiteralType.instance;

export class DuckDBIntegerLiteralType extends BaseDuckDBType<DuckDBTypeId.INTEGER_LITERAL> {
  public constructor(alias?: string) {
    super(DuckDBTypeId.INTEGER_LITERAL, alias);
  }
  public static readonly instance = new DuckDBIntegerLiteralType();
  public static create(alias?: string): DuckDBIntegerLiteralType {
    return alias
      ? new DuckDBIntegerLiteralType(alias)
      : DuckDBIntegerLiteralType.instance;
  }
}
export const INTEGER_LITERAL = DuckDBIntegerLiteralType.instance;

export type DuckDBType =
  | DuckDBBooleanType
  | DuckDBTinyIntType
  | DuckDBSmallIntType
  | DuckDBIntegerType
  | DuckDBBigIntType
  | DuckDBUTinyIntType
  | DuckDBUSmallIntType
  | DuckDBUIntegerType
  | DuckDBUBigIntType
  | DuckDBFloatType
  | DuckDBDoubleType
  | DuckDBTimestampType
  | DuckDBDateType
  | DuckDBTimeType
  | DuckDBIntervalType
  | DuckDBHugeIntType
  | DuckDBUHugeIntType
  | DuckDBVarCharType
  | DuckDBBlobType
  | DuckDBDecimalType
  | DuckDBTimestampSecondsType
  | DuckDBTimestampMillisecondsType
  | DuckDBTimestampNanosecondsType
  | DuckDBEnumType
  | DuckDBListType
  | DuckDBStructType
  | DuckDBMapType
  | DuckDBArrayType
  | DuckDBUUIDType
  | DuckDBUnionType
  | DuckDBBitType
  | DuckDBTimeTZType
  | DuckDBTimestampTZType
  | DuckDBAnyType
  | DuckDBBigNumType
  | DuckDBSQLNullType
  | DuckDBStringLiteralType
  | DuckDBIntegerLiteralType;
