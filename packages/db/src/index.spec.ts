import { describe, it, expect } from "vitest";
import { dbPackageInfo } from "./index";

describe("@bigflux/db skeleton (S0.0 smoke)", () => {
  it("exposes its package identity", () => {
    const info = dbPackageInfo();
    expect(info.name).toBe("@bigflux/db");
    expect(info.story).toBe("S0.1");
  });
});
