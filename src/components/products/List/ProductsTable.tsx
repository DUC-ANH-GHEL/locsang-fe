import * as React from 'react';

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickEditModal, { QuickEditValues } from './QuickEditModal';
import { productService } from '../../../services/productService';
import { parseApiError } from '../../../utils/apiError';
import { useToast } from '../../Toast';
import { logout } from '../../../services/authService';

type AdminListItem = {
  id: number;
  name: string;
  sku?: string | null;
  slug?: string | null;
  thumbnail?: string | null;
  status?: string | null;
  category?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  stock_total?: number | null;
  variant_count?: number | null;
  profit_min?: number | null;
  margin_percent?: number | null;
  pancake_product_id?: string | null;
  pancake_overview?: {
    pancake_product_id?: string | null;
    display_id?: string | null;
    code?: string | null;
    keyword?: string | null;
    product_type?: string | null;
    supplier?: string | null;
    warehouse?: string | null;
    import_link?: string | null;
    internal_note?: string | null;
    short_note?: string | null;
    description?: string | null;
    seo_slug?: string | null;
    is_hidden?: boolean | null;
    is_commerce?: boolean | null;
    is_sell_negative?: boolean | null;
    is_weighted_pricing?: boolean | null;
    hide_name_when_print?: boolean | null;
    skip_print_when_order?: boolean | null;
    out_of_stock_alert?: boolean | null;
    out_of_stock_alert_value?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
    materials?: string[];
    attributes?: any[];
    promotions?: any[];
    gift_products?: any[];
    categories?: string[];
    tags?: string[];
    raw?: any;
  } | null;
};

type Props = {
  items: AdminListItem[];
  loading: boolean;
  readOnlyCatalog?: boolean;
  selectedIds: number[];
  onToggleSelect: (id: number, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  sort: string;
  onSortChange: (next: string) => void;
  columnVisibility: { profit: boolean; category: boolean };
  onRefresh: () => void;
};

const IMAGE_DEFAULT_URL = 'https://res.cloudinary.com/diwxfpt92/image/upload/v1770981822/logo_d2wmlf.png';

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
  return `${formatCurrency(a)} – ${formatCurrency(b)}`;
};

const getCategoryLabel = (category: unknown) => {
  if (!category) return '-';
  if (typeof category === 'string') return category;
  if (typeof category === 'object' && category !== null) {
    const maybeName = (category as any).name;
    return typeof maybeName === 'string' && maybeName.trim() ? maybeName : '-';
  }
  return '-';
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

const sortOptions: Array<{ value: string; label: string }> = [
  { value: 'created_desc', label: 'Mới nhất' },
  { value: 'created_asc', label: 'Cũ nhất' },
  { value: 'name_asc', label: 'Tên A→Z' },
  { value: 'name_desc', label: 'Tên Z→A' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'stock_desc', label: 'Tồn kho cao → thấp' },
  { value: 'stock_asc', label: 'Tồn kho thấp → cao' },
  { value: 'updated_desc', label: 'Cập nhật gần đây' },
];

const PancakeChip = ({ label, value }: { label: string; value: React.ReactNode }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 px-2 py-0.5 text-[11px] font-medium">
      <span className="opacity-80">{label}:</span>
      <span>{String(value)}</span>
    </span>
  );
};

const ProductsTable = ({
  items,
  loading,
  readOnlyCatalog = false,
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

  const goToDetail = (id: number) => {
    navigate(`/admin/product/${id}`);
  };

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [variantsByProduct, setVariantsByProduct] = useState<Record<number, any[]>>({});
  const [variantsLoading, setVariantsLoading] = useState<Record<number, boolean>>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusBusy, setStatusBusy] = useState<Record<number, boolean>>({});
  const [pancakeInspect, setPancakeInspect] = useState<{ open: boolean; item: AdminListItem | null }>({
    open: false,
    item: null,
  });
  const [quickEdit, setQuickEdit] = useState<{ open: boolean; item: AdminListItem | null; saving: boolean }>({
    open: false,
    item: null,
    saving: false,
  });

  const allSelected = useMemo(() => {
    if (!items?.length) return false;
    return items.every((p) => selectedIds.includes(p.id));
  }, [items, selectedIds]);

  const detailColSpan = 7 + (columnVisibility.profit ? 1 : 0) + (columnVisibility.category ? 1 : 0) + 1 + 1;

  const handleAuthOrToast = (error: any, fallbackMessage: string) => {
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
      onRefresh();
    } catch (error) {
      handleAuthOrToast(error, 'Không xoá được sản phẩm');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpand = async (id: number, variantCount: number) => {
    if (variantCount <= 0) return;
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
    const nextExpanded = !expanded[id];
    if (!nextExpanded) return;
    if (variantsByProduct[id]) return;

    setVariantsLoading((p) => ({ ...p, [id]: true }));
    try {
      const variants = await productService.getProductVariants(id);
      setVariantsByProduct((p) => ({ ...p, [id]: Array.isArray(variants) ? variants : [] }));
    } catch (error) {
      handleAuthOrToast(error, 'Không tải được biến thể');
    } finally {
      setVariantsLoading((p) => ({ ...p, [id]: false }));
    }
  };

  const updateStatusInline = async (id: number, nextStatus: string) => {
    setStatusBusy((p) => ({ ...p, [id]: true }));
    try {
      await productService.updateProductPartial(id, { status: nextStatus });
      showToast('Đã cập nhật trạng thái', 'success');
      onRefresh();
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed?.status === 404) {
        showToast('Backend chưa hỗ trợ cập nhật nhanh', 'error', 7000);
      } else {
        handleAuthOrToast(error, 'Không cập nhật được trạng thái');
      }
    } finally {
      setStatusBusy((p) => ({ ...p, [id]: false }));
    }
  };

  const updateVariantInline = async (variantId: number, patch: any) => {
    try {
      await productService.updateVariantPartial(variantId, patch);
      showToast('Đã cập nhật biến thể', 'success');
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed?.status === 404) {
        showToast('Backend chưa hỗ trợ cập nhật biến thể', 'error', 7000);
      } else {
        handleAuthOrToast(error, 'Không cập nhật được biến thể');
      }
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl mb-3" />
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl mb-3" />
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={allSelected} onChange={(e) => onToggleSelectAll(e.target.checked)} />
          <div className="text-sm text-gray-600 dark:text-gray-300">Chọn tất cả</div>
          {selectedIds.length > 0 && (
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">({selectedIds.length} đã chọn)</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600 dark:text-gray-300">Sắp xếp</div>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
          <thead className="bg-white dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"> </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Sản phẩm</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Giá</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tồn kho</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Biến thể</th>
              {columnVisibility.profit && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Lợi nhuận</th>
              )}
              {columnVisibility.category && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Danh mục</th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Pancake</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Trạng thái</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {items.map((p) => {
              const vCount = Number(p.variant_count ?? 0);
              const isExpanded = Boolean(expanded[p.id]);
              const variants = variantsByProduct[p.id];

              return (
                <React.Fragment key={p.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-950/40">
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={(e) => onToggleSelect(p.id, e.target.checked)}
                        />
                        <button
                          type="button"
                          onClick={() => toggleExpand(p.id, vCount)}
                          disabled={vCount <= 0}
                          className="text-gray-600 dark:text-gray-300 disabled:opacity-30"
                          title={vCount > 0 ? 'Xem biến thể' : 'Không có biến thể'}
                        >
                          {isExpanded ? '▾' : '▸'}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => goToDetail(p.id)}
                          className="h-12 w-12 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
                          title="Xem chi tiết sản phẩm"
                        >
                          <img src={p.thumbnail || IMAGE_DEFAULT_URL} alt={p.name} className="h-full w-full object-cover" />
                        </button>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => goToDetail(p.id)}
                            className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-rose-600"
                            title="Xem chi tiết sản phẩm"
                          >
                            {p.name}
                          </button>
                          <div className="text-xs text-gray-500 truncate">SKU: {p.sku || '-'} • Slug: {p.slug || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {formatRange(p.price_min ?? null, p.price_max ?? null)}
                    </td>
                    <td className="px-4 py-3">
                      <StockCell total={p.stock_total} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{vCount}</td>
                    {columnVisibility.profit && (
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                        <div className="font-semibold">{formatCurrency(p.profit_min)}</div>
                        {Number.isFinite(Number(p.margin_percent)) && (
                          <div className="text-xs text-gray-500">Margin: {Number(p.margin_percent).toFixed(1)}%</div>
                        )}
                      </td>
                    )}
                    {columnVisibility.category && (
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{getCategoryLabel((p as any).category)}</td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                          {p?.pancake_overview?.pancake_product_id || p?.pancake_product_id || '-'}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <PancakeChip label="Display" value={p?.pancake_overview?.display_id} />
                          <PancakeChip label="Code" value={p?.pancake_overview?.code} />
                          <PancakeChip label="Ẩn" value={p?.pancake_overview?.is_hidden ? 'Có' : 'Không'} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusPill value={p.status} />
                        {!readOnlyCatalog && (
                          <select
                            value={String(p.status || 'active').toLowerCase()}
                            disabled={Boolean(statusBusy[p.id])}
                            onChange={(e) => updateStatusInline(p.id, e.target.value)}
                            className="rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                          >
                            <option value="active">Đang bán</option>
                            <option value="draft">Nháp</option>
                            <option value="discontinued">Ngừng bán</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {readOnlyCatalog ? (
                          <span className="text-xs text-blue-600 dark:text-blue-300">Pancake-managed</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setPancakeInspect({ open: true, item: p })}
                              className="rounded-xl border border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300 px-3 py-1.5 text-sm font-semibold"
                            >
                              Pancake
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickEdit({ open: true, item: p, saving: false })}
                              className="rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold"
                            >
                              Quick edit
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/product/update/${p.id}`)}
                              className="rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                              className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
                            >
                              {deletingId === p.id ? 'Đang xoá...' : 'Xoá'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-gray-50 dark:bg-gray-950">
                      <td colSpan={detailColSpan} className="px-4 py-4">
                        {variantsLoading[p.id] && <div className="text-sm text-gray-500">Đang tải biến thể...</div>}
                        {!variantsLoading[p.id] && Array.isArray(variants) && variants.length === 0 && (
                          <div className="text-sm text-gray-500">Không có biến thể</div>
                        )}
                        {!variantsLoading[p.id] && Array.isArray(variants) && variants.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="min-w-full">
                              <thead>
                                <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                                  <th className="py-2 pr-4">SKU</th>
                                  <th className="py-2 pr-4">Tên</th>
                                  <th className="py-2 pr-4">Giá</th>
                                  <th className="py-2 pr-4">Cost</th>
                                  <th className="py-2 pr-4">Tồn</th>
                                  <th className="py-2 pr-4">Pancake</th>
                                  <th className="py-2 pr-4">Hành động</th>
                                </tr>
                              </thead>
                              <tbody className="text-sm">
                                {variants.map((v: any) => (
                                  <VariantRow
                                    key={v.id || `${p.id}-${v.sku}`}
                                    variant={v}
                                    onSave={updateVariantInline}
                                    readOnly={readOnlyCatalog}
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
        {items.map((p) => {
          const vCount = Number(p.variant_count ?? 0);
          return (
            <div key={p.id} className="p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(p.id)}
                  onChange={(e) => onToggleSelect(p.id, e.target.checked)}
                  className="mt-1"
                />
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => goToDetail(p.id)}
                    className="h-full w-full"
                    title="Xem chi tiết sản phẩm"
                  >
                    <img src={p.thumbnail || IMAGE_DEFAULT_URL} alt={p.name} className="h-full w-full object-cover" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => goToDetail(p.id)}
                    className="font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-rose-600"
                    title="Xem chi tiết sản phẩm"
                  >
                    {p.name}
                  </button>
                  <div className="text-xs text-gray-500 truncate">SKU: {p.sku || '-'} • Slug: {p.slug || '-'}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatRange(p.price_min, p.price_max)}</div>
                    <StatusPill value={p.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <PancakeChip label="Pancake" value={p?.pancake_overview?.pancake_product_id || p?.pancake_product_id} />
                    <PancakeChip label="Code" value={p?.pancake_overview?.code} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <StockCell total={p.stock_total} />
                    <div className="text-sm text-gray-700 dark:text-gray-200">Biến thể: {vCount}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {readOnlyCatalog ? (
                      <span className="text-xs text-blue-600 dark:text-blue-300">Pancake-managed</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setPancakeInspect({ open: true, item: p })}
                          className="rounded-xl border border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300 px-3 py-1.5 text-sm font-semibold"
                        >
                          Pancake
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickEdit({ open: true, item: p, saving: false })}
                          className="rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold"
                        >
                          Quick edit
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/product/update/${p.id}`)}
                          className="rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-semibold"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
                        >
                          {deletingId === p.id ? 'Đang xoá...' : 'Xoá'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <QuickEditModal
        open={!readOnlyCatalog && quickEdit.open}
        productName={quickEdit.item?.name || ''}
        saving={quickEdit.saving}
        initial={{
          price:
            quickEdit.item?.price_min !== undefined && quickEdit.item?.price_min !== null
              ? String(quickEdit.item.price_min)
              : undefined,
          stock:
            quickEdit.item?.stock_total !== undefined && quickEdit.item?.stock_total !== null
              ? String(quickEdit.item.stock_total)
              : undefined,
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
            showToast('Đã lưu quick edit', 'success');
            setQuickEdit({ open: false, item: null, saving: false });
            onRefresh();
          } catch (error) {
            handleAuthOrToast(error, 'Không lưu được quick edit');
            setQuickEdit((p) => ({ ...p, saving: false }));
          }
        }}
      />

      {pancakeInspect.open && pancakeInspect.item && (
        <div className="fixed inset-0 z-50 bg-black/50 px-4 py-6 overflow-auto">
          <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Pancake Product Inspector</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {pancakeInspect.item.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPancakeInspect({ open: false, item: null })}
                className="rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500">Pancake Product ID</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {pancakeInspect.item?.pancake_overview?.pancake_product_id || pancakeInspect.item?.pancake_product_id || '-'}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500">Display ID / Code</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {pancakeInspect.item?.pancake_overview?.display_id || '-'} / {pancakeInspect.item?.pancake_overview?.code || '-'}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500">Keyword / Loại sản phẩm</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {pancakeInspect.item?.pancake_overview?.keyword || '-'} / {pancakeInspect.item?.pancake_overview?.product_type || '-'}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500">SEO slug (web)</div>
                <div className="font-semibold text-emerald-700 dark:text-emerald-300 break-all">
                  {pancakeInspect.item?.pancake_overview?.seo_slug || '-'}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500">Category từ Pancake</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {(pancakeInspect.item?.pancake_overview?.categories || []).join(', ') || '-'}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500">Tags từ Pancake</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {(pancakeInspect.item?.pancake_overview?.tags || []).join(', ') || '-'}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500">Kho thao tác / Nhà cung cấp</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {pancakeInspect.item?.pancake_overview?.warehouse || '-'} / {pancakeInspect.item?.pancake_overview?.supplier || '-'}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-gray-500">Link nhập hàng</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100 break-all">
                  {pancakeInspect.item?.pancake_overview?.import_link || '-'}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 md:col-span-2">
                <div className="text-gray-500">Mô tả / Ghi chú nội bộ</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {pancakeInspect.item?.pancake_overview?.description || pancakeInspect.item?.pancake_overview?.short_note || '-'}
                </div>
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {pancakeInspect.item?.pancake_overview?.internal_note || ''}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Thiết lập vận hành</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div>Ẩn sản phẩm: <span className="font-semibold">{pancakeInspect.item?.pancake_overview?.is_hidden ? 'Có' : 'Không'}</span></div>
                <div>Bán tồn âm: <span className="font-semibold">{pancakeInspect.item?.pancake_overview?.is_sell_negative ? 'Có' : 'Không'}</span></div>
                <div>Tính theo cân nặng: <span className="font-semibold">{pancakeInspect.item?.pancake_overview?.is_weighted_pricing ? 'Có' : 'Không'}</span></div>
                <div>Ẩn tên khi in: <span className="font-semibold">{pancakeInspect.item?.pancake_overview?.hide_name_when_print ? 'Có' : 'Không'}</span></div>
                <div>Không in khi in đơn: <span className="font-semibold">{pancakeInspect.item?.pancake_overview?.skip_print_when_order ? 'Có' : 'Không'}</span></div>
                <div>Cảnh báo tồn: <span className="font-semibold">{pancakeInspect.item?.pancake_overview?.out_of_stock_alert ? 'Có' : 'Không'} ({pancakeInspect.item?.pancake_overview?.out_of_stock_alert_value ?? '-'})</span></div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Chất liệu / Thuộc tính / Khuyến mãi</div>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                <div><span className="text-gray-500">Chất liệu:</span> {(pancakeInspect.item?.pancake_overview?.materials || []).join(', ') || '-'}</div>
                <div><span className="text-gray-500">Thuộc tính:</span> {(pancakeInspect.item?.pancake_overview?.attributes || []).length || 0} mục</div>
                <div><span className="text-gray-500">SP khuyến mãi:</span> {(pancakeInspect.item?.pancake_overview?.promotions || []).length || 0} mục</div>
                <div><span className="text-gray-500">SP tặng kèm:</span> {(pancakeInspect.item?.pancake_overview?.gift_products || []).length || 0} mục</div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Raw Pancake Payload</div>
              <pre className="text-xs whitespace-pre-wrap break-all text-gray-700 dark:text-gray-200 max-h-[420px] overflow-auto bg-gray-50 dark:bg-gray-950 rounded-lg p-3">
                {JSON.stringify(pancakeInspect.item?.pancake_overview?.raw || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VariantRow = ({
  variant,
  onSave,
  readOnly = false,
}: {
  variant: any;
  onSave: (variantId: number, patch: any) => Promise<void>;
  readOnly?: boolean;
}) => {
  const [price, setPrice] = useState(String(variant?.price ?? ''));
  const [cost, setCost] = useState(String(variant?.cost_price ?? variant?.cost ?? ''));
  const [stock, setStock] = useState(String(variant?.stock ?? variant?.quantity ?? ''));
  const [busy, setBusy] = useState(false);

  const doSave = async () => {
    if (!variant?.id) return;
    setBusy(true);
    try {
      await onSave(Number(variant.id), {
        ...(price !== '' ? { price: Number(price) } : {}),
        ...(cost !== '' ? { cost_price: Number(cost) } : {}),
        ...(stock !== '' ? { stock: Number(stock) } : {}),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-t border-gray-200/70 dark:border-gray-800">
      <td className="py-2 pr-4">{variant?.sku || '-'}</td>
      <td className="py-2 pr-4">{variant?.name || variant?.title || '-'}</td>
      <td className="py-2 pr-4">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={readOnly}
          inputMode="numeric"
          className="w-28 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
        />
      </td>
      <td className="py-2 pr-4">
        <input
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          disabled={readOnly}
          inputMode="numeric"
          className="w-28 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
        />
      </td>
      <td className="py-2 pr-4">
        <input
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          disabled={readOnly}
          inputMode="numeric"
          className="w-24 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
        />
      </td>
      <td className="py-2 pr-4 text-xs text-gray-700 dark:text-gray-300">
        <div className="space-y-1">
          <div>ID: {variant?.pancake_overview?.pancake_variation_id || variant?.pancake_variation_id || '-'}</div>
          <div>Display: {variant?.pancake_overview?.display_id || '-'}</div>
          <div>Barcode: {variant?.pancake_overview?.barcode || '-'}</div>
        </div>
      </td>
      <td className="py-2 pr-4">
        <button
          type="button"
          onClick={doSave}
          disabled={busy || readOnly}
          className="rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-1 text-sm font-semibold disabled:opacity-60"
        >
          {readOnly ? 'Read-only' : busy ? 'Đang lưu...' : 'Lưu'}
        </button>
      </td>
    </tr>
  );
};

export default ProductsTable;
