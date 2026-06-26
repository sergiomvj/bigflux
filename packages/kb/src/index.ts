// @bigflux/kb — Knowledge Base pgvector (global+tenant)
// Story owner: S0.10. S0.0 ships only this skeleton (no domain logic).

/** Foundation marker for the @bigflux/kb package skeleton (S0.0). */
export interface PackageInfo {
  readonly name: string;
  readonly story: string;
}

/** Returns the package identity. Replaced by real exports in S0.10. */
export function kbPackageInfo(): PackageInfo {
  return { name: "@bigflux/kb", story: "S0.10" };
}
