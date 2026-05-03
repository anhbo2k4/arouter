import { FILTERS } from "./constants.js";
import { gitDiff } from "./filters/gitDiff.js";
import { gitStatus } from "./filters/gitStatus.js";
import { grep } from "./filters/grep.js";
import { find } from "./filters/find.js";
import { dedupLog } from "./filters/dedupLog.js";
import { ls } from "./filters/ls.js";
import { tree } from "./filters/tree.js";
import { smartTruncate } from "./filters/smartTruncate.js";
import { readNumbered } from "./filters/readNumbered.js";
import { searchList } from "./filters/searchList.js";
import { nextBuild } from "./filters/nextBuild.js";
import { npmInstall } from "./filters/npmInstall.js";
import { testRunner } from "./filters/testRunner.js";
import { lintOutput } from "./filters/lintOutput.js";
import { stackTrace } from "./filters/stackTrace.js";
import { shellTranscript } from "./filters/shellTranscript.js";

const REGISTRY = {
  [FILTERS.GIT_DIFF]: gitDiff,
  [FILTERS.GIT_STATUS]: gitStatus,
  [FILTERS.GREP]: grep,
  [FILTERS.FIND]: find,
  [FILTERS.DEDUP_LOG]: dedupLog,
  [FILTERS.LS]: ls,
  [FILTERS.TREE]: tree,
  [FILTERS.SMART_TRUNCATE]: smartTruncate,
  [FILTERS.READ_NUMBERED]: readNumbered,
  [FILTERS.SEARCH_LIST]: searchList,
  [FILTERS.NEXT_BUILD]: nextBuild,
  [FILTERS.NPM_INSTALL]: npmInstall,
  [FILTERS.TEST_RUNNER]: testRunner,
  [FILTERS.LINT_OUTPUT]: lintOutput,
  [FILTERS.STACK_TRACE]: stackTrace,
  [FILTERS.SHELL_TRANSCRIPT]: shellTranscript
};

// Rust resolve_filter aliases (pipe_cmd.rs): grep|rg, find|fd
const ALIASES = {
  rg: grep,
  fd: find
};

export function resolveFilter(name) {
  return REGISTRY[name] || ALIASES[name] || null;
}

export function allFilters() {
  return REGISTRY;
}
