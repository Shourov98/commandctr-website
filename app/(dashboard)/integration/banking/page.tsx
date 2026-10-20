"use client";

import { Building2, Moon, Shield, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type AccountType = "checking" | "savings";

function Step({
  icon,
  label,
  state,
}: {
  icon: React.ReactNode;
  label: string;
  state: "completed" | "active" | "upcoming";
}) {
  const style =
    state === "active"
      ? "border-[#3d7cff] bg-[#3d7cff] text-white"
      : state === "completed"
        ? "border-[#3d7cff] bg-[#dbe8ff] text-[#3d7cff]"
        : "border-[#d4ddeb] bg-white text-[#8ea0bf]";

  const text = state === "upcoming" ? "text-[#8ea0bf]" : "text-[#3d7cff]";

  return (
    <div className="relative z-10 flex w-1/3 flex-col items-center">
      <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full border ${style}`}>{icon}</div>
      <p className={`text-sm font-semibold ${text}`}>{label}</p>
    </div>
  );
}

export default function IntegrationBankingPage() {
  const [accountType, setAccountType] = useState<AccountType>("checking");

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="relative mx-auto max-w-5xl">
        <button className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dbe2ee] bg-white text-[#91a2bd] shadow-sm" type="button">
          <Moon className="h-4 w-4" />
        </button>

        <div className="mx-auto max-w-3xl pt-16 text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-[#25344d]">Connect your Bank Account</h1>
          <p className="mt-4 text-xl leading-relaxed text-[#8ea0bf]">Where should we send your payouts? We need this to process your earnings.</p>
        </div>

        <div className="relative mx-auto mt-10 flex max-w-3xl items-center justify-between" data-tour="banking-progress">
          <div className="absolute left-0 right-0 top-5 h-px bg-[#dce4f1]" />
          <Step icon={<ShoppingBag className="h-4 w-4" />} label="Identity" state="completed" />
          <Step icon={<Building2 className="h-4 w-4" />} label="Banking" state="active" />
          <Step icon={<Store className="h-4 w-4" />} label="Marketplace" state="upcoming" />
        </div>

        <article className="mt-8 rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              className={`rounded-xl border p-4 text-left ${
                accountType === "checking" ? "border-[#4fa1ff] bg-[#f4faff]" : "border-[#dbe2ee] bg-white"
              }`}
              onClick={() => setAccountType("checking")}
              type="button"
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="text-base font-semibold text-[#2d3f5b]">Checking Account</p>
                {accountType === "checking" ? <span className="text-[#35d3ce]">◉</span> : null}
              </div>
              <p className="text-sm text-[#8ea0bf]">Most common for businesses</p>
            </button>

            <button
              className={`rounded-xl border p-4 text-left ${
                accountType === "savings" ? "border-[#4fa1ff] bg-[#f4faff]" : "border-[#dbe2ee] bg-white"
              }`}
              onClick={() => setAccountType("savings")}
              type="button"
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="text-base font-semibold text-[#2d3f5b]">Savings Account</p>
                {accountType === "savings" ? <span className="text-[#35d3ce]">◉</span> : null}
              </div>
              <p className="text-sm text-[#8ea0bf]">For reserve funds</p>
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#6c7f9f]">Account Holder Name</label>
              <input className="h-11 w-full rounded-xl border border-[#dbe2ee] bg-[#fbfcff] px-3 text-sm text-[#2d3f5b] outline-none" placeholder="e.g. John Doe" type="text" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#6c7f9f]">Bank Name</label>
              <input className="h-11 w-full rounded-xl border border-[#dbe2ee] bg-[#fbfcff] px-3 text-sm text-[#2d3f5b] outline-none" placeholder="e.g. Chase, Bank of America" type="text" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#6c7f9f]">Routing Number</label>
                <input className="h-11 w-full rounded-xl border border-[#dbe2ee] bg-[#fbfcff] px-3 text-sm text-[#2d3f5b] outline-none" placeholder="9 digits" type="text" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#6c7f9f]">Account Number</label>
                <input className="h-11 w-full rounded-xl border border-[#dbe2ee] bg-[#fbfcff] px-3 text-sm text-[#2d3f5b] outline-none" placeholder="Your account number" type="text" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[#6c7f9f]">Confirm Account Number</label>
              <input className="h-11 w-full rounded-xl border border-[#dbe2ee] bg-[#fbfcff] px-3 text-sm text-[#2d3f5b] outline-none" placeholder="Re-enter account number" type="text" />
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-[#f7f9fd] p-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#506385]">
              <Shield className="h-4 w-4" /> Bank-grade Security
            </p>
            <p className="mt-1 text-xs text-[#8ea0bf]">
              Your banking data is encrypted using AES-256 standards and stored securely. We never share your details without permission.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Link className="inline-flex h-11 items-center justify-center rounded-xl border border-[#c7d3e6] px-8 text-sm font-semibold text-[#60708d]" href="/integration">
              Back
            </Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-xl bg-[#233a69] px-10 text-sm font-semibold text-white" href="/integration/identity-verification">
              Continue
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
