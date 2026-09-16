import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

const DEFAULT_OUTPUT_ROOT = path.resolve(process.cwd(), "../commandctr-ai-agent/output");
const RENDER_OUTPUT_ROOT_PREFIX = "/opt/render/project/src/output/";
const LEGACY_LOCAL_OUTPUT_ROOT_PREFIXES = [
  "/home/shourov/Documents/work_projects/commandctr/product-ai-agent/output/",
  "/home/shourov/Documents/work_projects/commandctr/commandctr-ai-agent/output/",
];

function getAllowedRoot() {
  return path.resolve(process.env.PRODUCT_AI_AGENT_OUTPUT_ROOT ?? DEFAULT_OUTPUT_ROOT);
}

function getAllowedTempRoots() {
  return [path.resolve(os.tmpdir())];
}

function mapKnownAbsoluteOutputPath(rawPath: string, allowedRoot: string) {
  const normalizedPath = path.posix.normalize(rawPath.replace(/\\/g, "/"));

  if (normalizedPath.startsWith(RENDER_OUTPUT_ROOT_PREFIX)) {
    const relativeOutputPath = normalizedPath.slice(RENDER_OUTPUT_ROOT_PREFIX.length);
    return path.resolve(allowedRoot, relativeOutputPath);
  }

  for (const legacyPrefix of LEGACY_LOCAL_OUTPUT_ROOT_PREFIXES) {
    if (normalizedPath.startsWith(legacyPrefix)) {
      const relativeOutputPath = normalizedPath.slice(legacyPrefix.length);
      return path.resolve(allowedRoot, relativeOutputPath);
    }
  }

  return null;
}

function resolveRequestedPath(rawPath: string, allowedRoot: string) {
  if (path.isAbsolute(rawPath)) {
    const mappedPath = mapKnownAbsoluteOutputPath(rawPath, allowedRoot);
    if (mappedPath) {
      return mappedPath;
    }

    return path.resolve(rawPath);
  }

  return path.resolve(allowedRoot, rawPath);
}

function getMimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  return "application/octet-stream";
}

function normalizeRemoteImageUrl(rawUrl: string) {
  const remoteUrl = new URL(rawUrl);
  remoteUrl.pathname = remoteUrl.pathname.replace(/%(?![0-9a-f]{2})/gi, "%25");
  remoteUrl.search = remoteUrl.search.replace(/%(?![0-9a-f]{2})/gi, "%25");
  return remoteUrl;
}

function isAllowedRemoteImageUrl(remoteUrl: URL) {
  return (
    remoteUrl.protocol === "https:" &&
    (remoteUrl.hostname === "amazonaws.com" || remoteUrl.hostname.endsWith(".amazonaws.com"))
  );
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (rawUrl) {
    let remoteUrl: URL;
    try {
      remoteUrl = normalizeRemoteImageUrl(rawUrl);
    } catch {
      return NextResponse.json({ detail: "Invalid remote image URL." }, { status: 400 });
    }

    if (!isAllowedRemoteImageUrl(remoteUrl)) {
      return NextResponse.json({ detail: "Remote image host is not allowed." }, { status: 403 });
    }

    try {
      const response = await fetch(remoteUrl, { cache: "no-store" });
      if (!response.ok || !response.body) {
        return NextResponse.json({ detail: "Remote image could not be loaded." }, { status: response.status });
      }

      return new NextResponse(response.body, {
        status: 200,
        headers: {
          "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
          "Cache-Control": "no-store",
        },
      });
    } catch {
      return NextResponse.json({ detail: "Remote image could not be loaded." }, { status: 502 });
    }
  }

  const rawPath = request.nextUrl.searchParams.get("path");

  if (!rawPath) {
    return NextResponse.json({ detail: "Missing image path." }, { status: 400 });
  }

  const allowedRoot = getAllowedRoot();
  const resolvedPath = resolveRequestedPath(rawPath, allowedRoot);
  const isWithinOutputRoot = resolvedPath.startsWith(allowedRoot);
  const isWithinTempRoot = getAllowedTempRoots().some((tempRoot) =>
    resolvedPath.startsWith(tempRoot),
  );

  if (!isWithinOutputRoot && !isWithinTempRoot) {
    return NextResponse.json({ detail: "Image path is outside the allowed output directory." }, { status: 403 });
  }

  try {
    const payload = await readFile(resolvedPath);
    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": getMimeType(resolvedPath),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ detail: "Image file was not found." }, { status: 404 });
  }
}
