import { getProductPricing } from '../utils/productPricing';

export const YANMAR_GENERATED_ASSET_BASE = '/locsang-assets';
export const YANMAR_LOGO = `${YANMAR_GENERATED_ASSET_BASE}/brand-logo.svg`;
export const PRODUCT_PLACEHOLDER = `${YANMAR_GENERATED_ASSET_BASE}/oil-filter.svg`;
export const HERO_IMAGE = `${YANMAR_GENERATED_ASSET_BASE}/hero-yanmar.svg`;

export const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  })
    .format(Number(value || 0))
    .replace(/\s/g, '');

export const getProductImage = (product) =>
  product?.thumbnail || product?.images?.[0] || product?.image || PRODUCT_PLACEHOLDER;

export const getDiscountLabel = (product) => {
  const pricing = getProductPricing(product);
  if (!pricing.hasDiscount || !pricing.originalPrice) return '';
  return `-${Math.round(((pricing.originalPrice - pricing.currentPrice) / pricing.originalPrice) * 100)}%`;
};

export const getDisplayDescription = (product) =>
  String(product?.short_description || product?.description || 'Dùng cho động cơ Yanmar').replace(/<[^>]*>/g, '').trim();

export const toCartPayload = (product, quantity = 1, variant = null) => {
  const pricing = getProductPricing(variant || product);
  return {
    product_id: Number(product?.id),
    product_variant_id: Number.isFinite(Number(variant?.id)) ? Number(variant.id) : null,
    sku: variant?.sku || product?.sku || undefined,
    title: product?.name || 'Sản phẩm Yanmar',
    image: variant?.image || getProductImage(product),
    price: Number(pricing.currentPrice || product?.price || 0),
    quantity: Math.max(1, Number(quantity || 1)),
    variant_label: variant?.variant_name || product?.sku || undefined,
  };
};
