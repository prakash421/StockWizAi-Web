/**
 * Options-seller-aligned color semantics for RSI / Beta / IV.
 * Mirrors `metricBucket` and `metricColor` from MainActivity.kt:
 *   green  = favourable (healthy RSI, balanced beta, juicy/rich IV)
 *   blue   = caution / wait (oversold RSI, defensive beta, etc.)
 *   orange = elevated risk
 *   red    = high risk (overbought, very-high beta, thin IV premium)
 */

export type MetricKind = "RSI" | "BETA" | "IV";

export function metricBucket(kind: MetricKind, value: number): string {
  switch (kind) {
    case "RSI":
      if (value < 30) return "Oversold";
      if (value < 40) return "Cooling";
      if (value <= 60) return "Healthy";
      if (value <= 70) return "Climbing";
      return "Overbought";
    case "BETA":
      if (value < 0.7) return "Defensive";
      if (value <= 1.3) return "Balanced";
      if (value <= 2.0) return "High";
      return "Very High";
    case "IV":
      if (value < 25) return "Thin";
      if (value < 50) return "Modest";
      if (value <= 75) return "Juicy";
      return "Rich";
  }
}

export interface MetricStyle {
  /** Tailwind classes for chip background + text color. */
  className: string;
  /** Bucket label (also used as the "hint" word baked into the chip). */
  hint: string;
}

const GREEN = "bg-green-100 text-green-800";
const DEEP_GREEN = "bg-green-200 text-green-900";
const BLUE = "bg-blue-100 text-blue-800";
const ORANGE = "bg-orange-100 text-orange-800";
const RED = "bg-red-100 text-red-800";

export function metricColor(kind: MetricKind, value: number): MetricStyle {
  const bucket = metricBucket(kind, value);
  let className: string;
  switch (kind) {
    case "RSI":
      className =
        bucket === "Healthy" ? GREEN :
        bucket === "Climbing" ? ORANGE :
        bucket === "Overbought" ? RED :
        BLUE;
      break;
    case "BETA":
      className =
        bucket === "Balanced" ? GREEN :
        bucket === "High" ? ORANGE :
        bucket === "Very High" ? RED :
        BLUE;
      break;
    case "IV":
      className =
        bucket === "Rich" ? DEEP_GREEN :
        bucket === "Juicy" ? GREEN :
        bucket === "Modest" ? ORANGE :
        RED;
      break;
  }
  return { className, hint: bucket };
}
