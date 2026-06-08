import { Product } from '../types/product';
import { Category } from '../types/category';

const now = new Date();

export const storefrontCategories: Category[] = [
  {
    id: 1,
    name: 'Hoodie & Sweater',
    description: 'Thiết kế dễ phối, chất liệu đẹp và dùng hằng ngày rất tiện.',
    image:
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80',
    slug: 'hoodie-sweater',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 2,
    name: 'Áo mưa',
    description: 'Chống nước, nhẹ, dễ vệ sinh — đi dạo vẫn slay.',
    image:
      'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?auto=format&fit=crop&w=1200&q=80',
    slug: 'ao-mua',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 3,
    name: 'Váy & Outfit',
    description: 'Outfit đi chơi, chụp hình, tiệc tùng — nhìn là mê.',
    image:
      'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80',
    slug: 'vay-outfit',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 4,
    name: 'Phụ kiện',
    description: 'Nón, khăn, dây dắt… nhỏ thôi mà “nâng level” liền.',
    image:
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=1200&q=80',
    slug: 'phu-kien',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
];

export const storefrontProducts: Product[] = [
  {
    id: 1,
    name: 'Hoodie “Street Pup”',
    description: 'Nỉ dày vừa phải, co giãn nhẹ — mặc lên là vibe ngay.',
    price: 189000,
    images: [
      'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80',
    ],
    category_id: 1,
    sku: 'MPW-HOODIE-001',
    stock: 24,
    status: 'active',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 2,
    name: 'Sweater “Soft Cloud”',
    description: 'Êm, nhẹ, không xù — hợp đi dạo mỗi ngày.',
    price: 159000,
    images: [
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80',
    ],
    category_id: 1,
    sku: 'MPW-SWEATER-002',
    stock: 30,
    status: 'active',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 3,
    name: 'Áo mưa “Rain Check”',
    description: 'Chống nước, có mũ, gọn gàng — trời mưa vẫn xịn.',
    price: 199000,
    images: [
      'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=1200&q=80',
    ],
    category_id: 2,
    sku: 'MPW-RAIN-003',
    stock: 18,
    status: 'active',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 4,
    name: 'Áo mưa phản quang',
    description: 'Đi tối an tâm hơn, chất vải nhẹ và thoáng.',
    price: 229000,
    images: [
      'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?auto=format&fit=crop&w=1200&q=80',
    ],
    category_id: 2,
    sku: 'MPW-RAIN-004',
    stock: 12,
    status: 'active',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 5,
    name: 'Outfit “Date Night”',
    description: 'Set outfit chụp hình: gọn, sang, lên hình cực đẹp.',
    price: 249000,
    images: [
      'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=1200&q=80',
    ],
    category_id: 3,
    sku: 'MPW-OUTFIT-005',
    stock: 10,
    status: 'active',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 6,
    name: 'Váy “Little Star”',
    description: 'Nhẹ, thoáng — xoay một vòng là đáng yêu liền.',
    price: 219000,
    images: [
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=1200&q=80',
    ],
    category_id: 3,
    sku: 'MPW-DRESS-006',
    stock: 14,
    status: 'active',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 7,
    name: 'Bandana “Color Pop”',
    description: 'Mix outfit nhanh: quàng bandana là “đổi vibe”.',
    price: 59000,
    images: [
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=1200&q=80',
    ],
    category_id: 4,
    sku: 'MPW-ACC-007',
    stock: 60,
    status: 'active',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 8,
    name: 'Dây dắt “Urban Walk”',
    description: 'Cầm chắc tay, khoá bền — đi dạo mỗi ngày.',
    price: 99000,
    images: [
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80',
    ],
    category_id: 4,
    sku: 'MPW-LEASH-008',
    stock: 40,
    status: 'active',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
];

export const formatVnd = (value: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
