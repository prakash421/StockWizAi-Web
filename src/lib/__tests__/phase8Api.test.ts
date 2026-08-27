/**
 * Unit tests for the Phase 8 additive API helpers:
 *   - editPosition       -> PUT  /portfolio/update/{id}
 *   - cancelAllScans     -> POST /scan/cancel_all
 *   - getServerWatchlist -> GET  /watchlist   (Phase 7 endpoint)
 *   - putServerWatchlist -> PUT  /watchlist
 *
 * These verify only the request wiring (path, verb, headers, body).
 */

const getMock = jest.fn();
const postMock = jest.fn();
const putMock = jest.fn();

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: () => ({
      get: getMock,
      post: postMock,
      put: putMock,
      defaults: { headers: {} },
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    }),
  },
}));

import {
  editPosition,
  cancelAllScans,
  getServerWatchlist,
  putServerWatchlist,
} from "@/lib/api";
import type { TradeEntry } from "@/lib/types";

describe("phase8 api helpers", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    putMock.mockReset();
  });

  test("editPosition PUTs to /portfolio/update/{id} with trade body", async () => {
    putMock.mockResolvedValue({ data: { status: "updated" } });
    const trade: TradeEntry = {
      ticker: "AAPL",
      strike: 175,
      expiry: "2026-06-20",
      trigger_price: 0,
      entry_premium: 3.2,
      contracts: 2,
      strategy: "CSP",
      is_call: 0,
      is_buy: 0,
    };
    await editPosition(42, trade);
    expect(putMock).toHaveBeenCalledTimes(1);
    const [url, body] = putMock.mock.calls[0];
    expect(url).toBe("/portfolio/update/42");
    expect(body).toEqual(trade);
  });

  test("cancelAllScans POSTs to /scan/cancel_all with no body", async () => {
    postMock.mockResolvedValue({
      data: { status: "ok", cancelled: ["job-1", "job-2"], count: 2 },
    });
    const res = await cancelAllScans();
    expect(postMock).toHaveBeenCalledWith("/scan/cancel_all");
    expect(res).toEqual({ status: "ok", cancelled: ["job-1", "job-2"], count: 2 });
  });

  test("getServerWatchlist GETs /watchlist with X-User-Id header", async () => {
    getMock.mockResolvedValue({ data: { tickers: ["AAPL"], is_default: false } });
    const res = await getServerWatchlist("user-42");
    expect(getMock).toHaveBeenCalledTimes(1);
    const [url, cfg] = getMock.mock.calls[0];
    expect(url).toBe("/watchlist");
    expect(cfg).toEqual({ headers: { "X-User-Id": "user-42" } });
    expect(res.tickers).toEqual(["AAPL"]);
  });

  test("putServerWatchlist PUTs /watchlist with tickers body and X-User-Id header", async () => {
    putMock.mockResolvedValue({ data: { tickers: ["MSFT"], count: 1 } });
    await putServerWatchlist("user-42", ["MSFT"]);
    expect(putMock).toHaveBeenCalledTimes(1);
    const [url, body, cfg] = putMock.mock.calls[0];
    expect(url).toBe("/watchlist");
    expect(body).toEqual({ tickers: ["MSFT"] });
    expect(cfg).toEqual({ headers: { "X-User-Id": "user-42" } });
  });
});
