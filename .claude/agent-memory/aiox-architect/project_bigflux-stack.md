---
name: bigflux-stack
description: BIGFLUX Sprint 0 tech stack — what was chosen, the non-obvious rationale, and the ADRs/docs that own each decision
metadata:
  type: project
---

BIGFLUX tech stack was CLOSED by @architect on 2026-06-23 to unblock Story 0.0 (monorepo bootstrap).

**Stack:** TS 5.5 strict / Node 20 LTS · pnpm workspaces + Turborepo 2 · Vitest 2 · ESLint 9 flat + Prettier · GitHub Actions CI · Supabase (Postgres 15 + RLS + Auth + Storage + Realtime + pgvector) · Vite 5 + React 18 frontend · XState 5 orchestrator · @anthropic-ai/sdk default + plug-in providers · Zod 3.

**Why (non-obvious parts):**
- Supabase chosen because it satisfies 4 distinct Sprint-0 needs at once (RLS multi-tenant, Auth, Storage, Realtime + pgvector). Lock-in mitigated by encapsulating Auth/Storage/Realtime behind internal packages (`@bigflux/auth`, `@bigflux/artifacts`, `@bigflux/events`) — P6 applied to infra itself. See ADR-0001.
- Vite over Next: no SSR/SEO requirement in Sprint 0 (internal multi-tenant app, not public site); keeps UI decoupled from server-side Premium backend. ADR-0002.
- XState over custom state machine: REUSE > CREATE, serializable state for S0.7 persistence. ADR-0003.

**How to apply:** Future architecture decisions must keep the Supabase SDK out of agents/gates (only the 4 infra packages touch it). When a new story needs a lib (PDF, LLM provider SDK, Storybook), it is installed in the story that owns it — NOT in the foundation. Stack is Sprint-0 scoped; later phases (S7 video/voice, S13 Meta/Google SDKs) extend tech-stack.md when their story arrives, never anticipated.

**Where it lives (verify before citing — these are new files as of 2026-06-23):**
- `docs/framework/tech-stack.md`, `coding-standards.md`, `source-tree.md` (loaded by core-config devLoadAlwaysFiles)
- `docs/architecture/project-decisions/ADR-0001..0003`
- package→story map is in source-tree.md §5

Constraint that shaped everything: Constitution Art. IV (No Invention) — every choice traces to a pillar (P1-P6), a Sprint-0 story, or a PRD clause.
