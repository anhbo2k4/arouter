# Smart Model Governor Design

## Goal

Reduce wasteful usage of premium models such as `gpt-5.5`, `gpt-5.4`, and `gpt-5.3-codex` by classifying incoming requests and routing only high-value requests to premium models, while preserving strong output quality for normal requests through safer mid-tier routing.

## Scope

In scope:

- Add a request classification layer before provider/model execution
- Distinguish between premium-worthy requests and routine requests
- Allow clients to keep calling premium model IDs while the router applies policy-based rerouting
- Preserve high quality for coding, debugging, research, and high-context tasks
- Reduce spam traffic to premium models for trivial or low-risk tasks
- Record routing decisions for admin observability
- Support future per-key policy controls

Out of scope:

- Changing upstream provider auth flows
- Replacing the existing alias/combo architecture
- Breaking OpenAI-compatible API responses
- Hard-blocking users from all premium usage
- Billing UI changes

## Why This Request Is Reasonable

This requirement is valid and commercially sensible.

Why it makes sense:

1. Premium models are expensive and attract avoidable spam
2. Many requests do not need frontier-level reasoning
3. Deterministic routing can save cost without visibly harming normal output
4. The router already has a centralized request entrypoint, so this policy fits the architecture

However, this becomes harmful if implemented as a naive hidden downgrade layer.

Bad version:

- every request to `gpt-5.5` gets silently downgraded
- code/debug/research tasks are misclassified as cheap
- structured-output or tool-heavy requests are routed to weak models
- no fallback/escalation exists when the cheaper path is clearly insufficient

Good version:

- trivial requests are downgraded
- high-risk requests are protected
- uncertain cases escalate upward, not downward
- routing is observable in admin logs

## Current State

- `src/app/api/v1/chat/completions/route.js` and `src/app/api/v1/responses/route.js` perform auth + quota checks, then hand requests to `handleChat`
- `src/sse/handlers/chat.js` resolves model/provider/combo behavior
- `open-sse/handlers/chatCore.js` already injects skill orchestration and tracks request metadata
- model aliases and combos already exist, so routing can reuse current resolution mechanisms instead of inventing a second execution stack

## Options Considered

### Option 1: Hard downgrade by requested model name

Behavior:

- If client asks for `gpt-5.5`, always replace with a cheaper model unless allowlisted

Pros:

- Very simple
- Maximum cost reduction

Cons:

- Unsafe
- Degrades legitimate high-value requests
- Breaks trust if users expect the premium model path

Verdict:

Reject.

### Option 2: Rule-based smart governor

Behavior:

- Use request heuristics to decide whether the premium route is justified
- Downgrade only clearly trivial requests
- Protect coding/debugging/research/high-context requests

Pros:

- Good cost/quality balance
- Fast to evaluate
- No extra classifier-model cost in the common path

Cons:

- Heuristics can miss edge cases
- Needs tuning over time

Verdict:

Recommended first version.

### Option 3: Two-stage governor with cheap classifier + guarded escalation

Behavior:

- First run a cheap classifier model or tiny rules engine
- If trivial, route mid-tier
- If uncertain, escalate to premium

Pros:

- Potentially more accurate over time
- Easier to evolve into learned routing

Cons:

- Adds latency and extra classifier cost
- More moving parts

Verdict:

Good phase two, not the best starting point.

## Chosen Direction

Implement a rule-based smart governor first, with upward escalation safeguards.

The policy should be:

- keep premium paths for high-value requests
- downgrade only low-risk routine requests
- if the request looks ambiguous, prefer the safer model tier
- never let the “cost save” rule override obvious coding/debugging/research signals

## Routing Tiers

### Tier P: Premium

For requests that should stay on premium models:

- coding and code generation
- debugging, stack traces, errors, logs
- research, comparison, deep analysis
- architecture, planning, trade-offs
- long prompts or long conversation state
- tool use, web fetch, search, structured outputs
- attachments, files, images, multimodal inputs
- requests with code fences or substantial technical syntax

Suggested premium targets:

- `gpt-5.5`
- `gpt-5.4`
- `gpt-5.3-codex`

### Tier M: Mid

For requests that still need decent language quality but not frontier reasoning:

- summarization
- rewriting
- formatting
- short explanation
- simple translation
- non-technical brainstorming
- product copy cleanup
- short Q&A without code or research depth

Suggested targets:

- a strong mid-tier model already available in ARouter
- example candidates: `gpt-4.1-mini`, `gemini-2.5-flash`, or an equivalent router-approved mid model

### Tier F: Free / low-cost

For requests with almost no reasoning demand:

- greetings
- tiny chat
- status-like prompts
- short clerical transforms
- simple classification or lightweight reformats

This tier should be conservative. If in doubt, use Tier M instead of Tier F.

## Protected Signals

If any of these are present, do not downgrade from premium:

- code fences like ``````
- words such as `fix`, `debug`, `error`, `stack trace`, `implement`, `refactor`, `optimize`, `research`, `analyze`, `architecture`
- tool definitions or tool calls
- response format constraints requiring JSON/schema precision
- prompt length above a chosen threshold
- conversation already contains technical back-and-forth
- multimodal input

## Trivial Signals

Requests are eligible for downgrade only when most of these are true:

- short prompt
- no code
- no files/tools
- no research/debug wording
- no structured-output requirement
- no long context dependency
- no premium-only system instruction attached

Examples:

- “rewrite this sentence”
- “translate this”
- “make this sound more professional”
- “summarize this paragraph”

## Safety Rule

The governor must be asymmetric:

- easy requests may move downward
- uncertain requests stay where they are
- premium-worthy requests never move downward

This is the main rule that preserves quality.

## Policy Rules

### Rule 1: Premium preserve

If the request matches a protected signal, keep premium routing.

### Rule 2: Safe downgrade

If the request is clearly trivial and the requested model is premium, reroute to mid-tier or low-cost tier according to policy.

### Rule 3: Ambiguity stays expensive

If the classifier is unsure, keep the higher tier.

### Rule 4: No cheap routing for code/research

Anything touching code generation, code editing, debugging, logs, systems design, research, or structured extraction stays premium.

### Rule 5: Admin observability required

Every routed request should carry metadata like:

- requested model
- final routed model
- governor tier
- downgrade reason
- protected-signal match

## Suggested Technical Insertion Point

Best insertion point:

- a new governor module called from `src/sse/handlers/chat.js` before final model/provider resolution

Why:

- request body is already available
- requested model is known
- combo/alias/provider routing has not fully committed yet
- the governor can rewrite the effective model before execution

Suggested new modules:

- `src/sse/services/requestGovernor.js`
- optional config helper in `src/shared` or `src/lib`

Likely touch points later:

- `src/sse/handlers/chat.js`
- `src/app/api/v1/chat/completions/route.js`
- `src/app/api/v1/responses/route.js`
- `open-sse/handlers/chatCore.js`
- admin settings/dashboard files for observability and policy controls

## Admin Controls

Phase one controls:

- global governor enabled/disabled
- premium model list
- mid-tier fallback map
- low-cost fallback map
- prompt-length threshold

Phase two controls:

- per-key governor policy
- per-key premium allowance
- allow/deny downgrade for specific customers

## Logging And Metrics

Need metrics for:

- premium requests preserved
- premium requests downgraded
- downgraded requests by reason
- top downgraded keys
- estimated premium-token savings
- retry/escalation rate if added later

These metrics matter because the governor should be tuned from real traffic, not only intuition.

## Risks

1. Silent trust risk

If users think they always hit `gpt-5.5`, but the router often downgrades, some customers may object.

Mitigation:

- keep this policy admin-controlled
- expose an internal log of requested vs routed model
- optionally disclose “smart routing” in product policy for relevant customers

2. Misclassification risk

A cheap request can look technical, or a hard request can look short.

Mitigation:

- conservative downgrade rules
- protect code/debug/research paths aggressively

3. Quality drift

If the cheap fallback is too weak, output quality drops.

Mitigation:

- use a strong mid-tier model, not a random weak free model
- only use the cheapest tier for truly trivial work

## Success Criteria

The design is successful if:

1. Premium traffic drops meaningfully for trivial requests
2. Coding/debugging/research quality does not regress
3. The admin can explain why a request was routed a certain way
4. No API contract changes are visible to clients

## Recommendation

Yes, this feature is reasonable.

The correct implementation is not “block premium models”.

The correct implementation is:

- premium-preserving smart routing
- conservative downgrade policy
- protected technical signals
- observable admin logs
- mid-tier fallback first, cheapest-tier only for clearly trivial prompts

## First Implementation Slice

The safest first slice is:

1. Add rule-based classifier with three tiers: premium, mid, trivial
2. Protect all coding/debugging/research requests
3. Downgrade only clearly trivial premium calls
4. Log requested model vs routed model
5. Add admin metrics before attempting more aggressive routing
