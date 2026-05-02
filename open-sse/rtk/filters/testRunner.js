function collectTestSummary(input) {
  const summary = [];
  const re = /^\s*(Test Files|Tests|Duration|Time|Snapshots)\s+/i;
  for (const line of input.split("\n")) {
    if (re.test(line)) summary.push(line.trim());
  }
  return summary;
}

function collectFailureBlocks(lines) {
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^\s*(FAIL|FAILED|×|✗|❯).*|AssertionError|Error:/i.test(line)) continue;

    const block = [line];
    for (let j = i + 1; j < lines.length && block.length < 14; j++) {
      const next = lines[j];
      if (/^\s*(PASS|✓)\s/.test(next)) break;
      if (/stdout debug noise|console\.log/i.test(next)) continue;
      if (
        next.trim() === "" ||
        /Expected:|Received:|AssertionError|Error:|at |❯|^\s*\d+\s*\|/.test(next) ||
        /^\s*[>|]\s*\d+/.test(next) ||
        /^\s*\^/.test(next)
      ) {
        block.push(next);
      }
    }
    blocks.push(block.join("\n").trimEnd());
    if (blocks.length >= 5) break;
  }
  return blocks;
}

export function testRunner(input) {
  const lines = input.split("\n");
  const summary = collectTestSummary(input);
  const failures = collectFailureBlocks(lines);
  if (summary.length === 0 && failures.length === 0) return input;

  const out = ["Tests:"];
  if (summary.length > 0) out.push(...summary);
  if (failures.length > 0) out.push("", "Failures:", ...failures);
  out.push(`... +${Math.max(0, lines.length - out.length)} noisy test lines hidden`);
  return out.join("\n");
}

testRunner.filterName = "test-runner";
