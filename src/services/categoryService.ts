import { apiClient } from './apiClient';

export type CategoryCreatePayload = {
  name: string;
  description?: string | null;
  image?: string | null;
  is_active?: boolean;
};

export type CategoryUpdatePayload = Partial<CategoryCreatePayload>;

export const createCategory = async (payload: CategoryCreatePayload) => {
  const body: CategoryCreatePayload = {
    name: String(payload.name ?? '').trim(),
    description:
      payload.description !== undefined && payload.description !== null
        ? String(payload.description)
        : null,
    image:
      payload.image !== undefined && payload.image !== null
        ? String(payload.image).trim() || null
        : null,
    is_active: payload.is_active ?? true,
  };

  const response = await apiClient.post('/categories/', body);
  return response.data;
};

export const getCategories = async () => {
  const response = await apiClient.get('/categories/');
  return response.data;
};

export const getCategoryById = async (categoryId: number) => {
  const response = await apiClient.get(`/categories/${categoryId}`);
  return response.data;
};

export const updateCategory = async (categoryId: number, payload: CategoryUpdatePayload) => {
  const body: CategoryUpdatePayload = {
    ...(payload.name !== undefined ? { name: String(payload.name ?? '').trim() } : {}),
    ...(payload.description !== undefined
      ? { description: payload.description === null ? null : String(payload.description) }
      : {}),
    ...(payload.image !== undefined
      ? { image: payload.image === null ? null : String(payload.image).trim() || null }
      : {}),
    ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
  };

  const response = await apiClient.put(`/categories/${categoryId}`, body);
  return response.data;
};

export const deleteCategory = async (categoryId: number) => {
  const response = await apiClient.delete(`/categories/${categoryId}`);
  return response.data;
};
