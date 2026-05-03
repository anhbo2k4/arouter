# ARouter Skill Map

Practical routing guide for the installed Codex/Claude-style skills on this machine.

## Core

Use these most often:

- `brainstorming`
- `systematic-debugging`
- `test-driven-development`
- `verification-before-completion`
- `frontend-design`
- `claude-design`
- `ui-ux-pro-max`
- `ui-styling`
- `arouter-fe-design-system`

## Optional

Use when the task clearly needs them:

- `design-system`
- `theme-factory`
- `web-artifacts-builder`
- `review-delta`
- `review-pr`
- `build-graph`
- `openai-docs`
- `imagegen`
- `codex-imagen`

## Niche

Use only for the matching domain:

- `canvas-design`
- `banner-design`
- `slides`
- `brand`
- `threejs-r3f-cinematic-godmode`
- `flatsome-native-builder`
- `flatsome-native-design-intelligence`
- `flatsome-native-harvest`
- `express-ejs-ultimate-godmode`

## Recommended Calls

### Frontend design

Use when redesigning pages, components, dashboards, pricing, settings, and public web UI.

```text
Use arouter-fe-design-system and frontend-design to redesign this page.
```

### Premium landing page / hero / public-facing redesign

```text
Use arouter-fe-design-system, claude-design, and frontend-design to redesign this landing page with a premium commercial look.
```

### UX-heavy dashboard / onboarding / forms / tables

```text
Use arouter-fe-design-system, frontend-design, and ui-ux-pro-max for this dashboard flow.
```

### Tailwind / shadcn polish

```text
Use frontend-design and ui-styling to polish this Tailwind/shadcn UI without changing the product logic.
```

### Design tokens / theme system

```text
Use design-system and theme-factory to standardize tokens, colors, typography, and spacing.
```

### Complex interactive React artifact

```text
Use frontend-design and web-artifacts-builder to build this multi-component React/Tailwind artifact.
```

### Backend bug / route bug / request handling issue

```text
Use systematic-debugging for this API/backend issue, then use test-driven-development for the fix.
```

### Refactor with safety

```text
Use refactor-safely and verification-before-completion for this refactor.
```

### Code review

```text
Use review-delta to review only recent changes.
```

```text
Use review-pr to review the full branch diff and blast radius.
```

### OpenAI product / API guidance

```text
Use openai-docs for the latest official OpenAI API guidance with citations.
```

### Image generation

```text
Use imagegen to generate this raster asset.
```

```text
Use codex-imagen to generate this image through the configured CX provider.
```

## Skill Combos To Prefer

- Landing page redesign: `claude-design` + `frontend-design`
- Dashboard polish: `frontend-design` + `ui-ux-pro-max`
- Tailwind/shadcn implementation: `frontend-design` + `ui-styling`
- Bugfix: `systematic-debugging` + `test-driven-development`
- Final validation: `verification-before-completion`

## Combos To Avoid

Do not load these together unless the task truly spans both:

- `frontend-design` + `claude-design` + `ui-styling` + `ui-ux-pro-max` all at once
- `canvas-design` for ordinary product UI tasks
- `brand-guidelines` as a default generic branding skill
- both `karpathy-guidelines` variants together

## Rule Of Thumb

- One core skill is usually enough for small tasks.
- One core skill plus one escalation skill is the sweet spot for most medium tasks.
- More than two overlapping design skills usually wastes tokens and reduces instruction clarity.
