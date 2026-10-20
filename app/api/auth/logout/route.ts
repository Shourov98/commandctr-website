import { createLogoutResponse } from "@/lib/server/auth-session";

export async function POST() {
  return createLogoutResponse();
}
