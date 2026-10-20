"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { ApiClientError } from "@/lib/auth";
import { integrationApi } from "@/lib/integrations";
import { walletApi, type WalletOverview } from "@/lib/wallet";

type WalletPageState = {
  overview: WalletOverview | null;
  shopifyConnected: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  hasLoadedOnce: boolean;
  lastLoadedAt: number | null;
  errorMessage: string;
  shouldRefresh: () => boolean;
  loadWallet: () => Promise<void>;
  refreshOrders: () => Promise<void>;
};

const WALLET_PAGE_REFRESH_INTERVAL_MS = 60_000;

export const useWalletPageStore = create<WalletPageState>()(
  persist(
    (set, get) => ({
      overview: null,
      shopifyConnected: false,
      isLoading: false,
      isRefreshing: false,
      hasLoadedOnce: false,
      lastLoadedAt: null,
      errorMessage: "",
      shouldRefresh: () => {
        const { lastLoadedAt } = get();
        return !lastLoadedAt || Date.now() - lastLoadedAt > WALLET_PAGE_REFRESH_INTERVAL_MS;
      },
      async loadWallet() {
        const state = get();
        if (state.isLoading && state.hasLoadedOnce) {
          return;
        }

        set({ isLoading: true });

        try {
          const [walletOverview, shopifyStatus] = await Promise.all([
            walletApi.getOverview(),
            integrationApi.getShopifyStatus(),
          ]);

          set({
            overview: walletOverview,
            shopifyConnected: shopifyStatus.connected,
            hasLoadedOnce: true,
            lastLoadedAt: Date.now(),
            errorMessage: "",
          });
        } catch (error) {
          set({
            errorMessage: error instanceof ApiClientError ? error.message : "Could not load wallet overview.",
          });
        } finally {
          set({ isLoading: false });
        }
      },
      async refreshOrders() {
        set({ isRefreshing: true, errorMessage: "" });

        try {
          await integrationApi.importShopifyOrders();
          await get().loadWallet();
        } catch (error) {
          set({
            errorMessage: error instanceof ApiClientError ? error.message : "Could not refresh Shopify orders.",
          });
        } finally {
          set({ isRefreshing: false });
        }
      },
    }),
    {
      name: "twinstr-wallet-page",
      partialize: (state) => ({
        overview: state.overview,
        shopifyConnected: state.shopifyConnected,
        hasLoadedOnce: state.hasLoadedOnce,
        lastLoadedAt: state.lastLoadedAt,
      }),
    },
  ),
);
