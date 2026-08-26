/**
 * Watchlist sync layer — mirrors the Android WatchlistRepo dirty-flag replay
 * pattern for the webapp.
 *
 * Contract (matches Android):
 *  • Local write is authoritative and immediate — localStorage always
 *    reflects the last user edit, even if the backend is offline.
 *  • A "dirty" flag is set on every local edit. On the next successful
 *    sync we PUT the dirty local copy up to the server and clear the flag.
 *  • When a signed-in user has no dirty edits, the server copy wins and
 *    replaces localStorage. This is how a fresh browser picks up the
 *    watchlist edited from another device (or the Android app).
 *  • For anonymous users everything stays in localStorage — no network.
 */

import { DEFAULT_WATCHLIST } from "./constants";

export const WATCHLIST_STORAGE_KEY = "watchlist";
export const WATCHLIST_DIRTY_KEY = "watchlist:dirty";

/** Normalize a raw list: uppercase, trim, dedupe, drop empties. */
export function normalizeTickers(list: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const t = (raw || "").trim().toUpperCase();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Order-sensitive equality (matches Android list-equality). */
export function tickersEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Decide the merge outcome for a first-load sync.
 *
 *  • If local is dirty → local wins, needsPush = true.
 *  • Else if server list is non-empty and differs from local → server wins,
 *    localStorage should be replaced.
 *  • Else → no change.
 */
export interface MergeResult {
  effective: string[];
  needsPush: boolean;
  needsLocalWrite: boolean;
}

export function mergeOnLoad(
  local: readonly string[],
  server: readonly string[],
  dirty: boolean
): MergeResult {
  const l = normalizeTickers(local);
  const s = normalizeTickers(server);
  if (dirty) {
    return {
      effective: l,
      needsPush: !tickersEqual(l, s),
      needsLocalWrite: false,
    };
  }
  if (s.length === 0) {
    // Server has nothing to say — keep whatever we had locally.
    return { effective: l, needsPush: false, needsLocalWrite: false };
  }
  if (tickersEqual(l, s)) {
    return { effective: l, needsPush: false, needsLocalWrite: false };
  }
  return { effective: s, needsPush: false, needsLocalWrite: true };
}

/** Read the persisted watchlist. Falls back to DEFAULT_WATCHLIST. */
export function loadLocalWatchlist(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_WATCHLIST];
  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [...DEFAULT_WATCHLIST];
    const parsed = raw.split(",").filter(Boolean);
    return parsed.length > 0 ? parsed : [...DEFAULT_WATCHLIST];
  } catch {
    return [...DEFAULT_WATCHLIST];
  }
}

/** Persist a watchlist and mark it dirty (pending server push). */
export function saveLocalWatchlist(tickers: readonly string[], dirty: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, tickers.join(","));
    if (dirty) {
      window.localStorage.setItem(WATCHLIST_DIRTY_KEY, "1");
    } else {
      window.localStorage.removeItem(WATCHLIST_DIRTY_KEY);
    }
  } catch {
    /* localStorage disabled — silently ignore */
  }
}

/** Read the dirty flag. */
export function isWatchlistDirty(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WATCHLIST_DIRTY_KEY) === "1";
  } catch {
    return false;
  }
}
