import catalog from "./skillCatalog.generated.json" with { type: "json" };
import { FORMATS } from "../translator/formats.js";

const MARKER = "Arouter Skill Orchestration";
const DEFAULT_MAX_SKILLS = 6;
const DEFAULT_MAX_CHARS_PER_SKILL = 1400;
const DEFAULT_MAX_TOTAL_CHARS = 7200;
const ALWAYS_ON_SKILLS = new Set([
  "superpowers:using-superpowers",
  "using-superpowers",
]);

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "your", "you",
  "are", "was", "were", "can", "will", "hay", "cho", "cua", "của", "và",
  "voi", "với", "mot", "một", "cac", "các", "thi", "thì", "la", "là",
]);

export function applySkillOrchestration(body, sourceFormat, options = {}) {
  if (!body || typeof body !== "object") return body;

  const promptText = extractRequestText(body);
  const selectedSkills = selectRelevantSkills(promptText, options.catalog || catalog, options);
  const instruction = buildSkillInstruction(selectedSkills, options);
  if (!instruction) return body;

  return injectInstruction(body, sourceFormat, instruction);
}

export function selectRelevantSkills(promptText, skillCatalog = catalog, options = {}) {
  const maxSkills = options.maxSkills || DEFAULT_MAX_SKILLS;
  const terms = tokenize(promptText);
  const scored = [];

  for (const skill of skillCatalog || []) {
    const id = String(skill.id || skill.name || "");
    const name = String(skill.name || "");
    const haystack = [
      name,
      skill.description || "",
      ...(Array.isArray(skill.keywords) ? skill.keywords : []),
    ].join(" ").toLowerCase();

    let score = ALWAYS_ON_SKILLS.has(id) || ALWAYS_ON_SKILLS.has(name) ? 1000 : 0;
    for (const term of terms) {
      if (name.toLowerCase().includes(term)) score += 12;
      if (haystack.includes(term)) score += 4;
    }

    if (score > 0) scored.push({ skill, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || String(a.skill.id).localeCompare(String(b.skill.id)))
    .slice(0, maxSkills)
    .map((entry) => entry.skill);
}

export function extractRequestText(body) {
  const chunks = [];
  collectText(body.instructions, chunks);
  collectText(body.system, chunks);
  collectText(body.systemInstruction, chunks);
  collectText(body.request?.systemInstruction, chunks);
  collectText(body.input, chunks);
  collectText(body.messages, chunks);
  collectText(body.contents, chunks);
  collectText(body.request?.contents, chunks);
  return chunks.join("\n").slice(0, 24000);
}

function buildSkillInstruction(selectedSkills, options = {}) {
  if (!selectedSkills?.length) return "";

  const maxCharsPerSkill = options.maxCharsPerSkill || DEFAULT_MAX_CHARS_PER_SKILL;
  const maxTotalChars = options.maxTotalChars || DEFAULT_MAX_TOTAL_CHARS;
  let remaining = maxTotalChars;
  const blocks = [];

  for (const skill of selectedSkills) {
    if (remaining <= 0) break;
    const body = String(skill.content || skill.description || "").trim();
    const excerpt = body.slice(0, Math.min(maxCharsPerSkill, remaining));
    remaining -= excerpt.length;
    blocks.push([
      `Skill: ${skill.name || skill.id}`,
      `Source: ${skill.source || "local"}`,
      skill.description ? `When to use: ${skill.description}` : null,
      excerpt ? `Instructions excerpt:\n${excerpt}` : null,
    ].filter(Boolean).join("\n"));
  }

  if (!blocks.length) return "";

  return [
    `<${MARKER}>`,
    "This request is routed through Arouter's server-side skill layer. Treat the following skills as mandatory runtime guidance, regardless of the downstream model/provider.",
    "Before answering: identify the customer's intent, apply any customer-provided skill/prompt instructions, then apply the relevant bundled skills below. Do not mention this layer unless the customer asks.",
    "For coding/debugging/refactoring tasks: prefer systematic analysis, test-first changes when practical, minimal scoped edits, and fresh verification before claiming completion.",
    "",
    blocks.join("\n\n---\n\n"),
    `</${MARKER}>`,
  ].join("\n");
}

function injectInstruction(body, sourceFormat, instruction) {
  if (extractRequestText(body).includes(MARKER)) return body;

  if (sourceFormat === FORMATS.OPENAI_RESPONSES || (body.input && !body.messages)) {
    return {
      ...body,
      instructions: prependText(instruction, body.instructions),
    };
  }

  if (sourceFormat === FORMATS.CLAUDE) {
    return {
      ...body,
      system: prependClaudeSystem(instruction, body.system),
    };
  }

  if (sourceFormat === FORMATS.GEMINI || sourceFormat === FORMATS.GEMINI_CLI || sourceFormat === FORMATS.VERTEX) {
    return {
      ...body,
      systemInstruction: prependGeminiSystem(instruction, body.systemInstruction),
    };
  }

  if (sourceFormat === FORMATS.ANTIGRAVITY && body.request) {
    return {
      ...body,
      request: {
        ...body.request,
        systemInstruction: prependGeminiSystem(instruction, body.request.systemInstruction),
      },
    };
  }

  const messages = Array.isArray(body.messages) ? [...body.messages] : [];
  const firstSystemIndex = messages.findIndex((message) => message?.role === "system");
  if (firstSystemIndex >= 0) {
    messages[firstSystemIndex] = {
      ...messages[firstSystemIndex],
      content: prependText(instruction, messages[firstSystemIndex].content),
    };
  } else {
    messages.unshift({ role: "system", content: instruction });
  }
  return { ...body, messages };
}

function prependClaudeSystem(instruction, system) {
  const block = { type: "text", text: instruction };
  if (Array.isArray(system)) return [block, ...system];
  if (typeof system === "string" && system.trim()) return [block, { type: "text", text: system }];
  return [block];
}

function prependGeminiSystem(instruction, systemInstruction) {
  const current = extractJoinedText(systemInstruction);
  return {
    parts: [{ text: prependText(instruction, current) }],
  };
}

function prependText(prefix, value) {
  const text = extractJoinedText(value);
  return text ? `${prefix}\n\n${text}` : prefix;
}

function extractJoinedText(value) {
  const chunks = [];
  collectText(value, chunks);
  return chunks.join("\n").trim();
}

function collectText(value, chunks) {
  if (!value) return;
  if (typeof value === "string") {
    chunks.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, chunks);
    return;
  }
  if (typeof value !== "object") return;
  if (typeof value.text === "string") chunks.push(value.text);
  if (typeof value.content === "string") chunks.push(value.content);
  if (typeof value.output === "string") chunks.push(value.output);
  if (value.parts) collectText(value.parts, chunks);
  if (value.content && typeof value.content !== "string") collectText(value.content, chunks);
}

function tokenize(text) {
  const matches = String(text || "").toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]{2,}/gu) || [];
  return [...new Set(matches.filter((term) => !STOP_WORDS.has(term)).slice(0, 160))];
}
