export const API_URL = "/proxy";

export const DEFAULT_WATCHLIST = [
  "ALAB", "PLTR", "CRWD", "SNOW", "TSLA", "NFLX", "ARM", "MSFT", "META", "NVDA",
  "MSTR", "SMCI", "APP", "SHOP", "AVGO", "SITM", "HOOD", "CRWV", "IREN", "RDDT",
  "AMZN", "TSM", "UBER", "COIN", "SNDK", "MU", "WDC", "STX", "BE", "NOW",
  "CRM", "ADBE", "VRT", "TEAM", "NBIS", "CRDO"
];

export const STRATEGY_OPTIONS = ["All", "CSPs", "PCSs", "Diagonals", "Verticals", "Long LEAPS"];

// AI Guru (backtest) intentionally does not include "Put Credit Spread" yet —
// the backtest endpoint needs verification for the PCS spread payload
// before we surface a two-leg form. Scan display of PCS is unaffected.
export const AI_GURU_STRATEGIES = ["CSP", "Sell Call", "Vertical", "Diagonal", "Long LEAPS"];
