// RTK port: compress tool_result content in LLM request bodies
// Injected at the top of translateRequest (before any format translation)
import { RAW_CAP, MIN_COMPRESS_SIZE } from "./constants.js";
import { autoDetectFilter } from "./autodetect.js";
import { safeApply } from "./applyFilter.js";
import { smartTruncate } from "./filters/smartTruncate.js";
import { dedupLog } from "./filters/dedupLog.js";

let rtkEnabled = false;

export function setRtkEnabled(enabled) {
  rtkEnabled = enabled === true;
}

export function isRtkEnabled() {
  return rtkEnabled;
}

function createRtkStats() {
  return {
    enabled: true,
    applied: false,
    bytesBefore: 0,
    bytesAfter: 0,
    savedBytes: 0,
    savedPercent: 0,
    hitCount: 0,
    filters: [],
    hits: [],
    quality: {
      unsafeFallbackCount: 0,
      unsafeFallbackTriggered: false,
      rejectedCandidates: {},
    },
  };
}

function addRejectedCandidate(stats, reason) {
  if (!stats?.quality || !reason) return;
  stats.quality.rejectedCandidates[reason] = (stats.quality.rejectedCandidates[reason] || 0) + 1;
  if (reason === "anchor-loss") {
    stats.quality.unsafeFallbackCount += 1;
    stats.quality.unsafeFallbackTriggered = true;
  }
}

function finalizeRtkStats(stats) {
  if (!stats) return null;
  stats.savedBytes = Math.max(0, stats.bytesBefore - stats.bytesAfter);
  stats.savedPercent = stats.bytesBefore > 0
    ? Math.round((stats.savedBytes / stats.bytesBefore) * 1000) / 10
    : 0;
  stats.hitCount = Array.isArray(stats.hits) ? stats.hits.length : 0;
  stats.filters = Array.from(
    new Set(
      (stats.hits || []).flatMap((hit) => (
        Array.isArray(hit?.filters) && hit.filters.length > 0
          ? hit.filters
          : (hit?.filter ? [hit.filter] : [])
      )),
    ),
  );
  stats.applied = stats.savedBytes > 0 && stats.hitCount > 0;
  stats.quality.unsafeFallbackTriggered = stats.quality.unsafeFallbackCount > 0;
  return stats;
}

// Compress tool_result content in-place. Returns stats or null if disabled/failed.
export function compressMessages(body, enabled = rtkEnabled) {
  if (enabled !== true) return null;
  if (!body) return null;
  // Support both OpenAI/Claude "messages" and OpenAI Responses "input"
  const items = Array.isArray(body.messages) ? body.messages
    : Array.isArray(body.input) ? body.input
    : null;
  if (!items) return null;

  const stats = createRtkStats();
  try {
    for (let i = 0; i < items.length; i++) {
      const msg = items[i];
      if (!msg) continue;

      // Shape 4: OpenAI Responses — top-level { type:"function_call_output", output: string | [{type:"input_text", text}] }
      if (msg.type === "function_call_output") {
        if (typeof msg.output === "string") {
          msg.output = compressText(msg.output, stats, "openai-responses-string");
        } else if (Array.isArray(msg.output)) {
          for (let k = 0; k < msg.output.length; k++) {
            const part = msg.output[k];
            if (part && part.type === "input_text" && typeof part.text === "string") {
              part.text = compressText(part.text, stats, "openai-responses-array");
            }
          }
        }
        continue;
      }

      // Shape 1: OpenAI tool message — { role:"tool", content: "string" }
      if (msg.role === "tool" && typeof msg.content === "string") {
        msg.content = compressText(msg.content, stats, "openai-tool");
        continue;
      }

      if (!Array.isArray(msg.content)) continue;

      // Shape 1b: OpenAI tool message — { role:"tool", content:[{type:"text", text:"..."}] }
      if (msg.role === "tool") {
        for (let k = 0; k < msg.content.length; k++) {
          const part = msg.content[k];
          if (part && part.type === "text" && typeof part.text === "string") {
            part.text = compressText(part.text, stats, "openai-tool-array");
          }
        }
        continue;
      }

      // Shape 2/3: blocks array with tool_result entries
      for (let j = 0; j < msg.content.length; j++) {
        const block = msg.content[j];
        if (!block || block.type !== "tool_result") continue;
        if (block.is_error === true) continue; // preserve error traces

        if (typeof block.content === "string") {
          // Shape 2: claude string form
          block.content = compressText(block.content, stats, "claude-string");
        } else if (Array.isArray(block.content)) {
          // Shape 3: claude array form — compress each text part
          for (let k = 0; k < block.content.length; k++) {
            const part = block.content[k];
            if (part && part.type === "text" && typeof part.text === "string") {
              part.text = compressText(part.text, stats, "claude-array");
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("[RTK] compressMessages error:", e.message);
    return null;
  }
  return finalizeRtkStats(stats);
}

function compressText(text, stats, shape) {
  const bytesIn = text.length;
  stats.bytesBefore += bytesIn;

  if (bytesIn < MIN_COMPRESS_SIZE || bytesIn > RAW_CAP) {
    stats.bytesAfter += bytesIn;
    return text;
  }

  const fn = autoDetectFilter(text);
  if (!fn) {
    stats.bytesAfter += bytesIn;
    return text;
  }

  let current = text;
  const filtersUsed = [];
  current = tryCandidate(fn, text, current, filtersUsed, { stats });
  current = tryCandidate(dedupLog, current, current, filtersUsed, { skipIfSameFilter: fn === dedupLog, stats });
  current = tryCandidate(smartTruncate, current, current, filtersUsed, { skipIfSameFilter: fn === smartTruncate, stats });

  if (!current || current.length === 0 || current.length >= bytesIn) {
    stats.bytesAfter += bytesIn;
    return text;
  }

  stats.bytesAfter += current.length;
  const resolvedFilters = filtersUsed.length > 0 ? [...filtersUsed] : [fn.filterName || fn.name];
  stats.hits.push({
    shape,
    filter: resolvedFilters.join(","),
    filters: resolvedFilters,
    saved: bytesIn - current.length,
  });
  return current;
}

function tryCandidate(fn, anchorSource, current, filtersUsed, options = {}) {
  if (options.skipIfSameFilter) return current;
  const out = safeApply(fn, current);
  if (!out || out.length === 0) {
    addRejectedCandidate(options.stats, "empty-output");
    return current;
  }
  if (out.length >= current.length) {
    addRejectedCandidate(options.stats, "not-smaller");
    return current;
  }
  if (!preservesImportantAnchors(anchorSource, out)) {
    addRejectedCandidate(options.stats, "anchor-loss");
    return current;
  }
  filtersUsed.push(fn.filterName || fn.name);
  return out;
}

function preservesImportantAnchors(source, candidate) {
  const anchors = extractImportantAnchors(source);
  if (anchors.length === 0) return true;
  return anchors.every((anchor) => candidate.includes(anchor));
}

function extractImportantAnchors(text) {
  const lines = String(text || "").split("\n");
  const anchors = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/(error|warning|assert|failed|exception|EADDRINUSE|Caused by:|Expected:|Received:)/i.test(trimmed)) {
      anchors.push(trimmed);
    } else if (/^\s*at\s+/.test(trimmed)) {
      anchors.push(trimmed);
    } else if (/^\s*(?:\$|PS>|>\s*[A-Za-z@])/.test(trimmed)) {
      anchors.push(trimmed);
    }
    if (anchors.length >= 12) break;
  }
  return [...new Set(anchors)];
}

// Convenience: format a log line from stats
export function formatRtkLog(stats) {
  if (!stats || (!stats.hits?.length && !stats.quality?.unsafeFallbackCount)) return null;
  const saved = Number(
    stats.savedBytes !== undefined
      ? stats.savedBytes
      : Math.max(0, Number(stats.bytesBefore || 0) - Number(stats.bytesAfter || 0)),
  );
  const pctValue = stats.savedPercent !== undefined
    ? Number(stats.savedPercent || 0)
    : (Number(stats.bytesBefore || 0) > 0 ? (saved / Number(stats.bytesBefore || 0)) * 100 : 0);
  const pct = pctValue.toFixed(1);
  const filters = Array.isArray(stats.filters) && stats.filters.length > 0
    ? stats.filters.join(",")
    : Array.from(new Set((stats.hits || []).map((hit) => hit.filter).filter(Boolean))).join(",");
  const fallbackSuffix = stats.quality?.unsafeFallbackCount
    ? ` unsafeFallbacks=${stats.quality.unsafeFallbackCount}`
    : "";
  const hitCount = stats.hitCount !== undefined ? stats.hitCount : (stats.hits || []).length;
  return `[RTK] saved ${saved}B / ${stats.bytesBefore}B (${pct}%) via [${filters}] hits=${hitCount}${fallbackSuffix}`;
}
