import { useEffect, useMemo, useState } from 'react';
import { Filter, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
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
};

export type CategoryOption = { id: number; name: string };

type Props = {
  filters: ProductListFilters;
  onChange: (patch: Partial<ProductListFilters>) => void;
  onReset: () => void;
  categories: CategoryOption[];
  activeTab: string;
  onTabChange: (key: string) => void;
};

const tabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang bán' },
  { key: 'draft', label: 'Nháp' },
  { key: 'out', label: 'Hết hàng' },
];

const selectClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

const labelClass = 'mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400';

const FillterBar = ({ filters, onChange, onReset, categories, activeTab, onTabChange }: Props) => {
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

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'search') return String(value || '').trim().length > 0;
      return String(value || '').trim().length > 0 && value !== 'all';
    }).length;
  }, [filters]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative min-w-0 flex-1">
          <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Tìm theo tên, SKU hoặc slug..."
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900 sm:flex-none"
          >
            <SlidersHorizontal size={18} />
            Bộ lọc
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <RotateCcw size={17} />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={
              'h-10 shrink-0 rounded-2xl border px-4 text-sm font-black transition ' +
              (activeTab === tab.key
                ? 'border-rose-600 bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.20)]'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900')
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showAdvanced && (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
            <Filter size={18} className="text-rose-600" />
            Bộ lọc nâng cao
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className={labelClass}>Trạng thái</label>
              <select value={filters.status} onChange={(event) => onChange({ status: event.target.value as ProductListFilters['status'] })} className={selectClass}>
                <option value="all">Tất cả</option>
                <option value="active">Đang bán</option>
                <option value="draft">Nháp</option>
                <option value="discontinued">Ngừng bán</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Danh mục</label>
              <select value={filters.category_id} onChange={(event) => onChange({ category_id: event.target.value })} className={selectClass}>
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Tồn kho</label>
              <select value={filters.stock_status} onChange={(event) => onChange({ stock_status: event.target.value as ProductListFilters['stock_status'] })} className={selectClass}>
                <option value="all">Tất cả</option>
                <option value="in_stock">Còn hàng</option>
                <option value="low">Sắp hết</option>
                <option value="out">Hết hàng</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Biến thể</label>
              <select value={filters.has_variants} onChange={(event) => onChange({ has_variants: event.target.value as ProductListFilters['has_variants'] })} className={selectClass}>
                <option value="all">Tất cả</option>
                <option value="true">Có biến thể</option>
                <option value="false">Không biến thể</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Thương hiệu</label>
              <input value={filters.brand} onChange={(event) => onChange({ brand: event.target.value })} placeholder="VD: Yanmar" className={selectClass} />
            </div>

            <div>
              <label className={labelClass}>Giá từ</label>
              <input value={filters.min_price} onChange={(event) => onChange({ min_price: event.target.value })} inputMode="numeric" className={selectClass} />
            </div>

            <div>
              <label className={labelClass}>Giá đến</label>
              <input value={filters.max_price} onChange={(event) => onChange({ max_price: event.target.value })} inputMode="numeric" className={selectClass} />
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default FillterBar;
