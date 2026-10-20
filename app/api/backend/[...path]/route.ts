import { NextResponse } from "next/server";

import {
  clearCookiesOnResponse,
  getAuthTokensFromCookies,
  refreshAccessToken,
  setCookiesOnResponse,
} from "@/lib/server/auth-session";
import { applyBackendCompatibilityHeaders, getBackendApiBaseUrl } from "@/lib/server/backend-config";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "cookie",
  "host",
  "transfer-encoding",
]);

const RESPONSE_HEADERS_TO_STRIP = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
]);

async function proxyRequest(request: Request, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const pathname = `/${path.join("/")}`;
  const search = new URL(request.url).search;
  const rawBody =
    request.method === "GET" || request.method === "HEAD" ? undefined : Buffer.from(await request.arrayBuffer());
  const body = rawBody && rawBody.length > 0 ? rawBody : undefined;
  const tokens = await getAuthTokensFromCookies();
  if (!tokens.accessToken && !tokens.refreshToken) {
    const unauthorized = NextResponse.json(
      {
        success: false,
        message: "Authentication is required.",
      },
      { status: 401 },
    );
    clearCookiesOnResponse(unauthorized);
    return unauthorized;
  }

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  if (!body) {
    headers.delete("content-type");
  }
  let backendBaseUrl: string;
  try {
    backendBaseUrl = getBackendApiBaseUrl();
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Backend API base URL is not configured.",
        errors: { detail: error instanceof Error ? error.message : "Unknown backend configuration error." },
      },
      { status: 500 },
    );
  }

  const targetUrl = `${backendBaseUrl}${pathname}${search}`;
  console.info("[api/backend proxy] incoming request", {
    method: request.method,
    pathname,
    search,
    targetUrl,
    hasAccessToken: Boolean(tokens.accessToken),
    hasRefreshToken: Boolean(tokens.refreshToken),
    bodyBytes: rawBody?.length ?? 0,
  });
  applyBackendCompatibilityHeaders(headers);
  let accessToken = tokens.accessToken;

  const sendUpstream = (token: string | null) => {
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      headers.delete("Authorization");
    }

    return fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });
  };

  let upstream = await sendUpstream(accessToken);
  console.info("[api/backend proxy] upstream response", {
    method: request.method,
    pathname,
    status: upstream.status,
    ok: upstream.ok,
  });
  let refreshed = false;

  if (upstream.status === 401 && tokens.refreshToken) {
    const nextAccessToken = await refreshAccessToken(tokens.refreshToken);
    if (nextAccessToken) {
      accessToken = nextAccessToken;
      upstream = await sendUpstream(accessToken);
      refreshed = true;
      console.info("[api/backend proxy] upstream retried after refresh", {
        method: request.method,
        pathname,
        status: upstream.status,
        ok: upstream.ok,
      });
    }
  }

  const responseHeaders = new Headers(upstream.headers);
  for (const headerName of RESPONSE_HEADERS_TO_STRIP) {
    responseHeaders.delete(headerName);
  }

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });

  if (refreshed && accessToken) {
    setCookiesOnResponse(response, { accessToken });
  }

  if (upstream.status === 401) {
    clearCookiesOnResponse(response);
  }

  return response;
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params);
}
