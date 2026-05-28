import { describe, expect, it } from "vitest";

import { getApiBaseCandidates, hasProductionApiMisconfiguration, resolveApiBaseUrl } from "@/lib/env";

describe("env helpers", () => {
  it("falls back to localhost during development", () => {
    expect(resolveApiBaseUrl("", { production: false, origin: "https://app.aether.com" })).toBe("http://localhost:8000");
  });

  it("falls back to same-origin in production when localhost is configured", () => {
    expect(resolveApiBaseUrl("http://localhost:8000", { production: true, origin: "https://app.aether.com" })).toBe("https://app.aether.com");
  });

  it("adds the dev server origin as a fallback candidate during development", () => {
    expect(getApiBaseCandidates("http://localhost:8000", { production: false, origin: "http://localhost:8080" })).toEqual([
      "http://localhost:8000",
      "http://localhost:8080",
    ]);
  });

  it("detects a localhost production misconfiguration", () => {
    expect(hasProductionApiMisconfiguration("http://localhost:8000", true)).toBe(true);
    expect(hasProductionApiMisconfiguration("https://api.aether.com", true)).toBe(false);
  });
});
