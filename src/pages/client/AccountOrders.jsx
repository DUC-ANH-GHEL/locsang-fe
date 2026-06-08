import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStorefrontAuth } from '../../contexts/StorefrontAuthContext';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../components/Toast/ToastContext';
import { cancelStorefrontOrder, getStorefrontMyOrders, lookupPublicOrder } from '../../services/customerAccountService';
import { useSEO } from '../../hooks/useSEO';

const CHECKOUT_FORM_STORAGE_KEY = 'locsang_storefront_checkout_form_v1';
const ORDER_HISTORY_STORAGE_KEY = 'locsang_storefront_order_history_v1';
const ORDERS_PER_PAGE = 5;
const IMAGE_DEFAULT_URL = 'https://res.cloudinary.com/diwxfpt92/image/upload/v1770981822/logo_d2wmlf.png';

const loadSavedReceiverPhone = () => {
  try {
    const raw = localStorage.getItem(CHECKOUT_FORM_STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return String(parsed?.phone || '').trim();
  } catch {
    return '';
  }
};

const loadGuestOrdersFromLocal = () => {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        id: Number(item?.id || 0),
        tracking_code: item?.trackingCode || item?.tracking_code || null,
        pancake_order_id: item?.pancakeOrderId || item?.pancake_order_id || null,
        status: String(item?.status || 'pending'),
        payment_status: String(item?.paymentStatus || item?.payment_status || 'pending'),
        payment_method: String(item?.paymentMethod || item?.payment_method || 'cod'),
        receiver_name: item?.receiverName || item?.receiver_name || '',
        receiver_phone: item?.receiverPhone || item?.receiver_phone || '',
        receiver_address: item?.receiverAddress || item?.receiver_address || '',
        total_amount: Number(item?.totalAmount ?? item?.total_amount ?? 0),
        created_at: item?.createdAt || item?.created_at || new Date().toISOString(),
        items: Array.isArray(item?.items) ? item.items : [],
      }))
      .filter((item) => item.id > 0 || item.tracking_code)
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  } catch {
    return [];
  }
};

const saveGuestOrdersToLocal = (orders) => {
  try {
    if (!Array.isArray(orders) || orders.length === 0) return;
    const existing = loadGuestOrdersFromLocal();
    const merged = [...orders, ...existing];
    const deduped = [];
    const seen = new Set();
    merged.forEach((order) => {
      const key = String(order?.tracking_code || order?.id || '').trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      deduped.push(order);
    });

    const serialized = deduped.slice(0, 30).map((order) => ({
      id: order.id,
      trackingCode: order.tracking_code,
      pancakeOrderId: order.pancake_order_id,
      status: order.status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      receiverName: order.receiver_name,
      receiverPhone: order.receiver_phone,
      receiverAddress: order.receiver_address,
      totalAmount: order.total_amount,
      createdAt: order.created_at,
      items: Array.isArray(order.items) ? order.items : [],
    }));

    localStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // ignore storage write errors
  }
};

const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  const d = new Date(value || '');
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
};

const statusLabel = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'pending') return 'Chờ xử lý';
  if (normalized === 'processing') return 'Đang xử lý';
  if (normalized === 'shipped') return 'Đang giao';
  if (normalized === 'delivered') return 'Đã giao';
  if (normalized === 'cancelled') return 'Đã hủy';
  return normalized || '-';
};

const statusClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'delivered') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'cancelled') return 'bg-red-100 text-red-700';
  if (normalized === 'shipped') return 'bg-blue-100 text-blue-700';
  if (normalized === 'processing') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-700';
};

const paymentMethodLabel = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'cod') return 'Thanh toán khi nhận hàng';
  if (normalized === 'bank_transfer') return 'Chuyển khoản';
  return 'Thanh toán theo đơn';
};

const paymentStatusLabel = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'paid') return 'Đã thanh toán';
  if (normalized === 'pending') return 'Chưa thanh toán';
  if (normalized === 'failed') return 'Thanh toán chưa thành công';
  if (normalized === 'refunded') return 'Đã hoàn tiền';
  return 'Đang cập nhật';
};

const AccountOrders = () => {
  const navigate = useNavigate();
  const { user, loading } = useStorefrontAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast ? useToast() : { showToast: () => {} };
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [cancelPermissionDenied, setCancelPermissionDenied] = useState(false);
  const [cancelPermissionMessage, setCancelPermissionMessage] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lookupTrackingCode, setLookupTrackingCode] = useState('');
  const [lookupPhone, setLookupPhone] = useState(loadSavedReceiverPhone);
  const [lookupLoading, setLookupLoading] = useState(false);

  useSEO({
    title: 'Don Hang Cua Ban',
    description: 'Trang lich su don hang Lộc Sang.',
    canonicalPath: '/account/orders',
    noindex: true,
  });

  const canCancelOrder = (status) => {
    if (cancelPermissionDenied) return false;
    const normalized = String(status || '').toLowerCase();
    return normalized === 'pending' || normalized === 'processing';
  };

  const loadOrders = useCallback(async (silent = false) => {
    if (!user?.id) {
      setOrders(loadGuestOrdersFromLocal());
      setLoadingOrders(false);
      return;
    }

    try {
      setLoadingOrders(true);
      setError('');
      setCancelPermissionDenied(false);
      setCancelPermissionMessage('');
      const receiverPhone = loadSavedReceiverPhone();
      const data = await getStorefrontMyOrders(receiverPhone || undefined);
      setOrders(Array.isArray(data) ? data : []);
      saveGuestOrdersToLocal(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err?.response?.data?.detail
        || err?.response?.data?.message
        || err?.message
        || 'Không thể tải đơn hàng của bạn',
      );
      if (!silent) setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!cancelled) await loadOrders(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [loadOrders]);

  const orderCountText = useMemo(() => {
    if (loadingOrders) return 'Đang tải...';
    return `${orders.length} đơn hàng`;
  }, [loadingOrders, orders.length]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));
  }, [orders.length]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ORDERS_PER_PAGE;
    return orders.slice(start, start + ORDERS_PER_PAGE);
  }, [orders, currentPage]);

  const rangeText = useMemo(() => {
    if (orders.length === 0) return '0';
    const start = (currentPage - 1) * ORDERS_PER_PAGE + 1;
    const end = Math.min(start + ORDERS_PER_PAGE - 1, orders.length);
    return `${start}-${end}`;
  }, [orders.length, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [orders.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleReorder = (order) => {
    const sourceItems = Array.isArray(order?.items) ? order.items : [];
    let addedCount = 0;

    sourceItems.forEach((item) => {
      const pid = Number(item?.product_id);
      if (!Number.isFinite(pid) || pid <= 0) return;

      addToCart({
        product_id: pid,
        product_variant_id: Number.isFinite(Number(item?.product_variant_id))
          ? Number(item.product_variant_id)
          : null,
        title: String(item?.name || 'Sản phẩm Lộc Sang'),
        price: Number(item?.unit_price || 0),
        image: String(item?.image || item?.thumbnail || IMAGE_DEFAULT_URL),
        quantity: Math.max(1, Number(item?.quantity || 1)),
      });
      addedCount += 1;
    });

    if (addedCount === 0) {
      if (showToast) showToast('Đơn này chưa có đủ dữ liệu để mua lại nhanh.', 'warning');
      return;
    }

    if (showToast) showToast(`Đã thêm ${addedCount} sản phẩm vào giỏ.`, 'success');
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-6 pb-12">
        <div className="max-w-5xl mx-auto px-4">Đang tải đơn hàng...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Đơn hàng của tôi</h1>
              <p className="mt-1 text-sm text-gray-600">Trạng thái đơn hàng được cập nhật tự động theo thời gian thực.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">{orderCountText}</div>
            </div>
          </div>

          {cancelPermissionDenied && cancelPermissionMessage && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {cancelPermissionMessage}
            </div>
          )}

          {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          {!user && (
            <div className="mt-4 rounded-lg border border-[#e6ddd0] bg-[#fff8ed] p-4 text-sm text-[#5f584d]">
              <p className="font-semibold text-[#3f3a31]">Bạn đang xem lịch sử đơn trên thiết bị này.</p>
              <p className="mt-1">Để tra cứu đơn từ thiết bị khác, nhập mã đơn và số điện thoại nhận hàng.</p>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr,1fr,auto]">
                <input
                  value={lookupTrackingCode}
                  onChange={(e) => setLookupTrackingCode(e.target.value)}
                  placeholder="Mã đơn (VD: LOCSANG-XXXXXX)"
                  className="rounded-lg border border-[#ded3c2] bg-white px-3 py-2 text-sm outline-none focus:border-[#b99e83]"
                />
                <input
                  value={lookupPhone}
                  onChange={(e) => setLookupPhone(e.target.value)}
                  placeholder="Số điện thoại nhận hàng"
                  className="rounded-lg border border-[#ded3c2] bg-white px-3 py-2 text-sm outline-none focus:border-[#b99e83]"
                />
                <button
                  type="button"
                  disabled={lookupLoading}
                  onClick={async () => {
                    const trackingCode = String(lookupTrackingCode || '').trim();
                    const phone = String(lookupPhone || '').trim();
                    if (!trackingCode || !phone) {
                      setError('Vui lòng nhập mã đơn và số điện thoại để tra cứu.');
                      return;
                    }
                    try {
                      setLookupLoading(true);
                      setError('');
                      const result = await lookupPublicOrder({ trackingCode, phone });
                      setOrders((prev) => {
                        const next = [result, ...(Array.isArray(prev) ? prev : [])];
                        const deduped = [];
                        const seen = new Set();
                        next.forEach((order) => {
                          const key = String(order?.tracking_code || order?.id || '').trim();
                          if (!key || seen.has(key)) return;
                          seen.add(key);
                          deduped.push(order);
                        });
                        saveGuestOrdersToLocal(deduped);
                        return deduped;
                      });
                      if (showToast) showToast('Đã tìm thấy đơn hàng.', 'success');
                    } catch (err) {
                      setError(
                        err?.response?.data?.detail
                        || err?.response?.data?.message
                        || err?.message
                        || 'Không tìm thấy đơn hàng phù hợp.',
                      );
                    } finally {
                      setLookupLoading(false);
                    }
                  }}
                  className="rounded-lg bg-[#8a4f2e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#744026] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {lookupLoading ? 'Đang tra cứu...' : 'Tra cứu'}
                </button>
              </div>
            </div>
          )}

          {!loadingOrders && orders.length === 0 && (
            <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-600">
              Bạn chưa có đơn hàng nào. <Link to="/products" className="text-rose-600 font-semibold hover:underline">Mua sắm ngay</Link>
            </div>
          )}

          <div className="mt-5 space-y-4">
            {paginatedOrders.map((order) => (
              <article key={order.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-gray-900">Mã đơn: {order.tracking_code || `#${order.id}`}</div>
                    <div className="text-xs text-gray-500">Tạo lúc: {formatDate(order.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReorder(order)}
                      className="rounded-lg border border-[#e7d7cc] bg-[#fff7f1] px-3 py-1 text-xs font-semibold text-[#8a4f2e] hover:bg-[#ffefe4]"
                    >
                      Mua lại
                    </button>
                    {user && canCancelOrder(order.status) && (
                      <button
                        type="button"
                        disabled={cancellingOrderId === order.id}
                        onClick={async () => {
                          const ok = window.confirm('Bạn có chắc muốn hủy đơn này không?');
                          if (!ok) return;
                          try {
                            setCancellingOrderId(order.id);
                            await cancelStorefrontOrder(Number(order.id));
                            await loadOrders(true);
                          } catch (err) {
                            const statusCode = Number(err?.response?.status || 0);
                            const detailMsg =
                              err?.response?.data?.detail
                              || err?.response?.data?.message
                              || err?.message
                              || 'Không thể hủy đơn hàng';

                            if (statusCode === 403) {
                              setCancelPermissionDenied(true);
                              setCancelPermissionMessage(detailMsg);
                              setError('');
                              return;
                            }
                            setError(
                              detailMsg,
                            );
                          } finally {
                            setCancellingOrderId(null);
                          }
                        }}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        {cancellingOrderId === order.id ? 'Đang hủy...' : 'Hủy đơn'}
                      </button>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500">Mã đối chiếu</div>
                    <div className="font-medium text-gray-800">{order.pancake_order_id || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Thanh toán</div>
                    <div className="font-medium text-gray-800">{paymentMethodLabel(order.payment_method)} / {paymentStatusLabel(order.payment_status)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Tổng tiền</div>
                    <div className="font-semibold text-rose-600">{formatVnd(order.total_amount)}</div>
                  </div>
                </div>

                <div className="mt-3 text-sm">
                  <div className="text-gray-500">Người nhận</div>
                  <div className="font-medium text-gray-800">{order.receiver_name || '-'} - {order.receiver_phone || '-'}</div>
                  <div className="text-gray-700">{order.receiver_address || '-'}</div>
                </div>

                <div className="mt-3 overflow-auto rounded-lg border border-gray-100">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-3 py-2">Sản phẩm</th>
                        <th className="text-right px-3 py-2">SL</th>
                        <th className="text-right px-3 py-2">Đơn giá</th>
                        <th className="text-right px-3 py-2">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.items || []).map((item, index) => (
                        <tr key={`${order.id}-${item.product_id}-${index}`} className="border-t border-gray-100">
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-800">{item.name}</div>
                          </td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatVnd(item.unit_price)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatVnd(item.subtotal)}</td>
                        </tr>
                      ))}
                      {(!order.items || order.items.length === 0) && (
                        <tr className="border-t border-gray-100">
                          <td className="px-3 py-3 text-gray-500" colSpan={4}>
                            Thông tin sản phẩm của đơn này đang được cập nhật.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>

          {!loadingOrders && orders.length > 0 && (
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-600">
                  Hiển thị <span className="font-semibold text-gray-900">{rangeText}</span> trên tổng <span className="font-semibold text-gray-900">{orders.length}</span> đơn hàng.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Trang trước
                  </button>
                  <span className="text-sm font-semibold text-gray-700">
                    Trang {currentPage}/{totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 text-sm">
            {user ? (
              <Link to="/account" className="text-rose-600 font-semibold hover:underline">Quay lại tài khoản</Link>
            ) : (
              <Link to="/products" className="text-rose-600 font-semibold hover:underline">Tiếp tục mua sắm</Link>
            )}
          </div>
        </div>
      </div>

      {loadingOrders && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="rounded-2xl bg-white px-6 py-5 shadow-xl border border-gray-200 flex items-center gap-3">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
            <span className="text-sm font-semibold text-gray-800">Đang tải đơn hàng, vui lòng chờ...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountOrders;
