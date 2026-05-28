import { API_BASE_URL } from "@/lib/env";
import { supabase } from "@/lib/supabase";

type TelemetryLevel = "info" | "warning" | "error";

interface TelemetryPayload {
  level: TelemetryLevel;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
}

async function buildPayload(payload: TelemetryPayload) {
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  return JSON.stringify({
    ...payload,
    metadata: payload.metadata ?? {},
    path: typeof window !== "undefined" ? window.location.pathname : "",
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    user_id: data.session?.user?.id ?? null,
    timestamp: new Date().toISOString(),
  });
}

export async function sendTelemetry(payload: TelemetryPayload) {
  try {
    const body = await buildPayload(payload);
    const url = `${API_BASE_URL}/api/telemetry`;

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function" && document.visibilityState === "hidden") {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Telemetry must never break the app.
  }
}

export function captureClientEvent(type: string, message: string, metadata?: Record<string, unknown>) {
  void sendTelemetry({ level: "info", type, message, metadata });
}

export function captureClientWarning(message: string, metadata?: Record<string, unknown>) {
  void sendTelemetry({ level: "warning", type: "client_warning", message, metadata });
}

export function captureClientError(message: string, metadata?: Record<string, unknown>) {
  void sendTelemetry({ level: "error", type: "client_error", message, metadata });
}
