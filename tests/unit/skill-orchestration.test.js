import { describe, expect, it } from "vitest";

import { FORMATS } from "../../open-sse/translator/formats.js";
import {
  applySkillOrchestration,
  buildSkillInstruction,
  classifyRequestIntent,
  extractRequestText,
  resolveSkillPolicy,
  selectRelevantSkills,
} from "../../open-sse/skills/skillOrchestrator.js";

const catalog = [
  {
    id: "superpowers:using-superpowers",
    name: "using-superpowers",
    source: "superpowers",
    description: "Use relevant skills before acting.",
    content: "Always check for relevant skills, then apply the smallest useful workflow.",
    keywords: ["skills", "workflow", "agent"],
  },
  {
    id: "superpowers:test-driven-development",
    name: "test-driven-development",
    source: "superpowers",
    description: "Use when implementing bug fixes or behavior changes.",
    content: "Write the failing test first. Watch it fail. Implement minimal code. Verify green.",
    keywords: ["test", "bug", "feature", "implementation"],
  },
  {
    id: "claude-skills:seo-audit",
    name: "seo-audit",
    source: "claude-skills",
    description: "Review pages for SEO issues and search intent.",
    content: "Analyze title tags, headings, internal links, schema, and search intent.",
    keywords: ["seo", "search", "schema", "content"],
  },
];

describe("skill orchestration", () => {
  it("selects always-on workflow skills plus skills relevant to the customer prompt", () => {
    const selected = selectRelevantSkills("Fix this bug with a test, then improve SEO metadata", catalog, {
      maxSkills: 4,
    });

    expect(selected.map((skill) => skill.id)).toContain("superpowers:using-superpowers");
    expect(selected.map((skill) => skill.id)).toContain("superpowers:test-driven-development");
    expect(selected.map((skill) => skill.id)).toContain("claude-skills:seo-audit");
  });

  it("classifies trivial prompts as simple intent", () => {
    expect(classifyRequestIntent("hello")).toBe("simple");
    expect(classifyRequestIntent("show me my models")).toBe("simple");
  });

  it("resolves trivial prompts to no orchestration even with always-on skills present", () => {
    const selected = selectRelevantSkills("hello", catalog, { maxSkills: 3 });
    const policy = resolveSkillPolicy("hello", selected);

    expect(policy.intent).toBe("simple");
    expect(policy.mode).toBe("none");
  });

  it("uses full orchestration for strong debug requests", () => {
    const prompt = "Fix this production bug with a failing test first, then verify the patch before shipping.";
    const selected = selectRelevantSkills(prompt, catalog, { maxSkills: 3 });
    const policy = resolveSkillPolicy(prompt, selected);

    expect(policy.intent).toBe("debug");
    expect(policy.mode).toBe("full");
  });

  it("builds a shorter compact instruction than the full instruction", () => {
    const selected = selectRelevantSkills("Fix a bug with tests.", catalog, { maxSkills: 3 });

    const compactInstruction = buildSkillInstruction(selected, {
      mode: "compact",
      maxSkills: 2,
      maxCharsPerSkill: 90,
      maxTotalChars: 300,
    });

    const fullInstruction = buildSkillInstruction(selected, {
      mode: "full",
      maxSkills: 2,
      maxCharsPerSkill: 500,
      maxTotalChars: 1200,
    });

    expect(compactInstruction).toContain("Arouter Skill Orchestration");
    expect(compactInstruction).toContain("test-driven-development");
    expect(compactInstruction.length).toBeLessThan(fullInstruction.length);
  });

  it("extracts customer text from Responses API input and instructions", () => {
    const text = extractRequestText({
      instructions: "You are an agent.",
      input: [
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "Build a dashboard and write tests." }],
        },
      ],
    });

    expect(text).toContain("You are an agent.");
    expect(text).toContain("Build a dashboard and write tests.");
  });

  it("skips orchestration for trivial chat prompts", () => {
    let observed = null;
    const body = applySkillOrchestration(
      {
        model: "openai/gpt",
        messages: [{ role: "user", content: "hello there" }],
      },
      FORMATS.OPENAI,
      {
        catalog,
        maxSkills: 3,
        onApplied: (stats) => {
          observed = stats;
        },
      },
    );

    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
    expect(observed.mode).toBe("none");
    expect(observed.estimatedCharsSaved).toBeGreaterThan(0);
  });

  it("injects a compact skill instruction into OpenAI chat messages", () => {
    const body = applySkillOrchestration(
      {
        model: "openai/gpt",
        messages: [{ role: "user", content: "Fix a production bug with tests." }],
      },
      FORMATS.OPENAI,
      { catalog, maxSkills: 3 },
    );

    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("Arouter Skill Orchestration");
    expect(body.messages[0].content).toContain("test-driven-development");
    expect(body.messages[1].role).toBe("user");
  });

  it("injects into OpenAI Responses instructions without changing input items", () => {
    const body = applySkillOrchestration(
      {
        model: "openai/gpt",
        instructions: "Existing instructions.",
        input: "Run an SEO audit.",
      },
      FORMATS.OPENAI_RESPONSES,
      { catalog, maxSkills: 3 },
    );

    expect(body.instructions).toContain("Arouter Skill Orchestration");
    expect(body.instructions).toContain("Existing instructions.");
    expect(body.input).toBe("Run an SEO audit.");
  });

  it("injects input-only chat bodies into instructions instead of creating messages", () => {
    const body = applySkillOrchestration(
      {
        model: "cursor/model",
        input: [{ role: "user", content: "Fix a bug with tests." }],
      },
      FORMATS.OPENAI,
      { catalog, maxSkills: 3 },
    );

    expect(body.instructions).toContain("Arouter Skill Orchestration");
    expect(body.messages).toBeUndefined();
    expect(body.input).toHaveLength(1);
  });

  it("injects into Claude top-level system blocks", () => {
    const body = applySkillOrchestration(
      {
        model: "claude/sonnet",
        system: [{ type: "text", text: "Existing Claude system." }],
        messages: [{ role: "user", content: [{ type: "text", text: "Fix this bug." }] }],
      },
      FORMATS.CLAUDE,
      { catalog, maxSkills: 3 },
    );

    expect(body.system[0].text).toContain("Arouter Skill Orchestration");
    expect(body.system[1].text).toBe("Existing Claude system.");
  });

  it("injects into Gemini systemInstruction", () => {
    const body = applySkillOrchestration(
      {
        model: "gemini/pro",
        contents: [{ role: "user", parts: [{ text: "Create SEO content." }] }],
      },
      FORMATS.GEMINI,
      { catalog, maxSkills: 3 },
    );

    expect(body.systemInstruction.parts[0].text).toContain("Arouter Skill Orchestration");
    expect(body.contents[0].parts[0].text).toBe("Create SEO content.");
  });
});
