# BIGFLUX — CI & Branch Protection

> **Source:** S0.0 AC3. Pipeline lives in `.github/workflows/ci.yml`.

## Pipeline

On every `push` to `main` and every `pull_request` targeting `main`, the `ci`
job runs in order:

1. `pnpm install --frozen-lockfile`
2. `pnpm run lint` (Turborepo → `eslint src` per package)
3. `pnpm run typecheck` (Turborepo → `tsc --noEmit` per package)
4. `pnpm run test` (Turborepo → `vitest run` per package)

Any non-zero exit fails the job.

## Branch protection (required to block merge on failure — AC3)

Configure on GitHub (`Settings → Branches → Branch protection rules`) for `main`.
This is a one-time repo setup performed by **@devops** (exclusive authority over
CI/CD and repo settings):

- Require a pull request before merging.
- **Require status checks to pass before merging** → select check **`ci`**
  (the `lint · typecheck · test` job).
- Require branches to be up to date before merging.
- Do not allow bypassing the above settings.

With this rule, a PR whose `ci` check fails cannot be merged, satisfying AC3
("CI ... bloqueia merge em falha").

> Note: the GitHub branch-protection setting itself cannot be committed to the
> repo — it is configured via repo settings / `gh api`. @devops owns applying it.
