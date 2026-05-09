/**
 * Recommendation bucket helpers. Mirrors Kotlin `recommendationBucket`,
 * `isBuyRated`, and `recommendationChipColor` from MainActivity.kt.
 */

export type RecommendationBucket =
  | "STRONG BUY"
  | "BUY"
  | "HOLD"
  | "SELL"
  | "AVOID"
  | "OTHER";

export const MAX_AUTO_AI_VALIDATIONS = 15;

export function recommendationBucket(
  recommendation: string | null | undefined,
  overall: string | null | undefined
): RecommendationBucket {
  const s = ((recommendation ?? "") + " " + (overall ?? "")).toUpperCase();
  if (!s.trim()) return "OTHER";
  if (s.includes("STRONG BUY") || (s.includes("STRONG") && s.includes("BUY"))) return "STRONG BUY";
  if (s.includes("AVOID")) return "AVOID";
  if (s.includes("STRONG SELL") || s.includes("SELL")) return "SELL";
  if (s.includes("HOLD") || s.includes("NEUTRAL") || s.includes("CAUTION")) return "HOLD";
  if (s.includes("BUY") || s.includes("OPPORTUNITY")) return "BUY";
  return "OTHER";
}

export function isBuyRated(
  recommendation: string | null | undefined,
  overall: string | null | undefined
): boolean {
  const bucket = recommendationBucket(recommendation, overall);
  return bucket === "STRONG BUY" || bucket === "BUY";
}

/**
 * Tailwind class for a filter-chip background. Mirrors the Color values
 * from `recommendationChipColor` in Kotlin (deep green / green / amber /
 * red / dark red / blue).
 */
export function recommendationChipClass(bucket: RecommendationBucket | "All"): string {
  switch (bucket) {
    case "STRONG BUY":
      return "bg-green-800 text-white";
    case "BUY":
      return "bg-green-600 text-white";
    case "HOLD":
      return "bg-amber-600 text-white";
    case "SELL":
      return "bg-red-700 text-white";
    case "AVOID":
      return "bg-red-900 text-white";
    default:
      return "bg-blue-700 text-white";
  }
}

export function recommendationInactiveClass(bucket: RecommendationBucket | "All"): string {
  switch (bucket) {
    case "STRONG BUY":
      return "bg-green-100 text-green-900 hover:bg-green-200";
    case "BUY":
      return "bg-green-50 text-green-800 hover:bg-green-100";
    case "HOLD":
      return "bg-amber-50 text-amber-800 hover:bg-amber-100";
    case "SELL":
      return "bg-red-50 text-red-800 hover:bg-red-100";
    case "AVOID":
      return "bg-red-100 text-red-900 hover:bg-red-200";
    default:
      return "bg-blue-50 text-blue-800 hover:bg-blue-100";
  }
}
