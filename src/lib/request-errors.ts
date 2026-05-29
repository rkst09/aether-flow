import { API_BASE_URL } from "@/lib/env";

export interface PhaseErrorDetails {
  title: string;
  summary: string;
  steps: string[];
  command?: string;
}

const BACKEND_START_COMMAND = String.raw`cd C:\Users\raksh\aether-flow\backend && .\.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000`;

function isLocalBackendUrl(value: string) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(value);
}

export function getPhaseErrorDetails(phaseName: string, message: string): PhaseErrorDetails {
  const normalized = message.toLowerCase();

  if (normalized.includes("offline")) {
    return {
      title: `${phaseName} is unavailable while offline`,
      summary: "Your network connection dropped before the phase request could complete.",
      steps: [
        "Reconnect to the internet.",
        "Wait for the online banner to confirm your connection is back.",
        "Retry the phase once the connection stabilizes.",
      ],
    };
  }

  if (normalized.includes("session expired") || normalized.includes("sign in again")) {
    return {
      title: `${phaseName} needs a fresh session`,
      summary: "Your authentication token is missing, expired, or no longer valid for this request.",
      steps: [
        "Sign out and sign back in.",
        "Re-open the project from the dashboard after signing in.",
        "Retry the phase once the session is restored.",
      ],
    };
  }

  if (normalized.includes("project could not be found") || normalized.includes("project not found")) {
    return {
      title: `${phaseName} cannot access this project`,
      summary: "The backend could not find this project for the currently signed-in account.",
      steps: [
        "Go back to Projects and open the project again.",
        "Confirm you are signed in with the same account that created the project.",
        "Retry after the correct project is open.",
      ],
    };
  }

  if (normalized.includes("auth validation unavailable") || normalized.includes("unable to validate your session with supabase")) {
    return {
      title: `${phaseName} could not verify your session`,
      summary: "The backend started, but it could not validate the current Supabase session.",
      steps: [
        "Check that backend/.env contains the correct Supabase URL and keys.",
        "Confirm your machine can reach the Supabase project.",
        "Restart the backend after changing backend/.env or auth-related backend code.",
      ],
      command: BACKEND_START_COMMAND,
    };
  }

  if (normalized.includes("timed out")) {
    return {
      title: `${phaseName} took too long`,
      summary: "The request exceeded the allowed time limit before the backend responded.",
      steps: [
        "Retry once in case the model call was temporarily slow.",
        "Check the backend terminal for a long-running OpenAI or Supabase request.",
        "Restart the backend if it looks stuck or stopped logging progress.",
      ],
      command: BACKEND_START_COMMAND,
    };
  }

  if (normalized.includes("local backend is not reachable") || normalized.includes("unable to reach the backend")) {
    const steps = isLocalBackendUrl(API_BASE_URL)
      ? [
          "Start the backend locally.",
          "Open http://127.0.0.1:8000/health and confirm it returns a status ok payload.",
          "Retry the phase after the health check succeeds.",
        ]
      : [
          "Check that the API base URL is correct for this environment.",
          "Confirm the backend service is deployed and healthy.",
          "Retry the phase once the backend URL is reachable.",
        ];

    return {
      title: `${phaseName} cannot reach the backend`,
      summary: message,
      steps,
      command: isLocalBackendUrl(API_BASE_URL) ? BACKEND_START_COMMAND : undefined,
    };
  }

  return {
    title: `${phaseName} failed`,
    summary: message,
    steps: [
      "Retry the phase once.",
      "Check the backend terminal for the matching request error.",
      "Restart the backend if you recently changed backend Python files or backend/.env.",
    ],
    command: BACKEND_START_COMMAND,
  };
}
