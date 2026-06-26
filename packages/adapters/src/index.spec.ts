import { describe, it, expect } from "vitest";
import { adaptersPackageInfo } from "./index";

describe("@bigflux/adapters skeleton (S0.0 smoke)", () => {
  it("exposes its package identity", () => {
    const info = adaptersPackageInfo();
    expect(info.name).toBe("@bigflux/adapters");
    expect(info.story).toBe("S0.9");
  });
});
