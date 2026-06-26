import { describe, it, expect } from "vitest";
import { corePackageInfo } from "./index";

describe("@bigflux/core skeleton (S0.0 smoke)", () => {
  it("exposes its package identity", () => {
    const info = corePackageInfo();
    expect(info.name).toBe("@bigflux/core");
    expect(info.story).toBe("transversal");
  });
});
