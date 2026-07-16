import axios from "axios";

// In production (Railway), VITE_API_URL is the full backend URL
// e.g. https://kalvi-backend-production.up.railway.app
// In development, Vite's proxy forwards /api → localhost:4000
function buildBase(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  if (!raw) return "/api";
  // Defensively ensure the URL has a protocol — if Railway env var was set
  // without https:// it would be treated as a relative path by axios.
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return `${url}/api`;
}
const BASE = buildBase();

export const api = axios.create({
  baseURL: BASE,
});

// Unauthenticated client — for public endpoints (auth, Google callback, register)
export const publicApi = axios.create({
  baseURL: BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !location.pathname.includes("login")) {
      localStorage.removeItem("token");
      location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export interface ApiFieldIssue {
  field: string;
  message: string;
}

export interface ParsedApiError {
  message: string;
  issues: ApiFieldIssue[];
}

/**
 * Normalises any error thrown by axios into a friendly, user-facing shape.
 * - Uses the backend's `error` message and `details` (field issues) when present.
 * - Falls back to sensible messages for network/timeout/unknown cases.
 */
export function parseApiError(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): ParsedApiError {
  const anyErr = err as any;
  const resp = anyErr?.response;

  if (resp?.data) {
    const data = resp.data;
    const issues: ApiFieldIssue[] = Array.isArray(data.details)
      ? data.details.filter((d: any) => d && typeof d.message === "string")
      : [];
    return {
      message: data.error ?? fallback,
      issues,
    };
  }

  if (anyErr?.code === "ERR_NETWORK") {
    return {
      message:
        "Cannot reach the server. Please check your connection and try again.",
      issues: [],
    };
  }
  if (anyErr?.code === "ECONNABORTED") {
    return { message: "The request timed out. Please try again.", issues: [] };
  }

  return { message: anyErr?.message ?? fallback, issues: [] };
}
