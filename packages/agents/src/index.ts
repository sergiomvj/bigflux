// @bigflux/agents — AgentRunner (sync/job/stream), envelope, catalogo erro
// Story owner: S0.8. S0.0 ships only this skeleton (no domain logic).

/** Foundation marker for the @bigflux/agents package skeleton (S0.0). */
export interface PackageInfo {
  readonly name: string;
  readonly story: string;
}

/** Returns the package identity. Replaced by real exports in S0.8. */
export function agentsPackageInfo(): PackageInfo {
  return { name: "@bigflux/agents", story: "S0.8" };
}
