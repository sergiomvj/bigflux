// @bigflux/db — modelo tenant, RLS helpers, set_tenant_context
// Story owner: S0.1. S0.0 ships only this skeleton (no domain logic).

/** Foundation marker for the @bigflux/db package skeleton (S0.0). */
export interface PackageInfo {
  readonly name: string;
  readonly story: string;
}

/** Returns the package identity. Replaced by real exports in S0.1. */
export function dbPackageInfo(): PackageInfo {
  return { name: "@bigflux/db", story: "S0.1" };
}
