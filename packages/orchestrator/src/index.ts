// @bigflux/orchestrator — XState state machine, gates, GateResult
// Story owner: S0.7. S0.0 ships only this skeleton (no domain logic).

/** Foundation marker for the @bigflux/orchestrator package skeleton (S0.0). */
export interface PackageInfo {
  readonly name: string;
  readonly story: string;
}

/** Returns the package identity. Replaced by real exports in S0.7. */
export function orchestratorPackageInfo(): PackageInfo {
  return { name: "@bigflux/orchestrator", story: "S0.7" };
}
