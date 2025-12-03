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
  DuckDBMapType,
  DuckDBStructType,
  DuckDBType,
  DuckDBUnionType,
  ENUM,
  FLOAT,
  HUGEINT,
  INTEGER,
  INTERVAL,
  LIST,
  MAP,
  SMALLINT,
  SQLNULL,
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
} from './DuckDBType.js';
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
} from './extensionTypes.js';

const simpleTypeMap: Record<string, DuckDBType> = {
  BIGINT: BIGINT,
  BIGNUM: BIGNUM,
  BIT: BIT,
  BOOLEAN: BOOLEAN,
  BLOB: BLOB,
  BOX_2D: BOX_2D,
  BOX_2DF: BOX_2DF,
  DATE: DATE,
  DOUBLE: DOUBLE,
  FLOAT: FLOAT,
  GEOMETRY: GEOMETRY,
  HUGEINT: HUGEINT,
  INET: INET,
  INTEGER: INTEGER,
  INTERVAL: INTERVAL,
  JSON: JSONType,
  LINESTRING_2D: LINESTRING_2D,
  POINT_2D: POINT_2D,
  POINT_3D: POINT_3D,
  POINT_4D: POINT_4D,
  POLYGON_2D: POLYGON_2D,
  SMALLINT: SMALLINT,
  SQLNULL: SQLNULL,
  TIME: TIME,
  'TIME WITH TIME ZONE': TIMETZ,
  TIMESTAMP: TIMESTAMP,
  'TIMESTAMP WITH TIME ZONE': TIMESTAMPTZ,
  TIMESTAMP_S: TIMESTAMP_S,
  TIMESTAMP_MS: TIMESTAMP_MS,
  TIMESTAMP_NS: TIMESTAMP_NS,
  TINYINT: TINYINT,
  UBIGINT: UBIGINT,
  UHUGEINT: UHUGEINT,
  UINTEGER: UINTEGER,
  USMALLINT: USMALLINT,
  UTINYINT: UTINYINT,
  UUID: UUID,
  VARCHAR: VARCHAR,
  WKB_BLOB: WKB_BLOB,
};

function matchStructMapOrUnion(
  typeString: string,
): DuckDBStructType | DuckDBMapType | DuckDBUnionType | undefined {
  typeString = typeString.trim();

  const fields = parseStructLike(typeString);
  if (!fields) {
    return undefined;
  }

  if (typeString.startsWith('STRUCT')) {
    const entries: Record<string, DuckDBType> = {};
    for (const field of fields) {
      if (field.key && field.type) {
        entries[field.key] = field.type;
      }
    }
    return STRUCT(entries);
  }
  if (typeString.startsWith('MAP')) {
    const keyType = fields[0]?.type;
    const valueType = fields[1]?.type;
    if (keyType && valueType) {
      return MAP(keyType, valueType);
    }
  }
  if (typeString.startsWith('UNION')) {
    const members: Record<string, DuckDBType> = {};
    for (const field of fields) {
      if (field.key && field.type) {
        members[field.key] = field.type;
      }
    }
    return UNION(members);
  }
  return undefined;
}

function parseStructLike(typeString: string): ParsedField[] | undefined {
  const structPattern = /^(STRUCT|MAP|UNION)\s*\((.*)\)$/;
  const match = structPattern.exec(typeString);
  if (!match) {
    return undefined;
  }

  const fieldsString = match[2];
  return parseFields(fieldsString);
}

/** Parse the fields substring. We do this by counting parens and double quotes.
 * When checking for double-quotes, we only need to count an even number of them
 * to count brackets, since in cases where there escaped double quotes inside
 * a double-quoted string, the double quotes appear adjacent to each other,
 * always incrementing the count by 2 before there could theoretically be another
 * paren.
 */
function parseFields(fieldsString: string): ParsedField[] {
  const fields: ParsedField[] = [];
  let currentFieldStartIndex: number | null = null;
  let parenCount = 0;
  let quoteCount = 0;

  for (let i = 0; i < fieldsString.length; i++) {
    const char = fieldsString[i];

    if (
      currentFieldStartIndex === null &&
      char !== '(' &&
      char !== ')' &&
      char !== ','
    ) {
      currentFieldStartIndex = i;
    }

    if (char === '"') {
      quoteCount++;
    }

    if (
      char === ',' &&
      parenCount === 0 &&
      quoteCount % 2 === 0 &&
      currentFieldStartIndex !== null
    ) {
      const field = fieldsString.slice(currentFieldStartIndex, i);
      fields.push(parseField(field.trim()));
      currentFieldStartIndex = null;
    } else {
      if (char === '(' && quoteCount % 2 === 0) parenCount++;
      if (char === ')' && quoteCount % 2 === 0) parenCount--;
    }
  }

  if (currentFieldStartIndex !== null) {
    const lastField = fieldsString.slice(currentFieldStartIndex);
    fields.push(parseField(lastField.trim()));
  }
  return fields;
}

interface ParsedField {
  key?: string;
  type?: DuckDBType;
}

function parseField(fieldString: string): ParsedField {
  const fieldPattern = /^(".*?"|\w+)\s+(.+)$/;
  const match = fieldPattern.exec(fieldString);
  if (match) {
    const key = match[1];
    const type = parseLogicalTypeString(match[2].trim());
    return { key, type };
  } else {
    const type = parseLogicalTypeString(fieldString);
    return { type };
  }
}

function matchDecimal(typeString: string) {
  const match = typeString.match(/^DECIMAL\((\d+),(\d+)\)$/);
  if (match) {
    return DECIMAL(Number(match[1]), Number(match[2]));
  }
  return undefined;
}

function matchEnum(typeString: string) {
  const match = /ENUM\(([^)]*)\)/i.exec(typeString);
  if (match) {
    const matches = match[1].matchAll(/'((?:[^']|'')*)'/g);
    const values: string[] = [];
    for (const match of matches) {
      values.push(match[1].replace(/''/, `'`));
    }
    return ENUM(values);
  }
  return undefined;
}

function matchList(typeString: string) {
  if (typeString.endsWith('[]')) {
    const innerType = typeString.slice(0, -2);
    return LIST(parseLogicalTypeString(innerType));
  }
  return undefined;
}

function matchArray(typeString: string) {
  const match = typeString.match(/\[(\d+)\]$/);
  if (match) {
    const innerType = typeString.slice(0, -match[0].length);
    const length = match[1];
    return ARRAY(parseLogicalTypeString(innerType), Number(length));
  }
  return undefined;
}

export function parseLogicalTypeString(typeString: string): DuckDBType {
  if (typeString in simpleTypeMap) {
    return simpleTypeMap[typeString];
  }

  const listType = matchList(typeString);
  if (listType) {
    return listType;
  }

  const arrayType = matchArray(typeString);
  if (arrayType) {
    return arrayType;
  }

  const decimalType = matchDecimal(typeString);
  if (decimalType) {
    return decimalType;
  }

  const enumType = matchEnum(typeString);
  if (enumType) {
    return enumType;
  }

  const structMapOrUnionType = matchStructMapOrUnion(typeString);
  if (structMapOrUnionType) {
    return structMapOrUnionType;
  }

  throw Error(`unimplemented type match: ${typeString}`);
}
