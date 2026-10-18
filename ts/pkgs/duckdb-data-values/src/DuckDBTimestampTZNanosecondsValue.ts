import { getDuckDBTimestampTZStringFromNanoseconds } from './conversion/dateTimeStringConversion.js';
import { DuckDBToStringOptions } from './DuckDBToStringOptions.js';
import { Json } from './Json.js';
import { SpecialDuckDBValue } from './SpecialDuckDBValue.js';

export class DuckDBTimestampTZNanosecondsValue extends SpecialDuckDBValue {
  public readonly nanoseconds: bigint;

  constructor(nanoseconds: bigint) {
    super();
    this.nanoseconds = nanoseconds;
  }

  public toDuckDBString(toStringOptions?: DuckDBToStringOptions): string {
    return getDuckDBTimestampTZStringFromNanoseconds(
      this.nanoseconds,
      toStringOptions?.timeZone || 'UTC',
    );
  }

  public toSql(toStringOptions?: DuckDBToStringOptions): string {
    return `TIMESTAMPTZ_NS '${this.toDuckDBString(toStringOptions)}'`;
  }

  public toJson(): Json {
    return this.toDuckDBString();
  }
}
