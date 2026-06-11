import { apiClient } from './apiClient';

export type AdminOrderStatus = 'pending' | 'processed' | 'cancelled';
export type AdminPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type AdminOrderListItem = {
  id: number;
  tracking_code?: string | null;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  receiver_address?: string | null;
  status: AdminOrderStatus;
  payment_status: AdminPaymentStatus;
  payment_method?: string | null;
  total_amount: number;
  shipping_fee?: number;
  item_count: number;
  first_product_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AdminOrderDetail = AdminOrderListItem & {
  items: Array<{
    id: number;
    product_id: number;
    product_variant_id?: number | null;
    product_name?: string | null;
    variant_sku?: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
};

export type AdminOrderListResponse = {
  data: AdminOrderListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export const adminOrderService = {
  getOrders: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<AdminOrderListResponse> => {
    const res = await apiClient.get('/admin/orders', { params });
    return res.data;
  },

  getOrderById: async (orderId: number): Promise<{ data: AdminOrderDetail }> => {
    const res = await apiClient.get(`/admin/orders/${orderId}`);
    return res.data;
  },

  updateOrder: async (
    orderId: number,
    payload: {
      status?: string;
      tracking_code?: string;
      note?: string;
    },
  ): Promise<{ data: AdminOrderDetail }> => {
    const res = await apiClient.patch(`/admin/orders/${orderId}`, payload);
    return res.data;
  },

  bulkOrders: async (payload: { ids: number[]; action: 'status' | 'soft_delete'; status?: string }) => {
    const res = await apiClient.patch('/admin/orders/bulk', payload);
    return res.data;
  },

  softDeleteOrder: async (orderId: number) => {
    const res = await apiClient.delete(`/admin/orders/${orderId}`);
    return res.data;
  },
};
