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

export interface ScanResultItem {
  ticker: string;
  price: number;
  rsi: number | null;
  beta: number | null;
  csps?: CspResult[] | null;
  diagonals?: DiagonalResult[] | null;
  verticals?: VerticalResult[] | null;
  long_leaps?: LongLeapsResult[] | null;
  iv_rank?: string | null;
  discount_from_high?: string | null;
  sma200?: number | null;
  overall?: string | null;
  stock_recommendation?: string | null;
  stock_summary?: string | null;
  bullish_signals?: string[] | null;
  bearish_signals?: string[] | null;
  levels?: StockLevels | null;
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
  strike: number;
  strike_sell?: number;
  expiry: string;
  expiry_sell?: string;
  premium: number;
  strategy: string;
  is_call: number;
  is_buy: number;
}

export interface BacktestResponse {
  win_rate?: string;
  avg_return?: string;
  max_loss?: string;
  recommendation?: string;
  summary?: string;
  details?: string;
}
