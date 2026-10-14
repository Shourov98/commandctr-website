"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { ApiClientError } from "@/lib/auth";
import { productsApi, type ProductListItem, type ShopifyInventoryLevel } from "@/lib/products";

export type ExternalMarketState = "empty";

export type ProductRow = {
  id: string;
  shopifyProductId: string;
  title: string;
  sku: string;
  vendor: string;
  productType: string;
  status: string;
  stock: number;
  featuredImage?: string;
  shopifyPrice: string;
  shopifyVariantId?: string;
  inventoryItemId?: string;
  inventoryLocationId?: string;
  source: "shopify" | "product_ai" | "twinstr" | "commandctr";
  marketplace?: string;
  ebayStatus?: string;
  ebayListingId?: string;
  ebayOfferId?: string;
  ebayInventoryItemId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RowFeedback = {
  tone: "idle" | "saving" | "success" | "error";
  message: string;
};

function toSafeStock(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function getInventoryLevelQuantity(level: ShopifyInventoryLevel) {
  return toSafeStock(level.quantity ?? level.shopifyQuantity ?? level.availableQuantity);
}

function getInventoryLevelProductId(level: ShopifyInventoryLevel) {
  return level.productId ?? level.shopifyProductId ?? "";
}

function usableImageUrl(value?: string | null) {
  const url = value?.trim();
  if (!url) {
    return undefined;
  }
  if (/\/ebay\.png(?:$|\?)/i.test(url)) {
    return undefined;
  }
  return url;
}

export type ProductAiListItem = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  normalized_title: string;
  category: string;
  product_type: string;
  preview_image_path: string;
  default_price?: string | null;
};

type ProductAiProductsResponse = {
  items: ProductAiListItem[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
};

type PaginationState = {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
};

type LoadPageOptions = {
  refreshShopify?: boolean;
  syncShopify?: boolean;
};

const PRODUCTS_PAGE_REFRESH_INTERVAL_MS = 60_000;
const SHOPIFY_SYNC_INTERVAL_MS = 5 * 60_000;

type ProductsPageState = {
  products: ProductRow[];
  pagination: PaginationState;
  searchQuery: string;
  globalEditMode: boolean;
  isLoading: boolean;
  isImporting: boolean;
  pageMessage: string;
  rowFeedbackById: Record<string, RowFeedback>;
  shopifyRowsCache: ProductRow[];
  hasLoadedShopifyCache: boolean;
  hasLoadedOnce: boolean;
  hasHydrated: boolean;
  lastLoadedAt: number | null;
  lastShopifySyncedAt: number | null;
  setSearchQuery: (value: string) => void;
  toggleGlobalEditMode: () => void;
  markHydrated: () => void;
  shouldRefresh: () => boolean;
  loadPage: (page?: number, options?: LoadPageOptions) => Promise<void>;
  importShopify: () => Promise<void>;
  changePage: (nextPage: number) => Promise<void>;
  deleteProduct: (row: ProductRow) => Promise<void>;
  updateShopifyPriceDraft: (rowId: string, nextPrice: string) => void;
  saveShopifyPrice: (row: ProductRow) => Promise<void>;
  updateStockDraft: (rowId: string, nextStock: string) => void;
  saveStock: (row: ProductRow) => Promise<void>;
};

function getProductDocumentId(product: ProductListItem) {
  return product._id ?? product.id ?? product.shopifyProductId ?? product.title;
}

function buildInventoryLocationMap(levels: ShopifyInventoryLevel[]) {
  return new Map(
    levels
      .filter((level) => level.inventoryItemId && level.locationId)
      .map((level) => [level.inventoryItemId, level.locationId]),
  );
}

function buildInventoryQuantityByItemId(levels: ShopifyInventoryLevel[]) {
  const totals = new Map<string, number>();

  for (const level of levels) {
    if (!level.inventoryItemId) {
      continue;
    }

    totals.set(level.inventoryItemId, (totals.get(level.inventoryItemId) ?? 0) + getInventoryLevelQuantity(level));
  }

  return totals;
}

function buildInventoryQuantityByProductId(levels: ShopifyInventoryLevel[]) {
  const totals = new Map<string, number>();

  for (const level of levels) {
    const productId = getInventoryLevelProductId(level);
    if (!productId) {
      continue;
    }

    totals.set(productId, (totals.get(productId) ?? 0) + getInventoryLevelQuantity(level));
  }

  return totals;
}

function mapProductRows(products: ProductListItem[], inventoryLevels: ShopifyInventoryLevel[]) {
  const inventoryLocationByItemId = buildInventoryLocationMap(inventoryLevels);
  const inventoryQuantityByItemId = buildInventoryQuantityByItemId(inventoryLevels);
  const inventoryQuantityByProductId = buildInventoryQuantityByProductId(inventoryLevels);

  return products.map<ProductRow>((product) => {
    const primaryVariant = product.variants[0];
    const inventoryItemId = primaryVariant?.inventoryItemId;
    const shopifyLookupId = product.shopifyProductId;
    const liveStock =
      (inventoryItemId ? inventoryQuantityByItemId.get(inventoryItemId) : undefined)
      ?? (shopifyLookupId ? inventoryQuantityByProductId.get(shopifyLookupId) : undefined)
      ?? primaryVariant?.inventoryQuantity
      ?? product.totalInventory
      ?? 0;

    return {
      id: getProductDocumentId(product),
      shopifyProductId: product.shopifyProductId ?? product._id ?? product.id ?? "",
      title: product.title,
      sku: primaryVariant?.sku ?? "",
      vendor: product.vendor ?? "",
      productType: product.productType ?? "",
      status: product.status ?? "DRAFT",
      stock: toSafeStock(liveStock),
      featuredImage: usableImageUrl(product.featuredImage),
      shopifyPrice: primaryVariant?.price ?? "",
      shopifyVariantId: primaryVariant?.shopifyVariantId,
      inventoryItemId,
      inventoryLocationId: inventoryItemId ? (inventoryLocationByItemId.get(inventoryItemId) ?? "") : "",
      source: (product.marketplace ?? "shopify") === "shopify" ? "shopify" : "twinstr",
      marketplace: product.marketplace,
      ebayStatus: product.ebayStatus,
      ebayListingId: product.ebayListingId,
      ebayOfferId: product.ebayOfferId,
      ebayInventoryItemId: product.ebayInventoryItemId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  });
}

function mapProductAiRows(products: ProductAiListItem[]) {
  return products.map<ProductRow>((product) => ({
    id: product.id,
    shopifyProductId: `product-ai:${product.id}`,
    title: product.normalized_title,
    sku: "",
    vendor: "Product AI Agent",
    productType: product.product_type,
    status: product.status ?? "DRAFT",
    stock: 0,
    featuredImage: usableImageUrl(product.preview_image_path),
    shopifyPrice: product.default_price?.trim() ?? "",
    marketplace: "product_ai",
    source: "product_ai",
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  }));
}

function sortProductRows(rows: ProductRow[]) {
  return [...rows].sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt ?? left.createdAt ?? "");
    const rightTime = Date.parse(right.updatedAt ?? right.createdAt ?? "");
    const safeLeftTime = Number.isFinite(leftTime) ? leftTime : 0;
    const safeRightTime = Number.isFinite(rightTime) ? rightTime : 0;
    if (safeRightTime !== safeLeftTime) {
      return safeRightTime - safeLeftTime;
    }

    const leftShopifyId = Number(left.shopifyProductId.match(/(\d+)$/)?.[1] ?? 0);
    const rightShopifyId = Number(right.shopifyProductId.match(/(\d+)$/)?.[1] ?? 0);
    return rightShopifyId - leftShopifyId;
  });
}

async function fetchProductAiPage(page: number, pageSize: number) {
  const response = await fetch(`/api/product-ai/products?page=${page}&page_size=${pageSize}`, { cache: "no-store" });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(errorBody?.detail ?? "Could not load AI-generated products.");
  }

  return (await response.json()) as ProductAiProductsResponse;
}

export const useProductsPageStore = create<ProductsPageState>()(
  persist(
    (set, get) => ({
      products: [],
      pagination: { page: 1, page_size: 20, total_items: 0, total_pages: 0 },
      searchQuery: "",
      globalEditMode: false,
      isLoading: false,
      isImporting: false,
      pageMessage: "",
      rowFeedbackById: {},
      shopifyRowsCache: [],
      hasLoadedShopifyCache: false,
      hasLoadedOnce: false,
      hasHydrated: false,
      lastLoadedAt: null,
      lastShopifySyncedAt: null,
      setSearchQuery: (value) => set({ searchQuery: value }),
      toggleGlobalEditMode: () => set((state) => ({ globalEditMode: !state.globalEditMode })),
      markHydrated: () => set({ hasHydrated: true }),
      shouldRefresh: () => {
        const { lastLoadedAt } = get();
        return !lastLoadedAt || Date.now() - lastLoadedAt > PRODUCTS_PAGE_REFRESH_INTERVAL_MS;
      },
      async loadPage(page, options) {
        const state = get();
        const targetPage = page ?? state.pagination.page;
        const refreshShopify = options?.refreshShopify ?? false;
        const syncShopify = options?.syncShopify ?? false;

        if (state.isLoading && state.hasLoadedOnce && !refreshShopify) {
          return;
        }

        set({ isLoading: true });

        try {
          let shopifyRows = state.shopifyRowsCache;
          if (!state.hasLoadedShopifyCache || refreshShopify) {
            const [productItems, inventoryLevels] = await Promise.all([
              productsApi.getProducts(),
              productsApi.getShopifyInventory(),
            ]);
            shopifyRows = mapProductRows(productItems, inventoryLevels);
          }

          let productAiPayload: ProductAiProductsResponse | null = null;
          let productAiMessage = "";
          try {
            productAiPayload = await fetchProductAiPage(targetPage, state.pagination.page_size);
          } catch (error) {
            productAiMessage = error instanceof Error ? error.message : "Could not load AI-generated products.";
          }

          set({
            products: sortProductRows([...shopifyRows, ...mapProductAiRows(productAiPayload?.items ?? [])]),
            pagination: productAiPayload?.pagination ?? {
              ...state.pagination,
              page: targetPage,
              total_items: 0,
              total_pages: 0,
            },
            shopifyRowsCache: shopifyRows,
            hasLoadedShopifyCache: true,
            hasLoadedOnce: true,
            lastLoadedAt: Date.now(),
            pageMessage: productAiMessage,
          });

          const shouldSyncShopify =
            syncShopify &&
            (!state.lastShopifySyncedAt || Date.now() - state.lastShopifySyncedAt > SHOPIFY_SYNC_INTERVAL_MS);
          if (shouldSyncShopify) {
            void (async () => {
              try {
                await productsApi.syncShopifyProducts();
                const [productItems, inventoryLevels] = await Promise.all([
                  productsApi.getProducts(),
                  productsApi.getShopifyInventory(),
                ]);
                const nextShopifyRows = mapProductRows(productItems, inventoryLevels);
                const current = get();
                set({
                  products: sortProductRows([
                    ...nextShopifyRows,
                    ...current.products.filter((row) => row.source === "product_ai"),
                  ]),
                  shopifyRowsCache: nextShopifyRows,
                  hasLoadedShopifyCache: true,
                  lastShopifySyncedAt: Date.now(),
                  pageMessage: current.pageMessage,
                });
              } catch {
                set({ pageMessage: "Products loaded from database. Shopify background sync did not complete." });
              }
            })();
          }
        } catch (error) {
          set({
            pageMessage: error instanceof ApiClientError ? error.message : error instanceof Error ? error.message : "Could not load product listings.",
          });
        } finally {
          set({ isLoading: false });
        }
      },
      async importShopify() {
        set({ isImporting: true, pageMessage: "" });

        try {
          const result = await productsApi.importShopifyProducts();
          await get().loadPage(get().pagination.page, { refreshShopify: true });
          set({ pageMessage: `Imported ${result.count} Shopify products.`, lastShopifySyncedAt: Date.now() });
        } catch (error) {
          set({
            pageMessage: error instanceof ApiClientError ? error.message : "Could not import Shopify products.",
          });
        } finally {
          set({ isImporting: false });
        }
      },
      async changePage(nextPage) {
        const { pagination } = get();
        if (nextPage < 1 || (pagination.total_pages > 0 && nextPage > pagination.total_pages)) {
          return;
        }

        await get().loadPage(nextPage);
      },
      async deleteProduct(row) {
        set((state) => ({
          rowFeedbackById: {
            ...state.rowFeedbackById,
            [row.id]: { tone: "saving", message: row.source === "shopify" ? "Deleting from Shopify..." : "Deleting product..." },
          },
        }));

        try {
          if (row.source === "product_ai") {
            const response = await productsApi.deleteProductAiProduct(row.id);
            if (!response.ok) {
              const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
              throw new Error(errorBody?.detail ?? "Could not delete Product AI record.");
            }
          } else {
            await productsApi.deleteProduct(row.id);
          }

          set((state) => ({
            products: state.products.filter((product) => product.id !== row.id),
            shopifyRowsCache: state.shopifyRowsCache.filter((product) => product.id !== row.id),
            rowFeedbackById: Object.fromEntries(Object.entries(state.rowFeedbackById).filter(([id]) => id !== row.id)),
            pageMessage: row.source === "shopify" ? "Product deleted from Shopify and Twinstr." : "Product deleted.",
          }));
        } catch (error) {
          set((state) => ({
            rowFeedbackById: {
              ...state.rowFeedbackById,
              [row.id]: {
                tone: "error",
                message:
                  error instanceof ApiClientError
                    ? error.message
                    : error instanceof Error
                      ? error.message
                      : "Could not delete product.",
              },
            },
          }));
          throw error;
        }
      },
      updateShopifyPriceDraft(rowId, nextPrice) {
        set((state) => ({
          products: state.products.map((row) => (row.id === rowId ? { ...row, shopifyPrice: nextPrice } : row)),
        }));
      },
      async saveShopifyPrice(row) {
        const { globalEditMode } = get();
        if (!globalEditMode || row.source !== "shopify" || !row.shopifyVariantId) {
          return;
        }

        const normalizedPrice = row.shopifyPrice.trim();
        const numericPrice = Number(normalizedPrice);

        if (!normalizedPrice || !Number.isFinite(numericPrice) || numericPrice < 0) {
          set((state) => ({
            rowFeedbackById: {
              ...state.rowFeedbackById,
              [row.id]: { tone: "error", message: "Shopify price must be a valid number." },
            },
          }));
          return;
        }

        set((state) => ({
          rowFeedbackById: {
            ...state.rowFeedbackById,
            [row.id]: { tone: "saving", message: "Updating Shopify price..." },
          },
        }));

        try {
          const result = await productsApi.updateShopifyVariantPrice(row.shopifyProductId, {
            variantId: row.shopifyVariantId,
            price: numericPrice.toFixed(2),
          });

          set((state) => ({
            products: state.products.map((current) =>
              current.id === row.id
                ? {
                    ...current,
                    shopifyPrice: result.price ?? numericPrice.toFixed(2),
                  }
                : current,
            ),
            rowFeedbackById: {
              ...state.rowFeedbackById,
              [row.id]: { tone: "success", message: "Shopify price updated." },
            },
          }));
        } catch (error) {
          set((state) => ({
            rowFeedbackById: {
              ...state.rowFeedbackById,
              [row.id]: {
                tone: "error",
                message: error instanceof ApiClientError ? error.message : "Could not update Shopify price.",
              },
            },
          }));
        }
      },
      updateStockDraft(rowId, nextStock) {
        const numericValue = Number(nextStock);
        set((state) => ({
          products: state.products.map((row) =>
            row.id === rowId
              ? {
                  ...row,
                  stock: Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0,
                }
              : row,
          ),
        }));
      },
      async saveStock(row) {
        const { globalEditMode } = get();
        if (!globalEditMode || row.source !== "shopify") {
          return;
        }

        if (!row.inventoryItemId || !row.inventoryLocationId) {
          set((state) => ({
            rowFeedbackById: {
              ...state.rowFeedbackById,
              [row.id]: { tone: "error", message: "No Shopify inventory location was found for this product." },
            },
          }));
          return;
        }

        set((state) => ({
          rowFeedbackById: {
            ...state.rowFeedbackById,
            [row.id]: { tone: "saving", message: "Updating Shopify stock..." },
          },
        }));

        try {
          await productsApi.updateShopifyInventory(row.inventoryItemId, {
            locationId: row.inventoryLocationId,
            quantity: row.stock,
          });

          set((state) => ({
            rowFeedbackById: {
              ...state.rowFeedbackById,
              [row.id]: { tone: "success", message: "Shopify stock updated." },
            },
          }));
        } catch (error) {
          set((state) => ({
            rowFeedbackById: {
              ...state.rowFeedbackById,
              [row.id]: {
                tone: "error",
                message: error instanceof ApiClientError ? error.message : "Could not update Shopify stock.",
              },
            },
          }));
        }
      },
    }),
    {
      name: "twinstr-products-page",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<ProductsPageState> | undefined;
        return {
          searchQuery: state?.searchQuery ?? "",
          globalEditMode: state?.globalEditMode ?? false,
        };
      },
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        globalEditMode: state.globalEditMode,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
