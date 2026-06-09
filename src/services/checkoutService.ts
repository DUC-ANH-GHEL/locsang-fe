import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { STOREFRONT_TOKEN_KEY } from './customerAccountService';

const getPublicApiBaseUrl = () => {
  const normalized = String(API_BASE_URL || '').replace(/\/+$/, '');
  if (/\/api\/v1$/i.test(normalized)) {
    return normalized.replace(/\/api\/v1$/i, '/api');
  }
  if (/\/api$/i.test(normalized)) {
    return normalized;
  }
  return `${normalized}/api`;
};

export type PublicCheckoutItem = {
  product_id: number;
  product_variant_id?: number | null;
  quantity: number;
};

export type PublicCheckoutPayload = {
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  note?: string;
  payment_method?: string;
  items: PublicCheckoutItem[];
};

export const checkoutService = {
  createPublicOrder: async (payload: PublicCheckoutPayload) => {
    const baseUrl = getPublicApiBaseUrl();
    const token =
      localStorage.getItem(STOREFRONT_TOKEN_KEY) ||
      sessionStorage.getItem(STOREFRONT_TOKEN_KEY) ||
      null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await axios.post(`${baseUrl}/orders`, payload, {
      headers,
    });
    return response?.data;
  },
};
