"use client";
import { useEffect, useMemo, useState } from "react";
import { runBacktest } from "@/lib/api";
import { AI_GURU_STRATEGIES } from "@/lib/constants";
import type { BacktestRequest, BacktestResponse } from "@/lib/types";
import {
  confidenceLabel,
  isSellStrategy,
  presentVerdict,
  shouldAutoCrossValidate,
  toBacktestParams,
} from "@/lib/backtestVerdict";
import type { AiCrossValidation } from "@/lib/aiReasoning";
import { AiCrossValidationBadge } from "@/components/AiCrossValidationBadge";
import {
  AlertTriangle,
  Brain,
  Loader2,
  Sparkles,
  Target,
} from "lucide-react";

export default function AiGuruPage() {
  const [strategy, setStrategy] = useState("CSP");
  const [ticker, setTicker] = useState("");
  const [strike, setStrike] = useState("");
  const [strikeSell, setStrikeSell] = useState("");
  const [expiry, setExpiry] = useState("");
  const [expirySell, setExpirySell] = useState("");
  const [premium, setPremium] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastTicker, setLastTicker] = useState<string>("");
  const [crossVal, setCrossVal] = useState<AiCrossValidation | null>(null);
  const [crossLoading, setCrossLoading] = useState(false);

  const needsSecondLeg = strategy === "Vertical" || strategy === "Diagonal";
  const sellStrategy = useMemo(
    () => isSellStrategy(toBacktestParams(strategy).strategy),
    [strategy]
  );

  const handleRun = async () => {
    if (!ticker || !strike || !expiry || !premium) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCrossVal(null);
    try {
      const { strategy: backendStrategy, action } = toBacktestParams(strategy);
      const req: BacktestRequest = {
        ticker: ticker.toUpperCase(),
        strategy: backendStrategy,
        action,
        strike: parseFloat(strike),
        expiry,
        premium: parseFloat(premium),
      };
      if (needsSecondLeg && strikeSell) req.strike_sell = parseFloat(strikeSell);
      if (needsSecondLeg && expirySell) req.expiry_sell = expirySell;
      const resp = await runBacktest(req);
      setResult(resp);
      setLastTicker(req.ticker);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Backtest failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!result || !lastTicker) return;
    if (!shouldAutoCrossValidate(result.verdict)) return;
    let cancelled = false;
    setCrossLoading(true);
    fetch("/api/ai-cross-validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: lastTicker }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AiCrossValidation | null) => {
        if (!cancelled && data) setCrossVal(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCrossLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [result, lastTicker]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Brain size={24} className="text-indigo-600" />
        <h1 className="text-lg font-bold">AI Guru – Backtest</h1>
      </div>

      <select
        value={strategy}
        onChange={(e) => setStrategy(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
      >
        {AI_GURU_STRATEGIES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>

      <input
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        placeholder="Ticker (e.g. TSLA)"
        className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          value={strike}
          onChange={(e) => setStrike(e.target.value)}
          placeholder="Strike"
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={premium}
          onChange={(e) => setPremium(e.target.value)}
          placeholder="Premium"
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <input
        type="date"
        value={expiry}
        onChange={(e) => setExpiry(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />

      {needsSecondLeg && (
        <div className="grid grid-cols-2 gap-2">
          <input
            value={strikeSell}
            onChange={(e) => setStrikeSell(e.target.value)}
            placeholder="Sell Strike"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={expirySell}
            onChange={(e) => setExpirySell(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={loading || !ticker || !strike || !expiry || !premium}
        className="w-full bg-indigo-600 text-white rounded-lg py-3 font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Running...
          </>
        ) : (
          "Run Backtest"
        )}
      </button>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-800 rounded-lg text-sm">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <BacktestResultCard
          result={result}
          backendStrategy={toBacktestParams(strategy).strategy}
          isSellStrategy={sellStrategy}
          crossVal={crossVal}
          crossLoading={crossLoading}
        />
      )}
    </div>
  );
}

interface CardProps {
  result: BacktestResponse;
  backendStrategy: string;
  isSellStrategy: boolean;
  crossVal: AiCrossValidation | null;
  crossLoading: boolean;
}

function BacktestResultCard({
  result,
  backendStrategy,
  isSellStrategy: sell,
  crossVal,
  crossLoading,
}: CardProps) {
  const present = presentVerdict(result.verdict, backendStrategy);
  const confLabel = confidenceLabel(result.confidence, backendStrategy);
  const confColor =
    result.confidence === "Very High" || result.confidence === "High"
      ? "text-green-800 bg-green-100"
      : result.confidence === "Medium"
      ? "text-amber-800 bg-amber-100"
      : "text-gray-700 bg-gray-100";

  const signals = result.signals ?? [];
  const warnings = result.warnings ?? [];
  const lvl = result.levels;
  const stopLabel = sell ? "🛑 Short-cover Stop" : "🛑 Stop Loss";

  return (
    <div
      className={`rounded-xl border-2 ${present.borderClass} ${present.bgClass} p-4 space-y-3`}
    >
      <div>
        <h2 className={`text-2xl font-black tracking-tight ${present.colorClass}`}>
          {present.displayVerdict}
        </h2>
        {present.subtitle && (
          <p className={`text-xs mt-0.5 ${present.colorClass} opacity-80`}>
            {present.subtitle}
          </p>
        )}
        <span
          className={`inline-block mt-2 px-2 py-0.5 rounded-md text-xs font-bold ${confColor}`}
        >
          {confLabel}
        </span>
      </div>

      <p className="text-sm text-gray-800">{result.summary}</p>

      <div className="grid grid-cols-3 gap-2 border-t border-gray-200 pt-3">
        {result.price != null && (
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Price</p>
            <p className="text-base font-bold">${result.price.toFixed(2)}</p>
          </div>
        )}
        {result.rsi != null && (
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">RSI</p>
            <p
              className={`text-base font-bold ${
                result.rsi < 30
                  ? "text-green-700"
                  : result.rsi > 70
                  ? "text-red-700"
                  : "text-gray-900"
              }`}
            >
              {result.rsi.toFixed(1)}
            </p>
          </div>
        )}
        {result.backtest_score && (
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Backtest</p>
            <p className="text-base font-bold text-blue-700">{result.backtest_score}</p>
          </div>
        )}
      </div>

      {signals.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <p className="text-sm font-bold mb-1">Signals</p>
          <ul className="space-y-0.5">
            {signals.map((s, i) => (
              <li key={i} className="text-sm text-gray-800 flex gap-1.5">
                <span className="text-indigo-600 font-bold">✦</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <p className="text-sm font-bold text-amber-700 mb-1">Warnings</p>
          <ul className="space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-800 flex gap-1.5">
                <span>⚠</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lvl && (
        <div className="border-t border-gray-200 pt-3">
          <p className="text-sm font-bold mb-1 flex items-center gap-1">
            <Target size={14} /> Key Levels
          </p>
          <div className="space-y-0.5 text-sm">
            {lvl.target != null && (
              <Row label="🎯 Target" value={`$${lvl.target.toFixed(2)}`} cls="text-green-700 font-bold" />
            )}
            {lvl.resistance != null && (
              <Row label="Resistance" value={`$${lvl.resistance.toFixed(2)}`} cls="text-blue-700" />
            )}
            {lvl.support != null && (
              <Row label="Support" value={`$${lvl.support.toFixed(2)}`} cls="text-amber-700" />
            )}
            {lvl.stop_loss != null && (
              <Row label={stopLabel} value={`$${lvl.stop_loss.toFixed(2)}`} cls="text-red-700 font-bold" />
            )}
            {lvl.risk_reward != null && (
              <>
                <Row
                  label="Reward : Risk"
                  value={`${lvl.risk_reward.toFixed(1)} : 1`}
                  cls={
                    lvl.risk_reward >= 2
                      ? "text-green-700 font-bold"
                      : lvl.risk_reward >= 1
                      ? "text-amber-700 font-bold"
                      : "text-red-700 font-bold"
                  }
                />
                <p className="text-[10px] text-gray-500">
                  Potential reward of ${lvl.risk_reward.toFixed(1)} per $1 risked
                </p>
              </>
            )}
            {lvl.risk_note && (
              <p className="text-xs text-gray-600 pt-1">💡 {lvl.risk_note}</p>
            )}
          </div>
        </div>
      )}

      {result.learning?.enabled && (
        <div className="border-t border-gray-200 pt-3">
          <p className="text-sm font-bold text-purple-700 flex items-center gap-1">
            <Sparkles size={14} /> AI Learning
          </p>
          {result.learning.adjustment_reason && (
            <p className="text-xs text-gray-600 mt-0.5">{result.learning.adjustment_reason}</p>
          )}
          {result.learning.applied &&
            result.learning.original_verdict !== result.learning.adjusted_verdict && (
              <p className="text-xs font-bold text-amber-700 mt-1">
                Adjusted: {result.learning.original_verdict} → {result.learning.adjusted_verdict}
              </p>
            )}
        </div>
      )}

      {crossLoading && !crossVal && (
        <div className="border-t border-gray-200 pt-3 flex items-center gap-2 text-xs text-purple-700">
          <Loader2 size={12} className="animate-spin" />
          Cross-validating with AI engines...
        </div>
      )}
      {crossVal && <AiCrossValidationBadge validation={crossVal} />}
    </div>
  );
}

function Row({
  label,
  value,
  cls,
}: {
  label: string;
  value: string;
  cls?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className={cls}>{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}
