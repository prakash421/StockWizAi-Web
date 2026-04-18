"use client";
import { useState } from "react";
import type { ScanResultItem, CspResult, DiagonalResult, VerticalResult, LongLeapsResult } from "@/lib/types";
import { getRsiColor, getBetaColor, getIvColor, getRecColor, getBtColor, getRrColor, formatDate, parseNumber } from "@/lib/utils";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Plus } from "lucide-react";

interface Props {
  item: ScanResultItem;
  strategyFilter: string;
}

function Chip({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[0.65rem] sm:text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

function StrategySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-2 border-t border-gray-100">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</h4>
      {children}
    </div>
  );
}

function CspRow({ csp }: { csp: CspResult }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <div>
        <span className="font-medium">${csp.strike}</span>
        <span className="text-gray-500 ml-1">→ ${csp.premium.toFixed(2)}</span>
        {csp.delta && <span className="text-gray-400 ml-1">Δ{csp.delta}</span>}
      </div>
      <div className="flex gap-1 items-center">
        {csp.roc && <Chip label={`ROC ${csp.roc}`} colorClass="text-indigo-700 bg-indigo-50" />}
        {csp.bt && <Chip label={`BT ${csp.bt}`} colorClass={getBtColor(csp.bt)} />}
        {csp.expiry && <span className="text-xs text-gray-400">{formatDate(csp.expiry)}</span>}
      </div>
    </div>
  );
}

function DiagRow({ d }: { d: DiagonalResult }) {
  const longLeg = d.long_leg || d.long || d.long_strike || "?";
  const shortLeg = d.short_leg || d.short || d.short_strike || "?";
  const yieldVal = d.yield || d.yield_ratio;
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <div>
        <span className="font-medium">{longLeg}</span>
        <span className="text-gray-400 mx-1">/</span>
        <span className="font-medium">{shortLeg}</span>
        <span className="text-gray-500 ml-1">Net ${(d.net_debt ?? d.net_debit ?? 0).toFixed(2)}</span>
      </div>
      <div className="flex gap-1 items-center">
        {yieldVal && <Chip label={`Yield ${yieldVal}`} colorClass="text-indigo-700 bg-indigo-50" />}
        {d.bt && <Chip label={`BT ${d.bt}`} colorClass={getBtColor(d.bt)} />}
        {d.expiry && <span className="text-xs text-gray-400">{formatDate(d.expiry)}</span>}
      </div>
    </div>
  );
}

function VertRow({ v }: { v: VerticalResult }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <div>
        <span className="font-medium">{v.strikes}</span>
        <span className="text-gray-500 ml-1">Net ${v.net_debit.toFixed(2)}</span>
      </div>
      <div className="flex gap-1 items-center">
        {v.bt && <Chip label={`BT ${v.bt}`} colorClass={getBtColor(v.bt)} />}
        {v.expiry && <span className="text-xs text-gray-400">{formatDate(v.expiry)}</span>}
      </div>
    </div>
  );
}

function LeapRow({ l }: { l: LongLeapsResult }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <div>
        <span className="font-medium">${l.strike}</span>
        <span className="text-gray-500 ml-1">@ ${l.premium.toFixed(2)}</span>
        {l.leverage && <span className="text-gray-400 ml-1">{l.leverage}x</span>}
      </div>
      <div className="flex gap-1 items-center">
        {l.intrinsic_buffer && <Chip label={`Buff ${l.intrinsic_buffer}`} colorClass="text-blue-700 bg-blue-50" />}
        {l.bt && <Chip label={`BT ${l.bt}`} colorClass={getBtColor(l.bt)} />}
        <span className="text-xs text-gray-400">{formatDate(l.expiry)}</span>
      </div>
    </div>
  );
}

export function ScanResultCard({ item, strategyFilter }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { ticker, price, rsi, beta, iv_rank, stock_recommendation, stock_summary, overall,
    sma200, discount_from_high, bullish_signals, bearish_signals, levels,
    csps, diagonals, verticals, long_leaps } = item;

  const showCsp = strategyFilter === "All" || strategyFilter === "CSPs";
  const showDiag = strategyFilter === "All" || strategyFilter === "Diagonals";
  const showVert = strategyFilter === "All" || strategyFilter === "Verticals";
  const showLeaps = strategyFilter === "All" || strategyFilter === "Long LEAPS";

  const rec = stock_recommendation || overall || "";
  const fmt = (n: number | null | undefined) => n != null ? `$${n.toFixed(2)}` : null;

  // Dedup levels
  const lvl = levels;
  const showSupport = lvl?.support != null && fmt(lvl.support) !== fmt(lvl.swing_low_60d) && fmt(lvl.support) !== fmt(lvl.stop_loss);
  const showResist = lvl?.resistance != null && fmt(lvl.resistance) !== fmt(lvl.swing_high_60d) && fmt(lvl.resistance) !== fmt(lvl.target);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-base sm:text-lg font-bold">{ticker}</span>
            <span className="text-gray-500 ml-2 text-sm sm:text-base">${price.toFixed(2)}</span>
          </div>
          {rec && <Chip label={rec} colorClass={getRecColor(rec)} />}
        </div>

        {/* Metrics chips */}
        <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2">
          {rsi != null && <Chip label={`RSI ${rsi.toFixed(0)}`} colorClass={getRsiColor(rsi)} />}
          {beta != null && <Chip label={`β ${beta.toFixed(2)}`} colorClass={getBetaColor(beta)} />}
          {iv_rank && <Chip label={`IV ${iv_rank}`} colorClass={getIvColor(iv_rank)} />}
        </div>

        {/* Summary */}
        {stock_summary && (
          <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{stock_summary}</p>
        )}

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs sm:text-sm text-indigo-600 font-medium hover:text-indigo-800"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          {expanded ? "Less details" : "More details"}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* SMA / Discount */}
          <div className="flex flex-wrap gap-1.5">
            {sma200 != null && <Chip label={`SMA200 $${sma200.toFixed(2)}`} colorClass={price > sma200 ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"} />}
            {discount_from_high && <Chip label={`Off High ${discount_from_high}`} colorClass="text-gray-600 bg-gray-100" />}
          </div>

          {/* Signals */}
          {bullish_signals && bullish_signals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 mb-0.5 flex items-center gap-1">
                <TrendingUp size={12} /> Bullish
              </p>
              {bullish_signals.map((s, i) => (
                <p key={i} className="text-xs text-green-700 ml-4">{s}</p>
              ))}
            </div>
          )}
          {bearish_signals && bearish_signals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-700 mb-0.5 flex items-center gap-1">
                <TrendingDown size={12} /> Bearish
              </p>
              {bearish_signals.map((s, i) => (
                <p key={i} className="text-xs text-red-700 ml-4">{s}</p>
              ))}
            </div>
          )}

          {/* Key Levels */}
          {lvl && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Key Levels</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {lvl.stop_loss != null && (
                  <div className="flex justify-between"><span className="text-gray-500">Stop Loss</span><span className="text-red-600 font-medium">{fmt(lvl.stop_loss)}</span></div>
                )}
                {lvl.target != null && (
                  <div className="flex justify-between"><span className="text-gray-500">Target</span><span className="text-green-600 font-medium">{fmt(lvl.target)}</span></div>
                )}
                {showSupport && (
                  <div className="flex justify-between"><span className="text-gray-500">Support</span><span className="font-medium">{fmt(lvl.support)}</span></div>
                )}
                {showResist && (
                  <div className="flex justify-between"><span className="text-gray-500">Resistance</span><span className="font-medium">{fmt(lvl.resistance)}</span></div>
                )}
                {lvl.swing_low_60d != null && (
                  <div className="flex justify-between"><span className="text-gray-500">Swing Low 60d</span><span className="font-medium">{fmt(lvl.swing_low_60d)}</span></div>
                )}
                {lvl.swing_high_60d != null && (
                  <div className="flex justify-between"><span className="text-gray-500">Swing High 60d</span><span className="font-medium">{fmt(lvl.swing_high_60d)}</span></div>
                )}
                {lvl.atr != null && (
                  <div className="flex justify-between"><span className="text-gray-500">ATR</span><span className="font-medium">${lvl.atr.toFixed(2)}</span></div>
                )}
                {lvl.risk_reward != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">R:R</span>
                    <span className={`font-medium px-1 rounded ${getRrColor(lvl.risk_reward)}`}>{lvl.risk_reward.toFixed(2)}</span>
                  </div>
                )}
              </div>
              {lvl.risk_note && <p className="text-xs text-gray-500 mt-1 italic">{lvl.risk_note}</p>}
            </div>
          )}

          {/* Strategy Results */}
          {showCsp && csps && csps.length > 0 && (
            <StrategySection title="Cash-Secured Puts">
              {csps.map((c, i) => <CspRow key={i} csp={c} />)}
            </StrategySection>
          )}
          {showDiag && diagonals && diagonals.length > 0 && (
            <StrategySection title="Diagonal Spreads">
              {diagonals.map((d, i) => <DiagRow key={i} d={d} />)}
            </StrategySection>
          )}
          {showVert && verticals && verticals.length > 0 && (
            <StrategySection title="Vertical Spreads">
              {verticals.map((v, i) => <VertRow key={i} v={v} />)}
            </StrategySection>
          )}
          {showLeaps && long_leaps && long_leaps.length > 0 && (
            <StrategySection title="Long LEAPS">
              {long_leaps.map((l, i) => <LeapRow key={i} l={l} />)}
            </StrategySection>
          )}
        </div>
      )}
    </div>
  );
}
