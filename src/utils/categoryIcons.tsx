import type { ComponentType } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  BadgePercent,
  Droplet,
  Filter,
  Layers3,
  Package,
  Settings,
  ShoppingCart,
  Tag,
  Truck,
} from 'lucide-react';

export type CategoryIconOption = {
  key: string;
  label: string;
  keywords: string[];
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { key: 'sale', label: 'Khuyến mãi', keywords: ['khuyen', 'sale', 'giam gia', 'uu dai'], icon: BadgePercent },
  { key: 'oil', label: 'Nhớt / dầu', keywords: ['nhot', 'dau', 'oil'], icon: Droplet },
  { key: 'filter', label: 'Lọc', keywords: ['loc', 'filter', 'loc gio', 'loc nhot', 'loc nhien lieu'], icon: Filter },
  { key: 'belt', label: 'Dây curoa', keywords: ['day curoa', 'curoa', 'belt'], icon: Layers3 },
  { key: 'bearing', label: 'Bạc đạn', keywords: ['bac dan', 'vong bi', 'bearing'], icon: BadgeCheck },
  { key: 'cylinder', label: 'Xylanh', keywords: ['xylanh', 'xy lanh', 'cylinder', 'piston'], icon: Settings },
  { key: 'engine', label: 'Động cơ', keywords: ['dong co', 'engine', 'may'], icon: Package },
  { key: 'hydraulic', label: 'Thủy lực', keywords: ['thuy luc', 'hydraulic', 'bom'], icon: AlertTriangle },
  { key: 'delivery', label: 'Giao hàng', keywords: ['giao hang', 'van chuyen'], icon: Truck },
  { key: 'cart', label: 'Bán hàng', keywords: ['ban hang', 'don hang'], icon: ShoppingCart },
  { key: 'parts', label: 'Phụ tùng', keywords: ['phu tung', 'spare', 'part'], icon: Settings },
  { key: 'general', label: 'Danh mục chung', keywords: [], icon: Tag },
];

export const CATEGORY_ICON_PREFIX = 'icon:';

export const normalizeCategoryText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();

export const getCategoryIconValue = (key: string) => `${CATEGORY_ICON_PREFIX}${key}`;

export const getCategoryIconKey = (value?: string | null) => {
  const text = String(value || '').trim();
  if (!text.startsWith(CATEGORY_ICON_PREFIX)) return null;
  const key = text.slice(CATEGORY_ICON_PREFIX.length).trim();
  return CATEGORY_ICON_OPTIONS.some((option) => option.key === key) ? key : null;
};

export const getCategoryIconOption = (key?: string | null) =>
  CATEGORY_ICON_OPTIONS.find((option) => option.key === key) || null;

export const mapCategoryIcon = (name: string, explicitValue?: string | null): CategoryIconOption => {
  const explicitKey = getCategoryIconKey(explicitValue);
  if (explicitKey) return getCategoryIconOption(explicitKey) || CATEGORY_ICON_OPTIONS[CATEGORY_ICON_OPTIONS.length - 1];

  const normalized = normalizeCategoryText(name);
  const matched = CATEGORY_ICON_OPTIONS.find((option) =>
    option.key !== 'general' && option.keywords.some((keyword) => normalized.includes(normalizeCategoryText(keyword))),
  );
  return matched || CATEGORY_ICON_OPTIONS[CATEGORY_ICON_OPTIONS.length - 1];
};

export const isCategoryImageUrl = (value?: string | null) => {
  const text = String(value || '').trim();
  return Boolean(text && !text.startsWith(CATEGORY_ICON_PREFIX));
};

type CategoryIconPreviewProps = {
  name: string;
  value?: string | null;
  size?: number;
  className?: string;
  imageClassName?: string;
  iconClassName?: string;
};

export const CategoryIconPreview = ({
  name,
  value,
  size = 38,
  className = '',
  imageClassName = '',
  iconClassName = 'text-[#e30613]',
}: CategoryIconPreviewProps) => {
  const imageValue = String(value || '').trim();
  if (isCategoryImageUrl(imageValue)) {
    return <img src={imageValue} alt={name || 'Icon danh mục'} className={imageClassName || className} />;
  }

  const option = mapCategoryIcon(name, value);
  const Icon = option.icon;
  return <Icon size={size} strokeWidth={2.8} className={iconClassName || className} />;
};
