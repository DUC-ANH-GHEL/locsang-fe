import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export const STOREFRONT_TOKEN_KEY = 'storefrontToken';
export const STOREFRONT_USER_KEY = 'storefrontUser';

export type StorefrontUser = {
  id: number;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type StorefrontOrderItem = {
  product_id: number;
  product_variant_id?: number | null;
  name: string;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export type StorefrontOrder = {
  id: number;
  tracking_code?: string | null;
  pancake_order_id?: string | null;
  status: string;
  pancake_status_raw?: unknown;
  payment_status: string;
  payment_method: string;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  receiver_address?: string | null;
  total_amount: number;
  created_at: string;
  items: StorefrontOrderItem[];
};

export type StorefrontCartItem = {
  item_key: string;
  product_id?: number;
  product_variant_id?: number | null;
  sku?: string;
  variant_label?: string;
  title: string;
  image: string;
  price: number;
  quantity: number;
};

type AuthResponse = {
  access_token: string;
  token_type: string;
  user: StorefrontUser;
};

type ForgotPasswordResponse = {
  success: boolean;
  message: string;
  reset_token?: string;
  reset_url?: string;
};

type AccountOrdersResponse = {
  success: boolean;
  data: StorefrontOrder[];
};

type AccountOrderActionResponse = {
  success: boolean;
  data: StorefrontOrder;
};

type AccountCartResponse = {
  success: boolean;
  data: StorefrontCartItem[];
};

const getPublicApiBaseUrl = () => {
  const normalized = String(API_BASE_URL || '').replace(/\/+$/, '');
  if (/\/api\/v1$/i.test(normalized)) return normalized.replace(/\/api\/v1$/i, '/api');
  if (/\/api$/i.test(normalized)) return normalized;
  return `${normalized}/api`;
};

const publicApi = axios.create({
  baseURL: getPublicApiBaseUrl(),
});

publicApi.interceptors.request.use((config) => {
  const token =
    localStorage.getItem(STOREFRONT_TOKEN_KEY) ||
    sessionStorage.getItem(STOREFRONT_TOKEN_KEY);
  if (token) {
    const headers: any = (config.headers ??= {});
    if (!headers.Authorization) headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const saveStorefrontSession = (auth: AuthResponse) => {
  localStorage.setItem(STOREFRONT_TOKEN_KEY, String(auth.access_token || ''));
  localStorage.setItem(STOREFRONT_USER_KEY, JSON.stringify(auth.user || null));
};

export const clearStorefrontSession = () => {
  localStorage.removeItem(STOREFRONT_TOKEN_KEY);
  localStorage.removeItem(STOREFRONT_USER_KEY);
};

export const loadStoredStorefrontUser = (): StorefrontUser | null => {
  try {
    const raw = localStorage.getItem(STOREFRONT_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.id || !parsed.email) return null;
    return parsed as StorefrontUser;
  } catch {
    return null;
  }
};

export const registerStorefrontAccount = async (payload: {
  email: string;
  password: string;
  full_name: string;
}) => {
  const response = await publicApi.post<AuthResponse>('/account/register', payload);
  return response.data;
};

export const loginStorefrontAccount = async (payload: { email: string; password: string }) => {
  const response = await publicApi.post<AuthResponse>('/account/login', payload);
  return response.data;
};

export const loginStorefrontGoogle = async (payload: { id_token: string; client_id?: string }) => {
  const response = await publicApi.post<AuthResponse>('/account/google', payload);
  return response.data;
};

export const loginStorefrontFacebook = async (payload: { access_token: string; user_id?: string }) => {
  const response = await publicApi.post<AuthResponse>('/account/facebook', payload);
  return response.data;
};

export const forgotStorefrontPassword = async (payload: { email: string }) => {
  const response = await publicApi.post<ForgotPasswordResponse>('/account/forgot-password', payload);
  return response.data;
};

export const resetStorefrontPassword = async (payload: { token: string; new_password: string }) => {
  const response = await publicApi.post<{ success: boolean; message: string }>('/account/reset-password', payload);
  return response.data;
};

export const getStorefrontMe = async () => {
  const response = await publicApi.get<StorefrontUser>('/account/me');
  return response.data;
};

export const updateStorefrontMe = async (payload: {
  email?: string;
  full_name?: string;
  password?: string;
}) => {
  const response = await publicApi.put<StorefrontUser>('/account/me', payload);
  return response.data;
};

export const getStorefrontMyOrders = async (receiverPhone?: string): Promise<StorefrontOrder[]> => {
  const response = await publicApi.get<AccountOrdersResponse>('/account/orders', {
    params: {
      ...(receiverPhone ? { receiverPhone } : {}),
      _ts: Date.now(),
    },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

export const cancelStorefrontOrder = async (orderId: number): Promise<StorefrontOrder> => {
  const response = await publicApi.post<AccountOrderActionResponse>(`/account/orders/${orderId}/cancel`);
  return response.data?.data as StorefrontOrder;
};

export const lookupPublicOrder = async (payload: { trackingCode: string; phone: string }): Promise<StorefrontOrder> => {
  const response = await publicApi.get<{ success: boolean; data: StorefrontOrder }>('/orders/lookup', {
    params: {
      trackingCode: payload.trackingCode,
      phone: payload.phone,
      _ts: Date.now(),
    },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
  return response.data?.data as StorefrontOrder;
};

export const getStorefrontCart = async (): Promise<StorefrontCartItem[]> => {
  const response = await publicApi.get<AccountCartResponse>('/account/cart');
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

export const replaceStorefrontCart = async (items: StorefrontCartItem[]): Promise<StorefrontCartItem[]> => {
  const response = await publicApi.put<AccountCartResponse>('/account/cart', { items });
  return Array.isArray(response.data?.data) ? response.data.data : [];
};
