import axios from 'axios';
import imageCompression from 'browser-image-compression';
import { API_BASE_URL } from '../config/api';
import { apiClient } from './apiClient';

const PUBLIC_API_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '/api');
const SAFE_UPLOAD_MAX_MB = 3.8;
const SAFE_UPLOAD_MAX_BYTES = Math.floor(SAFE_UPLOAD_MAX_MB * 1024 * 1024);

const optimizeTipUploadImage = async (file: File): Promise<File> => {
  if (!(file.type || '').startsWith('image/')) {
    throw new Error('File tải lên phải là ảnh');
  }

  if (file.size <= SAFE_UPLOAD_MAX_BYTES) return file;

  // SVG is not reliably compressible in browser canvas-based workflows.
  if ((file.type || '').toLowerCase() === 'image/svg+xml') {
    throw new Error(`Ảnh SVG quá lớn. Vui lòng dùng ảnh dưới ${SAFE_UPLOAD_MAX_MB}MB.`);
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: SAFE_UPLOAD_MAX_MB,
    maxWidthOrHeight: 2560,
    useWebWorker: true,
    initialQuality: 0.82,
  });

  const result = compressed instanceof File
    ? compressed
    : new File([compressed], file.name, { type: file.type || 'image/jpeg' });

  if (result.size > SAFE_UPLOAD_MAX_BYTES) {
    const sizeMb = (result.size / (1024 * 1024)).toFixed(1);
    throw new Error(`Ảnh sau nén vẫn ${sizeMb}MB. Vui lòng chọn ảnh nhẹ hơn ${SAFE_UPLOAD_MAX_MB}MB.`);
  }

  return result;
};

export type TipStatus = 'draft' | 'published' | 'archived';

export type TipPost = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  template_key?: string | null;
  content_blocks?: Array<Record<string, any>>;
  featured_image?: string | null;
  category?: string | null;
  tags: string[];
  status: TipStatus;
  featured: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type TipListResponse = {
  success: boolean;
  data: TipPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages?: number;
    has_next?: boolean;
    has_prev?: boolean;
  };
  filters?: {
    categories?: string[];
  };
};

export type AdminTipsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: TipStatus | 'all';
  featured?: boolean | 'all';
};

export type PublicTipsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  featured?: boolean;
};

export type TipUpsertPayload = {
  title: string;
  slug?: string;
  excerpt?: string | null;
  content?: string | null;
  template_key?: string | null;
  content_blocks?: Array<Record<string, any>>;
  featured_image?: string | null;
  category?: string | null;
  tags?: string[];
  status?: TipStatus;
  featured?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  published_at?: string | null;
};

const cleanPayload = (payload: TipUpsertPayload) => ({
  ...payload,
  title: String(payload.title || '').trim(),
  slug: payload.slug ? String(payload.slug).trim() : undefined,
  excerpt: payload.excerpt === undefined ? undefined : (String(payload.excerpt || '').trim() || null),
  content: payload.content === undefined ? undefined : payload.content,
  template_key: payload.template_key === undefined ? undefined : (String(payload.template_key || '').trim() || null),
  content_blocks:
    payload.content_blocks === undefined
      ? undefined
      : (Array.isArray(payload.content_blocks) ? payload.content_blocks : []),
  featured_image:
    payload.featured_image === undefined
      ? undefined
      : (String(payload.featured_image || '').trim() || null),
  category: payload.category === undefined ? undefined : (String(payload.category || '').trim() || null),
  tags: Array.isArray(payload.tags)
    ? payload.tags.map((x) => String(x).trim()).filter(Boolean)
    : undefined,
  seo_title: payload.seo_title === undefined ? undefined : (String(payload.seo_title || '').trim() || null),
  seo_description:
    payload.seo_description === undefined
      ? undefined
      : (String(payload.seo_description || '').trim() || null),
  published_at: payload.published_at === undefined ? undefined : (payload.published_at || null),
});

export const tipService = {
  getAdminTips: async (query: AdminTipsQuery = {}): Promise<TipListResponse> => {
    const res = await apiClient.get('/admin/tips', {
      params: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        search: query.search?.trim() || undefined,
        status: query.status && query.status !== 'all' ? query.status : undefined,
        featured: typeof query.featured === 'boolean' ? String(query.featured) : undefined,
      },
    });
    return res.data;
  },

  getAdminTipById: async (id: number): Promise<TipPost> => {
    const res = await apiClient.get(`/admin/tips/${id}`);
    return res.data?.data;
  },

  createAdminTip: async (payload: TipUpsertPayload): Promise<TipPost> => {
    const res = await apiClient.post('/admin/tips', cleanPayload(payload));
    return res.data?.data;
  },

  updateAdminTip: async (id: number, payload: Partial<TipUpsertPayload>): Promise<TipPost> => {
    const res = await apiClient.put(`/admin/tips/${id}`, cleanPayload(payload as TipUpsertPayload));
    return res.data?.data;
  },

  deleteAdminTip: async (id: number) => {
    const res = await apiClient.delete(`/admin/tips/${id}`);
    return res.data;
  },

  uploadAdminTipImage: async (file: File, onProgress?: (percent: number) => void): Promise<{ url: string }> => {
    const uploadFile = await optimizeTipUploadImage(file);
    const formData = new FormData();
    formData.append('file', uploadFile);
    const res = await apiClient.post('/admin/tips/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        const percent = Math.min(100, Math.round((event.loaded * 100) / event.total));
        onProgress(percent);
      },
    });
    return res.data;
  },

  getPublicTips: async (query: PublicTipsQuery = {}): Promise<TipListResponse> => {
    const res = await axios.get(`${PUBLIC_API_BASE_URL}/tips`, {
      params: {
        page: query.page ?? 1,
        limit: query.limit ?? 9,
        search: query.search?.trim() || undefined,
        category: query.category?.trim() || undefined,
        featured: typeof query.featured === 'boolean' ? String(query.featured) : undefined,
        _t: Date.now(),
      },
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    return res.data;
  },

  getPublicTipDetail: async (slug: string): Promise<{ success: boolean; data: TipPost; related: TipPost[] }> => {
    const res = await axios.get(`${PUBLIC_API_BASE_URL}/tips/${slug}`, {
      params: { _t: Date.now() },
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    return res.data;
  },
};
