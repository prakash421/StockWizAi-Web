/**
 * Tests the pure `computeDiagnosis` helper so we never import
 * next/server (which needs a Web Fetch Request polyfill in Jest jsdom).
 * The real route handler is a thin wrapper around this fn.
 */

import { computeDiagnosis } from "@/lib/authDiagnose";

function makeEnv(over: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const base: Record<string, string | undefined> = {
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
    NEXTAUTH_SECRET: "nsecret",
    NEXTAUTH_URL: "http://localhost:3000",
  };
  return { ...base, ...over } as NodeJS.ProcessEnv;
}

describe("computeDiagnosis", () => {
  test("ok=true when all four required vars are present", () => {
    const d = computeDiagnosis(makeEnv());
    expect(d.ok).toBe(true);
    expect(d.missing).toEqual([]);
    expect(d.env.GOOGLE_CLIENT_ID).toBe(true);
    expect(d.env.GOOGLE_CLIENT_SECRET).toBe(true);
    expect(d.env.NEXTAUTH_SECRET).toBe(true);
    expect(d.env.NEXTAUTH_URL).toBe(true);
  });

  test("reports missing keys when secrets are absent", () => {
    const d = computeDiagnosis(
      makeEnv({
        GOOGLE_CLIENT_ID: undefined,
        GOOGLE_CLIENT_SECRET: undefined,
        NEXTAUTH_SECRET: undefined,
      }),
    );
    expect(d.ok).toBe(false);
    expect(d.missing.sort()).toEqual(
      ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NEXTAUTH_SECRET"].sort(),
    );
    expect(d.env.NEXTAUTH_URL).toBe(true);
  });

  test("treats empty and whitespace-only values as missing", () => {
    const d = computeDiagnosis(
      makeEnv({ GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "   " }),
    );
    expect(d.ok).toBe(false);
    expect(d.env.GOOGLE_CLIENT_ID).toBe(false);
    expect(d.env.GOOGLE_CLIENT_SECRET).toBe(false);
    expect(d.missing).toEqual(
      expect.arrayContaining(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]),
    );
  });

  test("hint mentions Vercel dashboard when VERCEL is set", () => {
    const d = computeDiagnosis(
      makeEnv({
        GOOGLE_CLIENT_ID: undefined,
        GOOGLE_CLIENT_SECRET: undefined,
        NEXTAUTH_SECRET: undefined,
        NEXTAUTH_URL: undefined,
        VERCEL: "1",
        VERCEL_URL: "stockwiz.example.com",
      }),
    );
    expect(d.on_vercel).toBe(true);
    expect(d.vercel_url).toBe("stockwiz.example.com");
    expect(d.hint).toMatch(/Vercel/i);
  });

  test("hint mentions .env.local when not on Vercel", () => {
    const d = computeDiagnosis(
      makeEnv({
        GOOGLE_CLIENT_ID: undefined,
        GOOGLE_CLIENT_SECRET: undefined,
        NEXTAUTH_SECRET: undefined,
        NEXTAUTH_URL: undefined,
        VERCEL: undefined,
      }),
    );
    expect(d.on_vercel).toBe(false);
    expect(d.hint).toMatch(/\.env\.local/i);
  });

  test("payload never contains secret values, only booleans", () => {
    const d = computeDiagnosis(
      makeEnv({
        GOOGLE_CLIENT_ID: "TOP_SECRET_ID_123",
        GOOGLE_CLIENT_SECRET: "TOP_SECRET_VALUE_456",
        NEXTAUTH_SECRET: "TOP_SECRET_JWT_789",
      }),
    );
    const raw = JSON.stringify(d);
    expect(raw).not.toContain("TOP_SECRET_ID_123");
    expect(raw).not.toContain("TOP_SECRET_VALUE_456");
    expect(raw).not.toContain("TOP_SECRET_JWT_789");
  });

  test("hint mentions redirect URI when everything present", () => {
    const d = computeDiagnosis(makeEnv());
    expect(d.ok).toBe(true);
    expect(d.hint).toMatch(/redirect URI/i);
  });
});
