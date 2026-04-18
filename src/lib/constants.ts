export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://financestreamai-backend.onrender.com/api/v1";

export const DEFAULT_WATCHLIST = [
  "ALAB", "PLTR", "CRWD", "SNOW", "TSLA", "NFLX", "ARM", "MSFT", "META", "NVDA",
  "MSTR", "SMCI", "APP", "SHOP", "AVGO", "SITM", "HOOD", "CRWV", "IREN", "RDDT",
  "AMZN", "TSM", "UBER", "COIN", "SNDK", "MU", "WDC", "STX", "BE", "NOW",
  "CRM", "ADBE", "VRT", "TEAM", "NBIS", "CRDO"
];

export const STRATEGY_OPTIONS = ["All", "CSPs", "Diagonals", "Verticals", "Long LEAPS"];

export const AI_GURU_STRATEGIES = ["CSP", "Sell Call", "Vertical", "Diagonal", "Long LEAPS"];
