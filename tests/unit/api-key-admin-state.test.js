import { describe, expect, it } from "vitest";

import {
  deriveApiKeyStatus,
  filterApiKeysByStatus,
  QUOTA_MULTIPLIER_PRESETS,
  buildApiKeySearchText,
  filterApiKeysBySearch,
  getApiKeyUsageMetrics,
  normalizeKeySearchTerm,
  sortApiKeys,
} from "../../src/app/(dashboard)/dashboard/endpoint/components/apiKeyAdminState.js";

describe("api key admin state helpers", () => {
  it("normalizes search input for predictable matching", () => {
    expect(normalizeKeySearchTerm("  Team A  ")).toBe("team a");
    expect(normalizeKeySearchTerm(null)).toBe("");
  });

  it("builds a searchable text blob from API key fields", () => {
    expect(
      buildApiKeySearchText({
        name: "Team A",
        key: "sk-live-abc123",
        allowedModels: ["gpt-5.4", "claude-sonnet"],
        quota: { window: "daily" },
      })
    ).toContain("claude-sonnet");
  });

  it("filters API keys by name, key, or model text", () => {
    const keys = [
      { id: "1", name: "Team A", key: "sk-live-a", allowedModels: ["gpt-5.4"] },
      { id: "2", name: "Team B", key: "sk-live-b", allowedModels: ["claude-sonnet"] },
    ];

    expect(filterApiKeysBySearch(keys, "team a")).toEqual([keys[0]]);
    expect(filterApiKeysBySearch(keys, "claude")).toEqual([keys[1]]);
    expect(filterApiKeysBySearch(keys, "")).toEqual(keys);
  });

  it("keeps the expected quota multiplier presets", () => {
    expect(QUOTA_MULTIPLIER_PRESETS).toEqual([1, 1.2, 1.5, 2, 3]);
  });

  it("derives key lifecycle status for filtering", () => {
    expect(deriveApiKeyStatus({ enabled: true })).toBe("active");
    expect(deriveApiKeyStatus({ isActive: false, disabledReason: "token_quota_exceeded" })).toBe("locked");
    expect(deriveApiKeyStatus({ expired: true })).toBe("expired");
  });

  it("filters API keys by derived status", () => {
    const keys = [
      { id: "1", enabled: true },
      { id: "2", disabledReason: "token_quota_exceeded" },
      { id: "3", expired: true },
    ];

    expect(filterApiKeysByStatus(keys, "active")).toEqual([keys[0]]);
    expect(filterApiKeysByStatus(keys, "locked")).toEqual([keys[1]]);
    expect(filterApiKeysByStatus(keys, "expired")).toEqual([keys[2]]);
  });

  it("extracts used/raw/virtual metrics for sorting", () => {
    expect(
      getApiKeyUsageMetrics({
        createdAt: "2026-05-03T10:00:00.000Z",
        usage: { totalTokens: 180, rawTotalTokens: 120 },
      })
    ).toEqual({
      used: 180,
      raw: 120,
      virtual: 60,
      createdAt: new Date("2026-05-03T10:00:00.000Z").getTime(),
    });
  });

  it("sorts keys by createdAt and usage metrics", () => {
    const keys = [
      { id: "older", name: "Older", createdAt: "2026-05-01T00:00:00.000Z", usage: { totalTokens: 50, rawTotalTokens: 30 } },
      { id: "newer", name: "Newer", createdAt: "2026-05-03T00:00:00.000Z", usage: { totalTokens: 150, rawTotalTokens: 60 } },
    ];

    expect(sortApiKeys(keys, "createdAt").map((key) => key.id)).toEqual(["newer", "older"]);
    expect(sortApiKeys(keys, "used").map((key) => key.id)).toEqual(["newer", "older"]);
    expect(sortApiKeys(keys, "virtual").map((key) => key.id)).toEqual(["newer", "older"]);
  });
});
