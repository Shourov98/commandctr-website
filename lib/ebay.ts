import { requestWithAuth } from "@/lib/auth";

export type EbayPublishJob = {
  _id: string;
  userId: string;
  operation: "sync_product" | "sync_inventory" | "sync_price" | "pull_listings" | "publish_listing" | "end_listing";
  productId?: string;
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;
  maxAttempts: number;
  availableAt: string;
  startedAt?: string;
  completedAt?: string;
  lastError?: string;
  payload?: Record<string, unknown>;
  result?: {
    success?: boolean;
    error?: string;
    retryable?: boolean;
    data?: Record<string, unknown>;
  };
  createdAt: string;
  updatedAt: string;
};

export type EbayListingStatus = {
  productId: string;
  listingId?: string;
  offerId?: string;
  status: string;
  offer?: Record<string, unknown>;
};

export type EbayInventoryLevel = {
  productId: string;
  productAiProductId?: string;
  title: string;
  sku: string;
  inventoryItemId: string;
  offerId?: string;
  listingId?: string;
  status: string;
  quantity: number;
  featuredImage?: string;
  updatedAt?: string;
  syncError?: string;
};

export const ebayApi = {
  publishProduct(productId: string) {
    return requestWithAuth<EbayPublishJob>(`/ebay/products/${encodeURIComponent(productId)}/publish`, {
      method: "POST",
    });
  },

  getJob(jobId: string) {
    return requestWithAuth<EbayPublishJob>(`/ebay/jobs/${encodeURIComponent(jobId)}`);
  },

  getProductStatus(productId: string) {
    return requestWithAuth<EbayListingStatus>(`/ebay/products/${encodeURIComponent(productId)}/status`);
  },

  getInventory() {
    return requestWithAuth<EbayInventoryLevel[]>("/ebay/inventory");
  },

  updateInventory(productId: string, quantity: number) {
    return requestWithAuth<EbayInventoryLevel>(`/ebay/products/${encodeURIComponent(productId)}/inventory`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  },
};
