import { useEffect, useMemo, useState } from 'react';
import { Eye, PackageOpen, PencilLine, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../../services/authService';
import { productService } from '../../../services/productService';
import { parseApiError } from '../../../utils/apiError';
import { useToast } from '../../Toast';

type ProductStatus = 'active' | 'draft' | 'discontinued';

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
};

type Props = {
  items: AdminListItem[];
  loading: boolean;
  selectedIds: number[];
  onToggleSelect: (id: number, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  sort: string;
  onSortChange: (next: string) => void;
  onRefresh: () => void | Promise<void>;
};

const IMAGE_DEFAULT_URL = '/favicon.svg';

const statusOptions: Array<{ value: ProductStatus; label: string }> = [
  { value: 'active', label: 'Đang bán' },
  { value: 'draft', label: 'Nháp' },
  { value: 'discontinued', label: 'Ngừng bán' },
];

const statusMeta: Record<string, { label: string; cls: string }> = {
  active: {
    label: 'Đang bán',
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20',
  },
  draft: {
    label: 'Nháp',
    cls: 'bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20',
  },
  discontinued: {
    label: 'Ngừng bán',
    cls: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
  },
  inactive: {
    label: 'Ngừng bán',
    cls: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
  },
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

const normalizeStatus = (value?: string | null): ProductStatus => {
  const current = String(value || '').toLowerCase();
  if (current === 'active' || current === 'draft' || current === 'discontinued') return current;
  return current === 'inactive' ? 'discontinued' : 'draft';
};

const formatCurrency = (value: unknown) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
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
  if (!category) return 'Chưa phân loại';
  if (typeof category === 'string') return category || 'Chưa phân loại';
  return typeof category.name === 'string' && category.name.trim() ? category.name : 'Chưa phân loại';
};

const StatusPill = ({ value }: { value?: string | null }) => {
  const meta = statusMeta[String(value || '').toLowerCase()] || statusMeta.draft;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ring-1 ${meta.cls}`}>{meta.label}</span>;
};

const StockBadge = ({ total }: { total?: number | null }) => {
  const stock = Number(total ?? 0);
  const cls =
    stock <= 0
      ? 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20'
      : stock <= 5
        ? 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20'
        : 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20';
  const label = stock <= 0 ? 'Hết hàng' : stock <= 5 ? `Sắp hết: ${stock}` : `${stock} còn`;
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${cls}`}>{label}</span>;
};

const IconButton = ({
  label,
  children,
  onClick,
  danger,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className={
      'inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black transition disabled:opacity-50 ' +
      (danger
        ? 'border-red-100 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
        : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-200')
    }
  >
    {children}
  </button>
);

const ProductIdentity = ({ product }: { product: AdminListItem }) => {
  const navigate = useNavigate();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <button
        type="button"
        onClick={() => navigate(`/admin/product/${product.id}`)}
        className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
      >
        <img src={product.thumbnail || IMAGE_DEFAULT_URL} alt={product.name} className="h-full w-full object-cover" />
      </button>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => navigate(`/admin/product/${product.id}`)}
          className="block max-w-[28rem] truncate text-left text-sm font-black text-slate-950 hover:text-rose-700 dark:text-white dark:hover:text-rose-200"
        >
          {product.name}
        </button>
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>SKU: {product.sku || '-'}</span>
          <span>Slug: {product.slug || '-'}</span>
        </div>
        <div className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">{getCategoryLabel(product.category)}</div>
      </div>
    </div>
  );
};

const ProductsTable = ({
  items,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  sort,
  onSortChange,
  onRefresh,
}: Props) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusBusy, setStatusBusy] = useState<Record<number, boolean>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<number, ProductStatus>>({});

  const allSelected = useMemo(() => {
    if (!items?.length) return false;
    return items.every((product) => selectedIds.includes(product.id));
  }, [items, selectedIds]);

  useEffect(() => {
    setStatusOverrides((prev) => {
      const next = { ...prev };
      let changed = false;
      items.forEach((item) => {
        if (next[item.id] && normalizeStatus(item.status) === next[item.id]) {
          delete next[item.id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [items]);

  const currentStatus = (product: AdminListItem) => statusOverrides[product.id] || normalizeStatus(product.status);

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
    if (!window.confirm('Bạn có chắc chắn muốn xoá sản phẩm này?')) return;
    setDeletingId(id);
    try {
      await productService.deleteProduct(id);
      showToast('Đã xoá sản phẩm', 'success');
      await onRefresh();
    } catch (error) {
      handleAuthOrToast(error, 'Không xoá được sản phẩm');
    } finally {
      setDeletingId(null);
    }
  };

  const updateStatusInline = async (id: number, nextStatus: ProductStatus) => {
    setStatusBusy((prev) => ({ ...prev, [id]: true }));
    try {
      await productService.updateProductPartial(id, { status: nextStatus });
      setStatusOverrides((prev) => ({ ...prev, [id]: nextStatus }));
      showToast('Đã cập nhật trạng thái', 'success');
      await onRefresh();
    } catch (error) {
      handleAuthOrToast(error, 'Không cập nhật được trạng thái');
    } finally {
      setStatusBusy((prev) => ({ ...prev, [id]: false }));
    }
  };

  const StatusControl = ({ product }: { product: AdminListItem }) => {
    const value = currentStatus(product);
    return (
      <div className="flex flex-col items-start gap-2">
        <StatusPill value={value} />
        <select
          value={value}
          disabled={Boolean(statusBusy[product.id])}
          onChange={(event) => updateStatusInline(product.id, event.target.value as ProductStatus)}
          className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={allSelected} onChange={(event) => onToggleSelectAll(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-rose-600" />
          Chọn tất cả
          {selectedIds.length > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-black text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{selectedIds.length} đã chọn</span>}
        </label>

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Sắp xếp</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden xl:block">
        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
          <thead className="bg-white dark:bg-slate-900">
            <tr>
              <th className="w-10 px-4 py-3 text-left" />
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-400">Sản phẩm</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-400">Giá bán</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-400">Kho</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-400">Trạng thái</th>
              <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-400">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((product) => (
              <tr key={product.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-950/50">
                <td className="px-4 py-4 align-middle">
                  <input type="checkbox" checked={selectedIds.includes(product.id)} onChange={(event) => onToggleSelect(product.id, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-rose-600" />
                </td>
                <td className="px-4 py-4">
                  <ProductIdentity product={product} />
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-black text-slate-950 dark:text-white">{formatRange(product.price_min, product.price_max)}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {Number(product.price_min) !== Number(product.price_max) ? 'Nhiều mức giá theo biến thể' : 'Giá hiển thị trên storefront'}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-2">
                    <StockBadge total={product.stock_total} />
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{Number(product.variant_count ?? 0)} biến thể</div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <StatusControl product={product} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <IconButton label="Xem chi tiết" onClick={() => navigate(`/admin/product/${product.id}`)}>
                      <Eye size={17} />
                    </IconButton>
                    <IconButton label="Sửa sản phẩm" onClick={() => navigate(`/admin/product/update/${product.id}`)}>
                      <PencilLine size={17} />
                    </IconButton>
                    <IconButton label="Xoá" onClick={() => handleDelete(product.id)} danger disabled={deletingId === product.id}>
                      <Trash2 size={17} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 xl:hidden">
        {items.map((product) => (
          <article key={product.id} className="p-4">
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selectedIds.includes(product.id)} onChange={(event) => onToggleSelect(product.id, event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600" />
              <button type="button" onClick={() => navigate(`/admin/product/${product.id}`)} className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                <img src={product.thumbnail || IMAGE_DEFAULT_URL} alt={product.name} className="h-full w-full object-cover" />
              </button>
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => navigate(`/admin/product/${product.id}`)} className="text-left text-sm font-black leading-snug text-slate-950 dark:text-white">
                  {product.name}
                </button>
                <div className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">SKU: {product.sku || '-'} | Slug: {product.slug || '-'}</div>
                <div className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">{getCategoryLabel(product.category)}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Giá bán</div>
                <div className="mt-1 text-sm font-black text-slate-950 dark:text-white">{formatRange(product.price_min, product.price_max)}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Kho</div>
                <div className="mt-1">
                  <StockBadge total={product.stock_total} />
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Biến thể</div>
                <div className="mt-1 text-sm font-black text-slate-950 dark:text-white">{Number(product.variant_count ?? 0)}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
                <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Trạng thái</div>
                <div className="mt-1">
                  <StatusControl product={product} />
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2">
              <button type="button" onClick={() => navigate(`/admin/product/${product.id}`)} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <Eye size={16} />
                Chi tiết
              </button>
              <button type="button" onClick={() => navigate(`/admin/product/update/${product.id}`)} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                <PencilLine size={16} />
                Sửa
              </button>
              <button type="button" onClick={() => handleDelete(product.id)} disabled={deletingId === product.id} className="inline-flex h-10 w-12 items-center justify-center rounded-2xl bg-red-600 text-white disabled:opacity-50">
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center text-slate-500 dark:text-slate-400">
            <PackageOpen size={30} />
            <div className="mt-2 text-sm font-bold">Không có sản phẩm phù hợp.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsTable;
