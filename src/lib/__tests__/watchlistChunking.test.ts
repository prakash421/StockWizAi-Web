import { chunkWatchlistForParallelScan } from "@/lib/watchlistChunking";

describe("chunkWatchlistForParallelScan", () => {
  test("emptyInput_returnsEmpty", () => {
    expect(chunkWatchlistForParallelScan([])).toEqual([]);
  });

  test("smallList_singleChunk", () => {
    const tickers = ["A", "B", "C", "D"];
    const chunks = chunkWatchlistForParallelScan(tickers);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual(tickers);
  });

  test("sixTickers_singleChunk", () => {
    const tickers = Array.from({ length: 6 }, (_, i) => `T${i + 1}`);
    const chunks = chunkWatchlistForParallelScan(tickers);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(6);
  });

  test("mediumList_splitsRespectingMinChunk", () => {
    const tickers = Array.from({ length: 12 }, (_, i) => `T${i + 1}`);
    const chunks = chunkWatchlistForParallelScan(tickers);
    expect(chunks).toHaveLength(3);
    expect(chunks.reduce((a, c) => a + c.length, 0)).toBe(12);
    chunks.forEach((c) => expect(c.length).toBeGreaterThanOrEqual(4));
  });

  test("largeList_capsAtMaxParallel", () => {
    const tickers = Array.from({ length: 60 }, (_, i) => `T${i + 1}`);
    const chunks = chunkWatchlistForParallelScan(tickers);
    expect(chunks).toHaveLength(6);
    chunks.forEach((c) => expect(c).toHaveLength(10));
  });

  test("unevenSplit_balancesWithinOne", () => {
    const tickers = Array.from({ length: 25 }, (_, i) => `T${i + 1}`);
    const chunks = chunkWatchlistForParallelScan(tickers);
    const sizes = chunks.map((c) => c.length);
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(25);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  test("preservesOrderAndPartitions", () => {
    const tickers = Array.from({ length: 40 }, (_, i) => `T${i + 1}`);
    const chunks = chunkWatchlistForParallelScan(tickers);
    expect(chunks.flat()).toEqual(tickers);
  });

  test("customMaxParallel_isHonored", () => {
    const tickers = Array.from({ length: 50 }, (_, i) => `T${i + 1}`);
    const chunks = chunkWatchlistForParallelScan(tickers, 3);
    expect(chunks).toHaveLength(3);
    expect(chunks.reduce((a, c) => a + c.length, 0)).toBe(50);
  });

  test("customMinChunk_preventsTinyJobs", () => {
    const tickers = Array.from({ length: 20 }, (_, i) => `T${i + 1}`);
    const chunks = chunkWatchlistForParallelScan(tickers, 6, 10);
    expect(chunks).toHaveLength(2);
    chunks.forEach((c) => expect(c.length).toBeGreaterThanOrEqual(10));
  });

  test("noEmptyChunks", () => {
    for (let n = 1; n <= 100; n++) {
      const tickers = Array.from({ length: n }, (_, i) => `T${i + 1}`);
      const chunks = chunkWatchlistForParallelScan(tickers);
      chunks.forEach((c) => expect(c.length).toBeGreaterThan(0));
      expect(chunks.reduce((a, c) => a + c.length, 0)).toBe(n);
    }
  });
});
