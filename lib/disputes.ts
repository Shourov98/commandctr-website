import { requestWithAuth } from "@/lib/auth";

export type DisputeStatus = "OPEN" | "SUBMITTED" | "WON" | "LOST" | "UNKNOWN";

export type DisputeRecord = {
  _id?: string;
  id: string;
  marketplace?: string;
  localOrderId?: string | null;
  shopifyOrderId?: string;
  orderName?: string;
  customerName?: string;
  customerEmail?: string;
  disputeId: string;
  status: DisputeStatus;
  reason?: string;
  amount?: string;
  currency?: string;
  deadline?: string | null;
  evidenceStatus?: string;
  sourceCreatedAt?: string | null;
  sourceUpdatedAt?: string | null;
  rawShopifyData?: unknown;
  lastSyncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DisputeStats = {
  actionRequired: number;
  activeDisputes: number;
  won: number;
  lost: number;
  submitted: number;
  avgResolutionTimeDays: number | null;
};

export type DisputeListResponse = {
  items: DisputeRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: DisputeStats;
};

export type DisputeDetailResponse = {
  dispute: DisputeRecord;
  relatedOrder: {
    id: string;
    orderName: string | null;
    shopifyOrderId: string | null;
    customerName: string | null;
    customerEmail: string | null;
    financialStatus: string | null;
    fulfillmentStatus: string | null;
    totalPrice: string | null;
    currency: string | null;
    processedAt: string | null;
  } | null;
};

export type ImportShopifyDisputesResponse =
  | {
      success: false;
      reason: "missing_scope";
      requiredScope: "read_shopify_payments_disputes";
      count: 0;
      message: string;
    }
  | {
      success: false;
      reason: "shopify_api_error";
      count: 0;
      message: string;
      details: {
        provider: "shopify";
        operation: "disputes";
        statusCode?: number;
        errorMessage?: string;
      };
    }
  | {
      success: true;
      reason: "no_disputes";
      count: 0;
      message: string;
    }
  | {
      success: true;
      reason: "imported";
      count: number;
      message: string;
    };

export type DisputeListParams = {
  status?: DisputeStatus;
  search?: string;
  page?: number;
  limit?: number;
};

const buildQueryString = (params?: DisputeListParams) => {
  const searchParams = new URLSearchParams();

  if (params?.status) {
    searchParams.set("status", params.status);
  }
  if (params?.search) {
    searchParams.set("search", params.search);
  }
  if (params?.page) {
    searchParams.set("page", String(params.page));
  }
  if (params?.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

export const disputesApi = {
  getDisputes(params?: DisputeListParams) {
    return requestWithAuth<DisputeListResponse>(`/disputes${buildQueryString(params)}`);
  },

  getDisputeById(id: string) {
    return requestWithAuth<DisputeDetailResponse>(`/disputes/${encodeURIComponent(id)}`);
  },

  importShopifyDisputes() {
    if (typeof window !== "undefined") {
      console.info("[disputesApi.importShopifyDisputes] POST /api/backend/shopify/import-disputes");
    }

    return requestWithAuth<ImportShopifyDisputesResponse>("/shopify/import-disputes", {
      method: "POST",
    });
  },
};
