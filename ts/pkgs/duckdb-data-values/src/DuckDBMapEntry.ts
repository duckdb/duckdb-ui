import { DuckDBValue } from './DuckDBValue.js';

export interface DuckDBMapEntry {
  readonly key: DuckDBValue;
  readonly value: DuckDBValue;
}
