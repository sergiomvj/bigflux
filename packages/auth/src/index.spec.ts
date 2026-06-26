import { describe, it, expect } from "vitest";
import { authPackageInfo } from "./index";

describe("@bigflux/auth skeleton (S0.0 smoke)", () => {
  it("exposes its package identity", () => {
    const info = authPackageInfo();
    expect(info.name).toBe("@bigflux/auth");
    expect(info.story).toBe("S0.2");
  });
});
