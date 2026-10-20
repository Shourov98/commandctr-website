"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BadgeCheck,
  Boxes,
  CircleDashed,
  LayoutDashboard,
  Package,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Wallet,
  LogOut,
  User,
  Shield,
  Loader2,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Products", icon: Boxes, href: "/products" },
  { label: "Inventory", icon: Package, href: "/inventory" },
  { label: "Orders", icon: ShoppingCart, href: "/orders" },
  { label: "Import", icon: CircleDashed, href: "/import" },
  { label: "Wallet", icon: Wallet, href: "/wallet" },
  { label: "Integration", icon: BadgeCheck, href: "/integration" },
  { label: "Dispute & Support", icon: ShieldAlert, href: "/support" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const initials = `${user?.firstName?.[0] ?? "T"}${user?.lastName?.[0] ?? ""}`.toUpperCase();
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Twinstr User";

  const handleNavClick = (
    _event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (href !== "/integration") {
      window.sessionStorage.removeItem("integration-shepherd-enabled");
      window.sessionStorage.removeItem("integration-shepherd-stage");
    }
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      logout();
      window.sessionStorage.removeItem("integration-shepherd-enabled");
      window.sessionStorage.removeItem("integration-shepherd-stage");
      router.replace("/login");
    }, 1000);
  };

  return (
    <>
      {/* Invisible backdrop to dismiss profile popover when clicking outside */}
      {isProfileOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setIsProfileOpen(false)}
        />
      )}

      {/* Profile Dropdown for Desktop Sidebar */}
      {isProfileOpen && (
        <div className="hidden md:block fixed left-[88px] bottom-4 w-64 rounded-2xl border border-[#2d3d66] bg-[#131b31] p-4 text-[#8ea0c6] shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-50 animate-in fade-in slide-in-from-left-2 duration-150">
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#263350]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#0ad0e1] to-[#2563eb] text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white truncate">{displayName}</h4>
              <p className="text-[11px] text-[#58eaef] font-medium leading-none mb-1">Merchant Workspace</p>
              <p className="text-[11px] text-[#8ea0c6]/75 truncate">{user?.email ?? "merchant@example.com"}</p>
            </div>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(false);
                router.push("/settings/profile");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[#8ea0c6] hover:bg-[#1f2e53] hover:text-white transition text-left cursor-pointer"
            >
              <User className="h-3.5 w-3.5" />
              My Profile
            </button>
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(false);
                router.push("/wallet");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[#8ea0c6] hover:bg-[#1f2e53] hover:text-white transition text-left cursor-pointer"
            >
              <Wallet className="h-3.5 w-3.5" />
              Wallet Settings
            </button>
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(false);
                router.push("/settings");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[#8ea0c6] hover:bg-[#1f2e53] hover:text-white transition text-left cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5" />
              Security
            </button>
          </div>

          <div className="my-2 border-t border-[#263350]" />

          <button
            type="button"
            onClick={() => {
              setIsProfileOpen(false);
              setIsConfirmOpen(true);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-left cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out
          </button>
        </div>
      )}

      {/* Profile Dropdown for Mobile Header */}
      {isProfileOpen && (
        <div className="block md:hidden fixed right-4 top-16 w-64 rounded-2xl border border-slate-200 bg-white p-4 text-slate-700 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#32cbc6] to-[#0ad0e1] text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-800 truncate">{displayName}</h4>
              <p className="text-[11px] text-[#32cbc6] font-medium leading-none mb-1">Merchant Workspace</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email ?? "merchant@example.com"}</p>
            </div>
          </div>

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(false);
                router.push("/settings/profile");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition text-left cursor-pointer"
            >
              <User className="h-3.5 w-3.5 text-slate-400" />
              My Profile
            </button>
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(false);
                router.push("/wallet");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition text-left cursor-pointer"
            >
              <Wallet className="h-3.5 w-3.5 text-slate-400" />
              Wallet Settings
            </button>
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(false);
                router.push("/settings");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition text-left cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5 text-slate-400" />
              Security
            </button>
          </div>

          <div className="my-2 border-t border-slate-100" />

          <button
            type="button"
            onClick={() => {
              setIsProfileOpen(false);
              setIsConfirmOpen(true);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition text-left cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 text-red-500" />
            Log Out
          </button>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[#131c35] border border-[#26355a] p-6 text-center text-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <LogOut className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Confirm Log Out</h3>
            <p className="text-sm text-[#8ea0c6] mb-6">
              Are you sure you want to log out of Twinstr? Any unsaved changes may be lost.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setIsConfirmOpen(false)}
                className="w-1/2 bg-transparent hover:bg-white/5 border border-white/10 text-[#8ea0c6] px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
                className="w-1/2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:bg-red-500/80 cursor-pointer"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  "Log Out"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="hidden h-screen w-24 shrink-0 border-r border-[#263350] bg-[#17223f] text-[#8ea0c6] md:flex md:flex-col md:sticky md:top-0">
        <div className="flex justify-center border-b border-[#263350] px-3 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0ad0e1] font-bold text-[#17223f]">
            C
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {navItems.map(({ label, icon: Icon, href }) => {
              const isActive = pathname === href;

              return (
                <li key={label}>
                  <Link
                    href={href}
                    onClick={(event) => handleNavClick(event, href)}
                    data-tour={
                      href === "/integration" ? "nav-integration" : undefined
                    }
                    className={`group flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition ${
                      isActive
                        ? "bg-[#1f2e53] text-[#58e7f2]"
                        : "hover:bg-[#1f2e53] hover:text-[#d8e7ff]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-center leading-tight">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-[#263350] px-3 py-4">
          <button
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#3e4f73] bg-[#233153] text-xs font-semibold text-[#d7e5ff] hover:border-[#0ad0e1] hover:bg-[#1f2e53] transition cursor-pointer"
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            {initials}
          </button>
        </div>
      </aside>

      <div className="sticky top-0 z-20 border-b border-[#d6dce8] bg-white px-4 py-3 md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0ad0e1] font-bold text-[#17223f]">
            C
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d1d8e6] bg-[#f7f9fc] text-xs font-semibold text-[#1f2c49] hover:border-[#32cbc6] transition cursor-pointer"
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            {initials}
          </button>
        </div>
      </div>
    </>
  );
}
