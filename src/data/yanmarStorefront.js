import { getProductPricing } from '../utils/productPricing';

export const YANMAR_GENERATED_ASSET_BASE = '/locsang-assets';
export const YANMAR_LOGO = '/favicon.svg';
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

export const getActiveVariants = (product) =>
  (Array.isArray(product?.variants) ? product.variants : []).filter(
    (variant) => variant?.is_active !== false && String(variant?.status || 'active') === 'active',
  );

export const getVariantAttributeValues = (variant) => {
  const attrs = variant?.attribute_values || variant?.attributeValues;
  if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) return {};
  return Object.entries(attrs).reduce((acc, [name, value]) => {
    const cleanName = String(name || '').trim();
    const cleanValue = String(value || '').trim();
    if (cleanName && cleanValue) acc[cleanName] = cleanValue;
    return acc;
  }, {});
};

export const getVariantLabel = (variant) => {
  if (!variant) return '';
  const values = Object.values(getVariantAttributeValues(variant)).filter(Boolean);
  if (values.length > 0) return values.join(' / ');
  return String(variant?.variant_name || variant?.variantName || variant?.sku || '').trim();
};

export const getProductVariantAttributes = (product) => {
  const raw = product?.variant_attributes || product?.variantAttributes;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .map((attribute) => ({
        name: String(attribute?.name || '').trim(),
        values: Array.isArray(attribute?.values)
          ? attribute.values.map((value) => String(value || '').trim()).filter(Boolean)
          : [],
      }))
      .filter((attribute) => attribute.name && attribute.values.length > 0);
  }

  const ordered = [];
  const byName = new Map();
  getActiveVariants(product).forEach((variant) => {
    Object.entries(getVariantAttributeValues(variant)).forEach(([name, value]) => {
      if (!byName.has(name)) {
        byName.set(name, new Set());
        ordered.push(name);
      }
      byName.get(name).add(value);
    });
  });

  return ordered.map((name) => ({ name, values: Array.from(byName.get(name) || []) })).filter((attribute) => attribute.values.length > 0);
};

export const canPurchaseVariant = (variant) => {
  if (!variant) return false;
  const manageStock = variant?.manage_stock !== false;
  return !manageStock || Number(variant?.stock || 0) > 0 || Boolean(variant?.allow_backorder);
};

export const getDefaultCartVariant = (product) => {
  const variants = getActiveVariants(product);
  if (variants.length === 0) return null;
  return variants.find(canPurchaseVariant) || variants[0];
};

export const hasSelectableVariants = (product) =>
  getActiveVariants(product).length > 1 && getProductVariantAttributes(product).length > 0;

export const canPurchaseProduct = (product, variant = null) => {
  if (!product || product?.is_active === false || String(product?.status || 'active') !== 'active') return false;
  if (variant) return canPurchaseVariant(variant);
  if (typeof product?.can_purchase === 'boolean') return product.can_purchase;
  const variants = getActiveVariants(product);
  if (variants.length > 0) return variants.some(canPurchaseVariant);
  return Number(product?.stock || 0) > 0 || Boolean(product?.allow_backorder);
};

export const getStockLabel = (product, variant = null) => {
  const target = variant || product;
  const stock = Number(target?.stock || 0);
  const allowBackorder = Boolean(target?.allow_backorder ?? product?.allow_backorder);
  if (stock > 0) return 'Còn hàng';
  if (allowBackorder) return 'Cho phép đặt hàng';
  return 'Tạm hết hàng';
};

export const toCartPayload = (product, quantity = 1, variant = null) => {
  const resolvedVariant = variant || getDefaultCartVariant(product);
  const pricing = getProductPricing(resolvedVariant || product);
  return {
    product_id: Number(product?.id),
    product_variant_id: Number.isFinite(Number(resolvedVariant?.id)) ? Number(resolvedVariant.id) : null,
    sku: resolvedVariant?.sku || product?.sku || undefined,
    title: product?.name || 'Sản phẩm Yanmar',
    image: resolvedVariant?.image || getProductImage(product),
    price: Number(pricing.currentPrice || product?.price || 0),
    quantity: Math.max(1, Number(quantity || 1)),
    variant_label: getVariantLabel(resolvedVariant) || undefined,
  };
};
