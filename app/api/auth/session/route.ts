import { createSessionResponse } from "@/lib/server/auth-session";

export async function GET() {
  return createSessionResponse();
}
