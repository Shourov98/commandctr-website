import { requestWithAuth } from "@/lib/auth";

type MarketplaceConnection = {
  id: string;
  userId: string;
  marketplace: "shopify" | "ebay" | "etsy" | "amazon";
  providerAccountRef?: string;
  displayName?: string;
  shopDomain?: string;
  scopes: string[];
  status: "connected" | "disconnected" | "error";
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  environment?: "sandbox" | "production";
  metadata?: Record<string, unknown>;
  connectedAt?: string;
  disconnectedAt?: string;
  lastCheckedAt?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type ShopifyStatus = {
  connected: boolean;
  source: "marketplace_connection" | "env_fallback" | "none";
  shop: {
    name: string;
    email: string;
    myshopifyDomain: string;
  } | null;
  connection: MarketplaceConnection | null;
};

type EbayStatus = {
  connected: boolean;
  marketplace: "ebay";
  environment: "sandbox" | "production";
  displayName: string;
  providerAccountRef: string;
  scopes: string[];
  connectedAt: string | null;
  accessTokenExpiresAt: string | null;
  status: "connected" | "disconnected" | "error" | "not_connected";
};

type EtsyStatus = {
  connected: boolean;
  marketplace: "etsy";
  environment: "sandbox" | "production";
  displayName: string;
  providerAccountRef: string;
  scopes: string[];
  connectedAt: string | null;
  accessTokenExpiresAt: string | null;
  status: "connected" | "disconnected" | "error" | "not_connected";
};

export type AmazonStatus = {
  connected: boolean;
  marketplace: "amazon";
  environment: "sandbox" | "production";
  displayName: string;
  providerAccountRef: string;
  marketplaceId: string;
  currency: string;
  status: "connected" | "disconnected" | "error" | "not_connected";
  connectedAt: string | null;
  lastCheckedAt: string | null;
  participationCount?: number;
};

export const integrationApi = {
  getAmazonStatus() {
    return requestWithAuth<AmazonStatus>("/amazon/status");
  },

  connectAmazon() {
    return requestWithAuth<AmazonStatus>("/amazon/connect", { method: "POST" });
  },

  verifyAmazon() {
    return requestWithAuth<AmazonStatus>("/amazon/verify", { method: "POST" });
  },

  disconnectAmazon() {
    return requestWithAuth<AmazonStatus>("/amazon/disconnect", { method: "POST" });
  },

  getShopifyStatus() {
    return requestWithAuth<ShopifyStatus>("/shopify/status");
  },

  getShopifyConnectUrl() {
    return requestWithAuth<{ connectUrl: string }>("/shopify/connect-url");
  },

  disconnectShopify() {
    return requestWithAuth<MarketplaceConnection>("/shopify/disconnect", {
      method: "POST",
    });
  },

  getEbayStatus() {
    return requestWithAuth<EbayStatus>("/ebay/status");
  },

  getEbayConnectUrl() {
    return requestWithAuth<{ connectUrl: string }>("/ebay/connect-url");
  },

  disconnectEbay() {
    return requestWithAuth<MarketplaceConnection>("/ebay/disconnect", {
      method: "POST",
    });
  },

  getEtsyStatus() {
    return requestWithAuth<EtsyStatus>("/etsy/status");
  },

  getEtsyConnectUrl() {
    return requestWithAuth<{ connectUrl: string }>("/etsy/connect-url");
  },

  disconnectEtsy() {
    return requestWithAuth<MarketplaceConnection>("/etsy/disconnect", {
      method: "POST",
    });
  },

  getMarketplaceConnections() {
    return requestWithAuth<MarketplaceConnection[]>("/marketplace-connections");
  },

  importShopifyProducts() {
    return requestWithAuth<{ count: number }>("/shopify/import-products", {
      method: "POST",
    });
  },

  importShopifyOrders() {
    return requestWithAuth<{ count: number }>("/shopify/import-orders", {
      method: "POST",
    });
  },
};
