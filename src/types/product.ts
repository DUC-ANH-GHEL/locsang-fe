// src/types/product.ts
export type ProductStatus = 'draft' | 'active' | 'discontinued';
export type PetType = 'dog' | 'cat' | 'both';
export type Season = 'winter' | 'summer' | 'all';

export type ProductOption = {
  name: string;
  values: string[];
};

export type VariantAttribute = {
  name: string;
  value: string;
};

export type ProductVariant = {
  id?: number;
  sku: string;
  price: number;
  compare_price?: number | null;
  cost_price?: number | null;
  stock: number;
  manage_stock?: boolean;
  allow_backorder?: boolean;
  status?: ProductStatus;
  is_active?: boolean;
  image?: string | null;
  attributes?: VariantAttribute[];
  attribute_values?: Record<string, string>;
  variant_name?: string | null;
  media_urls?: string[];
  video_urls?: string[];
  weight_gram?: number | null;
  dimension_text?: string | null;
};

export type ProductReview = {
  id: number;
  reviewer_name: string;
  rating: number;
  comment?: string | null;
  is_verified_purchase?: boolean;
  created_at?: Date | string;
};

export type ProductRatingSummary = {
  average: number;
  count: number;
  breakdown: Record<string, number>;
};

export type ProductComboItem = {
  label: string;
  quantity: number;
  local_product_id?: number | null;
  local_product_slug?: string | null;
  image?: string | null;
  price?: number | null;
  required?: boolean;
};

export type ProductComboOffer = {
  title: string;
  description?: string | null;
  items: ProductComboItem[];
};

export type ProductPromotionItem = {
  label: string;
  quantity: number;
  local_product_id?: number | null;
  local_product_slug?: string | null;
  image?: string | null;
  price?: number | null;
};

export type ProductPromotionOffer = {
  id?: string | null;
  title: string;
  description?: string | null;
  promotion_type?: string | null;
  promotion_kind?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  meta?: Record<string, any> | null;
  items: ProductPromotionItem[];
};

export interface Product {
  id: number;
  name: string;
  description: string;
  slug?: string | null;
  price: number;
  original_price?: number | null;
  sale_price?: number | null;
  currency?: string;
  thumbnail?: string | null;
  images: string[];
  category_id: number;
  category_name?: string;
  sku: string;
  stock: number;
  status: 'active' | 'inactive';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  // PRD additions (optional, backward-compatible)
  short_description?: string | null;
  description_html?: string | null;
  video_url?: string | null;
  brand?: string | null;
  pet_type?: PetType | null;
  season?: Season | null;
  tags?: string[];
  specifications?: Array<{ label: string; value: string }>;
  has_variants?: boolean;
  product_status?: ProductStatus;
  featured?: boolean;
  display_order?: number | null;
  low_stock_threshold?: number | null;
  compare_price?: number | null;
  cost_price?: number | null;
  manage_stock?: boolean;
  allow_backorder?: boolean;
  options?: ProductOption[];
  variants?: ProductVariant[];
  reviews?: ProductReview[];
  rating_summary?: ProductRatingSummary;
  combo_offers?: ProductComboOffer[];
  promotion_offers?: ProductPromotionOffer[];
  raw_data?: Record<string, any>;
}

export interface ProductFormData {
  name: string;
  description: string;
  short_description?: string;
  description_html?: string;
  sku: string;
  price: number;
  sale_price?: number | null;
  compare_price?: number | null;
  cost_price?: number | null;
  currency?: string;
  affiliate: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  stock: number;
  status: string;
  is_active: boolean;
  category_id: number;
  brand?: string;
  material?: string;
  size?: string;
  color?: string;
  pet_type?: string;
  season?: string;
  labels: string[];
  images: Array<string | File>;
  video_url?: string | null;
  tags?: string[];
  product_status?: ProductStatus;
  featured?: boolean;
  display_order?: number | null;
  low_stock_threshold?: number | null;
  manage_stock?: boolean;
  allow_backorder?: boolean;
  options?: ProductOption[];
  specs: { key: string; value: string }[];
  slug: string;
  metaTitle: string;
  metaDescription: string;
  seoSlug?: string;

  // Create API expects `variants` as a JSON string (array).
  // Keep flexible type so UI can work with either string or structured array.
  variants?:
    | string
    | null
    | Array<{
        sku: string;
        size?: string | null;
        color?: string | null;
        material?: string | null;
        price?: number | null;
        sale_price?: number | null;
        compare_price?: number | null;
        cost_price?: number | null;
        stock: number;
        is_active?: boolean;
        status?: ProductStatus;
        manage_stock?: boolean;
        allow_backorder?: boolean;
        image?: string | File | null;
        attributes?: VariantAttribute[];
      }>;
}

export interface ProductFormDataUpdate extends ProductFormData {
  id: number;
  // Kept for UI compatibility; backend ProductUpdate no longer requires this.
  listImageCurrent?: string[];
}

export interface FormError {
  [key: string]: string;
}

export interface ProductImage{
  product_id: number;
  image_url: string;
  is_primary: boolean;
  id: number;
}
