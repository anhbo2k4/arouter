import { describe, expect, it } from "vitest";

import { aggregateGovernorStats } from "../../src/lib/governorStats.js";

describe("governor stats aggregation", () => {
  it("aggregates preserved vs downgraded totals and ignores unrelated records", () => {
    const result = aggregateGovernorStats({
      details: [
        {
          timestamp: "2026-05-03T10:00:00.000Z",
          apiKey: "sk-live-a",
          requestGovernor: {
            decision: "downgraded",
            reason: "trivial-request",
            requestedModel: "gpt-5.5",
            routedModel: "openai/gpt-4o-mini",
          },
        },
        {
          timestamp: "2026-05-03T10:05:00.000Z",
          apiKey: "sk-live-a",
          requestGovernor: {
            decision: "preserved",
            reason: "protected-signals",
            requestedModel: "gpt-5.5",
            routedModel: "gpt-5.5",
          },
        },
        {
          timestamp: "2026-05-03T10:10:00.000Z",
          apiKey: "sk-live-b",
          requestGovernor: {
            decision: "downgraded",
            reason: "trivial-request",
            requestedModel: "gpt-5.4",
            routedModel: "openai/gpt-4o-mini",
          },
        },
        {
          timestamp: "2026-05-03T10:15:00.000Z",
          apiKey: "sk-live-b",
          requestGovernor: {
            decision: "preserved",
            reason: "protected-signals",
            requestedModel: "gpt-5.3-codex",
            routedModel: "gpt-5.3-codex",
          },
        },
        {
          timestamp: "2026-05-03T10:20:00.000Z",
          apiKey: "sk-live-b",
          requestGovernor: {
            decision: "not-premium",
            reason: "requested-model-not-premium",
            requestedModel: "openai/gpt-4o-mini",
            routedModel: "openai/gpt-4o-mini",
          },
        },
        {
          timestamp: "2026-05-03T10:25:00.000Z",
          apiKey: "sk-live-c",
        },
      ],
      tokenKeys: [
        { id: "key-a", name: "Team A", key: "sk-live-a" },
        { id: "key-b", name: "Team B", key: "sk-live-b" },
      ],
    });

    expect(result.summary).toMatchObject({
      preserved: 2,
      downgraded: 2,
      governed: 4,
      ignored: 2,
    });
    expect(result.summary.downgradeRate).toBe(50);
    expect(result.summary.reasons).toEqual({
      "trivial-request": 2,
      "protected-signals": 2,
    });
  });

  it("groups stats by key and keeps latest requested/routed model metadata", () => {
    const result = aggregateGovernorStats({
      details: [
        {
          timestamp: "2026-05-03T10:00:00.000Z",
          apiKey: "sk-live-a",
          requestGovernor: {
            decision: "downgraded",
            reason: "trivial-request",
            requestedModel: "gpt-5.5",
            routedModel: "openai/gpt-4o-mini",
          },
        },
        {
          timestamp: "2026-05-03T10:02:00.000Z",
          apiKey: "sk-live-a",
          requestGovernor: {
            decision: "downgraded",
            reason: "trivial-request",
            requestedModel: "gpt-5.4",
            routedModel: "openai/gpt-4o-mini",
          },
        },
        {
          timestamp: "2026-05-03T10:05:00.000Z",
          apiKey: "sk-live-a",
          requestGovernor: {
            decision: "preserved",
            reason: "protected-signals",
            requestedModel: "gpt-5.5",
            routedModel: "gpt-5.5",
          },
        },
        {
          timestamp: "2026-05-03T10:01:00.000Z",
          apiKey: "sk-live-b",
          requestGovernor: {
            decision: "preserved",
            reason: "protected-signals",
            requestedModel: "gpt-5.3-codex",
            routedModel: "gpt-5.3-codex",
          },
        },
      ],
      tokenKeys: [
        { id: "key-a", name: "Team A", key: "sk-live-a" },
        { id: "key-b", name: "Team B", key: "sk-live-b" },
      ],
    });

    expect(result.byKey.map((item) => item.keyId)).toEqual(["key-a", "key-b"]);
    expect(result.byKey[0]).toMatchObject({
      keyId: "key-a",
      keyName: "Team A",
      preserved: 1,
      downgraded: 2,
      governed: 3,
      downgradeRate: 67,
      topReason: "trivial-request",
      latestRequestedModel: "gpt-5.5",
      latestRoutedModel: "gpt-5.5",
      lastDecision: "preserved",
    });
  });

  it("falls back to a masked key label when the key is unknown", () => {
    const result = aggregateGovernorStats({
      details: [
        {
          timestamp: "2026-05-03T10:00:00.000Z",
          apiKey: "sk-live-unknown-value",
          requestGovernor: {
            decision: "downgraded",
            reason: "trivial-request",
            requestedModel: "gpt-5.5",
            routedModel: "openai/gpt-4o-mini",
          },
        },
      ],
      tokenKeys: [],
    });

    expect(result.byKey[0].keyId).toBeNull();
    expect(result.byKey[0].keyName).toBe("sk-live-...");
    expect(result.byKey[0].maskedKey).toBe("sk-live-...");
  });
});
