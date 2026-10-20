"use client";

import { FileText, Loader2, PackageCheck, Phone, Receipt, SendHorizontal, Truck, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ApiClientError } from "@/lib/auth";
import { ordersApi, type OrderAddress, type OrderRecord } from "@/lib/orders";

function formatCurrency(value?: string, currency = "USD") {
  const numericValue = Number(value ?? 0);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(numericValue);
  } catch {
    return `$${numericValue.toFixed(2)}`;
  }
}

function formatAddress(address?: OrderAddress | null) {
  if (!address) {
    return ["No address available"];
  }

  if (Array.isArray(address.formatted) && address.formatted.length) {
    return address.formatted;
  }

  return [
    address.name,
    address.company,
    [address.address1, address.address2].filter(Boolean).join(" "),
    [address.city, address.province, address.zip].filter(Boolean).join(", "),
    address.country,
  ].filter(Boolean);
}

function getInitials(name?: string) {
  const value = name || "Customer";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "C").concat(parts[1]?.[0] ?? "").toUpperCase();
}

function getPlatformLabel(marketplace?: string) {
  if (!marketplace) {
    return "Marketplace";
  }

  return `${marketplace.charAt(0).toUpperCase()}${marketplace.slice(1)} Marketplace`;
}

const CANCEL_REASONS = [
  { label: "Customer request", value: "CUSTOMER" },
  { label: "Inventory issue", value: "INVENTORY" },
  { label: "Payment declined", value: "DECLINED" },
  { label: "Fraud risk", value: "FRAUD" },
  { label: "Staff error", value: "STAFF" },
  { label: "Other", value: "OTHER" },
] as const;

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<(typeof CANCEL_REASONS)[number]["value"]>("CUSTOMER");
  const [cancelRestock, setCancelRestock] = useState(true);
  const [cancelRefund, setCancelRefund] = useState(true);
  const [cancelNotifyCustomer, setCancelNotifyCustomer] = useState(false);
  const [cancelStaffNote, setCancelStaffNote] = useState("");

  useEffect(() => {
    let active = true;

    void ordersApi
      .getOrder(id)
      .then((result) => {
        if (active) {
          setOrder(result);
        }
      })
      .catch((error) => {
        if (active) {
          setPageMessage(error instanceof ApiClientError ? error.message : "Could not load order.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  const itemCount = useMemo(() => (order?.lineItems ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0), [order]);
  const normalizedOrder = order?.orderName ?? order?.externalOrderId ?? order?.shopifyOrderId ?? `#${id.toUpperCase()}`;
  const customerName = order?.customerName || order?.email || "Customer";
  const shippingLines = formatAddress(order?.shippingAddress);
  const billingLines = formatAddress(order?.billingAddress);
  const canCancelOrder = order?.status === "Pending";
  const canMarkAsShipped = order?.status === "Pending";

  const handleCancelOrder = async () => {
    if (!order) {
      return;
    }

    setIsSaving(true);
    setPageMessage("");

    try {
      const updatedOrder = await ordersApi.updateOrderStatus(id, {
        status: "Cancelled",
        cancelReason,
        restock: cancelRestock,
        refund: cancelRefund,
        notifyCustomer: cancelNotifyCustomer,
        staffNote: cancelStaffNote.trim() || undefined,
      });
      setOrder(updatedOrder);
      setIsCancelOpen(false);
      setPageMessage("Order cancelled successfully.");
    } catch (error) {
      setPageMessage(error instanceof ApiClientError ? error.message : "Could not cancel order.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async () => {
    const message = note.trim();
    if (!message) {
      return;
    }

    setIsSaving(true);
    setPageMessage("");

    try {
      const updatedOrder = await ordersApi.addNote(id, message);
      setOrder(updatedOrder);
      setNote("");
    } catch (error) {
      setPageMessage(error instanceof ApiClientError ? error.message : "Could not add note.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="space-y-4">
        <header className="rounded-xl border border-[#2c3b61] bg-[#1b2748] px-4 py-4 text-white md:px-6">
          <h1 className="text-2xl font-semibold">Order Detail Page</h1>
          <p className="mt-1 text-sm text-[#a9b8d6]">Order {normalizedOrder}</p>
        </header>

        {pageMessage ? (
          <div className="rounded-xl border border-[#dbe2ee] bg-white px-4 py-3 text-sm text-[#4e5f82] shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
            {pageMessage}
          </div>
        ) : null}

        {isLoading ? (
          <article className="rounded-2xl border border-[#dbe2ee] bg-white p-8 text-center text-sm text-[#6f7f9f]">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading order details...
            </div>
          </article>
        ) : (
          <>
            <article className="rounded-xl border border-[#2c3b61] bg-[#1b2748] p-4 text-white md:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#aab8d6]">Order Source</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f8a100] text-xl font-bold text-[#1b2748]">
                      {(order?.marketplace ?? "m").charAt(0)}
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{getPlatformLabel(order?.marketplace)}</p>
                      <p className="text-xs text-[#9eb0d2]">Order ID: {order?.externalOrderId ?? order?.shopifyOrderId ?? normalizedOrder}</p>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-[360px] space-y-3">
                  <div className="flex gap-2">
                    <button
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#7d8fb5] text-sm font-semibold text-[#dce6ff]"
                      type="button"
                      onClick={() => window.open(`/orders/${id}/invoice`, "_blank", "noopener,noreferrer")}
                    >
                      <Receipt className="h-4 w-4" />
                      Invoice
                    </button>
                    <button
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#7d8fb5] text-sm font-semibold text-[#dce6ff]"
                      type="button"
                      onClick={() => window.open(`/orders/${id}/slip`, "_blank", "noopener,noreferrer")}
                    >
                      <FileText className="h-4 w-4" />
                      Slip
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[#ef4a89] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSaving || !canCancelOrder}
                      onClick={() => setIsCancelOpen(true)}
                      type="button"
                      title={canCancelOrder ? "Cancel this order" : "Only pending orders can be cancelled from here"}
                    >
                      <span className="text-base">⊗</span>
                      Cancel Order
                    </button>
                    <Link
                      aria-disabled={!canMarkAsShipped}
                      className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white ${
                        canMarkAsShipped ? "bg-[#35d3ce]" : "pointer-events-none bg-[#7ac8c5]/55"
                      }`}
                      href={canMarkAsShipped ? `/orders/${id}/shipping-label` : "#"}
                    >
                      <PackageCheck className="h-4 w-4" />
                      Mark as Shipped
                    </Link>
                  </div>
                </div>
              </div>
            </article>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)]">
              <article className="overflow-hidden rounded-2xl border border-[#dbe2ee] bg-white shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
                <div className="flex items-center justify-between border-b border-[#e5ebf5] px-4 py-4 md:px-5">
                  <h2 className="text-lg font-semibold text-[#1f2c44]">Items Purchased ({itemCount || order?.lineItems?.length || 0})</h2>
                  <button className="text-sm font-semibold text-[#5b9dff]" type="button">
                    Edit Order
                  </button>
                </div>

                {(order?.lineItems ?? []).map((item, index) => (
                  <div className="border-b border-[#eef2f8] px-4 py-4 md:px-5" key={`${item.sku ?? item.title}-${index}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${
                            index % 2 === 0 ? "from-[#638a82] to-[#355e58]" : "from-[#f3d2ae] to-[#cbac86]"
                          }`}
                        >
                          {item.imageUrl ? (
                            <img alt={item.title || "Order item"} className="h-full w-full object-cover" src={item.imageUrl} />
                          ) : null}
                        </div>
                        <div>
                          <p className="font-semibold text-[#2b3b57]">{item.title || "Untitled item"}</p>
                          <p className="text-xs text-[#8ca0bf]">SKU: {item.sku || "--"}</p>
                          <div className="mt-1 inline-flex items-center gap-2 text-xs text-[#8fa1c0]">
                            QTY <span className="rounded-md bg-[#f0f4fb] px-2 py-0.5 font-semibold text-[#607394]">{item.quantity ?? 0}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xl font-semibold text-[#2f3f5d]">{formatCurrency(item.price, order?.currency)}</p>
                    </div>
                  </div>
                ))}

                {(order?.lineItems ?? []).length === 0 ? (
                  <div className="border-b border-[#eef2f8] px-4 py-6 text-sm text-[#6f7f9f] md:px-5">No line items found for this order.</div>
                ) : null}

                <div className="px-4 py-4 md:px-5">
                  <div className="ml-auto max-w-[260px] space-y-2 text-sm">
                    <div className="flex items-center justify-between text-[#6e80a0]">
                      <span>Subtotal</span>
                      <span className="font-semibold text-[#3a4b69]">{formatCurrency(order?.subtotalPrice, order?.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#6e80a0]">
                      <span>Shipping</span>
                      <span className="font-semibold text-[#3a4b69]">$0.00</span>
                    </div>
                    <div className="flex items-center justify-between text-[#6e80a0]">
                      <span>Tax (8%)</span>
                      <span className="font-semibold text-[#3a4b69]">{formatCurrency(order?.totalTax, order?.currency)}</span>
                    </div>
                    <div className="border-t border-[#e5ebf5] pt-2">
                      <div className="flex items-center justify-between text-base">
                        <span className="font-semibold text-[#2c3c59]">Total</span>
                        <span className="font-bold text-[#4d9bff]">{formatCurrency(order?.totalPrice, order?.currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <div className="space-y-4">
                <article className="rounded-2xl border border-[#dbe2ee] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#8ea0bf]">Customer Details</h3>

                  <div className="mt-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8eef8] text-sm font-bold text-[#7a8fb1]">
                      {getInitials(customerName)}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-[#2c3c59]">{customerName}</p>
                      <p className="text-xs text-[#95a7c4]">Customer since 2021</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4 border-t border-[#ebf0f7] pt-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase text-[#95a7c4]">Email Address</p>
                      <p className="font-medium text-[#5a9dff]">{order?.email || "--"}</p>
                    </div>
                    <div>
                      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-[#95a7c4]">
                        <Phone className="h-3.5 w-3.5" />
                        Phone Number
                      </p>
                      <p className="font-medium text-[#3b4d6a]">{order?.phone || order?.shippingAddress?.phone || "--"}</p>
                    </div>
                    <div>
                      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-[#95a7c4]">
                        <Truck className="h-3.5 w-3.5" />
                        Shipping Address
                      </p>
                      {shippingLines.map((line) => (
                        <p className="font-medium text-[#3b4d6a]" key={line}>
                          {line}
                        </p>
                      ))}
                    </div>
                    <div>
                      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-[#95a7c4]">
                        <Receipt className="h-3.5 w-3.5" />
                        Billing Address
                      </p>
                      {billingLines.map((line) => (
                        <p className="font-medium text-[#3b4d6a]" key={line}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </article>

                <article className="rounded-2xl border border-[#dbe2ee] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#8ea0bf]">Internal Notes</h3>
                  <div className="mt-3 flex items-center rounded-xl bg-[#f4f7fd] px-3 py-3">
                    <input
                      className="w-full bg-transparent text-sm text-[#415170] outline-none placeholder:text-[#a3b1ca]"
                      onChange={(event) => setNote(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void handleAddNote();
                        }
                      }}
                      placeholder="Add a note..."
                      type="text"
                      value={note}
                    />
                    <button className="text-[#92a4c5]" disabled={isSaving} onClick={() => void handleAddNote()} type="button">
                      <SendHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                  {(order?.internalNotes ?? []).length ? (
                    <div className="mt-3 space-y-2 text-sm text-[#4e5f82]">
                      {(order?.internalNotes ?? []).slice(-3).map((entry) => (
                        <p className="rounded-lg bg-[#f7f9fd] px-3 py-2" key={`${entry.createdAt}-${entry.message}`}>
                          {entry.message}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </article>
              </div>
            </div>
          </>
        )}
      </div>

      {isCancelOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0b162d]/55 p-4 sm:items-center">
          <article className="w-full max-w-2xl overflow-hidden rounded-xl border border-[#34466d] bg-[#1b2748] text-white shadow-[0_30px_80px_-35px_rgba(17,31,56,0.9)]">
            <header className="flex items-center justify-between border-b border-[#445982] px-5 py-4">
              <div>
                <h3 className="text-2xl font-semibold">Cancel order</h3>
                <p className="mt-1 text-sm text-[#b8c5de]">Matches the Shopify admin flow with refund, restock, and customer notification options.</p>
              </div>
              <button className="text-[#9fb1cf]" onClick={() => setIsCancelOpen(false)} type="button">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#b9c6df]">Cancellation reason</label>
                <select
                  className="h-12 w-full rounded-xl border border-[#d6dce9] bg-white px-4 text-base text-[#243251] outline-none"
                  onChange={(event) => setCancelReason(event.target.value as (typeof CANCEL_REASONS)[number]["value"])}
                  value={cancelReason}
                >
                  {CANCEL_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-start gap-3 rounded-xl bg-[#243251] px-4 py-3 text-sm text-[#d7e2f6]">
                <input checked={cancelRefund} className="mt-1 h-4 w-4" onChange={(event) => setCancelRefund(event.target.checked)} type="checkbox" />
                <span>Refund customer to the original payment method when Shopify allows it.</span>
              </label>

              <label className="flex items-start gap-3 rounded-xl bg-[#243251] px-4 py-3 text-sm text-[#d7e2f6]">
                <input checked={cancelRestock} className="mt-1 h-4 w-4" onChange={(event) => setCancelRestock(event.target.checked)} type="checkbox" />
                <span>Restock committed inventory back into available stock.</span>
              </label>

              <label className="flex items-start gap-3 rounded-xl bg-[#243251] px-4 py-3 text-sm text-[#d7e2f6]">
                <input checked={cancelNotifyCustomer} className="mt-1 h-4 w-4" onChange={(event) => setCancelNotifyCustomer(event.target.checked)} type="checkbox" />
                <span>Send cancellation notification to the customer.</span>
              </label>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[#b9c6df]">Staff note</label>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-[#d6dce9] bg-white px-4 py-3 text-sm text-[#243251] outline-none"
                  maxLength={255}
                  onChange={(event) => setCancelStaffNote(event.target.value)}
                  placeholder="Optional internal note for the cancellation timeline"
                  value={cancelStaffNote}
                />
              </div>
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-[#445982] px-5 py-4">
              <button className="px-4 py-2 text-base font-semibold text-[#d5e1fa]" disabled={isSaving} onClick={() => setIsCancelOpen(false)} type="button">
                Keep order
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-[#ef4a89] px-6 py-2 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                onClick={() => void handleCancelOrder()}
                type="button"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Cancel order
              </button>
            </footer>
          </article>
        </div>
      ) : null}
    </section>
  );
}
