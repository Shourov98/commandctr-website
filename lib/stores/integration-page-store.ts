"use client";

import { create } from "zustand";

import { ApiClientError } from "@/lib/auth";
import { integrationApi, type AmazonStatus } from "@/lib/integrations";

export type BannerState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

export type ShopifyState = {
  connected: boolean;
  shopDomain: string;
  status: "connected" | "disconnected" | "error" | "not_connected";
  source: "marketplace_connection" | "env_fallback" | "none";
  scopes: string[];
};

export type EbayState = {
  connected: boolean;
  displayName: string;
  providerAccountRef: string;
  environment: "sandbox" | "production";
  status: "connected" | "disconnected" | "error" | "not_connected";
  connectedAt: string | null;
  accessTokenExpiresAt: string | null;
};

export type EtsyState = {
  connected: boolean;
  displayName: string;
  providerAccountRef: string;
  environment: "sandbox" | "production";
  status: "connected" | "disconnected" | "error" | "not_connected";
  connectedAt: string | null;
  accessTokenExpiresAt: string | null;
};

export const initialShopifyState: ShopifyState = {
  connected: false,
  shopDomain: "",
  status: "not_connected",
  source: "none",
  scopes: [],
};

export const initialEbayState: EbayState = {
  connected: false,
  displayName: "eBay Seller",
  providerAccountRef: "",
  environment: "sandbox",
  status: "not_connected",
  connectedAt: null,
  accessTokenExpiresAt: null,
};

export const initialEtsyState: EtsyState = {
  connected: false,
  displayName: "Etsy Shop",
  providerAccountRef: "",
  environment: "sandbox",
  status: "not_connected",
  connectedAt: null,
  accessTokenExpiresAt: null,
};

export const initialAmazonState: AmazonStatus = {
  connected: false,
  marketplace: "amazon",
  environment: "sandbox",
  displayName: "Amazon UK Sandbox",
  providerAccountRef: "",
  marketplaceId: "A1F83G8C2ARO7P",
  currency: "GBP",
  status: "not_connected",
  connectedAt: null,
  lastCheckedAt: null,
};

type IntegrationPageState = {
  banner: BannerState;
  shopifyState: ShopifyState;
  ebayState: EbayState;
  etsyState: EtsyState;
  amazonState: AmazonStatus;
  isLoadingStatus: boolean;
  isConnectingShopify: boolean;
  isConnectingEbay: boolean;
  isConnectingEtsy: boolean;
  isConnectingAmazon: boolean;
  isDisconnectingShopify: boolean;
  isDisconnectingEbay: boolean;
  isDisconnectingEtsy: boolean;
  isDisconnectingAmazon: boolean;
  isVerifyingAmazon: boolean;
  isSyncingProducts: boolean;
  isSyncingOrders: boolean;
  hasLoadedOnce: boolean;
  lastLoadedAt: number | null;
  shouldRefresh: () => boolean;
  setBanner: (banner: BannerState) => void;
  setConnectingShopify: (value: boolean) => void;
  setConnectingEbay: (value: boolean) => void;
  setConnectingEtsy: (value: boolean) => void;
  loadShopifyStatus: () => Promise<void>;
  loadEbayStatus: () => Promise<void>;
  loadEtsyStatus: () => Promise<void>;
  loadAmazonStatus: () => Promise<void>;
  connectAmazon: () => Promise<void>;
  disconnectShopify: () => Promise<void>;
  disconnectEbay: () => Promise<void>;
  disconnectEtsy: () => Promise<void>;
  disconnectAmazon: () => Promise<void>;
  verifyAmazon: () => Promise<void>;
  syncProducts: () => Promise<void>;
  syncOrders: () => Promise<void>;
};

const INTEGRATION_PAGE_REFRESH_INTERVAL_MS = 60_000;
const EBAY_COMING_SOON = true;
const ETSY_COMING_SOON = true;

export const useIntegrationPageStore = create<IntegrationPageState>()((set, get) => ({
  banner: null,
  shopifyState: initialShopifyState,
  ebayState: initialEbayState,
  etsyState: initialEtsyState,
  amazonState: initialAmazonState,
  isLoadingStatus: false,
  isConnectingShopify: false,
  isConnectingEbay: false,
  isConnectingEtsy: false,
  isConnectingAmazon: false,
  isDisconnectingShopify: false,
  isDisconnectingEbay: false,
  isDisconnectingEtsy: false,
  isDisconnectingAmazon: false,
  isVerifyingAmazon: false,
  isSyncingProducts: false,
  isSyncingOrders: false,
  hasLoadedOnce: false,
  lastLoadedAt: null,
  shouldRefresh: () => {
    const { lastLoadedAt } = get();
    return !lastLoadedAt || Date.now() - lastLoadedAt > INTEGRATION_PAGE_REFRESH_INTERVAL_MS;
  },
  setBanner: (banner) => set({ banner }),
  setConnectingShopify: (value) => set({ isConnectingShopify: value }),
  setConnectingEbay: (value) => set({ isConnectingEbay: value }),
  setConnectingEtsy: (value) => set({ isConnectingEtsy: value }),
  async loadShopifyStatus() {
    const state = get();
    if (state.isLoadingStatus && state.hasLoadedOnce) {
      return;
    }

    set({ isLoadingStatus: true });

    try {
      const status = await integrationApi.getShopifyStatus();
      set({
        shopifyState: {
          connected: status.connected,
          shopDomain: status.shop?.myshopifyDomain ?? status.connection?.shopDomain ?? "",
          status: status.connection?.status ?? (status.connected ? "connected" : "not_connected"),
          source: status.source,
          scopes: status.connection?.scopes ?? [],
        },
        hasLoadedOnce: true,
        lastLoadedAt: Date.now(),
      });
    } catch (error) {
      set({
        banner: {
          type: "error",
          message: error instanceof ApiClientError ? error.message : "Failed to load Shopify status.",
        },
      });
    } finally {
      set({ isLoadingStatus: false });
    }
  },
  async loadEbayStatus() {
    if (EBAY_COMING_SOON) {
      // Restore the live status call when eBay goes live again.
      // const status = await integrationApi.getEbayStatus();
      set({
        ebayState: initialEbayState,
        hasLoadedOnce: true,
        lastLoadedAt: Date.now(),
      });
      return;
    }

    try {
      const status = await integrationApi.getEbayStatus();
      set({
        ebayState: {
          connected: status.connected,
          displayName: status.displayName || "eBay Seller",
          providerAccountRef: status.providerAccountRef || "",
          environment: status.environment,
          status: status.status,
          connectedAt: status.connectedAt,
          accessTokenExpiresAt: status.accessTokenExpiresAt,
        },
        hasLoadedOnce: true,
        lastLoadedAt: Date.now(),
      });
    } catch (error) {
      set({
        banner: {
          type: "error",
          message: error instanceof ApiClientError ? error.message : "Failed to load eBay status.",
        },
      });
    }
  },
  async loadEtsyStatus() {
    if (ETSY_COMING_SOON) {
      // Restore the live status call when Etsy goes live again.
      // const status = await integrationApi.getEtsyStatus();
      set({
        etsyState: initialEtsyState,
        hasLoadedOnce: true,
        lastLoadedAt: Date.now(),
      });
      return;
    }

    try {
      const status = await integrationApi.getEtsyStatus();
      set({
        etsyState: {
          connected: status.connected,
          displayName: status.displayName || "Etsy Shop",
          providerAccountRef: status.providerAccountRef || "",
          environment: status.environment,
          status: status.status,
          connectedAt: status.connectedAt,
          accessTokenExpiresAt: status.accessTokenExpiresAt,
        },
        hasLoadedOnce: true,
        lastLoadedAt: Date.now(),
      });
    } catch (error) {
      set({
        banner: {
          type: "error",
          message: error instanceof ApiClientError ? error.message : "Failed to load Etsy status.",
        },
      });
    }
  },
  async loadAmazonStatus() {
    try {
      const amazonState = await integrationApi.getAmazonStatus();
      set({ amazonState, hasLoadedOnce: true, lastLoadedAt: Date.now() });
    } catch (error) {
      set({
        banner: {
          type: "error",
          message: error instanceof ApiClientError ? error.message : "Failed to load Amazon status.",
        },
      });
    }
  },
  async connectAmazon() {
    set({ banner: null, isConnectingAmazon: true });
    try {
      const amazonState = await integrationApi.connectAmazon();
      set({
        amazonState,
        banner: { type: "success", message: `Amazon UK ${amazonState.environment} connected successfully.` },
        lastLoadedAt: Date.now(),
      });
    } catch (error) {
      set({
        banner: {
          type: "error",
          message: error instanceof ApiClientError ? error.message : "Failed to connect Amazon.",
        },
      });
    } finally {
      set({ isConnectingAmazon: false });
    }
  },
  async disconnectShopify() {
    set({ banner: null, isDisconnectingShopify: true });
    try {
      await integrationApi.disconnectShopify();
      set({
        banner: {
          type: "success",
          message: "Shopify disconnected successfully.",
        },
      });
      await get().loadShopifyStatus();
    } catch (error) {
      set({
        banner: {
          type: "error",
          message: error instanceof ApiClientError ? error.message : "Failed to disconnect Shopify.",
        },
      });
    } finally {
      set({ isDisconnectingShopify: false });
    }
  },
  async disconnectEbay() {
    if (EBAY_COMING_SOON) {
      // Restore live disconnect when eBay goes live again.
      // await integrationApi.disconnectEbay();
      set({
        banner: {
          type: "info",
          message: "eBay is coming soon.",
        },
        isDisconnectingEbay: false,
      });
      return;
    }

    set({ banner: null, isDisconnectingEbay: true });
    try {
      await integrationApi.disconnectEbay();
      set({
        banner: {
          type: "success",
          message: "eBay disconnected successfully.",
        },
      });
      await get().loadEbayStatus();
    } catch (error) {
      set({
        banner: {
          type: "error",
          message: error instanceof ApiClientError ? error.message : "Failed to disconnect eBay.",
        },
      });
    } finally {
      set({ isDisconnectingEbay: false });
    }
  },
  async disconnectEtsy() {
    if (ETSY_COMING_SOON) {
      // Restore live disconnect when Etsy goes live again.
      // await integrationApi.disconnectEtsy();
      set({
        banner: {
          type: "info",
          message: "Etsy is coming soon.",
        },
        isDisconnectingEtsy: false,
      });
      return;
    }

    set({ banner: null, isDisconnectingEtsy: true });
    try {
      await integrationApi.disconnectEtsy();
      set({
        banner: {
          type: "success",
          message: "Etsy disconnected successfully.",
        },
      });
      await get().loadEtsyStatus();
    } catch (error) {
      set({
        banner: {
          type: "error",
          message: error instanceof ApiClientError ? error.message : "Failed to disconnect Etsy.",
        },
      });
    } finally {
      set({ isDisconnectingEtsy: false });
    }
  },
  async disconnectAmazon() {
    set({ banner: null, isDisconnectingAmazon: true });
    try {
      const amazonState = await integrationApi.disconnectAmazon();
      set({ amazonState, banner: { type: "success", message: "Amazon disconnected successfully." } });
    } catch (error) {
      set({
        banner: {
          type: "error",
          message: error instanceof ApiClientError ? error.message : "Failed to disconnect Amazon.",
        },
      });
    } finally {
      set({ isDisconnectingAmazon: false });
    }
  },
  async verifyAmazon() {
    set({ banner: null, isVerifyingAmazon: true });
    try {
      const amazonState = await integrationApi.verifyAmazon();
      set({
        amazonState,
        banner: { type: "success", message: `Amazon ${amazonState.environment} connection verified successfully.` },
        lastLoadedAt: Date.now(),
      });
    } catch (error) {
      set({
        banner: {
          type: "error",
          message: error instanceof ApiClientError ? error.message : "Amazon connection verification failed.",
        },
      });
    } finally {
      set({ isVerifyingAmazon: false });
    }
  },
  async syncProducts() {
    set({ banner: null, isSyncingProducts: true });
    try {
      await integrationApi.importShopifyProducts();
      set({
        banner: {
          type: "success",
          message: "Shopify products imported successfully",
        },
      });
      await get().loadShopifyStatus();
    } catch (error) {
      set({
        banner: {
          type: "error",
          message: error instanceof ApiClientError ? error.message : "Failed to import Shopify products.",
        },
      });
    } finally {
      set({ isSyncingProducts: false });
    }
  },
  async syncOrders() {
    set({ banner: null, isSyncingOrders: true });
    try {
      await integrationApi.importShopifyOrders();
      set({
        banner: {
          type: "success",
          message: "Shopify orders imported successfully",
        },
      });
      await get().loadShopifyStatus();
    } catch (error) {
      set({
        banner: {
          type: "error",
          message: error instanceof ApiClientError ? error.message : "Failed to import Shopify orders.",
        },
      });
    } finally {
      set({ isSyncingOrders: false });
    }
  },
}));
