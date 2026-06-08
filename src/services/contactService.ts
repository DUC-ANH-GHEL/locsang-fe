import axios from 'axios';

import { API_BASE_URL } from '../config/api';

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

export type ContactPayload = {
  name: string;
  phone: string;
  message: string;
  email?: string;
  subject?: string;
};

export const contactService = {
  submitContact: async (payload: ContactPayload) => {
    const baseUrl = getPublicApiBaseUrl();
    const response = await axios.post(`${baseUrl}/contacts`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response?.data;
  },
};
