import { apiClient } from './apiClient';

export interface AdminAccount {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  role_id: number;
  role_name: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateAdminAccountPayload {
  email: string;
  full_name: string;
  password: string;
  is_active: boolean;
}

export interface UpdateAdminAccountPayload {
  email?: string;
  full_name?: string;
  password?: string;
  is_active?: boolean;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export const adminAccountService = {
  async list(): Promise<AdminAccount[]> {
    const response = await apiClient.get('/admin/accounts');
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  async create(payload: CreateAdminAccountPayload): Promise<AdminAccount> {
    const response = await apiClient.post('/admin/accounts', payload);
    return response.data?.data;
  },

  async update(accountId: number, payload: UpdateAdminAccountPayload): Promise<AdminAccount> {
    const response = await apiClient.patch(`/admin/accounts/${accountId}`, payload);
    return response.data?.data;
  },

  async remove(accountId: number): Promise<void> {
    await apiClient.delete(`/admin/accounts/${accountId}`);
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.post('/admin/accounts/change-password', payload);
  },
};
