// @bigflux/ui — DS v2 tokens + componentes React + Storybook
// Story owner: S0.3. S0.0 ships only this skeleton (no domain logic).

/** Foundation marker for the @bigflux/ui package skeleton (S0.0). */
export interface PackageInfo {
  readonly name: string;
  readonly story: string;
}

/** Returns the package identity. Replaced by real exports in S0.3. */
export function uiPackageInfo(): PackageInfo {
  return { name: "@bigflux/ui", story: "S0.3" };
}
