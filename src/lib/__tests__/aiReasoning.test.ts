import {
  sanitizeReasoning,
  pickHighlightReasoning,
  AiEngineResult,
  AiCrossValidation,
} from "@/lib/aiReasoning";

describe("sanitizeReasoning", () => {
  test("emptyStringStaysEmpty", () => {
    expect(sanitizeReasoning("")).toBe("");
    expect(sanitizeReasoning("   ")).toBe("");
  });

  test("stripsCodeFences", () => {
    const raw = "```json\nStrong upside on guidance beat.\n```";
    expect(sanitizeReasoning(raw)).toBe("Strong upside on guidance beat.");
  });

  test("extractsReasoningFromJsonBlob", () => {
    const raw = `{"verdict":"BUY","confidence":"High","reasoning":"Solid earnings beat with raised guidance."}`;
    expect(sanitizeReasoning(raw)).toBe("Solid earnings beat with raised guidance.");
  });

  test("handlesEscapedQuotesInsideJson", () => {
    const raw = `{"verdict":"BUY","reasoning":"They said \\"beat the street\\" three times."}`;
    const out = sanitizeReasoning(raw);
    expect(out).toContain('"beat the street"');
  });

  test("collapsesWhitespace", () => {
    const raw = "Strong\n\nupside\t   on    guidance";
    expect(sanitizeReasoning(raw)).toBe("Strong upside on guidance");
  });

  test("capsExcessiveLength", () => {
    const raw = "x".repeat(1000);
    const out = sanitizeReasoning(raw);
    expect(out.length).toBeLessThanOrEqual(400);
    expect(out.endsWith("…")).toBe(true);
  });
});

function engine(
  name: string,
  verdict: string,
  confidence: string,
  reasoning: string,
  error: string | null = null
): AiEngineResult {
  return { engine: name, verdict, confidence, reasoning, error };
}

describe("pickHighlightReasoning", () => {
  test("returnsNullWhenNoReasoning", () => {
    const v: AiCrossValidation = {
      ticker: "TSLA",
      engines: [engine("Claude", "BUY", "High", ""), engine("Gemini", "BUY", "Medium", "")],
      consensus: "BUY",
      agreementPct: 100,
      summary: "",
    };
    expect(pickHighlightReasoning(v)).toBeNull();
  });

  test("prefersConsensusMatchingEngine", () => {
    const v: AiCrossValidation = {
      ticker: "TSLA",
      engines: [
        engine("Claude", "HOLD", "High", "Mixed signals."),
        engine("Gemini", "BUY", "Medium", "Earnings beat."),
        engine("Grok", "BUY", "Low", "Momentum."),
      ],
      consensus: "BUY",
      agreementPct: 66,
      summary: "",
    };
    const pick = pickHighlightReasoning(v);
    expect(pick).not.toBeNull();
    expect(pick!.engine).toBe("Gemini");
  });

  test("strongBuyMatchesPlainBuyEngines", () => {
    const v: AiCrossValidation = {
      ticker: "NVDA",
      engines: [engine("ChatGPT", "BUY", "High", "Earnings beat & guide raise.")],
      consensus: "STRONG BUY",
      agreementPct: 100,
      summary: "",
    };
    const pick = pickHighlightReasoning(v);
    expect(pick).not.toBeNull();
    expect(pick!.engine).toBe("ChatGPT");
  });

  test("fallsBackToAnyReasoningWhenNoMatch", () => {
    const v: AiCrossValidation = {
      ticker: "AMC",
      engines: [
        engine("Claude", "HOLD", "High", "Range-bound."),
        engine("Gemini", "SELL", "Medium", "Trend break."),
      ],
      consensus: "BUY",
      agreementPct: 0,
      summary: "",
    };
    const pick = pickHighlightReasoning(v);
    expect(pick).not.toBeNull();
    expect(pick!.engine).toBe("Claude");
  });

  test("skipsErroredEngines", () => {
    const v: AiCrossValidation = {
      ticker: "TSLA",
      engines: [
        engine("Claude", "N/A", "N/A", "leaked partial response", "HTTP 500"),
        engine("Gemini", "BUY", "Medium", "Solid setup."),
      ],
      consensus: "BUY",
      agreementPct: 100,
      summary: "",
    };
    const pick = pickHighlightReasoning(v);
    expect(pick).not.toBeNull();
    expect(pick!.engine).toBe("Gemini");
  });
});
