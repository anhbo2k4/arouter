import { describe, it, expect, beforeEach } from "vitest";
import { compressMessages, setRtkEnabled, isRtkEnabled, formatRtkLog } from "../../open-sse/rtk/index.js";
import { gitDiff } from "../../open-sse/rtk/filters/gitDiff.js";
import { gitStatus } from "../../open-sse/rtk/filters/gitStatus.js";
import { grep } from "../../open-sse/rtk/filters/grep.js";
import { find } from "../../open-sse/rtk/filters/find.js";
import { dedupLog } from "../../open-sse/rtk/filters/dedupLog.js";
import { ls } from "../../open-sse/rtk/filters/ls.js";
import { tree } from "../../open-sse/rtk/filters/tree.js";
import { smartTruncate } from "../../open-sse/rtk/filters/smartTruncate.js";
import { readNumbered } from "../../open-sse/rtk/filters/readNumbered.js";
import { searchList } from "../../open-sse/rtk/filters/searchList.js";
import { nextBuild } from "../../open-sse/rtk/filters/nextBuild.js";
import { npmInstall } from "../../open-sse/rtk/filters/npmInstall.js";
import { testRunner } from "../../open-sse/rtk/filters/testRunner.js";
import { lintOutput } from "../../open-sse/rtk/filters/lintOutput.js";
import { stackTrace } from "../../open-sse/rtk/filters/stackTrace.js";
import { shellTranscript } from "../../open-sse/rtk/filters/shellTranscript.js";
import { autoDetectFilter } from "../../open-sse/rtk/autodetect.js";
import { safeApply } from "../../open-sse/rtk/applyFilter.js";

function makeLongDiff() {
  const lines = ["diff --git a/foo.js b/foo.js", "index abc..def 100644", "--- a/foo.js", "+++ b/foo.js", "@@ -1,3 +1,200 @@"];
  for (let i = 0; i < 200; i++) lines.push(`+added line ${i} ${"x".repeat(20)}`);
  return lines.join("\n");
}

function makeGitStatus() {
  return [
    "On branch main",
    "Your branch is up to date with 'origin/main'.",
    "",
    "Changes not staged for commit:",
    "  (use \"git add <file>...\" to update what will be committed)",
    "\tmodified:   src/a.js",
    "\tmodified:   src/b.js",
    "\tnew file:   src/c.js",
    "\tdeleted:    src/old.js",
    "",
    "Untracked files:",
    "\tnotes.txt",
    "",
    "no changes added to commit"
  ].join("\n");
}

function makeGrepOutput() {
  const lines = [];
  for (let i = 1; i <= 40; i++) lines.push(`src/foo.js:${i}:const x${i} = "some value here with padding text padding text"`);
  for (let i = 1; i <= 10; i++) lines.push(`src/bar.js:${i}:const y${i} = "another value here with padding padding padding"`);
  return lines.join("\n");
}

function makeFindOutput() {
  const lines = [];
  for (let i = 0; i < 30; i++) lines.push(`./src/a/${i}.js`);
  for (let i = 0; i < 20; i++) lines.push(`./src/b/${i}.js`);
  for (let i = 0; i < 5; i++) lines.push(`./top${i}.md`);
  return lines.join("\n");
}

function makeNextBuildOutput() {
  return [
    "   ▲ Next.js 16.1.6 (webpack)",
    "   Creating an optimized production build ...",
    " ✓ Compiled successfully in 11.2s",
    "   Running TypeScript ...",
    "Failed to compile.",
    "",
    "./src/app/dashboard/page.js:42:12",
    "Type error: Property 'total' does not exist on type 'Stats'.",
    "",
    "  40 | export default function Page({ stats }) {",
    "  41 |   return (",
    "> 42 |     <div>{stats.total}</div>",
    "     |            ^",
    "  43 |   );",
    "  44 | }",
    "",
    "Next.js build worker exited with code: 1 and signal: null",
    ...Array.from({ length: 40 }, (_, i) => `webpack cache diagnostic noise line ${i}`)
  ].join("\n");
}

function makeVitestOutput() {
  return [
    " RUN  v4.0.0 C:/repo/tests",
    "",
    " ✓ unit/a.test.js > passes 4ms",
    " ❯ unit/rtk.test.js (8 tests | 1 failed) 92ms",
    "   × RTK filters > keeps expected failure details 12ms",
    "     → expected 'Loading' to be 'Submit'",
    "",
    " FAIL  unit/rtk.test.js > RTK filters > keeps expected failure details",
    "AssertionError: expected 'Loading' to be 'Submit'",
    "Expected: \"Submit\"",
    "Received: \"Loading\"",
    " ❯ tests/unit/rtk.test.js:88:19",
    "",
    " Test Files  1 failed | 4 passed (5)",
    "      Tests  1 failed | 72 passed (73)",
    "   Duration  1.83s",
    ...Array.from({ length: 30 }, (_, i) => `stdout debug noise ${i}`)
  ].join("\n");
}

function makeEslintOutput() {
  return [
    "C:/repo/src/app/page.js",
    "  12:7   error    'unused' is assigned a value but never used  no-unused-vars",
    "  30:5   warning  React Hook useEffect has missing dependency  react-hooks/exhaustive-deps",
    "",
    "C:/repo/src/lib/api.js",
    "  5:10   error    Unexpected any. Specify a different type      @typescript-eslint/no-explicit-any",
    "",
    "✖ 3 problems (2 errors, 1 warning)",
    ...Array.from({ length: 20 }, (_, i) => `eslint formatter noise ${i}`)
  ].join("\n");
}

function makeNpmInstallOutput() {
  return [
    "npm WARN deprecated inflight@1.0.6: This module is not supported",
    "npm WARN deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported",
    "",
    "added 482 packages, and audited 483 packages in 18s",
    "",
    "92 packages are looking for funding",
    "  run `npm fund` for details",
    "",
    "3 vulnerabilities (1 low, 1 moderate, 1 high)",
    "",
    "To address all issues, run:",
    "  npm audit fix",
    ...Array.from({ length: 80 }, (_, i) => `extract: package-${i}@1.0.${i}`)
  ].join("\n");
}

function makeStackTraceOutput() {
  return [
    "TypeError: Cannot read properties of undefined (reading 'total')",
    "    at renderDashboard (src/app/dashboard/page.js:42:12)",
    "    at DashboardPage (src/app/dashboard/page.js:60:5)",
    "    at renderWithHooks (node_modules/react-dom/cjs/react-dom.development.js:15486:18)",
    "    at mountIndeterminateComponent (node_modules/react-dom/cjs/react-dom.development.js:20103:13)",
    "    at beginWork (node_modules/react-dom/cjs/react-dom.development.js:21626:16)",
    "Caused by: Error: Stats payload was empty",
    "    at fetchStats (src/lib/stats.js:18:9)",
    "    at async DashboardPage (src/app/dashboard/page.js:58:3)",
    ...Array.from({ length: 25 }, () => "    at processTicksAndRejections (node:internal/process/task_queues:95:5)"),
    "Build failed with 1 error.",
  ].join("\n");
}

function makeShellTranscriptOutput() {
  return [
    "$ npm run build",
    "> arouter-app@0.4.11 build",
    "> next build",
    "Creating an optimized production build ...",
    "Creating an optimized production build ...",
    "Creating an optimized production build ...",
    "info - Loaded env from .env.local",
    "info - Loaded env from .env.local",
    "warn - Cache miss for page chunk",
    "warn - Cache miss for page chunk",
    "Error: listen EADDRINUSE: address already in use 0.0.0.0:1508",
    "    at Server.setupListenHandle [as _listen2] (node:net:1811:16)",
    "$ netstat -ano | findstr :1508",
    "TCP    0.0.0.0:1508    0.0.0.0:0    LISTENING    24000",
    "Build failed with exit code 1",
  ].join("\n");
}

describe("RTK flag", () => {
  it("default off, toggle works", () => {
    setRtkEnabled(false);
    expect(isRtkEnabled()).toBe(false);
    setRtkEnabled(true);
    expect(isRtkEnabled()).toBe(true);
    setRtkEnabled(false);
  });
});

describe("RTK filters", () => {
  it("gitDiff truncates hunks beyond 100 lines and preserves file header", () => {
    const input = makeLongDiff();
    const out = gitDiff(input, 500);
    expect(out).toContain("foo.js");
    expect(out).toContain("lines truncated");
    expect(out.length).toBeLessThan(input.length);
  });

  it("gitStatus groups by kind and produces compact output (Rust format)", () => {
    const input = makeGitStatus();
    const out = gitStatus(input);
    expect(out).toContain("* main");
    expect(out).toMatch(/~ Modified: \d+ files/);
    expect(out).toContain("src/a.js");
    expect(out.length).toBeLessThan(input.length);
  });

  it("grep groups matches by file and caps per-file lines (Rust format)", () => {
    const input = makeGrepOutput();
    const out = grep(input);
    expect(out).toContain("50 matches in 2F:");
    expect(out).toContain("[file] src/foo.js (40):");
    expect(out).toContain("[file] src/bar.js (10):");
    expect(out).toMatch(/\+\d+/); // overflow marker
    expect(out.length).toBeLessThan(input.length);
  });

  it("find groups paths by parent dir, shows basenames (Rust format)", () => {
    const input = makeFindOutput();
    const out = find(input);
    expect(out).toContain("55 files in 3 dirs:");
    expect(out).toContain("./src/a/ (30):");
    expect(out).toContain("./src/b/ (20):");
    expect(out).toContain("./ (5):");
    expect(out.length).toBeLessThan(input.length);
  });

  it("dedupLog collapses consecutive duplicates", () => {
    const input = Array(20).fill("repeated log line A").join("\n") + "\nunique\n" + Array(10).fill("another dup").join("\n");
    const out = dedupLog(input);
    expect(out).toContain("repeated log line A");
    expect(out).toContain("duplicate lines");
    expect(out.length).toBeLessThan(input.length);
  });

  it("dedupLog reduces repeated progress chatter while keeping the final error", () => {
    const input = [
      "progress: compiling",
      "progress: compiling",
      "progress: compiling",
      "unique line",
      "progress: compiling",
      "progress: compiling",
      "Error: failed to compile",
    ].join("\n");
    const out = dedupLog(input);
    expect(out).toContain("Error: failed to compile");
    expect(out.length).toBeLessThan(input.length);
  });
});

describe("RTK metadata", () => {
  it("returns structured savings and quality metadata", () => {
    const body = {
      messages: [
        {
          role: "tool",
          content: makeLongDiff(),
        },
      ],
    };

    const stats = compressMessages(body, true);

    expect(stats).toBeTruthy();
    expect(stats.enabled).toBe(true);
    expect(stats.bytesBefore).toBeGreaterThan(0);
    expect(stats.bytesAfter).toBeLessThan(stats.bytesBefore);
    expect(stats.savedBytes).toBe(stats.bytesBefore - stats.bytesAfter);
    expect(stats.hitCount).toBeGreaterThan(0);
    expect(Array.isArray(stats.filters)).toBe(true);
    expect(stats.filters.length).toBeGreaterThan(0);
    expect(stats.quality).toEqual(
      expect.objectContaining({
        unsafeFallbackCount: expect.any(Number),
        unsafeFallbackTriggered: expect.any(Boolean),
        rejectedCandidates: expect.any(Object),
      }),
    );
  });
});

describe("autoDetectFilter", () => {
  it("detects git diff", () => {
    expect(autoDetectFilter("diff --git a/x b/x\n@@ -1 +1 @@\n+a").filterName).toBe("git-diff");
  });
  it("detects git status", () => {
    expect(autoDetectFilter("On branch main\n  modified:   x.js\n").filterName).toBe("git-status");
  });
  it("detects grep", () => {
    expect(autoDetectFilter("a.js:1:hello\nb.js:2:world\nc.js:3:foo").filterName).toBe("grep");
  });
  it("detects find", () => {
    expect(autoDetectFilter("./a/b.js\n./a/c.js\n./a/d.js").filterName).toBe("find");
  });
  it("falls back to dedupLog for generic text", () => {
    const txt = "line1\nline2\nline3\nline4\nline5\nline6\n";
    expect(autoDetectFilter(txt).filterName).toBe("dedup-log");
  });
});

describe("RTK filters (extras)", () => {
  it("ls: compact_ls strips perms/owner, keeps name + size", () => {
    const input = [
      "total 48",
      "drwxr-xr-x  2 user staff   64 Jan  1 12:00 .",
      "drwxr-xr-x  2 user staff   64 Jan  1 12:00 ..",
      "drwxr-xr-x  2 user staff   64 Jan  1 12:00 src",
      "-rw-r--r--  1 user staff 1234 Jan  1 12:00 Cargo.toml",
      "-rw-r--r--  1 user staff 5678 Jan  1 12:00 README.md"
    ].join("\n");
    const out = ls(input);
    expect(out).toContain("src/");
    expect(out).toContain("Cargo.toml");
    expect(out).toContain("1.2K");
    expect(out).toContain("5.5K");
    expect(out).not.toContain("drwx");
    expect(out).toContain("Summary: 2 files, 1 dirs");
  });

  it("ls: filters noise dirs", () => {
    const input = [
      "total 8",
      "drwxr-xr-x  2 user staff 64 Jan  1 12:00 node_modules",
      "drwxr-xr-x  2 user staff 64 Jan  1 12:00 .git",
      "drwxr-xr-x  2 user staff 64 Jan  1 12:00 src",
      "-rw-r--r--  1 user staff 100 Jan  1 12:00 main.js"
    ].join("\n");
    const out = ls(input);
    expect(out).not.toContain("node_modules");
    expect(out).not.toContain(".git");
    expect(out).toContain("src/");
    expect(out).toContain("main.js");
  });

  it("tree: removes summary, keeps structure", () => {
    const input = ".\n├── src\n│   └── main.rs\n└── Cargo.toml\n\n2 directories, 3 files\n";
    const out = tree(input);
    expect(out).not.toContain("directories");
    expect(out).toContain("├──");
    expect(out).toContain("main.rs");
  });

  it("smartTruncate: keeps head+tail, drops middle", () => {
    const input = Array.from({ length: 400 }, (_, i) => `line ${i}`).join("\n");
    const out = smartTruncate(input);
    expect(out).toContain("line 0");
    expect(out).toContain("line 399");
    expect(out).toContain("lines truncated");
    expect(out.length).toBeLessThan(input.length);
  });

  it("smartTruncate: passes through small input", () => {
    const input = Array.from({ length: 10 }, (_, i) => `line ${i}`).join("\n");
    expect(smartTruncate(input)).toBe(input);
  });

  it("readNumbered: compacts very long line-numbered dump", () => {
    const lines = [];
    for (let i = 1; i <= 400; i++) lines.push(`  ${i}|content ${i}`);
    const input = lines.join("\n");
    const out = readNumbered(input);
    expect(out).toContain("1|content 1");
    expect(out).toContain("400|content 400");
    expect(out).toContain("lines truncated");
    expect(out.length).toBeLessThan(input.length);
  });

  it("searchList: groups Cursor Glob output by parent dir", () => {
    const paths = [];
    for (let i = 0; i < 30; i++) paths.push(`- src/a/f${i}.js`);
    for (let i = 0; i < 10; i++) paths.push(`- src/b/g${i}.js`);
    const input = [
      "Result of search in '/Users/x' (total 40 files):",
      ...paths
    ].join("\n");
    const out = searchList(input);
    expect(out).toContain("Result of search in");
    expect(out).toContain("40 files in 2 dirs:");
    expect(out).toContain("src/a/ (30):");
    expect(out).toContain("src/b/ (10):");
    expect(out).toMatch(/\+\d+/);
    expect(out.length).toBeLessThan(input.length);
  });

  it("nextBuild preserves compile errors and removes build noise", () => {
    const input = makeNextBuildOutput();
    const out = nextBuild(input);
    expect(out).toContain("Next build failed");
    expect(out).toContain("Type error");
    expect(out).toContain("src/app/dashboard/page.js:42:12");
    expect(out).toContain("Next.js build worker exited");
    expect(out).not.toContain("webpack cache diagnostic noise line 39");
    expect(out.length).toBeLessThan(input.length);
  });

  it("testRunner keeps failed test details and pass/fail counts", () => {
    const input = makeVitestOutput();
    const out = testRunner(input);
    expect(out).toContain("Tests:");
    expect(out).toContain("1 failed");
    expect(out).toContain("72 passed");
    expect(out).toContain("Expected: \"Submit\"");
    expect(out).toContain("Received: \"Loading\"");
    expect(out).not.toContain("stdout debug noise 29");
    expect(out.length).toBeLessThan(input.length);
  });

  it("lintOutput groups lint diagnostics by file", () => {
    const input = makeEslintOutput();
    const out = lintOutput(input);
    expect(out).toContain("Lint:");
    expect(out).toContain("2 errors");
    expect(out).toContain("1 warning");
    expect(out).toContain("src/app/page.js");
    expect(out).toContain("no-unused-vars");
    expect(out).not.toContain("eslint formatter noise 19");
    expect(out.length).toBeLessThan(input.length);
  });

  it("npmInstall summarizes dependency install output", () => {
    const input = makeNpmInstallOutput();
    const out = npmInstall(input);
    expect(out).toContain("npm install:");
    expect(out).toContain("added 482 packages");
    expect(out).toContain("3 vulnerabilities");
    expect(out).toContain("npm audit fix");
    expect(out).not.toContain("extract: package-79");
    expect(out.length).toBeLessThan(input.length);
  });

  it("stackTrace preserves error headline, file refs, and caused-by chain", () => {
    const input = makeStackTraceOutput();
    const out = stackTrace(input);
    expect(out).toContain("TypeError: Cannot read properties of undefined");
    expect(out).toContain("src/app/dashboard/page.js:42:12");
    expect(out).toContain("Caused by: Error: Stats payload was empty");
    expect(out).toContain("Build failed with 1 error.");
    expect(out).not.toContain("processTicksAndRejections");
    expect(out.length).toBeLessThan(input.length);
  });

  it("shellTranscript preserves commands and final failure but removes repeated progress noise", () => {
    const input = makeShellTranscriptOutput();
    const out = shellTranscript(input);
    expect(out).toContain("$ npm run build");
    expect(out).toContain("$ netstat -ano | findstr :1508");
    expect(out).toContain("EADDRINUSE");
    expect(out).toContain("Build failed with exit code 1");
    expect(out).not.toContain("Creating an optimized production build ...\nCreating an optimized production build ...\nCreating an optimized production build ...");
    expect(out.length).toBeLessThan(input.length);
  });
});

describe("autoDetectFilter (extras)", () => {
  it("detects tree via box-drawing glyphs", () => {
    expect(autoDetectFilter(".\n├── src\n│   └── main.rs\n└── Cargo.toml\n").filterName).toBe("tree");
  });
  it("detects ls via total + perms rows", () => {
    const input = [
      "total 48",
      "drwxr-xr-x  2 user staff   64 Jan  1 12:00 src",
      "-rw-r--r--  1 user staff 1234 Jan  1 12:00 main.js",
      "-rw-r--r--  1 user staff 5678 Jan  1 12:00 README.md"
    ].join("\n");
    expect(autoDetectFilter(input).filterName).toBe("ls");
  });
  it("detects Cursor search list", () => {
    const input = "Result of search in '/x' (total 3 files):\n- a/b.js\n- a/c.js\n- a/d.js";
    expect(autoDetectFilter(input).filterName).toBe("search-list");
  });
  it("detects Next build output", () => {
    expect(autoDetectFilter(makeNextBuildOutput()).filterName).toBe("next-build");
  });
  it("detects Vitest output", () => {
    expect(autoDetectFilter(makeVitestOutput()).filterName).toBe("test-runner");
  });
  it("detects ESLint output", () => {
    expect(autoDetectFilter(makeEslintOutput()).filterName).toBe("lint-output");
  });
  it("detects npm install output", () => {
    expect(autoDetectFilter(makeNpmInstallOutput()).filterName).toBe("npm-install");
  });
  it("detects stack traces", () => {
    expect(autoDetectFilter(makeStackTraceOutput()).filterName).toBe("stack-trace");
  });
  it("detects shell transcripts", () => {
    expect(autoDetectFilter(makeShellTranscriptOutput()).filterName).toBe("shell-transcript");
  });
});

describe("safeApply", () => {
  it("returns input if filter throws", () => {
    const out = safeApply(() => { throw new Error("boom"); }, "hello");
    expect(out).toBe("hello");
  });
  it("returns input if filter returns non-string", () => {
    const out = safeApply(() => 42, "hello");
    expect(out).toBe("hello");
  });
});

describe("compressMessages (disabled)", () => {
  beforeEach(() => setRtkEnabled(false));
  it("returns null when disabled", () => {
    const body = { messages: [{ role: "tool", tool_call_id: "x", content: makeLongDiff() }] };
    expect(compressMessages(body)).toBeNull();
  });
});

describe("compressMessages (enabled)", () => {
  beforeEach(() => setRtkEnabled(true));

  it("compresses OpenAI tool message (string content)", () => {
    const big = makeLongDiff();
    const body = { messages: [{ role: "tool", tool_call_id: "call_1", content: big }] };
    const stats = compressMessages(body);
    expect(stats.hits.length).toBeGreaterThan(0);
    expect(body.messages[0].content.length).toBeLessThan(big.length);
    expect(stats.bytesBefore).toBeGreaterThan(stats.bytesAfter);
  });

  it("compresses Claude string-form tool_result", () => {
    const big = makeLongDiff();
    const body = {
      messages: [{
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "toolu_1", content: big }]
      }]
    };
    const stats = compressMessages(body);
    expect(stats.hits.length).toBeGreaterThan(0);
    expect(body.messages[0].content[0].content.length).toBeLessThan(big.length);
  });

  it("compresses Claude array-form tool_result text parts", () => {
    const big = makeLongDiff();
    const body = {
      messages: [{
        role: "user",
        content: [{
          type: "tool_result",
          tool_use_id: "toolu_1",
          content: [{ type: "text", text: big }, { type: "text", text: "unchanged short" }]
        }]
      }]
    };
    const stats = compressMessages(body);
    expect(stats.hits.length).toBeGreaterThan(0);
    expect(body.messages[0].content[0].content[0].text.length).toBeLessThan(big.length);
    // short part unchanged
    expect(body.messages[0].content[0].content[1].text).toBe("unchanged short");
  });

  it("skips is_error tool_result", () => {
    const big = makeLongDiff();
    const body = {
      messages: [{
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "toolu_1", content: big, is_error: true }]
      }]
    };
    const stats = compressMessages(body);
    expect(stats.hits.length).toBe(0);
    expect(body.messages[0].content[0].content).toBe(big);
  });

  it("skips below MIN_COMPRESS_SIZE (<500 bytes)", () => {
    const small = "diff --git a/x b/x\n@@ -1 +1 @@\n+a";
    const body = { messages: [{ role: "tool", tool_call_id: "x", content: small }] };
    const stats = compressMessages(body);
    expect(stats.hits.length).toBe(0);
    expect(body.messages[0].content).toBe(small);
  });

  it("never produces empty content (R14 guard)", () => {
    const input = "a".repeat(1000);
    const body = { messages: [{ role: "tool", tool_call_id: "x", content: input }] };
    compressMessages(body);
    expect(body.messages[0].content.length).toBeGreaterThan(0);
  });

  it("falls back to smart truncate for long unique logs that dedup cannot shrink", () => {
    const input = Array.from({ length: 420 }, (_, i) => `unique diagnostic line ${i} ${"x".repeat(32)}`).join("\n");
    const body = { messages: [{ role: "tool", tool_call_id: "x", content: input }] };
    const stats = compressMessages(body);
    expect(stats.hits.length).toBe(1);
    expect(stats.hits[0].filter).toBe("smart-truncate");
    expect(body.messages[0].content).toContain("lines truncated");
    expect(body.messages[0].content.length).toBeLessThan(input.length);
  });

  it("keeps important anchors after multi-pass compression", () => {
    const transcript = `${makeShellTranscriptOutput()}\n${Array.from({ length: 260 }, (_, i) => `noise line ${i}`).join("\n")}`;
    const body = { messages: [{ role: "tool", tool_call_id: "x", content: transcript }] };
    const stats = compressMessages(body);
    expect(stats.hits.length).toBeGreaterThan(0);
    expect(body.messages[0].content).toContain("$ npm run build");
    expect(body.messages[0].content).toContain("EADDRINUSE");
    expect(body.messages[0].content).toContain("Build failed with exit code 1");
    expect(body.messages[0].content.length).toBeLessThan(transcript.length);
  });

  it("skips when body has no messages", () => {
    expect(compressMessages({})).toBeNull();
    expect(compressMessages({ messages: null })).toBeNull();
  });

  it("handles mix of messages without crashing", () => {
    const body = {
      messages: [
        { role: "system", content: "you are" },
        { role: "user", content: "hi" },
        { role: "assistant", content: null, tool_calls: [{ id: "c1", function: { name: "x", arguments: "{}" } }] },
        { role: "tool", tool_call_id: "c1", content: makeGrepOutput() },
        { role: "user", content: [{ type: "text", text: "next" }] }
      ]
    };
    const stats = compressMessages(body);
    expect(stats).not.toBeNull();
    expect(stats.hits.length).toBeGreaterThan(0);
  });
});

describe("formatRtkLog", () => {
  it("returns null when no hits", () => {
    expect(formatRtkLog({ bytesBefore: 0, bytesAfter: 0, hits: [] })).toBeNull();
  });
  it("formats savings line with percentage", () => {
    const line = formatRtkLog({ bytesBefore: 1000, bytesAfter: 400, hits: [{ filter: "git-diff" }] });
    expect(line).toContain("saved 600B");
    expect(line).toContain("60.0%");
    expect(line).toContain("git-diff");
  });
});
