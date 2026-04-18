"use client";
import { useState } from "react";
import { runBacktest } from "@/lib/api";
import { AI_GURU_STRATEGIES } from "@/lib/constants";
import type { BacktestRequest, BacktestResponse } from "@/lib/types";
import { getBtColor } from "@/lib/utils";
import { Brain, Loader2, AlertTriangle } from "lucide-react";

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

  const needsSecondLeg = strategy === "Vertical" || strategy === "Diagonal";

  const handleRun = async () => {
    if (!ticker || !strike || !expiry || !premium) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const req: BacktestRequest = {
        ticker: ticker.toUpperCase(),
        strike: parseFloat(strike),
        expiry,
        premium: parseFloat(premium),
        strategy: strategy.toLowerCase().replace(" ", "_"),
        is_call: strategy === "Sell Call" || strategy === "Diagonal" ? 1 : 0,
        is_buy: strategy === "Long LEAPS" ? 1 : 0,
      };
      if (needsSecondLeg && strikeSell) req.strike_sell = parseFloat(strikeSell);
      if (needsSecondLeg && expirySell) req.expiry_sell = expirySell;
      const resp = await runBacktest(req);
      setResult(resp);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Backtest failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Brain size={24} className="text-indigo-600" />
        <h1 className="text-lg font-bold">AI Guru – Backtest</h1>
      </div>

      {/* Strategy */}
      <select value={strategy} onChange={(e) => setStrategy(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500">
        {AI_GURU_STRATEGIES.map((s) => <option key={s}>{s}</option>)}
      </select>

      {/* Fields */}
      <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="Ticker (e.g. TSLA)"
        className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500" />

      <div className="grid grid-cols-2 gap-2">
        <input value={strike} onChange={(e) => setStrike(e.target.value)} placeholder="Strike" className="border rounded-lg px-3 py-2 text-sm" />
        <input value={premium} onChange={(e) => setPremium(e.target.value)} placeholder="Premium" className="border rounded-lg px-3 py-2 text-sm" />
      </div>

      <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />

      {needsSecondLeg && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <input value={strikeSell} onChange={(e) => setStrikeSell(e.target.value)} placeholder="Sell Strike" className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={expirySell} onChange={(e) => setExpirySell(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
        </>
      )}

      <button onClick={handleRun} disabled={loading || !ticker || !strike || !expiry || !premium}
        className="w-full bg-indigo-600 text-white rounded-lg py-3 font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition flex items-center justify-center gap-2">
        {loading ? <><Loader2 size={18} className="animate-spin" /> Running...</> : "Run Backtest"}
      </button>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-800 rounded-lg text-sm">
          <AlertTriangle size={16} /><span>{error}</span>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
          <h3 className="font-bold text-base">Results</h3>
          <div className="grid grid-cols-3 gap-2">
            {result.win_rate && (
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">Win Rate</p>
                <p className={`text-lg font-bold ${getBtColor(result.win_rate)?.replace("bg-", "").split(" ")[0] ?? ""}`}>{result.win_rate}</p>
              </div>
            )}
            {result.avg_return && (
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">Avg Return</p>
                <p className="text-lg font-bold text-indigo-700">{result.avg_return}</p>
              </div>
            )}
            {result.max_loss && (
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">Max Loss</p>
                <p className="text-lg font-bold text-red-600">{result.max_loss}</p>
              </div>
            )}
          </div>
          {result.recommendation && (
            <div className="bg-indigo-50 rounded-lg p-3">
              <p className="text-xs text-indigo-500 font-semibold">Recommendation</p>
              <p className="text-sm text-indigo-900">{result.recommendation}</p>
            </div>
          )}
          {result.summary && <p className="text-sm text-gray-600">{result.summary}</p>}
          {result.details && <p className="text-xs text-gray-500 whitespace-pre-wrap">{result.details}</p>}
        </div>
      )}
    </div>
  );
}
