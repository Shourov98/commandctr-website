"use client";

import { useEffect, useMemo } from "react";
import DashboardHeroGraphic from "../components/DashboardHeroGraphic";
import { useWalletPageStore } from "@/lib/stores/wallet-page-store";

const transactionsFallback = [
  { platform: "TikTok", order: "#ORD-2026-5432", description: "Sale - Blue-Shirt", amount: "+$25.99" },
  // eBay is intentionally paused for the current release. Restore this row when eBay goes live again.
  // { platform: "eBay", order: "#ORD-2026-5432", description: "Sale - Blue-Shirt", amount: "+$25.99" },
  { platform: "TikTok", order: "#ORD-2026-5432", description: "Sale - Blue-Shirt", amount: "+$25.99" },
  { platform: "Amazon", order: "#ORD-2026-5435", description: "Sale - Headphones", amount: "+$59.00" },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function getPlatformFromTitle(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("shopify")) return "Shopify";
  if (lower.includes("amazon")) return "Amazon";
  if (lower.includes("ebay")) return "eBay";
  if (lower.includes("tiktok")) return "TikTok";
  if (lower.includes("etsy")) return "Etsy";
  return "Shopify";
}

export default function DashboardPage() {
  const overview = useWalletPageStore((state) => state.overview);
  const loadWallet = useWalletPageStore((state) => state.loadWallet);
  const hasLoadedOnce = useWalletPageStore((state) => state.hasLoadedOnce);
  const shouldRefresh = useWalletPageStore((state) => state.shouldRefresh);

  useEffect(() => {
    if (!hasLoadedOnce || !overview) {
      void loadWallet();
      return;
    }

    if (shouldRefresh()) {
      void loadWallet();
    }
  }, [hasLoadedOnce, loadWallet, overview, shouldRefresh]);

  const shopifyBalance = useMemo(() => overview?.platformBalances?.find((b) => b.platform === "shopify"), [overview]);
  const amazonBalance = useMemo(() => overview?.platformBalances?.find((b) => b.platform === "amazon"), [overview]);
  // eBay wallet data is available in the backend, but the channel is marked Coming Soon in this release.
  // const ebayBalance = useMemo(() => overview?.platformBalances?.find((b) => b.platform === "ebay"), [overview]);
  const tiktokBalance = useMemo(() => overview?.platformBalances?.find((b) => b.platform === "tiktok"), [overview]);
  // Etsy wallet data is available in the backend, but the channel is marked Coming Soon in this release.
  // const etsyBalance = useMemo(() => overview?.platformBalances?.find((b) => b.platform === "etsy"), [overview]);

  const displayTotal = overview ? formatCurrency(overview.paidRevenue) : "$12,450.80";

  const walletCards = [
    {
      platform: "SHOPIFY",
      amount: overview ? formatCurrency(shopifyBalance?.amount ?? 0) : "$4,850.00",
      tag: shopifyBalance?.status || "Synced",
      tone: "from-[#13271d] via-[#1b3d2b] to-[#2d6144]",
    },
    {
      platform: "TIKTOK SHOP",
      amount: overview ? formatCurrency(tiktokBalance?.amount ?? 0) : "$3,520.15",
      tag: tiktokBalance?.status || "Synced",
      tone: "from-[#101d3f] via-[#1b2a53] to-[#223a79]",
    },
    {
      platform: "AMAZON",
      amount: overview ? formatCurrency(amazonBalance?.amount ?? 0) : "$6,830.22",
      tag: amazonBalance?.status || "Synced",
      tone: "from-[#1b2340] via-[#2a355e] to-[#4c3d4f]",
    },
    {
      platform: "EBAY",
      // Restore live amount/tag when eBay goes live:
      // amount: overview ? formatCurrency(ebayBalance?.amount ?? 0) : "$2,100.43",
      // tag: ebayBalance?.status || "Synced",
      amount: "$0.00",
      tag: "Coming Soon",
      tone: "from-[#1a2547] via-[#22335a] to-[#1e5a54]",
    },
    {
      platform: "ETSY",
      // Restore live amount/tag when Etsy goes live:
      // amount: overview ? formatCurrency(etsyBalance?.amount ?? 0) : "$1,850.50",
      // tag: etsyBalance?.status || "Synced",
      amount: "$0.00",
      tag: "Coming Soon",
      tone: "from-[#2b1610] via-[#3d2117] to-[#61382d]",
    },
  ];

  const displayTransactions = useMemo(() => {
    if (!overview || overview.recentActivity.length === 0) {
      return transactionsFallback;
    }
    const visibleActivity = overview.recentActivity.filter((item) => {
      const platform = getPlatformFromTitle(item.title);
      // Restore eBay/Etsy activity rows when those marketplaces go live again.
      return platform !== "eBay" && platform !== "Etsy";
    });

    return visibleActivity.map((item) => ({
      platform: getPlatformFromTitle(item.title),
      order: item.subtitle,
      description: item.title,
      amount: `+$${item.amount.toFixed(2)}`,
    }));
  }, [overview]);

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="rounded-2xl border border-[#d5deec] bg-white p-4 shadow-[0_20px_50px_-40px_rgba(22,35,70,0.6)] md:p-6">
        <div className="overflow-hidden rounded-2xl border border-[#183054] bg-[#071228]">
          <DashboardHeroGraphic />
        </div>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#1a2642]">{displayTotal}</h1>
            <p className="mt-1 text-sm font-medium text-[#19c8d6]">Available for Withdrawal</p>
          </div>
          <button
            className="w-full rounded-xl bg-[#1f2b49] px-6 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-[#16203a] md:w-auto"
            type="button"
          >
            WITHDRAW ALL FUNDS
          </button>
        </div>

        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {walletCards.map((card) => (
            <article
              className={`rounded-2xl bg-gradient-to-br p-4 text-white shadow-[0_20px_40px_-35px_rgba(14,28,65,0.9)] ${card.tone}`}
              key={card.platform}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#d5e6ff]">{card.platform}</span>
                <span className="rounded-full bg-[#0fbecc33] px-2 py-1 text-[10px] font-semibold text-[#6df1ff]">
                  {card.tag}
                </span>
              </div>
              <p className="mt-7 text-3xl font-bold tracking-tight">{card.amount}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-[#e1e6f0]">
          <table className="w-full text-left">
            <thead className="bg-[#f7f9fc]">
              <tr className="text-xs font-semibold uppercase tracking-wide text-[#8a98b5]">
                <th className="px-4 py-3 md:px-6">Platform</th>
                <th className="px-4 py-3 md:px-6">Order ID</th>
                <th className="px-4 py-3 md:px-6">Description</th>
                <th className="px-4 py-3 text-right md:px-6">Amount</th>
              </tr>
            </thead>
            <tbody>
              {displayTransactions.map((row, index) => (
                <tr className="border-t border-[#edf1f7] text-sm text-[#44526d]" key={`${row.order}-${index}`}>
                  <td className="px-4 py-4 font-medium text-[#243251] md:px-6">{row.platform}</td>
                  <td className="px-4 py-4 font-semibold text-[#657391] md:px-6">{row.order}</td>
                  <td className="px-4 py-4 md:px-6">{row.description}</td>
                  <td className="px-4 py-4 text-right font-semibold text-[#243251] md:px-6">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
