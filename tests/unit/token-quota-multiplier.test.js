import { describe, expect, it } from "vitest";

import {
  applyQuotaMultiplierToUsage,
  normalizeQuotaMultiplierTotal,
} from "../../src/lib/tokenQuotaStore.js";

describe("token quota multiplier", () => {
  it("normalizes invalid multiplier values back to 1", () => {
    expect(normalizeQuotaMultiplierTotal(undefined)).toBe(1);
    expect(normalizeQuotaMultiplierTotal("")).toBe(1);
    expect(normalizeQuotaMultiplierTotal(0)).toBe(1);
    expect(normalizeQuotaMultiplierTotal(-2)).toBe(1);
  });

  it("keeps valid multiplier values with two-decimal precision", () => {
    expect(normalizeQuotaMultiplierTotal(1.2)).toBe(1.2);
    expect(normalizeQuotaMultiplierTotal("1.5")).toBe(1.5);
    expect(normalizeQuotaMultiplierTotal(1.234)).toBe(1.23);
  });

  it("applies the multiplier only to total tokens while preserving raw usage", () => {
    expect(applyQuotaMultiplierToUsage({
      requests: 4,
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    }, 1.5)).toEqual({
      requests: 4,
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 225,
      rawTotalTokens: 150,
      quotaMultiplierTotal: 1.5,
    });
  });
});
