import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/server/auth-session";
import AuthGuard from "@/components/auth/AuthGuard";
import DashboardSidebar from "./components/DashboardSidebar";
import IntegrationShepherdTour from "./components/IntegrationShepherdTour";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionFromCookies();
  if (!session.user) {
    redirect("/login");
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f2f5fa] text-[#1d2a45]">
        <div className="flex flex-col md:flex-row w-full">
          <DashboardSidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
        <IntegrationShepherdTour />
      </div>
    </AuthGuard>
  );
}
