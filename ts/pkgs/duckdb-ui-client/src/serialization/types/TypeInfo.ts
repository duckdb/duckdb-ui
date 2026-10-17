/** A scalar DuckDB Value, as found in type modifiers and properties. */
export type ScalarValue = null | boolean | number | string;

export interface TypeModifier {
  value: ScalarValue;
  /** Empty if the modifier has no label. */
  label: string;
}

/** Type modifiers and properties of a type, typically one defined by an extension. */
export interface ExtensionTypeInfo {
  modifiers: TypeModifier[];
  properties: Record<string, ScalarValue>;
}

export interface BaseTypeInfo {
  alias?: string;
  modifiers?: unknown[]; // TODO
  extensionInfo?: ExtensionTypeInfo;
}

export interface GenericTypeInfo extends BaseTypeInfo {
  kind: 'generic';
}

export interface DecimalTypeInfo extends BaseTypeInfo {
  kind: 'decimal';
  width: number;
  scale: number;
}

export interface StringTypeInfo extends BaseTypeInfo {
  kind: 'string';
  /** Empty if the string type has no explicit collation. */
  collation: string;
}

export interface ListTypeInfo extends BaseTypeInfo {
  kind: 'list';
  childType: TypeIdAndInfo;
}

export interface StructTypeInfo extends BaseTypeInfo {
  kind: 'struct';
  childTypes: [string, TypeIdAndInfo][];
}

export interface EnumTypeInfo extends BaseTypeInfo {
  kind: 'enum';
  valuesCount: number;
  values: string[];
}

export interface ArrayTypeInfo extends BaseTypeInfo {
  kind: 'array';
  childType: TypeIdAndInfo;
  size: number;
}

export interface GeoTypeInfo extends BaseTypeInfo {
  kind: 'geo';
  /** The coordinate reference system definition, e.g. 'OGC:CRS84'. Empty if none. */
  crs: string;
}

/** See https://github.com/duckdb/duckdb/blob/main/src/include/duckdb/common/extra_type_info.hpp */
export type TypeInfo =
  | GenericTypeInfo
  | DecimalTypeInfo
  | StringTypeInfo
  | ListTypeInfo
  | StructTypeInfo
  | EnumTypeInfo
  | ArrayTypeInfo
  | GeoTypeInfo;

export interface TypeIdAndInfo {
  /** LogicalTypeId */
  id: number;

  /** Extra info for some types. */
  typeInfo?: TypeInfo;
}
