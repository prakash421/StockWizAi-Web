import type {
  OutcomeEntry,
  RecommendationItem,
  RecommendationStats,
} from "@/lib/types";
import {
  deriveLocalLearnings,
  extractSignals,
  filterByStrategy,
  filterByStrategyAndVerdict,
  filterByVerdict,
  filterBySignal,
} from "@/lib/localLearnings";

function rec(
  overrides: Partial<RecommendationItem> & {
    outcomes?: Array<{ status: string; week?: number }>;
  } = {},
): RecommendationItem {
  const { outcomes, ...rest } = overrides;
  return {
    rec_id: rest.rec_id ?? "R1",
    ticker: rest.ticker ?? "AAPL",
    strategy: rest.strategy ?? "csp",
    verdict: rest.verdict ?? "STRONG BUY",
    stock_summary: rest.stock_summary ?? null,
    match_detail: rest.match_detail ?? null,
    outcome_history:
      (outcomes ?? []).map<OutcomeEntry>((o, i) => ({
        week: o.week ?? i + 1,
        status: o.status,
      })) ?? null,
    ...rest,
  };
}

describe("extractSignals", () => {
  it("buckets RSI + trend + drawdown + breadth + BT", () => {
    const r = rec({
      stock_summary:
        "RSI 27 with a solid uptrend, 3% off high, 8 bullish vs 2 bearish signals",
      match_detail: { bt: "92%" },
    });
    const sigs = extractSignals(r);
    expect(sigs).toContain("RSI <30 (oversold)");
    expect(sigs).toContain("Trend: uptrend");
    expect(sigs).toContain("Near 52w high (<5% off)");
    expect(sigs).toContain("Breadth >=+5");
    expect(sigs).toContain("BT 90-95%");
  });

  it("returns empty for empty summary and no match_detail", () => {
    expect(extractSignals(rec({ stock_summary: "" }))).toEqual([]);
  });

  it("buckets high-RSI overbought correctly", () => {
    expect(extractSignals(rec({ stock_summary: "rsi 78 downtrend" }))).toEqual(
      expect.arrayContaining(["RSI >=70 (overbought)", "Trend: downtrend"]),
    );
  });
});

describe("deriveLocalLearnings", () => {
  const history: RecommendationItem[] = [
    // Winning signal on CSP: RSI oversold + uptrend
    ...Array.from({ length: 4 }).map((_, i) =>
      rec({
        rec_id: `w${i}`,
        strategy: "csp",
        verdict: "STRONG BUY",
        stock_summary: "RSI 28 uptrend 2% off high",
        outcomes: [{ status: "winning" }, { status: "winning" }],
      }),
    ),
    // Losing signal on diagonal: overbought + downtrend
    ...Array.from({ length: 4 }).map((_, i) =>
      rec({
        rec_id: `l${i}`,
        strategy: "diagonal",
        verdict: "BUY",
        stock_summary: "RSI 82 downtrend 25% off high",
        outcomes: [{ status: "losing" }, { status: "losing" }],
      }),
    ),
  ];
  const stats: RecommendationStats = {
    enabled: true,
    horizon_days: 90,
    total_recommendations: 8,
    by_strategy: {
      diagonal: { winning: 0, losing: 8, neutral: 0, total: 30, win_rate: 20 },
    },
    by_verdict: {
      BUY: { winning: 20, losing: 30, neutral: 0, total: 50, win_rate: 40 },
      "STRONG BUY": {
        winning: 40,
        losing: 10,
        neutral: 0,
        total: 50,
        win_rate: 80,
      },
    },
  };

  it("classifies winning vs losing signals by 60/50 threshold", () => {
    const out = deriveLocalLearnings(history, stats);
    expect(out.enabled).toBe(true);
    expect(out.as_of).toBe("Derived locally from history");
    // Every extracted signal on CSP recs (all 100% winning) qualifies as top_winning
    expect(out.top_winning_signals?.length).toBeGreaterThan(0);
    expect(out.top_winning_signals?.every((s) => s.win_rate >= 60)).toBe(true);
    expect(out.top_losing_signals?.length).toBeGreaterThan(0);
    expect(out.top_losing_signals?.every((s) => s.win_rate < 50)).toBe(true);
  });

  it("requires >=6 total observations before a signal is significant", () => {
    // Two recs, each with 2 outcomes = 4 obs. Below threshold.
    const short: RecommendationItem[] = [
      rec({
        rec_id: "a",
        strategy: "csp",
        stock_summary: "RSI 25 uptrend",
        outcomes: [{ status: "winning" }, { status: "winning" }],
      }),
      rec({
        rec_id: "b",
        strategy: "csp",
        stock_summary: "RSI 25 uptrend",
        outcomes: [{ status: "winning" }, { status: "winning" }],
      }),
    ];
    const out = deriveLocalLearnings(short, null);
    expect(out.top_winning_signals ?? []).toHaveLength(0);
  });

  it("emits suggested adjustment when stats.by_strategy is >=30 samples and <50% win", () => {
    const out = deriveLocalLearnings(history, stats);
    expect(
      out.suggested_adjustments?.some((s) =>
        s.startsWith("Strategy 'DIAGONAL'"),
      ),
    ).toBe(true);
  });

  it("emits STRONG BUY vs BUY adjustment when gap >= 10pp on 50+ samples", () => {
    const out = deriveLocalLearnings(history, stats);
    expect(
      out.suggested_adjustments?.some((s) => s.includes("STRONG BUY beats BUY")),
    ).toBe(true);
  });

  it("emits best/worst signal callouts when available", () => {
    const out = deriveLocalLearnings(history, stats);
    const joined = (out.suggested_adjustments ?? []).join("\n");
    expect(joined).toMatch(/Best signal:/);
    expect(joined).toMatch(/Worst signal:/);
  });

  it("skips recs without strategy or without outcome_history", () => {
    const partial: RecommendationItem[] = [
      rec({ strategy: null, stock_summary: "RSI 25 uptrend", outcomes: [{ status: "winning" }] }),
      rec({ strategy: "csp", stock_summary: "RSI 25 uptrend", outcome_history: [] }),
    ];
    const out = deriveLocalLearnings(partial, null);
    expect(out.top_winning_signals ?? []).toHaveLength(0);
    expect(out.top_losing_signals ?? []).toHaveLength(0);
  });
});

describe("filter helpers", () => {
  const history: RecommendationItem[] = [
    rec({ rec_id: "1", strategy: "csp", verdict: "STRONG BUY", stock_summary: "RSI 27 uptrend" }),
    rec({ rec_id: "2", strategy: "CSP", verdict: "BUY", stock_summary: "RSI 55 sideways" }),
    rec({ rec_id: "3", strategy: "long_leaps", verdict: "STRONG BUY", stock_summary: "RSI 27 uptrend" }),
    rec({ rec_id: "4", strategy: "diagonal", verdict: null, stock_summary: "" }),
  ];

  it("filterByStrategy is case-insensitive and underscore-normalized", () => {
    expect(filterByStrategy(history, "CSP").map((r) => r.rec_id)).toEqual(["1", "2"]);
    expect(filterByStrategy(history, "long leaps").map((r) => r.rec_id)).toEqual(["3"]);
  });

  it("filterByVerdict matches ignoring case + underscores", () => {
    expect(filterByVerdict(history, "strong_buy").map((r) => r.rec_id)).toEqual(["1", "3"]);
  });

  it("filterByStrategyAndVerdict combines both", () => {
    expect(
      filterByStrategyAndVerdict(history, "csp", "STRONG BUY").map((r) => r.rec_id),
    ).toEqual(["1"]);
  });

  it("filterBySignal restricts to recs whose extractSignals contains the signal", () => {
    const rsiOversold = filterBySignal(history, null, "RSI <30 (oversold)");
    expect(rsiOversold.map((r) => r.rec_id).sort()).toEqual(["1", "3"]);
  });

  it("filterBySignal scoped by strategy narrows further", () => {
    const scoped = filterBySignal(history, "csp", "RSI <30 (oversold)");
    expect(scoped.map((r) => r.rec_id)).toEqual(["1"]);
  });
});
