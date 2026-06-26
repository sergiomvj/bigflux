import { describe, it, expect } from "vitest";
import { llmRouterPackageInfo } from "./index";

describe("@bigflux/llm-router skeleton (S0.0 smoke)", () => {
  it("exposes its package identity", () => {
    const info = llmRouterPackageInfo();
    expect(info.name).toBe("@bigflux/llm-router");
    expect(info.story).toBe("S0.4");
  });
});
