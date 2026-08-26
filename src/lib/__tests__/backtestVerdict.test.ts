import {
  confidenceLabel,
  isSellStrategy,
  isStockStrategy,
  presentVerdict,
  shouldAutoCrossValidate,
  toBacktestParams,
} from "@/lib/backtestVerdict";

describe("toBacktestParams", () => {
  test("CSP -> csp/sell", () => {
    expect(toBacktestParams("CSP")).toEqual({ strategy: "csp", action: "sell" });
  });
  test("Sell Call -> sell_call/sell", () => {
    expect(toBacktestParams("Sell Call")).toEqual({ strategy: "sell_call", action: "sell" });
  });
  test("Vertical -> vertical/buy", () => {
    expect(toBacktestParams("Vertical")).toEqual({ strategy: "vertical", action: "buy" });
  });
  test("Diagonal -> diagonal/buy", () => {
    expect(toBacktestParams("Diagonal")).toEqual({ strategy: "diagonal", action: "buy" });
  });
  test("Long LEAPS -> long_leaps/buy", () => {
    expect(toBacktestParams("Long LEAPS")).toEqual({ strategy: "long_leaps", action: "buy" });
  });
  test("unknown -> lowercased snake_case buy", () => {
    expect(toBacktestParams("Iron Condor")).toEqual({ strategy: "iron_condor", action: "buy" });
  });
});

describe("isSellStrategy", () => {
  test.each([
    ["csp", true],
    ["sell_call", true],
    ["vertical", false],
    ["diagonal", false],
    ["long_leaps", false],
    ["CSP", true], // case-insensitive
  ])("%s -> %s", (s, expected) => {
    expect(isSellStrategy(s)).toBe(expected);
  });
});

describe("isStockStrategy", () => {
  test("long_leaps is a stock strategy", () => {
    expect(isStockStrategy("long_leaps")).toBe(true);
  });
  test("csp is not", () => {
    expect(isStockStrategy("csp")).toBe(false);
  });
});

describe("presentVerdict sell strategies", () => {
  test("STRONG SELL relabelled to STRONG ENTRY on CSP", () => {
    const p = presentVerdict("STRONG SELL", "csp");
    expect(p.displayVerdict).toBe("STRONG ENTRY");
    expect(p.subtitle).toContain("strongly supports");
  });
  test("SELL relabelled to ENTER TRADE on sell_call", () => {
    expect(presentVerdict("SELL", "sell_call").displayVerdict).toBe("ENTER TRADE");
  });
  test("HOLD relabelled to WAIT on CSP", () => {
    expect(presentVerdict("HOLD", "csp").displayVerdict).toBe("WAIT");
  });
  test("AVOID relabelled to SKIP on CSP", () => {
    expect(presentVerdict("AVOID", "csp").displayVerdict).toBe("SKIP");
  });
  test("unknown verdict passes through uppercased", () => {
    expect(presentVerdict("inconclusive", "csp").displayVerdict).toBe("INCONCLUSIVE");
  });
});

describe("presentVerdict buy strategies", () => {
  test("STRONG BUY stays STRONG BUY on long_leaps", () => {
    const p = presentVerdict("STRONG BUY", "long_leaps");
    expect(p.displayVerdict).toBe("STRONG BUY");
    expect(p.subtitle).toBe("");
  });
  test("SELL stays SELL on vertical (not relabelled)", () => {
    expect(presentVerdict("SELL", "vertical").displayVerdict).toBe("SELL");
  });
});

describe("confidenceLabel", () => {
  test("High -> High Signal Confidence for sell strategy", () => {
    expect(confidenceLabel("High", "csp")).toBe("High Signal Confidence");
  });
  test("Medium -> Mixed Signals for sell strategy", () => {
    expect(confidenceLabel("Medium", "sell_call")).toBe("Mixed Signals");
  });
  test("Low -> Low Confidence for buy strategy", () => {
    expect(confidenceLabel("Low", "long_leaps")).toBe("Low Confidence");
  });
  test("None -> No Confidence for buy strategy", () => {
    expect(confidenceLabel("None", "vertical")).toBe("No Confidence");
  });
});

describe("shouldAutoCrossValidate", () => {
  test.each([
    ["STRONG BUY", true],
    ["STRONG SELL", true],
    ["SELL", true],
    ["BUY", false],
    ["HOLD", false],
    ["AVOID", false],
    ["INCONCLUSIVE", false],
    ["strong buy", true], // case-insensitive
  ])("%s -> %s", (v, expected) => {
    expect(shouldAutoCrossValidate(v)).toBe(expected);
  });
});
