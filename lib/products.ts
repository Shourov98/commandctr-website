import { requestWithAuth } from "@/lib/auth";

export type ProductListVariant = {
  shopifyVariantId?: string;
  title: string;
  sku?: string;
  price?: string;
  compareAtPrice?: string | null;
  inventoryQuantity?: number;
  inventoryItemId?: string;
};

export type ProductListItem = {
  _id?: string;
  id?: string;
  marketplace?: string;
  shopifyProductId?: string;
  productAiProductId?: string;
  title: string;
  description?: string;
  handle?: string;
  vendor?: string;
  productType?: string;
  status?: string;
  tags?: string[];
  totalInventory?: number;
  featuredImage?: string;
  images?: string[];
  variants: ProductListVariant[];
  ebayInventoryItemId?: string;
  ebayOfferId?: string;
  ebayListingId?: string;
  ebaySku?: string;
  ebayMarketplaceId?: string;
  ebayCurrency?: string;
  ebayCondition?: string;
  ebayCategoryId?: string;
  ebayItemSpecifics?: Record<string, string[]>;
  ebayListingNotes?: string;
  ebayDescriptionOverride?: string;
  ebayStatus?: string;
  lastEbaySyncAt?: string;
  updatedAt?: string;
  createdAt?: string;
};

export type ProductCreatePayload = {
  marketplace?: string;
  shopifyProductId?: string;
  productAiProductId?: string;
  title: string;
  description?: string;
  handle?: string;
  vendor?: string;
  productType?: string;
  status?: string;
  tags?: string[];
  totalInventory?: number;
  featuredImage?: string;
  images?: string[];
  variants: ProductListVariant[];
  ebaySku?: string;
  ebayMarketplaceId?: string;
  ebayCurrency?: string;
  ebayCondition?: string;
  ebayCategoryId?: string;
  ebayItemSpecifics?: Record<string, string[]>;
  ebayListingNotes?: string;
  ebayDescriptionOverride?: string;
};

export type ShopifyInventoryLevel = {
  productId?: string;
  productTitle?: string;
  variantId?: string;
  variantTitle?: string;
  shopifyProductId?: string;
  shopifyVariantId?: string;
  inventoryItemId: string;
  sku: string;
  quantity?: number;
  shopifyQuantity?: number;
  availableQuantity?: number;
  locationId: string;
  locationName?: string;
};

export type ShopifyVariantPriceResult = {
  id: string;
  price?: string;
  compareAtPrice?: string;
};

export type InventoryRecord = {
  _id?: string;
  id?: string;
  productId?: string;
  marketplace?: string;
  shopifyProductId?: string;
  shopifyVariantId?: string;
  inventoryItemId: string;
  sku?: string;
  title?: string;
  shopifyQuantity?: number;
  availableQuantity?: number;
  safetyBuffer?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
  sourceStatus?: "active" | "stale" | "deleted" | "untracked";
  staleReason?: string;
  staleMarkedAt?: string;
  locationId?: string;
  locationName?: string;
  updatedAt?: string;
};

export type ShopifyImportProductsResult = {
  count: number;
  importedCount?: number;
  updatedCount?: number;
  staleMarkedInactiveCount?: number;
  activeCount?: number;
};

export const productsApi = {
  getProducts() {
    return requestWithAuth<ProductListItem[]>("/products");
  },

  getProductById(productId: string) {
    return requestWithAuth<ProductListItem>(`/products/${encodeURIComponent(productId)}`);
  },

  createProduct(payload: ProductCreatePayload) {
    return requestWithAuth<ProductListItem>("/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateProduct(productId: string, payload: Partial<ProductCreatePayload>) {
    return requestWithAuth<ProductListItem>(`/products/${encodeURIComponent(productId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteProduct(productId: string) {
    return requestWithAuth<void>(`/products/${encodeURIComponent(productId)}`, {
      method: "DELETE",
    });
  },

  deleteProductAiProduct(productId: string) {
    return fetch(`/api/product-ai/products/${encodeURIComponent(productId)}`, {
      method: "DELETE",
    });
  },

  importShopifyProducts() {
    return requestWithAuth<ShopifyImportProductsResult>("/shopify/import-products", {
      method: "POST",
    });
  },

  syncShopifyProducts() {
    return requestWithAuth<ShopifyImportProductsResult>("/shopify/sync-products", {
      method: "POST",
    });
  },

  getShopifyInventory() {
    return requestWithAuth<ShopifyInventoryLevel[]>("/shopify/inventory");
  },

  getInventory() {
    return requestWithAuth<InventoryRecord[]>("/inventory");
  },

  updateShopifyVariantPrice(shopifyProductId: string, payload: { variantId: string; price: string; compareAtPrice?: string }) {
    return requestWithAuth<ShopifyVariantPriceResult>(`/shopify/products/${encodeURIComponent(shopifyProductId)}/price`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  updateShopifyInventory(inventoryItemId: string, payload: { locationId: string; quantity: number }) {
    return requestWithAuth<{ createdAt: string } | null>(`/shopify/inventory?inventoryItemId=${encodeURIComponent(inventoryItemId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  updateInventorySafetyBuffer(inventoryId: string, safetyBuffer: number) {
    return requestWithAuth<InventoryRecord>(`/inventory/${encodeURIComponent(inventoryId)}/safety-buffer`, {
      method: "PATCH",
      body: JSON.stringify({ safetyBuffer }),
    });
  },
};
