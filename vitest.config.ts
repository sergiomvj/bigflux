import { defineConfig } from "vitest/config";

/**
 * Base Vitest config for BIGFLUX.
 * Per-package vitest configs may extend/merge this. Coverage uses v8.
 *
 * NOTE (S0.0): the >=90% coverage gate applies from S0.1 onward (stories with
 * domain logic). The foundation ships one smoke test per package skeleton to
 * prove the pipeline is green — no coverage threshold is enforced here.
 * See tech-stack.md §3.3 and the story Testing section.
 */
export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/index.ts"],
    },
  },
});
