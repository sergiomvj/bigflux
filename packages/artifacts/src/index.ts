// @bigflux/artifacts — ArtifactService, versionamento, Supabase Storage
// Story owner: S0.6. S0.0 ships only this skeleton (no domain logic).

/** Foundation marker for the @bigflux/artifacts package skeleton (S0.0). */
export interface PackageInfo {
  readonly name: string;
  readonly story: string;
}

/** Returns the package identity. Replaced by real exports in S0.6. */
export function artifactsPackageInfo(): PackageInfo {
  return { name: "@bigflux/artifacts", story: "S0.6" };
}
