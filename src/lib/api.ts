import axios from "axios";
import { API_URL } from "./constants";
import type { ScanResultItem, HealthResponse, BacktestRequest, BacktestResponse, TradeEntry } from "./types";

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
