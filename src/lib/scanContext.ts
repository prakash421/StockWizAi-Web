"use client";

import { useSyncExternalStore } from "react";
import type { ScanResultItem } from "./types";
import type { AiCrossValidation } from "./aiReasoning";

/**
 * In-memory holder for the most recent scan results so the Gemini chat
 * overlay can use them as conversation context. Mirrors `LastScanContext`
 * in MainActivity.kt.
 */
type Snapshot = {
  results: ScanResultItem[];
  aiValidations: Record<string, AiCrossValidation>;
  activeFilter: string | null;
};

let snapshot: Snapshot = { results: [], aiValidations: {}, activeFilter: null };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const lastScanContext = {
  get(): Snapshot {
    return snapshot;
  },
  setResults(results: ScanResultItem[]): void {
    snapshot = { ...snapshot, results };
    emit();
  },
  setAiValidations(aiValidations: Record<string, AiCrossValidation>): void {
    snapshot = { ...snapshot, aiValidations };
    emit();
  },
  setActiveFilter(activeFilter: string | null): void {
    snapshot = { ...snapshot, activeFilter };
    emit();
  },
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useLastScanContext(): Snapshot {
  return useSyncExternalStore(
    lastScanContext.subscribe,
    lastScanContext.get,
    lastScanContext.get
  );
}

/**
 * Build the system-context string sent to Gemini alongside the user's
 * message. Mirrors `GeminiChatPanelState.buildScanContext()` from
 * NewScreens.kt — compact view of the user's last scan + any AI verdicts.
 */
export function buildScanContext(includeScanContext: boolean): string | null {
  if (!includeScanContext) return null;
  const { results, aiValidations, activeFilter } = snapshot;
  if (results.length === 0) return null;
  const top = results.slice(0, 20);
  const rows = top
    .map((item) => {
      const rsi = item.rsi != null ? item.rsi.toFixed(0) : "?";
      const rec = item.stock_recommendation || item.overall || "-";
      const csp = item.csps?.[0]
        ? ` csp:$${item.csps[0].strike.toFixed(0)}@$${item.csps[0].premium.toFixed(2)}`
        : "";
      const leap = item.long_leaps?.[0]
        ? ` leap:$${item.long_leaps[0].strike.toFixed(0)} exp=${item.long_leaps[0].expiry}`
        : "";
      const ai = aiValidations[item.ticker];
      const aiTag = ai ? ` ai=${ai.consensus}(${ai.agreementPct}%)` : "";
      return `${item.ticker} $${item.price.toFixed(2)} RSI=${rsi} rec=${rec}${csp}${leap}${aiTag}`;
    })
    .join("\n");
  const filterNote =
    activeFilter && activeFilter !== "All"
      ? `\n\nThe user has filtered the list to show only ${activeFilter} results.`
      : "";
  return `You are an in-app assistant for a retail options-trading app called StockWiz AI. The user has just run a scan; here are the top ${top.length} results currently visible on their screen (live data from the backend — do NOT invent prices or strikes from memory):

${rows}${filterNote}

Answer the user's questions concisely. When they reference a ticker that's in the list above, ground your answer in those numbers. When they ask something outside the scan, say so. Keep replies under 150 words unless asked for detail.`;
}
