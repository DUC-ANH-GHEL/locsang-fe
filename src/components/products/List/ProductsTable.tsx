import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../../services/authService';
import { productService } from '../../../services/productService';
import { parseApiError } from '../../../utils/apiError';
import { useToast } from '../../Toast';
import QuickEditModal, { QuickEditValues } from './QuickEditModal';

type AdminListItem = {
  id: number;
  name: string;
  sku?: string | null;
  slug?: string | null;
  thumbnail?: string | null;
  status?: string | null;
  category?: string | { name?: string | null } | null;
  price_min?: number | null;
  price_max?: number | null;
  stock_total?: number | null;
  variant_count?: number | null;
  profit_min?: number | null;
  margin_percent?: number | null;
};

type Props = {
  items: AdminListItem[];
  loading: boolean;
  selectedIds: number[];
  onToggleSelect: (id: number, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  sort: string;
  onSortChange: (next: string) => void;
  columnVisibility: { profit: boolean; category: boolean };
  onRefresh: () => void;
};

const IMAGE_DEFAULT_URL = '/locsang-assets/brand-logo.svg';

const formatCurrency = (value: unknown) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

const formatRange = (min?: number | null, max?: number | null) => {
  const a = Number(min);
  const b = Number(max);
  if (!Number.isFinite(a) && !Number.isFinite(b)) return '-';
  if (Number.isFinite(a) && !Number.isFinite(b)) return formatCurrency(a);
  if (!Number.isFinite(a) && Number.isFinite(b)) return formatCurrency(b);
  if (a === b) return formatCurrency(a);
  return `${formatCurrency(a)} - ${formatCurrency(b)}`;
};

const getCategoryLabel = (category: AdminListItem['category']) => {
  if (!category) return '-';
  if (typeof category === 'string') return category;
  return typeof category.name === 'string' && category.name.trim() ? category.name : '-';
};

const StatusPill = ({ value }: { value?: string | null }) => {
  const v = String(value || '').toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: 'Đang bán', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    draft: { label: 'Nháp', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' },
    discontinued: { label: 'Ngừng bán', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    inactive: { label: 'Ngừng bán', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  };
  const def = map[v] || { label: value || '-', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${def.cls}`}>{def.label}</span>;
};

const StockCell = ({ total }: { total?: number | null }) => {
  const t = Number(total ?? 0);
  const cls = t <= 0 ? 'text-red-600' : t <= 5 ? 'text-amber-600' : 'text-emerald-700 dark:text-emerald-300';
  const label = t <= 0 ? 'Hết hàng' : t <= 5 ? `Sắp hết (${t})` : `${t}`;
  return <div className={`text-sm font-semibold ${cls}`}>{label}</div>;
};

const sortOptions = [
  { value: 'created_desc', label: 'Mới nhất' },
  { value: 'created_asc', label: 'Cũ nhất' },
  { value: 'name_asc', label: 'Tên A-Z' },
  { value: 'name_desc', label: 'Tên Z-A' },
  { value: 'price_desc', label: 'Giá cao-thấp' },
  { value: 'price_asc', label: 'Giá thấp-cao' },
  { value: 'stock_desc', label: 'Tồn kho cao-thấp' },
  { value: 'stock_asc', label: 'Tồn kho thấp-cao' },
  { value: 'updated_desc', label: 'Cập nhật gần đây' },
];

const ProductsTable = ({
  items,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  sort,
  onSortChange,
  columnVisibility,
  onRefresh,
}: Props) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusBusy, setStatusBusy] = useState<Record<number, boolean>>({});
  const [quickEdit, setQuickEdit] = useState<{ open: boolean; item: AdminListItem | null; saving: boolean }>({
    open: false,
    item: null,
    saving: false,
  });

  const allSelected = useMemo(() => {
    if (!items?.length) return false;
    return items.every((p) => selectedIds.includes(p.id));
  }, [items, selectedIds]);

  const handleAuthOrToast = (error: unknown, fallbackMessage: string) => {
    const parsed = parseApiError(error);
    if (parsed?.status === 401) {
      showToast('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 'error', 5000);
      logout();
      const current = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/admin/login?redirect=${encodeURIComponent(current)}`;
      return true;
    }
    showToast(parsed?.message || fallbackMessage, 'error', 7000);
    return false;
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
    setDeletingId(id);
    try {
      await productService.deleteProduct(id);
      showToast('Đã xóa sản phẩm', 'success');
      onRefresh();
    } catch (error) {
      handleAuthOrToast(error, 'Không xóa được sản phẩm');
    } finally {
      setDeletingId(null);
    }
  };

  const updateStatusInline = async (id: number, nextStatus: string) => {
    setStatusBusy((p) => ({ ...p, [id]: true }));
    try {
      await productService.updateProductPartial(id, { status: nextStatus });
      showToast('Đã cập nhật trạng thái', 'success');
      onRefresh();
    } catch (error) {
      handleAuthOrToast(error, 'Không cập nhật được trạng thái');
    } finally {
      setStatusBusy((p) => ({ ...p, [id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-3 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="mb-3 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
      <div className="flex flex-col gap-2 bg-gray-50 px-4 py-3 dark:bg-gray-950 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={allSelected} onChange={(e) => onToggleSelectAll(e.target.checked)} />
          Chọn tất cả
          {selectedIds.length > 0 && <span className="font-semibold text-gray-900 dark:text-gray-100">({selectedIds.length} đã chọn)</span>}
        </label>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600 dark:text-gray-300">Sắp xếp</div>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"> </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Sản phẩm</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Giá</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tồn kho</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Biến thể</th>
              {columnVisibility.profit && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Lợi nhuận</th>}
              {columnVisibility.category && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Danh mục</th>}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Trạng thái</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-950/40">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={(e) => onToggleSelect(p.id, e.target.checked)} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/product/${p.id}`)}
                      className="h-12 w-12 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
                      title="Xem chi tiết sản phẩm"
                    >
                      <img src={p.thumbnail || IMAGE_DEFAULT_URL} alt={p.name} className="h-full w-full object-cover" />
                    </button>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/product/${p.id}`)}
                        className="truncate font-semibold text-gray-900 hover:text-rose-600 dark:text-gray-100"
                      >
                        {p.name}
                      </button>
                      <div className="truncate text-xs text-gray-500">SKU: {p.sku || '-'} | Slug: {p.slug || '-'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{formatRange(p.price_min, p.price_max)}</td>
                <td className="px-4 py-3">
                  <StockCell total={p.stock_total} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{Number(p.variant_count ?? 0)}</td>
                {columnVisibility.profit && (
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                    <div className="font-semibold">{formatCurrency(p.profit_min)}</div>
                    {Number.isFinite(Number(p.margin_percent)) && <div className="text-xs text-gray-500">Margin: {Number(p.margin_percent).toFixed(1)}%</div>}
                  </td>
                )}
                {columnVisibility.category && <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{getCategoryLabel(p.category)}</td>}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StatusPill value={p.status} />
                    <select
                      value={String(p.status || 'active').toLowerCase()}
                      disabled={Boolean(statusBusy[p.id])}
                      onChange={(e) => updateStatusInline(p.id, e.target.value)}
                      className="rounded-xl border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    >
                      <option value="active">Đang bán</option>
                      <option value="draft">Nháp</option>
                      <option value="discontinued">Ngừng bán</option>
                    </select>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setQuickEdit({ open: true, item: p, saving: false })} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold dark:border-gray-700">
                      Sửa nhanh
                    </button>
                    <button type="button" onClick={() => navigate(`/admin/product/update/${p.id}`)} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold dark:border-gray-700">
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {deletingId === p.id ? 'Đang xóa...' : 'Xóa'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900 md:hidden">
        {items.map((p) => (
          <div key={p.id} className="p-4">
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={(e) => onToggleSelect(p.id, e.target.checked)} className="mt-1" />
              <button type="button" onClick={() => navigate(`/admin/product/${p.id}`)} className="h-16 w-16 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                <img src={p.thumbnail || IMAGE_DEFAULT_URL} alt={p.name} className="h-full w-full object-cover" />
              </button>
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => navigate(`/admin/product/${p.id}`)} className="truncate font-semibold text-gray-900 hover:text-rose-600 dark:text-gray-100">
                  {p.name}
                </button>
                <div className="truncate text-xs text-gray-500">SKU: {p.sku || '-'} | Slug: {p.slug || '-'}</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatRange(p.price_min, p.price_max)}</div>
                  <StatusPill value={p.status} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <StockCell total={p.stock_total} />
                  <div className="text-sm text-gray-700 dark:text-gray-200">Biến thể: {Number(p.variant_count ?? 0)}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setQuickEdit({ open: true, item: p, saving: false })} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold dark:border-gray-700">
                    Sửa nhanh
                  </button>
                  <button type="button" onClick={() => navigate(`/admin/product/update/${p.id}`)} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold dark:border-gray-700">
                    Sửa
                  </button>
                  <button type="button" onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                    {deletingId === p.id ? 'Đang xóa...' : 'Xóa'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <QuickEditModal
        open={quickEdit.open}
        productName={quickEdit.item?.name || ''}
        saving={quickEdit.saving}
        initial={{
          price: quickEdit.item?.price_min !== undefined && quickEdit.item?.price_min !== null ? String(quickEdit.item.price_min) : undefined,
          stock: quickEdit.item?.stock_total !== undefined && quickEdit.item?.stock_total !== null ? String(quickEdit.item.stock_total) : undefined,
          status: (String(quickEdit.item?.status || 'draft').toLowerCase() as any) || 'draft',
        }}
        onClose={() => setQuickEdit({ open: false, item: null, saving: false })}
        onSave={async (next: QuickEditValues) => {
          if (!quickEdit.item) return;
          setQuickEdit((p) => ({ ...p, saving: true }));
          try {
            await productService.updateProductPartial(quickEdit.item.id, {
              ...(next.price !== undefined ? { price: Number(next.price) } : {}),
              ...(next.stock !== undefined ? { stock: Number(next.stock) } : {}),
              ...(next.status !== undefined ? { status: next.status } : {}),
              ...(next.cost_price !== undefined ? { cost_price: Number(next.cost_price) } : {}),
            });
            showToast('Đã lưu sửa nhanh', 'success');
            setQuickEdit({ open: false, item: null, saving: false });
            onRefresh();
          } catch (error) {
            handleAuthOrToast(error, 'Không lưu được sửa nhanh');
            setQuickEdit((p) => ({ ...p, saving: false }));
          }
        }}
      />
    </div>
  );
};

export default ProductsTable;
