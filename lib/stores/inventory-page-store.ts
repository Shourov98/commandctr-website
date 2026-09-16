"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { ApiClientError, AUTH_REQUIRED_MESSAGE, isAuthRequiredError } from "@/lib/auth";
// Restore ebayApi when eBay inventory is enabled again:
// import { ebayApi, type EbayInventoryLevel } from "@/lib/ebay";
import { type EbayInventoryLevel } from "@/lib/ebay";
import { productsApi, type InventoryRecord, type ProductListItem, type ShopifyInventoryLevel } from "@/lib/products";

export type InventoryRow = {
  id: string;
  productDocumentId?: string;
  ebayProductId?: string;
  shopifyProductId: string;
  inventoryItemId: string;
  locationId: string;
  locationName: string;
  title: string;
  sku: string;
  featuredImage?: string;
  masterCount: number;
  shopifyQuantity?: number;
  ebayQuantity?: number;
  ebayListingId?: string;
  ebayStatus?: string;
  ebaySyncError?: string;
  available: number;
  safetyBuffer: number;
  lowStockThreshold: number;
};

export type InventoryRowFeedback = {
  tone: "idle" | "saving" | "success" | "error";
  message: string;
};

type LoadInventoryOptions = {
  forceRefresh?: boolean;
};

type InventoryPageState = {
  items: InventoryRow[];
  searchQuery: string;
  globalEditMode: boolean;
  isLoading: boolean;
  isImporting: boolean;
  hasHydrated: boolean;
  hasLoadedOnce: boolean;
  lastLoadedAt: number | null;
  pageMessage: string;
  rowFeedbackById: Record<string, InventoryRowFeedback>;
  setSearchQuery: (value: string) => void;
  toggleGlobalEditMode: () => void;
  markHydrated: () => void;
  shouldRefresh: () => boolean;
  loadInventory: (options?: LoadInventoryOptions) => Promise<void>;
  importInventory: () => Promise<void>;
  updateRowFeedback: (rowId: string, feedback: InventoryRowFeedback) => void;
  updateMasterCountDraft: (rowId: string, value: string) => void;
  updateEbayQuantityDraft: (rowId: string, value: string) => void;
  updateSafetyBufferDraft: (rowId: string, value: string) => void;
  saveMasterCount: (row: InventoryRow) => Promise<void>;
  saveEbayQuantity: (row: InventoryRow) => Promise<void>;
  saveSafetyBuffer: (row: InventoryRow) => Promise<void>;
};

const INVENTORY_PAGE_REFRESH_INTERVAL_MS = 60_000;
const EBAY_COMING_SOON = true;

function clampNonNegative(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function getDocumentId(record: InventoryRecord) {
  return record._id ?? record.id ?? `${record.inventoryItemId}:${record.locationId ?? ""}`;
}

function getInventoryKey(inventoryItemId: string, locationId?: string | null) {
  return `${inventoryItemId}:${locationId ?? ""}`;
}

function getTimestampValue(value?: string) {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getShopifyNumericId(value?: string) {
  if (!value) {
    return 0;
  }

  const match = value.match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : 0;
}

function normalizeSku(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function stripInventorySortFields(
  row: InventoryRow & { sortUpdatedAt: number; sortShopifyId: number },
): InventoryRow {
  const inventoryRow: InventoryRow & { sortUpdatedAt?: number; sortShopifyId?: number } = { ...row };
  delete inventoryRow.sortUpdatedAt;
  delete inventoryRow.sortShopifyId;
  return inventoryRow;
}

function mergeEbayInventory(rows: InventoryRow[], ebayLevels: EbayInventoryLevel[]) {
  const nextRows: InventoryRow[] = rows.map((row) => ({ ...row, shopifyQuantity: row.masterCount }));
  const rowIndexBySku = new Map(
    nextRows
      .map((row, index) => [normalizeSku(row.sku), index] as const)
      .filter(([sku]) => Boolean(sku) && sku !== "n/a"),
  );

  for (const level of ebayLevels) {
    const quantity = clampNonNegative(level.quantity);
    const matchingIndex = rowIndexBySku.get(normalizeSku(level.sku));

    if (matchingIndex !== undefined) {
      nextRows[matchingIndex] = {
        ...nextRows[matchingIndex],
        ebayProductId: level.productId,
        ebayQuantity: quantity,
        ebayListingId: level.listingId,
        ebayStatus: level.status,
        ebaySyncError: level.syncError,
        featuredImage: nextRows[matchingIndex].featuredImage ?? level.featuredImage,
      };
      continue;
    }

    nextRows.push({
      id: `ebay:${level.productId}`,
      productDocumentId: level.productId,
      ebayProductId: level.productId,
      shopifyProductId: "",
      inventoryItemId: level.inventoryItemId,
      locationId: "",
      locationName: "eBay Sandbox",
      title: level.title || "Untitled product",
      sku: level.sku || "N/A",
      featuredImage: level.featuredImage,
      masterCount: quantity,
      ebayQuantity: quantity,
      ebayListingId: level.listingId,
      ebayStatus: level.status,
      ebaySyncError: level.syncError,
      available: quantity,
      safetyBuffer: 0,
      lowStockThreshold: 5,
    });
  }

  return nextRows;
}

function mapInventoryRows(
  inventory: InventoryRecord[],
  products: ProductListItem[],
  liveLevels: ShopifyInventoryLevel[],
  ebayLevels: EbayInventoryLevel[],
) {
  const productByShopifyId = new Map(products.map((product) => [product.shopifyProductId, product]));
  const liveByInventoryKey = new Map(liveLevels.map((level) => [getInventoryKey(level.inventoryItemId, level.locationId), level]));
  const activeInventory = inventory.filter((record) => record.isActive !== false);
  const inventoryByKey = new Map(activeInventory.map((record) => [getInventoryKey(record.inventoryItemId, record.locationId), record]));

  if (liveLevels.length > 0) {
    const rows = liveLevels.map((level) => {
      const key = getInventoryKey(level.inventoryItemId, level.locationId);
      const record = inventoryByKey.get(key);
      const product = productByShopifyId.get(level.productId) ?? (record?.shopifyProductId ? productByShopifyId.get(record.shopifyProductId) : undefined);
      const masterCount = clampNonNegative(level.quantity);
      const safetyBuffer = clampNonNegative(record?.safetyBuffer ?? 0);
      const lowStockThreshold = clampNonNegative(record?.lowStockThreshold ?? 5);
      const derivedId = `${level.inventoryItemId}:${level.locationId || "unknown"}`;
      const rowId = record ? getDocumentId(record) : derivedId;
      const available = clampNonNegative(masterCount - safetyBuffer);

      return {
        id: rowId,
        productDocumentId: product?._id ?? product?.id ?? record?.productId,
        shopifyProductId: record?.shopifyProductId ?? level.productId,
        inventoryItemId: level.inventoryItemId,
        locationId: level.locationId ?? "",
        locationName: record?.locationName ?? level.locationName ?? "Shopify",
        title: product?.title ?? record?.title ?? level.productTitle ?? "Untitled product",
        sku: record?.sku ?? level.sku ?? product?.variants[0]?.sku ?? "N/A",
        featuredImage: product?.featuredImage,
        masterCount,
        available,
        safetyBuffer,
        lowStockThreshold,
        sortUpdatedAt: Math.max(getTimestampValue(product?.updatedAt), getTimestampValue(record?.updatedAt)),
        sortShopifyId: getShopifyNumericId(record?.shopifyProductId ?? level.productId),
      };
    });

    rows.sort((a, b) => {
      if (b.sortUpdatedAt !== a.sortUpdatedAt) {
        return b.sortUpdatedAt - a.sortUpdatedAt;
      }

      return b.sortShopifyId - a.sortShopifyId;
    });

    return mergeEbayInventory(
      rows.map(stripInventorySortFields),
      ebayLevels,
    );
  }

  const rows = activeInventory.map((record) => {
    const product = record.shopifyProductId ? productByShopifyId.get(record.shopifyProductId) : undefined;
    const liveLevel = liveByInventoryKey.get(getInventoryKey(record.inventoryItemId, record.locationId));
    const masterCount = clampNonNegative(liveLevel?.quantity ?? record.shopifyQuantity ?? 0);
    const safetyBuffer = clampNonNegative(record.safetyBuffer ?? 0);
    const available = clampNonNegative(masterCount - safetyBuffer);
    const lowStockThreshold = clampNonNegative(record.lowStockThreshold ?? 5);

    return {
      id: getDocumentId(record),
      productDocumentId: product?._id ?? product?.id ?? record.productId,
      shopifyProductId: record.shopifyProductId ?? product?.shopifyProductId ?? "",
      inventoryItemId: record.inventoryItemId,
      locationId: record.locationId ?? "",
      locationName: record.locationName ?? liveLevel?.locationName ?? "",
      title: product?.title ?? record.title ?? liveLevel?.productTitle ?? "Untitled product",
      sku: record.sku ?? liveLevel?.sku ?? product?.variants[0]?.sku ?? "",
      featuredImage: product?.featuredImage,
      masterCount,
      available,
      safetyBuffer,
      lowStockThreshold,
      sortUpdatedAt: Math.max(getTimestampValue(product?.updatedAt), getTimestampValue(record.updatedAt)),
      sortShopifyId: getShopifyNumericId(record.shopifyProductId ?? product?.shopifyProductId),
    };
  });

  rows.sort((a, b) => {
    if (b.sortUpdatedAt !== a.sortUpdatedAt) {
      return b.sortUpdatedAt - a.sortUpdatedAt;
    }

    return b.sortShopifyId - a.sortShopifyId;
  });

  return mergeEbayInventory(
    rows.map(stripInventorySortFields),
    ebayLevels,
  );
}

async function fetchInventoryData() {
  const [inventory, products, liveInventory] = await Promise.all([
    productsApi.getInventory(),
    productsApi.getProducts(),
    productsApi.getShopifyInventory(),
  ]);
  // Restore live eBay inventory merge when eBay goes live again:
  // const ebayInventory = await ebayApi.getInventory();
  const ebayInventory: EbayInventoryLevel[] = [];

  return mapInventoryRows(inventory, products, liveInventory, ebayInventory);
}

const resetInventoryState = () => ({
  items: [],
  hasLoadedOnce: false,
  lastLoadedAt: null,
  rowFeedbackById: {},
});

export const useInventoryPageStore = create<InventoryPageState>()(
  persist(
    (set, get) => ({
      items: [],
      searchQuery: "",
      globalEditMode: false,
      isLoading: false,
      isImporting: false,
      hasHydrated: false,
      hasLoadedOnce: false,
      lastLoadedAt: null,
      pageMessage: "",
      rowFeedbackById: {},
      setSearchQuery: (value) => set({ searchQuery: value }),
      toggleGlobalEditMode: () => set((state) => ({ globalEditMode: !state.globalEditMode })),
      markHydrated: () => set({ hasHydrated: true }),
      shouldRefresh: () => {
        const { lastLoadedAt } = get();
        return !lastLoadedAt || Date.now() - lastLoadedAt > INVENTORY_PAGE_REFRESH_INTERVAL_MS;
      },
      async loadInventory(options) {
        const forceRefresh = options?.forceRefresh ?? false;
        const state = get();

        if (state.isLoading && state.hasLoadedOnce && !forceRefresh) {
          return;
        }

        set({ isLoading: true });

        try {
          const rows = await fetchInventoryData();
          set({
            items: rows,
            hasLoadedOnce: true,
            lastLoadedAt: Date.now(),
            pageMessage: "",
          });
        } catch (error) {
          if (isAuthRequiredError(error)) {
            set({
              ...resetInventoryState(),
              pageMessage: AUTH_REQUIRED_MESSAGE,
            });
            return;
          }

          set({
            pageMessage: error instanceof ApiClientError ? error.message : "Could not load inventory.",
          });
        } finally {
          set({ isLoading: false });
        }
      },
      async importInventory() {
        set({ isImporting: true, pageMessage: "" });

        try {
          const result = await productsApi.importShopifyProducts();
          await get().loadInventory({ forceRefresh: true });
          const staleCount = result.staleMarkedInactiveCount ?? 0;
          set({
            pageMessage:
              staleCount > 0 ? `Inventory refreshed. ${staleCount} stale rows hidden.` : `Imported ${result.count} Shopify products and refreshed inventory.`,
          });
        } catch (error) {
          if (isAuthRequiredError(error)) {
            set({
              ...resetInventoryState(),
              pageMessage: AUTH_REQUIRED_MESSAGE,
            });
            return;
          }

          set({
            pageMessage: error instanceof ApiClientError ? error.message : "Could not import Shopify inventory.",
          });
        } finally {
          set({ isImporting: false });
        }
      },
      updateRowFeedback: (rowId, feedback) =>
        set((state) => ({
          rowFeedbackById: {
            ...state.rowFeedbackById,
            [rowId]: feedback,
          },
        })),
      updateMasterCountDraft: (rowId, value) => {
        const numericValue = Number(value);
        set((state) => ({
          items: state.items.map((item) =>
            item.id === rowId
              ? {
                  ...item,
                  masterCount: Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0,
                  shopifyQuantity: Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0,
                  available: Math.max(0, (Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0) - item.safetyBuffer),
                }
              : item,
          ),
        }));
      },
      updateEbayQuantityDraft: (rowId, value) => {
        const numericValue = Number(value);
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== rowId) {
              return item;
            }

            const ebayQuantity = Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
            return {
              ...item,
              ebayQuantity,
              ...(!item.shopifyProductId ? { available: ebayQuantity, masterCount: ebayQuantity } : {}),
            };
          }),
        }));
      },
      updateSafetyBufferDraft: (rowId, value) => {
        const numericValue = Number(value);
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== rowId) {
              return item;
            }

            const nextSafetyBuffer = Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
            return {
              ...item,
              safetyBuffer: nextSafetyBuffer,
              available: Math.max(0, item.masterCount - nextSafetyBuffer),
            };
          }),
        }));
      },
      async saveMasterCount(row) {
        const { globalEditMode } = get();
        if (!globalEditMode) {
          return;
        }

        if (!row.locationId) {
          get().updateRowFeedback(row.id, {
            tone: "error",
            message: "No Shopify location is available for this inventory row.",
          });
          return;
        }

        get().updateRowFeedback(row.id, {
          tone: "saving",
          message: "Updating Shopify inventory...",
        });

        try {
          await productsApi.updateShopifyInventory(row.inventoryItemId, {
            locationId: row.locationId,
            quantity: row.masterCount,
          });
          await get().loadInventory({ forceRefresh: true });
          get().updateRowFeedback(row.id, {
            tone: "success",
            message: "Shopify inventory updated.",
          });
        } catch (error) {
          get().updateRowFeedback(row.id, {
            tone: "error",
            message: error instanceof ApiClientError ? error.message : "Could not update Shopify inventory.",
          });
        }
      },
      async saveEbayQuantity(row) {
        const { globalEditMode } = get();
        if (!globalEditMode || !row.ebayProductId || row.ebayQuantity === undefined) {
          return;
        }

        if (EBAY_COMING_SOON) {
          get().updateRowFeedback(row.id, {
            tone: "idle",
            message: "eBay inventory is coming soon.",
          });
          return;
        }

        get().updateRowFeedback(row.id, {
          tone: "saving",
          message: "Updating eBay inventory...",
        });

        try {
          // Restore the live update call when eBay goes live again:
          // await ebayApi.updateInventory(row.ebayProductId, row.ebayQuantity);
          await get().loadInventory({ forceRefresh: true });
          get().updateRowFeedback(row.id, {
            tone: "success",
            message: "eBay inventory updated.",
          });
        } catch (error) {
          get().updateRowFeedback(row.id, {
            tone: "error",
            message: error instanceof ApiClientError ? error.message : "Could not update eBay inventory.",
          });
        }
      },
      async saveSafetyBuffer(row) {
        const { globalEditMode } = get();
        if (!globalEditMode) {
          return;
        }

        get().updateRowFeedback(row.id, {
          tone: "saving",
          message: "Saving safety buffer...",
        });

        try {
          await productsApi.updateInventorySafetyBuffer(row.id, row.safetyBuffer);
          await get().loadInventory({ forceRefresh: true });
          get().updateRowFeedback(row.id, {
            tone: "success",
            message: "Safety buffer updated.",
          });
        } catch (error) {
          get().updateRowFeedback(row.id, {
            tone: "error",
            message: error instanceof ApiClientError ? error.message : "Could not update safety buffer.",
          });
        }
      },
    }),
    {
      name: "commandctr-inventory-page",
      partialize: (state) => ({
        items: state.items,
        searchQuery: state.searchQuery,
        globalEditMode: state.globalEditMode,
        hasLoadedOnce: state.hasLoadedOnce,
        lastLoadedAt: state.lastLoadedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }

        state.markHydrated();
      },
    },
  ),
);
