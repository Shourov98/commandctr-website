"use client";

import { Loader2, Truck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiClientError } from "@/lib/auth";
import { ordersApi } from "@/lib/orders";

type ShippingConfirmActionsProps = {
  orderId: string;
  marketplace?: string;
  initialCarrier?: string;
  initialTrackingNumber?: string;
};

export default function ShippingConfirmActions({
  orderId,
  marketplace = "Marketplace",
  initialCarrier = "UPS",
  initialTrackingNumber = "1Z204E380338943508",
}: ShippingConfirmActionsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [carrier, setCarrier] = useState(initialCarrier);
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber);
  const [message, setMessage] = useState("");

  const handleConfirm = async () => {
    setIsSaving(true);
    setMessage("");

    try {
      await ordersApi.updateOrderStatus(orderId, {
        status: "Shipped",
        carrier,
        shippingService: "Standard Ground Shipping",
        trackingNumber,
        notifyCustomer: true,
      });
      setIsOpen(false);
      router.push("/orders");
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Could not confirm shipment.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1b2748] text-lg font-semibold text-[#35d3ce]" type="button">
          <Truck className="h-5 w-5" />
          Generate Label
        </button>
        <button className="h-12 w-full rounded-full bg-[#35d3ce] text-lg font-semibold text-white" onClick={() => setIsOpen(true)} type="button">
          Confirm
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0b162d]/55 p-4 sm:items-center">
          <article className="w-full max-w-xl overflow-hidden rounded-xl border border-[#34466d] bg-[#1b2748] text-white shadow-[0_30px_80px_-35px_rgba(17,31,56,0.9)]">
            <header className="flex items-center justify-between border-b border-[#445982] px-5 py-4">
              <h3 className="inline-flex items-center gap-2 text-2xl font-semibold">
                <Truck className="h-5 w-5 text-[#35d3ce]" />
                Confirm Shipping &amp; Sync
              </h3>
              <button className="text-[#9fb1cf]" onClick={() => setIsOpen(false)} type="button">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-2xl bg-white p-4 text-[#2f405d]">
                <p className="text-xl font-semibold">Automated Sync</p>
                <p className="mt-1 text-lg text-[#707f99]">
                  This shipping status and tracking number will be automatically written back to{" "}
                  <span className="font-semibold text-[#1f2c44]">{marketplace}</span> and notify the customer.
                </p>
              </div>

              {message ? <div className="rounded-xl border border-[#ef4a89] px-4 py-3 text-sm text-[#ffd9e8]">{message}</div> : null}

              <div>
                <label className="mb-1 block text-sm font-semibold text-[#b9c6df]">Carrier</label>
                <select
                  className="h-12 w-full rounded-xl border border-[#d6dce9] bg-white px-4 text-lg text-[#243251] outline-none"
                  onChange={(event) => setCarrier(event.target.value)}
                  value={carrier}
                >
                  <option>UPS</option>
                  <option>USPS</option>
                  <option>DHL</option>
                </select>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-[#b9c6df]">Tracking Number</label>
                  <button className="text-sm text-[#7f92b1]" type="button">
                    Scan Barcode?
                  </button>
                </div>
                <input
                  className="h-12 w-full rounded-xl border-2 border-[#1c9fff] bg-white px-4 text-2xl text-[#243251] outline-none"
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  value={trackingNumber}
                />
                <p className="mt-1 text-lg text-[#d1dcf1]">Standard Ground Shipping</p>
              </div>
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-[#445982] px-5 py-4">
              <button className="px-4 py-2 text-lg font-semibold text-[#d5e1fa]" disabled={isSaving} onClick={() => setIsOpen(false)} type="button">
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-[#35d3ce] px-8 py-2 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving || !trackingNumber.trim()}
                onClick={() => void handleConfirm()}
                type="button"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm
              </button>
            </footer>
          </article>
        </div>
      ) : null}
    </>
  );
}
