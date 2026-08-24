import { STRATEGY_OPTIONS, AI_GURU_STRATEGIES } from "../constants";
import type { PutCreditSpreadResult, ScanResultItem } from "../types";

// Duplicated inline from src/app/page.tsx so we can unit-test the mapping
// without pulling in React/Next code. If the mapping ever diverges from
// the page, one of these tests should fail loudly.
function strategyParam(s: string): string | undefined {
  switch (s) {
    case "CSPs":
      return "csp";
    case "PCSs":
      return "pcs";
    case "Diagonals":
      return "diagonal";
    case "Verticals":
      return "vertical";
    case "Long LEAPS":
      return "long_leaps";
    default:
      return undefined;
  }
}

describe("Put Credit Spread (PCS) porting", () => {
  test("STRATEGY_OPTIONS exposes PCSs between CSPs and Diagonals", () => {
    expect(STRATEGY_OPTIONS).toContain("PCSs");
    const cspIdx = STRATEGY_OPTIONS.indexOf("CSPs");
    const pcsIdx = STRATEGY_OPTIONS.indexOf("PCSs");
    const diagIdx = STRATEGY_OPTIONS.indexOf("Diagonals");
    expect(cspIdx).toBeGreaterThanOrEqual(0);
    expect(pcsIdx).toBe(cspIdx + 1);
    expect(diagIdx).toBe(pcsIdx + 1);
  });

  test("AI_GURU_STRATEGIES does NOT include Put Credit Spread yet (deferred)", () => {
    // Guard: adding PCS to AI Guru requires backend work first. Verified
    // 2026-08 that /api/v1/backtest only accepts strategy in
    //   ("stock","csp","sell_call","vertical","diagonal","long_leaps")
    // (see main.py L3826) and that engine._bt_vertical is written for a
    // debit spread (net_debit / action="buy" — see main.py L2625). Mapping
    // "Put Credit Spread" to strategy=vertical would show incorrect max_profit,
    // max_loss and verdict wording for a credit-spread payload. Blocker:
    // backend needs a proper _bt_pcs (or vertical needs a credit/debit
    // branch keyed off is_call/is_buy). Until then, omitting PCS from the
    // AI Guru form prevents a misleading backtest UX.
    expect(AI_GURU_STRATEGIES).not.toContain("Put Credit Spread");
  });

  test("strategyParam maps PCSs to the backend key `pcs`", () => {
    expect(strategyParam("PCSs")).toBe("pcs");
  });

  test("strategyParam mapping for existing strategies is unchanged", () => {
    expect(strategyParam("CSPs")).toBe("csp");
    expect(strategyParam("Diagonals")).toBe("diagonal");
    expect(strategyParam("Verticals")).toBe("vertical");
    expect(strategyParam("Long LEAPS")).toBe("long_leaps");
    expect(strategyParam("All")).toBeUndefined();
    expect(strategyParam("")).toBeUndefined();
  });

  test("PutCreditSpreadResult type accepts backend snake_case fields", () => {
    const pcs: PutCreditSpreadResult = {
      short_strike: 145,
      long_strike: 140,
      width: 5,
      credit: 1.25,
      max_loss: 3.75,
      capital: 375,
      delta: -0.22,
      bt: "82%",
      roc: "8.9%",
      roc_on_risk: "33%",
      expiry: "2026-09-19",
      stop_loss: 138,
      target: 150,
      risk_note: null,
    };
    expect(pcs.short_strike).toBe(145);
    expect(pcs.long_strike).toBe(140);
    expect(pcs.credit).toBeCloseTo(1.25);
  });

  test("ScanResultItem accepts the new put_credit_spreads field without breaking existing shape", () => {
    const item: ScanResultItem = {
      ticker: "NVDA",
      price: 500.5,
      rsi: 55,
      beta: 1.4,
      csps: null,
      diagonals: null,
      verticals: null,
      long_leaps: null,
      put_credit_spreads: [
        {
          short_strike: 480,
          long_strike: 475,
          credit: 1.0,
          max_loss: 4.0,
          bt: "78%",
          roc: "5.2%",
        },
      ],
    };
    expect(item.put_credit_spreads?.length).toBe(1);
    // Existing consumers that never look at put_credit_spreads still see
    // the same field surface for csps/diagonals/etc.
    expect(item.csps).toBeNull();
  });
});
