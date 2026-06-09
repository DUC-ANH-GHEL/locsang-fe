import { Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../components/layout/Breadcrumb';
import { useToast } from '../../../components/Toast';
import { checkoutService } from '../../../services/checkoutService';
import { productService, AdminProductListItem } from '../../../services/productService';

type OrderLine = {
  product_id: number;
  name: string;
  sku?: string | null;
  price: number;
  quantity: number;
};

const formatCurrency = (value: unknown) =>
  Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const OrderCreate = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    note: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await productService.getAdminProducts({ page: 1, limit: 100, status: 'active', search });
        setProducts(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setProducts([]);
      }
    })();
  }, [search]);

  const total = useMemo(() => lines.reduce((sum, item) => sum + item.price * item.quantity, 0), [lines]);

  const addProduct = (product: AdminProductListItem) => {
    const price = Number(product.price_min ?? product.price_max ?? 0);
    setLines((prev) => {
      const existed = prev.find((line) => line.product_id === Number(product.id));
      if (existed) {
        return prev.map((line) => (line.product_id === Number(product.id) ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [
        ...prev,
        {
          product_id: Number(product.id),
          name: product.name,
          sku: product.sku,
          price: Number.isFinite(price) ? price : 0,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (productId: number, nextQuantity: number) => {
    setLines((prev) =>
      prev.map((line) => (line.product_id === productId ? { ...line, quantity: Math.max(1, Number(nextQuantity) || 1) } : line)),
    );
  };

  const removeLine = (productId: number) => {
    setLines((prev) => prev.filter((line) => line.product_id !== productId));
  };

  const submit = async () => {
    if (!form.receiverName.trim() || !form.receiverPhone.trim() || !form.receiverAddress.trim()) {
      showToast('Vui lòng nhập đủ tên, số điện thoại và địa chỉ nhận hàng.', 'warning');
      return;
    }
    if (lines.length === 0) {
      showToast('Vui lòng chọn ít nhất một sản phẩm.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await checkoutService.createPublicOrder({
        receiver_name: form.receiverName.trim(),
        receiver_phone: form.receiverPhone.trim(),
        receiver_address: form.receiverAddress.trim(),
        note: form.note.trim() || undefined,
        payment_method: 'cod',
        items: lines.map((line) => ({
          product_id: line.product_id,
          quantity: line.quantity,
        })),
      });
      showToast('Đã tạo đơn hàng.', 'success');
      navigate('/admin/orders');
    } catch (error: any) {
      showToast(error?.response?.data?.detail || 'Không tạo được đơn hàng.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumb items={[{ name: 'Trang chủ', path: '/admin' }, { name: 'Đơn hàng', path: '/admin/orders' }, { name: 'Tạo đơn' }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tạo đơn hàng</h1>
        <p className="mt-1 text-sm text-gray-500">Đơn được tạo trực tiếp trong hệ thống Lộc Sang, không gọi dịch vụ bên thứ ba.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Thông tin khách hàng</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-semibold">
                <span>Họ và tên</span>
                <input value={form.receiverName} onChange={(e) => setForm((p) => ({ ...p, receiverName: e.target.value }))} className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950" />
              </label>
              <label className="space-y-1 text-sm font-semibold">
                <span>Số điện thoại</span>
                <input value={form.receiverPhone} onChange={(e) => setForm((p) => ({ ...p, receiverPhone: e.target.value }))} className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950" />
              </label>
              <label className="space-y-1 text-sm font-semibold md:col-span-2">
                <span>Địa chỉ nhận hàng</span>
                <textarea value={form.receiverAddress} onChange={(e) => setForm((p) => ({ ...p, receiverAddress: e.target.value }))} rows={3} className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950" />
              </label>
              <label className="space-y-1 text-sm font-semibold md:col-span-2">
                <span>Ghi chú</span>
                <textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} rows={3} className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950" />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Chọn sản phẩm</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên hoặc SKU sản phẩm" className="mb-4 w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950" />
            <div className="grid gap-3 md:grid-cols-2">
              {products.map((product) => (
                <button key={product.id} type="button" onClick={() => addProduct(product)} className="rounded-xl border border-gray-200 p-3 text-left hover:border-rose-300 hover:bg-rose-50 dark:border-gray-800 dark:hover:bg-rose-950/20">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{product.name}</div>
                  <div className="mt-1 text-xs text-gray-500">SKU: {product.sku || '-'} | Tồn: {product.stock_total ?? 0}</div>
                  <div className="mt-2 text-sm font-bold text-rose-600">{formatCurrency(product.price_min ?? product.price_max)}</div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Đơn hàng</h2>
          <div className="space-y-3">
            {lines.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-950">Chưa có sản phẩm.</div>
            ) : (
              lines.map((line) => (
                <div key={line.product_id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{line.name}</div>
                      <div className="text-xs text-gray-500">SKU: {line.sku || '-'}</div>
                    </div>
                    <button type="button" onClick={() => removeLine(line.product_id)} className="rounded-lg p-1 text-red-600 hover:bg-red-50">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="inline-flex overflow-hidden rounded-xl border border-gray-300 dark:border-gray-700">
                      <button type="button" onClick={() => updateQuantity(line.product_id, line.quantity - 1)} className="px-3 py-1">
                        <Minus size={14} />
                      </button>
                      <input value={line.quantity} onChange={(e) => updateQuantity(line.product_id, Number(e.target.value))} className="w-12 border-x border-gray-300 bg-transparent text-center dark:border-gray-700" />
                      <button type="button" onClick={() => updateQuantity(line.product_id, line.quantity + 1)} className="px-3 py-1">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="font-bold text-rose-600">{formatCurrency(line.price * line.quantity)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4 text-lg font-bold dark:border-gray-800">
            <span>Tổng cộng</span>
            <span className="text-rose-600">{formatCurrency(total)}</span>
          </div>
          <button type="button" disabled={submitting} onClick={submit} className="mt-5 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">
            {submitting ? 'Đang tạo đơn...' : 'Tạo đơn hàng'}
          </button>
        </aside>
      </div>
    </div>
  );
};

export default OrderCreate;
