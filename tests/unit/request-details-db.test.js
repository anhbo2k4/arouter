import { describe, it, expect } from "vitest";
import { buildPersistedRequestDetailRecord } from "../../src/lib/requestDetailsDb.js";

describe("buildPersistedRequestDetailRecord", () => {
  it("keeps RTK, governor, and skill metadata in persisted request details", () => {
    const record = buildPersistedRequestDetailRecord(
      {
        id: "detail-1",
        provider: "openai",
        model: "gpt-5.5",
        apiKey: "sk-live",
        timestamp: "2026-05-03T10:00:00.000Z",
        status: "success",
        latency: { ttft: 120, total: 900 },
        tokens: { prompt_tokens: 100, completion_tokens: 50 },
        skillOrchestration: {
          intent: "coding",
          mode: "lite",
          selectedSkills: 2,
          estimatedCharsSaved: 420,
        },
        requestGovernor: {
          decision: "preserved",
          reason: "contains-code",
          requestedModel: "gpt-5.5",
          routedModel: "gpt-5.5",
        },
        rtk: {
          enabled: true,
          applied: true,
          savedBytes: 1600,
          hitCount: 2,
          filters: ["git-diff", "smart-truncate"],
          quality: {
            unsafeFallbackCount: 1,
            unsafeFallbackTriggered: true,
            rejectedCandidates: { "anchor-loss": 1 },
          },
        },
        request: { model: "gpt-5.5" },
        providerRequest: { model: "gpt-5.5" },
        providerResponse: { ok: true },
        response: { content: "done" },
      },
      { maxJsonSize: 1024 },
    );

    expect(record.skillOrchestration).toMatchObject({
      intent: "coding",
      mode: "lite",
      estimatedCharsSaved: 420,
    });
    expect(record.requestGovernor).toMatchObject({
      decision: "preserved",
      reason: "contains-code",
    });
    expect(record.rtk).toMatchObject({
      enabled: true,
      applied: true,
      savedBytes: 1600,
      hitCount: 2,
    });
  });
});
