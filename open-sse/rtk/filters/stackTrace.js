const FRAME_RE = /^\s*at\s+.+/;
const APP_FRAME_RE = /(?:src|app|open-sse|tests)[/\\].+:\d+(?::\d+)?/i;
const NODE_INTERNAL_RE = /node:internal|node_modules/i;
const CAUSED_BY_RE = /^Caused by:/i;
const FINAL_STATUS_RE = /(Build failed|exit code|fatal|Unhandled|uncaught)/i;

export function stackTrace(input) {
  const lines = input.split("\n").map((line) => line.trimEnd());
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  if (nonEmpty.length < 4) return input;

  const headline = nonEmpty[0];
  const causedBy = [];
  const appFrames = [];
  const otherFrames = [];
  const finalLines = [];
  const seenFrames = new Set();

  for (const line of nonEmpty.slice(1)) {
    if (CAUSED_BY_RE.test(line)) {
      causedBy.push(line);
      continue;
    }

    if (FRAME_RE.test(line)) {
      if (seenFrames.has(line)) continue;
      seenFrames.add(line);
      if (APP_FRAME_RE.test(line)) appFrames.push(line);
      else if (!NODE_INTERNAL_RE.test(line)) otherFrames.push(line);
      continue;
    }

    if (FINAL_STATUS_RE.test(line)) {
      finalLines.push(line);
    }
  }

  const frameLines = [...appFrames.slice(0, 8), ...otherFrames.slice(0, 4)].slice(0, 10);
  const out = [headline, ...causedBy.slice(0, 3), ...frameLines, ...finalLines.slice(-2)];
  const compact = out.filter(Boolean).join("\n");
  if (!compact || compact.length >= input.length) return input;
  return compact;
}

stackTrace.filterName = "stack-trace";
