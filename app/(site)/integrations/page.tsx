"use client";

import {
  Building2,
  Camera,
  IdCard,
  LoaderCircle,
  Lock,
  Moon,
  Shield,
  ShoppingBag,
  Store,
  University,
  X,
} from "lucide-react";
import { useState } from "react";

const TOTAL_STEPS = 4;

type AccountType = "checking" | "savings";

function StepPills({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
        const current = index + 1;
        return (
          <span
            key={current}
            className={`h-2.5 rounded-full transition-all ${
              current === step ? "w-8 bg-[#233a69]" : "w-2.5 bg-[#cfd8e8]"
            }`}
          />
        );
      })}
    </div>
  );
}

function StepNode({
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

export default function IntegrationsPage() {
  const [step, setStep] = useState(1);
  const [accountType] = useState<AccountType>("checking");
  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <main className="bg-[#f3f4f6] px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
      <section className="mx-auto w-full max-w-[1280px] rounded-2xl border border-[#dde2ea] bg-white p-8 sm:p-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold text-[#1e2a45] sm:text-5xl">Integrations Guide Demo</h1>
            <p className="mt-4 max-w-[760px] text-lg text-[#5f6b82] sm:text-xl">
              Exact preview of the 4 integration screens. Demo only, no actions are submitted.
            </p>
          </div>
          <span className="rounded-full bg-[#e8edf6] px-4 py-2 text-sm font-semibold text-[#3a4a66]">Step {step} / 4</span>
        </div>

        <div className="mt-6">
          <div className="h-2 overflow-hidden rounded-full bg-[#e5ebf6]">
            <div className="h-full rounded-full bg-[#35d3ce] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <StepPills step={step} />
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7f92b1]">Demo mode</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-[#dbe2ee] bg-[#f2f5fa] p-4 md:p-6">
          {step === 1 ? (
            <div className="relative mx-auto max-w-6xl">
              <button className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dbe2ee] bg-white text-[#91a2bd] shadow-sm" type="button">
                <Moon className="h-4 w-4" />
              </button>

              <div className="mx-auto max-w-3xl pt-16 text-center">
                <h1 className="text-5xl font-semibold tracking-tight text-[#25344d]">Connect your sales channels</h1>
                <p className="mt-4 text-2xl leading-relaxed text-[#8ea0bf]">
                  Select the platforms you want to manage. We&apos;ll sync your inventory and orders automatically.
                </p>
              </div>

              <div className="relative mx-auto mt-10 flex max-w-3xl items-center justify-between">
                <div className="absolute left-0 right-0 top-5 h-px bg-[#dce4f1]" />
                <StepNode icon={<ShoppingBag className="h-4 w-4" />} label="Identity" state="active" />
                <StepNode icon={<University className="h-4 w-4" />} label="Banking" state="upcoming" />
                <StepNode icon={<Store className="h-4 w-4" />} label="Marketplace" state="upcoming" />
              </div>

              <div className="mt-10 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.75fr)_minmax(0,0.75fr)]">
                <article className="relative overflow-hidden rounded-3xl border border-[#dbe2ee] bg-white p-5 shadow-[0_14px_30px_-24px_rgba(17,31,56,0.85)] md:p-6">
                  <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#edf2fa]" />
                  <div className="relative z-10">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f8a100] text-white">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-[#dff4e8] px-3 py-1 text-xs font-semibold text-[#37b87d]">• RECOMMENDED</span>
                    </div>

                    <h2 className="text-5xl font-semibold tracking-tight text-[#232f46]">Amazon Seller Central</h2>
                    <p className="mt-3 max-w-xl text-xl leading-relaxed text-[#7f92b1]">
                      The world&apos;s largest marketplace. Import orders &amp; sync inventory FBA/FBM instantly with our deep integration.
                    </p>

                    <button className="mt-5 inline-flex h-12 items-center gap-2 rounded-xl bg-[#233a69] px-5 text-sm font-semibold text-white" type="button">
                      <Store className="h-4 w-4" />
                      Connect Amazon
                    </button>
                  </div>
                </article>

                <article className="flex h-full flex-col rounded-3xl bg-[#1b2748] p-5 text-white shadow-[0_20px_45px_-34px_rgba(9,20,44,0.9)]">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#1b2748]">
                    <span className="text-sm font-bold">♪</span>
                  </div>
                  <h3 className="text-4xl font-semibold leading-tight">TikTok Shop</h3>
                  <p className="mt-2 text-xl leading-relaxed text-[#a8b8d6]">Sync your social commerce catalog and tap into viral trends.</p>
                </article>

                <article className="flex h-full flex-col rounded-3xl bg-[#1b2748] p-5 text-white shadow-[0_20px_45px_-34px_rgba(9,20,44,0.9)]">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#1b2748]">
                    <span className="text-sm font-bold">e</span>
                  </div>
                  <h3 className="text-4xl font-semibold leading-tight">eBay</h3>
                  {/* Restore active eBay description when eBay goes live again. */}
                  {/* <p className="mt-2 text-xl leading-relaxed text-[#a8b8d6]">Global auction and retail site integration for seamless listing.</p> */}
                  <p className="mt-2 text-xl leading-relaxed text-[#a8b8d6]">Coming Soon.</p>
                </article>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex min-h-[680px] items-center justify-center">
              <article className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#34466d] bg-[#1b2748] text-white shadow-[0_30px_80px_-35px_rgba(17,31,56,0.9)]">
                <header className="flex items-center justify-between border-b border-[#445982] px-5 py-4">
                  <div>
                    <h3 className="text-2xl font-semibold">Connect Amazon Seller Central</h3>
                    <p className="mt-1 text-sm text-[#a8b8d6]">Authorize and sync your store catalog, orders, and payouts.</p>
                  </div>
                  <button className="text-[#a8b8d6]" type="button">
                    <X className="h-5 w-5" />
                  </button>
                </header>

                <div className="space-y-4 px-5 py-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#b9c6df]">Store Name</label>
                    <input className="h-11 w-full rounded-xl border border-[#d6dce9] bg-white px-3 text-sm text-[#243251] outline-none" placeholder="e.g. Main Brand Store" readOnly type="text" />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#b9c6df]">Account ID</label>
                    <input className="h-11 w-full rounded-xl border border-[#d6dce9] bg-white px-3 text-sm text-[#243251] outline-none" placeholder="Enter account identifier" readOnly type="text" />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-[#b9c6df]">API Token</label>
                    <input className="h-11 w-full rounded-xl border border-[#d6dce9] bg-white px-3 text-sm text-[#243251] outline-none" placeholder="Paste access token" readOnly type="password" />
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-[#243861] px-3 py-2">
                    <p className="text-sm text-[#dce6ff]">Enable auto-sync for products and orders</p>
                    <span className="relative h-6 w-12 rounded-full bg-[#35d3ce]">
                      <span className="absolute left-6 top-0.5 h-5 w-5 rounded-full bg-white" />
                    </span>
                  </div>
                </div>

                <footer className="flex items-center justify-end gap-2 border-t border-[#445982] px-5 py-4">
                  <button className="rounded-xl border border-[#8ea3c9] px-4 py-2 text-sm font-semibold text-white" type="button">
                    Cancel
                  </button>
                  <button className="rounded-xl bg-[#35d3ce] px-4 py-2 text-sm font-semibold text-white" type="button">
                    Connect
                  </button>
                </footer>
              </article>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="relative mx-auto max-w-5xl">
              <button className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dbe2ee] bg-white text-[#91a2bd] shadow-sm" type="button">
                <Moon className="h-4 w-4" />
              </button>

              <div className="mx-auto max-w-3xl pt-16 text-center">
                <h1 className="text-5xl font-semibold tracking-tight text-[#25344d]">Connect your Bank Account</h1>
                <p className="mt-4 text-xl leading-relaxed text-[#8ea0bf]">Where should we send your payouts? We need this to process your earnings.</p>
              </div>

              <div className="relative mx-auto mt-10 flex max-w-3xl items-center justify-between">
                <div className="absolute left-0 right-0 top-5 h-px bg-[#dce4f1]" />
                <StepNode icon={<ShoppingBag className="h-4 w-4" />} label="Identity" state="completed" />
                <StepNode icon={<Building2 className="h-4 w-4" />} label="Banking" state="active" />
                <StepNode icon={<Store className="h-4 w-4" />} label="Marketplace" state="upcoming" />
              </div>

              <article className="mt-8 rounded-2xl border border-[#dbe2ee] bg-white p-5 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-6">
                <div className="grid gap-3 md:grid-cols-2">
                  <button className={`rounded-xl border p-4 text-left ${accountType === "checking" ? "border-[#4fa1ff] bg-[#f4faff]" : "border-[#dbe2ee] bg-white"}`} type="button">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-base font-semibold text-[#2d3f5b]">Checking Account</p>
                      <span className="text-[#35d3ce]">◉</span>
                    </div>
                    <p className="text-sm text-[#8ea0bf]">Most common for businesses</p>
                  </button>

                  <button className="rounded-xl border border-[#dbe2ee] bg-white p-4 text-left" type="button">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-base font-semibold text-[#2d3f5b]">Savings Account</p>
                    </div>
                    <p className="text-sm text-[#8ea0bf]">For reserve funds</p>
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <input className="h-11 w-full rounded-xl border border-[#dbe2ee] bg-[#fbfcff] px-3 text-sm text-[#2d3f5b] outline-none" placeholder="Account Holder Name" readOnly type="text" />
                  <input className="h-11 w-full rounded-xl border border-[#dbe2ee] bg-[#fbfcff] px-3 text-sm text-[#2d3f5b] outline-none" placeholder="Bank Name" readOnly type="text" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className="h-11 w-full rounded-xl border border-[#dbe2ee] bg-[#fbfcff] px-3 text-sm text-[#2d3f5b] outline-none" placeholder="Routing Number" readOnly type="text" />
                    <input className="h-11 w-full rounded-xl border border-[#dbe2ee] bg-[#fbfcff] px-3 text-sm text-[#2d3f5b] outline-none" placeholder="Account Number" readOnly type="text" />
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-[#f7f9fd] p-3">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#506385]">
                    <Shield className="h-4 w-4" /> Bank-grade Security
                  </p>
                </div>
              </article>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="relative mx-auto max-w-5xl">
              <button className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dbe2ee] bg-white text-[#91a2bd] shadow-sm" type="button">
                <Moon className="h-4 w-4" />
              </button>

              <div className="mx-auto max-w-3xl pt-16 text-center">
                <h1 className="text-5xl font-semibold tracking-tight text-[#25344d]">Identity Verification</h1>
                <p className="mt-4 text-xl leading-relaxed text-[#8ea0bf]">
                  To ensure the highest security standards, we partner with Amazon for identity verification. Please prepare your government-issued ID.
                </p>
              </div>

              <div className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-10">
                <div className="flex flex-col items-center">
                  <span className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1b2748] text-white">
                    <IdCard className="h-5 w-5" />
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#5d6f8f]">Government ID</p>
                </div>
                <span className="h-px w-12 bg-[#dce4f1]" />
                <div className="flex flex-col items-center">
                  <span className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1b2748] text-white">
                    <Camera className="h-5 w-5" />
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#5d6f8f]">Camera Access</p>
                </div>
              </div>

              <article className="relative mx-auto mt-6 max-w-4xl rounded-2xl border border-[#e0e7f2] bg-[#f8fafd] p-6">
                <span className="absolute right-4 top-3 inline-flex items-center gap-1 text-xs text-[#8ea0bf]">
                  <Lock className="h-3.5 w-3.5" /> Secure Connection
                </span>

                <div className="flex h-[300px] flex-col items-center justify-center">
                  <LoaderCircle className="h-8 w-8 animate-spin text-[#6b7d9b]" />
                  <p className="mt-3 text-sm font-semibold text-[#5d6f8f]">Loading secure verification portal...</p>
                  <p className="text-xs text-[#9aabc6]">Connecting to Amazon Verification Services</p>
                </div>
              </article>

              <div className="mx-auto mt-6 max-w-4xl border-t border-[#e1e8f4] pt-6">
                <div className="flex items-center justify-between">
                  <button className="inline-flex h-11 w-44 items-center justify-center rounded-xl border border-[#c7d3e6] text-sm font-semibold text-[#60708d]" type="button">
                    Cancel
                  </button>
                  <button className="inline-flex h-11 w-64 items-center justify-center rounded-xl bg-[#233a69] text-sm font-semibold text-white" type="button">
                    Start Verification
                  </button>
                </div>
                <p className="mt-4 text-center text-xs text-[#9aabc6]">
                  <Lock className="-mt-0.5 mr-1 inline h-3.5 w-3.5" /> Your video will only be shared with Amazon for verification purposes.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            className="rounded-xl border border-[#c7d3e6] px-5 py-2 text-sm font-semibold text-[#60708d] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={step === 1}
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            type="button"
          >
            Previous
          </button>
          <div className="flex items-center gap-2">
            <button className="rounded-xl border border-[#c7d3e6] px-5 py-2 text-sm font-semibold text-[#60708d]" onClick={() => setStep(1)} type="button">
              Restart Demo
            </button>
            <button
              className="rounded-xl bg-[#233a69] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={step === TOTAL_STEPS}
              onClick={() => setStep((prev) => Math.min(TOTAL_STEPS, prev + 1))}
              type="button"
            >
              Next Step
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
