"use client";
import { useEffect, useMemo, useState } from "react";
import { scanWatchlistParallel, scanTickers, scanTrending } from "@/lib/api";
import { DEFAULT_WATCHLIST, STRATEGY_OPTIONS } from "@/lib/constants";
import type { ScanResultItem } from "@/lib/types";
import type { AiCrossValidation } from "@/lib/aiReasoning";
import { ScanResultCard } from "@/components/ScanResultCard";
import { MetricLegendDialog } from "@/components/MetricLegendDialog";
import { GeminiChatPanel } from "@/components/GeminiChatPanel";
import {
  recommendationBucket,
  recommendationChipClass,
  recommendationInactiveClass,
  isBuyRated,
  MAX_AUTO_AI_VALIDATIONS,
  type RecommendationBucket,
} from "@/lib/recommendation";
import { lastScanContext } from "@/lib/scanContext";
import { getAllStoredAiKeys } from "@/lib/aiKeys";
import { Settings, ListChecks, Search, Loader2, AlertTriangle, X, TrendingUp, MessageCircle } from "lucide-react";

type FilterChip = "All" | RecommendationBucket;

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
  const [showLegend, setShowLegend] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterChip>("All");
  const [aiValidations, setAiValidations] = useState<Record<string, AiCrossValidation>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [chatIncludeContext, setChatIncludeContext] = useState(true);

  // Mirror state to LastScanContext so the chat overlay sees the same data.
  useEffect(() => {
    lastScanContext.setResults(scanResults);
  }, [scanResults]);
  useEffect(() => {
    lastScanContext.setAiValidations(aiValidations);
  }, [aiValidations]);
  useEffect(() => {
    lastScanContext.setActiveFilter(activeFilter === "All" ? null : activeFilter);
  }, [activeFilter]);

  const strategyParam = (s: string): string | undefined => {
    switch (s) {
      case "CSPs": return "csp";
      case "Diagonals": return "diagonal";
      case "Verticals": return "vertical";
      case "Long LEAPS": return "long_leaps";
      default: return undefined;
    }
  };

  const triggerAiValidation = async (ticker: string) => {
    if (aiValidations[ticker] || aiLoading[ticker]) return;
    setAiLoading((m) => ({ ...m, [ticker]: true }));
    setAiErrors((m) => {
      const copy = { ...m };
      delete copy[ticker];
      return copy;
    });
    try {
      const resp = await fetch("/api/ai-cross-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, keys: getAllStoredAiKeys() }),
      });
      const json = (await resp.json()) as
        | { validation: AiCrossValidation }
        | { error: string };
      if ("error" in json) {
        setAiErrors((m) => ({ ...m, [ticker]: json.error }));
      } else {
        setAiValidations((m) => ({ ...m, [ticker]: json.validation }));
      }
    } catch (e) {
      setAiErrors((m) => ({
        ...m,
        [ticker]: e instanceof Error ? e.message : "AI request failed",
      }));
    } finally {
      setAiLoading((m) => {
        const copy = { ...m };
        delete copy[ticker];
        return copy;
      });
    }
  };

  // Auto-trigger AI for buy-rated results, capped by MAX_AUTO_AI_VALIDATIONS.
  useEffect(() => {
    if (scanResults.length === 0) return;
    const candidates = scanResults
      .filter((r) => isBuyRated(r.stock_recommendation, r.overall))
      .slice(0, MAX_AUTO_AI_VALIDATIONS);
    for (const r of candidates) {
      if (!aiValidations[r.ticker] && !aiLoading[r.ticker]) {
        void triggerAiValidation(r.ticker);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanResults]);

  const handleScanStocks = async () => {
    if (!manualTicker.trim()) return;
    setIsLoading(true);
    setScanResults([]);
    setScanError(null);
    setAiValidations({});
    setAiErrors({});
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
    setAiValidations({});
    setAiErrors({});
    const strat = strategyParam(selectedStrategy);
    setScanProgress(`Starting watchlist scan...`);
    try {
      const combined = await scanWatchlistParallel(
        watchlist,
        strat,
        (partial) => setScanResults(partial),
        (p) =>
          setScanProgress(
            `Scanning ${p.scanned}/${p.total} symbols (${p.chunkCount} parallel jobs)...`
          )
      );
      if (combined.length === 0) {
        setScanError(
          "No opportunities found. Try adjusting tuner parameters or your watchlist."
        );
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
    setAiValidations({});
    setAiErrors({});
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

  const bucketCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of scanResults) {
      const b = recommendationBucket(r.stock_recommendation, r.overall);
      m[b] = (m[b] || 0) + 1;
    }
    return m;
  }, [scanResults]);

  const filterChips: FilterChip[] = useMemo(() => {
    const order: FilterChip[] = ["All", "STRONG BUY", "BUY", "HOLD", "SELL", "AVOID", "OTHER"];
    return order.filter((c) => c === "All" || (bucketCounts[c] ?? 0) > 0);
  }, [bucketCounts]);

  const visibleResults = useMemo(() => {
    if (activeFilter === "All") return scanResults;
    return scanResults.filter(
      (r) => recommendationBucket(r.stock_recommendation, r.overall) === activeFilter
    );
  }, [scanResults, activeFilter]);

  return (
    <div className={`flex flex-col ${chatOpen ? "h-[calc(100vh-7rem)]" : ""}`}>
      <div className={`space-y-4 ${chatOpen ? "flex-[0_0_40%] overflow-y-auto pr-1 min-h-0" : ""}`}>
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <select
          value={selectedStrategy}
          onChange={(e) => setSelectedStrategy(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {STRATEGY_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => { setWatchlistText(watchlist.join(", ")); setShowWatchlist(true); }}
          className="p-2 sm:p-2.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
          title="Edit Watchlist"
        >
          <ListChecks className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <button
          onClick={() => setShowTuner(true)}
          className="p-2 sm:p-2.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
          title="Tune Strategy"
        >
          <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      <input
        type="text"
        value={manualTicker}
        onChange={(e) => setManualTicker(e.target.value.toUpperCase())}
        placeholder="Ticker (e.g. TSLA, AMD)"
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:py-3 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        onKeyDown={(e) => e.key === "Enter" && handleScanStocks()}
      />

      <button
        onClick={handleScanStocks}
        disabled={isLoading}
        className="w-full bg-indigo-600 text-white rounded-lg py-3 sm:py-3.5 text-sm sm:text-base font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition flex items-center justify-center gap-2"
      >
        {isLoading && scanProgress.includes("Scanning") && !scanProgress.includes("symbols") ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            {scanProgress}
          </>
        ) : (
          <>
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            Scan Stocks
          </>
        )}
      </button>

      <button
        onClick={handleScanWatchlist}
        disabled={isLoading}
        className="w-full bg-emerald-600 text-white rounded-lg py-3 sm:py-3.5 text-sm sm:text-base font-medium hover:bg-emerald-700 disabled:bg-emerald-400 transition flex items-center justify-center gap-2"
      >
        {isLoading && (scanProgress.includes("symbols") || scanProgress.includes("Starting")) ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            {scanProgress}
          </>
        ) : (
          <>
            <ListChecks className="w-4 h-4 sm:w-5 sm:h-5" />
            Scan Watchlist ({watchlist.length} symbols)
          </>
        )}
      </button>

      <button
        onClick={handleScanTrending}
        disabled={isLoading}
        className="w-full bg-amber-500 text-white rounded-lg py-3 sm:py-3.5 text-sm sm:text-base font-medium hover:bg-amber-600 disabled:bg-amber-300 transition flex items-center justify-center gap-2"
      >
        {isLoading && scanProgress.includes("trending") ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            {scanProgress}
          </>
        ) : (
          <>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            Scan Trending Stocks
          </>
        )}
      </button>

      <p className="text-xs sm:text-sm text-gray-400 flex items-center gap-1">
        <ListChecks className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Tap the list icon to edit watchlist symbols
      </p>

      {/* Filter chips with counts */}
      {scanResults.length > 0 && filterChips.length > 1 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          {filterChips.map((c) => {
            const isActive = activeFilter === c;
            const count = c === "All" ? scanResults.length : bucketCounts[c] ?? 0;
            return (
              <button
                key={c}
                onClick={() => setActiveFilter(c)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                  isActive ? recommendationChipClass(c) : recommendationInactiveClass(c)
                }`}
              >
                {c} · {count}
              </button>
            );
          })}
        </div>
      )}

      {scanError && (
        <div className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm ${
          scanResults.length > 0 ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"
        }`}>
          <AlertTriangle size={16} />
          <span className="flex-1">{scanError}</span>
          <button onClick={() => setScanError(null)}><X size={16} /></button>
        </div>
      )}

      <div className="space-y-3">
        {visibleResults.map((item) => (
          <ScanResultCard
            key={item.ticker}
            item={item}
            strategyFilter={selectedStrategy}
            validation={aiValidations[item.ticker]}
            validationLoading={!!aiLoading[item.ticker]}
            validationError={aiErrors[item.ticker]}
            onRunAi={() => triggerAiValidation(item.ticker)}
            onShowLegend={() => setShowLegend(true)}
          />
        ))}
      </div>

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

      {showLegend && <MetricLegendDialog onClose={() => setShowLegend(false)} />}
      </div>

      {/* Split-screen Gemini chat overlay (60% of vertical space) */}
      {chatOpen && (
        <div className="flex-[0_0_60%] mt-3 flex flex-col rounded-xl overflow-hidden border border-indigo-200 shadow-lg bg-white min-h-0">
          <div className="flex items-center justify-between px-3 py-2 bg-indigo-600 text-white text-sm">
            <span className="font-semibold flex items-center gap-2">
              <MessageCircle size={16} /> Gemini · {scanResults.length} results
            </span>
            <div className="flex items-center gap-2.5 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chatIncludeContext}
                  onChange={(e) => setChatIncludeContext(e.target.checked)}
                  className="scale-75"
                />
                Share context
              </label>
              <button
                onClick={() => setChatOpen(false)}
                className="hover:bg-white/20 rounded p-1"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <GeminiChatPanel
              compact
              showContextBanner={false}
              includeScanContext={chatIncludeContext}
              onIncludeScanContextChange={setChatIncludeContext}
            />
          </div>
        </div>
      )}

      {/* Floating Gemini FAB on results */}
      {scanResults.length > 0 && !chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-24 right-4 sm:right-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center z-40 transition"
          aria-label="Open Gemini chat"
          title="Ask Gemini about these results"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}
