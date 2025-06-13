import { DuckDBValue } from './DuckDBValue.js';

export interface DuckDBStructEntry {
  readonly key: string;
  readonly value: DuckDBValue;
}
