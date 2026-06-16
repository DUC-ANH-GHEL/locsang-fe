import { apiClient } from './apiClient';

export const ADMIN_NEW_ORDER_EVENT = 'locsang:admin-new-order-notification';

export type AdminNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  url?: string | null;
  order_id?: number | null;
  tracking_code?: string | null;
  read_at?: string | null;
  created_at?: string | null;
};

export type AdminNotificationListResponse = {
  data: AdminNotification[];
  unread_count: number;
};

export const adminNotificationService = {
  list: async (limit = 20): Promise<AdminNotificationListResponse> => {
    const response = await apiClient.get('/admin/notifications', {
      params: { limit },
      skipGlobalLoading: true,
    } as any);
    return response.data;
  },

  markRead: async (notificationId: number) => {
    const response = await apiClient.patch(`/admin/notifications/${notificationId}/read`, undefined, {
      skipGlobalLoading: true,
    } as any);
    return response.data;
  },

  markAllRead: async () => {
    const response = await apiClient.patch('/admin/notifications/read-all', undefined, {
      skipGlobalLoading: true,
    } as any);
    return response.data;
  },
};
