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
  receiver_province_id?: number;
  receiver_district_id?: number;
  receiver_ward_id?: number;
  receiver_province_name?: string;
  receiver_district_name?: string;
  receiver_ward_name?: string;
  note?: string;
  payment_method?: string;
  items: PublicCheckoutItem[];
};

export type AddressOption = {
  id: number;
  name: string;
};

const OPEN_PROVINCE_BASE_URL = 'https://provinces.open-api.vn/api';
const ADDRESS_REQUEST_TIMEOUT_MS = 1200;

let provincesCache: AddressOption[] | null = null;
const districtsByProvinceCache = new Map<number, AddressOption[]>();
const wardsByDistrictCache = new Map<number, AddressOption[]>();

const toValidId = (value: unknown): number => {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : 0;
};

const normalizeAddressOptions = (list: unknown): AddressOption[] => {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      const source = item as Record<string, unknown>;
      const id = Number(source?.id ?? source?.code ?? source?.PROVINCE_ID ?? source?.DISTRICT_ID ?? source?.WARDS_ID ?? 0);
      const name = String(source?.name ?? source?.PROVINCE_NAME ?? source?.DISTRICT_NAME ?? source?.WARDS_NAME ?? '').trim();
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { id, name } as AddressOption;
    })
    .filter(Boolean) as AddressOption[];
};

const cacheOpenApiProvincePayload = (provinceData: unknown, fallbackProvinceId?: number) => {
  const source = (provinceData as Record<string, unknown>) || {};
  const provinceId = toValidId(source?.id ?? source?.code ?? fallbackProvinceId);
  const districtsRaw = Array.isArray(source?.districts) ? source.districts : [];
  const districts = normalizeAddressOptions(districtsRaw);

  if (provinceId > 0 && districts.length > 0) {
    districtsByProvinceCache.set(provinceId, districts);
  }

  for (const districtRaw of districtsRaw) {
    const districtSource = districtRaw as Record<string, unknown>;
    const districtId = toValidId(districtSource?.id ?? districtSource?.code ?? districtSource?.DISTRICT_ID);
    if (!districtId) continue;

    const wards = normalizeAddressOptions(districtSource?.wards);
    if (wards.length > 0) {
      wardsByDistrictCache.set(districtId, wards);
    }
  }

  return districts;
};

const fetchBackendAddressList = async (
  url: string,
  params?: Record<string, unknown>,
): Promise<AddressOption[]> => {
  try {
    const response = await axios.get(url, {
      params,
      timeout: ADDRESS_REQUEST_TIMEOUT_MS,
    });
    return normalizeAddressOptions(response?.data?.data);
  } catch {
    return [];
  }
};

const getOpenApiProvinces = async (): Promise<AddressOption[]> => {
  const response = await axios.get(`${OPEN_PROVINCE_BASE_URL}/p/`, {
    timeout: ADDRESS_REQUEST_TIMEOUT_MS,
  });
  return normalizeAddressOptions(response?.data);
};

const getOpenApiDistricts = async (provinceId?: number): Promise<AddressOption[]> => {
  const normalizedProvinceId = toValidId(provinceId);
  if (!normalizedProvinceId) return [];

  const cached = districtsByProvinceCache.get(normalizedProvinceId);
  if (cached && cached.length > 0) return cached;

  const response = await axios.get(`${OPEN_PROVINCE_BASE_URL}/p/${normalizedProvinceId}?depth=3`, {
    timeout: ADDRESS_REQUEST_TIMEOUT_MS,
  });
  const districts = cacheOpenApiProvincePayload(response?.data, normalizedProvinceId);
  return districts;
};

const getOpenApiCommunes = async (districtId?: number): Promise<AddressOption[]> => {
  const normalizedDistrictId = toValidId(districtId);
  if (!normalizedDistrictId) return [];

  const cached = wardsByDistrictCache.get(normalizedDistrictId);
  if (cached && cached.length > 0) return cached;

  const response = await axios.get(`${OPEN_PROVINCE_BASE_URL}/d/${normalizedDistrictId}?depth=2`, {
    timeout: ADDRESS_REQUEST_TIMEOUT_MS,
  });
  const wards = (response?.data as Record<string, unknown>)?.wards;
  const normalized = normalizeAddressOptions(wards);
  if (normalized.length > 0) {
    wardsByDistrictCache.set(normalizedDistrictId, normalized);
  }
  return normalized;
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

  getPancakeProvinces: async (): Promise<AddressOption[]> => {
    if (provincesCache && provincesCache.length > 0) {
      return provincesCache;
    }

    const baseUrl = getPublicApiBaseUrl();
    const backendList = await fetchBackendAddressList(`${baseUrl}/orders/pancake-addresses/provinces`);
    if (backendList.length > 0) {
      provincesCache = backendList;
      return backendList;
    }

    try {
      const openApiList = await getOpenApiProvinces();
      if (openApiList.length > 0) {
        provincesCache = openApiList;
      }
      return openApiList;
    } catch {
      return [];
    }
  },

  getPancakeDistricts: async (provinceId?: number): Promise<AddressOption[]> => {
    const normalizedProvinceId = toValidId(provinceId);
    if (!normalizedProvinceId) return [];

    const cached = districtsByProvinceCache.get(normalizedProvinceId);
    if (cached && cached.length > 0) {
      return cached;
    }

    const baseUrl = getPublicApiBaseUrl();
    const backendList = await fetchBackendAddressList(`${baseUrl}/orders/pancake-addresses/districts`, {
      provinceId: normalizedProvinceId,
    });
    if (backendList.length > 0) {
      districtsByProvinceCache.set(normalizedProvinceId, backendList);
      return backendList;
    }

    try {
      const openApiList = await getOpenApiDistricts(normalizedProvinceId);
      if (openApiList.length > 0) {
        districtsByProvinceCache.set(normalizedProvinceId, openApiList);
      }
      return openApiList;
    } catch {
      return [];
    }
  },

  getPancakeCommunes: async (districtId?: number): Promise<AddressOption[]> => {
    const normalizedDistrictId = toValidId(districtId);
    if (!normalizedDistrictId) return [];

    const cached = wardsByDistrictCache.get(normalizedDistrictId);
    if (cached && cached.length > 0) {
      return cached;
    }

    const baseUrl = getPublicApiBaseUrl();
    const backendList = await fetchBackendAddressList(`${baseUrl}/orders/pancake-addresses/communes`, {
      districtId: normalizedDistrictId,
    });
    if (backendList.length > 0) {
      wardsByDistrictCache.set(normalizedDistrictId, backendList);
      return backendList;
    }

    try {
      const openApiList = await getOpenApiCommunes(normalizedDistrictId);
      if (openApiList.length > 0) {
        wardsByDistrictCache.set(normalizedDistrictId, openApiList);
      }
      return openApiList;
    } catch {
      return [];
    }
  },
};
