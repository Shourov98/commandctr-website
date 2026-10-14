"use client";

import { Loader2, Printer } from "lucide-react";
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
    address.phone,
  ].filter(Boolean);
}

function formatDate(value?: string) {
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
}

export default function OrderPrintView({ mode }: { mode: "invoice" | "slip" }) {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

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
          setMessage(error instanceof ApiClientError ? error.message : "Could not load order.");
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

  const title = mode === "invoice" ? "Invoice" : "Packing Slip";
  const normalizedOrder = order?.orderName ?? order?.externalOrderId ?? order?.shopifyOrderId ?? `#${id.toUpperCase()}`;
  const shippingLines = formatAddress(order?.shippingAddress);
  const billingLines = formatAddress(order?.billingAddress);
  const itemCount = useMemo(() => (order?.lineItems ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0), [order]);

  return (
    <section className="min-h-screen bg-[#f4f6fb] px-4 py-6 text-[#1f2c44] print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-[0_20px_50px_-30px_rgba(17,31,56,0.45)] print:max-w-none print:rounded-none print:p-8 print:shadow-none">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link className="text-sm font-semibold text-[#4d9bff]" href={`/orders/${id}`}>
            Back to order
          </Link>
          <button className="inline-flex items-center gap-2 rounded-xl bg-[#1b2748] px-4 py-2 text-sm font-semibold text-white" onClick={() => window.print()} type="button">
            <Printer className="h-4 w-4" />
            Print {title}
          </button>
        </div>

        {message ? <div className="rounded-xl border border-[#f2c1d6] bg-[#fff6fa] px-4 py-3 text-sm text-[#9e2f5f]">{message}</div> : null}

        {isLoading ? (
          <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-[#6f7f9f]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading {title.toLowerCase()}...
          </div>
        ) : (
          <>
            <header className="flex flex-col gap-6 border-b border-[#e7edf7] pb-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8ea0bf]">Twinstr</p>
                <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
                <p className="mt-2 text-sm text-[#607394]">Order {normalizedOrder}</p>
              </div>
              <div className="text-sm text-[#607394] md:text-right">
                <p><span className="font-semibold text-[#1f2c44]">Order date:</span> {formatDate(order?.processedAt)}</p>
                <p><span className="font-semibold text-[#1f2c44]">Marketplace:</span> {order?.marketplace || "Shopify"}</p>
                <p><span className="font-semibold text-[#1f2c44]">Status:</span> {order?.status || "--"}</p>
              </div>
            </header>

            <div className="grid gap-6 py-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8ea0bf]">Bill To</p>
                <div className="mt-3 space-y-1 text-sm">
                  {billingLines.map((line) => (
                    <p key={`bill-${line}`}>{line}</p>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8ea0bf]">Ship To</p>
                <div className="mt-3 space-y-1 text-sm">
                  {shippingLines.map((line) => (
                    <p key={`ship-${line}`}>{line}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#e7edf7]">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#f7f9fd] text-[#607394]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Qty</th>
                    {mode === "invoice" ? <th className="px-4 py-3 font-semibold text-right">Price</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {(order?.lineItems ?? []).map((item, index) => (
                    <tr className="border-t border-[#e7edf7]" key={`${item.sku ?? item.title}-${index}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? <img alt={item.title || "Order item"} className="h-12 w-12 rounded-lg object-cover" src={item.imageUrl} /> : null}
                          <span className="font-medium text-[#1f2c44]">{item.title || "Untitled item"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#607394]">{item.sku || "--"}</td>
                      <td className="px-4 py-3 text-[#607394]">{item.quantity ?? 0}</td>
                      {mode === "invoice" ? <td className="px-4 py-3 text-right font-semibold text-[#1f2c44]">{formatCurrency(item.price, order?.currency)}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="text-sm text-[#607394]">
                <p className="font-semibold text-[#1f2c44]">Items</p>
                <p>{itemCount} unit(s)</p>
                {mode === "slip" ? <p className="mt-3 max-w-md">Packing slip excludes pricing and is intended for fulfillment and in-box documentation.</p> : null}
              </div>

              {mode === "invoice" ? (
                <div className="w-full max-w-xs space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#607394]">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(order?.subtotalPrice, order?.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#607394]">Tax</span>
                    <span className="font-semibold">{formatCurrency(order?.totalTax, order?.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#e7edf7] pt-2 text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold">{formatCurrency(order?.totalPrice, order?.currency)}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
