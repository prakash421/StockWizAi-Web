/**
 * Client-side AI engine key storage.
 *
 * Mirrors the Android `AiKeyManager` (which uses EncryptedSharedPreferences)
 * but the web equivalent is plain `localStorage`. Keys are XSS-readable, so
 * users should be made aware. The keys are sent on each AI request and the
 * server falls back to its own env vars when a user-provided key is absent.
 */

export type AiEngineKey =
  | "gemini"
  | "openai"
  | "anthropic"
  | "perplexity"
  | "grok";

export const AI_ENGINE_LABELS: Record<AiEngineKey, string> = {
  gemini: "Gemini (Google)",
  openai: "ChatGPT (OpenAI)",
  anthropic: "Claude (Anthropic)",
  perplexity: "Perplexity",
  grok: "Grok (xAI)",
};

export const AI_ENGINE_ORDER: AiEngineKey[] = [
  "gemini",
  "openai",
  "anthropic",
  "perplexity",
  "grok",
];

const STORAGE_PREFIX = "stockwiz.aiKey.";

function storageKey(engine: AiEngineKey): string {
  return STORAGE_PREFIX + engine;
}

export function getStoredAiKey(engine: AiEngineKey): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(storageKey(engine)) ?? "";
  } catch {
    return "";
  }
}

export function setStoredAiKey(engine: AiEngineKey, value: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = value.trim();
    if (trimmed) window.localStorage.setItem(storageKey(engine), trimmed);
    else window.localStorage.removeItem(storageKey(engine));
  } catch {
    /* quota or privacy mode — silently ignore */
  }
}

export function clearStoredAiKey(engine: AiEngineKey): void {
  setStoredAiKey(engine, "");
}

export function getAllStoredAiKeys(): Partial<Record<AiEngineKey, string>> {
  const out: Partial<Record<AiEngineKey, string>> = {};
  for (const k of AI_ENGINE_ORDER) {
    const v = getStoredAiKey(k);
    if (v) out[k] = v;
  }
  return out;
}
