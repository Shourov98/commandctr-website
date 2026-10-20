"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { ApiClientError } from "@/lib/auth";
import { ordersApi, type OrderRecord, type OrderStats, type OrderStatus } from "@/lib/orders";

export type OrderPlatform = "AMAZON" | "EBAY" | "TIKTOK" | "SHOPIFY" | "ETSY" | "OTHER";

export type OrderRow = {
  id: string;
  orderId: string;
  platform: OrderPlatform;
  customer: string;
  customerAvatarTone: string;
  customerInitials: string;
  items: string;
  amount: string;
  date: string;
  status: OrderStatus;
};

export const emptyOrderStats: OrderStats = {
  totalOrders: 0,
  pending: 0,
  shipped: 0,
  delivered: 0,
  cancelled: 0,
};

type OrdersPageState = {
  orders: OrderRow[];
  stats: OrderStats;
  searchQuery: string;
  editingRowId: string | null;
  isLoading: boolean;
  hasLoadedOnce: boolean;
  lastLoadedAt: number | null;
  pageMessage: string;
  setSearchQuery: (value: string) => void;
  setEditingRowId: (value: string | null) => void;
  shouldRefresh: () => boolean;
  loadOrders: (search?: string) => Promise<void>;
  updateItems: (id: string, value: string) => void;
  removeOrder: (id: string) => void;
  exportOrders: () => Promise<Blob>;
};

const ORDERS_PAGE_REFRESH_INTERVAL_MS = 60_000;

function getDocumentId(order: OrderRecord) {
  return order._id ?? order.id ?? order.externalOrderId ?? order.shopifyOrderId ?? order.orderName ?? "";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "O").concat(parts[1]?.[0] ?? "").toUpperCase();
}

function mapPlatform(marketplace?: string): OrderPlatform {
  const value = marketplace?.toUpperCase();
  if (value === "AMAZON" || value === "EBAY" || value === "TIKTOK" || value === "SHOPIFY" || value === "ETSY") {
    return value;
  }
  return "OTHER";
}

function formatOrderAmount(order: OrderRecord) {
  const numericAmount = Number(order.totalPrice ?? 0);
  const currency = order.currency || "USD";

  try {
    return `${numericAmount >= 0 ? "+" : ""}${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(numericAmount)}`;
  } catch {
    return `${numericAmount >= 0 ? "+" : ""}$${numericAmount.toFixed(2)}`;
  }
}

function formatOrderDate(value?: string) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function mapOrderRows(orders: OrderRecord[]): OrderRow[] {
  return orders.map((order, index) => {
    const customer = order.customerName || order.email || "Unknown Customer";
    const itemCount = (order.lineItems ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0);

    return {
      id: getDocumentId(order),
      orderId: order.orderName ?? order.externalOrderId ?? order.shopifyOrderId ?? "--",
      platform: mapPlatform(order.marketplace),
      customer,
      customerAvatarTone:
        index % 3 === 0
          ? "from-[#f7d9c7] to-[#b48f78]"
          : index % 3 === 1
            ? "from-[#2f6f83] to-[#163948]"
            : "from-[#efdbc6] to-[#b98f6f]",
      customerInitials: getInitials(customer),
      items: String(itemCount || (order.lineItems ?? []).length),
      amount: formatOrderAmount(order),
      date: formatOrderDate(order.processedAt),
      status: order.status ?? "Pending",
    };
  });
}

export const useOrdersPageStore = create<OrdersPageState>()(
  persist(
    (set, get) => ({
      orders: [],
      stats: emptyOrderStats,
      searchQuery: "",
      editingRowId: null,
      isLoading: false,
      hasLoadedOnce: false,
      lastLoadedAt: null,
      pageMessage: "",
      setSearchQuery: (value) => set({ searchQuery: value }),
      setEditingRowId: (value) => set({ editingRowId: value }),
      shouldRefresh: () => {
        const { lastLoadedAt } = get();
        return !lastLoadedAt || Date.now() - lastLoadedAt > ORDERS_PAGE_REFRESH_INTERVAL_MS;
      },
      async loadOrders(search) {
        const state = get();
        if (state.isLoading && state.hasLoadedOnce) {
          return;
        }

        set({ isLoading: true });

        try {
          const effectiveSearch = search ?? state.searchQuery;
          const response = await ordersApi.getOrders({
            search: effectiveSearch.trim() || undefined,
            limit: 100,
          });
          set({
            orders: mapOrderRows(response.items),
            stats: response.stats,
            hasLoadedOnce: true,
            lastLoadedAt: Date.now(),
            pageMessage: "",
          });
        } catch (error) {
          set({
            pageMessage: error instanceof ApiClientError ? error.message : "Could not load orders.",
          });
        } finally {
          set({ isLoading: false });
        }
      },
      updateItems: (id, value) =>
        set((state) => ({
          orders: state.orders.map((order) => (order.id === id ? { ...order, items: value } : order)),
        })),
      removeOrder: (id) =>
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== id),
        })),
      exportOrders: async () => {
        const { searchQuery } = get();
        return ordersApi.exportCsv({
          search: searchQuery.trim() || undefined,
          limit: 100,
        });
      },
    }),
    {
      name: "twinstr-orders-page",
      partialize: (state) => ({
        orders: state.orders,
        stats: state.stats,
        searchQuery: state.searchQuery,
        hasLoadedOnce: state.hasLoadedOnce,
        lastLoadedAt: state.lastLoadedAt,
      }),
    },
  ),
);
