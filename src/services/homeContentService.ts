import { apiClient } from './apiClient';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';
import { optimizeImageForUpload } from '../utils/imageUploadOptimization';
import type { Product } from '../types/product';
import { normalizePublicProduct } from './productService';
import { fetchCachedPublicData } from './publicCache';

const PUBLIC_API_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '/api');

export type HomeContentPayload = {
  hero_badge: string;
  hero_title: string;
  hero_headline_line1: string;
  hero_headline_line2: string;
  hero_subtitle: string;
  hero_description: string;
  hero_image_url: string;
  primary_cta_text: string;
  primary_cta_link: string;
  secondary_cta_text: string;
  secondary_cta_link: string;
  header_brand_name: string;
  header_brand_tagline: string;
  header_nav_shop_text: string;
  header_nav_new_arrivals_text: string;
  header_nav_orders_text: string;
  footer_brand_name: string;
  footer_desktop_caption: string;
  footer_mobile_description: string;
  footer_products_title: string;
  footer_products_item_1: string;
  footer_products_item_2: string;
  footer_products_item_3: string;
  footer_products_item_4: string;
  footer_info_title: string;
  footer_info_item_1: string;
  footer_info_item_2: string;
  footer_info_item_3: string;
  footer_info_item_4: string;
  footer_social_title: string;
  footer_social_item_1: string;
  footer_social_item_2: string;
  footer_social_item_3: string;
  footer_social_item_4: string;
  footer_social_instagram_url: string;
  footer_social_pinterest_url: string;
  footer_social_facebook_url: string;
  footer_social_tiktok_url: string;
  footer_policy_title: string;
  footer_policy_item_1: string;
  footer_policy_item_2: string;
  footer_policy_item_3: string;
  footer_contact_title: string;
  footer_contact_hotline: string;
  footer_contact_email: string;
  footer_copyright_text: string;
  hero_feature_1_title: string;
  hero_feature_1_desc: string;
  hero_feature_2_title: string;
  hero_feature_2_desc: string;
  hero_feature_3_title: string;
  hero_feature_3_desc: string;
  hero_stats_title: string;
  hero_stats_products_label: string;
  hero_stats_categories_label: string;
  hero_stats_price_label: string;
  hero_stats_catalog_link_text: string;
  category_section_title: string;
  category_section_desktop_title: string;
  category_section_desktop_subtitle: string;
  category_section_link_text: string;
  mobile_category_title: string;
  category_section_subtitle: string;
  category_section_view_all_text: string;
  category_section_empty_text: string;
  category_section_loading_text: string;
  new_arrivals_title: string;
  best_seller_section_title: string;
  best_seller_section_subtitle: string;
  best_seller_badge_text: string;
  mobile_best_seller_title: string;
  mobile_view_all_text: string;
  new_arrivals_subtitle: string;
  new_arrivals_live_badge: string;
  new_arrivals_price_prefix: string;
  new_arrivals_empty_text: string;
  bottom_cta_title: string;
  bottom_cta_description: string;
  bottom_cta_button_text: string;
  bottom_cta_button_link: string;
  delivery_feature_title: string;
  delivery_feature_desc: string;
};

export type HomeContentAdminResponse = {
  draft: HomeContentPayload;
  published: HomeContentPayload;
  published_at?: string | null;
};

export type HomeContentPublicResponse = {
  content: HomeContentPayload;
  published_at?: string | null;
};

export type HomeCategoryWithProducts = {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
  image?: string | null;
  products: Product[];
};

export type PublicHomeDataResponse = {
  home_content: HomeContentPublicResponse;
  categories_with_products: HomeCategoryWithProducts[];
  best_sellers: Product[];
  sale_products: Product[];
};

export type HomeContentImageUploadResponse = {
  url: string;
};

export const homeContentService = {
  getAdminHomeContent: async (): Promise<HomeContentAdminResponse> => {
    const res = await apiClient.get('/admin/home-content');
    return res.data;
  },

  updateDraft: async (content: HomeContentPayload): Promise<HomeContentAdminResponse> => {
    const res = await apiClient.put('/admin/home-content/draft', { content });
    return res.data;
  },

  publishDraft: async (): Promise<HomeContentAdminResponse> => {
    const res = await apiClient.post('/admin/home-content/publish');
    return res.data;
  },

  uploadHomeImage: async (
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<HomeContentImageUploadResponse> => {
    const uploadFile = await optimizeImageForUpload(file);
    const formData = new FormData();
    formData.append('file', uploadFile);
    const res = await apiClient.post('/admin/home-content/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        const percent = Math.min(100, Math.round((event.loaded * 100) / event.total));
        onProgress(percent);
      },
    });
    return res.data;
  },

  getPublicHomeContent: async (): Promise<HomeContentPublicResponse> => {
    return fetchCachedPublicData<HomeContentPublicResponse>(
      'home-content',
      async () => {
        const res = await axios.get(`${PUBLIC_API_BASE_URL}/home-content`, {
          headers: { 'Content-Type': 'application/json' },
        });
        return res.data;
      },
      { ttlMs: 60_000 },
    );
  },

  getPublicHomeData: async (): Promise<PublicHomeDataResponse> => {
    return fetchCachedPublicData<PublicHomeDataResponse>(
      'home-aggregate',
      async () => {
        const res = await axios.get(`${PUBLIC_API_BASE_URL}/home`, {
          headers: { 'Content-Type': 'application/json' },
        });
        const data = res.data || {};
        const categories = Array.isArray(data.categories_with_products)
          ? data.categories_with_products.map((category: any) => ({
              id: Number(category?.id ?? 0),
              name: String(category?.name ?? '').trim(),
              slug: category?.slug ?? null,
              description: category?.description ?? null,
              image: category?.image ?? null,
              products: Array.isArray(category?.products)
                ? category.products.map(normalizePublicProduct)
                : [],
            }))
          : [];

        return {
          home_content: data.home_content || { content: null, published_at: null },
          categories_with_products: categories.filter((category: HomeCategoryWithProducts) => category.id > 0 && category.name),
          best_sellers: Array.isArray(data.best_sellers) ? data.best_sellers.map(normalizePublicProduct) : [],
          sale_products: Array.isArray(data.sale_products) ? data.sale_products.map(normalizePublicProduct) : [],
        };
      },
      { ttlMs: 60_000 },
    );
  },
};
