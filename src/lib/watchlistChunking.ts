/**
 * Split a watchlist into balanced, order-preserving chunks for parallel
 * scanning. Mirrors the Kotlin `chunkWatchlistForParallelScan` so chunks
 * are at least `minChunk` long and the total number of chunks does not
 * exceed `maxParallel`.
 */
export function chunkWatchlistForParallelScan(
  tickers: string[],
  maxParallel: number = 6,
  minChunk: number = 4
): string[][] {
  if (tickers.length === 0) return [];
  if (tickers.length <= minChunk + 2) return [tickers.slice()];
  const target = Math.max(maxParallel, 1);
  const numChunks = Math.max(
    1,
    Math.min(target, Math.ceil(tickers.length / minChunk))
  );
  const baseSize = Math.floor(tickers.length / numChunks);
  const remainder = tickers.length % numChunks;
  const chunks: string[][] = [];
  let start = 0;
  for (let i = 0; i < numChunks; i++) {
    const take = baseSize + (i < remainder ? 1 : 0);
    chunks.push(tickers.slice(start, start + take));
    start += take;
  }
  return chunks;
}
