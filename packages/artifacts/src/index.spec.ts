import { describe, it, expect } from "vitest";
import { artifactsPackageInfo } from "./index";

describe("@bigflux/artifacts skeleton (S0.0 smoke)", () => {
  it("exposes its package identity", () => {
    const info = artifactsPackageInfo();
    expect(info.name).toBe("@bigflux/artifacts");
    expect(info.story).toBe("S0.6");
  });
});
