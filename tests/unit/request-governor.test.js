import { describe, expect, it } from "vitest";

import { applyRequestGovernor } from "../../src/sse/services/requestGovernor.js";

const settings = {
  softModelGovernorEnabled: true,
  softModelGovernorMode: "safe",
  softModelGovernorPremiumModels: ["gpt-5.5", "gpt-5.4", "gpt-5.3-codex"],
  softModelGovernorFallbackModel: "openai/gpt-4o-mini",
  softModelGovernorMaxPromptCharsForTrivial: 220,
};

describe("request governor", () => {
  it("preserves premium routing for code requests", () => {
    const result = applyRequestGovernor({
      requestedModel: "gpt-5.5",
      body: {
        model: "gpt-5.5",
        messages: [{ role: "user", content: "Implement a retry helper in TypeScript and include code." }],
      },
      settings,
    });

    expect(result.routedModel).toBe("gpt-5.5");
    expect(result.decision).toBe("preserved");
    expect(result.matchedSignals).toContain("keyword:implement");
  });

  it("preserves premium routing for debug requests", () => {
    const result = applyRequestGovernor({
      requestedModel: "gpt-5.4",
      body: {
        model: "gpt-5.4",
        messages: [{ role: "user", content: "Debug this stack trace and explain the root cause." }],
      },
      settings,
    });

    expect(result.routedModel).toBe("gpt-5.4");
    expect(result.decision).toBe("preserved");
    expect(result.matchedSignals).toContain("keyword:debug");
  });

  it("preserves premium routing for structured output requests", () => {
    const result = applyRequestGovernor({
      requestedModel: "gpt-5.5",
      body: {
        model: "gpt-5.5",
        messages: [{ role: "user", content: "Return the answer as valid JSON with title and bullets." }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "answer",
            schema: {
              type: "object",
              properties: { title: { type: "string" } },
            },
          },
        },
      },
      settings,
    });

    expect(result.routedModel).toBe("gpt-5.5");
    expect(result.decision).toBe("preserved");
    expect(result.matchedSignals).toContain("structured:response_format");
  });

  it("preserves premium routing for long-context requests", () => {
    const longPrompt = "Please review this context carefully. " + "details ".repeat(80);
    const result = applyRequestGovernor({
      requestedModel: "gpt-5.5",
      body: {
        model: "gpt-5.5",
        messages: [{ role: "user", content: longPrompt }],
      },
      settings,
    });

    expect(result.routedModel).toBe("gpt-5.5");
    expect(result.decision).toBe("preserved");
    expect(result.matchedSignals).toContain("length:prompt");
  });

  it("preserves premium routing for ambiguous technical prompts", () => {
    const result = applyRequestGovernor({
      requestedModel: "gpt-5.3-codex",
      body: {
        model: "gpt-5.3-codex",
        messages: [{ role: "user", content: "Can you analyze this API behavior and suggest the safest fix?" }],
      },
      settings,
    });

    expect(result.routedModel).toBe("gpt-5.3-codex");
    expect(result.decision).toBe("preserved");
    expect(result.reason).toBe("protected-signals");
  });

  it("downgrades a trivial greeting", () => {
    const result = applyRequestGovernor({
      requestedModel: "gpt-5.5",
      body: {
        model: "gpt-5.5",
        messages: [{ role: "user", content: "hello" }],
      },
      settings,
    });

    expect(result.routedModel).toBe("openai/gpt-4o-mini");
    expect(result.decision).toBe("downgraded");
    expect(result.reason).toBe("trivial-request");
  });

  it("downgrades a short rewrite request", () => {
    const result = applyRequestGovernor({
      requestedModel: "gpt-5.5",
      body: {
        model: "gpt-5.5",
        messages: [{ role: "user", content: "Rewrite: thanks for the update." }],
      },
      settings,
    });

    expect(result.routedModel).toBe("openai/gpt-4o-mini");
    expect(result.decision).toBe("downgraded");
    expect(result.matchedSignals).toContain("trivial:rewrite");
  });

  it("downgrades a short translation request", () => {
    const result = applyRequestGovernor({
      requestedModel: "gpt-5.4",
      body: {
        model: "gpt-5.4",
        messages: [{ role: "user", content: "Translate to English: xin chao" }],
      },
      settings,
    });

    expect(result.routedModel).toBe("openai/gpt-4o-mini");
    expect(result.decision).toBe("downgraded");
    expect(result.matchedSignals).toContain("trivial:translate");
  });

  it("leaves non-premium requests untouched", () => {
    const result = applyRequestGovernor({
      requestedModel: "openai/gpt-4o-mini",
      body: {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "hello" }],
      },
      settings,
    });

    expect(result.routedModel).toBe("openai/gpt-4o-mini");
    expect(result.decision).toBe("not-premium");
  });

  it("returns stable metadata for request logs", () => {
    const result = applyRequestGovernor({
      requestedModel: "gpt-5.5",
      body: {
        model: "gpt-5.5",
        messages: [{ role: "user", content: "summarize this paragraph" }],
      },
      settings,
    });

    expect(result).toMatchObject({
      enabled: true,
      requestedModel: "gpt-5.5",
      routedModel: "openai/gpt-4o-mini",
      decision: "downgraded",
      tierRequested: "premium",
      tierRouted: "mid",
    });
    expect(Array.isArray(result.matchedSignals)).toBe(true);
    expect(result.body.model).toBe("openai/gpt-4o-mini");
  });
});
