"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getServerWatchlist, putServerWatchlist } from "./api";
import {
  isWatchlistDirty,
  loadLocalWatchlist,
  mergeOnLoad,
  normalizeTickers,
  saveLocalWatchlist,
  tickersEqual,
} from "./watchlistSync";

interface UseWatchlistSyncResult {
  watchlist: string[];
  setWatchlist: (next: readonly string[]) => void;
  syncing: boolean;
  syncError: string | null;
}

/**
 * React hook that owns the watchlist state and keeps it in sync with the
 * per-user server copy (when a user is signed in via NextAuth).
 *
 * • Reads localStorage synchronously so the initial render is instant.
 * • On mount / when the user signs in, fetches the server list and merges
 *   using the same dirty-flag replay contract as the Android app.
 * • Every setWatchlist call writes localStorage immediately (dirty=true)
 *   and then fires a background PUT. If the PUT fails the dirty flag
 *   stays set and will be retried on next mount / sign-in.
 */
export function useWatchlistSync(): UseWatchlistSyncResult {
  const { data: session, status } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  const [watchlist, setWatchlistState] = useState<string[]>(() => loadLocalWatchlist());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Track which user id we last synced so a sign-in triggers a fresh pull.
  const lastSyncedUserId = useRef<string | null>(null);

  // Push the current local list to the server; clears dirty on success.
  const pushIfNeeded = useCallback(
    async (uid: string, list: readonly string[]): Promise<void> => {
      try {
        setSyncing(true);
        setSyncError(null);
        await putServerWatchlist(uid, [...list]);
        saveLocalWatchlist(list, /*dirty*/ false);
      } catch (err) {
        // Leave dirty flag set so we retry later.
        setSyncError(err instanceof Error ? err.message : "Failed to sync watchlist.");
      } finally {
        setSyncing(false);
      }
    },
    []
  );

  // First-load / sign-in sync.
  useEffect(() => {
    if (status === "loading") return;
    if (!userId) {
      // Signed out — nothing to sync. Keep local copy as-is.
      lastSyncedUserId.current = null;
      return;
    }
    if (lastSyncedUserId.current === userId) return;
    lastSyncedUserId.current = userId;

    let cancelled = false;
    (async () => {
      try {
        setSyncing(true);
        setSyncError(null);
        const server = await getServerWatchlist(userId);
        if (cancelled) return;
        const local = loadLocalWatchlist();
        const dirty = isWatchlistDirty();
        const merged = mergeOnLoad(local, server.tickers ?? [], dirty);
        if (merged.needsLocalWrite) {
          saveLocalWatchlist(merged.effective, /*dirty*/ false);
          setWatchlistState(merged.effective);
        }
        if (merged.needsPush) {
          await pushIfNeeded(userId, merged.effective);
        }
      } catch (err) {
        if (!cancelled) {
          setSyncError(err instanceof Error ? err.message : "Failed to load watchlist.");
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, userId, pushIfNeeded]);

  const setWatchlist = useCallback(
    (next: readonly string[]): void => {
      const normalized = normalizeTickers(next);
      if (tickersEqual(normalized, watchlist)) return;
      // Local wins immediately; mark dirty until we've pushed.
      saveLocalWatchlist(normalized, /*dirty*/ true);
      setWatchlistState(normalized);
      if (userId) {
        void pushIfNeeded(userId, normalized);
      }
    },
    [watchlist, userId, pushIfNeeded]
  );

  return { watchlist, setWatchlist, syncing, syncError };
}
