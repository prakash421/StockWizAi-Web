"use client";
import { useState } from "react";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import { KeyRound, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { AiKeysDialog } from "./AiKeysDialog";

export function TopBar() {
  const { data: session, status } = useSession();
  const [keysOpen, setKeysOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
                onClick={() => void signIn("google")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                title="Sign in with Google"
              >
                <LogIn size={14} />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      </header>
      <AiKeysDialog open={keysOpen} onClose={() => setKeysOpen(false)} />
    </>
  );
}
