// @bigflux/adapters — TrafficPlatformAdapter, Meta/Google skeleton
// Story owner: S0.9. S0.0 ships only this skeleton (no domain logic).

/** Foundation marker for the @bigflux/adapters package skeleton (S0.0). */
export interface PackageInfo {
  readonly name: string;
  readonly story: string;
}

/** Returns the package identity. Replaced by real exports in S0.9. */
export function adaptersPackageInfo(): PackageInfo {
  return { name: "@bigflux/adapters", story: "S0.9" };
}
