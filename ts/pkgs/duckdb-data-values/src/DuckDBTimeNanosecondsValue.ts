import { getDuckDBTimeStringFromNanosecondsInDay } from './conversion/dateTimeStringConversion.js';
import { Json } from './Json.js';
import { SpecialDuckDBValue } from './SpecialDuckDBValue.js';

export class DuckDBTimeNanosecondsValue extends SpecialDuckDBValue {
  public readonly nanoseconds: bigint;

  constructor(nanoseconds: bigint) {
    super();
    this.nanoseconds = nanoseconds;
  }

  public toDuckDBString(): string {
    return getDuckDBTimeStringFromNanosecondsInDay(this.nanoseconds);
  }

  public toSql(): string {
    return `TIME_NS '${this.toDuckDBString()}'`;
  }

  public toJson(): Json {
    return this.toDuckDBString();
  }
}
