import { earningsChip, dailyChangeClass } from "@/lib/scanFormat";
import type { AnalystTarget, ScanResultItem } from "@/lib/types";

// Pin the clock so day-diff maths stays deterministic.
const NOW = Date.UTC(2026, 7, 23, 12, 0, 0);

describe("earningsChip", () => {
  test("returns null for missing or unparseable dates", () => {
    expect(earningsChip(null, NOW)).toBeNull();
    expect(earningsChip(undefined, NOW)).toBeNull();
    expect(earningsChip("", NOW)).toBeNull();
    expect(earningsChip("not-a-date", NOW)).toBeNull();
  });

  test("today -> urgent red 'Earnings today'", () => {
    const c = earningsChip("2026-08-23", NOW);
    expect(c).not.toBeNull();
    expect(c!.label).toBe("Earnings today");
    expect(c!.className).toMatch(/red/);
    expect(c!.urgent).toBe(true);
  });

  test("within a week -> urgent red 'Earnings in Nd'", () => {
    const c = earningsChip("2026-08-26", NOW); // 3 days
    expect(c!.label).toBe("Earnings in 3d");
    expect(c!.className).toMatch(/red/);
    expect(c!.urgent).toBe(true);
  });

  test("8-14 days -> amber warning", () => {
    const c = earningsChip("2026-09-04", NOW); // 12 days
    expect(c!.label).toBe("Earnings in 12d");
    expect(c!.className).toMatch(/amber/);
    expect(c!.urgent).toBe(false);
  });

  test("beyond 14 days -> neutral gray", () => {
    const c = earningsChip("2026-10-01", NOW); // ~39 days
    expect(c!.label).toMatch(/^Earnings in \d+d$/);
    expect(c!.className).toMatch(/gray/);
    expect(c!.urgent).toBe(false);
  });

  test("past dates -> neutral gray with date label", () => {
    const c = earningsChip("2026-08-01", NOW);
    expect(c!.label).toBe("Earnings 2026-08-01");
    expect(c!.className).toMatch(/gray/);
    expect(c!.urgent).toBe(false);
  });
});

describe("dailyChangeClass", () => {
  test("null / undefined return null", () => {
    expect(dailyChangeClass(null)).toBeNull();
    expect(dailyChangeClass(undefined)).toBeNull();
  });

  test("positive -> green, negative -> red, zero -> gray", () => {
    expect(dailyChangeClass(1.5)).toMatch(/green/);
    expect(dailyChangeClass(-0.4)).toMatch(/red/);
    expect(dailyChangeClass(0)).toMatch(/gray/);
  });
});

describe("Phase 2: extended ScanResultItem fields are optional/additive", () => {
  test("ScanResultItem still accepts pre-Phase-2 shape (no new fields)", () => {
    const legacy: ScanResultItem = {
      ticker: "AAPL",
      price: 210,
      rsi: 55,
      beta: 1.1,
    };
    expect(legacy.ticker).toBe("AAPL");
    // Extended fields are all optional — absence is legal.
    expect(legacy.analyst_target).toBeUndefined();
    expect(legacy.sector).toBeUndefined();
    expect(legacy.daily_change_pct).toBeUndefined();
    expect(legacy.next_earnings_date).toBeUndefined();
    expect(legacy.company_name).toBeUndefined();
  });

  test("AnalystTarget shape mirrors backend res['analyst_target']", () => {
    const at: AnalystTarget = {
      mean: 250.5,
      low: 200,
      high: 300,
      num_analysts: 42,
      upside_pct: 19.3,
      consensus: "Buy",
    };
    expect(at.mean).toBe(250.5);
    expect(at.consensus).toBe("Buy");
  });

  test("ScanResultItem accepts all Phase-2 additive fields", () => {
    const item: ScanResultItem = {
      ticker: "NVDA",
      price: 500,
      rsi: 60,
      beta: 1.4,
      company_name: "NVIDIA Corp",
      sector: "Technology",
      daily_change_pct: 2.35,
      next_earnings_date: "2026-11-19",
      analyst_target: {
        mean: 620,
        upside_pct: 24,
        consensus: "Strong Buy",
        num_analysts: 55,
      },
    };
    expect(item.company_name).toBe("NVIDIA Corp");
    expect(item.sector).toBe("Technology");
    expect(item.daily_change_pct).toBeCloseTo(2.35);
    expect(item.analyst_target?.consensus).toBe("Strong Buy");
  });
});
