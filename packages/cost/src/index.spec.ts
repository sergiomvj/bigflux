import { describe, it, expect } from "vitest";
import { costPackageInfo } from "./index";

describe("@bigflux/cost skeleton (S0.0 smoke)", () => {
  it("exposes its package identity", () => {
    const info = costPackageInfo();
    expect(info.name).toBe("@bigflux/cost");
    expect(info.story).toBe("S0.5");
  });
});
