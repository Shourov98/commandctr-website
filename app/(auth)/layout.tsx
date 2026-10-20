import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/server/auth-session";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionFromCookies();
  if (session.user) {
    redirect("/dashboard");
  }

  return children;
}
