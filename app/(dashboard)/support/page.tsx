"use client";

import { Eye, Filter, RefreshCcw, Search, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  emptyDisputeStats,
  useSupportPageStore,
} from "@/lib/stores/support-page-store";
import { type DisputeRecord, type DisputeStatus } from "@/lib/disputes";

const statusLabels: Record<DisputeStatus, string> = {
  OPEN: "Action Required",
  SUBMITTED: "Under Review",
  WON: "Won",
  LOST: "Lost",
  UNKNOWN: "Unknown",
};

const statusBadge = (status: DisputeStatus) => {
  if (status === "OPEN") {
    return <span className="rounded-full bg-[#fff4df] px-3 py-1 text-xs font-semibold text-[#f3b24f]">Action Required</span>;
  }

  if (status === "SUBMITTED") {
    return <span className="rounded-full bg-[#d9ecff] px-3 py-1 text-xs font-semibold text-[#55a8ff]">Under Review</span>;
  }

  if (status === "WON") {
    return <span className="rounded-full bg-[#dff8f1] px-3 py-1 text-xs font-semibold text-[#5ed2c5]">Won</span>;
  }

  if (status === "LOST") {
    return <span className="rounded-full bg-[#ffe4ef] px-3 py-1 text-xs font-semibold text-[#ef4a89]">Lost</span>;
  }

  return <span className="rounded-full bg-[#edf1f7] px-3 py-1 text-xs font-semibold text-[#60708d]">Unknown</span>;
};

const platformBadge = () => (
  <span className="inline-flex h-8 min-w-[98px] items-center justify-center rounded-full bg-[#6fbe44] px-3 text-xs font-bold uppercase tracking-wide text-white">
    Shopify
  </span>
);

const avatar = (name: string, email: string) => {
  const base = name || email || "Shopify Customer";
  const initials = base
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#eceff5] text-[11px] font-bold text-[#4e607f]">
      {initials || "SC"}
    </span>
  );
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatCustomerLabel = (item: DisputeRecord) => {
  if (item.customerName?.trim()) {
    return item.customerName;
  }

  if (item.customerEmail?.trim()) {
    return item.customerEmail;
  }

  return "Shopify Customer";
};

const formatAmount = (item: DisputeRecord) => {
  if (!item.amount) {
    return "--";
  }

  return item.currency ? `${item.amount} ${item.currency}` : item.amount;
};

export default function SupportPage() {
  const hasInitializedRef = useRef(false);
  const query = useSupportPageStore((state) => state.query);
  const statusFilter = useSupportPageStore((state) => state.statusFilter);
  const data = useSupportPageStore((state) => state.data);
  const isLoading = useSupportPageStore((state) => state.isLoading);
  const isRefreshing = useSupportPageStore((state) => state.isRefreshing);
  const hasLoadedOnce = useSupportPageStore((state) => state.hasLoadedOnce);
  const error = useSupportPageStore((state) => state.error);
  const notice = useSupportPageStore((state) => state.notice);
  const selectedDispute = useSupportPageStore((state) => state.selectedDispute);
  const isDetailsLoading = useSupportPageStore((state) => state.isDetailsLoading);
  const detailError = useSupportPageStore((state) => state.detailError);
  const shouldRefresh = useSupportPageStore((state) => state.shouldRefresh);
  const setQuery = useSupportPageStore((state) => state.setQuery);
  const setStatusFilter = useSupportPageStore((state) => state.setStatusFilter);
  const closeDetails = useSupportPageStore((state) => state.closeDetails);
  const loadDisputes = useSupportPageStore((state) => state.loadDisputes);
  const refreshDisputes = useSupportPageStore((state) => state.refreshDisputes);
  const openDetails = useSupportPageStore((state) => state.openDetails);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;

      if (!hasLoadedOnce || data.items.length === 0) {
        void loadDisputes();
        return;
      }

      if (shouldRefresh()) {
        void loadDisputes();
      }

      return;
    }

    const timer = window.setTimeout(() => {
      void loadDisputes();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [data.items.length, hasLoadedOnce, loadDisputes, query, shouldRefresh, statusFilter]);

  const stats = data.stats ?? emptyDisputeStats;
  const items = data.items ?? [];
  const showInitialLoading = isLoading && items.length === 0;
  const showRefreshing = isLoading && items.length > 0;

  return (
    <>
      <section className="px-4 py-5 md:px-8 md:py-8">
        <div className="space-y-4">
          <header className="rounded-xl border border-[#2c3b61] bg-[#1b2748] px-5 py-5 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">Disputes & Cases</h1>
                <p className="mt-1 text-sm text-[#a9b8d6]">Review real Shopify disputes and chargeback inquiries in one place.</p>
              </div>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#35d3ce] px-4 text-sm font-semibold text-[#143b52] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isRefreshing}
                onClick={() => {
                  console.info("[SupportPage] Refresh Shopify Disputes button clicked");
                  void refreshDisputes();
                }}
                type="button"
              >
                <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh Shopify Disputes
              </button>
            </div>
          </header>

          {notice ? (
            <div className="rounded-xl border border-[#cfe4f8] bg-[#edf6ff] px-4 py-3 text-sm font-medium text-[#4f6d95]">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-[#ffdbe7] bg-[#fff4f8] px-4 py-3 text-sm font-medium text-[#bc5a82]">
              {error}
            </div>
          ) : null}

          <article className="rounded-xl border border-[#dbe2ee] bg-[#f4f6fa] p-4 md:p-5">
            <h2 className="text-[28px] font-semibold text-[#1f2f4c]">Shopify Dispute Overview</h2>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-[#1b2748] p-4 text-white shadow-[0_16px_30px_-26px_rgba(8,16,34,0.95)]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ff3e92]/20 text-[#ff3e92]">
                    <TriangleAlert className="h-4 w-4" />
                  </span>
                  <p className="text-xs font-semibold text-[#f15ca3]">Open disputes</p>
                </div>
                <p className="text-[13px] text-[#c7d4eb]">Action Required</p>
                <p className="mt-0.5 text-[40px] font-semibold leading-none">{stats.actionRequired} Cases</p>
              </div>

              <div className="rounded-2xl bg-[#1b2748] p-4 text-white shadow-[0_16px_30px_-26px_rgba(8,16,34,0.95)]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1886f0]/20 text-[#1886f0]">↗</span>
                  <p className="text-xs font-semibold text-[#35d3ce]">{stats.submitted} submitted</p>
                </div>
                <p className="text-[13px] text-[#c7d4eb]">Active Disputes</p>
                <p className="mt-0.5 text-[40px] font-semibold leading-none">{stats.activeDisputes}</p>
              </div>

              <div className="rounded-2xl bg-[#1b2748] p-4 text-white shadow-[0_16px_30px_-26px_rgba(8,16,34,0.95)]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#3ad279]/20 text-[#3ad279]">⏱</span>
                  <p className="text-xs font-semibold text-[#4acf86]">{stats.won} won / {stats.lost} lost</p>
                </div>
                <p className="text-[13px] text-[#c7d4eb]">Avg. Resolution Time</p>
                <p className="mt-0.5 text-[40px] font-semibold leading-none">
                  {typeof stats.avgResolutionTimeDays === "number" ? `${stats.avgResolutionTimeDays} Days` : "N/A"}
                </p>
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-[#dbe2ee] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-5">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <div className="relative min-w-[250px] flex-1 md:max-w-[390px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#99a9c7]" />
                  <input
                    className="h-11 w-full rounded-lg border border-[#d7deeb] bg-[#f8fafd] py-2 pl-10 pr-3 text-sm text-[#243251] outline-none"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by case ID, customer, email, or reason..."
                    type="text"
                    value={query}
                  />
                </div>

                <div className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#d7deeb] bg-[#f8fafd] px-4 text-sm font-semibold text-[#4f6282]">
                  <Filter className="h-4 w-4" />
                  <select
                    className="bg-transparent text-sm font-semibold text-[#4f6282] outline-none"
                    onChange={(event) => setStatusFilter(event.target.value as "ALL" | DisputeStatus)}
                    value={statusFilter}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="OPEN">Action Required</option>
                    <option value="SUBMITTED">Under Review</option>
                    <option value="WON">Won</option>
                    <option value="LOST">Lost</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                </div>
              </div>

              <p className="text-sm font-medium text-[#7f90ae]">
                Amazon, eBay, Etsy, and TikTok dispute tracking coming later.
              </p>
            </div>

            {showRefreshing ? (
              <div className="border-t border-[#edf1f7] px-4 py-3 text-sm font-medium text-[#7f90ae] md:px-5">
                Refreshing Shopify disputes...
              </div>
            ) : null}

            <div className="overflow-x-auto border-t border-[#edf1f7]">
              <table className="w-full min-w-[1120px] border-collapse">
                <thead className="bg-[#233a69] text-xs font-semibold uppercase tracking-wide text-[#d8e4fb]">
                  <tr>
                    <th className="px-4 py-4 text-left">Case ID</th>
                    <th className="px-4 py-4 text-left">Platform</th>
                    <th className="px-4 py-4 text-left">Customer</th>
                    <th className="px-4 py-4 text-left">Order ID</th>
                    <th className="px-4 py-4 text-left">Dispute Type</th>
                    <th className="px-4 py-4 text-left">Amount</th>
                    <th className="px-4 py-4 text-left">Date</th>
                    <th className="px-4 py-4 text-left">Status</th>
                    <th className="px-4 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {showInitialLoading ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm font-medium text-[#7f90ae]" colSpan={9}>
                        Loading Shopify disputes...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm font-medium text-[#7f90ae]" colSpan={9}>
                        No disputes or chargeback inquiries found for your connected Shopify store.
                      </td>
                    </tr>
                  ) : (
                    items.map((entry) => (
                      <tr className="border-t border-[#edf1f7] text-sm text-[#4f5f7d]" key={entry.id}>
                        <td className="px-4 py-4 font-semibold text-[#4c5b79]">{entry.disputeId || entry.orderName || entry.shopifyOrderId || "--"}</td>
                        <td className="px-4 py-4">{platformBadge()}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {avatar(entry.customerName ?? "", entry.customerEmail ?? "")}
                            <div className="leading-tight text-[#4f5f7d]">
                              <p>{formatCustomerLabel(entry)}</p>
                              {entry.customerEmail ? <p className="mt-1 text-xs text-[#8392ae]">{entry.customerEmail}</p> : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-semibold text-[#4c5b79]">{entry.orderName || entry.shopifyOrderId || "--"}</td>
                        <td className="px-4 py-4 text-[#6f7f9f]">{entry.reason || "Unknown dispute reason"}</td>
                        <td className="px-4 py-4 text-[#6f7f9f]">{formatAmount(entry)}</td>
                        <td className="px-4 py-4 text-[#8392ae]">{formatDate(entry.sourceCreatedAt)}</td>
                        <td className="px-4 py-4">{statusBadge(entry.status)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              className="inline-flex items-center gap-2 rounded-md border border-[#d6deea] bg-[#f8fafd] px-4 py-1.5 text-xs font-semibold text-[#60708d]"
                              onClick={() => void openDetails(entry.id)}
                              type="button"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View Details
                            </button>
                            <button
                              className="rounded-md border border-[#d6deea] bg-[#f8fafd] px-4 py-1.5 text-xs font-semibold text-[#9baac4]"
                              disabled
                              title="Evidence submission coming later"
                              type="button"
                            >
                              Evidence Later
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>

      {selectedDispute || isDetailsLoading || detailError ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#020816]/60 px-4 py-6">
          <article className="w-full max-w-4xl overflow-hidden rounded-2xl border border-[#364973] bg-[#18284d] shadow-[0_45px_120px_-35px_rgba(6,15,36,0.95)]">
            <header className="flex items-start justify-between border-b border-[#4c5f87] px-6 py-4 text-white">
              <div>
                <h2 className="text-[20px] font-semibold leading-none">Dispute Details</h2>
                <p className="mt-2 text-[16px] text-[#aebddb]">Read-only Shopify dispute summary</p>
              </div>
              <button className="mt-1 text-[#9fb0d0] transition hover:text-white" onClick={closeDetails} type="button">
                <X className="h-6 w-6" />
              </button>
            </header>

            <div className="space-y-6 px-6 py-5">
              {isDetailsLoading ? (
                <p className="text-sm text-[#d9e4fb]">Loading dispute details...</p>
              ) : detailError ? (
                <p className="text-sm text-[#ffbdd4]">{detailError}</p>
              ) : selectedDispute ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl bg-[#243a67] p-4 text-[#d9e4fb]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#9fb3d6]">Case ID</p>
                      <p className="mt-2 text-lg font-semibold">{selectedDispute.dispute.disputeId || "--"}</p>
                    </div>
                    <div className="rounded-xl bg-[#243a67] p-4 text-[#d9e4fb]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#9fb3d6]">Status</p>
                      <p className="mt-2 text-lg font-semibold">{statusLabels[selectedDispute.dispute.status]}</p>
                    </div>
                    <div className="rounded-xl bg-[#243a67] p-4 text-[#d9e4fb]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#9fb3d6]">Order ID</p>
                      <p className="mt-2 text-lg font-semibold">{selectedDispute.dispute.orderName || selectedDispute.dispute.shopifyOrderId || "--"}</p>
                    </div>
                    <div className="rounded-xl bg-[#243a67] p-4 text-[#d9e4fb]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#9fb3d6]">Customer</p>
                      <p className="mt-2 text-lg font-semibold">{formatCustomerLabel(selectedDispute.dispute)}</p>
                      {selectedDispute.dispute.customerEmail ? <p className="mt-1 text-sm text-[#b7c7e4]">{selectedDispute.dispute.customerEmail}</p> : null}
                    </div>
                    <div className="rounded-xl bg-[#243a67] p-4 text-[#d9e4fb]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#9fb3d6]">Reason</p>
                      <p className="mt-2 text-lg font-semibold">{selectedDispute.dispute.reason || "Unknown dispute reason"}</p>
                    </div>
                    <div className="rounded-xl bg-[#243a67] p-4 text-[#d9e4fb]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#9fb3d6]">Amount</p>
                      <p className="mt-2 text-lg font-semibold">{formatAmount(selectedDispute.dispute)}</p>
                    </div>
                    <div className="rounded-xl bg-[#243a67] p-4 text-[#d9e4fb]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#9fb3d6]">Opened</p>
                      <p className="mt-2 text-lg font-semibold">{formatDateTime(selectedDispute.dispute.sourceCreatedAt)}</p>
                    </div>
                    <div className="rounded-xl bg-[#243a67] p-4 text-[#d9e4fb]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#9fb3d6]">Deadline</p>
                      <p className="mt-2 text-lg font-semibold">{formatDateTime(selectedDispute.dispute.deadline)}</p>
                    </div>
                  </div>

                  {selectedDispute.relatedOrder ? (
                    <div className="rounded-xl border border-[#405781] bg-[#22375f] p-4 text-[#d9e4fb]">
                      <h3 className="text-base font-semibold">Related Local Order</h3>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <p><span className="text-[#9fb3d6]">Order:</span> {selectedDispute.relatedOrder.orderName || "--"}</p>
                        <p><span className="text-[#9fb3d6]">Customer:</span> {selectedDispute.relatedOrder.customerName || "--"}</p>
                        <p><span className="text-[#9fb3d6]">Financial Status:</span> {selectedDispute.relatedOrder.financialStatus || "--"}</p>
                        <p><span className="text-[#9fb3d6]">Fulfillment Status:</span> {selectedDispute.relatedOrder.fulfillmentStatus || "--"}</p>
                      </div>
                    </div>
                  ) : null}

                  {selectedDispute.dispute.rawShopifyData ? (
                    <div className="rounded-xl border border-[#405781] bg-[#22375f] p-4 text-[#d9e4fb]">
                      <h3 className="text-base font-semibold">Source Data Summary</h3>
                      <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#18284d] p-3 text-xs text-[#b7c7e4]">
                        {JSON.stringify(selectedDispute.dispute.rawShopifyData, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </article>
        </div>
      ) : null}
    </>
  );
}
