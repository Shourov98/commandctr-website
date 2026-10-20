import { requestWithAuth } from "@/lib/auth";

export type OrderStatus = "Pending" | "Shipped" | "Delivered" | "Cancelled";

export type OrderLineItem = {
  title?: string;
  sku?: string;
  quantity?: number;
  price?: string;
  shopifyVariantId?: string;
  shopifyProductId?: string;
  imageUrl?: string;
};

export type OrderAddress = {
  name?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
  phone?: string;
  formatted?: string[];
};

export type OrderRecord = {
  _id?: string;
  id?: string;
  marketplace?: string;
  externalOrderId?: string;
  shopifyOrderId?: string;
  orderName?: string;
  email?: string;
  customerName?: string;
  phone?: string;
  financialStatus?: string;
  fulfillmentStatus?: string;
  status?: OrderStatus;
  currency?: string;
  totalPrice?: string;
  subtotalPrice?: string;
  totalTax?: string;
  processedAt?: string;
  lineItems?: OrderLineItem[];
  shippingAddress?: OrderAddress | null;
  billingAddress?: OrderAddress | null;
  carrier?: string;
  shippingService?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  labelUrl?: string;
  internalNotes?: Array<{ message: string; createdAt: string }>;
};

export type OrderStats = {
  totalOrders: number;
  pending: number;
  shipped: number;
  delivered: number;
  cancelled: number;
};

export type OrderListResponse = {
  items: OrderRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: OrderStats;
};

export type OrderListParams = {
  search?: string;
  marketplace?: string;
  status?: OrderStatus;
  page?: number;
  limit?: number;
};

const buildQueryString = (params?: OrderListParams) => {
  const searchParams = new URLSearchParams();

  if (params?.search) {
    searchParams.set("search", params.search);
  }
  if (params?.marketplace) {
    searchParams.set("marketplace", params.marketplace);
  }
  if (params?.status) {
    searchParams.set("status", params.status);
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

export const ordersApi = {
  getOrders(params?: OrderListParams) {
    return requestWithAuth<OrderListResponse>(`/orders${buildQueryString(params)}`);
  },

  getOrder(orderId: string) {
    return requestWithAuth<OrderRecord>(`/orders/${encodeURIComponent(orderId)}`);
  },

  updateOrderStatus(orderId: string, payload: {
    status: OrderStatus;
    carrier?: string;
    shippingService?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    labelUrl?: string;
    notifyCustomer?: boolean;
    cancelReason?: "CUSTOMER" | "DECLINED" | "FRAUD" | "INVENTORY" | "STAFF" | "OTHER";
    restock?: boolean;
    refund?: boolean;
    staffNote?: string;
  }) {
    return requestWithAuth<OrderRecord>(`/orders/${encodeURIComponent(orderId)}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  addNote(orderId: string, message: string) {
    return requestWithAuth<OrderRecord>(`/orders/${encodeURIComponent(orderId)}/notes`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  importShopifyOrders() {
    return requestWithAuth<{ count: number }>("/shopify/import-orders", {
      method: "POST",
    });
  },

  seedSandboxOrders() {
    return requestWithAuth<OrderListResponse>("/orders/sandbox/seed", {
      method: "POST",
    });
  },

  async exportCsv(params?: OrderListParams) {
    const response = await fetch(`/api/backend/orders/export.csv${buildQueryString(params)}`, {
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("Could not export orders.");
    }

    return response.blob();
  },
};
