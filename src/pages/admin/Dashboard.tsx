import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PackagePlus,
  PackageX,
  Plus,
  ShoppingCart,
  WalletCards,
  Warehouse,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminOrderService, AdminOrderListItem } from '../../services/adminOrderService';
import { productService, AdminProductListItem } from '../../services/productService';
import { formatViDateTime } from '../../utils/dateTime';

const formatCurrency = (value: unknown) =>
  Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const normalizeOrderStatus = (status: unknown) => {
  const normalized = String(status || '').toLowerCase();
  if (['processed', 'processing', 'shipped', 'delivered'].includes(normalized)) return 'processed';
  if (normalized === 'cancelled') return 'cancelled';
  return 'pending';
};

const statusConfig = {
  pending: {
    label: 'Mới',
    className: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20',
  },
  processed: {
    label: 'Đã xử lý',
    className:
      'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20',
  },
  cancelled: {
    label: 'Hủy',
    className: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  },
};

const getStock = (product: AdminProductListItem) => Number(product.stock_total ?? 0);

const StatCard = ({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'rose',
  href,
}: {
  icon: any;
  label: string;
  value: string | number;
  hint: string;
  tone?: 'rose' | 'amber' | 'emerald' | 'slate';
  href: string;
}) => {
  const toneClass = {
    rose: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20',
    emerald:
      'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
  }[tone];

  return (
    <Link
      to={href}
      className="group rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-[0_22px_65px_rgba(225,29,72,0.12)] dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${toneClass}`}>
          <Icon size={21} strokeWidth={2.3} />
        </span>
        <ArrowRight size={18} className="mt-2 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-rose-500" />
      </div>
      <div className="mt-5 text-[0.82rem] font-black uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{hint}</div>
    </Link>
  );
};

const LoadingBlock = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
    ))}
  </div>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-slate-800 dark:bg-slate-950/60">
    <div className="text-sm font-black text-slate-900 dark:text-white">{title}</div>
    <div className="mx-auto mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{description}</div>
  </div>
);

const Dashboard = () => {
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [productRes, orderRes] = await Promise.all([
          productService.getAdminProducts({ page: 1, limit: 40, status: 'all' }),
          adminOrderService.getOrders({ page: 1, limit: 12 }),
        ]);
        setProducts(Array.isArray(productRes?.data) ? productRes.data : []);
        setOrders(Array.isArray(orderRes?.data) ? orderRes.data : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dashboard = useMemo(() => {
    const activeOrders = orders.filter((order) => normalizeOrderStatus(order.status) !== 'cancelled');
    const pendingOrders = orders.filter((order) => normalizeOrderStatus(order.status) === 'pending');
    const revenue = activeOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const outOfStock = products.filter((product) => getStock(product) <= 0);
    const lowStock = products.filter((product) => {
      const stock = getStock(product);
      return stock > 0 && stock <= 5;
    });
    const stockAlerts = [...outOfStock, ...lowStock]
      .sort((a, b) => getStock(a) - getStock(b))
      .slice(0, 8);

    return {
      pendingOrders,
      revenue,
      outOfStock,
      lowStock,
      stockAlerts,
      attentionCount: pendingOrders.length + outOfStock.length + lowStock.length,
    };
  }, [orders, products]);

  const orderRows = dashboard.pendingOrders.length > 0 ? dashboard.pendingOrders : orders.slice(0, 6);

  const quickActions = [
    { label: 'Tạo sản phẩm', href: '/admin/products/create', icon: PackagePlus },
    { label: 'Tạo đơn hàng', href: '/admin/orders/create', icon: Plus },
    { label: 'Quản lý sản phẩm', href: '/admin/products', icon: Warehouse },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 pb-24 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-5 sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.04em] text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20">
              <ShoppingCart size={15} strokeWidth={2.4} />
              Bán hàng Lộc Sang
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Tổng quan hôm nay
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              Tập trung vào những việc cần xử lý ngay: đơn mới, doanh thu gần đây và sản phẩm sắp hết hàng.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    to={action.href}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-rose-500/10"
                  >
                    <Icon size={18} strokeWidth={2.3} />
                    {action.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60 lg:border-l lg:border-t-0">
            <div className="rounded-[1.4rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-slate-950 dark:text-white">Cần xử lý</div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Đơn mới và cảnh báo tồn kho</div>
                </div>
                <div className="text-4xl font-black tracking-tight text-rose-600">{loading ? '-' : dashboard.attentionCount}</div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-rose-50 p-3 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                  <div className="text-xl font-black">{loading ? '-' : dashboard.pendingOrders.length}</div>
                  <div className="mt-0.5 text-[0.72rem] font-bold">Đơn mới</div>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                  <div className="text-xl font-black">{loading ? '-' : dashboard.lowStock.length}</div>
                  <div className="mt-0.5 text-[0.72rem] font-bold">Sắp hết</div>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <div className="text-xl font-black">{loading ? '-' : dashboard.outOfStock.length}</div>
                  <div className="mt-0.5 text-[0.72rem] font-bold">Hết hàng</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <StatCard
          icon={Clock3}
          label="Đơn mới"
          value={loading ? '-' : dashboard.pendingOrders.length}
          hint="Cần xác nhận và xử lý"
          href="/admin/orders"
          tone="rose"
        />
        <StatCard
          icon={WalletCards}
          label="Doanh thu gần đây"
          value={loading ? '-' : formatCurrency(dashboard.revenue)}
          hint={`Từ ${orders.filter((order) => normalizeOrderStatus(order.status) !== 'cancelled').length} đơn hợp lệ`}
          href="/admin/orders"
          tone="emerald"
        />
        <StatCard
          icon={PackageX}
          label="Cảnh báo tồn kho"
          value={loading ? '-' : dashboard.outOfStock.length + dashboard.lowStock.length}
          hint="Hết hàng hoặc còn rất ít"
          href="/admin/products"
          tone={dashboard.outOfStock.length > 0 ? 'amber' : 'slate'}
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.06fr_0.94fr]">
        <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Đơn hàng cần xử lý</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Ưu tiên đơn mới. Nếu không có đơn mới, hiển thị các đơn gần nhất.
              </p>
            </div>
            <Link to="/admin/orders" className="shrink-0 text-sm font-black text-rose-600 hover:text-rose-700">
              Xem tất cả
            </Link>
          </div>

          {loading ? (
            <LoadingBlock />
          ) : orderRows.length === 0 ? (
            <EmptyState title="Chưa có đơn hàng" description="Khi khách đặt hàng, đơn mới sẽ xuất hiện ở đây để xử lý nhanh." />
          ) : (
            <div className="space-y-3">
              {orderRows.map((order) => {
                const status = normalizeOrderStatus(order.status) as keyof typeof statusConfig;
                const config = statusConfig[status];
                return (
                  <Link
                    key={order.id}
                    to="/admin/orders"
                    className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-rose-200 hover:bg-rose-50/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-rose-500/10 sm:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-base font-black text-slate-950 dark:text-white">
                          {order.tracking_code || `#${order.id}`}
                        </span>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${config.className}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                        {order.receiver_name || order.receiver_phone || 'Khách hàng'}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">{formatViDateTime(order.created_at)}</div>
                    </div>
                    <div className="flex items-end justify-between gap-4 sm:block sm:text-right">
                      <div className="text-lg font-black text-rose-600">{formatCurrency(order.total_amount)}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">{order.item_count || 0} sản phẩm</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Tồn kho cần chú ý</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Các sản phẩm hết hàng hoặc còn tối đa 5 sản phẩm.</p>
            </div>
            <Link to="/admin/products" className="shrink-0 text-sm font-black text-rose-600 hover:text-rose-700">
              Quản lý
            </Link>
          </div>

          {loading ? (
            <LoadingBlock />
          ) : dashboard.stockAlerts.length === 0 ? (
            <EmptyState title="Tồn kho ổn" description="Chưa có sản phẩm nào cần cảnh báo trong danh sách đang tải." />
          ) : (
            <div className="space-y-3">
              {dashboard.stockAlerts.map((product) => {
                const stock = getStock(product);
                const isOut = stock <= 0;
                return (
                  <Link
                    key={product.id}
                    to={`/admin/product/${product.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-rose-200 hover:bg-rose-50/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-rose-500/10"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-base font-black text-slate-950 dark:text-white">{product.name}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">{product.sku || 'Chưa có SKU'}</div>
                    </div>
                    <div
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black ring-1 ${
                        isOut
                          ? 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20'
                          : 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20'
                      }`}
                    >
                      {isOut ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                      {isOut ? 'Hết hàng' : `Còn ${stock}`}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
