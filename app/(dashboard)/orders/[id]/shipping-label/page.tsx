"use client";

import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiClientError } from "@/lib/auth";
import { ordersApi, type OrderAddress, type OrderRecord } from "@/lib/orders";
import ShippingConfirmActions from "./ShippingConfirmActions";

function CarrierCard({
  name,
  eta,
  price,
  logo,
  selected,
  badge,
}: {
  name: string;
  eta: string;
  price: string;
  logo: string;
  selected?: boolean;
  badge?: string;
}) {
  return (
    <button
      className={`relative rounded-2xl border p-4 text-left transition ${
        selected ? "border-[#1b2748] bg-[#1b2748] text-white" : "border-[#d7deec] bg-white text-[#2f405d] hover:border-[#9fb1cf]"
      }`}
      type="button"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${selected ? "bg-white text-[#1b2748]" : "bg-[#f5f8fd] text-[#60708d]"}`}>{logo}</span>
        {badge ? <span className="rounded-full bg-[#dff4e8] px-2 py-0.5 text-[10px] font-semibold text-[#37b87d]">{badge}</span> : null}
      </div>
      <p className="text-xl font-semibold">{name}</p>
      <p className={`mt-1 text-sm ${selected ? "text-[#a9b8d6]" : "text-[#7f92b1]"}`}>{eta}</p>
      <p className="mt-2 text-3xl font-semibold">{price}</p>
    </button>
  );
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

function formatAddress(address?: OrderAddress | null) {
  if (!address) {
    return ["No shipping address available"];
  }

  if (Array.isArray(address.formatted) && address.formatted.length) {
    return address.formatted;
  }

  return [
    address.name,
    [address.address1, address.address2].filter(Boolean).join(" "),
    [address.city, address.province, address.zip].filter(Boolean).join(", "),
    address.country,
  ].filter(Boolean);
}

function getPlatformLabel(marketplace?: string) {
  if (!marketplace) {
    return "Marketplace";
  }

  return `${marketplace.charAt(0).toUpperCase()}${marketplace.slice(1)}`;
}

export default function ShippingLabelPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState("");

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

  const normalizedOrder = order?.orderName ?? order?.externalOrderId ?? order?.shopifyOrderId ?? `#${id.toUpperCase()}`;
  const shipToLines = formatAddress(order?.shippingAddress);

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="space-y-4">
        <header className="rounded-xl border border-[#2c3b61] bg-[#1b2748] px-5 py-5 text-white">
          <h1 className="text-2xl font-semibold">Generate Shipping Label</h1>
          <p className="mt-1 text-sm text-[#a9b8d6]">Order {normalizedOrder} • Placed on {formatDate(order?.processedAt)} • {order?.financialStatus || "Paid"}</p>
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
              Loading shipping details...
            </div>
          </article>
        ) : (
          <>
            <article className="rounded-2xl border border-[#dbe2ee] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-[#1f2c44]">Select Carrier Service</h2>
                <button className="text-sm font-semibold text-[#5b9dff]" type="button">
                  Compare Rates
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <CarrierCard eta="Est. Mon, Oct 24" logo="UPS" name="UPS Ground" price="$12.40" selected />
                <CarrierCard badge="BEST VALUE" eta="Est. Sat, Oct 22" logo="USPS" name="Priority Mail" price="$9.50" />
                <CarrierCard eta="Arrives Tomorrow" logo="DHL" name="Express" price="$24.00" />
              </div>
            </article>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <article className="rounded-2xl border border-[#dbe2ee] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-5">
                <h3 className="text-2xl font-semibold text-[#1f2c44]">Summary</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between text-[#6d7f9f]">
                    <span>Subtotal (UPS Ground)</span>
                    <span className="font-semibold text-[#374a69]">$12.40</span>
                  </div>
                  <div className="flex items-center justify-between text-[#6d7f9f]">
                    <span>Insurance</span>
                    <span className="font-semibold text-[#374a69]">$0.00</span>
                  </div>
                  <div className="flex items-center justify-between text-[#6d7f9f]">
                    <span>Taxes &amp; Fees</span>
                    <span className="font-semibold text-[#374a69]">$1.05</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-[#e6ecf5] pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8ea0bf]">Total Cost</p>
                  <div className="mt-1 flex items-end justify-between">
                    <p className="text-5xl font-bold text-[#1f2c44]">$13.45</p>
                    <p className="text-sm font-semibold text-[#9aabc6]">USD</p>
                  </div>
                </div>
              </article>

              <div className="space-y-3">
                <article className="rounded-2xl border border-[#dbe2ee] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8ea0bf]">Label Preview</p>
                  <div className="mt-3 rounded-xl border border-[#e2e9f5] bg-[#fcfdff] p-4">
                    <div className="h-40 rounded-lg border border-[#e4eaf5] bg-white p-4">
                      <div className="flex items-start justify-between">
                        <p className="text-4xl font-bold text-[#111827]">P</p>
                        <div className="text-right text-[11px] font-semibold text-[#374a69]">
                          <p>US POSTAGE PAID</p>
                          <p>PITNEY BOWES</p>
                          <p>ZONE 4 NO SURCHARGE</p>
                          <p className="mt-1 text-xl">0.45 LB</p>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-[#101827] pt-2 text-xs text-[#36485f]">
                        <p className="font-semibold">FROM:</p>
                        <p>SHIPSYNC FULFILLMENT</p>
                        <p>800 WEST EL CAMINO REAL</p>
                      </div>
                    </div>
                  </div>

                  <ShippingConfirmActions
                    initialCarrier={order?.carrier || "UPS"}
                    initialTrackingNumber={order?.trackingNumber || "1Z204E380338943508"}
                    marketplace={getPlatformLabel(order?.marketplace)}
                    orderId={id}
                  />
                  <p className="mt-2 text-center text-xs text-[#9cadc8]">
                    By generating, you agree to the <span className="font-semibold text-[#6f88b6]">Carrier Terms.</span>
                  </p>
                </article>

                <article className="rounded-2xl border border-[#dbe2ee] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#8ea0bf]">Ship To</p>
                    <button className="text-sm font-semibold text-[#5b9dff]" type="button">
                      Edit
                    </button>
                  </div>
                  <div className="text-sm text-[#3c4f6c]">
                    {shipToLines.map((line, index) => (
                      <p className={index === 0 ? "font-semibold text-[#2d3f5b]" : ""} key={line}>
                        {line}
                      </p>
                    ))}
                  </div>
                </article>
              </div>
            </div>

            <div className="pt-1">
              <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[#5b9dff]" href={`/orders/${id}`}>
                <Search className="h-4 w-4" />
                Back to order details
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
