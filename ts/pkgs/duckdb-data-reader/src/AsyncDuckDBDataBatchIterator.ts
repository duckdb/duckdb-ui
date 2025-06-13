import { DuckDBData } from './DuckDBData.js';

export type DuckDBDataBatchIteratorResult = IteratorResult<
  DuckDBData,
  DuckDBData | undefined
>;

export type AsyncDuckDBDataBatchIterator = AsyncIterator<
  DuckDBData,
  DuckDBData | undefined
>;
