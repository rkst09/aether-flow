import { describe, expect, it } from "vitest";

import { getRouteMetadata } from "@/lib/route-metadata";

describe("route metadata", () => {
  it("returns specific metadata for project phase routes", () => {
    const meta = getRouteMetadata("/project/abc123/phase/04");
    expect(meta.title).toContain("UX Audit");
    expect(meta.description).toContain("Audit");
  });

  it("falls back to the default metadata for unknown routes", () => {
    const meta = getRouteMetadata("/something-unknown");
    expect(meta.title).toBe("Aether");
  });
});
