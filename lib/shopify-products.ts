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

export const shopifyProductsApi = {
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
