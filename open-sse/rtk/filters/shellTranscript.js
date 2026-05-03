const PROMPT_RE = /^\s*(?:\$|PS>|>\s*[A-Za-z@])/;
const IMPORTANT_RE = /(error|warning|warn\b|failed|exception|eaddrinuse|assert|trace|cannot|not found)/i;
const FINAL_RE = /(exit code|build failed|tests?\s+\d+|failed to compile|listening|LISTENING)/i;
const NOISE_RE = /^(Creating an optimized production build \.\.\.|info - |extract: |progress: )/i;

export function shellTranscript(input) {
  const lines = input.split("\n").map((line) => line.trimEnd());
  const commands = [];
  const important = [];
  const finals = [];
  const seen = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (PROMPT_RE.test(trimmed)) {
      commands.push(trimmed);
      continue;
    }

    if (IMPORTANT_RE.test(trimmed)) {
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        important.push(trimmed);
      }
      continue;
    }

    if (FINAL_RE.test(trimmed)) {
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        finals.push(trimmed);
      }
      continue;
    }

    if (NOISE_RE.test(trimmed)) continue;
  }

  const out = [...commands.slice(0, 8), ...important.slice(0, 10), ...finals.slice(-3)];
  const compact = out.filter(Boolean).join("\n");
  if (!compact || compact.length >= input.length) return input;
  return compact;
}

shellTranscript.filterName = "shell-transcript";
