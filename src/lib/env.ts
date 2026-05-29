function isLocalhostUrl(value: string) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(value.trim());
}

function normalizeUrl(value: string) {
  return value.replace(/\/$/, "");
}

export function resolveApiBaseUrl(rawValue?: string, options?: { production?: boolean; origin?: string }) {
  const production = options?.production ?? import.meta.env.PROD;
  const origin = normalizeUrl(options?.origin ?? (typeof window !== "undefined" ? window.location.origin : ""));
  const value = rawValue?.trim();

  if (value && (!production || !isLocalhostUrl(value))) {
    return normalizeUrl(value);
  }

  if (production && origin) {
    return origin;
  }

  return "http://localhost:8000";
}

export function getApiBaseCandidates(rawValue?: string, options?: { production?: boolean; origin?: string }) {
  const production = options?.production ?? import.meta.env.PROD;
  const origin = normalizeUrl(options?.origin ?? (typeof window !== "undefined" ? window.location.origin : ""));
  const primary = resolveApiBaseUrl(rawValue, { production, origin });
  const candidates = [primary];

  if (!production && origin && origin !== primary) {
    candidates.push(origin);
  }

  if (production && origin && hasProductionApiMisconfiguration(rawValue, production) && origin !== primary) {
    candidates.push(origin);
  }

  return [...new Set(candidates)];
}

export function hasProductionApiMisconfiguration(rawValue?: string, production = import.meta.env.PROD) {
  return Boolean(production && rawValue?.trim() && isLocalhostUrl(rawValue));
}

export const RAW_API_BASE_URL = import.meta.env.VITE_API_URL;
export const API_BASE_URL = resolveApiBaseUrl(RAW_API_BASE_URL);
