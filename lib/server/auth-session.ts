import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { AuthUser } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api/v1";
const ACCESS_COOKIE = "commandctr_access_token";
const REFRESH_COOKIE = "commandctr_refresh_token";
const ACCESS_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

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

type BackendAuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

type RefreshResponse = {
  accessToken: string;
};

type CookieTarget = Pick<NextResponse, "cookies">;
type CookieStore = Awaited<ReturnType<typeof cookies>>;

export type SessionResult = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshed: boolean;
};

export type AuthTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

const isProduction = process.env.NODE_ENV === "production";

const buildBackendUrl = (path: string) => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const buildBackendHeaders = (headers?: HeadersInit) => {
  const nextHeaders = new Headers(headers);

  try {
    const apiUrl = new URL(API_BASE_URL);
    if (apiUrl.hostname.includes("ngrok")) {
      nextHeaders.set("ngrok-skip-browser-warning", "true");
    }
  } catch {
    // Ignore invalid env parsing and fall back to provided headers.
  }

  return nextHeaders;
};

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProduction,
  path: "/",
  maxAge,
});

const parsePayload = async <T>(response: Response) => {
  return (await response.json().catch(() => null)) as ApiSuccessResponse<T> | ApiErrorResponse | null;
};

const clearSessionCookies = (target: CookieTarget) => {
  target.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  target.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
};

const setSessionCookies = (target: CookieTarget, tokens: { accessToken: string; refreshToken?: string }) => {
  target.cookies.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(ACCESS_MAX_AGE_SECONDS));
  if (tokens.refreshToken) {
    target.cookies.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE_SECONDS));
  }
};

const getCookieStore = async (cookieStore?: CookieStore) => cookieStore ?? (await cookies());

export const createBackendResponse = async <T>(path: string, init?: RequestInit) => {
  try {
    const response = await fetch(buildBackendUrl(path), {
      ...init,
      headers: buildBackendHeaders(init?.headers),
    });
    const payload = await parsePayload<T>(response);
    return { response, payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend request failed.";
    const payload: ApiErrorResponse = {
      success: false,
      message: "Backend API is unavailable. Start commandctr-backend-py and confirm NEXT_PUBLIC_API_BASE_URL points to it.",
      errors: { detail: message, url: buildBackendUrl(path) },
    };

    return {
      response: new Response(JSON.stringify(payload), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
      payload,
    };
  }
};

export const getAuthTokensFromCookies = async (cookieStore?: CookieStore): Promise<AuthTokens> => {
  const store = await getCookieStore(cookieStore);
  return {
    accessToken: store.get(ACCESS_COOKIE)?.value ?? null,
    refreshToken: store.get(REFRESH_COOKIE)?.value ?? null,
  };
};

export const refreshAccessToken = async (refreshToken: string | null) => {
  if (!refreshToken) {
    return null;
  }

  const refreshed = await createBackendResponse<RefreshResponse>("/auth/refresh-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  if (!refreshed.response.ok || !refreshed.payload?.success) {
    return null;
  }

  return refreshed.payload.data.accessToken;
};

export const getSessionFromCookies = async (cookieStore?: CookieStore): Promise<SessionResult> => {
  const { accessToken: initialAccessToken, refreshToken } = await getAuthTokensFromCookies(cookieStore);
  let accessToken = initialAccessToken;

  const fetchMe = async (token: string) =>
    createBackendResponse<AuthUser>("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

  if (accessToken) {
    const current = await fetchMe(accessToken);
    if (current.response.ok && current.payload?.success) {
      return { user: current.payload.data, accessToken, refreshed: false };
    }
  }

  if (!refreshToken) {
    return { user: null, accessToken: null, refreshed: false };
  }

  accessToken = await refreshAccessToken(refreshToken);
  if (!accessToken) {
    return { user: null, accessToken: null, refreshed: false };
  }
  const me = await fetchMe(accessToken);
  if (!me.response.ok || !me.payload?.success) {
    return { user: null, accessToken: null, refreshed: false };
  }

  return { user: me.payload.data, accessToken, refreshed: true };
};

export const createAuthSuccessResponse = (data: BackendAuthResponse) => {
  const response = NextResponse.json(
    {
      success: true,
      message: "Authentication successful",
      data: { user: data.user },
    },
    { status: 200 },
  );

  setSessionCookies(response, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  return response;
};

export const createSessionResponse = async () => {
  const session = await getSessionFromCookies();
  const response = NextResponse.json(
    {
      success: true,
      message: session.user ? "Session loaded" : "No active session",
      data: {
        authenticated: Boolean(session.user),
        user: session.user,
      },
    },
    { status: 200 },
  );

  if (session.user && session.accessToken && session.refreshed) {
    setSessionCookies(response, { accessToken: session.accessToken });
  }

  if (!session.user) {
    clearSessionCookies(response);
  }

  return response;
};

export const createLogoutResponse = () => {
  const response = NextResponse.json(
    {
      success: true,
      message: "Logout successful",
      data: { loggedOut: true },
    },
    { status: 200 },
  );

  clearSessionCookies(response);
  return response;
};

export const clearCookiesOnResponse = clearSessionCookies;
export const setCookiesOnResponse = setSessionCookies;
