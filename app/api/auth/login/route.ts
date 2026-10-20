import { NextResponse } from "next/server";

import { createAuthSuccessResponse, createBackendResponse } from "@/lib/server/auth-session";

export async function POST(request: Request) {
  const body = await request.text();
  const { response, payload } = await createBackendResponse<{
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: "user" | "admin" | "super_admin";
      status: "active" | "blocked";
      createdAt: string;
      updatedAt: string;
    };
    accessToken: string;
    refreshToken: string;
  }>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok || !payload?.success) {
    return NextResponse.json(
      {
        success: false,
        message: payload?.message ?? "Login failed",
        errors: payload && "errors" in payload ? payload.errors : null,
      },
      { status: response.status || 500 },
    );
  }

  return createAuthSuccessResponse(payload.data);
}
