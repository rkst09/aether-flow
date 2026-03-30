export const WEBHOOK_URLS = {
  phase01: "https://placeholder-n8n/webhook/phase-01-intake",
  phase02: "https://placeholder-n8n/webhook/phase-02-screens",
  phase03: "https://placeholder-n8n/webhook/phase-03-prototype",
  phase04: "https://placeholder-n8n/webhook/phase-04-audit",
  phase05: "https://placeholder-n8n/webhook/phase-05-copy",
  phase06: "https://placeholder-n8n/webhook/phase-06-docs",
};

export async function triggerPhase(
  phase: keyof typeof WEBHOOK_URLS,
  payload: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch(WEBHOOK_URLS[phase], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
