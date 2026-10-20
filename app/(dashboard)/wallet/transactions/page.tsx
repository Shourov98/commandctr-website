"use client";

import { Clock3, Loader2, RefreshCcw, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

import { ApiClientError } from "@/lib/auth";
import { integrationApi } from "@/lib/integrations";
import { walletApi, type WalletActivityItem } from "@/lib/wallet";

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

function statusTone(item: WalletActivityItem) {
  if (item.type === "ORDER_PAID") {
    return "bg-[#ddf7f0] text-[#56cbc2]";
  }

  if (item.type === "ORDER_PENDING") {
    return "bg-[#fff2d6] text-[#f4a632]";
  }

  if (item.type === "ORDER_REFUNDED") {
    return "bg-[#dce6ff] text-[#6a90ff]";
  }

  return "bg-[#edf2f8] text-[#7e90af]";
}

export default function WalletTransactionsPage() {
  const [items, setItems] = useState<WalletActivityItem[]>([]);
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadActivity = async () => {
    const overview = await walletApi.getOverview();
    setItems(overview.recentActivity);
    setNotice(overview.notice);
  };

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void loadActivity()
        .catch((error) => {
          if (!active) {
            return;
          }

          setErrorMessage(error instanceof ApiClientError ? error.message : "Could not load transaction history.");
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setErrorMessage("");

    try {
      await integrationApi.importShopifyOrders();
      await loadActivity();
    } catch (error) {
      setErrorMessage(error instanceof ApiClientError ? error.message : "Could not refresh Shopify orders.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="space-y-4">
        <header className="rounded-xl border border-[#2c3b61] bg-[#1b2748] px-5 py-5 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Transactions</h1>
              <p className="mt-1 text-sm text-[#a9b8d6]">Transaction history is based on imported Shopify orders for this MVP.</p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-[#35d3ce] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={isRefreshing}
              onClick={() => void handleRefresh()}
              type="button"
            >
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              {isRefreshing ? "Refreshing..." : "Refresh Shopify Orders"}
            </button>
          </div>
        </header>

        <article className="rounded-2xl border border-[#dbe2ee] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-6">
          {notice ? <p className="mb-5 text-sm text-[#7e90af]">{notice}</p> : null}

          {errorMessage ? <p className="mb-5 text-sm text-[#b54a67]">{errorMessage}</p> : null}

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[#7e90af]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading order activity...
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-[#7e90af]">No imported Shopify order activity is available yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div className="flex items-center justify-between rounded-2xl border border-[#e4ebf6] bg-white px-4 py-4" key={item.id}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f2f5fb] text-[#94a6c3]">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-semibold text-[#2e3f5d]">{item.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(item)}`}>
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-[#8ea0bf]">{item.subtitle} • Shopify order import</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-[#2f405d]">{formatCurrency(item.amount, item.currency)}</p>
                    <p className="text-xs text-[#9aabc6]">{formatDate(item.occurredAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <div className="text-center text-xs text-[#9badc8]">
          <p className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" /> Synced from imported Shopify orders
          </p>
        </div>
      </div>
    </section>
  );
}
