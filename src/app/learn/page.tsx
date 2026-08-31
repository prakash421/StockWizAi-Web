"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle, GraduationCap, Trophy, AlertCircle, Lightbulb, X } from "lucide-react";
import {
  getRecommendationStats,
  getRecommendationHistory,
  getLearnings,
} from "@/lib/api";
import type {
  RecommendationStats,
  RecommendationItem,
  LearningsResponse,
  StrategyStats,
  SignalStat,
  OutcomeEntry,
} from "@/lib/types";
import {
  deriveLocalLearnings,
  filterByStrategy,
  filterByStrategyAndVerdict,
  filterByVerdict,
  filterBySignal,
} from "@/lib/localLearnings";

type Tab = "stats" | "signals" | "history";

type DrillDown = {
  title: string;
  subtitle?: string;
  items: RecommendationItem[];
};

function winColor(pct: number): string {
  if (pct >= 70) return "text-emerald-700 bg-emerald-50";
  if (pct >= 50) return "text-amber-700 bg-amber-50";
  return "text-rose-700 bg-rose-50";
}

function WinRateCard({
  label,
  s,
  onClick,
}: {
  label: string;
  s: { winning: number; losing: number; total: number; win_rate: number };
  onClick?: () => void;
}) {
  const cls = winColor(s.win_rate);
  const clickable = typeof onClick === "function";
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2 ${
        clickable ? "cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 transition" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{label}</p>
        <p className="text-xs text-gray-500">
          {s.winning} W / {s.losing} L / {s.total} total
        </p>
      </div>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${cls}`}>
        {s.win_rate.toFixed(1)}%
      </span>
    </div>
  );
}

function StatsTab({
  stats,
  history,
  onDrill,
}: {
  stats: RecommendationStats | null;
  history: RecommendationItem[];
  onDrill: (d: DrillDown) => void;
}) {
  if (!stats) {
    return <p className="text-sm text-gray-500 text-center py-8">No stats available yet</p>;
  }
  const byStrategy = stats.by_strategy
    ? Object.entries(stats.by_strategy).sort((a, b) => b[1].win_rate - a[1].win_rate)
    : [];
  const byVerdict = stats.by_verdict
    ? Object.entries(stats.by_verdict).sort((a, b) => b[1].win_rate - a[1].win_rate)
    : [];

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <p className="text-xs text-indigo-700 uppercase font-semibold tracking-wide">
          Total Recommendations
        </p>
        <p className="text-3xl font-bold text-indigo-900">
          {stats.total_recommendations ?? 0}
        </p>
        <p className="text-xs text-indigo-700/80">
          Last {stats.horizon_days ?? 90} days
        </p>
      </div>

      {byStrategy.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-2">Win Rate by Strategy</h2>
          <p className="text-[11px] text-gray-500 mb-2">Tap a row to see contributing recommendations.</p>
          <div className="space-y-2">
            {byStrategy.map(([k, s]: [string, StrategyStats]) => (
              <WinRateCard
                key={k}
                label={k.toUpperCase()}
                s={s}
                onClick={() =>
                  onDrill({
                    title: `Strategy · ${k.toUpperCase()}`,
                    subtitle: `${s.win_rate.toFixed(1)}% win-rate over ${s.total} recs`,
                    items: filterByStrategy(history, k),
                  })
                }
              />
            ))}
          </div>
        </section>
      )}

      {byVerdict.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-2">Win Rate by Verdict</h2>
          <p className="text-[11px] text-gray-500 mb-2">Tap a row to see contributing recommendations.</p>
          <div className="space-y-2">
            {byVerdict.map(([k, s]: [string, StrategyStats]) => (
              <WinRateCard
                key={k}
                label={k}
                s={s}
                onClick={() =>
                  onDrill({
                    title: `Verdict · ${k}`,
                    subtitle: `${s.win_rate.toFixed(1)}% win-rate over ${s.total} recs`,
                    items: filterByVerdict(history, k),
                  })
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SignalRow({
  sig,
  variant,
  onClick,
}: {
  sig: SignalStat;
  variant: "win" | "lose";
  onClick?: () => void;
}) {
  const accent =
    variant === "win"
      ? "bg-emerald-50 border-emerald-100 text-emerald-700"
      : "bg-rose-50 border-rose-100 text-rose-700";
  const clickable = typeof onClick === "function";
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`flex items-center justify-between border rounded-md px-3 py-2 ${accent} ${
        clickable ? "cursor-pointer hover:brightness-95 transition" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-800 truncate">{sig.signal}</p>
        {sig.strategy && (
          <p className="text-[10px] uppercase text-gray-500">{sig.strategy}</p>
        )}
      </div>
      <span className="text-xs font-bold whitespace-nowrap">
        {sig.win_rate.toFixed(0)}% ({sig.total})
      </span>
    </div>
  );
}

function SignalsTab({
  learnings,
  history,
  onDrill,
}: {
  learnings: LearningsResponse | null;
  history: RecommendationItem[];
  onDrill: (d: DrillDown) => void;
}) {
  if (!learnings) {
    return <p className="text-sm text-gray-500 text-center py-8">No learnings yet</p>;
  }
  return (
    <div className="space-y-5">
      {learnings.verdict_baselines && learnings.verdict_baselines.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-2">Verdict Performance</h2>
          <p className="text-[11px] text-gray-500 mb-2">Tap a row to see contributing recommendations.</p>
          <div className="space-y-2">
            {learnings.verdict_baselines.map((vb) => (
              <WinRateCard
                key={`${vb.strategy}-${vb.verdict}`}
                label={`${vb.strategy.toUpperCase()} / ${vb.verdict}`}
                s={{
                  winning: vb.winning,
                  losing: vb.total - vb.winning,
                  total: vb.total,
                  win_rate: vb.win_rate,
                }}
                onClick={() =>
                  onDrill({
                    title: `${vb.strategy.toUpperCase()} · ${vb.verdict}`,
                    subtitle: `${vb.win_rate.toFixed(1)}% win-rate over ${vb.total} recs`,
                    items: filterByStrategyAndVerdict(history, vb.strategy, vb.verdict),
                  })
                }
              />
            ))}
          </div>
        </section>
      )}

      {learnings.top_winning_signals && learnings.top_winning_signals.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-2 flex items-center gap-1 text-emerald-700">
            <Trophy size={14} /> Top Winning Signals
          </h2>
          <p className="text-[11px] text-gray-500 mb-2">Tap a signal to see contributing recommendations.</p>
          <div className="space-y-2">
            {learnings.top_winning_signals.map((sig, i) => (
              <SignalRow
                key={i}
                sig={sig}
                variant="win"
                onClick={() =>
                  onDrill({
                    title: `${sig.signal}${sig.strategy ? ` · ${sig.strategy.toUpperCase()}` : ""}`,
                    subtitle: `${sig.win_rate.toFixed(0)}% win-rate over ${sig.total} obs`,
                    items: filterBySignal(history, sig.strategy ?? null, sig.signal),
                  })
                }
              />
            ))}
          </div>
        </section>
      )}

      {learnings.top_losing_signals && learnings.top_losing_signals.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-2 flex items-center gap-1 text-rose-700">
            <AlertCircle size={14} /> Top Losing Signals
          </h2>
          <p className="text-[11px] text-gray-500 mb-2">Tap a signal to see contributing recommendations.</p>
          <div className="space-y-2">
            {learnings.top_losing_signals.map((sig, i) => (
              <SignalRow
                key={i}
                sig={sig}
                variant="lose"
                onClick={() =>
                  onDrill({
                    title: `${sig.signal}${sig.strategy ? ` · ${sig.strategy.toUpperCase()}` : ""}`,
                    subtitle: `${sig.win_rate.toFixed(0)}% win-rate over ${sig.total} obs`,
                    items: filterBySignal(history, sig.strategy ?? null, sig.signal),
                  })
                }
              />
            ))}
          </div>
        </section>
      )}

      {learnings.suggested_adjustments && learnings.suggested_adjustments.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-2 flex items-center gap-1">
            <Lightbulb size={14} className="text-amber-600" /> AI Adjustments
          </h2>
          <div className="space-y-2">
            {learnings.suggested_adjustments.map((a, i) => (
              <div
                key={i}
                className="bg-gray-50 border border-gray-100 rounded-md px-3 py-2 text-xs text-gray-700"
              >
                {a}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function verdictColor(v: string | null | undefined): string {
  if (!v) return "text-gray-500 bg-gray-100";
  const up = v.toUpperCase();
  if (up.includes("STRONG BUY")) return "text-emerald-900 bg-emerald-100";
  if (up.includes("BUY")) return "text-emerald-700 bg-emerald-50";
  if (up.includes("SELL")) return "text-rose-700 bg-rose-50";
  if (up.includes("HOLD")) return "text-amber-700 bg-amber-50";
  return "text-gray-600 bg-gray-100";
}

function HistoryTab({ history }: { history: RecommendationItem[] }) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">No recommendation history yet</p>
    );
  }
  return (
    <div className="space-y-2">
      {history.map((r) => {
        const statusCls =
          r.final_status === "winning"
            ? "text-emerald-700 bg-emerald-50"
            : r.final_status === "losing"
            ? "text-rose-700 bg-rose-50"
            : r.closed
            ? "text-gray-600 bg-gray-100"
            : "text-sky-700 bg-sky-50";
        const statusLabel = r.closed ? r.final_status?.toUpperCase() ?? "CLOSED" : "ACTIVE";
        return (
          <div
            key={r.rec_id}
            className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-sm">{r.ticker}</span>
                {r.strategy && (
                  <span className="text-[10px] uppercase bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                    {r.strategy}
                  </span>
                )}
              </div>
              {r.verdict && (
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${verdictColor(r.verdict)}`}
                >
                  {r.verdict}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {r.entry_price != null && <span>Entry ${r.entry_price.toFixed(2)}</span>}
              {r.scan_date && <span>{r.scan_date}</span>}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusCls}`}>
                {statusLabel}
              </span>
            </div>
            {r.outcome_history && r.outcome_history.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {r.outcome_history.map((o: OutcomeEntry, idx: number) => {
                  const c =
                    o.status === "winning"
                      ? "text-emerald-700 bg-emerald-50"
                      : o.status === "losing"
                      ? "text-rose-700 bg-rose-50"
                      : "text-gray-600 bg-gray-100";
                  return (
                    <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded ${c}`}>
                      W{o.week}: {o.price_change_pct != null ? `${o.price_change_pct > 0 ? "+" : ""}${o.price_change_pct.toFixed(1)}%` : "—"}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function LearnPage() {
  const [tab, setTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<RecommendationStats | null>(null);
  const [learnings, setLearnings] = useState<LearningsResponse | null>(null);
  const [learningsSource, setLearningsSource] = useState<"backend" | "local" | null>(null);
  const [history, setHistory] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drill, setDrill] = useState<DrillDown | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [s, h] = await Promise.all([
          getRecommendationStats().catch(() => null),
          getRecommendationHistory(90, 200).catch(() => [] as RecommendationItem[]),
        ]);
        if (cancelled) return;
        setStats(s);
        setHistory(h);
        let backendLearnings: LearningsResponse | null = null;
        try {
          backendLearnings = await getLearnings();
        } catch {
          // /recommendations/learnings returns 404 in production — fall through to the local derivation.
        }
        if (cancelled) return;
        const backendUseful =
          backendLearnings != null &&
          backendLearnings.enabled !== false &&
          (
            (backendLearnings.top_winning_signals?.length ?? 0) > 0 ||
            (backendLearnings.top_losing_signals?.length ?? 0) > 0 ||
            (backendLearnings.verdict_baselines?.length ?? 0) > 0 ||
            (backendLearnings.suggested_adjustments?.length ?? 0) > 0
          );
        if (backendUseful) {
          setLearnings(backendLearnings);
          setLearningsSource("backend");
        } else if (h.length > 0) {
          setLearnings(deriveLocalLearnings(h, s));
          setLearningsSource("local");
        } else {
          setLearnings(backendLearnings);
          setLearningsSource(null);
        }
      } catch (e: unknown) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load AI data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const noData = useMemo(
    () =>
      !loading &&
      !error &&
      (stats?.enabled === false || stats?.total_recommendations === 0) &&
      (learnings == null || learnings.enabled === false) &&
      history.length === 0,
    [loading, error, stats, learnings, history],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap size={22} className="text-pink-600" />
        <h1 className="text-lg font-bold">AI Learnings</h1>
      </div>

      <div className="flex border-b border-gray-200">
        {(["stats", "signals", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 transition ${
              tab === t
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 text-rose-800 rounded-lg text-sm">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}
      {!loading && !error && noData && (
        <div className="text-center py-12 px-6">
          <GraduationCap size={48} className="mx-auto text-purple-300" />
          <h2 className="font-bold text-base mt-3">Learning in progress</h2>
          <p className="text-sm text-gray-500 mt-1">
            The AI learning module hasn&apos;t accumulated enough data yet. Run daily scans and
            check back after a week — the system evaluates recommendations every Monday.
          </p>
        </div>
      )}
      {!loading && !error && !noData && (
        <>
          {tab === "signals" && learningsSource === "local" && (
            <div className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-3 py-1.5">
              Derived locally from your recent history (server endpoint unavailable).
            </div>
          )}
          {tab === "stats" && <StatsTab stats={stats} history={history} onDrill={setDrill} />}
          {tab === "signals" && (
            <SignalsTab learnings={learnings} history={history} onDrill={setDrill} />
          )}
          {tab === "history" && <HistoryTab history={history} />}
        </>
      )}

      {drill && <DrillDownModal drill={drill} onClose={() => setDrill(null)} />}
    </div>
  );
}

function DrillDownModal({ drill, onClose }: { drill: DrillDown; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={drill.title}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate">{drill.title}</h3>
            {drill.subtitle && (
              <p className="text-xs text-gray-500 truncate">{drill.subtitle}</p>
            )}
            <p className="text-[10px] text-gray-400 mt-0.5">
              {drill.items.length} matching {drill.items.length === 1 ? "rec" : "recs"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-3 overflow-y-auto">
          {drill.items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No recommendations matched. This can happen when the backend&apos;s
              signal buckets don&apos;t line up with the raw stock_summary text.
            </p>
          ) : (
            <HistoryTab history={drill.items} />
          )}
        </div>
      </div>
    </div>
  );
}

