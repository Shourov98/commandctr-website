import { requestWithAuth } from "@/lib/auth";

export type ShopifyProductPayload = {
  title: string;
  description?: string;
  vendor?: string;
  productType?: string;
  category?: string;
  status: "DRAFT" | "ACTIVE";
  tags: string[];
  imagePath?: string;
  publishToOnlineStore?: boolean;
  compareAtPrice?: string;
  costPerItem?: string;
  chargeTax?: boolean;
  barcode?: string;
  weight?: number;
  weightUnit?: string;
  countryOfOrigin?: string;
  hsCode?: string;
  collections?: string[];
  themeTemplate?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoHandle?: string;
  metafields?: Record<string, string>;
  variants: Array<{
    title: string;
    price: string;
    sku?: string;
    inventoryQuantity?: number;
    trackInventory?: boolean;
    barcode?: string;
    compareAtPrice?: string;
    weight?: number;
    weightUnit?: string;
  }>;
};

export type ShopifyCreatedVariant = {
  id: string;
  title: string;
  sku?: string;
  price?: string;
  compareAtPrice?: string;
  inventoryQuantity?: number;
  inventoryItem?: {
    id?: string;
  };
};

export type ShopifyCreatedProduct = {
  id: string;
  title: string;
  descriptionHtml?: string;
  handle?: string;
  vendor?: string;
  productType?: string;
  status?: string;
  tags?: string[];
  totalInventory?: number;
  featuredImage?: {
    url?: string;
  };
  variants?: {
    nodes?: ShopifyCreatedVariant[];
  };
};

export type ShopifyMutationResult = {
  imageUploaded: boolean;
  product: ShopifyCreatedProduct;
  publishedToOnlineStore: boolean;
  warnings: string[];
};

export type ShopifyBulkUploadRow = {
  title: string;
  description?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  handle?: string;
  status?: "ACTIVE" | "DRAFT";
  optionName?: string;
  optionValue?: string;
  price?: string;
  sku?: string;
  barcode?: string;
};

export type ShopifyBulkJob = {
  _id: string;
  status: "created" | "running" | "completed" | "failed" | "canceled";
  operationStatus?: string;
  totalRows: number;
  processedRows: number;
  succeededRows: number;
  failedRows: number;
  lastError?: string;
  rows: Array<{ line: number; productId?: string; errors: string[] }>;
  createdAt: string;
};

export const shopifyProductsApi = {
  startBulkUpload(payload: { rows: ShopifyBulkUploadRow[]; publishToOnlineStore: boolean }) {
    return requestWithAuth<ShopifyBulkJob>("/shopify/bulk-jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getBulkJob(jobId: string) {
    return requestWithAuth<ShopifyBulkJob>(`/shopify/bulk-jobs/${encodeURIComponent(jobId)}`);
  },

  listBulkJobs() {
    return requestWithAuth<ShopifyBulkJob[]>("/shopify/bulk-jobs");
  },

  cancelBulkJob(jobId: string) {
    return requestWithAuth<ShopifyBulkJob>(`/shopify/bulk-jobs/${encodeURIComponent(jobId)}/cancel`, { method: "POST" });
  },

  createShopifyProduct(payload: ShopifyProductPayload) {
    return requestWithAuth<ShopifyMutationResult>("/shopify/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateShopifyProduct(shopifyProductId: string, payload: ShopifyProductPayload) {
    return requestWithAuth<ShopifyMutationResult>(`/shopify/products?shopifyProductId=${encodeURIComponent(shopifyProductId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
