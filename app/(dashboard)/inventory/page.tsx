"use client";

import {
  AlertTriangle,
  CloudUpload,
  FileDown,
  Filter,
  Loader2,
  Package2,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo } from "react";

import { useInventoryPageStore, type InventoryRow } from "@/lib/stores/inventory-page-store";

function clampNonNegative(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function AvailabilityText({ value }: { value: number }) {
  if (value <= 20) {
    return <span className="font-semibold text-[#f05694]">{value}</span>;
  }
  if (value <= 80) {
    return <span className="font-semibold text-[#f3ad2f]">{value}</span>;
  }
  return <span className="font-semibold text-[#4ec9cd]">{value}</span>;
}

function EmptyChannelCell() {
  return (
    <>
      <div className="mx-auto text-sm font-semibold text-[#9aa5bc]">--</div>
      <p className="mt-1 text-xs text-[#9aa5bc]">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#d4dceb]" />
        Empty
      </p>
    </>
  );
}

function ComingSoonChannelCell() {
  return (
    <>
      <div className="mx-auto text-sm font-semibold text-[#7f8da8]">--</div>
      <p className="mt-1 text-xs font-semibold text-[#35bfc8]">Coming Soon</p>
    </>
  );
}

function downloadCsv(rows: InventoryRow[]) {
  const header = [
    "Title",
    "SKU",
    "Shopify Product ID",
    "Inventory Item ID",
    "Location",
    "Master Count",
    "Safety Buffer",
    "Available",
    "eBay Listing ID",
    "eBay Quantity",
  ];

  const lines = rows.map((row) => [
    row.title,
    row.sku,
    row.shopifyProductId,
    row.inventoryItemId,
    row.locationName || row.locationId,
    String(row.masterCount),
    String(row.safetyBuffer),
    String(row.available),
    row.ebayListingId ?? "",
    row.ebayQuantity === undefined ? "" : String(row.ebayQuantity),
  ]);

  const csv = [header, ...lines]
    .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function InventoryPage() {
  const items = useInventoryPageStore((state) => state.items);
  const searchQuery = useInventoryPageStore((state) => state.searchQuery);
  const globalEditMode = useInventoryPageStore((state) => state.globalEditMode);
  const isLoading = useInventoryPageStore((state) => state.isLoading);
  const isImporting = useInventoryPageStore((state) => state.isImporting);
  const hasLoadedOnce = useInventoryPageStore((state) => state.hasLoadedOnce);
  const pageMessage = useInventoryPageStore((state) => state.pageMessage);
  const rowFeedbackById = useInventoryPageStore((state) => state.rowFeedbackById);
  const setSearchQuery = useInventoryPageStore((state) => state.setSearchQuery);
  const toggleGlobalEditMode = useInventoryPageStore((state) => state.toggleGlobalEditMode);
  const shouldRefresh = useInventoryPageStore((state) => state.shouldRefresh);
  const loadInventory = useInventoryPageStore((state) => state.loadInventory);
  const importInventory = useInventoryPageStore((state) => state.importInventory);
  const updateMasterCountDraft = useInventoryPageStore((state) => state.updateMasterCountDraft);
  // Restore this eBay draft updater when eBay inventory editing goes live again.
  // const updateEbayQuantityDraft = useInventoryPageStore((state) => state.updateEbayQuantityDraft);
  const updateSafetyBufferDraft = useInventoryPageStore((state) => state.updateSafetyBufferDraft);
  const saveMasterCount = useInventoryPageStore((state) => state.saveMasterCount);
  // Restore this eBay save handler when eBay inventory editing goes live again.
  // const saveEbayQuantity = useInventoryPageStore((state) => state.saveEbayQuantity);
  const saveSafetyBuffer = useInventoryPageStore((state) => state.saveSafetyBuffer);

  useEffect(() => {
    if (!hasLoadedOnce || items.length === 0) {
      void loadInventory();
      return;
    }

    if (shouldRefresh()) {
      void loadInventory();
    }
  }, [hasLoadedOnce, items.length, loadInventory, shouldRefresh]);

  const showInitialLoading = isLoading && items.length === 0;
  const showRefreshing = isLoading && items.length > 0;

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.title.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.shopifyProductId.toLowerCase().includes(query) ||
        item.ebayListingId?.toLowerCase().includes(query)
      );
    });
  }, [items, searchQuery]);

  const metrics = useMemo(() => {
    const availableStock = items.reduce((sum, item) => sum + clampNonNegative(item.available), 0);
    const lowStock = items.filter((item) => clampNonNegative(item.available) <= item.lowStockThreshold && clampNonNegative(item.available) > 0).length;
    const outOfStock = items.filter((item) => clampNonNegative(item.available) <= 0).length;

    return {
      totalSkus: items.length,
      availableStock: clampNonNegative(availableStock),
      lowStock,
      outOfStock,
    };
  }, [items]);

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="space-y-5">
        <div className="rounded-xl border border-[#2c3b61] bg-[#1b2748] px-4 py-4 text-white md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Inventory Overview</h1>
              <p className="mt-1 text-sm text-[#a9b8d6]">Manage live inventory levels across your connected marketplaces.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd6ea] bg-white px-4 text-sm font-semibold text-[#425370]"
                onClick={toggleGlobalEditMode}
                type="button"
              >
                <Filter className="h-4 w-4" />
                Adjust Safety Buffer
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#35d3ce] px-4 text-sm font-semibold text-white"
                onClick={() => downloadCsv(filteredItems)}
                type="button"
              >
                <FileDown className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <article className="rounded-2xl border border-[#dbe2ee] bg-white p-4 shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)] md:p-5">
          <h2 className="text-lg font-semibold text-[#1f2c44]">Product Optimization</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-[#1a2748] p-4 text-white">
              <div className="mb-3 flex items-center justify-between">
                <Package2 className="h-4 w-4 text-[#a9b7d3]" />
              </div>
              <p className="text-sm text-[#c0cce4]">Total SKUs</p>
              <p className="mt-1 text-3xl font-semibold">{metrics.totalSkus}</p>
            </div>

            <div className="rounded-xl bg-[#1a2748] p-4 text-white">
              <div className="mb-3 flex items-center justify-between">
                <CloudUpload className="h-4 w-4 text-[#a9b7d3]" />
              </div>
              <p className="text-sm text-[#c0cce4]">Available Stock</p>
              <p className="mt-1 text-3xl font-semibold">{metrics.availableStock}</p>
            </div>

            <div className="rounded-xl bg-[#1a2748] p-4 text-white">
              <div className="mb-3 flex items-center justify-between">
                <AlertTriangle className="h-4 w-4 text-[#f1b83d]" />
              </div>
              <p className="text-sm text-[#c0cce4]">Low Stock</p>
              <p className="mt-1 text-3xl font-semibold text-[#f2b239]">{metrics.lowStock}</p>
            </div>

            <div className="rounded-xl bg-[#1a2748] p-4 text-white">
              <div className="mb-3 flex items-center justify-between">
                <TriangleAlert className="h-4 w-4 text-[#ef4a89]" />
              </div>
              <p className="text-sm text-[#c0cce4]">Out of Stock</p>
              <p className="mt-1 text-3xl font-semibold text-[#ef4a89]">{metrics.outOfStock}</p>
            </div>
          </div>
        </article>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 md:flex-row lg:max-w-[710px]">
            <div className="relative w-full md:max-w-[390px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#96a3bc]" />
              <input
                className="h-11 w-full rounded-xl border border-[#d6dce9] bg-white py-2 pl-10 pr-3 text-sm text-[#243251] outline-none placeholder:text-[#8f9bb1] focus:border-[#98abcf]"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, SKU, Shopify ID, or eBay listing..."
                type="text"
                value={searchQuery}
              />
            </div>

            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-5 text-sm font-semibold text-[#465574]"
              type="button"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-11 items-center gap-3 rounded-full border border-[#d7deeb] bg-[#eaf2fd] px-4 text-sm font-semibold text-[#33466a]">
              Global Edit Mode
              <button
                className={`relative h-6 w-12 rounded-full transition ${globalEditMode ? "bg-[#1f2d4d]" : "bg-[#c8d2e5]"}`}
                onClick={toggleGlobalEditMode}
                type="button"
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    globalEditMode ? "left-6" : "left-0.5"
                  }`}
                />
              </button>
            </label>

            <button
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-5 text-sm font-semibold text-[#465574] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isImporting}
              onClick={() => void importInventory()}
              type="button"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
              {isImporting ? "Importing..." : "Import"}
            </button>
            <Link className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#172544] px-5 text-sm font-semibold text-white" href="/products/add">
              <Plus className="h-4 w-4" />
              Add Product
            </Link>
          </div>
        </div>

        {pageMessage ? (
          <div className="rounded-xl border border-[#dbe2ee] bg-white px-4 py-3 text-sm text-[#4e5f82] shadow-[0_12px_26px_-24px_rgba(17,31,56,0.85)]">
            {pageMessage}
          </div>
        ) : null}

        <article className="overflow-hidden rounded-2xl border border-[#e1e6f0] bg-white">
          {showRefreshing ? (
            <div className="border-b border-[#edf1f7] px-4 py-3 text-sm text-[#6f7f9f]">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing inventory...
              </div>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left">
              <thead className="text-xs font-semibold uppercase tracking-wide text-[#d8e4fb]">
                <tr>
                  <th className="w-12 bg-[#233a69] px-3 py-4 text-center">○</th>
                  <th className="w-[320px] bg-[#233a69] px-4 py-4">Product Details</th>
                  <th className="w-[140px] bg-[#1f7a43] px-4 py-4 text-center">
                    <p className="text-sm normal-case text-white">Shopify</p>
                    <p className="mt-1 text-[11px] normal-case text-white">Master Count</p>
                  </th>
                  <th className="w-[150px] bg-[#f8a100] px-4 py-4 text-center">
                    <p className="text-sm normal-case text-white">a Amazon</p>
                    <p className="mt-1 text-[11px] normal-case text-white">Inventory</p>
                  </th>
                  <th className="w-[150px] bg-[#0b72de] px-4 py-4 text-center">
                    <p className="text-sm normal-case text-white">eb eBay</p>
                    <p className="mt-1 text-[11px] normal-case text-white">Coming Soon</p>
                  </th>
                  <th className="w-[150px] bg-gradient-to-r from-[#00d4d1] via-[#0ea4d6] to-[#eb0f67] px-4 py-4 text-center">
                    <p className="text-sm normal-case text-white">♪ TikTok</p>
                    <p className="mt-1 text-[11px] normal-case text-white">Inventory</p>
                  </th>
                  <th className="w-[150px] bg-[#F1641E] px-4 py-4 text-center">
                    <p className="text-sm normal-case text-white">Etsy</p>
                    <p className="mt-1 text-[11px] normal-case text-white">Coming Soon</p>
                  </th>
                  <th className="w-[140px] bg-[#233a69] px-4 py-4 text-center">Safety Buffer</th>
                  <th className="w-[120px] bg-[#233a69] px-4 py-4 text-center">Available</th>
                  <th className="w-[180px] bg-[#233a69] px-4 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {showInitialLoading ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-sm text-[#6f7f9f]" colSpan={10}>
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading live inventory...
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const canEdit = globalEditMode;
                    const rowFeedback = rowFeedbackById[item.id] ?? { tone: "idle", message: "" };

                    return (
                      <tr className="border-t border-[#e9eef7] text-sm text-[#44526d]" key={item.id}>
                        <td className="px-3 py-4 text-center">
                          <span className="inline-block h-3.5 w-3.5 rounded-full border border-[#c7d1e3]" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-[#e3e9f3] bg-[#f7f9fd]">
                              {item.featuredImage ? (
                                <Image
                                  alt={item.title}
                                  className="h-full w-full object-cover"
                                  height={44}
                                  src={item.featuredImage}
                                  unoptimized
                                  width={44}
                                />
                              ) : (
                                <div className="h-7 w-4 rounded-[3px] bg-[#d9e1ef]" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold leading-tight text-[#202b44]">{item.title}</p>
                              <p className="mt-0.5 text-xs text-[#7d89a2]">SKU: {item.sku || "--"}</p>
                              <p className="mt-0.5 text-xs text-[#9aa5bc]">
                                {item.locationName || "No location"}
                                {item.shopifyProductId ? ` • ${item.shopifyProductId}` : ""}
                                {/* Restore the eBay listing hint when eBay goes live again. */}
                                {/* {item.ebayListingId ? ` • eBay ${item.ebayListingId}` : ""} */}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          {!item.shopifyProductId ? (
                            <EmptyChannelCell />
                          ) : canEdit ? (
                            <input
                              className="h-8 w-[84px] rounded-lg border border-[#cfd8e7] bg-white px-2 text-center text-sm text-[#3f4d65] outline-none"
                              min={0}
                              onBlur={() => void saveMasterCount(item)}
                              onChange={(event) => updateMasterCountDraft(item.id, event.target.value)}
                              type="number"
                              value={item.shopifyQuantity ?? item.masterCount}
                            />
                          ) : (
                            <div className="mx-auto text-sm font-semibold text-[#5a6a86]">{item.masterCount}</div>
                          )}
                          {item.shopifyProductId ? <p className="mt-1 text-xs text-[#40cacc]">Live Shopify Qty</p> : null}
                        </td>

                        <td className="border-l border-[#ffe0bc] px-4 py-4 text-center">
                          <EmptyChannelCell />
                        </td>

                        <td className="border-l border-[#d2e5ff] px-4 py-4 text-center">
                          <ComingSoonChannelCell />
                          {/* Restore live eBay quantity editing when eBay goes live again.
                          {item.ebayProductId && item.ebayQuantity !== undefined ? (
                            <>
                              {canEdit ? (
                                <input
                                  className="h-8 w-[84px] rounded-lg border border-[#b9d7f7] bg-white px-2 text-center text-sm text-[#3f4d65] outline-none"
                                  min={0}
                                  onBlur={() => void saveEbayQuantity(item)}
                                  onChange={(event) => updateEbayQuantityDraft(item.id, event.target.value)}
                                  type="number"
                                  value={item.ebayQuantity}
                                />
                              ) : (
                                <div className="mx-auto text-sm font-semibold text-[#176bb8]">{item.ebayQuantity}</div>
                              )}
                              <p className="mt-1 text-xs text-[#2ab8b8]">
                                {item.ebayStatus === "active" ? "Live eBay Qty" : item.ebayStatus || "eBay inventory"}
                              </p>
                              {item.ebaySyncError ? (
                                <p className="mt-1 text-[10px] text-[#d14b63]">Using saved quantity</p>
                              ) : null}
                            </>
                          ) : (
                            <EmptyChannelCell />
                          )}
                          */}
                        </td>

                        <td className="border-l border-[#f5d4e6] px-4 py-4 text-center">
                          <EmptyChannelCell />
                        </td>

                        <td className="border-l border-[#ffe4d6] px-4 py-4 text-center">
                          <ComingSoonChannelCell />
                        </td>

                        <td className="px-4 py-4 text-center">
                          {!item.shopifyProductId ? (
                            <div className="text-xs text-[#9aa5bc]">--</div>
                          ) : canEdit ? (
                            <input
                              className="h-8 w-[84px] rounded-lg border border-[#cfd8e7] bg-white px-2 text-center text-sm text-[#3f4d65] outline-none"
                              min={0}
                              onBlur={() => void saveSafetyBuffer(item)}
                              onChange={(event) => updateSafetyBufferDraft(item.id, event.target.value)}
                              type="number"
                              value={item.safetyBuffer}
                            />
                          ) : (
                            <div className="mx-auto text-sm font-semibold text-[#5a6a86]">{item.safetyBuffer}</div>
                          )}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <AvailabilityText value={item.available} />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-col items-center gap-2">
                            {item.productDocumentId ? (
                              <Link className="text-[#223763]" href={`/products/${item.productDocumentId}`}>
                                View Product
                              </Link>
                            ) : (
                              <span className="text-xs text-[#9aa5bc]">No product link</span>
                            )}
                            <p
                              className={`text-center text-xs ${
                                rowFeedback.tone === "error"
                                  ? "text-[#ea2e3f]"
                                  : rowFeedback.tone === "success"
                                    ? "text-[#168b7c]"
                                    : rowFeedback.tone === "saving"
                                      ? "text-[#566b90]"
                                      : "text-[#9aa5bc]"
                              }`}
                            >
                              {rowFeedback.message || (globalEditMode ? "Blur field to save." : "Store-backed inventory row")}
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!showInitialLoading && filteredItems.length === 0 ? (
            <div className="border-t border-[#edf1f7] px-4 py-6 text-center text-sm text-[#6f7f9f]">
              {items.length === 0 ? "No live Shopify inventory rows found. eBay and Etsy are coming soon." : `No inventory rows found for "${searchQuery}".`}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
