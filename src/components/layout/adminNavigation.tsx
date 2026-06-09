import { Home, Image, Package, ShoppingCart, Tag } from 'lucide-react';

export const adminNavItems = [
  { name: 'Tổng quan', url: '/admin', icon: Home, end: true },
  { name: 'Sản phẩm', url: '/admin/products', icon: Package },
  { name: 'Danh mục', url: '/admin/categories', icon: Tag },
  { name: 'Banner', url: '/admin/home-content', icon: Image },
  { name: 'Đơn hàng', url: '/admin/orders', icon: ShoppingCart },
];

export const adminBottomNavItems = [
  adminNavItems[0],
  adminNavItems[1],
  adminNavItems[4],
  adminNavItems[3],
];
