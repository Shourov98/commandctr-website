export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "user" | "admin" | "super_admin";
  status: "active" | "blocked";
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  user: AuthUser;
};

type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
};

type ApiErrorResponse = {
  success: false;
  message: string;
  errors?: unknown;
};

const CLIENT_SESSION_STORAGE_KEY = "twinstr-merchant-auth";
const LEGACY_CLIENT_SESSION_STORAGE_KEY = "commandctr-merchant-auth";
export const AUTH_REQUIRED_MESSAGE = "Your session expired. Sign in again.";

const buildDefaultHeaders = (headers?: HeadersInit, body?: BodyInit | null): HeadersInit => {
  const normalizedHeaders = new Headers(headers);

  if (body != null && !normalizedHeaders.has("Content-Type")) {
    normalizedHeaders.set("Content-Type", "application/json");
  }

  return normalizedHeaders;
};

export class ApiClientError extends Error {
  details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.details = details;
  }
}

export const isAuthRequiredError = (error: unknown) =>
  error instanceof ApiClientError &&
  (error.message === AUTH_REQUIRED_MESSAGE || error.message === "Authentication is required.");

const parsePayload = async <T>(response: Response) => {
  return (await response.json().catch(() => null)) as ApiSuccessResponse<T> | ApiErrorResponse | null;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = buildDefaultHeaders(init?.headers, init?.body);
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers,
  });

  const payload = await parsePayload<T>(response);

  if (!response.ok || !payload?.success) {
    throw new ApiClientError(payload?.message ?? "Request failed", payload && "errors" in payload ? payload.errors : null);
  }

  return payload.data;
};

export const authApi = {
  register(input: { firstName: string; lastName: string; email: string; password: string }) {
    return request<AuthSession>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  login(input: { email: string; password: string }) {
    return request<AuthSession>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  logout() {
    return request<{ loggedOut: true }>("/api/auth/logout", {
      method: "POST",
    });
  },

  getSession() {
    return request<{ authenticated: boolean; user: AuthUser | null }>("/api/auth/session");
  },
};

export const authStorage = {
  key: CLIENT_SESSION_STORAGE_KEY,

  save(session: AuthSession) {
    window.localStorage.setItem(this.key, JSON.stringify(session));
  },

  load(): AuthSession | null {
    const raw = window.localStorage.getItem(this.key) || window.localStorage.getItem(LEGACY_CLIENT_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      window.localStorage.removeItem(this.key);
      window.localStorage.removeItem(LEGACY_CLIENT_SESSION_STORAGE_KEY);
      return null;
    }
  },

  clear() {
    window.localStorage.removeItem(this.key);
    window.localStorage.removeItem(LEGACY_CLIENT_SESSION_STORAGE_KEY);
  },
};

export const clearStoredSession = () => {
  authStorage.clear();
};

const redirectToLogin = () => {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
};

export const requestWithAuth = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const requestPath = `/api/backend${path.startsWith("/") ? path : `/${path}`}`;
  const headers = buildDefaultHeaders(init?.headers, init?.body);

  if (typeof window !== "undefined") {
    console.info("[requestWithAuth] sending request", {
      path: requestPath,
      method: init?.method ?? "GET",
      hasBody: init?.body != null,
      contentType: headers instanceof Headers ? headers.get("Content-Type") : undefined,
    });
  }

  const response = await fetch(requestPath, {
    ...init,
    credentials: "same-origin",
    headers,
  });

  if (typeof window !== "undefined") {
    console.info("[requestWithAuth] received response", {
      path: requestPath,
      method: init?.method ?? "GET",
      status: response.status,
      ok: response.ok,
    });
  }

  const payload = await parsePayload<T>(response);

  if (response.status === 401) {
    clearStoredSession();
    const message = payload?.message ?? AUTH_REQUIRED_MESSAGE;
    redirectToLogin();
    throw new ApiClientError(message === "Authentication is required." ? AUTH_REQUIRED_MESSAGE : message);
  }

  if (!response.ok || !payload?.success) {
    throw new ApiClientError(payload?.message ?? "Request failed", payload && "errors" in payload ? payload.errors : null);
  }

  return payload.data;
};
