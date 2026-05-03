import catalog from "./skillCatalog.generated.json" with { type: "json" };
import { FORMATS } from "../translator/formats.js";

const MARKER = "Arouter Skill Orchestration";
const DEFAULT_MAX_SKILLS = 6;
const DEFAULT_MAX_CHARS_PER_SKILL = 1400;
const DEFAULT_MAX_TOTAL_CHARS = 7200;
const COMPACT_MAX_SKILLS = 3;
const COMPACT_MAX_CHARS_PER_SKILL = 220;
const COMPACT_MAX_TOTAL_CHARS = 1200;
const ALWAYS_ON_SKILLS = new Set([
  "superpowers:using-superpowers",
  "using-superpowers",
]);

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "your", "you",
  "are", "was", "were", "can", "will", "hay", "cho", "cua", "của", "và",
  "voi", "với", "mot", "một", "cac", "các", "thi", "thì", "la", "là",
]);
const SIMPLE_PATTERNS = [
  /\b(hi|hello|hey|thanks|thank you|ok|okay|ping|test)\b/i,
  /\b(show|list|check)\s+(me\s+)?(my\s+)?models?\b/i,
  /\b(version|status|health|uptime)\b/i,
];
const DEBUG_PATTERNS = [
  /\b(fix|debug|bug|error|failing|failure|exception|stack trace|regression|crash|broken|issue)\b/i,
];
const CODING_PATTERNS = [
  /\b(implement|build|create|write|refactor|add|ship|feature|route|component|endpoint|function|logic|handler)\b/i,
];
const DESIGN_PATTERNS = [
  /\b(design|redesign|ui|ux|layout|css|theme|landing page|visual|typography|brand)\b/i,
];
const RESEARCH_PATTERNS = [
  /\b(research|investigate|analyze|audit|compare|review|understand|explore|evaluate|docs|documentation|seo)\b/i,
];
const STRONG_TASK_PATTERNS = [
  /\b(test|tests|failing test|verify|verification)\b/i,
  /\b(production|shipping|runtime|incident|performance|latency)\b/i,
  /\b(plan|architecture|trade-?offs?)\b/i,
];

export function applySkillOrchestration(body, sourceFormat, options = {}) {
  if (!body || typeof body !== "object") return body;

  const promptText = extractRequestText(body);
  const selectedSkills = selectRelevantSkills(promptText, options.catalog || catalog, options);
  const policy = resolveSkillPolicy(promptText, selectedSkills, options);
  const fullInstruction = selectedSkills.length
    ? buildSkillInstruction(selectedSkills, {
      mode: "full",
      maxSkills: DEFAULT_MAX_SKILLS,
      maxCharsPerSkill: DEFAULT_MAX_CHARS_PER_SKILL,
      maxTotalChars: DEFAULT_MAX_TOTAL_CHARS,
    })
    : "";
  const instruction = buildSkillInstruction(selectedSkills, policy);
  const estimatedCharsSaved = Math.max(0, fullInstruction.length - instruction.length);
  if (!instruction) {
    options.onApplied?.({
      intent: policy.intent,
      mode: policy.mode,
      selectedSkills: 0,
      addedChars: 0,
      estimatedCharsSaved,
    });
    return body;
  }

  const nextBody = injectInstruction(body, sourceFormat, instruction);
  options.onApplied?.({
    intent: policy.intent,
    mode: policy.mode,
    selectedSkills: Math.min(selectedSkills.length, policy.maxSkills || selectedSkills.length),
    addedChars: instruction.length,
    estimatedCharsSaved,
  });
  return nextBody;
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

export function classifyRequestIntent(promptText) {
  const text = String(promptText || "").trim();
  if (!text) return "simple";

  const textLength = text.length;
  const termCount = tokenize(text).length;

  if (matchesAny(DEBUG_PATTERNS, text)) return "debug";
  if (matchesAny(DESIGN_PATTERNS, text)) return "design";
  if (matchesAny(RESEARCH_PATTERNS, text)) return "research";
  if (matchesAny(CODING_PATTERNS, text)) return "coding";

  const looksSimple = (textLength <= 80 && termCount <= 10) || matchesAny(SIMPLE_PATTERNS, text);
  return looksSimple ? "simple" : "unknown";
}

export function resolveSkillPolicy(promptText, selectedSkills, options = {}) {
  const intent = options.intent || classifyRequestIntent(promptText);
  const skills = Array.isArray(selectedSkills) ? selectedSkills : [];
  const relevantSkills = skills.filter((skill) => !isAlwaysOnSkill(skill));
  const signalStrength = estimateTaskStrength(promptText, intent);

  if (!skills.length) {
    return { intent, mode: "none", maxSkills: 0, maxCharsPerSkill: 0, maxTotalChars: 0 };
  }

  let mode = options.mode || "none";

  if (!options.mode) {
    if (intent === "simple") {
      mode = relevantSkills.length > 0 && signalStrength >= 2 ? "compact" : "none";
    } else if (intent === "debug") {
      mode = signalStrength >= 1 ? "full" : "compact";
    } else if (intent === "coding") {
      mode = signalStrength >= 3 ? "full" : "compact";
    } else if (intent === "design" || intent === "research") {
      mode = signalStrength >= 2 ? "full" : "compact";
    } else {
      mode = relevantSkills.length > 0 ? "compact" : "none";
    }
  }

  if (mode === "none") {
    return { intent, mode, maxSkills: 0, maxCharsPerSkill: 0, maxTotalChars: 0 };
  }

  if (mode === "compact") {
    return {
      intent,
      mode,
      maxSkills: numericOverride(options.maxSkills, COMPACT_MAX_SKILLS),
      maxCharsPerSkill: numericOverride(options.maxCharsPerSkill, COMPACT_MAX_CHARS_PER_SKILL),
      maxTotalChars: numericOverride(options.maxTotalChars, COMPACT_MAX_TOTAL_CHARS),
    };
  }

  return {
    intent,
    mode: "full",
    maxSkills: numericOverride(options.maxSkills, DEFAULT_MAX_SKILLS),
    maxCharsPerSkill: numericOverride(options.maxCharsPerSkill, DEFAULT_MAX_CHARS_PER_SKILL),
    maxTotalChars: numericOverride(options.maxTotalChars, DEFAULT_MAX_TOTAL_CHARS),
  };
}

export function buildSkillInstruction(selectedSkills, options = {}) {
  if (!selectedSkills?.length) return "";

  const mode = options.mode || "full";
  if (mode === "none") return "";

  if (mode === "compact") {
    return buildCompactSkillInstruction(selectedSkills, options);
  }

  const maxSkills = numericOverride(options.maxSkills, DEFAULT_MAX_SKILLS);
  const maxCharsPerSkill = numericOverride(options.maxCharsPerSkill, DEFAULT_MAX_CHARS_PER_SKILL);
  const maxTotalChars = numericOverride(options.maxTotalChars, DEFAULT_MAX_TOTAL_CHARS);
  let remaining = maxTotalChars;
  const blocks = [];

  for (const skill of selectedSkills.slice(0, maxSkills)) {
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

function buildCompactSkillInstruction(selectedSkills, options = {}) {
  const maxSkills = numericOverride(options.maxSkills, COMPACT_MAX_SKILLS);
  const maxCharsPerSkill = numericOverride(options.maxCharsPerSkill, COMPACT_MAX_CHARS_PER_SKILL);
  const maxTotalChars = numericOverride(options.maxTotalChars, COMPACT_MAX_TOTAL_CHARS);
  let remaining = maxTotalChars;
  const lines = [];

  for (const skill of selectedSkills.slice(0, maxSkills)) {
    if (remaining <= 0) break;
    const summarySource = String(skill.description || skill.content || "").trim();
    const summary = collapseWhitespace(summarySource).slice(0, Math.min(maxCharsPerSkill, remaining));
    remaining -= summary.length;
    lines.push(`- ${skill.name || skill.id} (${skill.source || "local"}): ${summary}`);
  }

  if (!lines.length) return "";

  return [
    `<${MARKER}>`,
    "Server-side skill routing is enabled. Apply only the relevant guidance below.",
    "For coding/debugging work: prefer minimal scoped edits, test-first fixes when practical, and fresh verification before claiming success.",
    "",
    "Relevant skills:",
    ...lines,
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

function matchesAny(patterns, text) {
  return patterns.some((pattern) => pattern.test(text));
}

function estimateTaskStrength(promptText, intent) {
  const text = String(promptText || "");
  let strength = 0;
  if (matchesAny(STRONG_TASK_PATTERNS, text)) strength += 1;
  if (intent !== "simple" && tokenize(text).length >= 12) strength += 1;
  if (countPatternMatches([...DEBUG_PATTERNS, ...CODING_PATTERNS, ...DESIGN_PATTERNS, ...RESEARCH_PATTERNS], text) >= 2) {
    strength += 1;
  }
  return strength;
}

function countPatternMatches(patterns, text) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function isAlwaysOnSkill(skill) {
  const id = String(skill?.id || "");
  const name = String(skill?.name || "");
  return ALWAYS_ON_SKILLS.has(id) || ALWAYS_ON_SKILLS.has(name);
}

function numericOverride(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function collapseWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}
