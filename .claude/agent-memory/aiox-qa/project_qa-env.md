---
name: project-qa-env
description: How to run real lint/typecheck/test verification in the BigFlux pnpm+turbo monorepo during QA gates
metadata:
  type: project
---

BigFlux is a pnpm workspaces + Turborepo 2 monorepo. To verify a story's claimed command results yourself during a QA gate:

- `pnpm install` / `pnpm run lint` / `pnpm run typecheck` / `pnpm run test` all work and exit 0 from repo root `C:/Projetos/BigFlux`.
- Turbo caches aggressively (`>>> FULL TURBO`). A cache hit replays logs but does NOT re-execute. To genuinely re-run (e.g. to trust a test pass), bypass cache: `pnpm exec turbo run test --force`. `turbo` is NOT on global PATH — use `pnpm exec turbo`.
- Do NOT pass `pnpm run test -- --force`: the `--` forwards `--force` to vitest (which rejects it), causing a false failure. `--force` is a turbo flag, not a vitest flag.
- Local toolchain is Node 24; CI pins Node 20 LTS (`.github/workflows/ci.yml`). Tooling works on both.
- To verify the AC5 `no-restricted-imports` rule live: drop a throwaway `.ts` with `import { x } from "../../foo"` into a package's `src/`, run `pnpm exec eslint <file>`, confirm it errors with the Art. VI message, then delete the file.

**Why:** QA must verify real execution, not trust the @dev Completion Notes. Turbo cache hits can mask whether a command genuinely passes.
**How to apply:** When gating any S0.x story, run the four commands from repo root; force a no-cache test run before trusting a green test result.
