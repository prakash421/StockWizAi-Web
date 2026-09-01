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
  SectorRotationResponse,
  RecommendationStats,
  RecommendationItem,
  LearningsResponse,
  EnhancedTrendingResponse,
  DailyBriefResponse,
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

/**
 * Enhanced trending: joins the live trending scan with the last 14 days
 * of trending snapshots. When strongOnly is true (default) the backend
 * filters to STRONG BUY recommendations only; when false you get the
 * full result set decorated with trending_badge / trending_history.
 */
export async function scanTrendingEnhanced(
  strongOnly: boolean = true,
  limit: number = 10,
): Promise<EnhancedTrendingResponse> {
  const { data } = await api.get<EnhancedTrendingResponse>("/scan/trending/enhanced", {
    params: { strong_only: strongOnly, limit },
  });
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

export interface SingleScanProgress {
  scanned: number;
  total: number;
  /** User-facing phase label: "Queued", "Prefetching", "Scanning", "Reconnecting", "Done". */
  phase: string;
}

// Maps backend AsyncScanStatus.phase → user-facing label. Kept in sync
// with AsyncScanPoller.kt L285-291.
export function scanPhaseLabel(
  backendPhase: string | null | undefined,
  total: number,
): string {
  switch (backendPhase) {
    case "queued":
      return "Waiting for backend (another scan in progress)…";
    case "prefetching":
      return `Fetching market data for ${total} symbols…`;
    case "scanning":
    case null:
    case undefined:
      return "Scanning";
    default:
      return "Scanning";
  }
}

/**
 * Preferred path: single async scan job spanning the whole watchlist.
 * The backend `_engine_scan_lock` (main.py) serializes all scans, so
 * client-side fan-out only wastes wall clock. This mirrors the Android
 * MainActivity approach: send one `/scan/async` job with a comma-CSV of
 * every ticker, poll `/scan/status/{id}` with a tiered cadence, emit
 * partial results as they land, and fall back to synchronous `/scan`
 * only on hard failure.
 */
export async function scanWatchlistSingleAsync(
  tickers: string[],
  strategy: string | null | undefined,
  onResults: (results: ScanResultItem[]) => void,
  onProgress?: (p: SingleScanProgress) => void,
): Promise<ScanResultItem[]> {
  const total = tickers.length;
  const csv = tickers.join(",");
  onProgress?.({ scanned: 0, total, phase: "Queued" });

  let start: AsyncScanResponse;
  try {
    start = await scanAsyncStart(csv, strategy);
  } catch {
    // fallback: single sync call
    onProgress?.({ scanned: 0, total, phase: "Scanning (sync fallback)…" });
    const sync = await scanTickers(csv, strategy);
    onResults(sync);
    onProgress?.({ scanned: total, total, phase: "Done" });
    return sync;
  }

  const jobId = start.job_id;
  const jobTotal = start.total_tickers ?? total;
  const seen = new Set<string>();
  const combined: ScanResultItem[] = [];
  const emit = (items: ScanResultItem[]) => {
    let changed = false;
    for (const it of items) {
      if (!it || !it.ticker || seen.has(it.ticker)) continue;
      seen.add(it.ticker);
      combined.push(it);
      changed = true;
    }
    if (changed) onResults([...combined]);
  };

  let pollCount = 0;
  let consecutiveErrors = 0;
  const maxPolls = 400;
  const maxConsecutiveErrors = 8;
  while (pollCount < maxPolls) {
    const pollDelay = pollCount < 4 ? 500 : pollCount < 12 ? 1200 : 2500;
    await sleep(pollDelay);
    pollCount++;
    let body: AsyncScanStatus | ScanResultItem[];
    try {
      body = await getScanStatusRaw(jobId);
      consecutiveErrors = 0;
    } catch (e) {
      consecutiveErrors++;
      onProgress?.({
        scanned: 0,
        total: jobTotal,
        phase: `Reconnecting (${consecutiveErrors}/${maxConsecutiveErrors})…`,
      });
      if (consecutiveErrors >= maxConsecutiveErrors) {
        // hard fail — fall back to sync scan
        onProgress?.({ scanned: 0, total: jobTotal, phase: "Scanning (sync fallback)…" });
        const sync = await scanTickers(csv, strategy);
        emit(sync);
        onProgress?.({ scanned: jobTotal, total: jobTotal, phase: "Done" });
        return combined;
      }
      continue;
    }
    if (Array.isArray(body)) {
      emit(body);
      onProgress?.({ scanned: jobTotal, total: jobTotal, phase: "Done" });
      return combined;
    }
    const scanned = Math.min(body.tickers_scanned ?? 0, jobTotal);
    const phase = scanPhaseLabel(body.phase, jobTotal);
    if (body.results && body.results.length > 0) emit(body.results);
    onProgress?.({ scanned, total: jobTotal, phase });
    if (body.status === "complete") {
      onProgress?.({ scanned: jobTotal, total: jobTotal, phase: "Done" });
      return combined;
    }
    if (body.status === "failed") {
      throw new Error("Async scan failed");
    }
  }
  throw new Error("Async scan timed out");
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

// ── Sector rotation ────────────────────────────────────────────────
export async function getSectorRotation(
  period?: string | null
): Promise<SectorRotationResponse> {
  const params: Record<string, string> = {};
  if (period) params.period = period;
  const { data } = await api.get<SectorRotationResponse>("/sector-rotation", { params });
  return data;
}

// ── AI feedback / learnings ────────────────────────────────────────
export async function getRecommendationStats(): Promise<RecommendationStats> {
  const { data } = await api.get<RecommendationStats>("/recommendations/stats");
  return data;
}

export async function getRecommendationHistory(
  days = 90,
  limit = 200,
  ticker?: string | null
): Promise<RecommendationItem[]> {
  const params: Record<string, string | number> = { days, limit };
  if (ticker) params.ticker = ticker;
  const { data } = await api.get<RecommendationItem[] | { items?: RecommendationItem[] }>(
    "/recommendations/history",
    { params }
  );
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

export async function getLearnings(): Promise<LearningsResponse> {
  const { data } = await api.get<LearningsResponse>("/recommendations/learnings");
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

// ── Server-side watchlist (per-user; requires X-User-Id) ─────────────
export interface ServerWatchlist {
  tickers: string[];
  is_default?: boolean;
  count?: number;
}

export async function getServerWatchlist(userId: string): Promise<ServerWatchlist> {
  const { data } = await api.get<ServerWatchlist>("/watchlist", {
    headers: { "X-User-Id": userId },
  });
  return data;
}

export async function putServerWatchlist(
  userId: string,
  tickers: string[]
): Promise<ServerWatchlist> {
  const { data } = await api.put<ServerWatchlist>(
    "/watchlist",
    { tickers },
    { headers: { "X-User-Id": userId } }
  );
  return data;
}

// ── Cancel all in-flight scans (for a fresh manual scan) ─────────────
export interface CancelAllResponse {
  status: string;
  cancelled: string[];
  count: number;
}

export async function cancelAllScans(): Promise<CancelAllResponse> {
  const { data } = await api.post<CancelAllResponse>("/scan/cancel_all");
  return data;
}

// ── Portfolio edit (mirrors Android editPosition) ────────────────────
export async function editPosition(id: number, trade: TradeEntry): Promise<void> {
  await api.put(`/portfolio/update/${id}`, trade);
}

// ── Daily Brief (mirrors Android getDailyBrief) ──────────────────────
export async function getDailyBrief(
  userId?: string | null,
  includeTrending: boolean = true
): Promise<DailyBriefResponse> {
  const params: Record<string, string> = {
    include_trending: String(includeTrending),
  };
  if (userId) params.user_id = userId;
  const { data } = await api.get<DailyBriefResponse>("/daily-brief", { params });
  return data;
}

