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
  identifierMode?: "gtin" | "asin" | "no_identifier";
  existingAsin?: string;
  condition?: string;
  fulfillmentChannel?: string;
  exemptionConfirmed?: boolean;
  exemptionBrand?: string;
  exemptionCategory?: string;
  confirmProductionSubmission?: boolean;
};

export type AmazonProduct = ProductListItem & {
  environment: "sandbox" | "production";
  externalPersistence: boolean;
  amazonSku: string;
  amazonAsin?: string;
  amazonListingUrl?: string;
  amazonCondition?: string;
  amazonFulfillmentChannel?: string;
  amazonSubmissionId?: string;
  amazonStatus?: string;
  amazonIssues?: Array<{ code?: string; message?: string; severity?: string; attributeNames?: string[] }>;
};

export type AmazonCatalogItem = {
  asin: string;
  title: string;
  brand?: string;
  manufacturer?: string;
  color?: string;
  itemClassification?: string;
  productType: string;
  imageUrl?: string;
  images: Array<{ link: string; variant?: string; height?: number; width?: number }>;
  marketplaceId: string;
};

export type AmazonRestrictionsCheck = {
  asin: string;
  conditionType: string;
  restricted: boolean;
  eligible: boolean;
  restrictions: Array<{
    marketplaceId?: string;
    conditionType?: string;
    reasons?: Array<{ reasonCode?: string; message?: string; links?: Array<{ title?: string; resource?: string }> }>;
  }>;
  reasons: Array<{ reasonCode?: string; message?: string; links?: Array<{ title?: string; resource?: string }> }>;
};

export type AmazonOfferValidationResult = {
  valid: boolean;
  status: string;
  issues: Array<{ code?: string; message?: string; severity?: string; attributeNames?: string[] }>;
  sku?: string;
  productType?: string;
  environment?: string;
};

export const amazonProductsApi = {
  saveListing(payload: AmazonListingPayload) {
    return requestWithAuth<AmazonProduct>("/amazon/listings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  validateListing(payload: AmazonListingPayload) {
    return requestWithAuth<AmazonOfferValidationResult>("/amazon/listings/validate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  lookupCatalogItem(asin: string) {
    return requestWithAuth<AmazonCatalogItem>(`/amazon/catalog/items/${encodeURIComponent(asin.trim().toUpperCase())}`);
  },

  checkRestrictions(asin: string, conditionType: string = "new_new") {
    const params = new URLSearchParams({
      asin: asin.trim().toUpperCase(),
      conditionType,
    });
    return requestWithAuth<AmazonRestrictionsCheck>(`/amazon/restrictions?${params.toString()}`);
  },

  patchOffer(productId: string, payload: { price?: string; quantity?: number }) {
    return requestWithAuth<AmazonProduct>(`/amazon/listings/${encodeURIComponent(productId)}/offer`, {
      method: "PATCH",
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

  getProductTypeDefinition(productType: string, requirements: string = "LISTING") {
    const params = new URLSearchParams({ requirements });
    return requestWithAuth<Record<string, unknown>>(`/amazon/product-types/${encodeURIComponent(productType)}/definition?${params.toString()}`);
  },
};
