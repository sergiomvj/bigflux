import { describe, it, expect } from "vitest";
import { kbPackageInfo } from "./index";

describe("@bigflux/kb skeleton (S0.0 smoke)", () => {
  it("exposes its package identity", () => {
    const info = kbPackageInfo();
    expect(info.name).toBe("@bigflux/kb");
    expect(info.story).toBe("S0.10");
  });
});
