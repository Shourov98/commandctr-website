"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { ApiClientError } from "@/lib/auth";
import { disputesApi, type DisputeDetailResponse, type DisputeListResponse, type DisputeStatus } from "@/lib/disputes";

export const emptyDisputeStats: DisputeListResponse["stats"] = {
  actionRequired: 0,
  activeDisputes: 0,
  won: 0,
  lost: 0,
  submitted: 0,
  avgResolutionTimeDays: null,
};

export const emptyDisputeResponse: DisputeListResponse = {
  items: [],
  meta: {
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  },
  stats: emptyDisputeStats,
};

type SupportPageState = {
  query: string;
  statusFilter: "ALL" | DisputeStatus;
  data: DisputeListResponse;
  isLoading: boolean;
  isRefreshing: boolean;
  hasLoadedOnce: boolean;
  lastLoadedAt: number | null;
  error: string | null;
  notice: string | null;
  selectedDispute: DisputeDetailResponse | null;
  isDetailsLoading: boolean;
  detailError: string | null;
  setQuery: (value: string) => void;
  setStatusFilter: (value: "ALL" | DisputeStatus) => void;
  closeDetails: () => void;
  shouldRefresh: () => boolean;
  loadDisputes: () => Promise<void>;
  refreshDisputes: () => Promise<void>;
  openDetails: (id: string) => Promise<void>;
};

const SUPPORT_PAGE_REFRESH_INTERVAL_MS = 60_000;

export const useSupportPageStore = create<SupportPageState>()(
  persist(
    (set, get) => ({
      query: "",
      statusFilter: "ALL",
      data: emptyDisputeResponse,
      isLoading: false,
      isRefreshing: false,
      hasLoadedOnce: false,
      lastLoadedAt: null,
      error: null,
      notice: null,
      selectedDispute: null,
      isDetailsLoading: false,
      detailError: null,
      setQuery: (value) => set({ query: value }),
      setStatusFilter: (value) => set({ statusFilter: value }),
      closeDetails: () => set({ selectedDispute: null, detailError: null, isDetailsLoading: false }),
      shouldRefresh: () => {
        const { lastLoadedAt } = get();
        return !lastLoadedAt || Date.now() - lastLoadedAt > SUPPORT_PAGE_REFRESH_INTERVAL_MS;
      },
      async loadDisputes() {
        const state = get();
        if (state.isLoading && state.hasLoadedOnce) {
          return;
        }

        set({ isLoading: true });

        try {
          const result = await disputesApi.getDisputes({
            search: state.query.trim() || undefined,
            status: state.statusFilter === "ALL" ? undefined : state.statusFilter,
          });

          set({
            data: result,
            error: null,
            hasLoadedOnce: true,
            lastLoadedAt: Date.now(),
          });
        } catch (loadError) {
          const message = loadError instanceof ApiClientError ? loadError.message : "Could not load disputes.";
          set({
            error: message,
            data: emptyDisputeResponse,
          });
        } finally {
          set({ isLoading: false });
        }
      },
      async refreshDisputes() {
        set({ notice: null, isRefreshing: true });

        try {
          if (typeof window !== "undefined") {
            console.info("[support-page-store.refreshDisputes] starting Shopify dispute refresh");
          }

          const result = await disputesApi.importShopifyDisputes();

          if (typeof window !== "undefined") {
            console.info("[support-page-store.refreshDisputes] import result", result);
          }

          if (result.reason === "missing_scope") {
            set({ notice: "Reconnect Shopify with dispute permissions to import Shopify Payments disputes.", error: null });
          } else if (result.reason === "shopify_api_error") {
            set({ error: result.message, notice: null });
          } else if (result.reason === "no_disputes") {
            set({ notice: result.message, error: null });
          } else {
            set({ notice: "Disputes refreshed", error: null });
          }

          if (typeof window !== "undefined") {
            console.info("[support-page-store.refreshDisputes] reloading disputes list");
          }

          await get().loadDisputes();
        } catch (refreshError) {
          const message = refreshError instanceof ApiClientError ? refreshError.message : "Could not refresh Shopify disputes.";
          if (typeof window !== "undefined") {
            console.error("[support-page-store.refreshDisputes] refresh failed", refreshError);
          }
          set({ error: message });
        } finally {
          set({ isRefreshing: false });
        }
      },
      async openDetails(id) {
        set({ selectedDispute: null, detailError: null, isDetailsLoading: true });
        try {
          const detail = await disputesApi.getDisputeById(id);
          set({ selectedDispute: detail });
        } catch (detailLoadError) {
          const message = detailLoadError instanceof ApiClientError ? detailLoadError.message : "Could not load dispute details.";
          set({ detailError: message });
        } finally {
          set({ isDetailsLoading: false });
        }
      },
    }),
    {
      name: "twinstr-support-page",
      partialize: (state) => ({
        query: state.query,
        statusFilter: state.statusFilter,
        data: state.data,
        hasLoadedOnce: state.hasLoadedOnce,
        lastLoadedAt: state.lastLoadedAt,
      }),
    },
  ),
);
