// src/types/product.ts
export type ProductStatus = 'draft' | 'active' | 'discontinued';

export type ProductOption = {
  name: string;
  values: string[];
};

export type VariantAttribute = {
  name: string;
  value: string;
};

export type ProductVariantAttributeGroup = {
  name: string;
  values: string[];
};

export type ProductVariant = {
  id?: number;
  sku: string;
  price: number;
  sale_price?: number | null;
  stock: number;
  manage_stock?: boolean;
  allow_backorder?: boolean;
  can_purchase?: boolean;
  status?: ProductStatus;
  is_active?: boolean;
  image?: string | null;
  attributes?: VariantAttribute[];
  attribute_values?: Record<string, string>;
  variant_name?: string | null;
  media_urls?: string[];
  video_urls?: string[];
};

export interface Product {
  id: number;
  name: string;
  description: string;
  slug?: string | null;
  price: number;
  sale_price?: number | null;
  currency?: string;
  thumbnail?: string | null;
  images: string[];
  category_id: number;
  category_name?: string;
  sku: string;
  stock: number;
  sold_count?: number;
  status: 'active' | 'inactive';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  short_description?: string | null;
  description_html?: string | null;
  video_url?: string | null;
  brand?: string | null;
  tags?: string[];
  specifications?: Array<{ label: string; value: string }>;
  has_variants?: boolean;
  product_status?: ProductStatus;
  display_order?: number | null;
  low_stock_threshold?: number | null;
  manage_stock?: boolean;
  allow_backorder?: boolean;
  can_purchase?: boolean;
  stock_status?: 'in_stock' | 'backorder' | 'out' | string;
  options?: ProductOption[];
  variants?: ProductVariant[];
  variant_attributes?: ProductVariantAttributeGroup[];
  variantAttributes?: ProductVariantAttributeGroup[];
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
  currency?: string;
  stock: number;
  status: string;
  is_active: boolean;
  category_id: number;
  brand?: string;
  labels: string[];
  images: Array<string | File>;
  video_url?: string | null;
  tags?: string[];
  product_status?: ProductStatus;
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
        price?: number | null;
        sale_price?: number | null;
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
