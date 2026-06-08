import { apiClient } from './apiClient';

export type AdminContactItem = {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject?: string | null;
  is_read: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AdminContactDetail = AdminContactItem & {
  message: string;
  customer_id?: number | null;
};

export type AdminContactListResponse = {
  data: AdminContactItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export const adminContactService = {
  getContacts: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    is_read?: boolean;
  }): Promise<AdminContactListResponse> => {
    const res = await apiClient.get('/admin/contacts', { params });
    return res.data;
  },

  getContactById: async (contactId: number): Promise<{ data: AdminContactDetail }> => {
    const res = await apiClient.get(`/admin/contacts/${contactId}`);
    return res.data;
  },

  updateReadStatus: async (contactId: number, is_read: boolean): Promise<{ data: AdminContactDetail }> => {
    const res = await apiClient.patch(`/admin/contacts/${contactId}/read`, { is_read });
    return res.data;
  },

  deleteContact: async (contactId: number): Promise<{ success: boolean }> => {
    const res = await apiClient.delete(`/admin/contacts/${contactId}`);
    return res.data;
  },
};
