import type { BacktestResponse } from "@/lib/types";
import { mergeCfComboResponses } from "@/lib/cfCombo";

function bt(overrides: Partial<BacktestResponse> = {}): BacktestResponse {
  return {
    verdict: "HOLD",
    confidence: "Medium",
    summary: "",
    ...overrides,
  };
}

describe("mergeCfComboResponses", () => {
  it("STRONG BUY when call=STRONG BUY and put=STRONG SELL", () => {
    const merged = mergeCfComboResponses(
      bt({ verdict: "STRONG BUY", confidence: "High" }),
      bt({ verdict: "STRONG SELL", confidence: "High" }),
      120,
      100,
      3.0,
      2.5,
      "2026-12-19",
    );
    expect(merged.verdict).toBe("STRONG BUY");
    expect(merged.confidence).toBe("High");
  });

  it("BUY when both legs positive but not strong", () => {
    const merged = mergeCfComboResponses(
      bt({ verdict: "BUY", confidence: "Medium" }),
      bt({ verdict: "SELL", confidence: "Medium" }),
      120,
      100,
      3.0,
      2.5,
      "2026-12-19",
    );
    expect(merged.verdict).toBe("BUY");
  });

  it("HOLD when one leg is HOLD", () => {
    const merged = mergeCfComboResponses(
      bt({ verdict: "BUY", confidence: "High" }),
      bt({ verdict: "HOLD", confidence: "Low" }),
      120,
      100,
      3.0,
      2.5,
      "2026-12-19",
    );
    expect(merged.verdict).toBe("HOLD");
    expect(merged.confidence).toBe("Low");
  });

  it("AVOID when both legs negative", () => {
    const merged = mergeCfComboResponses(
      bt({ verdict: "AVOID", confidence: "Low" }),
      bt({ verdict: "AVOID", confidence: "Low" }),
      120,
      100,
      3.0,
      2.5,
      "2026-12-19",
    );
    expect(merged.verdict).toBe("AVOID");
  });

  it("adds self-funded signal when put premium >= call premium", () => {
    const merged = mergeCfComboResponses(
      bt({ verdict: "BUY", confidence: "Medium" }),
      bt({ verdict: "SELL", confidence: "Medium" }),
      120,
      100,
      2.0,
      2.5, // put premium > call premium
      "2026-12-19",
    );
    expect(merged.signals ?? []).toEqual(
      expect.arrayContaining(["Self-funded combo (put premium ≥ call cost)"]),
    );
  });

  it("adds coverage-pct signal when >=50%", () => {
    const merged = mergeCfComboResponses(
      bt({ verdict: "BUY", confidence: "Medium" }),
      bt({ verdict: "SELL", confidence: "Medium" }),
      120,
      100,
      4.0,
      2.0, // 50% coverage
      "2026-12-19",
    );
    expect((merged.signals ?? []).some((s) => s.includes("50% of call debit"))).toBe(true);
  });

  it("adds put-strike-above-call warning", () => {
    const merged = mergeCfComboResponses(
      bt({ verdict: "BUY", confidence: "High" }),
      bt({ verdict: "SELL", confidence: "High" }),
      100,
      120, // invalid: put > call
      3.0,
      2.5,
      "2026-12-19",
    );
    expect((merged.warnings ?? []).some((w) => w.includes("Put strike should be below call strike"))).toBe(true);
  });

  it("prefixes leg signals + warnings + summaries", () => {
    const merged = mergeCfComboResponses(
      bt({
        verdict: "BUY",
        summary: "Call leg body",
        signals: ["Golden cross"],
        warnings: ["High IV"],
      }),
      bt({
        verdict: "SELL",
        summary: "Put leg body",
        signals: ["Support hold"],
        warnings: ["Earnings soon"],
      }),
      120,
      100,
      3.0,
      2.5,
      "2026-12-19",
    );
    expect(merged.signals ?? []).toEqual(
      expect.arrayContaining(["Call: Golden cross", "Put: Support hold"]),
    );
    expect(merged.warnings ?? []).toEqual(
      expect.arrayContaining(["Call: High IV", "Put: Earnings soon"]),
    );
    expect(merged.summary).toContain("Call leg: Call leg body");
    expect(merged.summary).toContain("Put leg: Put leg body");
  });

  it("takes lower of the two confidences", () => {
    const merged = mergeCfComboResponses(
      bt({ verdict: "BUY", confidence: "High" }),
      bt({ verdict: "SELL", confidence: "Low" }),
      120,
      100,
      3.0,
      2.5,
      "2026-12-19",
    );
    expect(merged.confidence).toBe("Low");
  });

  it("computes net debit summary correctly", () => {
    const merged = mergeCfComboResponses(
      bt({ verdict: "BUY", confidence: "Medium" }),
      bt({ verdict: "SELL", confidence: "Medium" }),
      120,
      100,
      3.0,
      2.5,
      "2026-12-19",
    );
    // Net debit per share = 3.0 - 2.5 = 0.50
    expect(merged.summary).toContain("$0.50/share");
    expect(merged.summary).toContain("$50/contract");
    // Coverage = 2.5/3.0 = 83%
    expect(merged.summary).toMatch(/83% of call cost/);
    expect(merged.summary).toContain("exp 2026-12-19");
  });

  it("handles a single missing leg gracefully", () => {
    const merged = mergeCfComboResponses(
      bt({ verdict: "BUY", confidence: "High", price: 105, rsi: 55 }),
      null,
      120,
      100,
      3.0,
      2.5,
      "2026-12-19",
    );
    expect(merged.price).toBe(105);
    expect(merged.rsi).toBe(55);
    expect(merged.warnings ?? []).toEqual(
      expect.arrayContaining([expect.stringContaining("CSP leg backtest is weak")]),
    );
  });
});
