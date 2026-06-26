// @bigflux/auth — Supabase Auth wrapper, RBAC guards, papel approver
// Story owner: S0.2. S0.0 ships only this skeleton (no domain logic).

/** Foundation marker for the @bigflux/auth package skeleton (S0.0). */
export interface PackageInfo {
  readonly name: string;
  readonly story: string;
}

/** Returns the package identity. Replaced by real exports in S0.2. */
export function authPackageInfo(): PackageInfo {
  return { name: "@bigflux/auth", story: "S0.2" };
}
