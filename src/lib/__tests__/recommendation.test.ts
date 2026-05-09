import { recommendationBucket, isBuyRated } from "@/lib/recommendation";

describe("recommendationBucket", () => {
  test("strongBuy_isBucketedFirst", () => {
    expect(recommendationBucket("STRONG BUY", null)).toBe("STRONG BUY");
    expect(recommendationBucket("Strong Buy (Confirmed)", null)).toBe("STRONG BUY");
    expect(recommendationBucket("BUY", "STRONG OPPORTUNITY")).toBe("STRONG BUY");
  });

  test("buy_variantsBucketed", () => {
    expect(recommendationBucket("BUY", null)).toBe("BUY");
    expect(recommendationBucket(null, "OPPORTUNITY")).toBe("BUY");
    expect(recommendationBucket("Buy — Trending", null)).toBe("BUY");
  });

  test("holdAndCaution", () => {
    expect(recommendationBucket("HOLD", null)).toBe("HOLD");
    expect(recommendationBucket("Neutral", null)).toBe("HOLD");
    expect(recommendationBucket(null, "CAUTION")).toBe("HOLD");
  });

  test("sellAndAvoid", () => {
    expect(recommendationBucket("SELL", null)).toBe("SELL");
    expect(recommendationBucket("Strong Sell", null)).toBe("SELL");
    expect(recommendationBucket("AVOID", null)).toBe("AVOID");
  });

  test("blank_isOther", () => {
    expect(recommendationBucket(null, null)).toBe("OTHER");
    expect(recommendationBucket("", "")).toBe("OTHER");
    expect(recommendationBucket("xyz", null)).toBe("OTHER");
  });
});

describe("isBuyRated", () => {
  test("acceptsStrongBuyAndBuy", () => {
    expect(isBuyRated("STRONG BUY", null)).toBe(true);
    expect(isBuyRated("BUY", null)).toBe(true);
    expect(isBuyRated(null, "OPPORTUNITY")).toBe(true);
  });

  test("rejectsHoldSellAvoid", () => {
    expect(isBuyRated("HOLD", null)).toBe(false);
    expect(isBuyRated("SELL", null)).toBe(false);
    expect(isBuyRated("AVOID", null)).toBe(false);
    expect(isBuyRated(null, null)).toBe(false);
  });
});
