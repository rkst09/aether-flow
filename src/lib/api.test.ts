import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/telemetry", () => ({
  captureClientError: vi.fn(),
  captureClientWarning: vi.fn(),
}));

import { supabase } from "@/lib/supabase";
import { confirmPhaseReview, runAudit, runPersonas } from "@/lib/api";

const getSessionMock = vi.mocked(supabase.auth.getSession);

describe("api auth forwarding", () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
    } as never);
    vi.stubGlobal("fetch", vi.fn());
  });

  it("adds the bearer token to JSON phase requests", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ personas_rich: [], cached: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await runPersonas("project-123");

    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/phase/01/personas");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("adds the bearer token to multipart phase requests", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ audit_rich: [], cached: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const file = new File(["pixels"], "screen.png", { type: "image/png" });
    await runAudit("project-123", [file], "", "Audit this flow");

    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("project_id")).toBe("project-123");
  });

  it("deduplicates identical JSON phase requests while one is in flight", async () => {
    let resolveResponse: ((value: Response) => void) | null = null;
    vi.mocked(global.fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );

    const requestA = runPersonas("project-123");
    const requestB = runPersonas("project-123");

    await vi.waitFor(() => {
      expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    });

    resolveResponse?.(
      new Response(JSON.stringify({ personas_rich: [], cached: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await Promise.all([requestA, requestB]);
  });

  it("sends review confirmation payloads for finalized phases", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true, phase: 5, next_phase: 6, status: "reviewed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await confirmPhaseReview("project-123", 5, {
      nextPhase: 6,
      summary: "Copy review approved.",
      metrics: { screen_count: 4, issue_count: 12 },
    });

    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(String(init?.body));

    expect(body.project_id).toBe("project-123");
    expect(body.phase).toBe(5);
    expect(body.next_phase).toBe(6);
    expect(body.summary).toBe("Copy review approved.");
    expect(body.metrics.issue_count).toBe(12);
  });
});
