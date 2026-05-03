// Port concept of filter::smart_truncate (rtk/src/core/filter.rs).
// Keep HEAD + TAIL lines, replace middle with "... +N lines truncated".
import { SMART_TRUNCATE_HEAD, SMART_TRUNCATE_TAIL, SMART_TRUNCATE_MIN_LINES } from "../constants.js";

const IMPORTANT_LINE_RE = /(error|warning|assert|failed|exception|Expected:|Received:|EADDRINUSE|Caused by:|^\s*at\s+|[/\\].+:\d+(?::\d+)?)/i;

export function smartTruncate(input) {
  const lines = input.split("\n");
  if (lines.length < SMART_TRUNCATE_MIN_LINES) return input;

  const head = lines.slice(0, SMART_TRUNCATE_HEAD);
  const tail = lines.slice(lines.length - SMART_TRUNCATE_TAIL);
  const middle = lines.slice(SMART_TRUNCATE_HEAD, lines.length - SMART_TRUNCATE_TAIL);
  const importantMiddle = [];
  const seen = new Set();
  for (const line of middle) {
    if (!IMPORTANT_LINE_RE.test(line)) continue;
    if (seen.has(line)) continue;
    seen.add(line);
    importantMiddle.push(line);
    if (importantMiddle.length >= 12) break;
  }
  const cut = lines.length - head.length - tail.length - importantMiddle.length;
  const spacer = importantMiddle.length > 0 ? ["... important middle lines kept ...", ...importantMiddle] : [];
  return [...head, `... +${cut} lines truncated`, ...spacer, ...tail].join("\n");
}

smartTruncate.filterName = "smart-truncate";
