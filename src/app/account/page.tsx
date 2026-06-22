"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  UserCircle2,
  LogIn,
  LogOut,
  KeyRound,
  Mail,
  User as UserIcon,
  Shield,
} from "lucide-react";
import { AiKeysDialog } from "@/components/AiKeysDialog";
import {
  AI_ENGINE_LABELS,
  AI_ENGINE_ORDER,
  getAllStoredAiKeys,
} from "@/lib/aiKeys";

function Row({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 text-gray-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
        <p
          className={`text-sm text-gray-800 break-all ${
            mono ? "font-mono text-xs" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [keysOpen, setKeysOpen] = useState(false);
  const [configured, setConfigured] = useState<string[]>([]);
  const [confirmOut, setConfirmOut] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const keys = getAllStoredAiKeys();
      const labels = AI_ENGINE_ORDER.filter((k) => keys[k]).map(
        (k) => AI_ENGINE_LABELS[k].split(" ")[0]
      );
      setConfigured(labels);
    };
    refresh();
    // Re-read after the dialog closes (user may have saved/cleared keys).
    if (!keysOpen) refresh();
  }, [keysOpen]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        Loading account…
      </div>
    );
  }

  const signedIn = !!session?.user;
  const name = session?.user?.name ?? "Guest";
  const email = session?.user?.email ?? "—";
  const image = session?.user?.image ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserCircle2 size={22} className="text-indigo-600" />
        <h1 className="text-lg font-bold">Account</h1>
      </div>

      {/* Profile */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-4">
        {image ? (
          <Image
            src={image}
            alt={name}
            width={64}
            height={64}
            className="rounded-full"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold truncate">{name}</p>
          {signedIn && (
            <p className="text-sm text-gray-600 truncate">{email}</p>
          )}
          <span
            className={`mt-1 inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${
              signedIn
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {signedIn ? "Signed in with Google" : "Not signed in"}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-bold mb-2 text-gray-700">Account details</h2>
        <Row icon={<UserIcon size={16} />} label="Display name" value={name} />
        {signedIn && (
          <Row icon={<Mail size={16} />} label="Email" value={email} />
        )}
        <Row
          icon={<Shield size={16} />}
          label="AI keys configured"
          value={configured.length === 0 ? "None" : configured.join(", ")}
        />
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => setKeysOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium"
        >
          <KeyRound size={16} />
          Manage AI engine keys
        </button>

        {signedIn ? (
          <>
            {confirmOut ? (
              <div className="space-y-2 bg-rose-50 border border-rose-100 rounded-lg p-3">
                <p className="text-sm text-rose-900 font-medium">
                  Sign out of {email}?
                </p>
                <p className="text-xs text-rose-800">
                  Your portfolio and watchlist stay on the backend and will be
                  available again when you sign back in.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmOut(false)}
                    className="flex-1 px-3 py-2 text-sm rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void signOut()}
                    className="flex-1 px-3 py-2 text-sm rounded-md bg-rose-600 text-white hover:bg-rose-700 font-semibold flex items-center justify-center gap-1.5"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmOut(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-medium"
              >
                <LogOut size={16} /> Sign out
              </button>
            )}
            <p className="text-[11px] text-center text-gray-500 px-4">
              Signing out keeps your data safe on the backend; sign back in any
              time to restore it.
            </p>
          </>
        ) : (
          <button
            onClick={() => void signIn("google")}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
          >
            <LogIn size={16} /> Sign in with Google
          </button>
        )}
      </div>

      <AiKeysDialog open={keysOpen} onClose={() => setKeysOpen(false)} />
    </div>
  );
}
