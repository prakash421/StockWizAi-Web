/**
 * Unit tests for the Phase 12 Daily Brief API helper.
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

import { getDailyBrief } from "@/lib/api";
import type { DailyBriefResponse } from "@/lib/types";

describe("getDailyBrief", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  test("GETs /daily-brief with include_trending=true by default and no user_id", async () => {
    getMock.mockResolvedValue({ data: { generated_at: "2026-09-01T12:00:00Z" } });
    await getDailyBrief();
    expect(getMock).toHaveBeenCalledTimes(1);
    const [url, cfg] = getMock.mock.calls[0];
    expect(url).toBe("/daily-brief");
    expect(cfg.params).toEqual({ include_trending: "true" });
    expect(cfg.params.user_id).toBeUndefined();
  });

  test("passes user_id when provided", async () => {
    getMock.mockResolvedValue({ data: {} });
    await getDailyBrief("user-42", true);
    const [, cfg] = getMock.mock.calls[0];
    expect(cfg.params).toEqual({ include_trending: "true", user_id: "user-42" });
  });

  test("omits user_id when null and honors includeTrending=false", async () => {
    getMock.mockResolvedValue({ data: {} });
    await getDailyBrief(null, false);
    const [, cfg] = getMock.mock.calls[0];
    expect(cfg.params).toEqual({ include_trending: "false" });
  });

  test("returns the parsed body", async () => {
    const body: DailyBriefResponse = {
      generated_at: "2026-09-01T12:00:00Z",
      summary: {
        tickers_scanned: 120,
        strong_buys: 5,
        stop_loss_watch_count: 2,
        earnings_this_week_count: 3,
      },
      new_buy_signals: [
        { ticker: "AAPL", kind: "stock", price: 175, verdict: "STRONG BUY" },
        {
          ticker: "MSFT",
          kind: "put_credit_spread",
          short_strike: 400,
          long_strike: 395,
          width: 5,
          credit: 1.2,
          max_loss: 3.8,
          roc: 31.5,
          expiry: "2026-10-17",
        },
      ],
      stop_loss_watch: [{ ticker: "NVDA", price: 100, stop_loss: 98, distance_pct: 2.0 }],
      earnings_this_week: [{ ticker: "GOOG", date: "2026-09-03" }],
      etf_status: {
        top_in: ["XLK"],
        bottom_out: ["XLU"],
        early_rotators: [{ sector: "Tech", direction: "early_in" }],
        signals: ["Risk-on rotation"],
      },
      trending_today: [{ ticker: "TSLA", consecutive_days: 3, appearances_14d: 8, badge: "hot" }],
    };
    getMock.mockResolvedValue({ data: body });
    const res = await getDailyBrief();
    expect(res).toEqual(body);
    expect(res.new_buy_signals?.length).toBe(2);
    expect(res.new_buy_signals?.[1].kind).toBe("put_credit_spread");
  });

  test("surfaces defensive error field from backend", async () => {
    getMock.mockResolvedValue({ data: { error: "Trending fetch failed" } });
    const res = await getDailyBrief("user-1");
    expect(res.error).toBe("Trending fetch failed");
  });

  test("propagates network errors", async () => {
    getMock.mockRejectedValue(new Error("Network Error"));
    await expect(getDailyBrief()).rejects.toThrow("Network Error");
  });
});
