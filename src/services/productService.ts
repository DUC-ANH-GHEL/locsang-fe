import axios from 'axios';
import { Product } from '../types/product';
import { API_BASE_URL } from '../config/api';
import { apiClient } from './apiClient';
import { optimizeImageForUpload } from '../utils/imageUploadOptimization';
import { parseApiDateTime } from '../utils/dateTime';

type GetProductsParams = {
  search?: string;
  status?: boolean | string;
  page?: number;
  limit?: number;
};

export type AdminProductStatus = 'active' | 'draft' | 'discontinued';
export type StockStatus = 'in_stock' | 'low' | 'out';

export type AdminProductsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | AdminProductStatus;
  category_id?: number | string;
  brand?: string;
  has_variants?: boolean | 'all';
  stock_status?: StockStatus | 'all';
  min_price?: number | string;
  max_price?: number | string;
  sort?:
    | 'name_asc'
    | 'name_desc'
    | 'price_asc'
    | 'price_desc'
    | 'stock_asc'
    | 'stock_desc'
    | 'created_asc'
    | 'created_desc'
    | 'updated_asc'
    | 'updated_desc';
};

export type AdminProductListItem = {
  id: number;
  name: string;
  sku?: string | null;
  slug?: string | null;
  thumbnail?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  stock_total?: number | null;
  variant_count?: number | null;
  status?: AdminProductStatus | null;
  is_active?: boolean | null;
  category?: string | null;
  category_id?: number | null;
  brand?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AdminProductSpecification = {
  label: string;
  value: string;
};

export type AdminProductMedia = {
  url: string;
  type?: 'image' | 'video';
  sort_order?: number;
  public_id?: string | null;
};

export type AdminProductVariantPayload = {
  id?: number;
  sku: string;
  price: number;
  sale_price?: number | null;
  stock: number;
  manage_stock?: boolean;
  allow_backorder?: boolean;
  status?: AdminProductStatus | 'inactive';
  attribute_values?: Record<string, string>;
  image_url?: string | null;
};

export type AdminProductPayload = {
  name: string;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  status: AdminProductStatus;
  category_id: number;
  brand?: string | null;
  tags?: string[];
  specifications?: AdminProductSpecification[];
  has_variants: boolean;
  media?: AdminProductMedia[];
  attributes?: Array<{ id?: number; name: string; values: string[] }>;
  variants: AdminProductVariantPayload[];
  deleted_variant_ids?: number[];
  deleted_attribute_ids?: number[];
};

export type AdminProductsResponse = {
  data: AdminProductListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

type StorefrontProductsParams = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string | number;
  minPrice?: string | number;
  maxPrice?: string | number;
  status?: 'active' | 'inactive';
  sortBy?: 'createdAt' | 'price' | 'name' | 'bestSelling';
  order?: 'asc' | 'desc';
  includeTotal?: boolean;
  saleOnly?: boolean;
  card?: boolean;
  cacheKey?: string;
  cacheTtlMs?: number;
};

type StorefrontProductsPage = {
  items: Product[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

const STORE_DEFAULT_IMAGE_URL = '/favicon.svg';

const toNumberOrUndefined = (value: any) => {
  if (value === null || value === undefined || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const getPublicApiBaseUrl = () => {
  const normalized = String(API_BASE_URL || '').replace(/\/+$/, '');
  if (/\/api\/v1$/i.test(normalized)) return normalized.replace(/\/api\/v1$/i, '/api');
  if (/\/api$/i.test(normalized)) return normalized;
  return `${normalized}/api`;
};

const toDate = (value: any) => {
  if (!value) return new Date();
  const date = parseApiDateTime(value);
  return !date || Number.isNaN(date.getTime()) ? new Date() : date;
};

const getProductThumb = (product: any): string | undefined => {
  const direct = product?.thumbnail || product?.image || product?.image_url || product?.imageUrl;
  if (typeof direct === 'string' && direct.trim()) return direct;

  const images = Array.isArray(product?.images) ? product.images : [];
  for (const image of images) {
    if (typeof image === 'string' && image.trim()) return image;
    if (image && typeof image === 'object') {
      const url = image.image_url || image.url;
      if (typeof url === 'string' && url.trim()) return url;
    }
  }

  const media = Array.isArray(product?.media) ? product.media : [];
  for (const item of media) {
    const type = String(item?.type || 'image').toLowerCase();
    const url = String(item?.url || '').trim();
    if (type === 'image' && url) return url;
  }

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  for (const variant of variants) {
    const url = variant?.image_url || variant?.image || variant?.thumbnail;
    if (typeof url === 'string' && url.trim()) return url;
  }

  return undefined;
};

const mapProductToAdminListItemFallback = (product: any): AdminProductListItem => {
  const variants: any[] = Array.isArray(product?.variants) ? product.variants : [];
  const variantCount =
    typeof product?.variant_count === 'number' ? product.variant_count : variants.length > 0 ? variants.length : 0;
  const prices = variants.map((variant) => Number(variant?.price)).filter((price) => Number.isFinite(price) && price > 0);
  const stocks = variants.map((variant) => Number(variant?.stock)).filter((stock) => Number.isFinite(stock));

  const status: AdminProductStatus =
    typeof product?.status === 'string'
      ? (product.status as AdminProductStatus)
      : Boolean(product?.is_active)
        ? 'active'
        : 'draft';

  return {
    id: Number(product?.id),
    name: String(product?.name ?? ''),
    sku: product?.sku ?? null,
    slug: product?.slug ?? null,
    thumbnail: getProductThumb(product) ?? null,
    price_min: prices.length > 0 ? Math.min(...prices) : toNumberOrUndefined(product?.price) ?? null,
    price_max: prices.length > 0 ? Math.max(...prices) : toNumberOrUndefined(product?.price) ?? null,
    stock_total: stocks.length > 0 ? stocks.reduce((sum, stock) => sum + stock, 0) : toNumberOrUndefined(product?.stock) ?? null,
    variant_count: variantCount,
    status,
    is_active: product?.is_active ?? null,
    category: product?.category?.name ?? product?.category ?? null,
    category_id: typeof product?.category_id === 'number' ? product.category_id : toNumberOrUndefined(product?.category_id) ?? null,
    brand: product?.brand ?? null,
    created_at: product?.created_at ?? product?.createdAt ?? null,
    updated_at: product?.updated_at ?? product?.updatedAt ?? null,
  };
};

const collectStorefrontImageCandidates = (raw: any): string[] => {
  const images: string[] = [];
  const seen = new Set<string>();
  const push = (value: any) => {
    const url = String(value || '').trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    images.push(url);
  };

  if (Array.isArray(raw?.images)) {
    raw.images.forEach((image: any) => {
      if (typeof image === 'string') push(image);
      else push(image?.url || image?.image_url);
    });
  }

  push(raw?.thumbnail);
  push(raw?.image);
  push(raw?.image_url);

  if (Array.isArray(raw?.variants)) {
    raw.variants.forEach((variant: any) => {
      push(variant?.imageUrl);
      push(variant?.image_url);
      push(variant?.image);
      const mediaUrls = Array.isArray(variant?.mediaUrls)
        ? variant.mediaUrls
        : Array.isArray(variant?.media_urls)
          ? variant.media_urls
          : [];
      mediaUrls.forEach(push);
    });
  }

  return images.length > 0 ? images : [STORE_DEFAULT_IMAGE_URL];
};

export const normalizePublicProduct = (raw: any): Product => {
  const variants = Array.isArray(raw?.variants) ? raw.variants : [];
  const images = collectStorefrontImageCandidates(raw);
  const categoryId = Number(raw?.category?.id ?? raw?.category_id ?? 0);
  const stock = Number(raw?.stock ?? 0);
  const allowBackorder = Boolean(raw?.allowBackorder ?? raw?.allow_backorder ?? false);
  const status = raw?.status === 'inactive' ? 'inactive' : 'active';
  const specifications = (Array.isArray(raw?.specifications) ? raw.specifications : [])
    .map((item: any) => ({
      label: String(item?.label ?? item?.key ?? item?.name ?? '').trim(),
      value: String(item?.value ?? '').trim(),
    }))
    .filter((item: { label: string; value: string }) => item.label && item.value);
  const variantAttributesRaw = Array.isArray(raw?.variantAttributes)
    ? raw.variantAttributes
    : Array.isArray(raw?.variant_attributes)
      ? raw.variant_attributes
      : [];
  const variantAttributes = variantAttributesRaw
    .map((attribute: any) => ({
      name: String(attribute?.name ?? '').trim(),
      values: Array.isArray(attribute?.values)
        ? attribute.values.map((value: any) => String(value ?? '').trim()).filter(Boolean)
        : [],
    }))
    .filter((attribute: { name: string; values: string[] }) => attribute.name && attribute.values.length > 0);

  return {
    id: Number(raw?.id ?? 0),
    name: String(raw?.name ?? ''),
    description: String(raw?.description ?? raw?.short_description ?? ''),
    short_description: raw?.shortDescription ?? raw?.short_description ?? null,
    slug: raw?.slug ?? null,
    price: Number(raw?.price ?? 0),
    sale_price: toNumberOrUndefined(raw?.salePrice ?? raw?.sale_price) ?? null,
    currency: String(raw?.currency ?? 'VND'),
    thumbnail: images[0] || null,
    images,
    category_id: Number.isFinite(categoryId) ? categoryId : 0,
    category_name: String(raw?.category?.name ?? raw?.category_name ?? ''),
    sku: String(raw?.sku ?? `SKU-${raw?.id ?? 'N/A'}`),
    stock,
    sold_count: Number(raw?.soldCount ?? raw?.sold_count ?? 0),
    allow_backorder: allowBackorder,
    can_purchase: Boolean(raw?.canPurchase ?? raw?.can_purchase ?? (stock > 0 || allowBackorder)),
    stock_status: String(raw?.stockStatus ?? raw?.stock_status ?? ''),
    status,
    is_active: status === 'active',
    created_at: toDate(raw?.createdAt ?? raw?.created_at),
    updated_at: toDate(raw?.updatedAt ?? raw?.updated_at),
    brand: raw?.brand ?? null,
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    specifications,
    has_variants: Boolean(raw?.hasVariants ?? raw?.has_variants ?? false),
    variant_attributes: variantAttributes,
    variantAttributes,
    variants: variants.map((variant: any) => {
      const variantStock = Number(variant?.stock ?? 0);
      const variantAllowBackorder = Boolean(variant?.allowBackorder ?? variant?.allow_backorder ?? false);
      return {
        id: toNumberOrUndefined(variant?.id),
        sku: String(variant?.sku ?? ''),
        price: Number(variant?.price ?? 0),
        sale_price: toNumberOrUndefined(variant?.salePrice ?? variant?.sale_price) ?? null,
        stock: variantStock,
        manage_stock: Boolean(variant?.manageStock ?? variant?.manage_stock ?? true),
        allow_backorder: variantAllowBackorder,
        can_purchase: Boolean(
          variant?.canPurchase ??
            variant?.can_purchase ??
            (!Boolean(variant?.manageStock ?? variant?.manage_stock ?? true) || variantStock > 0 || variantAllowBackorder),
        ),
        status: variant?.status ?? 'active',
        is_active: Boolean(variant?.isActive ?? variant?.is_active ?? true),
        image: variant?.imageUrl ?? variant?.image_url ?? null,
        attribute_values:
          (variant?.attributeValues && typeof variant.attributeValues === 'object' && !Array.isArray(variant.attributeValues)
            ? variant.attributeValues
            : variant?.attribute_values && typeof variant.attribute_values === 'object' && !Array.isArray(variant.attribute_values)
              ? variant.attribute_values
              : {}) || {},
        attributes: Array.isArray(variant?.attributes) ? variant.attributes : [],
        variant_name: variant?.variantName ?? variant?.variant_name ?? null,
        media_urls: Array.isArray(variant?.mediaUrls)
          ? variant.mediaUrls.filter((item: any) => typeof item === 'string' && item.trim() !== '')
          : Array.isArray(variant?.media_urls)
            ? variant.media_urls.filter((item: any) => typeof item === 'string' && item.trim() !== '')
            : [],
        video_urls: Array.isArray(variant?.videoUrls)
          ? variant.videoUrls.filter((item: any) => typeof item === 'string' && item.trim() !== '')
          : Array.isArray(variant?.video_urls)
            ? variant.video_urls.filter((item: any) => typeof item === 'string' && item.trim() !== '')
            : [],
      };
    }),
    raw_data: raw,
  } as Product;
};

export const getAdminProducts = async (query: AdminProductsQuery): Promise<AdminProductsResponse> => {
  const page = typeof query?.page === 'number' && query.page > 0 ? query.page : 1;
  const limit = typeof query?.limit === 'number' && query.limit > 0 ? query.limit : 20;

  try {
    const response = await apiClient.get('/admin/products', {
      params: {
        page,
        limit,
        search: query?.search ?? undefined,
        status: query?.status && query.status !== 'all' ? query.status : undefined,
        category_id: query?.category_id ?? undefined,
        brand: query?.brand ?? undefined,
        has_variants: typeof query?.has_variants === 'boolean' ? String(query.has_variants) : undefined,
        stock_status: query?.stock_status && query.stock_status !== 'all' ? query.stock_status : undefined,
        min_price: toNumberOrUndefined(query?.min_price),
        max_price: toNumberOrUndefined(query?.max_price),
        sort: query?.sort ?? undefined,
      },
    });

    const rawData = Array.isArray(response?.data?.data)
      ? response.data.data
      : Array.isArray(response?.data)
        ? response.data
        : [];
    const data = rawData.map((item: any) => {
      const normalized = { ...item };
      if (normalized?.category && typeof normalized.category === 'object') {
        normalized.category = normalized.category?.name ?? null;
      }
      if (!normalized.thumbnail) normalized.thumbnail = getProductThumb(normalized) ?? null;
      return normalized;
    });
    const pagination = response?.data?.pagination;

    return {
      data,
      pagination: {
        page: Number(pagination?.page ?? page),
        limit: Number(pagination?.limit ?? limit),
        total: Number(pagination?.total ?? response?.data?.total ?? data.length ?? 0),
      },
    };
  } catch (error: any) {
    if (error?.response?.status !== 404) throw error;

    const products = await getStorefrontProducts({
      page: 1,
      limit: 100,
      search: query?.search,
      status: query?.status === 'draft' || query?.status === 'discontinued' ? 'inactive' : 'active',
    });
    const mapped = products.map(mapProductToAdminListItemFallback);
    const start = (page - 1) * limit;
    return {
      data: mapped.slice(start, start + limit),
      pagination: { page, limit, total: mapped.length },
    };
  }
};

export const uploadAdminProductImage = async (file: File): Promise<{ url: string; public_id?: string | null }> => {
  const uploadFile = await optimizeImageForUpload(file);
  const formData = new FormData();
  formData.append('file', uploadFile);
  const response = await apiClient.post('/admin/products/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return {
    url: String(response.data?.url || ''),
    public_id: response.data?.public_id ?? null,
  };
};

export const cleanupAdminProductUploads = async (publicIds: string[]): Promise<void> => {
  const uniqueIds = Array.from(new Set(publicIds.map((item) => String(item || '').trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return;
  await apiClient.post('/admin/products/upload-image/cleanup', { public_ids: uniqueIds });
};

export const createAdminProduct = async (payload: AdminProductPayload) => {
  const response = await apiClient.post('/admin/products', payload);
  return response.data;
};

export const updateAdminProduct = async (productId: number, payload: Partial<AdminProductPayload>) => {
  const response = await apiClient.put(`/admin/products/${productId}`, payload);
  return response.data;
};

export const updateAdminProductSeo = async (
  productId: number,
  seoUpdate: {
    slug?: string;
    seo_slug?: string;
    meta_title?: string | null;
    meta_description?: string | null;
    short_description?: string | null;
  },
): Promise<any> => {
  const response = await apiClient.put(`/admin/products/${productId}`, seoUpdate);
  return response.data;
};

export const bulkUpdateProducts = async (payload: {
  ids: number[];
  action: 'status' | 'delete' | 'category';
  data: any;
}) => {
  const ids = Array.isArray(payload?.ids) ? payload.ids.map((item) => Number(item)).filter(Number.isFinite) : [];
  if (ids.length === 0) throw new Error('Chưa chọn sản phẩm');

  const response = await apiClient.patch('/admin/products/bulk', {
    ids,
    action: payload.action,
    data: payload.data,
  });
  return response.data;
};

export const updateProductPartial = async (productId: number, patch: any) => {
  const rawPatch = patch && typeof patch === 'object' ? patch : {};
  const adminPatch: Record<string, unknown> = {};

  if (rawPatch.price !== undefined) adminPatch.price = Number(rawPatch.price);
  if (rawPatch.sale_price !== undefined) {
    adminPatch.sale_price = rawPatch.sale_price === null || rawPatch.sale_price === '' ? null : Number(rawPatch.sale_price);
  }
  if (rawPatch.stock !== undefined) adminPatch.stock = Number(rawPatch.stock);
  if (rawPatch.status !== undefined) adminPatch.status = String(rawPatch.status).toLowerCase();
  if (rawPatch.category_id !== undefined) adminPatch.category_id = Number(rawPatch.category_id);

  if (Object.keys(adminPatch).length === 0) return { success: true, skipped: true };

  const response = await apiClient.patch(`/admin/products/${productId}`, adminPatch);
  return response.data;
};

export const getProductVariants = async (productId: number) => {
  const response = await apiClient.get(`/admin/products/${productId}`);
  return Array.isArray(response?.data?.variants) ? response.data.variants : [];
};

export const updateVariantPartial = async (variantId: number, patch: any) => {
  const response = await apiClient.patch(`/admin/products/variants/${variantId}`, patch);
  return response.data;
};

export const getProductById = async (id: number | string) => {
  const response = await apiClient.get(`/admin/products/${id}`);
  return response.data;
};

export const getStorefrontProductPage = async (params: StorefrontProductsParams = {}): Promise<StorefrontProductsPage> => {
  const requestedLimit = Number(params.limit ?? 100);
  const safeLimit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, requestedLimit)) : 100;

  const requestParams = {
    page: params.page ?? 1,
    limit: safeLimit,
    search: params.search,
    categoryId: params.categoryId,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    status: params.status ?? 'active',
    sortBy: params.sortBy,
    order: params.order,
    saleOnly: params.saleOnly ? 'true' : undefined,
    includeTotal: params.includeTotal === false ? 'false' : undefined,
    card: params.card ? 'true' : undefined,
  };

  const response = await axios.get(`${getPublicApiBaseUrl()}/products`, {
    params: requestParams,
  });

  const items = Array.isArray(response?.data?.data) ? response.data.data : [];
  const pagination = response?.data?.pagination || {};
  return {
    items: items.map(normalizePublicProduct),
    pagination: {
      page: Number(pagination?.page ?? requestParams.page ?? 1),
      limit: Number(pagination?.limit ?? safeLimit),
      totalItems: Number(pagination?.totalItems ?? items.length),
      totalPages: Number(pagination?.totalPages ?? 1),
      hasNext: Boolean(pagination?.hasNext ?? false),
      hasPrev: Boolean(pagination?.hasPrev ?? Number(requestParams.page ?? 1) > 1),
    },
  };
};

export const getStorefrontProducts = async (params: StorefrontProductsParams = {}) => {
  const page = await getStorefrontProductPage(params);
  return page.items;
};

export const getProducts = async (params: GetProductsParams = {}) => {
  const products = await getStorefrontProducts({
    page: params.page,
    limit: params.limit,
    search: params.search,
    status: params.status === false || params.status === 'inactive' ? 'inactive' : 'active',
  });
  return { data: products, total: products.length, totalCount: products.length };
};

export const getStorefrontProductById = async (id: number | string) => {
  const response = await axios.get(`${getPublicApiBaseUrl()}/products/${id}`);
  const raw = response?.data?.data;
  if (!raw) return null;
  return normalizePublicProduct(raw);
};

export const getStorefrontProductByIdFresh = async (id: number | string) => {
  const productId = Number(id);
  if (!Number.isFinite(productId) || productId <= 0) return null;

  try {
    const response = await axios.get(`${getPublicApiBaseUrl()}/products/${productId}`, {
      params: { _checkout: Date.now() },
      headers: { 'Cache-Control': 'no-cache' },
    });
    const raw = response?.data?.data;
    if (!raw) return null;
    return normalizePublicProduct(raw);
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};

export const getStorefrontProductBySlug = async (slug: string) => {
  const safeSlug = String(slug || '').trim();
  if (!safeSlug) return null;

  const response = await axios.get(`${getPublicApiBaseUrl()}/products/slug/${encodeURIComponent(safeSlug)}`);
  const raw = response?.data?.data;
  if (!raw) return null;
  return normalizePublicProduct(raw);
};

export const productService = {
  getProducts,
  getAdminProducts,
  bulkUpdateProducts,
  updateProductPartial,
  getProductVariants,
  updateVariantPartial,
  getProductById,
  getStorefrontProductPage,
  getStorefrontProducts,
  getStorefrontProductById,
  getStorefrontProductByIdFresh,
  getStorefrontProductBySlug,
  deleteProduct: async (id: number | string) => {
    const productId = Number(id);
    if (!Number.isFinite(productId)) throw new Error('ID sản phẩm không hợp lệ');
    await apiClient.delete(`/admin/products/${productId}`);
    return true;
  },
  deleteMultiple: async (ids: Array<number | string>) => {
    const normalized = Array.isArray(ids) ? ids.map((id) => Number(id)).filter(Number.isFinite) : [];
    const results = await Promise.allSettled(
      normalized.map((productId) => apiClient.delete(`/admin/products/${productId}`)),
    );
    const failed = results
      .map((result, index) => ({ result, productId: normalized[index] }))
      .filter((item) => item.result.status === 'rejected');
    if (failed.length > 0) {
      const error: any = new Error(`Không xoá được ${failed.length} sản phẩm`);
      error.failedIds = failed.map((item) => item.productId);
      throw error;
    }
    return true;
  },
  getCategories: async () => {
    const response = await apiClient.get('/categories/');
    return response.data;
  },
};
