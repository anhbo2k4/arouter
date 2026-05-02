import { describe, expect, it } from "vitest";
import { normalizeQuotaWindow, quotaWindowEnd, quotaWindowStart } from "../../src/lib/tokenQuotaStore.js";

describe("token quota daily reset policy", () => {
  it("normalizes legacy quota windows to daily", () => {
    expect(normalizeQuotaWindow()).toBe("daily");
    expect(normalizeQuotaWindow("daily")).toBe("daily");
    expect(normalizeQuotaWindow("monthly")).toBe("daily");
    expect(normalizeQuotaWindow("weekly")).toBe("daily");
    expect(normalizeQuotaWindow("rolling_5h")).toBe("daily");
  });

  it("uses Vietnam midnight as the daily reset boundary", () => {
    const at = new Date("2026-05-02T16:59:59.000Z"); // 23:59:59 Vietnam time

    expect(quotaWindowStart("daily", at)).toBe("2026-05-01T17:00:00.000Z");
    expect(quotaWindowEnd("daily", at)).toBe("2026-05-02T17:00:00.000Z");
  });
});
