import { describe, it, expect } from "vitest";
import { eventsPackageInfo } from "./index";

describe("@bigflux/events skeleton (S0.0 smoke)", () => {
  it("exposes its package identity", () => {
    const info = eventsPackageInfo();
    expect(info.name).toBe("@bigflux/events");
    expect(info.story).toBe("S0.10");
  });
});
