const DEFAULT_SETTINGS = {
  softModelGovernorEnabled: true,
  softModelGovernorMode: "safe",
  softModelGovernorPremiumModels: ["gpt-5.5", "gpt-5.4", "gpt-5.3-codex"],
  softModelGovernorFallbackModel: "openai/gpt-4o-mini",
  softModelGovernorMaxPromptCharsForTrivial: 180,
};

const PROTECTED_KEYWORDS = [
  "fix",
  "debug",
  "bug",
  "error",
  "stack trace",
  "exception",
  "implement",
  "refactor",
  "optimize",
  "research",
  "analyze",
  "analyse",
  "architecture",
  "tradeoff",
  "trade-off",
  "api",
  "endpoint",
  "function",
  "code",
  "json schema",
];

const TRIVIAL_PATTERNS = [
  { label: "trivial:greeting", regex: /^\s*(hi|hello|hey|yo|ping|test)\s*[!.?]*\s*$/i },
  { label: "trivial:rewrite", regex: /\brewrite\b/i },
  { label: "trivial:translate", regex: /\btranslate\b/i },
  { label: "trivial:summarize", regex: /\b(summarize|summary|tldr)\b/i },
  { label: "trivial:format", regex: /\b(reformat|format this|clean up this text)\b/i },
];

export function applyRequestGovernor({ requestedModel, body, settings = {} }) {
  const policy = normalizeGovernorSettings(settings);
  const requested = String(requestedModel || body?.model || "").trim();

  if (!policy.softModelGovernorEnabled) {
    return buildGovernorResult({
      policy,
      body,
      requestedModel: requested,
      routedModel: requested,
      decision: "disabled",
      reason: "governor-disabled",
      matchedSignals: [],
    });
  }

  if (!isPremiumModel(requested, policy.softModelGovernorPremiumModels)) {
    return buildGovernorResult({
      policy,
      body,
      requestedModel: requested,
      routedModel: requested,
      decision: "not-premium",
      reason: "requested-model-not-premium",
      matchedSignals: [],
    });
  }

  const analysis = analyzeRequest(body, policy);
  if (analysis.protectedSignals.length > 0) {
    return buildGovernorResult({
      policy,
      body,
      requestedModel: requested,
      routedModel: requested,
      decision: "preserved",
      reason: "protected-signals",
      matchedSignals: analysis.protectedSignals,
    });
  }

  if (analysis.isTrivial) {
    const routedModel = policy.softModelGovernorFallbackModel || requested;
    return buildGovernorResult({
      policy,
      body: { ...(body || {}), model: routedModel },
      requestedModel: requested,
      routedModel,
      decision: routedModel === requested ? "preserved" : "downgraded",
      reason: routedModel === requested ? "fallback-same-as-requested" : "trivial-request",
      matchedSignals: analysis.trivialSignals,
    });
  }

  return buildGovernorResult({
    policy,
    body,
    requestedModel: requested,
    routedModel: requested,
    decision: "preserved",
    reason: "uncertain-keep-premium",
    matchedSignals: analysis.trivialSignals,
  });
}

function buildGovernorResult({
  policy,
  body,
  requestedModel,
  routedModel,
  decision,
  reason,
  matchedSignals,
}) {
  return {
    enabled: !!policy.softModelGovernorEnabled,
    requestedModel,
    routedModel,
    decision,
    reason,
    matchedSignals: Array.isArray(matchedSignals) ? matchedSignals : [],
    tierRequested: inferTier(requestedModel, policy),
    tierRouted: inferTier(routedModel, policy),
    body: body && typeof body === "object" ? body : {},
  };
}

function normalizeGovernorSettings(settings = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings && typeof settings === "object" ? settings : {}),
  };
}

function inferTier(model, policy) {
  if (isPremiumModel(model, policy.softModelGovernorPremiumModels)) return "premium";
  if (normalizeModelName(model) === normalizeModelName(policy.softModelGovernorFallbackModel)) return "mid";
  if (/\b(mini|flash|nano|small|free)\b/i.test(String(model || ""))) return "mid";
  return "standard";
}

function isPremiumModel(model, configuredPremiumModels = []) {
  const normalizedModel = normalizeModelName(model);
  return configuredPremiumModels.some((entry) => normalizeModelName(entry) === normalizedModel);
}

function normalizeModelName(model) {
  const raw = String(model || "").trim().toLowerCase();
  if (!raw) return "";
  const parts = raw.split("/");
  return parts[parts.length - 1];
}

function analyzeRequest(body, policy) {
  const text = extractRequestText(body);
  const normalizedText = text.toLowerCase();
  const protectedSignals = [];
  const trivialSignals = [];

  if (text.includes("```")) protectedSignals.push("syntax:code-fence");

  for (const keyword of PROTECTED_KEYWORDS) {
    if (normalizedText.includes(keyword)) {
      protectedSignals.push(`keyword:${keyword}`);
    }
  }

  if (hasStructuredOutput(body)) protectedSignals.push("structured:response_format");
  if (hasTools(body)) protectedSignals.push("tools:present");
  if (hasMultimodalInput(body)) protectedSignals.push("input:multimodal");
  if (text.length > Number(policy.softModelGovernorMaxPromptCharsForTrivial || 0)) {
    protectedSignals.push("length:prompt");
  }
  if (countMessages(body) > 4) protectedSignals.push("context:multi-turn");

  for (const pattern of TRIVIAL_PATTERNS) {
    if (pattern.regex.test(text)) trivialSignals.push(pattern.label);
  }

  const isShortEnough = text.length > 0 && text.length <= Number(policy.softModelGovernorMaxPromptCharsForTrivial || 0);
  const isTrivial =
    protectedSignals.length === 0 &&
    isShortEnough &&
    trivialSignals.length > 0 &&
    !hasTools(body) &&
    !hasStructuredOutput(body) &&
    !hasMultimodalInput(body);

  return {
    text,
    protectedSignals: unique(protectedSignals),
    trivialSignals: unique(trivialSignals),
    isTrivial,
  };
}

function extractRequestText(body) {
  const chunks = [];
  collectText(body?.instructions, chunks);
  collectText(body?.system, chunks);
  collectText(body?.systemInstruction, chunks);
  collectText(body?.request?.systemInstruction, chunks);
  collectText(body?.input, chunks);
  collectText(body?.messages, chunks);
  collectText(body?.contents, chunks);
  collectText(body?.request?.contents, chunks);
  return chunks.join("\n").trim().slice(0, 24000);
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
  if (typeof value === "object") {
    if (typeof value.text === "string") chunks.push(value.text);
    if (typeof value.content === "string") chunks.push(value.content);
    if (typeof value.input_text === "string") chunks.push(value.input_text);
    if (typeof value.output_text === "string") chunks.push(value.output_text);
    if (typeof value.instructions === "string") chunks.push(value.instructions);
    if (typeof value.role === "string" && typeof value.parts === "undefined" && typeof value.content === "undefined") {
      return;
    }
    collectText(value.parts, chunks);
    if (typeof value.content !== "string") collectText(value.content, chunks);
    if (typeof value.input !== "string") collectText(value.input, chunks);
    if (typeof value.messages !== "string") collectText(value.messages, chunks);
  }
}

function hasTools(body) {
  return Array.isArray(body?.tools) && body.tools.length > 0;
}

function hasStructuredOutput(body) {
  return Boolean(
    body?.response_format ||
    body?.text?.format ||
    body?.json_schema ||
    body?.schema
  );
}

function hasMultimodalInput(body) {
  return scanForNonTextPart(body?.input) || scanForNonTextPart(body?.messages) || scanForNonTextPart(body?.contents);
}

function scanForNonTextPart(value) {
  if (!value) return false;
  if (Array.isArray(value)) return value.some((item) => scanForNonTextPart(item));
  if (typeof value === "string") return false;
  if (typeof value !== "object") return false;

  const type = String(value.type || "").toLowerCase();
  if (type && !["text", "input_text", "output_text", "message"].includes(type)) return true;
  if (value.image_url || value.file_id || value.file || value.audio) return true;
  return scanForNonTextPart(value.content) || scanForNonTextPart(value.parts);
}

function countMessages(body) {
  const messages = []
    .concat(Array.isArray(body?.messages) ? body.messages : [])
    .concat(Array.isArray(body?.input) ? body.input.filter((item) => item?.role) : [])
    .concat(Array.isArray(body?.contents) ? body.contents : []);
  return messages.length;
}

function unique(values) {
  return [...new Set(values)];
}
