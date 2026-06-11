import { Package, ShoppingCart, Tag, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminOrderService, AdminOrderListItem } from '../../services/adminOrderService';
import { getCategories } from '../../services/categoryService';
import { productService, AdminProductListItem } from '../../services/productService';

const formatCurrency = (value: unknown) =>
  Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const normalizeOrderStatus = (status: unknown) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'processing') return 'processing';
  if (normalized === 'cancelled') return 'cancelled';
  return 'pending';
};

const statusLabel: Record<string, string> = {
  pending: 'Mới',
  processing: 'Đã xử lý',
  cancelled: 'Hủy đơn',
};

const Dashboard = () => {
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [productRes, orderRes, categoryRes] = await Promise.all([
          productService.getAdminProducts({ page: 1, limit: 8, status: 'all' }),
          adminOrderService.getOrders({ page: 1, limit: 8 }),
          getCategories(),
        ]);
        setProducts(Array.isArray(productRes?.data) ? productRes.data : []);
        setOrders(Array.isArray(orderRes?.data) ? orderRes.data : []);
        setCategoriesCount(Array.isArray(categoryRes) ? categoryRes.length : 0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const metrics = useMemo(() => {
    const revenue = orders
      .filter((order) => normalizeOrderStatus(order.status) !== 'cancelled')
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const lowStock = products.filter((product) => Number(product.stock_total ?? 0) <= 5).length;
    return {
      orders: orders.length,
      revenue,
      products: products.length,
      categories: categoriesCount,
      lowStock,
    };
  }, [categoriesCount, orders, products]);

  const cards = [
    { label: 'Đơn gần đây', value: metrics.orders, icon: <ShoppingCart size={20} />, href: '/admin/orders' },
    { label: 'Doanh thu đơn gần đây', value: formatCurrency(metrics.revenue), icon: <Truck size={20} />, href: '/admin/orders' },
    { label: 'Sản phẩm', value: metrics.products, icon: <Package size={20} />, href: '/admin/products' },
    { label: 'Danh mục', value: metrics.categories, icon: <Tag size={20} />, href: '/admin/categories' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tổng quan bán hàng</h1>
        <p className="mt-1 text-sm text-gray-500">Quản lý nhanh sản phẩm, danh mục và đơn hàng Lộc Sang.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} to={card.href} className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-rose-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 inline-flex rounded-xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-950/30">{card.icon}</div>
            <div className="text-sm text-gray-500">{card.label}</div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Đơn hàng mới</h2>
            <Link to="/admin/orders" className="text-sm font-semibold text-rose-600">Xem tất cả</Link>
          </div>
          {loading ? (
            <div className="text-sm text-gray-500">Đang tải...</div>
          ) : orders.length === 0 ? (
            <div className="text-sm text-gray-500">Chưa có đơn hàng.</div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const status = normalizeOrderStatus(order.status);
                return (
                  <div key={order.id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{order.tracking_code || `#${order.id}`}</div>
                      <div className="text-xs text-gray-500">{order.receiver_name || order.receiver_phone || 'Khách hàng'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-600">{formatCurrency(order.total_amount)}</div>
                      <div className="text-xs text-gray-500">{statusLabel[status]}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Sản phẩm cần chú ý</h2>
            <Link to="/admin/products" className="text-sm font-semibold text-rose-600">Quản lý sản phẩm</Link>
          </div>
          {loading ? (
            <div className="text-sm text-gray-500">Đang tải...</div>
          ) : products.length === 0 ? (
            <div className="text-sm text-gray-500">Chưa có sản phẩm.</div>
          ) : (
            <div className="space-y-3">
              {products.slice(0, 6).map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{product.name}</div>
                    <div className="text-xs text-gray-500">SKU: {product.sku || '-'}</div>
                  </div>
                  <div className={Number(product.stock_total ?? 0) <= 5 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>
                    Tồn: {Number(product.stock_total ?? 0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {metrics.lowStock > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Có {metrics.lowStock} sản phẩm sắp hết hàng trong danh sách đang hiển thị.
        </div>
      )}
    </div>
  );
};

export default Dashboard;
