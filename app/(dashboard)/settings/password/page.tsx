"use client";

import { useState } from "react";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="space-y-4">
        <header className="rounded-xl border border-[#2c3b61] bg-[#1b2748] px-5 py-5 text-white">
          <h1 className="text-2xl font-semibold">Change Password</h1>
          <p className="mt-1 text-sm text-[#a9b8d6]">Manage how you receive alerts and updates.</p>
        </header>

        <article className="rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-6">
          <h2 className="text-5xl font-medium tracking-tight text-[#56627a]">Set new password</h2>
          <p className="mt-2 text-sm text-[#9aa8bf]">Please check your email. We have sent a code to contact @gmail.com.</p>

          <div className="mt-7 space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#9aa7bc]">Current Password</label>
              <input
                className="h-11 w-full rounded-lg border border-[#edf1f7] bg-[#f6f8fc] px-4 text-sm text-[#314157] outline-none"
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="••••••••••"
                type="password"
                value={currentPassword}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#9aa7bc]">New Password</label>
              <input
                className="h-11 w-full rounded-lg border border-[#edf1f7] bg-[#f6f8fc] px-4 text-sm text-[#314157] outline-none"
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="••••••••••"
                type="password"
                value={newPassword}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#9aa7bc]">Confirm New Password</label>
              <input
                className="h-11 w-full rounded-lg border border-[#edf1f7] bg-[#f6f8fc] px-4 text-sm text-[#314157] outline-none"
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="••••••••••"
                type="password"
                value={confirmPassword}
              />
            </div>
          </div>

          <button className="mt-7 h-11 w-full rounded-xl bg-[#233a69] text-sm font-semibold text-white" type="button">
            Verify
          </button>
        </article>
      </div>
    </section>
  );
}
