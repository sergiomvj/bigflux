// @bigflux/llm-router — ModelRouter (capacidade), LLMClient, fallback
// Story owner: S0.4. S0.0 ships only this skeleton (no domain logic).

/** Foundation marker for the @bigflux/llm-router package skeleton (S0.0). */
export interface PackageInfo {
  readonly name: string;
  readonly story: string;
}

/** Returns the package identity. Replaced by real exports in S0.4. */
export function llmRouterPackageInfo(): PackageInfo {
  return { name: "@bigflux/llm-router", story: "S0.4" };
}
