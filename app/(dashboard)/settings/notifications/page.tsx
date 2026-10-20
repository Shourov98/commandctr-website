"use client";

import { useState } from "react";

type NotificationKey =
  | "newOrders"
  | "lowStock"
  | "payoutUpdates"
  | "errors"
  | "disputes"
  | "aiAlerts";

type NotificationItem = {
  key: NotificationKey;
  label: string;
};

const notificationItems: NotificationItem[] = [
  { key: "newOrders", label: "New Orders" },
  { key: "lowStock", label: "Low Stock" },
  { key: "payoutUpdates", label: "Payout Updates" },
  { key: "errors", label: "Errors" },
  { key: "disputes", label: "Disputes" },
  { key: "aiAlerts", label: "AI Alerts" },
];

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<Record<NotificationKey, boolean>>({
    newOrders: true,
    lowStock: true,
    payoutUpdates: false,
    errors: true,
    disputes: false,
    aiAlerts: true,
  });

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="space-y-4">
        <header className="rounded-xl border border-[#2c3b61] bg-[#1b2748] px-5 py-5 text-white">
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="mt-1 text-sm text-[#a9b8d6]">Manage how you receive alerts and updates.</p>
        </header>

        <article className="overflow-hidden rounded-2xl border border-[#dbe2ee] bg-white shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
          <div className="border-b border-[#edf1f7] px-5 py-4">
            <h2 className="text-xl font-semibold text-[#232f46]">Email Notifications</h2>
          </div>

          {notificationItems.map((item) => {
            const enabled = settings[item.key];

            return (
              <div className="flex items-center justify-between border-b border-[#edf1f7] px-5 py-5 last:border-b-0" key={item.key}>
                <p className="text-lg font-semibold text-[#4b5b7a]">{item.label}</p>
                <button
                  aria-label={`Toggle ${item.label}`}
                  className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-[#1f2d4d]" : "bg-[#d3dae7]"}`}
                  onClick={() => setSettings((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                  type="button"
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                      enabled ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </article>
      </div>
    </section>
  );
}
