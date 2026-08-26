// Verdict presentation + cross-validation gating for the AI Guru result
// card. Ported from MainActivity.kt's BacktestResultCard (L5921-5980)
// and the auto-trigger rules for AiCrossValidator.

export interface VerdictPresentation {
  displayVerdict: string;
  colorClass: string;    // Tailwind text color class
  bgClass: string;       // Tailwind bg tint for the header
  borderClass: string;
  subtitle: string;
}

const STOCK_STRATEGIES = new Set(["long_leaps"]);

export function isSellStrategy(strategy: string): boolean {
  const s = strategy.toLowerCase();
  return s === "csp" || s === "sell_call";
}

export function isStockStrategy(strategy: string): boolean {
  return STOCK_STRATEGIES.has(strategy.toLowerCase());
}

// Sell strategies invert the verdict: STRONG SELL = strong entry for
// the seller because the option is expected to expire OTM.
export function presentVerdict(
  rawVerdict: string,
  strategy: string
): VerdictPresentation {
  const v = (rawVerdict || "").toUpperCase().trim();
  const sell = isSellStrategy(strategy);
  if (sell) {
    switch (v) {
      case "STRONG SELL":
        return {
          displayVerdict: "STRONG ENTRY",
          colorClass: "text-green-900",
          bgClass: "bg-green-50",
          borderClass: "border-green-300",
          subtitle: "Backtest strongly supports selling this option",
        };
      case "SELL":
        return {
          displayVerdict: "ENTER TRADE",
          colorClass: "text-green-800",
          bgClass: "bg-green-50",
          borderClass: "border-green-200",
          subtitle: "Conditions support entering this position",
        };
      case "HOLD":
        return {
          displayVerdict: "WAIT",
          colorClass: "text-amber-800",
          bgClass: "bg-amber-50",
          borderClass: "border-amber-300",
          subtitle: "Setup is marginal — consider waiting for better conditions",
        };
      case "AVOID":
        return {
          displayVerdict: "SKIP",
          colorClass: "text-red-800",
          bgClass: "bg-red-50",
          borderClass: "border-red-300",
          subtitle: "Current conditions do not favour this trade",
        };
      default:
        return {
          displayVerdict: v || "—",
          colorClass: "text-gray-700",
          bgClass: "bg-gray-50",
          borderClass: "border-gray-300",
          subtitle: "",
        };
    }
  }
  switch (v) {
    case "STRONG BUY":
      return {
        displayVerdict: "STRONG BUY",
        colorClass: "text-green-900",
        bgClass: "bg-green-50",
        borderClass: "border-green-300",
        subtitle: "",
      };
    case "BUY":
      return {
        displayVerdict: "BUY",
        colorClass: "text-green-800",
        bgClass: "bg-green-50",
        borderClass: "border-green-200",
        subtitle: "",
      };
    case "SELL":
      return {
        displayVerdict: "SELL",
        colorClass: "text-red-800",
        bgClass: "bg-red-50",
        borderClass: "border-red-300",
        subtitle: "",
      };
    case "STRONG SELL":
      return {
        displayVerdict: "STRONG SELL",
        colorClass: "text-red-900",
        bgClass: "bg-red-50",
        borderClass: "border-red-400",
        subtitle: "",
      };
    case "HOLD":
      return {
        displayVerdict: "HOLD",
        colorClass: "text-amber-800",
        bgClass: "bg-amber-50",
        borderClass: "border-amber-300",
        subtitle: "",
      };
    default:
      return {
        displayVerdict: v || "—",
        colorClass: "text-gray-700",
        bgClass: "bg-gray-50",
        borderClass: "border-gray-300",
        subtitle: "",
      };
  }
}

export function confidenceLabel(confidence: string, strategy: string): string {
  const sell = isSellStrategy(strategy);
  switch ((confidence || "").trim()) {
    case "Very High":
      return sell ? "Very High Signal Confidence" : "Very High Confidence";
    case "High":
      return sell ? "High Signal Confidence" : "High Confidence";
    case "Medium":
      return sell ? "Mixed Signals" : "Medium Confidence";
    case "Low":
      return sell ? "Signals Mixed — see backtest score" : "Low Confidence";
    case "None":
      return sell ? "No Signals — use caution" : "No Confidence";
    default:
      return `${confidence} Confidence`;
  }
}

// Fire an AI cross-validation only when the raw verdict is a strong
// directional call — mirrors MainActivity's auto-trigger.
export function shouldAutoCrossValidate(rawVerdict: string): boolean {
  const v = (rawVerdict || "").toUpperCase().trim();
  return v === "STRONG BUY" || v === "STRONG SELL" || v === "SELL";
}

// Map the AI Guru dropdown label to (backend strategy, backend action).
// Kept here so the mapping is unit-testable.
export function toBacktestParams(
  uiStrategy: string
): { strategy: string; action: string } {
  switch (uiStrategy) {
    case "CSP":
      return { strategy: "csp", action: "sell" };
    case "Sell Call":
      return { strategy: "sell_call", action: "sell" };
    case "Vertical":
      return { strategy: "vertical", action: "buy" };
    case "Diagonal":
      return { strategy: "diagonal", action: "buy" };
    case "Long LEAPS":
      return { strategy: "long_leaps", action: "buy" };
    default:
      return { strategy: uiStrategy.toLowerCase().replace(/\s+/g, "_"), action: "buy" };
  }
}
