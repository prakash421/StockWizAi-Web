/**
 * Phase 11 — single-async-scan poller tests. We mock the axios instance
 * so no HTTP goes out and drive the poller's internal state machine
 * (queued → prefetching → scanning → complete) via mockResolvedValueOnce.
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

import { scanPhaseLabel, scanWatchlistSingleAsync } from "@/lib/api";
import type { ScanResultItem } from "@/lib/types";

describe("scanPhaseLabel", () => {
  it('maps "queued" to the waiting label', () => {
    expect(scanPhaseLabel("queued", 5)).toMatch(/Waiting for backend/);
  });
  it('maps "prefetching" to a Fetching label with symbol count', () => {
    expect(scanPhaseLabel("prefetching", 42)).toBe(
      "Fetching market data for 42 symbols…",
    );
  });
  it('maps "scanning", null, undefined, and unknown to "Scanning"', () => {
    expect(scanPhaseLabel("scanning", 5)).toBe("Scanning");
    expect(scanPhaseLabel(null, 5)).toBe("Scanning");
    expect(scanPhaseLabel(undefined, 5)).toBe("Scanning");
    expect(scanPhaseLabel("weird_state", 5)).toBe("Scanning");
  });
});

function stub(item: string): ScanResultItem {
  return { ticker: item } as ScanResultItem;
}

describe("scanWatchlistSingleAsync", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    putMock.mockReset();
  });

  it("progresses through phases and emits final results", async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === "/scan/async") {
        return { data: { status: "queued", job_id: "job-1", total_tickers: 3 } };
      }
      if (url.startsWith("/scan/status/")) {
        // pull the next queued response
        const next = statusResponses.shift();
        if (!next) throw new Error("unexpected extra status poll");
        return { data: next };
      }
      throw new Error("unexpected url " + url);
    });
    const statusResponses: Array<Record<string, unknown>> = [
      { status: "running", phase: "queued", tickers_scanned: 0, total_tickers: 3 },
      { status: "running", phase: "prefetching", tickers_scanned: 0, total_tickers: 3 },
      { status: "running", phase: "scanning", tickers_scanned: 2, total_tickers: 3, results: [stub("AAPL"), stub("MSFT")] },
      { status: "complete", phase: "scanning", tickers_scanned: 3, total_tickers: 3, results: [stub("AAPL"), stub("MSFT"), stub("TSLA")] },
    ];

    const phases: string[] = [];
    const partials: number[] = [];
    const final = await scanWatchlistSingleAsync(
      ["AAPL", "MSFT", "TSLA"],
      null,
      (r) => partials.push(r.length),
      (p) => phases.push(p.phase),
    );
    expect(final.map((r) => r.ticker).sort()).toEqual(["AAPL", "MSFT", "TSLA"]);
    // At least one Queued, one Fetching, one Scanning, one Done phase must appear
    expect(phases[0]).toBe("Queued");
    expect(phases.some((p) => p.startsWith("Waiting"))).toBe(true);
    expect(phases.some((p) => p.startsWith("Fetching"))).toBe(true);
    expect(phases.some((p) => p === "Scanning")).toBe(true);
    expect(phases[phases.length - 1]).toBe("Done");
    // Partial emission: 2 unique tickers first, then 3
    expect(partials).toEqual([2, 3]);
  });

  it("dedupes tickers across partial and terminal responses", async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === "/scan/async") {
        return { data: { status: "queued", job_id: "job-1", total_tickers: 2 } };
      }
      const next = statusResponses.shift();
      if (!next) throw new Error("no more responses");
      return { data: next };
    });
    const statusResponses: Array<Record<string, unknown>> = [
      { status: "running", phase: "scanning", tickers_scanned: 1, total_tickers: 2, results: [stub("AAPL")] },
      { status: "complete", phase: "scanning", tickers_scanned: 2, total_tickers: 2, results: [stub("AAPL"), stub("MSFT")] },
    ];
    const emissions: string[][] = [];
    const final = await scanWatchlistSingleAsync(
      ["AAPL", "MSFT"],
      null,
      (r) => emissions.push(r.map((x) => x.ticker)),
    );
    expect(final.map((r) => r.ticker)).toEqual(["AAPL", "MSFT"]);
    // Emissions are strictly growing sets — never a duplicate AAPL
    for (const e of emissions) expect(new Set(e).size).toBe(e.length);
  });

  it("falls back to /scan when scanAsyncStart itself fails", async () => {
    const scanResults = [stub("AAPL"), stub("MSFT")];
    getMock.mockImplementation(async (url: string) => {
      if (url === "/scan/async") throw new Error("500 upstream");
      if (url === "/scan") return { data: scanResults };
      throw new Error("unexpected " + url);
    });
    const final = await scanWatchlistSingleAsync(
      ["AAPL", "MSFT"],
      null,
      () => {},
    );
    expect(final.map((r) => r.ticker)).toEqual(["AAPL", "MSFT"]);
  });

  it("returns bare array response as terminal", async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === "/scan/async") {
        return { data: { status: "queued", job_id: "job-x", total_tickers: 1 } };
      }
      return { data: [stub("AAPL")] };
    });
    const final = await scanWatchlistSingleAsync(["AAPL"], null, () => {});
    expect(final.map((r) => r.ticker)).toEqual(["AAPL"]);
  });
});
