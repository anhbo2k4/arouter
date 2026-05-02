import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REPOS = [
  {
    name: "claude-skills",
    url: "https://github.com/alirezarezvani/claude-skills.git",
    sparse: null,
  },
  {
    name: "superpowers",
    url: "https://github.com/obra/superpowers.git",
    sparse: "skills",
  },
];

const outputPath = path.join(process.cwd(), "open-sse", "skills", "skillCatalog.generated.json");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }
}

function cloneRepos(workDir) {
  for (const repo of REPOS) {
    const target = path.join(workDir, repo.name);
    const args = ["clone", "--depth", "1"];
    if (repo.sparse) args.push("--filter=blob:none", "--sparse");
    args.push(repo.url, target);
    run("git", args);
    if (repo.sparse) {
      run("git", ["sparse-checkout", "set", repo.sparse], { cwd: target });
    }
  }
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta = {};
  if (!match) return { meta, body: content.trim() };
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const raw = line.slice(idx + 1).trim();
    meta[key] = raw.replace(/^['"]|['"]$/g, "");
  }
  return { meta, body: content.slice(match[0].length).trim() };
}

function keywords(...parts) {
  const stop = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "your", "you", "are", "use", "when", "skill", "skills"]);
  const found = parts.join(" ").toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) || [];
  return [...new Set(found.filter((word) => !stop.has(word)))].slice(0, 80);
}

function collectCatalog(workDir) {
  const sources = [
    {
      name: "claude-skills",
      root: path.join(workDir, "claude-skills"),
      include(root, file) {
        const rel = path.relative(root, file).replaceAll("\\", "/");
        return !rel.startsWith(".") && !rel.startsWith("eval-workspace/") && rel.endsWith("/SKILL.md");
      },
    },
    {
      name: "superpowers",
      root: path.join(workDir, "superpowers", "skills"),
      include(root, file) {
        const rel = path.relative(root, file).replaceAll("\\", "/");
        return rel.split("/").length === 2 && rel.endsWith("/SKILL.md");
      },
    },
  ];

  const catalog = [];
  for (const source of sources) {
    for (const file of walk(source.root).filter((item) => source.include(source.root, item))) {
      const content = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
      const { meta, body } = parseFrontmatter(content);
      const rel = path.relative(source.root, file).replaceAll("\\", "/");
      const dirname = rel.replace(/\/SKILL\.md$/, "");
      const name = meta.name || path.basename(dirname) || source.name;
      const headings = [...body.matchAll(/^#{1,3}\s+(.+)$/gm)].map((m) => m[1]).slice(0, 12).join(" ");
      catalog.push({
        id: `${source.name}:${name}`,
        source: source.name,
        name,
        description: meta.description || "",
        path: rel,
        keywords: keywords(name, meta.description || "", dirname, headings),
        content,
      });
    }
  }

  return catalog.sort((a, b) => a.id.localeCompare(b.id));
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "arouter-server-skills-"));
try {
  cloneRepos(workDir);
  const catalog = collectCatalog(workDir);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Wrote ${catalog.length} skills to ${outputPath}`);
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}
