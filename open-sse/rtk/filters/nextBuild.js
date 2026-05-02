function takeRelevantLines(lines) {
  const keep = [];
  const patterns = [
    /failed to compile/i,
    /type error|error:/i,
    /\.(js|jsx|ts|tsx|mjs|cjs):\d+:\d+/i,
    /^\s*>?\s*\d+\s*\|/,
    /^\s*\|/,
    /\^/,
    /next\.js build worker exited/i,
    /compiled successfully|creating an optimized production build/i,
  ];

  for (const line of lines) {
    if (patterns.some((re) => re.test(line))) keep.push(line);
    if (keep.length >= 28) break;
  }
  return keep;
}

export function nextBuild(input) {
  const lines = input.split("\n");
  const failed = /failed to compile|type error|build worker exited with code:\s*[1-9]/i.test(input);
  const relevant = takeRelevantLines(lines);

  if (relevant.length === 0) return input;

  const header = failed ? "Next build failed:" : "Next build:";
  const out = [header, ...relevant];
  if (lines.length > relevant.length) {
    out.push(`... +${lines.length - relevant.length} noisy build lines hidden`);
  }
  return out.join("\n");
}

nextBuild.filterName = "next-build";
