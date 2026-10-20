import { requestWithAuth } from "@/lib/auth";
import type { ProductListItem } from "@/lib/products";

export type AmazonListingPayload = {
  title: string;
  sku: string;
  price: string;
  quantity: number;
  description?: string;
  brand?: string;
  productType?: string;
  imagePath?: string;
  bulletPoints?: string[];
  backendSearchTerms?: string[];
  attributes?: Record<string, unknown>;
};

export type AmazonProduct = ProductListItem & {
  environment: "sandbox" | "production";
  externalPersistence: boolean;
  amazonSku: string;
  amazonSubmissionId?: string;
  amazonStatus?: string;
  amazonIssues?: Array<{ code?: string; message?: string; severity?: string }>;
};

export const amazonProductsApi = {
  saveListing(payload: AmazonListingPayload) {
    return requestWithAuth<AmazonProduct>("/amazon/listings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateListing(productId: string, payload: AmazonListingPayload) {
    return requestWithAuth<AmazonProduct>(`/amazon/listings/${encodeURIComponent(productId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteListing(productId: string) {
    return requestWithAuth<{ deleted: boolean; sku: string }>(`/amazon/listings/${encodeURIComponent(productId)}`, {
      method: "DELETE",
    });
  },
};
