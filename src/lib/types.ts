// Types matching the Android/Kotlin data models

export interface CspResult {
  strike: number;
  premium: number;
  delta: string | null;
  roc: string | null;
  bt: string | null;
  expiry: string | null;
}

export interface DiagonalResult {
  long_leg?: string | null;
  long?: string | null;
  long_strike?: string | null;
  short_leg?: string | null;
  short?: string | null;
  short_strike?: string | null;
  net_debt: number;
  net_debit?: number;
  yield?: string | null;
  yield_ratio?: string | null;
  bt?: string | null;
  expiry?: string | null;
}

export interface VerticalResult {
  strikes: string | null;
  net_debit: number;
  bt: string | null;
  expiry: string | null;
}

export interface LongLeapsResult {
  expiry: string;
  strike: number;
  premium: number;
  leverage: string | null;
  intrinsic_buffer: string | null;
  bt: string | null;
}

// Put Credit Spread (bull put spread) — defined-risk bullish alternative to CSP.
// Mirrors PutCreditSpreadResult in MainActivity.kt.
export interface PutCreditSpreadResult {
  short_strike: number;
  long_strike: number;
  width?: number | null;
  credit: number;
  max_loss: number;
  capital?: number | null;
  delta?: number | null;
  bt: string | null;
  roc: string | null;
  roc_on_risk?: string | null;
  expiry?: string | null;
  stop_loss?: number | null;
  target?: number | null;
  risk_note?: string | null;
}

export interface StockLevels {
  atr?: number | null;
  support?: number | null;
  resistance?: number | null;
  swing_high_60d?: number | null;
  swing_low_60d?: number | null;
  high_52w?: number | null;
  stop_loss?: number | null;
  target?: number | null;
  risk_reward?: number | null;
  risk_note?: string | null;
}

// Analyst consensus block returned when Tradier / yfinance has data.
// Mirrors res["analyst_target"] shape in main.py ~line 1610.
export interface AnalystTarget {
  mean?: number | null;
  low?: number | null;
  high?: number | null;
  num_analysts?: number | null;
  upside_pct?: number | null;
  consensus?: string | null;
}

// Trending history block returned only by /scan/trending/enhanced.
// Mirrors r["trending_history"] shape in main.py ~line 4530.
export interface TrendingHistory {
  appearances: number;
  consecutive_days: number;
}

export interface EnhancedTrendingResponse {
  results: ScanResultItem[];
  trending_tickers: string[];
  history_window_days?: number;
  snapshot_taken?: boolean;
}

export interface ScanResultItem {
  ticker: string;
  price: number;
  rsi: number | null;
  beta: number | null;
  csps?: CspResult[] | null;
  diagonals?: DiagonalResult[] | null;
  verticals?: VerticalResult[] | null;
  long_leaps?: LongLeapsResult[] | null;
  put_credit_spreads?: PutCreditSpreadResult[] | null;
  iv_rank?: string | null;
  discount_from_high?: string | null;
  sma200?: number | null;
  overall?: string | null;
  stock_recommendation?: string | null;
  stock_summary?: string | null;
  bullish_signals?: string[] | null;
  bearish_signals?: string[] | null;
  levels?: StockLevels | null;
  // Phase-2 additive fields (all optional, tolerate legacy backends).
  company_name?: string | null;
  sector?: string | null;
  daily_change_pct?: number | null;
  next_earnings_date?: string | null;
  analyst_target?: AnalystTarget | null;
  // Phase-3 additive fields (only populated by /scan/trending/enhanced).
  trending_badge?: string | null;
  trending_history?: TrendingHistory | null;
}

export interface ActivePosition {
  id?: number | null;
  ticker: string;
  strategy: string;
  contracts: number;
  strike: number;
  expiry: string;
  entry_premium: number;
}

export interface ClosedPosition {
  id?: number | null;
  ticker: string;
  strategy: string;
  contracts: number;
  strike: number;
  expiry: string;
  entry_premium: number;
  exit_price?: number;
  exit_date?: string;
}

export interface CapitalHealth {
  committed: number;
}

export interface PerformanceMetrics {
  monthly_realized: number;
  monthly_goal_progress: string;
}

export interface HealthResponse {
  status: string;
  capital_health?: CapitalHealth;
  performance?: PerformanceMetrics;
  active_positions: ActivePosition[];
  closed_positions?: ClosedPosition[];
}

export interface TradeEntry {
  ticker: string;
  strike: number;
  strike_sell?: number;
  expiry: string;
  expiry_sell?: string;
  trigger_price: number;
  entry_premium: number;
  exit_price?: number;
  exit_date?: string;
  contracts: number;
  strategy: string;
  is_call: number;
  is_buy: number;
}

export interface BacktestRequest {
  ticker: string;
  strategy: string;              // "csp" | "sell_call" | "vertical" | "diagonal" | "long_leaps"
  action: string;                // "buy" | "sell"
  strike?: number | null;
  strike_sell?: number | null;
  expiry?: string | null;
  expiry_sell?: string | null;
  premium?: number | null;
}

export interface BacktestLearning {
  enabled?: boolean;
  applied?: boolean;
  original_verdict?: string | null;
  adjusted_verdict?: string | null;
  adjustment_reason?: string | null;
}

export interface BacktestResponse {
  verdict: string;               // STRONG BUY | BUY | HOLD | AVOID | SELL | STRONG SELL | INCONCLUSIVE
  confidence: string;            // Very High | High | Medium | Low | None
  summary: string;
  backtest_score?: string | null;
  price?: number | null;
  rsi?: number | null;
  signals?: string[] | null;
  warnings?: string[] | null;
  levels?: StockLevels | null;
  learning?: BacktestLearning | null;
}

// Async scan models — mirror AsyncScanResponse / AsyncScanStatus on Android
export interface AsyncScanResponse {
  status: string;
  job_id: string;
  total_tickers?: number;
  strong_only?: boolean;
  poll_url?: string;
  tickers?: string[];
}

export interface AsyncScanStatus {
  status: string;
  progress?: string;
  tickers_scanned?: number;
  total_tickers?: number;
  phase?: string | null;
  results?: ScanResultItem[] | null;
}

// ── Sector rotation (mirrors SectorRotationResponse on Android) ──────
export interface SectorMultiWindow {
  r1w?: number | null;
  r2w?: number | null;
  r4w?: number | null;
  accel_1v4?: number | null;
  accel_2v4?: number | null;
}

export interface EarlyRotator {
  sector: string;
  direction: string; // "early_in" | "early_out"
  r1w?: number | null;
  r4w?: number | null;
}

export interface SectorData {
  sector: string;
  etf: string;
  return_period: number;
  return_recent: number;
  volume_change_pct: number;
  money_flow: string; // "inflow" | "outflow" | "neutral"
  acceleration: number;
  rank: number;
  early_signal?: string | null;
  multi_window?: SectorMultiWindow | null;
}

export interface SectorRotationResponse {
  sectors: SectorData[];
  rotation_signals?: string[] | null;
  period?: string | null;
  top_sectors?: string[] | null;
  bottom_sectors?: string[] | null;
  early_rotators?: EarlyRotator[] | null;
}

// ── AI feedback loop / Learnings (mirrors NewScreens.kt) ─────────────
export interface OutcomeEntry {
  week: number;
  status: string; // "winning" | "losing" | "neutral"
  price_change_pct?: number | null;
  eval_at?: string | null;
}

export interface RecommendationItem {
  rec_id: string;
  source?: string | null;
  ticker: string;
  strategy?: string | null;
  action?: string | null;
  entry_price?: number | null;
  verdict?: string | null;
  strike?: number | null;
  created_at?: string | null;
  scan_date?: string | null;
  closed?: boolean;
  eval_count?: number | null;
  final_status?: string | null;
  outcome_history?: OutcomeEntry[] | null;
  stock_summary?: string | null;
  match_detail?: Record<string, unknown> | null;
}

export interface StrategyStats {
  winning: number;
  losing: number;
  neutral: number;
  total: number;
  win_rate: number;
}

export interface RecommendationStats {
  enabled?: boolean;
  horizon_days?: number | null;
  total_recommendations?: number | null;
  by_strategy?: Record<string, StrategyStats> | null;
  by_verdict?: Record<string, StrategyStats> | null;
}

export interface VerdictBaseline {
  strategy: string;
  verdict: string;
  winning: number;
  total: number;
  win_rate: number;
}

export interface SignalStat {
  strategy?: string | null;
  signal: string;
  winning?: number;
  losing?: number;
  total: number;
  win_rate: number;
}

export interface LearningsResponse {
  enabled?: boolean;
  as_of?: string | null;
  verdict_baselines?: VerdictBaseline[] | null;
  top_winning_signals?: SignalStat[] | null;
  top_losing_signals?: SignalStat[] | null;
  suggested_adjustments?: string[] | null;
}
