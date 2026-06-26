// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

/**
 * BIGFLUX flat ESLint config (ESLint 9).
 * - TS strict-aware linting via typescript-eslint.
 * - AC5: no-restricted-imports forces absolute imports (@bigflux/*),
 *   blocking deep relative paths (Constitution Art. VI).
 * - no-hardcoded-color: RESERVED for S0.3 (DS v2). Kept commented/off here;
 *   activated in the @bigflux/ui story (S0.3 AC1). See coding-standards.md §11.
 */
export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/build/**", "**/coverage/**", "**/node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // AC5 — absolute imports (@bigflux/*); block deep relative paths.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../*", "../../../*"],
              message:
                "Deep relative imports are forbidden. Use the '@bigflux/*' path alias (Constitution Art. VI).",
            },
          ],
        },
      ],

      // S0.3 RESERVED — no-hardcoded-color (DS v2: no hex literals in UI code).
      // Activated in @bigflux/ui (S0.3 AC1). Intentionally OFF until then so it
      // does not affect non-UI packages in the foundation. See coding-standards §11.
      // "no-restricted-syntax": [
      //   "error",
      //   {
      //     selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,4}){1,2}$/]",
      //     message:
      //       "Hardcoded color literals are forbidden in UI code. Use DS v2 CSS variables (--red, --grad-brand). (S0.3)",
      //   },
      // ],
    },
  },
  {
    // Test files: relax unused checks that fixtures/mocks commonly trip.
    files: ["**/*.spec.ts", "**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  prettier
);
