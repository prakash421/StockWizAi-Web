/**
 * Helpers for AI cross-validation responses. TypeScript port of
 * `sanitizeReasoning`, `extractFirstJsonObject`, and `pickHighlightReasoning`
 * from AiCrossValidator.kt.
 */

export interface AiEngineResult {
  engine: string;
  verdict: string;     // BUY / SELL / HOLD / AVOID / N/A
  confidence: string;  // High / Medium / Low / N/A
  reasoning: string;
  error?: string | null;
}

export interface AiCrossValidation {
  ticker: string;
  engines: AiEngineResult[];
  consensus: string;     // STRONG BUY / BUY / HOLD / AVOID / MIXED / UNAVAILABLE
  agreementPct: number;
  summary: string;
  timestamp?: number;
}

/**
 * Locate the first balanced JSON object in [text] that contains a
 * "verdict" key. Quote- and escape-aware so commas / braces inside the
 * reasoning string don't truncate it.
 */
export function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        const candidate = text.substring(start, i + 1);
        return candidate.includes("verdict") ? candidate : null;
      }
    }
  }
  return null;
}

/**
 * Strip JSON / markdown / quoting artifacts from a free-form reasoning
 * string so it renders as clean prose.
 */
export function sanitizeReasoning(raw: string): string {
  if (!raw || !raw.trim()) return "";
  let s = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences.
  if (s.startsWith("```json")) s = s.substring("```json".length);
  else if (s.startsWith("```")) s = s.substring(3);
  if (s.endsWith("```")) s = s.substring(0, s.length - 3);
  s = s.trim();
  // If still a JSON payload, pull the reasoning field out of it.
  if (s.startsWith("{") && s.includes('"reasoning"')) {
    const m = s.match(/"reasoning"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (m && m[1]) {
      s = m[1].replace(/\\"/g, '"').replace(/\\n/g, " ");
    }
  }
  // Strip stray surrounding braces / quotes.
  s = s.trim().replace(/^[{}]+|[{}]+$/g, "").trim().replace(/^"+|"+$/g, "").trim();
  // Collapse whitespace.
  s = s.replace(/\s+/g, " ");
  return s.length > 400 ? s.substring(0, 397) + "…" : s;
}

/**
 * Pick the single best engine result to surface as the headline "Why?"
 * reasoning. Preference: engine matching consensus (highest confidence)
 * → any engine with reasoning (highest confidence) → null.
 */
export function pickHighlightReasoning(
  validation: AiCrossValidation
): AiEngineResult | null {
  const withReasoning = validation.engines.filter(
    (e) => !e.error && e.reasoning.trim().length > 0
  );
  if (withReasoning.length === 0) return null;
  const rank = (c: string) => {
    switch (c.toUpperCase()) {
      case "HIGH": return 3;
      case "MEDIUM": return 2;
      case "LOW": return 1;
      default: return 0;
    }
  };
  const consensusVerdict = validation.consensus
    .toUpperCase()
    .replace(/^STRONG\s+/, "")
    .trim();
  const matching = withReasoning.filter(
    (e) => e.verdict.toUpperCase() === consensusVerdict
  );
  const pool = matching.length > 0 ? matching : withReasoning;
  return pool.reduce<AiEngineResult | null>((best, e) => {
    if (!best) return e;
    return rank(e.confidence) > rank(best.confidence) ? e : best;
  }, null);
}
