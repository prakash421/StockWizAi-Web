"use client";
import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, PieChart, ArrowRight, ArrowLeftRight } from "lucide-react";
import { getSectorRotation } from "@/lib/api";
import type { SectorRotationResponse, SectorData } from "@/lib/types";

const PERIODS = ["1w", "2w", "4w"] as const;
type Period = (typeof PERIODS)[number];

function pct(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

function pctColor(n: number | null | undefined): string {
  if (n == null) return "text-gray-500";
  if (n > 0) return "text-emerald-700";
  if (n < 0) return "text-rose-700";
  return "text-gray-700";
}

function signalIcon(s: string): string {
  if (s.includes("INTO")) return "🟢";
  if (s.includes("OUT OF")) return "🔴";
  if (s.includes("Defensive") || s.includes("⚠")) return "⚠️";
  if (s.includes("Risk-on")) return "📈";
  return "•";
}

function SectorCard({ sector }: { sector: SectorData }) {
  const periodColor = pctColor(sector.return_period);
  const recentColor = pctColor(sector.return_recent);
  const flowLabel = sector.money_flow ?? "neutral";
  const flowClass =
    flowLabel === "inflow"
      ? "bg-emerald-50 text-emerald-700"
      : flowLabel === "outflow"
      ? "bg-rose-50 text-rose-700"
      : "bg-gray-100 text-gray-600";
  const flowIcon =
    flowLabel === "inflow" ? "💰" : flowLabel === "outflow" ? "📤" : "➖";
  const earlyIn = sector.early_signal === "early_in";
  const earlyOut = sector.early_signal === "early_out";
  const mw = sector.multi_window;
  const mwParts = mw
    ? [
        mw.r1w != null ? `1w ${pct(mw.r1w)}` : null,
        mw.r2w != null ? `2w ${pct(mw.r2w)}` : null,
        mw.r4w != null ? `4w ${pct(mw.r4w)}` : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-400 font-mono">#{sector.rank}</span>
          <span className="font-semibold text-sm truncate">{sector.sector}</span>
          <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
            {sector.etf}
          </span>
        </div>
        <span className={`text-sm font-bold ${periodColor}`}>
          {pct(sector.return_period)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 items-center">
        <span className={`text-[11px] px-2 py-0.5 rounded-md ${flowClass}`}>
          {flowIcon} {flowLabel}
        </span>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-md bg-gray-50 ${recentColor}`}
        >
          Recent {pct(sector.return_recent)}
        </span>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-md ${
            Math.abs(sector.volume_change_pct) > 5
              ? "bg-amber-50 text-amber-700"
              : "bg-gray-50 text-gray-500"
          }`}
        >
          Vol {pct(sector.volume_change_pct)}
        </span>
        {earlyIn && (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold">
            🔄 Early IN
          </span>
        )}
        {earlyOut && (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold">
            🔄 Early OUT
          </span>
        )}
        {mwParts.length > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-50 text-gray-500">
            {mwParts.join(" • ")}
          </span>
        )}
      </div>
    </div>
  );
}

export default function SectorsPage() {
  const [period, setPeriod] = useState<Period>("2w");
  const [data, setData] = useState<SectorRotationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSectorRotation(period)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load sector data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <PieChart size={22} className="text-cyan-600" />
        <h1 className="text-lg font-bold">Sector Rotation</h1>
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
              period === p
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {p.toUpperCase()}
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

      {/* Rotation signals */}
      {data?.rotation_signals && data.rotation_signals.length > 0 && (
        <div className="bg-sky-50 border border-sky-100 rounded-xl p-3">
          <h2 className="text-xs font-bold text-sky-700 uppercase tracking-wide mb-2">
            Market Rotation Signals
          </h2>
          <ul className="space-y-1 text-sm text-sky-900">
            {data.rotation_signals.map((s, i) => (
              <li key={i}>
                {signalIcon(s)} {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top / Bottom */}
      {(data?.top_sectors || data?.bottom_sectors) && (
        <div className="grid grid-cols-2 gap-2">
          {data?.top_sectors && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">
                Top Sectors
              </h3>
              <ol className="text-xs space-y-0.5 list-decimal list-inside text-emerald-900">
                {data.top_sectors.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          )}
          {data?.bottom_sectors && (
            <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
              <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wide mb-1">
                Bottom Sectors
              </h3>
              <ol className="text-xs space-y-0.5 list-decimal list-inside text-rose-900">
                {data.bottom_sectors.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Early rotators */}
      {data?.early_rotators && data.early_rotators.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
          <h2 className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-1">
            <ArrowLeftRight size={14} /> Early Rotators
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.early_rotators.map((r) => {
              const isIn = r.direction === "early_in";
              return (
                <div
                  key={`${r.sector}-${r.direction}`}
                  className={`text-xs px-3 py-2 rounded-md border ${
                    isIn
                      ? "bg-sky-50 border-sky-100"
                      : "bg-rose-50 border-rose-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{r.sector}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wide font-bold ${
                        isIn ? "text-sky-700" : "text-rose-700"
                      }`}
                    >
                      {isIn ? "Early IN" : "Early OUT"}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-gray-600">
                    <span>1w {pct(r.r1w)}</span>
                    <ArrowRight size={10} />
                    <span>4w {pct(r.r4w)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sector grid */}
      {data?.sectors && (
        <div className="space-y-2">
          {data.sectors.map((s) => (
            <SectorCard key={s.etf} sector={s} />
          ))}
        </div>
      )}
    </div>
  );
}
