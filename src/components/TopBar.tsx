"use client";
import { useState } from "react";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import { KeyRound, LogIn, LogOut, User as UserIcon, AlertTriangle, X } from "lucide-react";
import { AiKeysDialog } from "./AiKeysDialog";

export function TopBar() {
  const { data: session, status } = useSession();
  const [keysOpen, setKeysOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Wrap signIn so the "spinner forever / nothing happens" failure mode
  // becomes a visible error. next-auth's signIn returns undefined when it
  // redirects; when the /api/auth/signin/google POST 500s (missing envs on
  // Vercel is the usual cause) we catch it and hit /api/auth/diagnose to
  // tell the user exactly what's misconfigured.
  const handleSignIn = async () => {
    setSignInError(null);
    setSigningIn(true);
    try {
      const res = await signIn("google", { redirect: true });
      if (res && res.error) {
        throw new Error(res.error);
      }
    } catch (e) {
      const baseMsg =
        e instanceof Error ? e.message : "Sign-in failed unexpectedly.";
      let detail = "";
      try {
        const diag = await fetch("/api/auth/diagnose").then((r) => r.json());
        if (diag && Array.isArray(diag.missing) && diag.missing.length > 0) {
          detail = ` Server is missing env vars: ${diag.missing.join(", ")}.`;
        } else if (diag && diag.hint) {
          detail = ` ${diag.hint}`;
        }
      } catch {
        // diagnose is best-effort
      }
      setSignInError(baseMsg + detail);
      setSigningIn(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <span className="text-base sm:text-lg font-bold text-indigo-700">
            StockWiz AI
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setKeysOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              title="Configure AI engine API keys"
            >
              <KeyRound size={14} />
              <span className="hidden sm:inline">AI Keys</span>
            </button>

            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
            ) : session?.user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full hover:bg-gray-100 pl-1 pr-2 py-1"
                >
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name ?? "User"}
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <UserIcon size={14} />
                    </div>
                  )}
                  <span className="hidden sm:inline text-xs text-gray-700 max-w-[120px] truncate">
                    {session.user.name ?? session.user.email}
                  </span>
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                      Signed in as
                      <br />
                      <span className="text-gray-800 font-medium break-all">
                        {session.user.email}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        void signOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => void handleSignIn()}
                disabled={signingIn}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400"
                title="Sign in with Google"
              >
                <LogIn size={14} />
                <span>{signingIn ? "Signing in…" : "Sign in"}</span>
              </button>
            )}
          </div>
        </div>
        {signInError && (
          <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 pb-2">
            <div className="flex items-start gap-2 px-3 py-2 bg-red-50 text-red-800 rounded-lg text-xs sm:text-sm">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1 break-words">{signInError}</span>
              <button
                onClick={() => setSignInError(null)}
                aria-label="Dismiss"
                className="flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </header>
      <AiKeysDialog open={keysOpen} onClose={() => setKeysOpen(false)} />
    </>
  );
}
