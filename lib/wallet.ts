import { requestWithAuth } from "@/lib/auth";

export type WalletPlatformBalance = {
  platform: "shopify" | "amazon" | "ebay" | "tiktok" | "etsy";
  label: string;
  amount: number;
  currency: string;
  status: string;
  isConnected: boolean;
};

export type WalletActivityItem = {
  id: string;
  type: "ORDER_PAID" | "ORDER_PENDING" | "ORDER_REFUNDED" | "ORDER_CREATED";
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  status: string;
  occurredAt: string | null;
};

export type WalletOverview = {
  currency: string;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  refundedRevenue: number;
  orderCount: number;
  paidOrderCount: number;
  pendingOrderCount: number;
  platformBalances: WalletPlatformBalance[];
  recentActivity: WalletActivityItem[];
  notice: string;
};

export const walletApi = {
  getOverview() {
    return requestWithAuth<WalletOverview>("/wallet/overview");
  },
};
