"use client";
import { useState } from "react";
import { scanTickers, scanTrending } from "@/lib/api";
import { DEFAULT_WATCHLIST, STRATEGY_OPTIONS } from "@/lib/constants";
import type { ScanResultItem } from "@/lib/types";
import { ScanResultCard } from "@/components/ScanResultCard";
import { Settings, ListChecks, Search, Loader2, AlertTriangle, X, TrendingUp } from "lucide-react";

export default function ScanPage() {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("watchlist");
      return saved ? saved.split(",").filter(Boolean) : DEFAULT_WATCHLIST;
    }
    return DEFAULT_WATCHLIST;
  });
  const [selectedStrategy, setSelectedStrategy] = useState("All");
  const [manualTicker, setManualTicker] = useState("");
  const [targetDelta, setTargetDelta] = useState("-0.25");
  const [minRoc, setMinRoc] = useState("4.0");
  const [isLoading, setIsLoading] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResultItem[]>([]);
  const [scanProgress, setScanProgress] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [showTuner, setShowTuner] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [watchlistText, setWatchlistText] = useState("");

  const strategyParam = (s: string) => {
    switch (s) {
      case "CSPs": return "csp";
      case "Diagonals": return "diagonal";
      case "Verticals": return "vertical";
      case "Long LEAPS": return "long_leaps";
      default: return undefined;
    }
  };

  const handleScanStocks = async () => {
    if (!manualTicker.trim()) return;
    setIsLoading(true);
    setScanResults([]);
    setScanError(null);
    const strat = strategyParam(selectedStrategy);
    const delta = parseFloat(targetDelta) || undefined;
    const roc = parseFloat(minRoc) || undefined;
    try {
      setScanProgress(`Scanning ${manualTicker}...`);
      const results = await scanTickers(manualTicker.trim(), strat, delta, roc);
      setScanResults(results);
      if (results.length === 0) setScanError("No opportunities found for this ticker.");
    } catch (e: unknown) {
      setScanError(e instanceof Error ? e.message : "Scan failed. Please try again.");
    } finally {
      setIsLoading(false);
      setScanProgress("");
    }
  };

  const handleScanWatchlist = async () => {
    setIsLoading(true);
    setScanResults([]);
    setScanError(null);
    const strat = strategyParam(selectedStrategy);
    const delta = parseFloat(targetDelta) || undefined;
    const roc = parseFloat(minRoc) || undefined;
    try {
      const batches: string[][] = [];
      for (let i = 0; i < watchlist.length; i += 5) {
        batches.push(watchlist.slice(i, i + 5));
      }
      const combined: ScanResultItem[] = [];
      let failed = 0;
      for (let i = 0; i < batches.length; i++) {
        setScanProgress(`Batch ${i + 1}/${batches.length} (${batches[i].length} symbols)...`);
        try {
          const results = await scanTickers(batches[i].join(","), strat, delta, roc);
          combined.push(...results);
        } catch {
          failed++;
        }
      }
      setScanResults(combined);
      if (failed > 0 && combined.length > 0) {
        setScanError(`${failed} of ${batches.length} batches failed. Showing partial results.`);
      } else if (failed > 0 && combined.length === 0) {
        setScanError("All batches failed. The server may be slow — please try again.");
      } else if (combined.length === 0) {
        setScanError("No opportunities found. Try adjusting tuner parameters or your watchlist.");
      }
    } catch (e: unknown) {
      setScanError(e instanceof Error ? e.message : "Scan failed. Please try again.");
    } finally {
      setIsLoading(false);
      setScanProgress("");
    }
  };

  const handleScanTrending = async () => {
    setIsLoading(true);
    setScanResults([]);
    setScanError(null);
    setScanProgress("Fetching trending stocks...");
    try {
      const results = await scanTrending();
      setScanResults(results);
      if (results.length === 0) setScanError("No trending stocks found.");
    } catch (e: unknown) {
      setScanError(e instanceof Error ? e.message : "Failed to fetch trending stocks.");
    } finally {
      setIsLoading(false);
      setScanProgress("");
    }
  };

  const saveWatchlist = () => {
    const newList = watchlistText
      .toUpperCase()
      .split(/[,\s]+/)
      .filter(Boolean);
    if (newList.length > 0) {
      setWatchlist(newList);
      localStorage.setItem("watchlist", newList.join(","));
      setShowWatchlist(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <select
          value={selectedStrategy}
          onChange={(e) => setSelectedStrategy(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {STRATEGY_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => { setWatchlistText(watchlist.join(", ")); setShowWatchlist(true); }}
          className="p-2.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
          title="Edit Watchlist"
        >
          <ListChecks size={20} />
        </button>
        <button
          onClick={() => setShowTuner(true)}
          className="p-2.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
          title="Tune Strategy"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Manual Search */}
      <input
        type="text"
        value={manualTicker}
        onChange={(e) => setManualTicker(e.target.value.toUpperCase())}
        placeholder="Ticker (e.g. TSLA, AMD)"
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        onKeyDown={(e) => e.key === "Enter" && handleScanStocks()}
      />

      {/* Scan Stocks Button */}
      <button
        onClick={handleScanStocks}
        disabled={isLoading || !manualTicker.trim()}
        className="w-full bg-indigo-600 text-white rounded-lg py-3 font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition flex items-center justify-center gap-2"
      >
        {isLoading && scanProgress.includes("Scanning") ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {scanProgress}
          </>
        ) : (
          <>
            <Search size={18} />
            Scan Stocks
          </>
        )}
      </button>

      {/* Scan Watchlist Button */}
      <button
        onClick={handleScanWatchlist}
        disabled={isLoading}
        className="w-full bg-emerald-600 text-white rounded-lg py-3 font-medium hover:bg-emerald-700 disabled:bg-emerald-400 transition flex items-center justify-center gap-2"
      >
        {isLoading && scanProgress.includes("Batch") ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {scanProgress}
          </>
        ) : (
          <>
            <ListChecks size={18} />
            Scan Watchlist ({watchlist.length} symbols)
          </>
        )}
      </button>

      {/* Scan Trending Button */}
      <button
        onClick={handleScanTrending}
        disabled={isLoading}
        className="w-full bg-amber-500 text-white rounded-lg py-3 font-medium hover:bg-amber-600 disabled:bg-amber-300 transition flex items-center justify-center gap-2"
      >
        {isLoading && scanProgress.includes("trending") ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {scanProgress}
          </>
        ) : (
          <>
            <TrendingUp size={18} />
            Scan Trending Stocks
          </>
        )}
      </button>

      <p className="text-xs text-gray-400 flex items-center gap-1">
        <ListChecks size={14} /> Tap the list icon to edit watchlist symbols
      </p>

      {/* Error */}
      {scanError && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
          scanResults.length > 0 ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"
        }`}>
          <AlertTriangle size={16} />
          <span className="flex-1">{scanError}</span>
          <button onClick={() => setScanError(null)}><X size={16} /></button>
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {scanResults.map((item) => (
          <ScanResultCard key={item.ticker} item={item} strategyFilter={selectedStrategy} />
        ))}
      </div>

      {/* Tuner Dialog */}
      {showTuner && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowTuner(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Tune Strategy Engine</h2>
            <div>
              <label className="text-sm text-gray-600">CSP Target Delta</label>
              <input value={targetDelta} onChange={(e) => setTargetDelta(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" />
            </div>
            <div>
              <label className="text-sm text-gray-600">Min. Monthly ROC (%)</label>
              <input value={minRoc} onChange={(e) => setMinRoc(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" />
            </div>
            <button onClick={() => setShowTuner(false)} className="w-full bg-indigo-600 text-white rounded-lg py-2 font-medium">Apply</button>
          </div>
        </div>
      )}

      {/* Watchlist Dialog */}
      {showWatchlist && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowWatchlist(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Edit Watchlist</h2>
            <p className="text-sm text-gray-500">Enter ticker symbols separated by commas or spaces.</p>
            <textarea
              value={watchlistText}
              onChange={(e) => setWatchlistText(e.target.value.toUpperCase())}
              rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="AAPL, MSFT, TSLA..."
            />
            <div className="flex gap-2">
              <button onClick={() => setShowWatchlist(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={saveWatchlist} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
