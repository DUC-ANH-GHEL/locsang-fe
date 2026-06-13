import { Product } from '../types/product';

const slugify = (value: string): string =>
  String(value || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const toProductDetailPath = (product: Pick<Product, 'id' | 'name' | 'slug'>): string => {
  const slug = slugify(String(product?.slug || product?.name || 'san-pham')) || 'san-pham';
  return `/san-pham/${slug}`;
};
