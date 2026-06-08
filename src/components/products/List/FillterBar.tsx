import * as React from 'react';

import { useEffect, useMemo, useState } from 'react';
import { useDebounce } from '../../../hooks/useDebounce';

export type ProductListFilters = {
  search: string;
  status: 'all' | 'active' | 'draft' | 'discontinued';
  category_id: string;
  brand: string;
  has_variants: 'all' | 'true' | 'false';
  stock_status: 'all' | 'in_stock' | 'low' | 'out';
  min_price: string;
  max_price: string;
  has_affiliate: 'all' | 'true' | 'false';
  featured: 'all' | 'true' | 'false';
};

export type CategoryOption = { id: number; name: string };
export type SavedFilter = { name: string; filters: ProductListFilters };

type Props = {
  filters: ProductListFilters;
  onChange: (patch: Partial<ProductListFilters>) => void;
  onReset: () => void;
  categories: CategoryOption[];
  activeTab: string;
  onTabChange: (key: string) => void;
  columnVisibility: { profit: boolean; category: boolean };
  onColumnVisibilityChange: (next: { profit: boolean; category: boolean }) => void;
  savedFilters: SavedFilter[];
  onSaveCurrentFilter: () => void;
  onApplySavedFilter: (index: number) => void;
};

const tabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang bán' },
  { key: 'draft', label: 'Nháp' },
  { key: 'out', label: 'Hết hàng' },
  { key: 'featured', label: 'Nổi bật' },
];

const FillterBar = ({
  filters,
  onChange,
  onReset,
  categories,
  activeTab,
  onTabChange,
  columnVisibility,
  onColumnVisibilityChange,
  savedFilters,
  onSaveCurrentFilter,
  onApplySavedFilter,
}: Props) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchDraft, setSearchDraft] = useState(filters.search || '');
  const debouncedSearch = useDebounce(searchDraft, 300);

  useEffect(() => {
    setSearchDraft(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    onChange({ search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const canReset = useMemo(() => {
    return Object.entries(filters).some(([k, v]) => {
      if (k === 'search') return String(v || '').trim().length > 0;
      return String(v || '').trim().length > 0 && v !== 'all';
    });
  }, [filters]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex-1">
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Tìm theo tên, SKU, slug..."
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200"
          >
            Bộ lọc nâng cao
          </button>

          {canReset && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onTabChange(t.key)}
            className={
              'rounded-xl px-4 py-2 text-sm font-semibold border transition ' +
              (activeTab === t.key
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {showAdvanced && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Trạng thái</label>
              <select
                value={filters.status}
                onChange={(e) => onChange({ status: e.target.value as ProductListFilters['status'] })}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang bán</option>
                <option value="draft">Nháp</option>
                <option value="discontinued">Ngừng bán</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Danh mục</label>
              <select
                value={filters.category_id}
                onChange={(e) => onChange({ category_id: e.target.value })}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              >
                <option value="">Tất cả</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Brand</label>
              <input
                value={filters.brand}
                onChange={(e) => onChange({ brand: e.target.value })}
                placeholder="Brand"
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Có biến thể</label>
              <select
                value={filters.has_variants}
                onChange={(e) => onChange({ has_variants: e.target.value as ProductListFilters['has_variants'] })}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              >
                <option value="all">Tất cả</option>
                <option value="true">Có</option>
                <option value="false">Không</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Tồn kho</label>
              <select
                value={filters.stock_status}
                onChange={(e) => onChange({ stock_status: e.target.value as ProductListFilters['stock_status'] })}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              >
                <option value="all">Tất cả</option>
                <option value="in_stock">Còn hàng</option>
                <option value="low">Sắp hết</option>
                <option value="out">Hết hàng</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Affiliate</label>
              <select
                value={filters.has_affiliate}
                onChange={(e) => onChange({ has_affiliate: e.target.value as ProductListFilters['has_affiliate'] })}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              >
                <option value="all">Tất cả</option>
                <option value="true">Có</option>
                <option value="false">Không</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Giá từ</label>
              <input
                value={filters.min_price}
                onChange={(e) => onChange({ min_price: e.target.value })}
                inputMode="numeric"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Giá đến</label>
              <input
                value={filters.max_price}
                onChange={(e) => onChange({ max_price: e.target.value })}
                inputMode="numeric"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Nổi bật</label>
              <select
                value={filters.featured}
                onChange={(e) => onChange({ featured: e.target.value as ProductListFilters['featured'] })}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              >
                <option value="all">Tất cả</option>
                <option value="true">Nổi bật</option>
                <option value="false">Không</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={columnVisibility.category}
                  onChange={(e) => onColumnVisibilityChange({ ...columnVisibility, category: e.target.checked })}
                />
                Hiện cột danh mục
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={columnVisibility.profit}
                  onChange={(e) => onColumnVisibilityChange({ ...columnVisibility, profit: e.target.checked })}
                />
                Hiện cột lợi nhuận
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold"
                onClick={onSaveCurrentFilter}
              >
                Lưu filter
              </button>

              <select
                value=""
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  if (!Number.isFinite(idx)) return;
                  onApplySavedFilter(idx);
                  e.target.value = '';
                }}
                className="rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              >
                <option value="">Áp dụng filter đã lưu</option>
                {savedFilters.map((sf, idx) => (
                  <option key={`${sf.name}-${idx}`} value={String(idx)}>
                    {sf.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FillterBar;
