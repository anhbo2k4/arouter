export function npmInstall(input) {
  const lines = input.split("\n");
  const keep = [];
  const patterns = [
    /^(added|removed|changed|audited)\s+\d+/i,
    /packages are looking for funding/i,
    /vulnerabilities/i,
    /npm audit fix/i,
    /^npm WARN deprecated/i,
    /^npm ERR!/i,
    /error/i,
  ];

  for (const line of lines) {
    if (patterns.some((re) => re.test(line.trim()))) {
      keep.push(line.trim());
    }
    if (keep.length >= 24) break;
  }

  if (keep.length === 0) return input;
  const out = ["npm install:", ...keep];
  if (lines.length > keep.length) {
    out.push(`... +${lines.length - keep.length} package manager lines hidden`);
  }
  return out.join("\n");
}

npmInstall.filterName = "npm-install";
