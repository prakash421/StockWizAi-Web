import { metricBucket, metricColor } from "@/lib/metricColor";

describe("metricBucket - RSI", () => {
  test("oversold", () => {
    expect(metricBucket("RSI", 10)).toBe("Oversold");
    expect(metricBucket("RSI", 29.9)).toBe("Oversold");
  });
  test("cooling", () => {
    expect(metricBucket("RSI", 30)).toBe("Cooling");
    expect(metricBucket("RSI", 39.9)).toBe("Cooling");
  });
  test("healthy_isSweetSpot", () => {
    expect(metricBucket("RSI", 40)).toBe("Healthy");
    expect(metricBucket("RSI", 50)).toBe("Healthy");
    expect(metricBucket("RSI", 60)).toBe("Healthy");
  });
  test("climbing", () => {
    expect(metricBucket("RSI", 60.5)).toBe("Climbing");
    expect(metricBucket("RSI", 70)).toBe("Climbing");
  });
  test("overbought", () => {
    expect(metricBucket("RSI", 70.5)).toBe("Overbought");
    expect(metricBucket("RSI", 95)).toBe("Overbought");
  });
});

describe("metricBucket - BETA", () => {
  test("defensive", () => {
    expect(metricBucket("BETA", 0.3)).toBe("Defensive");
    expect(metricBucket("BETA", 0.69)).toBe("Defensive");
  });
  test("balanced_isSweetSpot", () => {
    expect(metricBucket("BETA", 0.7)).toBe("Balanced");
    expect(metricBucket("BETA", 1.0)).toBe("Balanced");
    expect(metricBucket("BETA", 1.3)).toBe("Balanced");
  });
  test("high", () => {
    expect(metricBucket("BETA", 1.31)).toBe("High");
    expect(metricBucket("BETA", 2.0)).toBe("High");
  });
  test("veryHigh", () => {
    expect(metricBucket("BETA", 2.5)).toBe("Very High");
  });
});

describe("metricBucket - IV", () => {
  test("thin_badForSellers", () => {
    expect(metricBucket("IV", 5)).toBe("Thin");
    expect(metricBucket("IV", 24.9)).toBe("Thin");
  });
  test("modest", () => {
    expect(metricBucket("IV", 25)).toBe("Modest");
    expect(metricBucket("IV", 49.9)).toBe("Modest");
  });
  test("juicy_goodForSellers", () => {
    expect(metricBucket("IV", 50)).toBe("Juicy");
    expect(metricBucket("IV", 75)).toBe("Juicy");
  });
  test("rich_excellentForSellers", () => {
    expect(metricBucket("IV", 76)).toBe("Rich");
    expect(metricBucket("IV", 99)).toBe("Rich");
  });
});

describe("metricColor", () => {
  test("returnsBucketAsHint", () => {
    const { hint } = metricColor("IV", 80);
    expect(hint).toBe("Rich");
  });
});
