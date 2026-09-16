"use client";

import {
  Banknote,
  Building2,
  CheckCircle2,
  CircleAlert,
  Loader2,
  RefreshCcw,
  Repeat2,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";

import { type WalletActivityItem, type WalletPlatformBalance } from "@/lib/wallet";
import { useWalletPageStore } from "@/lib/stores/wallet-page-store";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatRelativeDate(value: string | null) {
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
    hour: "numeric",
    minute: "2-digit",
  });
}

function getActivityBadge(item: WalletActivityItem) {
  if (item.type === "ORDER_PAID") {
    return { label: "PAID", tone: "text-[#58a6ff]", icon: <CheckCircle2 className="h-4 w-4 text-[#4ddf9a]" /> };
  }

  if (item.type === "ORDER_PENDING") {
    return { label: "PENDING", tone: "text-[#f4a632]", icon: <Repeat2 className="h-4 w-4 text-[#f4a632]" /> };
  }

  if (item.type === "ORDER_REFUNDED") {
    return { label: "REFUNDED", tone: "text-[#f97373]", icon: <CircleAlert className="h-4 w-4 text-[#f97373]" /> };
  }

  return { label: "CREATED", tone: "text-[#96a7c2]", icon: <ShoppingBag className="h-4 w-4 text-[#5ea5ff]" /> };
}

function PlatformCard({ item }: { item: WalletPlatformBalance }) {
  const isPausedMarketplace = item.platform === "ebay" || item.platform === "etsy";
  // Restore live marketplace values when eBay/Etsy go live:
  // const badgeColor = item.isConnected ? "bg-[#0d4f3d] text-[#5cf8c9]" : "bg-[#30415f] text-[#c9d5ef]";
  // const displayStatus = item.status;
  // const displayAmount = item.amount;
  const badgeColor = isPausedMarketplace ? "bg-[#30415f] text-[#c9d5ef]" : item.isConnected ? "bg-[#0d4f3d] text-[#5cf8c9]" : "bg-[#30415f] text-[#c9d5ef]";
  const displayStatus = isPausedMarketplace ? "Coming Soon" : item.status;
  const displayAmount = isPausedMarketplace ? 0 : item.amount;

  return (
    <article className="rounded-2xl bg-[#1a2748] p-4 text-white">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#1a2748]">●</div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor}`}>{displayStatus}</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8ea4cb]">{item.label}</p>
      <p className="mt-1 text-3xl font-semibold">{formatCurrency(displayAmount, item.currency)}</p>
    </article>
  );
}

function FeedItem({ item }: { item: WalletActivityItem }) {
  const badge = getActivityBadge(item);
  const isNegative = item.type === "ORDER_REFUNDED" && item.amount > 0;
  const amount = isNegative ? -Math.abs(item.amount) : item.amount;

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5">{badge.icon}</span>
        <div>
          <p className="text-sm font-semibold text-[#334863]">{item.title}</p>
          <p className="text-xs text-[#8ea0bf]">{item.subtitle}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${item.type === "ORDER_PAID" ? "text-[#4ddf9a]" : "text-[#55698e]"}`}>
          {formatCurrency(amount, item.currency)}
        </p>
        <p className="text-[11px] text-[#9cadc8]">{formatRelativeDate(item.occurredAt)}</p>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const overview = useWalletPageStore((state) => state.overview);
  const shopifyConnected = useWalletPageStore((state) => state.shopifyConnected);
  const isLoading = useWalletPageStore((state) => state.isLoading);
  const isRefreshing = useWalletPageStore((state) => state.isRefreshing);
  const hasLoadedOnce = useWalletPageStore((state) => state.hasLoadedOnce);
  const errorMessage = useWalletPageStore((state) => state.errorMessage);
  const shouldRefresh = useWalletPageStore((state) => state.shouldRefresh);
  const loadWallet = useWalletPageStore((state) => state.loadWallet);
  const refreshOrders = useWalletPageStore((state) => state.refreshOrders);

  useEffect(() => {
    if (!hasLoadedOnce || !overview) {
      void loadWallet();
      return;
    }

    if (shouldRefresh()) {
      void loadWallet();
    }
  }, [hasLoadedOnce, loadWallet, overview, shouldRefresh]);

  const timelineItems = useMemo(() => overview?.recentActivity.slice(0, 3) ?? [], [overview]);
  const feedItems = useMemo(() => overview?.recentActivity.slice(0, 5) ?? [], [overview]);
  const hasOrders = (overview?.orderCount ?? 0) > 0;
  const showInitialLoading = isLoading && !overview;
  const showRefreshing = isLoading && !!overview;

  const ctaCopy = shopifyConnected
    ? hasOrders
      ? "Shopify revenue is connected. Amazon, eBay, Etsy, and TikTok are coming soon."
      : "Import Shopify orders to populate wallet revenue."
    : "Connect Shopify to start importing revenue from your orders.";

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(280px,1fr)]">
        <div className="space-y-4">
          <article className="rounded-2xl bg-gradient-to-r from-[#1a2748] via-[#1d2d56] to-[#1f356a] p-5 text-white shadow-[0_18px_45px_-30px_rgba(12,26,58,0.95)] md:p-6">
            {showInitialLoading ? (
              <div className="flex items-center gap-3 text-sm text-[#c8d4ec]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading wallet overview...
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  {showRefreshing ? (
                    <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#c8d4ec]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Refreshing wallet data...
                    </div>
                  ) : null}
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8ea4cb]">Total Global Balance</p>
                  <p className="mt-2 text-6xl font-bold tracking-tight">
                    {formatCurrency(overview?.paidRevenue ?? 0, overview?.currency ?? "USD")}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[#0f5138] px-3 py-1 text-sm font-semibold text-[#5af7ac]">
                      {overview?.paidOrderCount ?? 0} paid orders
                    </span>
                    <span className="text-sm text-[#8ea4cb]">
                      {overview?.pendingOrderCount ?? 0} pending orders
                    </span>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm text-[#b2c1dd]">
                    {overview?.notice ?? "Wallet totals are based on imported Shopify orders."}
                  </p>
                </div>
                <Building2 className="h-12 w-12 shrink-0 text-[#3f557e]" />
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-[#dbe2ee] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-5">
            <h2 className="text-2xl font-semibold text-[#1f2c44]">Wallet Balances</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              {(overview?.platformBalances ?? []).map((item) => (
                <PlatformCard item={item} key={item.platform} />
              ))}
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-[#dbe2ee] bg-white shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
            <div className="flex items-center justify-between border-b border-[#1fd7d4] bg-[#1a2748] px-4 py-3 text-white md:px-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide">Recent Activity</h3>
              <Link className="text-xs font-semibold text-[#1fd7d4]" href="/wallet/platform-details">
                View All
              </Link>
            </div>

            <div className="px-4 py-4 md:px-5">
              {!timelineItems.length ? (
                <p className="text-sm text-[#5f7395]">No imported Shopify order activity yet.</p>
              ) : (
                <div className="relative pl-8">
                  <span className="absolute left-3 top-2 h-[86%] w-px bg-[#cfd9e9]" />
                  {timelineItems.map((item, index) => {
                    const badge = getActivityBadge(item);

                    return (
                      <div
                        className={`relative flex items-center justify-between ${index < timelineItems.length - 1 ? "mb-7" : ""}`}
                        key={item.id}
                      >
                        <span className={`absolute -left-[17px] inline-flex h-4 w-4 rounded-full ${index === 0 ? "border-4 border-[#06d9e7] bg-[#09142c]" : "bg-[#09142c]"}`} />
                        <p className="text-sm font-medium text-[#5f7395]">{item.title}</p>
                        <div className="flex items-center gap-3 text-xs font-semibold">
                          <span className={badge.tone}>{badge.label}</span>
                          <span className="text-[#9daecc]">{formatCurrency(item.amount, item.currency)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </article>
        </div>

        <aside className="space-y-4">
          <article className="rounded-2xl border border-[#dbe2ee] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-5">
            <h3 className="text-lg font-semibold uppercase tracking-wide text-[#1f2c44]">Recent Activity</h3>

            <div className="mt-4 space-y-4">
              {!feedItems.length ? (
                <p className="text-sm text-[#8ea0bf]">Recent activity will appear here after Shopify orders are imported.</p>
              ) : (
                feedItems.map((item) => <FeedItem item={item} key={item.id} />)
              )}
            </div>

            <Link className="mt-6 block w-full rounded-xl bg-[#1a2748] py-3 text-center text-sm font-semibold text-[#2de0e3]" href="/wallet/transactions">
              VIEW FULL HISTORY
            </Link>
          </article>

          <article className="relative overflow-hidden rounded-2xl bg-[#35d3ce] p-5 text-[#0f3d57] shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
            <h3 className="text-3xl font-semibold text-white">Wallet Revenue</h3>
            <p className="mt-2 text-sm font-medium text-[#0f4f68]">{ctaCopy}</p>
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1a2748] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={isRefreshing}
              onClick={() => void refreshOrders()}
              type="button"
            >
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              {isRefreshing ? "Refreshing..." : "Refresh Shopify Orders"}
            </button>
            <Banknote className="pointer-events-none absolute -bottom-3 right-2 h-20 w-20 text-[#67e8dd]/40" />
          </article>

          {errorMessage ? (
            <article className="rounded-2xl border border-[#f2c5cf] bg-white p-4 text-sm text-[#9e3d57] shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
              {errorMessage}
            </article>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
