# AGENTS.md

## Project Overrides: Superpowers Workflow

This project uses the installed `superpowers` skills as the default process layer for non-trivial development work.

### Skill Selection

Use the relevant Superpowers skill before acting when the task matches its trigger:

- `brainstorming`: before designing new features, new components, or behavior changes where requirements are not already locked.
- `systematic-debugging`: before fixing bugs, failing tests, build failures, runtime errors, or unexpected behavior.
- `test-driven-development`: before implementing bug fixes, new logic, refactors, or behavior changes where automated tests are practical.
- `writing-plans`: when a task has a spec or needs multiple implementation steps across files.
- `executing-plans`: when executing an existing written implementation plan inline.
- `subagent-driven-development`: when executing a plan with independent tasks and the user explicitly asks to use subagents.
- `dispatching-parallel-agents`: when there are multiple independent problem domains and the user explicitly asks for parallel agents.
- `requesting-code-review`: after major implementation work or before merging.
- `receiving-code-review`: before applying review feedback, especially external or ambiguous feedback.
- `verification-before-completion`: before claiming work is fixed, passing, complete, or ready.
- `using-git-worktrees`: before isolated feature work or plan execution when a separate workspace is useful.
- `finishing-a-development-branch`: after implementation is complete and verified, when deciding merge/PR/keep/discard.
- `writing-skills`: when creating or editing skills.

### Local Adaptation

- User instructions in this file and direct chat requests take priority over Superpowers process rules.
- Keep the existing solo-dev bias: if a task is clear and low risk, act first and report after.
- For tiny changes, use the smallest useful slice of the relevant skill instead of adding unnecessary ceremony.
- Do not spawn subagents unless the user explicitly requests delegation, parallel agents, or subagent-driven work.
- Do not create a worktree for small one-file fixes unless requested or risk justifies isolation.

### Practical Defaults

For common work in this repository:

- Bug or failing test: `systematic-debugging` -> `test-driven-development` -> `verification-before-completion`.
- Medium feature: `brainstorming` -> `writing-plans` -> implementation -> `verification-before-completion`.
- Existing plan: `executing-plans` unless the user requests subagents.
- Review feedback: `receiving-code-review` -> targeted fixes -> tests -> `verification-before-completion`.
- Completion claim: always run fresh verification first and report the command/result.

### Verification Rule

Never state that code is complete, fixed, passing, lint-clean, build-clean, or ready without fresh evidence from the appropriate command in the current session.

## Project Map

This repository is a Next.js 16 local AI router/dashboard.

Primary runtime areas:

- `src/app/api/v1/*`: OpenAI/Claude/Gemini-compatible API routes exposed to clients.
- `src/app/api/*`: dashboard, provider, OAuth, settings, usage, tunnel, CLI-tool, and token-limit management routes.
- `src/sse/handlers/chat.js`: main local chat request router after `/v1/chat/completions`.
- `open-sse/handlers/chatCore.js`: shared provider execution core: format detection, request translation, executor dispatch, token refresh, stream/non-stream handling, request logs, and usage recording.
- `open-sse/translator/*`: request/response format conversion registry and converters.
- `open-sse/executors/*`: provider-specific upstream execution adapters.
- `open-sse/rtk/*`: request token compression filters.
- `src/lib/localDb.js`: primary LowDB state under `DATA_DIR/db.json`.
- `src/lib/usageDb.js`: usage, request log, and request detail persistence under `DATA_DIR`.
- `src/lib/tokenQuotaStore.js`: API-key token limit accounting used by `/v1/chat/completions`.
- `src/shared/*`: reusable services and utilities shared between app routes and runtime code.
- `src/mitm/*`: local MITM/proxy support for selected CLI/provider integrations.
- `tester/translator/*`: manual translator/provider request testing tools.
- `tests/unit/*`: Vitest unit tests for translator, RTK, embeddings, provider validation, OAuth/import, and web-cookie validation surfaces.

Important request flow:

1. `src/app/api/v1/chat/completions/route.js` parses auth/body, checks token quota, initializes translators.
2. It calls `src/sse/handlers/chat.js`, which validates auth/settings, resolves model aliases/combos, and selects provider credentials.
3. `open-sse/handlers/chatCore.js` detects source/target format, applies RTK if enabled, translates request, calls the provider executor, handles refresh/fallback errors, then normalizes streaming or JSON output.
4. Usage and request details are persisted through `src/lib/usageDb.js`.

Known tooling note:

- The code-review graph may be empty on a fresh checkout. If graph tools time out or report zero files, fall back to `rg`, `rg --files`, `docs/ARCHITECTURE.md`, and the entrypoints above.

## Mistake-Prevention Guardrails

- Read before editing: inspect 2-3 nearby files in the same subsystem before changing behavior.
- Define success before implementation: name the exact command or manual check that proves the task is done.
- Keep changes surgical: every changed line must trace to the user request.
- Do not refactor unrelated router, translator, executor, DB, auth, quota, or MITM code while doing a narrow task.
- Do not touch auth, token refresh, quota enforcement, provider credential storage, tunnel/MITM, or data persistence without first stating the risk and plan.
- Preserve existing runtime patterns: route files stay thin; shared execution belongs in `src/sse`, `open-sse`, `src/lib`, or `src/shared` following nearby code.
- For translator changes, test the specific source/target format pair and check both streaming and non-streaming behavior when relevant.
- For provider/executor changes, verify status-code handling, refresh behavior, fallback eligibility, and request logging.
- For DB changes, preserve backward-compatible shape migration in `ensureDbShape` style and avoid manual data edits.
- For UI/dashboard changes, preserve loading, error, empty, and populated states where async data is involved.
- Do not rely on agent memory for model/provider behavior; verify against local config files under `open-sse/config/*` and existing tests.
- If a fix attempt fails twice, stop and switch to `systematic-debugging` root-cause tracing before trying another fix.

## Verification Commands

Use the smallest relevant command first, then broaden when risk requires it:

- App build: `npm run build`
- App dev: `npm run dev`
- Unit tests: from `tests/`, run `npm test` after Vitest is available as described in `tests/README.md`.
- Targeted search: `rg "<symbol-or-route>" src open-sse tests tester`
- Route inventory: `rg --files src/app/api`

If a verification command cannot run because dependencies or environment are missing, state the exact blocker and the closest verification that was completed.
