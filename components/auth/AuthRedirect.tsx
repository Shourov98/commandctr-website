"use client";

import { useEffect, type ReactNode } from "react";

import { useAuth } from "./AuthProvider";

export default function AuthRedirect({ children }: { children: ReactNode }) {
  const { initialized, isAuthenticated } = useAuth();

  useEffect(() => {
    if (initialized && isAuthenticated) {
      window.location.replace("/dashboard");
    }
  }, [initialized, isAuthenticated]);

  if (!initialized) {
    return <div className="grid min-h-[14rem] place-items-center text-sm text-[#8b95a7]">Loading...</div>;
  }

  if (isAuthenticated) {
    return <div className="grid min-h-[14rem] place-items-center text-sm text-[#8b95a7]">Redirecting to dashboard...</div>;
  }

  return <>{children}</>;
}
