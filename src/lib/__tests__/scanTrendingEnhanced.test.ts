const getMock = jest.fn();
const postMock = jest.fn();

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: () => ({
      get: getMock,
      post: postMock,
      defaults: { headers: {} },
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    }),
  },
}));

import { scanTrendingEnhanced } from "@/lib/api";

describe("scanTrendingEnhanced", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  test("defaults to strong_only=true and limit=10", async () => {
    getMock.mockResolvedValue({
      data: {
        results: [{ ticker: "NVDA", price: 500, rsi: 55, beta: 1.4 }],
        trending_tickers: ["NVDA"],
        history_window_days: 14,
        snapshot_taken: true,
      },
    });

    const resp = await scanTrendingEnhanced();

    expect(getMock).toHaveBeenCalledWith("/scan/trending/enhanced", {
      params: { strong_only: true, limit: 10 },
    });
    expect(resp.results).toHaveLength(1);
    expect(resp.results[0].ticker).toBe("NVDA");
    expect(resp.snapshot_taken).toBe(true);
  });

  test("forwards strongOnly=false to the backend", async () => {
    getMock.mockResolvedValue({
      data: { results: [], trending_tickers: [], history_window_days: 14, snapshot_taken: true },
    });

    await scanTrendingEnhanced(false);

    expect(getMock).toHaveBeenCalledWith("/scan/trending/enhanced", {
      params: { strong_only: false, limit: 10 },
    });
  });

  test("passes custom limit through", async () => {
    getMock.mockResolvedValue({
      data: { results: [], trending_tickers: [] },
    });

    await scanTrendingEnhanced(true, 25);

    expect(getMock).toHaveBeenCalledWith("/scan/trending/enhanced", {
      params: { strong_only: true, limit: 25 },
    });
  });

  test("propagates trending_badge and trending_history fields", async () => {
    getMock.mockResolvedValue({
      data: {
        results: [
          {
            ticker: "AAPL",
            price: 210,
            rsi: 60,
            beta: 1.1,
            trending_badge: "🔥 Day 7",
            trending_history: { appearances: 12, consecutive_days: 7 },
          },
        ],
        trending_tickers: ["AAPL"],
      },
    });

    const resp = await scanTrendingEnhanced(true);
    expect(resp.results[0].trending_badge).toBe("🔥 Day 7");
    expect(resp.results[0].trending_history?.consecutive_days).toBe(7);
  });
});
