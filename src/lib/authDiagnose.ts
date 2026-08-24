// Pure logic for /api/auth/diagnose — separated from route.ts so tests
// don't have to import next/server (which requires a Web Fetch Request
// polyfill in the Jest jsdom environment).

export interface Diagnosis {
  ok: boolean;
  env: {
    GOOGLE_CLIENT_ID: boolean;
    GOOGLE_CLIENT_SECRET: boolean;
    NEXTAUTH_SECRET: boolean;
    NEXTAUTH_URL: boolean;
  };
  missing: string[];
  on_vercel: boolean;
  vercel_url: string | null;
  node_env: string | null;
  hint: string;
}

function present(name: string, env: NodeJS.ProcessEnv): boolean {
  const v = env[name];
  return typeof v === "string" && v.trim().length > 0;
}

export function computeDiagnosis(
  env: NodeJS.ProcessEnv = process.env,
): Diagnosis {
  const envReport = {
    GOOGLE_CLIENT_ID: present("GOOGLE_CLIENT_ID", env),
    GOOGLE_CLIENT_SECRET: present("GOOGLE_CLIENT_SECRET", env),
    NEXTAUTH_SECRET: present("NEXTAUTH_SECRET", env),
    NEXTAUTH_URL: present("NEXTAUTH_URL", env),
  };
  const missing = Object.entries(envReport)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  const onVercel = present("VERCEL", env);
  const hint =
    missing.length === 0
      ? "All required env vars are present. If sign-in still fails, verify the OAuth redirect URI in Google Cloud Console matches this deployment: <ORIGIN>/api/auth/callback/google"
      : onVercel
        ? `Add ${missing.join(", ")} in Vercel → Project → Settings → Environment Variables, then redeploy.`
        : `Add ${missing.join(", ")} to .env.local and restart 'npm run dev'.`;

  return {
    ok: missing.length === 0,
    env: envReport,
    missing,
    on_vercel: onVercel,
    vercel_url: env.VERCEL_URL ?? null,
    node_env: env.NODE_ENV ?? null,
    hint,
  };
}
