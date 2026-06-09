import { apiClient } from './apiClient';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const CATEGORY_PUBLIC_URL = `${String(API_BASE_URL || '').replace(/\/+$/, '')}/categories/`;

export type Category = {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
  image?: string | null;
  is_active?: boolean;
};

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

export const getPublicCategories = async (): Promise<Category[]> => {
  const response = await axios.get(CATEGORY_PUBLIC_URL);
  const data = Array.isArray(response.data) ? response.data : [];
  return data
    .map((item: any) => ({
      id: Number(item?.id ?? 0),
      name: String(item?.name ?? '').trim(),
      slug: item?.slug ?? null,
      description: item?.description ?? null,
      image: item?.image ?? null,
      is_active: item?.is_active ?? true,
    }))
    .filter((item: Category) => item.id > 0 && item.name);
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
