import axios from "axios";
import { API_URL } from "./constants";
import type {
  ScanResultItem,
  HealthResponse,
  BacktestRequest,
  BacktestResponse,
  TradeEntry,
  AsyncScanResponse,
  AsyncScanStatus,
} from "./types";
import { chunkWatchlistForParallelScan } from "./watchlistChunking";

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
  headers: { "Content-Type": "application/json" },
});

export async function scanTickers(
  tickers: string,
  strategy?: string | null,
  targetDelta?: number | null,
  minRoc?: number | null
): Promise<ScanResultItem[]> {
  const params: Record<string, string | number> = { tickers };
  if (strategy) params.strategy = strategy;
  if (targetDelta != null) params.target_delta = targetDelta;
  if (minRoc != null) params.min_roc = minRoc;
  const { data } = await api.get<ScanResultItem[]>("/scan", { params });
  return data;
}

export async function scanTrending(): Promise<ScanResultItem[]> {
  const { data } = await api.get<ScanResultItem[]>("/scan/trending");
  return data;
}

export async function scanAsyncStart(
  tickers: string,
  strategy?: string | null
): Promise<AsyncScanResponse> {
  const params: Record<string, string> = { tickers };
  if (strategy) params.strategy = strategy;
  const { data } = await api.get<AsyncScanResponse>("/scan/async", { params });
  return data;
}

export async function getScanStatusRaw(
  jobId: string
): Promise<AsyncScanStatus | ScanResultItem[]> {
  const { data } = await api.get<AsyncScanStatus | ScanResultItem[]>(
    `/scan/status/${encodeURIComponent(jobId)}`
  );
  return data;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Run an async scan job for one chunk and poll until results arrive.
 * Falls back to the synchronous /scan endpoint on any failure. Mirrors
 * the per-chunk worker in MainActivity.kt's "Scan Watchlist" button.
 */
export async function scanChunkAsync(
  chunk: string[],
  strategy: string | null | undefined,
  onProgress?: (scanned: number, chunkTotal: number) => void
): Promise<ScanResultItem[]> {
  try {
    const start = await scanAsyncStart(chunk.join(","), strategy);
    const chunkTotal = start.total_tickers ?? chunk.length;
    const jobId = start.job_id;
    let pollCount = 0;
    while (pollCount < 150) {
      const pollDelay = pollCount < 4 ? 400 : pollCount < 10 ? 900 : 1800;
      await sleep(pollDelay);
      pollCount++;
      const body = await getScanStatusRaw(jobId);
      if (Array.isArray(body)) {
        onProgress?.(chunkTotal, chunkTotal);
        return body;
      }
      onProgress?.(Math.min(body.tickers_scanned ?? 0, chunkTotal), chunkTotal);
      if (body.status === "complete" || body.status === "failed") break;
    }
    throw new Error("Async scan timed out");
  } catch {
    return scanTickers(chunk.join(","), strategy);
  }
}

export interface ParallelScanProgress {
  scanned: number;
  total: number;
  chunkCount: number;
}

/**
 * Split a watchlist into N balanced chunks and fan out concurrent async
 * scan jobs, merging results progressively as each chunk completes.
 */
export async function scanWatchlistParallel(
  tickers: string[],
  strategy: string | null | undefined,
  onResults: (results: ScanResultItem[]) => void,
  onProgress?: (p: ParallelScanProgress) => void
): Promise<ScanResultItem[]> {
  const chunks = chunkWatchlistForParallelScan(tickers);
  const total = tickers.length;
  const perChunkScanned = new Array<number>(chunks.length).fill(0);
  const seen = new Set<string>();
  const combined: ScanResultItem[] = [];

  onProgress?.({ scanned: 0, total, chunkCount: chunks.length });

  await Promise.all(
    chunks.map((chunk, idx) =>
      scanChunkAsync(chunk, strategy, (scanned) => {
        perChunkScanned[idx] = scanned;
        const done = perChunkScanned.reduce((a, b) => a + b, 0);
        onProgress?.({ scanned: done, total, chunkCount: chunks.length });
      })
        .then((results) => {
          const newOnes = results.filter((r) => {
            if (seen.has(r.ticker)) return false;
            seen.add(r.ticker);
            return true;
          });
          if (newOnes.length > 0) {
            combined.push(...newOnes);
            onResults([...combined]);
          }
          perChunkScanned[idx] = chunk.length;
          const done = perChunkScanned.reduce((a, b) => a + b, 0);
          onProgress?.({ scanned: done, total, chunkCount: chunks.length });
        })
        .catch(() => {
          // swallow — partial results from other chunks are still useful
        })
    )
  );

  return combined;
}

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>("/health");
  return data;
}

export async function getPositions(): Promise<HealthResponse> {
  try {
    const { data } = await api.get<HealthResponse>("/portfolio/positions");
    return data;
  } catch {
    return getHealth();
  }
}

export async function addPosition(trade: TradeEntry): Promise<{ id?: number }> {
  const { data } = await api.post("/portfolio/add", trade);
  return data;
}

export async function updatePosition(id: number, trade: TradeEntry): Promise<void> {
  await api.put(`/portfolio/update/${id}`, trade);
}

export async function closePosition(id: number, exitPrice: number, exitDate: string): Promise<void> {
  await api.post(`/portfolio/close/${id}`, { exit_price: exitPrice, exit_date: exitDate });
}

export async function removePosition(id: number): Promise<void> {
  await api.delete(`/portfolio/remove/${id}`);
}

export async function runBacktest(req: BacktestRequest): Promise<BacktestResponse> {
  const { data } = await api.post<BacktestResponse>("/backtest", req);
  return data;
}
