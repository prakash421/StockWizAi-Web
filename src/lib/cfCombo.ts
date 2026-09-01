// Client-side port of Kotlin `mergeCfComboResponses` (MainActivity.kt L1432).
// Merges a long-call BUY backtest + CSP SELL backtest on a shared expiry
// into a single synthetic verdict for the CSP-Funded Call combo.

import type { BacktestResponse } from "./types";

function tier(verdict: string | null | undefined, isSell: boolean): number {
  const v = (verdict ?? "").toUpperCase();
  if (!v) return -2;
  if (isSell && v.includes("STRONG SELL")) return 2;
  if (isSell && v.includes("SELL")) return 1;
  if (!isSell && v.includes("STRONG BUY")) return 2;
  if (!isSell && v.includes("BUY")) return 1;
  if (v.includes("HOLD")) return 0;
  return -1;
}

const CONF_RANK: Record<string, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
  None: 0,
};

export function mergeCfComboResponses(
  callRes: BacktestResponse | null,
  putRes: BacktestResponse | null,
  callStrike: number,
  putStrike: number,
  callPrem: number,
  putPrem: number,
  expiry: string,
): BacktestResponse {
  const callTier = tier(callRes?.verdict, false);
  const putTier = tier(putRes?.verdict, true);

  let mergedVerdict: string;
  if (callTier >= 2 && putTier >= 2) mergedVerdict = "STRONG BUY";
  else if (callTier >= 1 && putTier >= 1) mergedVerdict = "BUY";
  else if (callTier <= -1 && putTier <= -1) mergedVerdict = "AVOID";
  else mergedVerdict = "HOLD";

  const cConf = callRes?.confidence ?? "None";
  const pConf = putRes?.confidence ?? "None";
  const mergedConfidence =
    (CONF_RANK[cConf] ?? 0) <= (CONF_RANK[pConf] ?? 0) ? cConf : pConf;

  const netDebitPerShare = callPrem - putPrem;
  const netDebitContract = netDebitPerShare * 100.0;
  const coveragePct =
    callPrem > 0 ? Math.min((putPrem / callPrem) * 100.0, 999.0) : 0.0;
  const maxLossPerShare = putStrike - putPrem + Math.max(0, netDebitPerShare);

  const summaryHeader =
    `CSP-Funded Call combo · exp ${expiry} · ` +
    `BUY $${callStrike.toFixed(2)} call @ $${callPrem.toFixed(2)} · ` +
    `SELL $${putStrike.toFixed(2)} put @ $${putPrem.toFixed(2)}`;
  const economics =
    `Net debit ≈ $${netDebitPerShare.toFixed(2)}/share ` +
    `($${netDebitContract.toFixed(0)}/contract). ` +
    `Put premium covers ${coveragePct.toFixed(0)}% of call cost. ` +
    `Max loss if assigned ≈ $${maxLossPerShare.toFixed(2)}/share at put strike.`;

  const summaryParts: string[] = [summaryHeader, economics];
  if (callRes?.summary && callRes.summary.trim())
    summaryParts.push(`Call leg: ${callRes.summary}`);
  if (putRes?.summary && putRes.summary.trim())
    summaryParts.push(`Put leg: ${putRes.summary}`);
  const mergedSummary = summaryParts.join("\n\n");

  const signals: string[] = [];
  if (netDebitPerShare <= 0)
    signals.push("Self-funded combo (put premium ≥ call cost)");
  if (coveragePct >= 50)
    signals.push(
      `Put premium covers ${coveragePct.toFixed(0)}% of call debit`,
    );
  (callRes?.signals ?? []).forEach((s) => signals.push(`Call: ${s}`));
  (putRes?.signals ?? []).forEach((s) => signals.push(`Put: ${s}`));

  const warnings: string[] = [];
  if (callTier <= 0)
    warnings.push(
      `Long call leg backtest is weak (verdict: ${callRes?.verdict ?? "N/A"})`,
    );
  if (putTier <= 0)
    warnings.push(
      `CSP leg backtest is weak (verdict: ${putRes?.verdict ?? "N/A"})`,
    );
  if (putStrike >= callStrike)
    warnings.push("Put strike should be below call strike for this combo");
  (callRes?.warnings ?? []).forEach((w) => warnings.push(`Call: ${w}`));
  (putRes?.warnings ?? []).forEach((w) => warnings.push(`Put: ${w}`));

  const btParts: string[] = [];
  if (callRes?.backtest_score) btParts.push(`Call BT ${callRes.backtest_score}`);
  if (putRes?.backtest_score) btParts.push(`Put BT ${putRes.backtest_score}`);

  return {
    verdict: mergedVerdict,
    confidence: mergedConfidence,
    summary: mergedSummary,
    backtest_score: btParts.length > 0 ? btParts.join(" · ") : undefined,
    price: callRes?.price ?? putRes?.price,
    rsi: callRes?.rsi ?? putRes?.rsi,
    signals,
    warnings,
    levels: callRes?.levels ?? putRes?.levels,
    learning: undefined,
  };
}
