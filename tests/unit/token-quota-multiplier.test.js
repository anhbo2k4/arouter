import { describe, expect, it } from "vitest";

import {
  applyQuotaMultiplierToUsage,
  applyQuotaMultiplierToRows,
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

  it("accounts quota with fractional carry so small requests do not jump too aggressively", () => {
    expect(applyQuotaMultiplierToRows([
      { inputTokens: 1, outputTokens: 0, totalTokens: 1 },
      { inputTokens: 1, outputTokens: 0, totalTokens: 1 },
    ], 1.5)).toEqual({
      requests: 2,
      inputTokens: 2,
      outputTokens: 0,
      totalTokens: 3,
      rawTotalTokens: 2,
      cachedTokens: 0,
      cacheCreationTokens: 0,
      reasoningTokens: 0,
      quotaMultiplierTotal: 1.5,
    });
  });

  it("still converges to the configured multiplier over larger usage", () => {
    expect(applyQuotaMultiplierToRows([
      { inputTokens: 25, outputTokens: 25, totalTokens: 50 },
    ], 1.5)).toMatchObject({
      totalTokens: 75,
      rawTotalTokens: 50,
      quotaMultiplierTotal: 1.5,
    });
  });
});
