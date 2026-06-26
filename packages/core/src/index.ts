// @bigflux/core — tipos compartilhados (Issue, GateResult, Result-like)
// Story owner: transversal. S0.0 ships only this skeleton (no domain logic).

/** Foundation marker for the @bigflux/core package skeleton (S0.0). */
export interface PackageInfo {
  readonly name: string;
  readonly story: string;
}

/** Returns the package identity. Replaced by real exports in transversal. */
export function corePackageInfo(): PackageInfo {
  return { name: "@bigflux/core", story: "transversal" };
}
