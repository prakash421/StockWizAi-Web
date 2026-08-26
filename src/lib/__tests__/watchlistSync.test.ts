/**
 * Unit tests for watchlist sync merge/dirty-flag replay logic.
 * Mirrors the contract of the Android WatchlistRepo so a user editing on
 * the web keeps the same behaviour as one editing on mobile.
 */

import {
  isWatchlistDirty,
  loadLocalWatchlist,
  mergeOnLoad,
  normalizeTickers,
  saveLocalWatchlist,
  tickersEqual,
  WATCHLIST_DIRTY_KEY,
  WATCHLIST_STORAGE_KEY,
} from "../watchlistSync";
import { DEFAULT_WATCHLIST } from "../constants";

describe("normalizeTickers", () => {
  it("uppercases, trims, and dedupes", () => {
    expect(normalizeTickers(["aapl", " Msft ", "AAPL", ""])).toEqual([
      "AAPL",
      "MSFT",
    ]);
  });

  it("preserves first-occurrence order", () => {
    expect(normalizeTickers(["TSLA", "AMD", "TSLA"])).toEqual(["TSLA", "AMD"]);
  });

  it("returns empty array for empty input", () => {
    expect(normalizeTickers([])).toEqual([]);
    expect(normalizeTickers(["", "  "])).toEqual([]);
  });
});

describe("tickersEqual", () => {
  it("returns true for equal ordered arrays", () => {
    expect(tickersEqual(["A", "B"], ["A", "B"])).toBe(true);
  });

  it("returns false when order differs", () => {
    expect(tickersEqual(["A", "B"], ["B", "A"])).toBe(false);
  });

  it("returns false when lengths differ", () => {
    expect(tickersEqual(["A"], ["A", "B"])).toBe(false);
  });
});

describe("mergeOnLoad", () => {
  it("server-wins when local is clean and lists differ", () => {
    const res = mergeOnLoad(["AAPL"], ["MSFT", "TSLA"], /*dirty*/ false);
    expect(res.effective).toEqual(["MSFT", "TSLA"]);
    expect(res.needsPush).toBe(false);
    expect(res.needsLocalWrite).toBe(true);
  });

  it("local-wins when dirty and lists differ", () => {
    const res = mergeOnLoad(["AAPL", "GOOG"], ["MSFT"], /*dirty*/ true);
    expect(res.effective).toEqual(["AAPL", "GOOG"]);
    expect(res.needsPush).toBe(true);
    expect(res.needsLocalWrite).toBe(false);
  });

  it("no-op when lists already equal (clean)", () => {
    const res = mergeOnLoad(["A", "B"], ["A", "B"], /*dirty*/ false);
    expect(res.needsPush).toBe(false);
    expect(res.needsLocalWrite).toBe(false);
    expect(res.effective).toEqual(["A", "B"]);
  });

  it("no push when dirty but local matches server (nothing to send)", () => {
    const res = mergeOnLoad(["A", "B"], ["A", "B"], /*dirty*/ true);
    expect(res.needsPush).toBe(false);
    expect(res.needsLocalWrite).toBe(false);
  });

  it("keeps local when server is empty (fresh account)", () => {
    const res = mergeOnLoad(["AAPL"], [], /*dirty*/ false);
    expect(res.effective).toEqual(["AAPL"]);
    expect(res.needsPush).toBe(false);
    expect(res.needsLocalWrite).toBe(false);
  });

  it("normalizes inputs before comparing", () => {
    const res = mergeOnLoad([" aapl "], ["AAPL"], /*dirty*/ false);
    expect(res.needsLocalWrite).toBe(false);
    expect(res.needsPush).toBe(false);
  });
});

describe("localStorage helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loadLocalWatchlist returns DEFAULT_WATCHLIST when nothing stored", () => {
    expect(loadLocalWatchlist()).toEqual([...DEFAULT_WATCHLIST]);
  });

  it("loadLocalWatchlist returns stored tickers", () => {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, "AAPL,MSFT,TSLA");
    expect(loadLocalWatchlist()).toEqual(["AAPL", "MSFT", "TSLA"]);
  });

  it("loadLocalWatchlist falls back to DEFAULT_WATCHLIST when stored value is empty", () => {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, "");
    expect(loadLocalWatchlist()).toEqual([...DEFAULT_WATCHLIST]);
  });

  it("saveLocalWatchlist writes csv and sets dirty flag", () => {
    saveLocalWatchlist(["AAPL", "MSFT"], /*dirty*/ true);
    expect(window.localStorage.getItem(WATCHLIST_STORAGE_KEY)).toBe("AAPL,MSFT");
    expect(window.localStorage.getItem(WATCHLIST_DIRTY_KEY)).toBe("1");
    expect(isWatchlistDirty()).toBe(true);
  });

  it("saveLocalWatchlist clears dirty flag when dirty=false", () => {
    window.localStorage.setItem(WATCHLIST_DIRTY_KEY, "1");
    saveLocalWatchlist(["AAPL"], /*dirty*/ false);
    expect(window.localStorage.getItem(WATCHLIST_DIRTY_KEY)).toBeNull();
    expect(isWatchlistDirty()).toBe(false);
  });
});
