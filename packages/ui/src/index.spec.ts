import { describe, it, expect } from "vitest";
import { uiPackageInfo } from "./index";

describe("@bigflux/ui skeleton (S0.0 smoke)", () => {
  it("exposes its package identity", () => {
    const info = uiPackageInfo();
    expect(info.name).toBe("@bigflux/ui");
    expect(info.story).toBe("S0.3");
  });
});
