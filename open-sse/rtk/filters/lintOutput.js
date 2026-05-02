const ISSUE_RE = /^\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+([@\w/-]+)$/;

export function lintOutput(input) {
  const lines = input.split("\n");
  const files = [];
  let current = null;
  let errors = 0;
  let warnings = 0;

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed) continue;

    const problemMatch = trimmed.match(/[✖x]\s+(\d+)\s+problems?\s+\((\d+)\s+errors?,\s+(\d+)\s+warnings?\)/i);
    if (problemMatch) {
      errors = Number(problemMatch[2]);
      warnings = Number(problemMatch[3]);
      continue;
    }

    const issue = trimmed.match(ISSUE_RE);
    if (issue && current) {
      current.issues.push({
        line: issue[1],
        col: issue[2],
        severity: issue[3],
        message: issue[4].trim(),
        rule: issue[5],
      });
      if (errors === 0 && issue[3] === "error") errors++;
      if (warnings === 0 && issue[3] === "warning") warnings++;
      continue;
    }

    if (/[\\/][\w.-]+\.(js|jsx|ts|tsx|mjs|cjs)$/.test(trimmed) || /\.(js|jsx|ts|tsx|mjs|cjs)$/.test(trimmed)) {
      current = { file: trimmed.replace(/\\/g, "/").replace(/^.*?(?=src\/|open-sse\/|tests\/)/, ""), issues: [] };
      files.push(current);
    }
  }

  const filesWithIssues = files.filter((file) => file.issues.length > 0);
  if (filesWithIssues.length === 0) return input;

  const out = [`Lint: ${errors} errors, ${warnings} warnings in ${filesWithIssues.length} files`];
  for (const file of filesWithIssues.slice(0, 8)) {
    out.push(`[file] ${file.file}`);
    for (const issue of file.issues.slice(0, 6)) {
      out.push(`  ${issue.line}:${issue.col} ${issue.severity} ${issue.rule} - ${issue.message}`);
    }
    if (file.issues.length > 6) out.push(`  +${file.issues.length - 6} more issues`);
  }
  if (filesWithIssues.length > 8) out.push(`... +${filesWithIssues.length - 8} more files`);
  return out.join("\n");
}

lintOutput.filterName = "lint-output";
