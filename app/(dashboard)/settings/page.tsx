import Link from "next/link";
import { ChevronRight } from "lucide-react";

type SettingsItem = {
  id: string;
  title: string;
  description: string;
  href: string;
};

const settingsItems: SettingsItem[] = [
  {
    id: "profile",
    title: "My Profile",
    description: "Manage your personal information, contact details, and organization profile",
    href: "/settings/profile",
  },
  {
    id: "notifications",
    title: "Notification Settings",
    description: "Configure alerts, email preferences, and push notifications",
    href: "/settings/notifications",
  },
  {
    id: "password",
    title: "Change Password",
    description: "Update your password to secure your account",
    href: "/settings/password",
  },
  {
    id: "terms",
    title: "Terms and Conditions",
    description: "Read our terms of service and usage guidelines",
    href: "/settings/terms",
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    description: "View data collection and usage policies",
    href: "/settings/privacy",
  },
  {
    id: "support",
    title: "Help & Support",
    description: "Get technical assistance or contact support",
    href: "/settings/support",
  },
];

export default function SettingsPage() {
  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="space-y-4">
        <header className="rounded-xl border border-[#2c3b61] bg-[#1b2748] px-5 py-5 text-white">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-[#a9b8d6]">Manage your account preferences and system settings.</p>
        </header>

        <article className="overflow-hidden rounded-2xl border border-[#dbe2ee] bg-white shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
          {settingsItems.map((item, index) => (
            <Link
              className="relative flex items-center justify-between px-5 py-5 transition hover:bg-[#f8fbff]"
              href={item.href}
              key={item.id}
            >
              <div>
                <p className="text-2xl font-semibold text-[#232f46]">{item.title}</p>
                <p className="mt-1 text-sm text-[#8d9db8]">{item.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-[#a4b2c8]" />

              {index !== settingsItems.length - 1 ? (
                <span className="pointer-events-none absolute left-5 right-5 -bottom-px h-px bg-[#edf1f7]" />
              ) : null}
            </Link>
          ))}
        </article>
      </div>
    </section>
  );
}
