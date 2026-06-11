import { Home, Image, Package, Settings, ShoppingCart, Tag, UsersRound } from 'lucide-react';

export const adminNavItems = [
  { name: 'Tổng quan', url: '/admin', icon: Home, end: true },
  { name: 'Sản phẩm', url: '/admin/products', icon: Package },
  { name: 'Danh mục', url: '/admin/categories', icon: Tag },
  { name: 'Banner', url: '/admin/home-content', icon: Image },
  { name: 'Đơn hàng', url: '/admin/orders', icon: ShoppingCart },
  { name: 'Tài khoản', url: '/admin/accounts', icon: UsersRound },
  { name: 'Cài đặt', url: '/admin/settings', icon: Settings },
];

export const adminBottomNavItems = [
  adminNavItems[0],
  adminNavItems[4],
];
