import { NextRequest, NextResponse } from "next/server";
import type { AiCrossValidation, AiEngineResult } from "@/lib/aiReasoning";
import { sanitizeReasoning, extractFirstJsonObject } from "@/lib/aiReasoning";

/**
 * Multi-engine AI cross-validation proxy. Fans out to whichever provider
 * keys are configured in the server environment:
 *   - GEMINI_API_KEY      → Google Gemini
 *   - OPENAI_API_KEY      → OpenAI ChatGPT
 *   - ANTHROPIC_API_KEY   → Anthropic Claude
 *   - PERPLEXITY_API_KEY  → Perplexity
 *   - GROK_API_KEY        → xAI Grok
 *
 * Each engine is asked to return a JSON object
 *   { "verdict": "BUY|SELL|HOLD|AVOID", "confidence": "High|Medium|Low",
 *     "reasoning": "1-2 sentences" }
 * and the consensus is computed in this route. Mirrors the
 * AiCrossValidator object on Android.
 */

export const runtime = "nodejs";

interface UserKeys {
  gemini?: string;
  openai?: string;
  anthropic?: string;
  perplexity?: string;
  grok?: string;
}

interface Body {
  ticker: string;
  /** Optional user-provided keys; override server env vars when present. */
  keys?: UserKeys;
}

const PROMPT = (ticker: string) => `You are evaluating ${ticker} for an options-selling retail trader. Answer ONLY with a single JSON object on one line, no commentary:
{"verdict":"BUY"|"SELL"|"HOLD"|"AVOID","confidence":"High"|"Medium"|"Low","reasoning":"<1-2 sentences citing earnings, momentum, or risk>"}`;

function parseEngineJson(engine: string, text: string): AiEngineResult {
  const jsonStr = extractFirstJsonObject(text) ?? text.trim();
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return {
      engine,
      verdict: String(parsed.verdict ?? "N/A").toUpperCase().trim(),
      confidence: String(parsed.confidence ?? "N/A").trim(),
      reasoning: sanitizeReasoning(String(parsed.reasoning ?? "")),
    };
  } catch {
    const m = text.match(/\b(BUY|SELL|HOLD|AVOID)\b/i);
    return {
      engine,
      verdict: m ? m[1].toUpperCase() : "N/A",
      confidence: "Low",
      reasoning: sanitizeReasoning(text),
    };
  }
}

async function callGemini(ticker: string, key: string): Promise<AiEngineResult> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${encodeURIComponent(key)}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: PROMPT(ticker) }] }] }),
    });
    const json = (await resp.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      error?: { message?: string };
    };
    if (!resp.ok) {
      return engineErr("Gemini", json.error?.message || `HTTP ${resp.status}`);
    }
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return parseEngineJson("Gemini", text);
  } catch (e) {
    return engineErr("Gemini", e instanceof Error ? e.message : "request failed");
  }
}

async function callOpenAI(ticker: string, key: string): Promise<AiEngineResult> {
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: PROMPT(ticker) }],
        response_format: { type: "json_object" },
      }),
    });
    const json = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    if (!resp.ok) {
      return engineErr("ChatGPT", json.error?.message || `HTTP ${resp.status}`);
    }
    const text = json.choices?.[0]?.message?.content ?? "";
    return parseEngineJson("ChatGPT", text);
  } catch (e) {
    return engineErr("ChatGPT", e instanceof Error ? e.message : "request failed");
  }
}

async function callClaude(ticker: string, key: string): Promise<AiEngineResult> {
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 300,
        messages: [{ role: "user", content: PROMPT(ticker) }],
      }),
    });
    const json = (await resp.json()) as {
      content?: { text?: string }[];
      error?: { message?: string };
    };
    if (!resp.ok) {
      return engineErr("Claude", json.error?.message || `HTTP ${resp.status}`);
    }
    const text = json.content?.map((p) => p.text ?? "").join("") ?? "";
    return parseEngineJson("Claude", text);
  } catch (e) {
    return engineErr("Claude", e instanceof Error ? e.message : "request failed");
  }
}

async function callPerplexity(ticker: string, key: string): Promise<AiEngineResult> {
  try {
    const resp = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: PROMPT(ticker) }],
      }),
    });
    const json = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    if (!resp.ok) {
      return engineErr("Perplexity", json.error?.message || `HTTP ${resp.status}`);
    }
    const text = json.choices?.[0]?.message?.content ?? "";
    return parseEngineJson("Perplexity", text);
  } catch (e) {
    return engineErr("Perplexity", e instanceof Error ? e.message : "request failed");
  }
}

async function callGrok(ticker: string, key: string): Promise<AiEngineResult> {
  try {
    const resp = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "grok-2-latest",
        messages: [{ role: "user", content: PROMPT(ticker) }],
      }),
    });
    const json = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    if (!resp.ok) {
      return engineErr("Grok", json.error?.message || `HTTP ${resp.status}`);
    }
    const text = json.choices?.[0]?.message?.content ?? "";
    return parseEngineJson("Grok", text);
  } catch (e) {
    return engineErr("Grok", e instanceof Error ? e.message : "request failed");
  }
}

function engineErr(engine: string, message: string): AiEngineResult {
  return { engine, verdict: "N/A", confidence: "N/A", reasoning: "", error: message };
}

function normalizeVerdict(v: string): string {
  const u = v.toUpperCase();
  if (u.includes("STRONG BUY") || u === "BUY") return "BUY";
  if (u === "SELL" || u.includes("STRONG SELL")) return "SELL";
  if (u === "HOLD") return "HOLD";
  if (u === "AVOID") return "AVOID";
  return "HOLD";
}

function buildConsensus(ticker: string, engines: AiEngineResult[]): AiCrossValidation {
  const successful = engines.filter((e) => !e.error && e.verdict !== "N/A");
  if (successful.length === 0) {
    return {
      ticker,
      engines,
      consensus: "UNAVAILABLE",
      agreementPct: 0,
      summary: "AI cross-validation failed — check API keys",
    };
  }
  const counts = new Map<string, number>();
  for (const e of successful) {
    const v = normalizeVerdict(e.verdict);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [topVerdict, topCount] = sorted[0];
  const agreement = Math.round((topCount * 100) / successful.length);
  let consensus = topVerdict;
  if (agreement >= 75 && topVerdict === "BUY") consensus = "STRONG BUY";
  else if (agreement < 50) consensus = "MIXED";
  const summary = `${topCount}/${successful.length} AI engines rate ${ticker} as ${topVerdict}.`;
  return { ticker, engines, consensus, agreementPct: agreement, summary };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const ticker = (body.ticker || "").trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "Missing 'ticker'" }, { status: 400 });
  }

  const userKeys = body.keys ?? {};
  const pick = (user: string | undefined, env: string | undefined): string | undefined => {
    const u = (user ?? "").trim();
    if (u) return u;
    const e = (env ?? "").trim();
    return e || undefined;
  };

  const geminiKey = pick(userKeys.gemini, process.env.GEMINI_API_KEY);
  const openaiKey = pick(userKeys.openai, process.env.OPENAI_API_KEY);
  const anthropicKey = pick(userKeys.anthropic, process.env.ANTHROPIC_API_KEY);
  const perplexityKey = pick(userKeys.perplexity, process.env.PERPLEXITY_API_KEY);
  const grokKey = pick(userKeys.grok, process.env.GROK_API_KEY);

  const calls: Promise<AiEngineResult>[] = [];
  if (geminiKey) calls.push(callGemini(ticker, geminiKey));
  if (openaiKey) calls.push(callOpenAI(ticker, openaiKey));
  if (anthropicKey) calls.push(callClaude(ticker, anthropicKey));
  if (perplexityKey) calls.push(callPerplexity(ticker, perplexityKey));
  if (grokKey) calls.push(callGrok(ticker, grokKey));

  if (calls.length === 0) {
    return NextResponse.json(
      {
        error:
          "No AI engine keys available. Add at least one key in the AI Keys dialog (top bar) or set one on the server (GEMINI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY / PERPLEXITY_API_KEY / GROK_API_KEY).",
      },
      { status: 503 }
    );
  }

  const engines = await Promise.all(calls);
  const validation = buildConsensus(ticker, engines);
  return NextResponse.json({ validation });
}
