import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * NextAuth configuration. Requires the following env vars (set them in
 * `.env.local` for dev and in the host's environment for production):
 *   - GOOGLE_CLIENT_ID       — Google OAuth 2.0 Client ID
 *   - GOOGLE_CLIENT_SECRET   — Google OAuth 2.0 Client Secret
 *   - NEXTAUTH_SECRET        — random string (e.g. `openssl rand -base64 32`)
 *   - NEXTAUTH_URL           — only required when NOT on Vercel; e.g.
 *                              `http://localhost:3000` for dev.
 *
 * If any of the first three are missing, NextAuth surfaces the generic
 * "There is a problem with the server configuration" error to the browser.
 * We log a precise diagnostic to the server console so the actual cause is
 * obvious in the dev terminal / hosting logs.
 */
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
const nextAuthSecret = process.env.NEXTAUTH_SECRET ?? "";

const missing: string[] = [];
if (!googleClientId) missing.push("GOOGLE_CLIENT_ID");
if (!googleClientSecret) missing.push("GOOGLE_CLIENT_SECRET");
if (!nextAuthSecret) missing.push("NEXTAUTH_SECRET");
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    `[next-auth] Missing required env vars: ${missing.join(", ")}. ` +
      "Sign-in will fail with 'There is a problem with the server configuration'. " +
      "Add them to .env.local (dev) or your hosting environment (prod) and restart the server."
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  secret: nextAuthSecret || undefined,
  session: { strategy: "jwt" },
  // Route NextAuth internal logs to console so Vercel Functions logs
  // capture the real cause of sign-in failures (missing envs, callback
  // URI mismatch, etc.) — the browser only sees a generic error page.
  logger: {
    error(code, metadata) {
      // eslint-disable-next-line no-console
      console.error(`[next-auth][error] ${code}`, metadata);
    },
    warn(code) {
      // eslint-disable-next-line no-console
      console.warn(`[next-auth][warn] ${code}`);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log(`[next-auth][debug] ${code}`, metadata);
      }
    },
  },
  debug: process.env.NODE_ENV !== "production",
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};

