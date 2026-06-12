import type { ComponentType, ReactNode } from 'react';
import { BadgePercent } from 'lucide-react';

type IconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export type CategoryIconOption = {
  key: string;
  label: string;
  keywords: string[];
  icon: ComponentType<IconProps>;
};

const Svg = ({ size = 38, className = '', children }: IconProps & { children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const PartsIcon = ({ size, className }: IconProps) => (
  <Svg size={size} className={className}>
    <path d="M30.5 6.5 41.5 13v13L30.5 32.5 19.5 26V13L30.5 6.5Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="m20.5 13 10 5.8 10-5.8M30.5 19v12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 33.5 20.5 21l6.5 6.5L14.5 40H8v-6.5Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
  </Svg>
);

const OilIcon = ({ size, className }: IconProps) => (
  <Svg size={size} className={className}>
    <path d="M25 5C18.5 13.5 13 21 13 28a12 12 0 0 0 24 0C37 21 31.5 13.5 25 5Z" stroke="currentColor" strokeWidth="3.4" strokeLinejoin="round" />
    <path d="M20 30c1.2 3.2 3.7 4.8 7.4 4.8" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
  </Svg>
);

const OilFilterIcon = ({ size, className }: IconProps) => (
  <Svg size={size} className={className}>
    <ellipse cx="24" cy="10" rx="12" ry="5" stroke="currentColor" strokeWidth="3" />
    <path d="M12 10v25c0 2.8 5.4 5 12 5s12-2.2 12-5V10" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M18 15v18M24 16v19M30 15v18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M16 34c2 1.3 4.7 2 8 2s6-.7 8-2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </Svg>
);

const AirFilterIcon = ({ size, className }: IconProps) => (
  <Svg size={size} className={className}>
    <path d="M10 15h28l4 6v14H6V21l4-6Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M13 20h22M13 26h22M13 32h22" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M16 15V9h16v6" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
  </Svg>
);

const FuelFilterIcon = ({ size, className }: IconProps) => (
  <Svg size={size} className={className}>
    <path d="M14 12h20v24H14V12Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M18 8h12M18 40h12M20 18h8M20 24h8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M34 18h4c2.2 0 4 1.8 4 4v4c0 2.2-1.8 4-4 4h-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </Svg>
);

const BeltIcon = ({ size, className }: IconProps) => (
  <Svg size={size} className={className}>
    <path d="M8.5 28.5C6 23 9.5 16.5 16 14l13.5-5c6.2-2.3 12 2 12 8.3 0 3.9-2.4 7.4-6 8.8L22 31c-6.2 2.3-11.5 1-13.5-2.5Z" stroke="currentColor" strokeWidth="3.3" strokeLinejoin="round" />
    <path d="M14 25c.9 1.6 3.4 2 6.2 1L33 21.2c2.4-.9 3.7-2.7 3.3-4.5-.4-2-2.9-3.1-5.3-2.2L18.2 19.3c-3.1 1.1-5.2 3.8-4.2 5.7Z" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
    <path d="M8 36h32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </Svg>
);

const BearingIcon = ({ size, className }: IconProps) => (
  <Svg size={size} className={className}>
    <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="3.2" />
    <circle cx="24" cy="24" r="7" stroke="currentColor" strokeWidth="3.2" />
    {[0, 60, 120, 180, 240, 300].map((angle) => {
      const rad = (angle * Math.PI) / 180;
      const x = 24 + Math.cos(rad) * 12;
      const y = 24 + Math.sin(rad) * 12;
      return <circle key={angle} cx={x} cy={y} r="2.6" fill="currentColor" />;
    })}
  </Svg>
);

const CylinderIcon = ({ size, className }: IconProps) => (
  <Svg size={size} className={className}>
    <path d="M15 8h18v18H15V8Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M18 13h12M18 18h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M24 26v8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M16 40h16M20 34h8l4 6H16l4-6Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M13 8h22M13 26h22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </Svg>
);

const EngineIcon = ({ size, className }: IconProps) => (
  <Svg size={size} className={className}>
    <path d="M14 18h17l6 6v11H14V18Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M20 18v-5h9v5M9 25h5M37 28h5M19 35v4h14v-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="24" cy="27" r="4" stroke="currentColor" strokeWidth="3" />
    <path d="M8 32v-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </Svg>
);

const HydraulicIcon = ({ size, className }: IconProps) => (
  <Svg size={size} className={className}>
    <path d="M10 30h10l14-14h6v8h-4L22 38H10v-8Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M28 12h12M28 8v8M13 24l7 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <path d="M32 32c-2.5 3.3-4 5.5-4 7.5a4 4 0 0 0 8 0c0-2-1.5-4.2-4-7.5Z" stroke="currentColor" strokeWidth="2.7" strokeLinejoin="round" />
  </Svg>
);

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { key: 'parts', label: 'Phụ tùng', keywords: ['phu tung', 'spare', 'part', 'phu kien'], icon: PartsIcon },
  { key: 'oil', label: 'Nhớt / dầu', keywords: ['nhot', 'dau', 'oil', 'lubricant'], icon: OilIcon },
  { key: 'oil_filter', label: 'Lọc nhớt', keywords: ['loc nhot', 'oil filter'], icon: OilFilterIcon },
  { key: 'air_filter', label: 'Lọc gió', keywords: ['loc gio', 'air filter'], icon: AirFilterIcon },
  { key: 'fuel_filter', label: 'Lọc nhiên liệu', keywords: ['loc nhien lieu', 'loc dau', 'fuel filter'], icon: FuelFilterIcon },
  { key: 'belt', label: 'Dây curoa', keywords: ['day curoa', 'curoa', 'belt'], icon: BeltIcon },
  { key: 'bearing', label: 'Bạc đạn / vòng bi', keywords: ['bac dan', 'vong bi', 'bearing'], icon: BearingIcon },
  { key: 'cylinder', label: 'Xylanh / piston', keywords: ['xylanh', 'xy lanh', 'cylinder', 'piston'], icon: CylinderIcon },
  { key: 'engine', label: 'Động cơ', keywords: ['dong co', 'engine', 'may'], icon: EngineIcon },
  { key: 'hydraulic', label: 'Thủy lực', keywords: ['thuy luc', 'hydraulic', 'bom'], icon: HydraulicIcon },
];

const SPECIAL_CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { key: 'sale', label: 'Khuyến mãi', keywords: ['khuyen', 'sale', 'giam gia', 'uu dai'], icon: BadgePercent },
];

const ALL_CATEGORY_ICON_OPTIONS = [...CATEGORY_ICON_OPTIONS, ...SPECIAL_CATEGORY_ICON_OPTIONS];
const DEFAULT_CATEGORY_ICON = CATEGORY_ICON_OPTIONS[0];

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
  return ALL_CATEGORY_ICON_OPTIONS.some((option) => option.key === key) ? key : null;
};

export const getCategoryIconOption = (key?: string | null) =>
  ALL_CATEGORY_ICON_OPTIONS.find((option) => option.key === key) || null;

export const mapCategoryIcon = (name: string, explicitValue?: string | null): CategoryIconOption => {
  const explicitKey = getCategoryIconKey(explicitValue);
  if (explicitKey) return getCategoryIconOption(explicitKey) || DEFAULT_CATEGORY_ICON;

  const normalized = normalizeCategoryText(name);
  const matched = CATEGORY_ICON_OPTIONS.find((option) =>
    option.key !== 'parts' && option.keywords.some((keyword) => normalized.includes(normalizeCategoryText(keyword))),
  );
  return matched || DEFAULT_CATEGORY_ICON;
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
