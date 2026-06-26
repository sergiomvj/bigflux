import { describe, it, expect } from "vitest";
import { agentsPackageInfo } from "./index";

describe("@bigflux/agents skeleton (S0.0 smoke)", () => {
  it("exposes its package identity", () => {
    const info = agentsPackageInfo();
    expect(info.name).toBe("@bigflux/agents");
    expect(info.story).toBe("S0.8");
  });
});
