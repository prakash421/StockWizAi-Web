/**
 * Client-side port of Android `LocalLearnings.derive` +
 * `extractSignals` + drill-down filter helpers (NewScreens.kt).
 *
 * Rationale: the backend `/recommendations/learnings` endpoint is not
 * deployed and returns 404. To keep the AI Learnings → Signals tab
 * actionable we derive an equivalent payload client-side from the rich
 * `/recommendations/history` array and the `/recommendations/stats`
 * summary. Also provides history filters for the drill-down UX
 * (tap a winning/losing signal or verdict card → see contributing recs).
 */

import type {
  LearningsResponse,
  OutcomeEntry,
  RecommendationItem,
  RecommendationStats,
  SignalStat,
} from "./types";

// ---------------------------------------------------------------------------
// Signal extraction — mirror of Kotlin extractSignals(rec) regex bucketing.
// ---------------------------------------------------------------------------
export function extractSignals(rec: RecommendationItem): string[] {
  const out: string[] = [];
  const summary = (rec.stock_summary ?? "").toLowerCase();

  const rsiMatch = summary.match(/rsi\s+(\d+)/);
  if (rsiMatch) {
    const rsi = parseInt(rsiMatch[1], 10);
    if (!Number.isNaN(rsi)) {
      if (rsi < 30) out.push("RSI <30 (oversold)");
      else if (rsi < 40) out.push("RSI 30-40");
      else if (rsi < 50) out.push("RSI 40-50");
      else if (rsi < 60) out.push("RSI 50-60");
      else if (rsi < 70) out.push("RSI 60-70");
      else out.push("RSI >=70 (overbought)");
    }
  }

  if (summary.includes("uptrend")) out.push("Trend: uptrend");
  else if (summary.includes("downtrend")) out.push("Trend: downtrend");
  else if (summary.includes("sideways")) out.push("Trend: sideways");

  const ddMatch = summary.match(/(\d+)%\s+off\s+high/);
  if (ddMatch) {
    const dd = parseInt(ddMatch[1], 10);
    if (!Number.isNaN(dd)) {
      if (dd < 5) out.push("Near 52w high (<5% off)");
      else if (dd < 15) out.push("5-15% off high");
      else if (dd < 30) out.push("15-30% off high");
      else out.push(">=30% off high");
    }
  }

  const breadthMatch = summary.match(/(\d+)\s+bullish\s+vs\s+(\d+)\s+bearish/);
  if (breadthMatch) {
    const bull = parseInt(breadthMatch[1], 10) || 0;
    const bear = parseInt(breadthMatch[2], 10) || 0;
    const breadth = bull - bear;
    if (breadth >= 5) out.push("Breadth >=+5");
    else if (breadth >= 0) out.push("Breadth 0..+5");
    else if (breadth >= -5) out.push("Breadth -5..0");
    else out.push("Breadth <=-5");
  }

  const md = rec.match_detail;
  if (md && typeof md === "object") {
    const btRaw = (md as Record<string, unknown>).bt;
    if (typeof btRaw === "string") {
      const pct = parseFloat(btRaw.replace("%", "").trim());
      if (!Number.isNaN(pct)) {
        if (pct >= 95) out.push("BT >=95%");
        else if (pct >= 90) out.push("BT 90-95%");
        else if (pct >= 80) out.push("BT 80-90%");
        else out.push("BT <80%");
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// derive — build a LearningsResponse from history + stats.
// ---------------------------------------------------------------------------
export function deriveLocalLearnings(
  history: RecommendationItem[],
  stats: RecommendationStats | null,
): LearningsResponse {
  // signal → strategy → [winning, losing, neutral]
  const tally = new Map<string, [number, number, number]>();
  const keyOf = (signal: string, strategy: string) => `${signal}\u0000${strategy}`;

  for (const rec of history) {
    const strategy = rec.strategy;
    if (!strategy) continue;
    const outcomes = rec.outcome_history;
    if (!outcomes || outcomes.length === 0) continue;
    const signals = extractSignals(rec);
    if (signals.length === 0) continue;
    for (const signal of signals) {
      const k = keyOf(signal, strategy);
      const arr = tally.get(k) ?? [0, 0, 0];
      for (const o of outcomes) {
        if (o.status === "winning") arr[0]++;
        else if (o.status === "losing") arr[1]++;
        else arr[2]++;
      }
      tally.set(k, arr);
    }
  }

  const signalStats: SignalStat[] = [];
  for (const [k, v] of tally.entries()) {
    const [win, lose, neu] = v;
    const total = win + lose + neu;
    const winRate = total > 0 ? (win * 100.0) / total : 0.0;
    const sep = k.indexOf("\u0000");
    const signal = k.substring(0, sep);
    const strategy = k.substring(sep + 1);
    signalStats.push({
      strategy,
      signal,
      winning: win,
      losing: lose,
      total,
      win_rate: winRate,
    });
  }
  const significant = signalStats.filter((s) => s.total >= 6);

  const topWinning = significant
    .filter((s) => s.win_rate >= 60.0)
    .sort((a, b) => b.win_rate - a.win_rate)
    .slice(0, 10);
  const topLosing = significant
    .filter((s) => s.win_rate < 50.0)
    .sort((a, b) => a.win_rate - b.win_rate)
    .slice(0, 10);

  const suggested: string[] = [];
  if (stats?.by_strategy) {
    for (const [strat, s] of Object.entries(stats.by_strategy)) {
      if (s.total >= 30 && s.win_rate < 50.0) {
        suggested.push(
          `Strategy '${strat.toUpperCase()}' has a ${s.win_rate.toFixed(1)}% win-rate over ${s.total} samples - raise its backtest / signal threshold.`,
        );
      }
    }
  }
  if (stats?.by_verdict) {
    const buy = stats.by_verdict["BUY"];
    const strong = stats.by_verdict["STRONG BUY"];
    if (
      buy &&
      strong &&
      buy.total >= 50 &&
      strong.total >= 50 &&
      strong.win_rate - buy.win_rate >= 10.0
    ) {
      suggested.push(
        `STRONG BUY beats BUY by ${(strong.win_rate - buy.win_rate).toFixed(0)} pts - consider only acting on STRONG BUY tier.`,
      );
    }
  }
  if (topLosing.length > 0) {
    const worst = topLosing[0];
    suggested.push(
      `Worst signal: '${worst.signal}' on ${(worst.strategy ?? "").toUpperCase()} (${worst.win_rate.toFixed(0)}% over ${worst.total} obs).`,
    );
  }
  if (topWinning.length > 0) {
    const best = topWinning[0];
    suggested.push(
      `Best signal: '${best.signal}' on ${(best.strategy ?? "").toUpperCase()} (${best.win_rate.toFixed(0)}% over ${best.total} obs).`,
    );
  }

  return {
    enabled: true,
    as_of: "Derived locally from history",
    verdict_baselines: null,
    top_winning_signals: topWinning,
    top_losing_signals: topLosing,
    suggested_adjustments: suggested,
  };
}

// ---------------------------------------------------------------------------
// Drill-down filters — mirrors Kotlin filterByStrategy / filterByVerdict /
// filterByStrategyAndVerdict / filterBySignal.
// ---------------------------------------------------------------------------
function normStrategy(s: string): string {
  return s.trim().toLowerCase().replace(/_/g, " ");
}

export function filterByStrategy(
  history: RecommendationItem[],
  strategyKey: string,
): RecommendationItem[] {
  const target = normStrategy(strategyKey);
  return history.filter(
    (r) => r.strategy != null && normStrategy(r.strategy) === target,
  );
}

export function filterByVerdict(
  history: RecommendationItem[],
  verdictKey: string,
): RecommendationItem[] {
  const target = verdictKey.trim().toLowerCase().replace(/_/g, " ");
  return history.filter((r) => {
    const v = r.verdict;
    if (!v) return false;
    return v.trim().toLowerCase().replace(/_/g, " ") === target;
  });
}

export function filterByStrategyAndVerdict(
  history: RecommendationItem[],
  strategyKey: string,
  verdictKey: string,
): RecommendationItem[] {
  return filterByVerdict(filterByStrategy(history, strategyKey), verdictKey);
}

export function filterBySignal(
  history: RecommendationItem[],
  strategyKey: string | null | undefined,
  signal: string,
): RecommendationItem[] {
  const scoped =
    strategyKey && strategyKey.length > 0
      ? filterByStrategy(history, strategyKey)
      : history;
  const target = signal.trim().toLowerCase();
  return scoped.filter((r) => {
    const sigs = extractSignals(r);
    return sigs.some((s) => s.toLowerCase() === target);
  });
}

// Re-export the OutcomeEntry type for consumers that only import from this
// module (keeps the drill-down modal decoupled from lib/types).
export type { OutcomeEntry };
