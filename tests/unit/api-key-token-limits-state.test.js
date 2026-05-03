import { describe, expect, it } from "vitest";
import {
  buildRowEditSnapshot,
  mergeRowEditsWithDirtyRows,
} from "../../src/app/(dashboard)/dashboard/endpoint/components/apiKeyTokenLimitState.js";

describe("api key token limits row edit state", () => {
  it("preserves dirty row edits while refreshing clean rows from latest data", () => {
    const nextKeys = [
      {
        id: "dirty-key",
        quota: { window: "daily", maxTotalTokens: 5000, maxInputTokens: 100, maxOutputTokens: 200 },
        allowedModels: ["gpt-4.1"],
        expiresAt: "2026-05-05T10:30:00.000Z",
      },
      {
        id: "clean-key",
        quota: { window: "weekly", maxTotalTokens: 9000, maxInputTokens: 300, maxOutputTokens: 400 },
        allowedModels: ["gpt-5"],
        expiresAt: "2026-05-07T11:45:00.000Z",
      },
    ];

    const previousEdits = {
      "dirty-key": {
        window: "monthly",
        maxTotalTokens: 7777,
        maxInputTokens: 11,
        maxOutputTokens: 22,
        quotaMultiplierTotal: 1.5,
        allowedModels: "custom-a, custom-b",
        expiresAt: "2026-05-09T09:00",
      },
    };

    const merged = mergeRowEditsWithDirtyRows(nextKeys, previousEdits, { "dirty-key": true });

    expect(merged["dirty-key"]).toEqual(previousEdits["dirty-key"]);
    expect(merged["clean-key"]).toEqual(buildRowEditSnapshot(nextKeys[1]));
  });

  it("creates a normalized row edit snapshot from latest key data", () => {
    expect(buildRowEditSnapshot({
      quota: { window: "daily", maxTotalTokens: "42", maxInputTokens: null, maxOutputTokens: undefined },
      allowedModels: ["model-a", "model-b"],
      expiresAt: "2026-05-05T10:30:00.000Z",
    })).toEqual({
      window: "daily",
      maxTotalTokens: 42,
      maxInputTokens: 0,
      maxOutputTokens: 0,
      quotaMultiplierTotal: 1,
      allowedModels: "model-a, model-b",
      expiresAt: "2026-05-05T10:30",
    });
  });
});
