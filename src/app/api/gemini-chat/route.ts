import { NextRequest, NextResponse } from "next/server";

/**
 * Minimal Gemini chat proxy. Set GEMINI_API_KEY in the Vercel
 * environment to enable; otherwise returns a clear configuration error so
 * the UI can surface it.
 *
 * Body: { history: { role: "user"|"model", text: string }[], message: string,
 *         systemContext?: string | null }
 */
export const runtime = "nodejs";

interface ChatTurn {
  role: "user" | "model";
  text: string;
}
interface Body {
  history?: ChatTurn[];
  message: string;
  systemContext?: string | null;
  /** Optional user-provided Gemini key; overrides GEMINI_API_KEY when present. */
  geminiKey?: string;
}

const MODEL = "gemini-1.5-flash-latest";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json({ error: "Missing 'message'" }, { status: 400 });
  }

  const userKey = (body.geminiKey ?? "").trim();
  const key = userKey || process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "No Gemini key available. Add a Gemini key in the AI Keys dialog (top bar) or set GEMINI_API_KEY on the server.",
      },
      { status: 503 }
    );
  }

  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const turn of body.history ?? []) {
    contents.push({ role: turn.role, parts: [{ text: turn.text }] });
  }
  contents.push({ role: "user", parts: [{ text: body.message }] });

  const payload: Record<string, unknown> = { contents };
  if (body.systemContext) {
    payload.system_instruction = { parts: [{ text: body.systemContext }] };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await resp.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      error?: { message?: string };
    };
    if (!resp.ok) {
      return NextResponse.json(
        { error: json?.error?.message || `Gemini HTTP ${resp.status}` },
        { status: 502 }
      );
    }
    const text =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) {
      return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });
    }
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gemini call failed" },
      { status: 502 }
    );
  }
}
