"use client";

import { CalendarDays, Filter, Loader2, Search, ShoppingBag, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { ApiClientError } from "@/lib/auth";
import { walletApi, type WalletActivityItem, type WalletOverview } from "@/lib/wallet";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Imported order";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Imported order";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const tone = status.includes("pending")
    ? "bg-[#fff2d6] text-[#f4a632]"
    : status.includes("refunded")
      ? "bg-[#dce6ff] text-[#6a90ff]"
      : "bg-[#ddf7f0] text-[#56cbc2]";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status.toUpperCase()}</span>;
}

function ActivityRow({ item }: { item: WalletActivityItem }) {
  return (
    <tr className="border-t border-[#e9eef7] text-sm text-[#44526d]">
      <td className="px-4 py-4">
        <span className="inline-block h-3.5 w-3.5 rounded-full border border-[#95a3bd]" />
      </td>
      <td className="px-4 py-4">
        <p className="font-semibold text-[#2c3a57]">{item.title}</p>
        <p className="text-xs text-[#8ea0bf]">{item.subtitle}</p>
      </td>
      <td className="px-4 py-4 text-[#7e8fae]">{formatDate(item.occurredAt)}</td>
      <td className="px-4 py-4">Imported Shopify Order</td>
      <td className="px-4 py-4 font-semibold text-[#4a5b78]">{formatCurrency(item.amount, item.currency)}</td>
      <td className="px-4 py-4">
        <StatusBadge status={item.status} />
      </td>
      <td className="px-4 py-4 text-center text-xs text-[#7e8fae]">Read Only</td>
    </tr>
  );
}

export default function WalletPlatformDetailsPage() {
  const [overview, setOverview] = useState<WalletOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void walletApi
        .getOverview()
        .then((result) => {
          if (!active) {
            return;
          }

          setOverview(result);
        })
        .catch((error) => {
          if (!active) {
            return;
          }

          setErrorMessage(error instanceof ApiClientError ? error.message : "Could not load platform wallet details.");
        })
        .finally(() => {
          if (active) {
            setIsLoading(false);
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const shopifyBalance = overview?.platformBalances.find((item) => item.platform === "shopify");
  const recentItems = overview?.recentActivity ?? [];

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="space-y-4">
        <header className="rounded-xl border border-[#2c3b61] bg-[#1b2748] px-5 py-5 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Global Wallet - Platform Details</h1>
              <p className="mt-1 text-sm text-[#a9b8d6]">
                Shopify revenue overview <span className="ml-1 rounded-full border border-[#1ed9d2] px-2 py-0.5 text-xs text-[#1ed9d2]">Read Only</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d6ddea] bg-[#f7f9fd] px-5 text-sm font-semibold text-[#4f607c]" type="button">
                <CalendarDays className="h-4 w-4" />
                Imported Orders
              </button>
              <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#35d3ce] px-5 text-sm font-semibold text-white" disabled type="button">
                <Wallet className="h-4 w-4" />
                Payouts Coming Later
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(260px,1fr)]">
          <article className="rounded-2xl bg-gradient-to-r from-[#1a2748] via-[#1d2d56] to-[#1f356a] p-5 text-white">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#c6d4ed]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading Shopify revenue...
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8ea4cb]">Shopify Revenue</p>
                <p className="mt-2 text-6xl font-bold tracking-tight">
                  {formatCurrency(shopifyBalance?.amount ?? 0, overview?.currency ?? "USD")}
                </p>
                <div className="mt-4 grid gap-3 border-t border-[#2e5b81] pt-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-[#8ea4cb]">Paid Order Revenue</p>
                    <p className="mt-1 text-4xl font-semibold">{formatCurrency(overview?.paidRevenue ?? 0, overview?.currency ?? "USD")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#8ea4cb]">Pending Order Revenue</p>
                    <p className="mt-1 text-4xl font-semibold">{formatCurrency(overview?.pendingRevenue ?? 0, overview?.currency ?? "USD")}</p>
                  </div>
                </div>
              </>
            )}
          </article>

          <article className="rounded-2xl bg-[#1a2748] p-5 text-white">
            <p className="text-sm text-[#a9b8d6]">MVP Wallet Notice</p>
            <div className="mt-3">
              <p className="text-2xl font-semibold">Read-only revenue view</p>
              <p className="mt-2 text-sm text-[#9fb1d0]">
                {overview?.notice ?? "Wallet totals are based on imported Shopify orders."}
              </p>
            </div>
            <div className="mt-5 rounded-xl bg-[#152242] px-4 py-3 text-sm text-[#c6d4ed]">
              Amazon, eBay, Etsy, and TikTok wallet details are coming later.
            </div>
          </article>
        </div>

        <article className="rounded-2xl border border-[#dbe2ee] bg-white shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
          <div className="flex flex-col gap-3 border-b border-[#e5ebf5] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
            <h2 className="text-2xl font-semibold text-[#1f2c44]">Recent Transactions</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#96a3bc]" />
                <input
                  className="h-10 w-64 rounded-xl border border-[#d6dce9] bg-white py-2 pl-10 pr-3 text-sm text-[#243251] outline-none placeholder:text-[#8f9bb1]"
                  placeholder="Search coming soon..."
                  readOnly
                  type="text"
                />
              </div>
              <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#465574]" type="button">
                <CalendarDays className="h-4 w-4" />
                Latest Imports
              </button>
              <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-4 text-sm font-semibold text-[#465574]" type="button">
                <Filter className="h-4 w-4" />
                Read Only
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-[#233a69] text-xs font-semibold uppercase tracking-wide text-[#d8e4fb]">
                <tr>
                  <th className="w-12 px-4 py-4">○</th>
                  <th className="px-4 py-4">Description</th>
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Type</th>
                  <th className="px-4 py-4">Amount</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-[#7e8fae]" colSpan={7}>
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading Shopify activity...
                      </div>
                    </td>
                  </tr>
                ) : recentItems.length ? (
                  recentItems.map((item) => <ActivityRow item={item} key={item.id} />)
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-[#7e8fae]" colSpan={7}>
                      {errorMessage || "No imported Shopify activity is available yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#e5ebf5] px-5 py-3 text-sm text-[#6f809f]">
            <p>{recentItems.length ? `Showing ${recentItems.length} recent imported Shopify activities` : "Waiting for imported Shopify orders"}</p>
            <div className="flex items-center gap-2 text-xs">
              <ShoppingBag className="h-4 w-4" />
              Read-only Shopify revenue feed
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
