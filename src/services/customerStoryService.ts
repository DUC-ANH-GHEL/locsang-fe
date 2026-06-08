import axios from 'axios';

import { API_BASE_URL } from '../config/api';
import { apiClient } from './apiClient';

const PUBLIC_API_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '/api');

export type CustomerStory = {
  id: number;
  customer_name: string;
  pet_name?: string | null;
  customer_title?: string | null;
  quote: string;
  rating: number;
  image_url?: string | null;
  is_featured?: boolean;
  is_active?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type CustomerStoryPayload = {
  customer_name: string;
  pet_name?: string | null;
  customer_title?: string | null;
  quote: string;
  rating?: number;
  image_url?: string | null;
  is_featured?: boolean;
  is_active?: boolean;
  sort_order?: number;
};

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

const normalizeStory = (raw: any): CustomerStory => ({
  id: Number(raw?.id || 0),
  customer_name: String(raw?.customer_name || raw?.customerName || '').trim(),
  pet_name: toNullableString(raw?.pet_name ?? raw?.petName),
  customer_title: toNullableString(raw?.customer_title ?? raw?.customerTitle),
  quote: String(raw?.quote || '').trim(),
  rating: Math.max(1, Math.min(5, Number(raw?.rating || 5))),
  image_url: toNullableString(raw?.image_url ?? raw?.imageUrl ?? raw?.image),
  is_featured: Boolean(raw?.is_featured ?? raw?.isFeatured ?? false),
  is_active: Boolean(raw?.is_active ?? raw?.isActive ?? true),
  sort_order: Number(raw?.sort_order ?? raw?.sortOrder ?? 0),
  created_at: toNullableString(raw?.created_at ?? raw?.createdAt) || undefined,
  updated_at: toNullableString(raw?.updated_at ?? raw?.updatedAt) || undefined,
});

const cleanPayload = (payload: CustomerStoryPayload) => ({
  customer_name: String(payload.customer_name || '').trim(),
  pet_name: String(payload.pet_name || '').trim() || null,
  customer_title: String(payload.customer_title || '').trim() || null,
  quote: String(payload.quote || '').trim(),
  rating: Math.max(1, Math.min(5, Number(payload.rating || 5))),
  image_url: String(payload.image_url || '').trim() || null,
  is_featured: payload.is_featured ?? false,
  is_active: payload.is_active ?? true,
  sort_order: Number(payload.sort_order || 0),
});

export const customerStoryService = {
  getAdminStories: async (query?: { search?: string; is_active?: boolean }) => {
    const res = await apiClient.get('/admin/customer-stories', {
      params: {
        search: query?.search?.trim() || undefined,
        is_active: typeof query?.is_active === 'boolean' ? String(query.is_active) : undefined,
      },
    });
    return res.data;
  },

  getAdminStoryById: async (id: number): Promise<CustomerStory> => {
    const res = await apiClient.get(`/admin/customer-stories/${id}`);
    return normalizeStory(res.data?.data || {});
  },

  createAdminStory: async (payload: CustomerStoryPayload): Promise<CustomerStory> => {
    const res = await apiClient.post('/admin/customer-stories', cleanPayload(payload));
    return normalizeStory(res.data?.data || {});
  },

  updateAdminStory: async (id: number, payload: Partial<CustomerStoryPayload>): Promise<CustomerStory> => {
    const res = await apiClient.put(`/admin/customer-stories/${id}`, cleanPayload(payload as CustomerStoryPayload));
    return normalizeStory(res.data?.data || {});
  },

  deleteAdminStory: async (id: number) => {
    const res = await apiClient.delete(`/admin/customer-stories/${id}`);
    return res.data;
  },

  uploadAdminStoryImage: async (file: File, onProgress?: (percent: number) => void): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/admin/customer-stories/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        const percent = Math.min(100, Math.round((event.loaded * 100) / event.total));
        onProgress(percent);
      },
    });
    return res.data;
  },

  getPublicStories: async (limit = 12): Promise<{ success: boolean; data: CustomerStory[] }> => {
    const res = await axios.get(`${PUBLIC_API_BASE_URL}/customer-stories`, { params: { limit } });
    return {
      success: Boolean(res.data?.success),
      data: Array.isArray(res.data?.data) ? res.data.data.map(normalizeStory) : [],
    };
  },
};
