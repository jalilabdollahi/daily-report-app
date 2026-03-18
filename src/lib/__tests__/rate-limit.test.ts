import { consumeRateLimit } from "@/lib/rate-limit";

describe("consumeRateLimit", () => {
  it("allows requests until the limit is reached", () => {
    const first = consumeRateLimit({
      key: "test-limit",
      limit: 2,
      windowMs: 1_000,
    });
    const second = consumeRateLimit({
      key: "test-limit",
      limit: 2,
      windowMs: 1_000,
    });
    const third = consumeRateLimit({
      key: "test-limit",
      limit: 2,
      windowMs: 1_000,
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(third.success).toBe(false);
  });
});
