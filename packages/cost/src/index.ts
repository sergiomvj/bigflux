// @bigflux/cost — CostTracker, QuotaGuard, degradacao 70/90/100%
// Story owner: S0.5. S0.0 ships only this skeleton (no domain logic).

/** Foundation marker for the @bigflux/cost package skeleton (S0.0). */
export interface PackageInfo {
  readonly name: string;
  readonly story: string;
}

/** Returns the package identity. Replaced by real exports in S0.5. */
export function costPackageInfo(): PackageInfo {
  return { name: "@bigflux/cost", story: "S0.5" };
}
