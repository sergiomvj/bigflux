---
name: bigflux-bootstrap
description: BigFlux monorepo foundation (Story 0.0) — package skeletons exist empty; per-story dependency ownership rule (No Invention)
metadata:
  type: project
---

BigFlux is a pnpm + Turborepo TypeScript monorepo. Story 0.0 (bootstrap) created the
tooling (TS 5, ESLint 9 flat, Prettier 3, Vitest 2 + coverage-v8) and **12 empty package
skeletons** under `packages/*` (core, db, auth, ui, llm-router, cost, artifacts,
orchestrator, agents, adapters, kb, events) — each with only a typed marker `src/index.ts`
and one smoke `src/index.spec.ts`. `apps/web` is a README-only placeholder.

**Why:** Constitution Art. IV (No Invention) + tech-stack.md §4 forbid installing a
dependency before the story that consumes it. Each package maps 1:1 to a story
(`docs/framework/source-tree.md` §5): db→S0.1, auth→S0.2, ui→S0.3, llm-router→S0.4,
cost→S0.5, artifacts→S0.6, orchestrator→S0.7, agents→S0.8, adapters→S0.9, kb/events→S0.10.

**How to apply:** When implementing a later story, install that story's real deps
(Supabase SDK, React/Vite, XState, LLM SDKs, Storybook, etc.) **inside its owner package**,
never at the root and never in another package's skeleton. Absolute imports use the
`@bigflux/*` alias (tsconfig paths → `packages/*/src`); ESLint `no-restricted-imports`
blocks deep `../../` relatives (Constitution Art. VI). The `no-hardcoded-color` ESLint
rule is pre-written but commented OFF in `eslint.config.js` — activate it in S0.3 (DS v2).
Coverage gate ≥90% applies from S0.1 onward, not S0.0. CI is GitHub Actions
(`.github/workflows/ci.yml`); branch protection is applied by @devops (repo setting,
not committable).
