# apps/web — placeholder (reserved for S0.3)

This directory reserves the location for the BIGFLUX frontend app per
`docs/framework/source-tree.md` §3.

**Out of scope for S0.0.** The Vite 5 + React 18 app (Design System v2,
mobile-first, Storybook) is delivered in **S0.3** — it consumes `@bigflux/ui`.
No frontend dependencies (Vite, React, Storybook) are installed in the
foundation story (S0.0). See `docs/framework/tech-stack.md` §4 and ADR-0002.

Until S0.3 there is no `package.json` here, so pnpm/turbo ignore this folder.
