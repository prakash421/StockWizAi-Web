import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * NextAuth configuration. Requires the following env vars on Vercel:
 *   - GOOGLE_CLIENT_ID       — Google OAuth 2.0 Client ID
 *   - GOOGLE_CLIENT_SECRET   — Google OAuth 2.0 Client Secret
 *   - NEXTAUTH_SECRET        — random string (e.g. `openssl rand -base64 32`)
 *
 * Until those are set, the GoogleProvider will fail at sign-in time with a
 * clear "client_id is required" error rather than crashing the build.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};
