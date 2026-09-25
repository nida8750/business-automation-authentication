import type { TokenResponse } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
const ACCESS_KEY = "nexaflow.access";
const REFRESH_KEY = "nexaflow.refresh";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(tokens: TokenResponse): void {
  localStorage.setItem(ACCESS_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  skipRefresh?: boolean;
};

async function parseError(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    return new ApiError(
      response.status,
      data.error?.code || "error",
      data.error?.message || response.statusText,
    );
  } catch {
    return new ApiError(response.status, "error", response.statusText);
  }
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.auth !== false) {
    const access = getAccessToken();
    if (access) headers.Authorization = `Bearer ${access}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(
      0,
      "connection_failed",
      "Cannot reach the API. Keep FastAPI on http://127.0.0.1:8000 and open the desk at http://localhost:5173.",
    );
  }

  if (response.status === 401 && options.auth !== false && !options.skipRefresh) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return api<T>(path, { ...options, skipRefresh: true });
    }
    clearTokens();
  }

  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const tokens = await api<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refresh },
      auth: false,
      skipRefresh: true,
    });
    setTokens(tokens);
    return true;
  } catch {
    return false;
  }
}
