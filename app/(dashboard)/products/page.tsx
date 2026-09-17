"use client";

import {
  AlertTriangle,
  Box,
  CheckCircle2,
  CircleAlert,
  CloudUpload,
  Eye,
  Edit3,
  Filter,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo } from "react";

const EMPTY_MARKET_STATUS: Record<ExternalMarketState, string> = {
  empty: "Empty",
};
import { useProductsPageStore, type ExternalMarketState } from "@/lib/stores/products-page-store";

function toCurrencyValue(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "--";
  }

  return `£ ${numeric.toFixed(2)}`;
}

function toStockDisplay(value: number) {
  return Number.isFinite(value) ? String(value) : "--";
}

function toStockTone(value: number) {
  if (!Number.isFinite(value)) {
    return {
      label: "Unknown",
      className: "text-[#9aa5bc]",
    };
  }

  if (value <= 10) {
    return {
      label: "Low Stock",
      className: "text-[#d28e10]",
    };
  }

  return {
    label: "In Stock",
    className: "text-[#16c4cb]",
  };
}

function MarketPlaceholder() {
  return (
    <>
      <div className="mx-auto flex h-8 w-full items-center justify-center rounded-lg px-2 text-sm text-[#97a3ba]">--</div>
      <div className="mt-1 flex items-center justify-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#d4dceb]" />
        <span className="text-xs text-[#9aa5bc]">{EMPTY_MARKET_STATUS.empty}</span>
      </div>
    </>
  );
}

function ComingSoonMarketPlaceholder() {
  return (
    <>
      <div className="mx-auto flex h-8 w-full items-center justify-center rounded-lg px-2 text-sm text-[#7f8da8]">--</div>
      <div className="mt-1 flex items-center justify-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#35bfc8]" />
        <span className="text-xs font-semibold text-[#35bfc8]">Coming Soon</span>
      </div>
    </>
  );
}

// Restore live eBay status tones when eBay goes live again.
// function toEbayStatusTone(status?: string) {
//   const normalized = String(status ?? "").toLowerCase();
//   if (normalized === "active") {
//     return {
//       dotClassName: "bg-[#2bc7c4]",
//       textClassName: "text-[#1b6d80]",
//       label: "Active",
//     };
//   }
//
//   if (normalized === "failed") {
//     return {
//       dotClassName: "bg-[#ea2e3f]",
//       textClassName: "text-[#b24646]",
//       label: "Failed",
//     };
//   }
//
//   if (normalized === "ended") {
//     return {
//       dotClassName: "bg-[#94a3b8]",
//       textClassName: "text-[#64748b]",
//       label: "Ended",
//     };
//   }
//
//   if (normalized === "draft") {
//     return {
//       dotClassName: "bg-[#e3b101]",
//       textClassName: "text-[#8a6c00]",
//       label: "Draft",
//     };
//   }
//
//   return {
//     dotClassName: "bg-[#d4dceb]",
//     textClassName: "text-[#9aa5bc]",
//     label: "Empty",
//   };
// }

export default function ProductsPage() {
  const products = useProductsPageStore((state) => state.products);
  const pagination = useProductsPageStore((state) => state.pagination);
  const searchQuery = useProductsPageStore((state) => state.searchQuery);
  const globalEditMode = useProductsPageStore((state) => state.globalEditMode);
  const isLoading = useProductsPageStore((state) => state.isLoading);
  const isImporting = useProductsPageStore((state) => state.isImporting);
  const pageMessage = useProductsPageStore((state) => state.pageMessage);
  const rowFeedbackById = useProductsPageStore((state) => state.rowFeedbackById);
  const hasHydrated = useProductsPageStore((state) => state.hasHydrated);
  const setSearchQuery = useProductsPageStore((state) => state.setSearchQuery);
  const toggleGlobalEditMode = useProductsPageStore((state) => state.toggleGlobalEditMode);
  const loadPage = useProductsPageStore((state) => state.loadPage);
  const importShopify = useProductsPageStore((state) => state.importShopify);
  const changePage = useProductsPageStore((state) => state.changePage);
  const updateShopifyPriceDraft = useProductsPageStore((state) => state.updateShopifyPriceDraft);
  const saveShopifyPrice = useProductsPageStore((state) => state.saveShopifyPrice);
  const updateStockDraft = useProductsPageStore((state) => state.updateStockDraft);
  const saveStock = useProductsPageStore((state) => state.saveStock);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    void loadPage(undefined, { refreshShopify: true });
  }, [hasHydrated, loadPage]);

  const showInitialLoading = !hasHydrated || (isLoading && products.length === 0);
  const showRefreshing = isLoading && products.length > 0;

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.title.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.shopifyProductId.toLowerCase().includes(query)
      );
    });
  }, [products, searchQuery]);

  const metrics = useMemo(() => {
    const lowStockCount = products.filter((product) => product.source === "shopify" && product.stock <= 10).length;
    const activeListings = products.filter((product) => product.source === "shopify" && product.status.toUpperCase() === "ACTIVE").length;
    // Restore this metric when eBay listings go live again:
    // const activeEbayListings = products.filter((product) => (product.ebayStatus ?? "").toLowerCase() === "active").length;
    const activeEbayListings = 0;
    const syncErrors = Object.values(rowFeedbackById).filter((feedback) => feedback.tone === "error").length;

    return {
      totalProducts: products.length,
      activeListings,
      activeEbayListings,
      lowStockCount,
      syncErrors,
    };
  }, [products, rowFeedbackById]);

  return (
    <section className="px-4 py-5 md:px-8 md:py-8">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl bg-[#283d6e] p-4 text-white shadow-[0_18px_40px_-28px_rgba(17,33,64,0.9)]">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0f5ff]">
              <Box className="h-5 w-5 text-[#2f3f63]" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#f2f6ff]">Total Products</p>
            <p className="mt-1 text-3xl font-semibold leading-none">{metrics.totalProducts}</p>
          </article>
          <article className="rounded-2xl bg-[#1a2548] p-4 text-white shadow-[0_18px_40px_-28px_rgba(17,33,64,0.9)]">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#d2fae7]">
              <CheckCircle2 className="h-5 w-5 text-[#29c5b8]" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#f2f6ff]">Active Shopify Listings</p>
            <p className="mt-1 text-3xl font-semibold leading-none">{metrics.activeListings}</p>
            <p className="mt-2 text-xs text-[#b7c6e4]">eBay: Coming Soon</p>
          </article>
          <article className="rounded-2xl bg-[#1a2548] p-4 text-white shadow-[0_18px_40px_-28px_rgba(17,33,64,0.9)]">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff7cb]">
              <AlertTriangle className="h-5 w-5 text-[#c98510]" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#f2f6ff]">Low Stock</p>
            <p className="mt-1 text-3xl font-semibold leading-none">{metrics.lowStockCount}</p>
          </article>
          <article className="rounded-2xl bg-[#1a2548] p-4 text-white shadow-[0_18px_40px_-28px_rgba(17,33,64,0.9)]">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#ffe5e7]">
              <CircleAlert className="h-5 w-5 text-[#ea2e3f]" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#f2f6ff]">Sync Errors</p>
            <p className="mt-1 text-3xl font-semibold leading-none">{metrics.syncErrors}</p>
          </article>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 md:flex-row lg:max-w-[710px]">
            <div className="relative w-full md:max-w-[390px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#96a3bc]" />
              <input
                className="h-11 w-full rounded-xl border border-[#d6dce9] bg-white py-2 pl-10 pr-3 text-sm text-[#243251] outline-none transition placeholder:text-[#8f9bb1] focus:border-[#98abcf]"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, SKU, Shopify ID, or Product AI ID..."
                type="text"
                value={searchQuery}
              />
            </div>

            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-5 text-sm font-semibold text-[#465574] transition hover:bg-[#f8fafe]"
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d5dcea] bg-white px-5 text-sm font-semibold text-[#465574] transition hover:bg-[#f8fafe] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isImporting}
              onClick={() => void importShopify()}
              type="button"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
              {isImporting ? "Importing..." : "Import Shopify"}
            </button>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#172544] px-5 text-sm font-semibold text-white transition hover:bg-[#101e3b]"
              href="/products/add"
            >
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

        <div className="overflow-hidden rounded-2xl border border-[#e1e6f0] bg-white">
          {showRefreshing ? (
            <div className="border-b border-[#edf1f7] px-4 py-3 text-sm text-[#6f7f9f] md:px-6">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing products...
              </div>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left">
              <thead className="text-xs font-semibold uppercase tracking-wide text-[#d8e4fb]">
                <tr>
                  <th className="w-14 bg-[#233a69] px-4 py-4 text-center">SL</th>
                  <th className="w-[118px] bg-[#233a69] px-4 py-4">Thumbnail</th>
                  <th className="w-[320px] bg-[#233a69] px-4 py-4">Product Details</th>
                  <th className="w-[130px] bg-[#233a69] px-4 py-4">Stock</th>
                  <th className="w-[180px] bg-[#1f7a43] px-4 py-4">
                    <p className="text-sm normal-case leading-none text-white">Shopify</p>
                    <p className="mt-1 text-[11px] normal-case text-white">Live Price</p>
                  </th>
                  <th className="w-[170px] bg-[#f8a100] px-4 py-4">
                    <p className="text-sm normal-case leading-none text-white">a Amazon</p>
                    <p className="mt-1 text-[11px] normal-case text-white">Price + Shipping</p>
                  </th>
                  <th className="w-[170px] bg-[#0b72de] px-4 py-4">
                    <p className="text-sm normal-case leading-none text-white">eb eBay</p>
                    <p className="mt-1 text-[11px] normal-case text-white">Coming Soon</p>
                  </th>
                  <th className="w-[170px] bg-gradient-to-r from-[#00d4d1] via-[#0ea4d6] to-[#eb0f67] px-4 py-4">
                    <p className="text-sm normal-case leading-none text-white">♪ TikTok</p>
                    <p className="mt-1 text-[11px] normal-case text-white">Shop Price</p>
                  </th>
                  <th className="w-[170px] bg-[#F1641E] px-4 py-4">
                    <p className="text-sm normal-case leading-none text-white">Etsy</p>
                    <p className="mt-1 text-[11px] normal-case text-white">Coming Soon</p>
                  </th>
                  <th className="w-[170px] bg-[#233a69] px-4 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {showInitialLoading ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-sm text-[#6f7f9f]" colSpan={10}>
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading products...
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product, index) => {
                    const canEdit = globalEditMode;
                    const stockTone = toStockTone(product.stock);
                    const rowFeedback = rowFeedbackById[product.id] ?? { tone: "idle", message: "" };

                    return (
                      <tr className="border-t border-[#e9eef7] text-sm text-[#44526d]" key={product.id}>
                        <td className="px-4 py-4 text-center">{index + 1}</td>
                        <td className="px-4 py-4">
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-[#e3e9f3] bg-[#f7f9fd]">
                            {product.featuredImage ? (
                              <Image
                                alt={product.title}
                                className="h-full w-full object-cover"
                                height={56}
                                src={product.featuredImage}
                                unoptimized
                                width={56}
                              />
                            ) : (
                              <div className="h-8 w-5 rounded-[3px] bg-[#d9e1ef]" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-lg font-semibold leading-tight text-[#202b44]">{product.title}</p>
                          <p className="mt-1 text-xs text-[#7d89a2]">SKU: {product.sku || "--"}</p>
                          <p className="mt-1 text-xs text-[#7d89a2]">
                            {product.vendor || "No vendor"}{product.productType ? ` • ${product.productType}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-[#9aa5bc]">
                            {product.source === "shopify" ? `Shopify: ${product.shopifyProductId}` : `Product AI: ${product.id}`}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {canEdit && product.source === "shopify" ? (
                              <input
                                className="h-8 w-[84px] rounded-lg border border-[#cfd8e7] bg-white px-2 text-center text-sm text-[#3f4d65] outline-none transition focus:border-[#90a5cd]"
                                min={0}
                                onBlur={() => void saveStock(product)}
                                onChange={(event) => updateStockDraft(product.id, event.target.value)}
                                type="number"
                                value={Number.isFinite(product.stock) ? product.stock : ""}
                              />
                          ) : (
                            <div className="mx-auto flex h-8 w-[84px] items-center justify-center rounded-lg px-2 text-center text-sm text-[#3f4d65]">
                              {product.source === "shopify" ? toStockDisplay(product.stock) : "--"}
                            </div>
                          )}
                          <p className={`mt-1 text-center text-xs ${product.source === "shopify" ? stockTone.className : "text-[#9aa5bc]"}`}>
                            {product.source === "shopify" ? stockTone.label : "Not synced"}
                          </p>
                        </td>
                        <td className="border-l border-[#cce7d7] px-4 py-4 text-center">
                          <div className="relative mx-auto w-[112px]">
                            {canEdit && product.source === "shopify" ? (
                              <>
                                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#95a1b8]">£</span>
                                <input
                                  className="h-8 w-full rounded-lg border border-[#cfd8e7] bg-white py-1 pl-6 pr-2 text-center text-sm text-[#3f4d65] outline-none transition focus:border-[#90a5cd]"
                                  onBlur={() => void saveShopifyPrice(product)}
                                  onChange={(event) => updateShopifyPriceDraft(product.id, event.target.value)}
                                  type="text"
                                  value={product.shopifyPrice}
                                />
                              </>
                            ) : (
                              <div className="mx-auto flex h-8 w-full items-center justify-center rounded-lg px-2 text-sm text-[#3f4d65]">
                                {product.shopifyPrice ? toCurrencyValue(product.shopifyPrice) : "--"}
                              </div>
                            )}
                          </div>
                          <div className="mt-1 flex items-center justify-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                product.source === "shopify"
                                  ? product.status.toUpperCase() === "ACTIVE"
                                    ? "bg-[#2bc7c4]"
                                    : "bg-[#e3b101]"
                                  : "bg-[#4a84ef]"
                              }`}
                            />
                            <span className="text-xs text-[#5b6e89]">
                              {product.source === "shopify" ? product.status || "DRAFT" : "AI Draft"}
                            </span>
                          </div>
                        </td>
                        <td className="border-l border-[#ffe0bc] px-4 py-4 text-center">
                          <MarketPlaceholder />
                        </td>
                        <td className="border-l border-[#d2e5ff] px-4 py-4 text-center">
                          <ComingSoonMarketPlaceholder />
                          {/* Restore live eBay status display when eBay goes live again.
                          {product.ebayListingId || product.ebayStatus ? (
                            <>
                              <div className="mx-auto flex h-8 w-full items-center justify-center rounded-lg px-2 text-sm text-[#3f4d65]">
                                {product.shopifyPrice ? toCurrencyValue(product.shopifyPrice) : "--"}
                              </div>
                              <div className="mt-1 flex items-center justify-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${toEbayStatusTone(product.ebayStatus).dotClassName}`} />
                                <span className={`text-xs ${toEbayStatusTone(product.ebayStatus).textClassName}`}>
                                  {product.ebayListingId ? `${toEbayStatusTone(product.ebayStatus).label} • ${product.ebayListingId}` : toEbayStatusTone(product.ebayStatus).label}
                                </span>
                              </div>
                            </>
                          ) : (
                            <MarketPlaceholder />
                          )}
                          */}
                        </td>
                        <td className="border-l border-[#f5d4e6] px-4 py-4 text-center">
                          <MarketPlaceholder />
                        </td>
                        <td className="border-l border-[#ffe4d6] px-4 py-4 text-center">
                          <ComingSoonMarketPlaceholder />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-3">
                              <Link
                                className="text-[#223763] transition hover:text-[#121f39]"
                                href={`/products/${product.id}?source=${product.source}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              <Link
                                className="text-[#223763] transition hover:text-[#121f39]"
                                href={`/products/add?id=${product.id}&source=${product.source}`}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Link>
                            </div>
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
                              {rowFeedback.message || (
                                product.source === "shopify"
                                  ? globalEditMode
                                    ? "Blur field to sync Shopify."
                                    : "View details. Inline edit is available here."
                                  : product.source === "commandctr"
                                    ? "View or edit backend product record. eBay and Etsy are coming soon."
                                    : "View or edit Product AI record"
                              )}
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

          {!showInitialLoading && filteredProducts.length === 0 ? (
            <div className="border-t border-[#edf1f7] px-4 py-6 text-center text-sm text-[#6f7f9f] md:px-6">
              {products.length === 0 ? "No products found yet. Import Shopify data or upload one from the AI product flow." : `No products found for "${searchQuery}".`}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[#e1e6f0] bg-white px-4 py-3 text-xs text-[#7b89a6]">
          <p>Showing {filteredProducts.length} rows. Product AI draft page {pagination.page}{pagination.total_pages ? ` of ${pagination.total_pages}` : ""} remains included in this combined view.</p>
          <div className="text-right text-[#8c99b2]">eBay and Etsy channels are marked Coming Soon.</div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            className="rounded-xl border border-[#c7d3e6] px-4 py-1.5 font-semibold text-[#60708d] disabled:opacity-50"
            disabled={pagination.page <= 1 || showInitialLoading}
            onClick={() => void changePage(pagination.page - 1)}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded-xl border border-[#c7d3e6] px-4 py-1.5 font-semibold text-[#60708d] disabled:opacity-50"
            disabled={pagination.total_pages === 0 || pagination.page >= pagination.total_pages || showInitialLoading}
            onClick={() => void changePage(pagination.page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
