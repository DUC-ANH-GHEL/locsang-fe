import { apiClient } from './apiClient';

export type TipCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TipCategoryCreatePayload = {
  name: string;
  slug?: string;
  description?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export type TipCategoryUpdatePayload = Partial<TipCategoryCreatePayload>;

const cleanPayload = (payload: TipCategoryCreatePayload | TipCategoryUpdatePayload) => ({
  ...(payload.name !== undefined ? { name: String(payload.name || '').trim() } : {}),
  ...(payload.slug !== undefined ? { slug: String(payload.slug || '').trim() || null } : {}),
  ...(payload.description !== undefined
    ? { description: payload.description === null ? null : String(payload.description || '').trim() || null }
    : {}),
  ...(payload.is_active !== undefined ? { is_active: Boolean(payload.is_active) } : {}),
  ...(payload.sort_order !== undefined ? { sort_order: Number(payload.sort_order) || 0 } : {}),
});

export const tipCategoryService = {
  getAdminTipCategories: async (query?: { search?: string; is_active?: boolean }) => {
    const response = await apiClient.get('/admin/tips/categories', {
      params: {
        search: query?.search?.trim() || undefined,
        is_active: typeof query?.is_active === 'boolean' ? String(query.is_active) : undefined,
      },
    });
    return response.data;
  },

  getAdminTipCategoryById: async (id: number): Promise<TipCategory> => {
    const response = await apiClient.get(`/admin/tips/categories/${id}`);
    return response.data?.data;
  },

  createAdminTipCategory: async (payload: TipCategoryCreatePayload): Promise<TipCategory> => {
    const response = await apiClient.post('/admin/tips/categories', cleanPayload(payload));
    return response.data?.data;
  },

  updateAdminTipCategory: async (id: number, payload: TipCategoryUpdatePayload): Promise<TipCategory> => {
    const response = await apiClient.put(`/admin/tips/categories/${id}`, cleanPayload(payload));
    return response.data?.data;
  },

  deleteAdminTipCategory: async (id: number) => {
    const response = await apiClient.delete(`/admin/tips/categories/${id}`);
    return response.data;
  },
};
