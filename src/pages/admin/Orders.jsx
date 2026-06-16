import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Package,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { adminOrderService } from '../../services/adminOrderService';
import { ADMIN_NEW_ORDER_EVENT } from '../../services/adminNotificationService';
import { useToast } from '../../components/Toast';
import { parseApiError } from '../../utils/apiError';
import { logout } from '../../services/authService';
import { formatViDateTime } from '../../utils/dateTime';

const PAGE_LIMIT = 20;
const ORDER_STATUS_NEW = 'pending';
const ORDER_STATUS_PROCESSED = 'processed';
const ORDER_STATUS_CANCELLED = 'cancelled';

const normalizeOrderStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (['processed', 'processing', 'shipped', 'delivered'].includes(normalized)) return ORDER_STATUS_PROCESSED;
  if (normalized === ORDER_STATUS_CANCELLED) return ORDER_STATUS_CANCELLED;
  return ORDER_STATUS_NEW;
};

const statusFilters = [
  { value: '', label: 'Tất cả' },
  { value: ORDER_STATUS_NEW, label: 'Mới' },
  { value: ORDER_STATUS_PROCESSED, label: 'Đã xử lý' },
  { value: ORDER_STATUS_CANCELLED, label: 'Hủy đơn' },
];

const statusMeta = {
  [ORDER_STATUS_NEW]: {
    label: 'Mới',
    icon: ClipboardList,
    badge: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20',
    card: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200',
  },
  [ORDER_STATUS_PROCESSED]: {
    label: 'Đã xử lý',
    icon: CheckCircle2,
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20',
    card: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
  },
  [ORDER_STATUS_CANCELLED]: {
    label: 'Hủy đơn',
    icon: AlertTriangle,
    badge: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20',
    card: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200',
  },
};

const paymentMeta = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán lỗi',
  refunded: 'Đã hoàn tiền',
};

const statusActionCatalog = {
  [ORDER_STATUS_PROCESSED]: { key: ORDER_STATUS_PROCESSED, label: 'Đã xử lý', localStatus: ORDER_STATUS_PROCESSED },
  [ORDER_STATUS_CANCELLED]: { key: ORDER_STATUS_CANCELLED, label: 'Hủy đơn', localStatus: ORDER_STATUS_CANCELLED },
};

const statusTransitionByLocal = {
  [ORDER_STATUS_NEW]: [ORDER_STATUS_PROCESSED, ORDER_STATUS_CANCELLED],
  [ORDER_STATUS_PROCESSED]: [ORDER_STATUS_CANCELLED],
  [ORDER_STATUS_CANCELLED]: [],
};

const normalizeOrder = (order) => ({
  ...order,
  status: normalizeOrderStatus(order?.status),
});

const formatVnd = (value) =>
  Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });

const formatDateTime = (value) =>
  formatViDateTime(value, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) || 'Chưa có';

const getOrderCode = (order) => order?.tracking_code || `LS-${String(order?.id || '').padStart(5, '0')}`;

const getStatusMeta = (status) => statusMeta[normalizeOrderStatus(status)] || statusMeta[ORDER_STATUS_NEW];

const getAvailableActions = (status) => {
  const keys = statusTransitionByLocal[normalizeOrderStatus(status)] || [];
  return keys.map((key) => statusActionCatalog[key]).filter(Boolean);
};

const orderStatusLabel = (status) => getStatusMeta(status).label;

const OrderStatusBadge = ({ status }) => {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ring-1 ${meta.badge}`}>
      <Icon size={13} />
      {meta.label}
    </span>
  );
};

const EmptyState = ({ onCreate }) => (
  <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-14 text-center dark:border-slate-700 dark:bg-slate-950/50">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm dark:bg-slate-900">
      <ClipboardList size={28} />
    </div>
    <div className="mt-4 text-lg font-black text-slate-950 dark:text-white">Chưa có đơn hàng phù hợp</div>
    <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
      Thử đổi bộ lọc hoặc tạo đơn thủ công cho khách mua trực tiếp tại cửa hàng.
    </p>
    <button
      type="button"
      onClick={onCreate}
      className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(225,29,72,0.22)] transition hover:bg-rose-700"
    >
      <Plus size={17} />
      Tạo đơn hàng
    </button>
  </div>
);

const LoadingRows = () => (
  <>
    {[0, 1, 2, 3].map((item) => (
      <tr key={item} className="animate-pulse border-b border-slate-100 dark:border-slate-800">
        <td className="px-5 py-4"><div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-800" /></td>
        <td className="px-5 py-4"><div className="h-12 w-44 rounded-2xl bg-slate-200 dark:bg-slate-800" /></td>
        <td className="px-5 py-4"><div className="h-12 w-52 rounded-2xl bg-slate-200 dark:bg-slate-800" /></td>
        <td className="px-5 py-4"><div className="h-10 w-40 rounded-2xl bg-slate-200 dark:bg-slate-800" /></td>
        <td className="px-5 py-4"><div className="h-10 w-28 rounded-2xl bg-slate-200 dark:bg-slate-800" /></td>
        <td className="px-5 py-4"><div className="h-9 w-24 rounded-full bg-slate-200 dark:bg-slate-800" /></td>
        <td className="px-5 py-4"><div className="h-10 w-24 rounded-2xl bg-slate-200 dark:bg-slate-800" /></td>
      </tr>
    ))}
  </>
);

const Orders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailStatus, setDetailStatus] = useState('');
  const [bulkStatus, setBulkStatus] = useState(ORDER_STATUS_PROCESSED);
  const [submitting, setSubmitting] = useState(false);
  const openedQueryOrderIdRef = useRef(null);

  const totalPages = Math.max(1, Number(pagination.total_pages || Math.ceil(Number(pagination.total || 0) / PAGE_LIMIT) || 1));
  const headerTotalText = Number(pagination.total || 0).toLocaleString('vi-VN');

  const visiblePages = useMemo(() => {
    const page = Number(pagination.page || 1);
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    const pages = [];
    for (let item = start; item <= end; item += 1) pages.push(item);
    return pages;
  }, [pagination.page, totalPages]);

  const pageSummary = useMemo(() => {
    const totalAmount = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const pending = orders.filter((order) => normalizeOrderStatus(order.status) === ORDER_STATUS_NEW).length;
    const processed = orders.filter((order) => normalizeOrderStatus(order.status) === ORDER_STATUS_PROCESSED).length;
    const cancelled = orders.filter((order) => normalizeOrderStatus(order.status) === ORDER_STATUS_CANCELLED).length;
    return [
      { label: 'Đơn trong trang', value: orders.length, icon: ClipboardList, tone: 'slate' },
      { label: 'Mới', value: pending, icon: AlertTriangle, tone: 'amber' },
      { label: 'Đã xử lý', value: processed, icon: CheckCircle2, tone: 'emerald' },
      { label: 'Hủy đơn', value: cancelled, icon: Trash2, tone: 'rose' },
      { label: 'Giá trị trang', value: formatVnd(totalAmount), icon: Package, tone: 'slate' },
    ];
  }, [orders]);

  const handleApiError = useCallback((error, fallbackMessage) => {
    const parsed = parseApiError(error);
    if (parsed?.status === 401) {
      showToast('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 'error', 5000);
      logout();
      const current = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/admin/login?redirect=${encodeURIComponent(current)}`;
      return;
    }
    showToast(parsed?.message || fallbackMessage, 'error', 6000);
  }, [showToast]);

  const loadOrders = useCallback(async (options = {}) => {
    const silent = Boolean(options?.silent);
    if (!silent) setLoading(true);
    try {
      const response = await adminOrderService.getOrders({
        page: pagination.page,
        limit: PAGE_LIMIT,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter || undefined,
      }, { skipGlobalLoading: silent });
      setOrders(Array.isArray(response?.data) ? response.data.map(normalizeOrder) : []);
      setPagination((prev) => ({
        ...prev,
        page: Number(response?.pagination?.page ?? prev.page),
        limit: Number(response?.pagination?.limit ?? PAGE_LIMIT),
        total: Number(response?.pagination?.total ?? 0),
        total_pages: Number(response?.pagination?.total_pages ?? 1),
      }));
    } catch (error) {
      if (!silent) {
        setOrders([]);
        handleApiError(error, 'Không tải được danh sách đơn hàng');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [debouncedSearch, handleApiError, pagination.page, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      setDebouncedSearch(search);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const refreshLatestOrders = useCallback(() => {
    if (Number(pagination.page || 1) !== 1) {
      setPagination((prev) => ({ ...prev, page: 1 }));
      return;
    }
    loadOrders({ silent: true });
  }, [loadOrders, pagination.page]);

  useEffect(() => {
    const handleNewOrder = () => refreshLatestOrders();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshLatestOrders();
    };

    window.addEventListener(ADMIN_NEW_ORDER_EVENT, handleNewOrder);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') refreshLatestOrders();
    }, 5000);

    return () => {
      window.removeEventListener(ADMIN_NEW_ORDER_EVENT, handleNewOrder);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(timer);
    };
  }, [refreshLatestOrders]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => orders.some((order) => order.id === id)));
  }, [orders]);

  const openDetail = async (order) => {
    const normalizedOrder = normalizeOrder(order);
    setDetailLoading(true);
    setDetailOrder(normalizedOrder);
    setDetailStatus(normalizedOrder.status || ORDER_STATUS_NEW);
    try {
      const response = await adminOrderService.getOrderById(order.id);
      const nextOrder = normalizeOrder(response?.data || order);
      setDetailOrder(nextOrder);
      setDetailStatus(nextOrder.status || ORDER_STATUS_NEW);
    } catch (error) {
      handleApiError(error, 'Không tải được chi tiết đơn hàng');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = Number(params.get('orderId') || 0);
    if (!orderId || openedQueryOrderIdRef.current === orderId) return;

    const existing = orders.find((order) => Number(order.id) === orderId);
    if (existing) {
      openedQueryOrderIdRef.current = orderId;
      openDetail(existing);
      return;
    }

    let active = true;
    openedQueryOrderIdRef.current = orderId;
    setDetailLoading(true);
    setDetailOrder({ id: orderId, status: ORDER_STATUS_NEW, total_amount: 0, item_count: 0 });
    setDetailStatus(ORDER_STATUS_NEW);

    adminOrderService.getOrderById(orderId)
      .then((response) => {
        if (!active) return;
        const order = normalizeOrder(response?.data || {});
        setDetailOrder(order);
        setDetailStatus(order?.status || ORDER_STATUS_NEW);
      })
      .catch((error) => {
        if (!active) return;
        setDetailOrder(null);
        handleApiError(error, 'Không mở được chi tiết đơn từ thông báo');
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const closeDetail = () => {
    setDetailOrder(null);
    setDetailStatus('');
    setDetailLoading(false);
    const params = new URLSearchParams(location.search);
    if (params.has('orderId')) {
      params.delete('orderId');
      const nextSearch = params.toString();
      openedQueryOrderIdRef.current = null;
      navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
    }
  };

  const updateOrderStatus = async (orderId, nextStatus, successMessage = 'Cập nhật trạng thái đơn hàng thành công') => {
    const normalizedStatus = normalizeOrderStatus(nextStatus);
    setSubmitting(true);
    try {
      const response = await adminOrderService.updateOrder(orderId, { status: normalizedStatus });
      const updated = response?.data ? normalizeOrder(response.data) : null;
      setOrders((prev) => prev.map((order) => (order.id === orderId ? normalizeOrder({ ...order, status: normalizedStatus, ...(updated || {}) }) : order)));
      if (detailOrder?.id === orderId) {
        setDetailOrder((prev) => normalizeOrder({ ...prev, status: normalizedStatus, ...(updated || {}) }));
        setDetailStatus(normalizedStatus);
      }
      showToast(successMessage, 'success');
    } catch (error) {
      handleApiError(error, 'Không cập nhật được trạng thái đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };

  const softDeleteOrder = async (order) => {
    if (!window.confirm(`Xóa đơn ${getOrderCode(order)}?`)) return;
    setSubmitting(true);
    try {
      await adminOrderService.softDeleteOrder(order.id);
      showToast('Đã xóa đơn hàng', 'success');
      if (detailOrder?.id === order.id) closeDetail();
      await loadOrders();
    } catch (error) {
      handleApiError(error, 'Không xóa được đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };

  const runBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    const isDelete = action === 'soft_delete';
    if (isDelete && !window.confirm(`Xóa ${selectedIds.length} đơn hàng đã chọn?`)) return;
    setSubmitting(true);
    try {
      await adminOrderService.bulkOrders({
        ids: selectedIds,
        action,
        status: action === 'status' ? bulkStatus : undefined,
      });
      showToast(isDelete ? 'Đã xóa các đơn đã chọn' : 'Đã cập nhật các đơn đã chọn', 'success');
      setSelectedIds([]);
      await loadOrders();
    } catch (error) {
      handleApiError(error, 'Không xử lý được các đơn đã chọn');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return Array.from(next);
    });
  };

  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? orders.map((order) => order.id) : []);
  };

  const goToPage = (page) => {
    setPagination((prev) => ({ ...prev, page: Math.min(totalPages, Math.max(1, page)) }));
  };

  const renderStatusSelect = (order, className) => {
    const actions = getAvailableActions(order.status);
    return (
      <select
        value=""
        disabled={actions.length === 0 || submitting}
        onChange={(event) => {
          const nextStatus = event.target.value;
          if (nextStatus) updateOrderStatus(order.id, nextStatus);
        }}
        className={className}
      >
        <option value="">{actions.length ? 'Chuyển trạng thái' : orderStatusLabel(order.status)}</option>
        {actions.map((action) => (
          <option key={action.key} value={action.localStatus}>{action.label}</option>
        ))}
      </select>
    );
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
              <ClipboardList size={14} />
              Đơn hàng
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">Quản lý đơn hàng</h1>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              Tổng {headerTotalText} đơn. Luồng xử lý chỉ gồm Mới, Đã xử lý và Hủy đơn.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[34rem]">
            {pageSummary.map((item) => {
              const Icon = item.icon;
              const toneClass =
                item.tone === 'emerald'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : item.tone === 'amber'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
                    : item.tone === 'rose'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
              return (
                <div key={item.label} className={`rounded-2xl px-3 py-3 ${toneClass}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide opacity-75">{item.label}</span>
                    <Icon size={15} />
                  </div>
                  <div className="mt-2 truncate text-xl font-black leading-none sm:text-2xl">{item.value}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm mã đơn, tên khách, số điện thoại..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
              <button
                type="button"
                onClick={loadOrders}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-rose-200 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <RefreshCcw size={17} />
                Làm mới
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/orders/create')}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(225,29,72,0.22)] transition hover:bg-rose-700"
              >
                <Plus size={18} />
                Tạo đơn
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {statusFilters.map((filter) => {
              const active = statusFilter === filter.value;
              return (
                <button
                  key={filter.value || 'all'}
                  type="button"
                  onClick={() => {
                    setPagination((prev) => ({ ...prev, page: 1 }));
                    setStatusFilter(filter.value);
                    setSelectedIds([]);
                  }}
                  className={
                    'h-10 shrink-0 rounded-2xl border px-4 text-sm font-black transition ' +
                    (active
                      ? 'border-rose-600 bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.18)]'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200')
                  }
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/60">
              <label className="inline-flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={orders.length > 0 && selectedIds.length === orders.length}
                  onChange={(event) => toggleSelectAll(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                Chọn tất cả
              </label>
              <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
                Trang {pagination.page} / {totalPages}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-white dark:bg-slate-900">
                  <tr>
                    <th className="w-12 px-5 py-4 text-left" />
                    <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">Đơn hàng</th>
                    <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">Khách hàng</th>
                    <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">Sản phẩm</th>
                    <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">Tổng tiền</th>
                    <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">Trạng thái</th>
                    <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-wide text-slate-500">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <LoadingRows />
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-4 align-middle">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(order.id)}
                            onChange={(event) => toggleSelect(order.id, event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                          />
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <button type="button" onClick={() => openDetail(order)} className="text-left">
                            <div className="font-black text-slate-950 hover:text-rose-700 dark:text-white">#{getOrderCode(order)}</div>
                            <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                              <CalendarClock size={13} />
                              {formatDateTime(order.created_at)}
                            </div>
                          </button>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <div className="max-w-[15rem]">
                            <div className="truncate font-black text-slate-900 dark:text-white">{order.receiver_name || 'Khách lẻ'}</div>
                            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                              <Phone size={13} />
                              {order.receiver_phone || 'Chưa có SĐT'}
                            </div>
                            <div className="mt-1 truncate text-xs font-medium text-slate-500">{order.receiver_address || 'Chưa có địa chỉ'}</div>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <div className="max-w-[14rem]">
                            <div className="line-clamp-2 text-sm font-black text-slate-900 dark:text-white">{order.first_product_name || 'Sản phẩm trong đơn'}</div>
                            <div className="mt-1 text-xs font-bold text-slate-500">{Number(order.item_count || 0)} mặt hàng</div>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <div className="font-black text-rose-600">{formatVnd(order.total_amount)}</div>
                          <div className="mt-1 text-xs font-bold text-slate-500">{paymentMeta[order.payment_status] || 'Chưa rõ thanh toán'}</div>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <div className="space-y-2">
                            <OrderStatusBadge status={order.status} />
                            {renderStatusSelect(order, 'block h-9 w-36 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200')}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openDetail(order)}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-700 transition hover:border-rose-200 hover:text-rose-700 dark:border-slate-700 dark:text-slate-200"
                            >
                              <Eye size={16} />
                              Chi tiết
                            </button>
                            <button
                              type="button"
                              onClick={() => softDeleteOrder(order)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white transition hover:bg-rose-700"
                              aria-label="Xóa đơn hàng"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 lg:hidden">
            {loading
              ? [0, 1, 2].map((item) => (
                <div key={item} className="h-52 animate-pulse rounded-[1.35rem] border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800" />
              ))
              : orders.map((order) => {
                const meta = getStatusMeta(order.status);
                return (
                  <article key={order.id} className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-3">
                      <label className="mt-1 inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(order.id)}
                          onChange={(event) => toggleSelect(order.id, event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                      </label>
                      <button type="button" onClick={() => openDetail(order)} className="min-w-0 flex-1 text-left">
                        <div className="font-black text-slate-950 dark:text-white">#{getOrderCode(order)}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <CalendarClock size={13} />
                          {formatDateTime(order.created_at)}
                        </div>
                      </button>
                      <span className={`shrink-0 rounded-2xl px-3 py-2 text-xs font-black ${meta.card}`}>{meta.label}</span>
                    </div>

                    <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-black text-slate-900 dark:text-white">{order.receiver_name || 'Khách lẻ'}</div>
                        <div className="mt-1 text-xs font-bold text-slate-500">{order.receiver_phone || 'Chưa có SĐT'}</div>
                      </div>
                      <div className="rounded-2xl bg-rose-50 p-3 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                        <div className="text-[11px] font-black uppercase tracking-wide opacity-70">Tổng tiền</div>
                        <div className="mt-1 truncate text-lg font-black">{formatVnd(order.total_amount)}</div>
                        <div className="mt-1 truncate text-xs font-bold opacity-75">{paymentMeta[order.payment_status] || 'Chưa rõ'}</div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                      <div className="line-clamp-2 text-sm font-black text-slate-900 dark:text-white">{order.first_product_name || 'Sản phẩm trong đơn'}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">{Number(order.item_count || 0)} mặt hàng</div>
                      <div className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-slate-500">{order.receiver_address || 'Chưa có địa chỉ giao hàng'}</div>
                    </div>

                    <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                      {renderStatusSelect(order, 'h-11 min-w-0 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200')}
                      <button type="button" onClick={() => openDetail(order)} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200" aria-label="Chi tiết đơn hàng">
                        <Eye size={18} />
                      </button>
                      <button type="button" onClick={() => softDeleteOrder(order)} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-600 text-white" aria-label="Xóa đơn hàng">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>

          {!loading && orders.length === 0 && <EmptyState onCreate={() => navigate('/admin/orders/create')} />}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Hiển thị <span className="font-black text-slate-900 dark:text-white">{orders.length}</span> / {headerTotalText} đơn hàng
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => goToPage(1)} disabled={pagination.page <= 1} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">&laquo;</button>
              <button type="button" onClick={() => goToPage(Number(pagination.page || 1) - 1)} disabled={pagination.page <= 1} className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">
                <ChevronLeft size={16} />
              </button>
              {visiblePages.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => goToPage(pageNumber)}
                  className={
                    'h-10 min-w-10 rounded-xl border px-3 text-sm font-black ' +
                    (pageNumber === pagination.page
                      ? 'border-rose-600 bg-rose-600 text-white'
                      : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200')
                  }
                >
                  {pageNumber}
                </button>
              ))}
              <button type="button" onClick={() => goToPage(Number(pagination.page || 1) + 1)} disabled={pagination.page >= totalPages} className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => goToPage(totalPages)} disabled={pagination.page >= totalPages} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">&raquo;</button>
            </div>
          </div>
        </div>
      </section>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.9rem)] left-0 right-0 z-40 px-4 lg:bottom-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm font-black text-slate-950 dark:text-white">Đã chọn {selectedIds.length} đơn hàng</div>
            <div className="flex flex-wrap gap-2">
              <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                {Object.values(statusActionCatalog).map((action) => (
                  <option key={action.key} value={action.localStatus}>{action.label}</option>
                ))}
              </select>
              <button type="button" disabled={submitting} onClick={() => runBulkAction('status')} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-800 disabled:opacity-50 dark:border-slate-700 dark:text-slate-100">
                Đổi trạng thái
              </button>
              <button type="button" disabled={submitting} onClick={() => runBulkAction('soft_delete')} className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50">
                Xóa đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
          <div className="max-h-[92vh] w-full overflow-hidden rounded-t-[1.8rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:max-w-5xl sm:rounded-[1.8rem]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-black text-slate-950 dark:text-white sm:text-2xl">#{getOrderCode(detailOrder)}</h2>
                  <OrderStatusBadge status={detailOrder.status} />
                </div>
                <div className="mt-1 text-sm font-bold text-slate-500">{formatDateTime(detailOrder.created_at)}</div>
              </div>
              <button type="button" onClick={closeDetail} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200" aria-label="Đóng chi tiết đơn hàng">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(92vh-5.5rem)] overflow-y-auto p-4 sm:p-5">
              {detailLoading ? (
                <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="h-64 animate-pulse rounded-[1.4rem] bg-slate-100 dark:bg-slate-800" />
                  <div className="h-64 animate-pulse rounded-[1.4rem] bg-slate-100 dark:bg-slate-800" />
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="space-y-4">
                    <section className="rounded-[1.4rem] border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
                        <UserRound size={17} />
                        Thông tin khách hàng
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60">
                          <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Người nhận</div>
                          <div className="mt-1 font-black text-slate-950 dark:text-white">{detailOrder.receiver_name || 'Khách lẻ'}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60">
                          <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Số điện thoại</div>
                          <div className="mt-1 font-black text-slate-950 dark:text-white">{detailOrder.receiver_phone || 'Chưa có SĐT'}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60 sm:col-span-2">
                          <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Địa chỉ giao hàng</div>
                          <div className="mt-1 text-sm font-bold leading-6 text-slate-800 dark:text-slate-100">{detailOrder.receiver_address || 'Chưa có địa chỉ giao hàng'}</div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[1.4rem] border border-slate-200 p-4 dark:border-slate-800">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
                          <Package size={17} />
                          Sản phẩm trong đơn
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                          {Number(detailOrder.item_count || detailOrder.items?.length || 0)} mặt hàng
                        </span>
                      </div>
                      <div className="space-y-3">
                        {(detailOrder.items || []).length > 0 ? (
                          detailOrder.items.map((item) => (
                            <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                              <div className="min-w-0">
                                <div className="line-clamp-2 text-sm font-black text-slate-950 dark:text-white">{item.product_name || 'Sản phẩm'}</div>
                                <div className="mt-1 text-xs font-bold text-slate-500">
                                  {item.variant_sku ? `SKU: ${item.variant_sku} · ` : ''}SL: {Number(item.quantity || 0)} · {formatVnd(item.unit_price)}
                                </div>
                              </div>
                              <div className="text-right text-sm font-black text-rose-600">{formatVnd(item.subtotal)}</div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:bg-slate-950/60">
                            Chưa có dữ liệu sản phẩm chi tiết.
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-4">
                    <section className="rounded-[1.4rem] border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
                        <ClipboardList size={17} />
                        Xử lý đơn
                      </div>
                      <div className="mt-4 space-y-3">
                        <label className="block">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-400">Trạng thái hiện tại</span>
                          <select
                            value={detailStatus}
                            disabled={submitting || detailOrder.status === ORDER_STATUS_CANCELLED}
                            onChange={(event) => setDetailStatus(event.target.value)}
                            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          >
                            {statusFilters.filter((item) => item.value).map((item) => (
                              <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          disabled={submitting || !detailStatus || detailStatus === detailOrder.status}
                          onClick={() => updateOrderStatus(detailOrder.id, detailStatus, 'Đã lưu trạng thái đơn hàng')}
                          className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-rose-600 px-4 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Lưu trạng thái
                        </button>
                      </div>
                    </section>

                    <section className="rounded-[1.4rem] border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
                        <ClipboardList size={17} />
                        Thanh toán và tổng tiền
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-bold text-slate-500">Thanh toán</span>
                          <span className="font-black text-slate-950 dark:text-white">{paymentMeta[detailOrder.payment_status] || 'Chưa rõ'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-bold text-slate-500">Phương thức</span>
                          <span className="font-black text-slate-950 dark:text-white">{detailOrder.payment_method || 'COD'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-bold text-slate-500">Phí giao hàng</span>
                          <span className="font-black text-slate-950 dark:text-white">{formatVnd(detailOrder.shipping_fee)}</span>
                        </div>
                        <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-black text-slate-950 dark:text-white">Tổng cộng</span>
                            <span className="text-2xl font-black text-rose-600">{formatVnd(detailOrder.total_amount)}</span>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[1.4rem] border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
                        <CalendarClock size={17} />
                        Mốc thời gian
                      </div>
                      <div className="mt-4 grid gap-3">
                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60">
                          <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Tạo đơn</div>
                          <div className="mt-1 text-sm font-black text-slate-950 dark:text-white">{formatDateTime(detailOrder.created_at)}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60">
                          <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Cập nhật gần nhất</div>
                          <div className="mt-1 text-sm font-black text-slate-950 dark:text-white">{formatDateTime(detailOrder.updated_at)}</div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
