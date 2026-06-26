import { describe, it, expect } from "vitest";
import { orchestratorPackageInfo } from "./index";

describe("@bigflux/orchestrator skeleton (S0.0 smoke)", () => {
  it("exposes its package identity", () => {
    const info = orchestratorPackageInfo();
    expect(info.name).toBe("@bigflux/orchestrator");
    expect(info.story).toBe("S0.7");
  });
});
