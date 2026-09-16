import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

import { getSessionFromCookies, setCookiesOnResponse } from "@/lib/server/auth-session";

const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:8000/api";
const DEFAULT_PROXY_TIMEOUT_MS = 10 * 60 * 1000;

export const runtime = "nodejs";

function getBackendBaseUrl() {
  return process.env.PRODUCT_AI_AGENT_BASE_URL ?? DEFAULT_BACKEND_BASE_URL;
}

function getProxyTimeoutMs() {
  const raw = Number.parseInt(process.env.PRODUCT_AI_AGENT_PROXY_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_PROXY_TIMEOUT_MS;
}

async function forwardRequest(request: NextRequest, pathSegments: string[]) {
  const session = await getSessionFromCookies();
  if (!session.user || !session.accessToken) {
    return NextResponse.json({ detail: "Authorization token is required." }, { status: 401 });
  }

  const backendBaseUrl = getBackendBaseUrl();
  const upstreamUrl = new URL(`${backendBaseUrl.replace(/\/$/, "")}/${pathSegments.join("/")}`);
  const timeoutMs = getProxyTimeoutMs();

  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.set("Authorization", `Bearer ${session.accessToken}`);

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, init);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Product AI backend request failed.";
    const isTimeout =
      message.includes("Headers Timeout") ||
      message.includes("Body Timeout") ||
      message.includes("timed out") ||
      message.includes("fetch failed");

    return NextResponse.json(
      {
        detail: isTimeout
          ? `Product AI backend timed out after ${Math.round(timeoutMs / 1000)} seconds.`
          : `Product AI backend request failed: ${message}`,
      },
      { status: isTimeout ? 504 : 502 },
    );
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  const response = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });

  if (session.refreshed) {
    setCookiesOnResponse(response, { accessToken: session.accessToken });
  }

  return response;
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path: pathSegments } = await context.params;

  if (pathSegments && pathSegments.length === 2 && pathSegments[0] === "image" && pathSegments[1] === "upload") {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const market = formData.get("market") as string | null;
      const productId = formData.get("productId") as string | null;

      if (!file) {
        return NextResponse.json({ detail: "No file provided." }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const DEFAULT_OUTPUT_ROOT = path.resolve(process.cwd(), "../commandctr-ai-agent/output");
      const allowedRoot = path.resolve(process.env.PRODUCT_AI_AGENT_OUTPUT_ROOT ?? DEFAULT_OUTPUT_ROOT);

      // Ensure output directory exists
      await mkdir(allowedRoot, { recursive: true });

      // Generate unique name
      const timestamp = Date.now();
      const ext = path.extname(file.name) || ".png";
      const filename = `uploaded_${productId || "draft"}_${market || "image"}_${timestamp}${ext}`;
      const targetPath = path.resolve(allowedRoot, filename);

      // Write file
      await writeFile(targetPath, buffer);

      // Return the path formatted for the image proxy
      const relativePath = filename;
      
      return NextResponse.json({
        relative_path: relativePath,
        absolute_path: targetPath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed.";
      return NextResponse.json({ detail: message }, { status: 500 });
    }
  }

  return forwardRequest(request, pathSegments);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}
