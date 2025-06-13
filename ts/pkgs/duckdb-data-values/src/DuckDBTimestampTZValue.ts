import { getDuckDBTimestampStringFromMicroseconds } from './conversion/dateTimeStringConversion.js';
import { DuckDBToStringOptions } from './DuckDBToStringOptions.js';
import { Json } from './Json.js';
import { SpecialDuckDBValue } from './SpecialDuckDBValue.js';

export class DuckDBTimestampTZValue extends SpecialDuckDBValue {
  public readonly microseconds: bigint;

  constructor(microseconds: bigint) {
    super();
    this.microseconds = microseconds;
  }

  public toDuckDBString(toStringOptions?: DuckDBToStringOptions): string {
    return getDuckDBTimestampStringFromMicroseconds(
      this.microseconds,
      toStringOptions?.timezoneOffsetInMinutes || 0,
    );
  }

  public toJson(): Json {
    return this.toDuckDBString();
  }
}
