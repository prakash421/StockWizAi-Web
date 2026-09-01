"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  AlertTriangle,
  RefreshCw,
  Sunrise,
  TrendingUp,
  ShieldAlert,
  Calendar,
  PieChart,
  Flame,
} from "lucide-react";
import { getDailyBrief } from "@/lib/api";
import type {
  DailyBriefResponse,
  BriefBuySignal,
  BriefStopWatch,
  BriefEarnings,
  BriefEtfStatus,
  BriefTrendingItem,
  BriefSummary,
} from "@/lib/types";

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

function fmtTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function verdictClass(v: string | null | undefined): string {
  const s = (v ?? "").toUpperCase();
  if (s.includes("STRONG BUY")) return "bg-emerald-100 text-emerald-800";
  if (s.includes("BUY")) return "bg-emerald-50 text-emerald-700";
  if (s.includes("HOLD")) return "bg-amber-50 text-amber-700";
  if (s.includes("AVOID") || s.includes("SELL")) return "bg-rose-50 text-rose-700";
  return "bg-gray-100 text-gray-700";
}

function SummaryCard({ summary }: { summary: BriefSummary | null | undefined }) {
  const tiles = [
    { label: "Tickers Scanned", value: summary?.tickers_scanned, color: "text-indigo-700", bg: "bg-indigo-50" },
    { label: "Strong Buys", value: summary?.strong_buys, color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Stop-Loss Watch", value: summary?.stop_loss_watch_count, color: "text-amber-700", bg: "bg-amber-50" },
    { label: "Earnings This Week", value: summary?.earnings_this_week_count, color: "text-rose-700", bg: "bg-rose-50" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className={`${t.bg} rounded-xl p-3 border border-gray-100`}>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">{t.label}</div>
          <div className={`text-2xl font-bold mt-1 ${t.color}`}>{t.value ?? 0}</div>
        </div>
      ))}
    </div>
  );
}

function BuySignalCard({ s }: { s: BriefBuySignal }) {
  const isPcs = s.kind === "put_credit_spread";
  const isLeaps = s.kind === "long_leaps";
  const kindLabel =
    s.kind === "stock" ? "Stock" : isLeaps ? "Long LEAPS" : isPcs ? "Put Credit Spread" : s.kind;
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-base">{s.ticker}</span>
          <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
            {kindLabel}
          </span>
          {s.verdict && (
            <span className={`text-[11px] px-2 py-0.5 rounded-md ${verdictClass(s.verdict)}`}>
              {s.verdict}
            </span>
          )}
        </div>
        {s.price != null && (
          <span className="text-sm font-mono text-gray-700">${fmtNum(s.price)}</span>
        )}
      </div>
      {isPcs ? (
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-700">
          {s.short_strike != null && <div><span className="text-gray-500">Short:</span> ${fmtNum(s.short_strike)}</div>}
          {s.long_strike != null && <div><span className="text-gray-500">Long:</span> ${fmtNum(s.long_strike)}</div>}
          {s.width != null && <div><span className="text-gray-500">Width:</span> ${fmtNum(s.width)}</div>}
          {s.credit != null && <div><span className="text-gray-500">Credit:</span> ${fmtNum(s.credit)}</div>}
          {s.max_loss != null && <div><span className="text-gray-500">Max Loss:</span> ${fmtNum(s.max_loss)}</div>}
          {s.roc != null && <div><span className="text-gray-500">ROC:</span> {fmtPct(s.roc)}</div>}
          {s.expiry && <div><span className="text-gray-500">Expiry:</span> {s.expiry}</div>}
          {s.bt && <div><span className="text-gray-500">BT:</span> {s.bt}</div>}
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-700">
          {s.strike != null && <div><span className="text-gray-500">Strike:</span> ${fmtNum(s.strike)}</div>}
          {s.expiry && <div><span className="text-gray-500">Expiry:</span> {s.expiry}</div>}
          {s.premium != null && <div><span className="text-gray-500">Premium:</span> ${fmtNum(s.premium)}</div>}
          {s.stop_loss != null && <div><span className="text-gray-500">Stop:</span> ${fmtNum(s.stop_loss)}</div>}
          {s.target != null && <div><span className="text-gray-500">Target:</span> ${fmtNum(s.target)}</div>}
        </div>
      )}
      {s.risk_note && (
        <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1">
          ⚠️ {s.risk_note}
        </div>
      )}
    </div>
  );
}

function StopWatchRow({ w }: { w: BriefStopWatch }) {
  const near = (w.distance_pct ?? 999) <= 3;
  return (
    <div
      className={`rounded-lg px-3 py-2 border ${
        near ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"
      } flex items-center justify-between gap-2 text-sm`}
    >
      <span className="font-semibold">{w.ticker}</span>
      <div className="flex gap-3 text-xs font-mono text-gray-700">
        <span>${fmtNum(w.price)}</span>
        <span>→ Stop ${fmtNum(w.stop_loss)}</span>
        <span className={near ? "text-rose-700 font-bold" : "text-amber-700"}>
          {fmtPct(w.distance_pct)}
        </span>
      </div>
    </div>
  );
}

function EarningsChip({ e }: { e: BriefEarnings }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-md px-2 py-1">
      <Calendar size={12} />
      <span className="font-semibold">{e.ticker}</span>
      {e.date && <span className="text-rose-600">· {e.date}</span>}
    </span>
  );
}

function EtfStatusSection({ etf }: { etf: BriefEtfStatus }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2 font-semibold text-gray-800">
        <PieChart size={16} className="text-cyan-600" />
        <span>Sector ETF Status</span>
      </div>
      {etf.top_in && etf.top_in.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Top In</div>
          <div className="flex flex-wrap gap-1.5">
            {etf.top_in.map((t) => (
              <span key={`in-${t}`} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-0.5">{t}</span>
            ))}
          </div>
        </div>
      )}
      {etf.bottom_out && etf.bottom_out.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Bottom Out</div>
          <div className="flex flex-wrap gap-1.5">
            {etf.bottom_out.map((t) => (
              <span key={`out-${t}`} className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded px-2 py-0.5">{t}</span>
            ))}
          </div>
        </div>
      )}
      {etf.early_rotators && etf.early_rotators.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Early Rotators</div>
          <div className="flex flex-wrap gap-1.5">
            {etf.early_rotators.map((r, i) => (
              <span key={`rot-${i}`} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-2 py-0.5">
                {r.sector}
                {r.direction ? ` · ${r.direction}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
      {etf.signals && etf.signals.length > 0 && (
        <ul className="text-xs text-gray-700 space-y-1 pl-4 list-disc">
          {etf.signals.map((s, i) => (
            <li key={`sig-${i}`}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TrendingChip({ t }: { t: BriefTrendingItem }) {
  const badge = t.badge ?? "";
  const isHot = badge.toLowerCase().includes("hot") || (t.consecutive_days ?? 0) >= 3;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs rounded-md px-2 py-1 border ${
        isHot
          ? "bg-orange-50 text-orange-700 border-orange-200"
          : "bg-blue-50 text-blue-700 border-blue-200"
      }`}
    >
      {isHot && <Flame size={12} />}
      <span className="font-semibold">{t.ticker}</span>
      {t.consecutive_days != null && <span>· {t.consecutive_days}d streak</span>}
      {t.appearances_14d != null && <span>· {t.appearances_14d}/14</span>}
      {badge && <span className="uppercase text-[10px] tracking-wide">· {badge}</span>}
    </span>
  );
}

export default function DailyBriefPage() {
  const [data, setData] = useState<DailyBriefResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDailyBrief(null, true);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load daily brief");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buys = data?.new_buy_signals ?? [];
  const stops = data?.stop_loss_watch ?? [];
  const earnings = data?.earnings_this_week ?? [];
  const trending = data?.trending_today ?? [];

  return (
    <div className="max-w-5xl mx-auto p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Sunrise className="text-orange-600" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Daily Brief</h1>
            {data?.generated_at && (
              <div className="text-xs text-gray-500">Generated {fmtTimestamp(data.generated_at)}</div>
            )}
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-3 py-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {data?.error && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
          <AlertTriangle size={16} />
          <span>Partial data: {data.error}</span>
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading daily brief…
        </div>
      )}

      {data && (
        <>
          <SummaryCard summary={data.summary} />

          <section className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-gray-800">
              <TrendingUp size={16} className="text-emerald-600" />
              <span>New Buy Signals ({buys.length})</span>
            </div>
            {buys.length === 0 ? (
              <div className="text-sm text-gray-500 italic bg-gray-50 rounded-lg p-3">
                No new buy signals today.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {buys.map((s, i) => (
                  <BuySignalCard key={`${s.ticker}-${s.kind}-${i}`} s={s} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-gray-800">
              <ShieldAlert size={16} className="text-amber-600" />
              <span>Stop-Loss Watch ({stops.length})</span>
            </div>
            {stops.length === 0 ? (
              <div className="text-sm text-gray-500 italic bg-gray-50 rounded-lg p-3">
                No positions near stop-loss.
              </div>
            ) : (
              <div className="space-y-2">
                {stops.map((w, i) => (
                  <StopWatchRow key={`${w.ticker}-${i}`} w={w} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-gray-800">
              <Calendar size={16} className="text-rose-600" />
              <span>Earnings This Week ({earnings.length})</span>
            </div>
            {earnings.length === 0 ? (
              <div className="text-sm text-gray-500 italic bg-gray-50 rounded-lg p-3">
                No earnings this week.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {earnings.map((e, i) => (
                  <EarningsChip key={`${e.ticker}-${i}`} e={e} />
                ))}
              </div>
            )}
          </section>

          {data.etf_status && <EtfStatusSection etf={data.etf_status} />}

          {trending.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-gray-800">
                <Flame size={16} className="text-orange-600" />
                <span>Trending Today ({trending.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trending.map((t, i) => (
                  <TrendingChip key={`${t.ticker}-${i}`} t={t} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
