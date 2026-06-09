import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Layers3, Package, Plus } from 'lucide-react';
import ProductsTable from '../../../components/products/List/ProductsTable';
import FilterBar from '../../../components/products/List/FillterBar';
import { productService } from '../../../services/productService';
import { useToast } from '../../../components/Toast';
import { parseApiError } from '../../../utils/apiError';
import { logout } from '../../../services/authService';
import { getCategories } from '../../../services/categoryService';

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
  category_id: '',
  brand: '',
  has_variants: 'all',
  stock_status: 'all',
  min_price: '',
  max_price: '',
  has_affiliate: 'all',
  featured: 'all',
};

const Products = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [sort, setSort] = useState('created_desc');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('active');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkAffiliate, setBulkAffiliate] = useState('');

  const totalPages = useMemo(() => {
    const total = Number(pagination.total || 0);
    const limit = Number(pagination.limit || 20);
    return Math.max(1, Math.ceil(total / limit));
  }, [pagination.total, pagination.limit]);

  const headerTotalText = useMemo(
    () => Number(pagination.total || 0).toLocaleString('vi-VN'),
    [pagination.total],
  );

  const currentPageItemsCount = items?.length ?? 0;

  const pageSummary = useMemo(() => {
    const active = items.filter((item) => String(item.status || '').toLowerCase() === 'active').length;
    const lowStock = items.filter((item) => Number(item.stock_total ?? 0) > 0 && Number(item.stock_total ?? 0) <= 5).length;
    const outStock = items.filter((item) => Number(item.stock_total ?? 0) <= 0).length;
    const variants = items.reduce((sum, item) => sum + Number(item.variant_count ?? 0), 0);

    return [
      { label: 'Đang bán', value: active, icon: CheckCircle2, tone: 'emerald' },
      { label: 'Sắp hết', value: lowStock, icon: AlertTriangle, tone: 'amber' },
      { label: 'Hết hàng', value: outStock, icon: AlertTriangle, tone: 'rose' },
      { label: 'Biến thể', value: variants, icon: Layers3, tone: 'slate' },
    ];
  }, [items]);

  const visiblePages = useMemo(() => {
    const page = pagination.page;
    const out = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i += 1) out.push(i);
    return out;
  }, [pagination.page, totalPages]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getCategories();
        const list = Array.isArray(data) ? data : [];
        setCategories(list.map((category) => ({ id: Number(category.id), name: String(category.name ?? '') })));
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  const fetchAdminProducts = async () => {
    setLoading(true);
    try {
      const query = {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
        status: filters.status,
        category_id: filters.category_id ? Number(filters.category_id) : undefined,
        brand: filters.brand,
        has_variants: filters.has_variants === 'all' ? 'all' : filters.has_variants === 'true',
        stock_status: filters.stock_status,
        min_price: filters.min_price,
        max_price: filters.max_price,
        has_affiliate: filters.has_affiliate === 'all' ? 'all' : filters.has_affiliate === 'true',
        featured: filters.featured === 'all' ? 'all' : filters.featured === 'true',
        sort,
      };
      const res = await productService.getAdminProducts(query);
      setItems(Array.isArray(res?.data) ? res.data : []);
      setPagination((prev) => ({
        ...prev,
        page: Number(res?.pagination?.page ?? prev.page),
        limit: Number(res?.pagination?.limit ?? prev.limit),
        total: Number(res?.pagination?.total ?? 0),
      }));
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed?.status === 401) {
        showToast('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 'error', 5000);
        logout();
        const current = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/admin/login?redirect=${encodeURIComponent(current)}`;
        return;
      }
      showToast(parsed?.message || 'Không tải được danh sách sản phẩm', 'error', 6000);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page, pagination.limit, sort]);

  const setFilterPatch = (patch) => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const resetFilters = () => {
    setActiveTab('all');
    setSelectedIds([]);
    setSort('created_desc');
    setPagination((prev) => ({ ...prev, page: 1, limit: 20 }));
    setFilters(DEFAULT_FILTERS);
  };

  const applyTab = (key) => {
    setActiveTab(key);
    if (key === 'all') {
      setFilterPatch({ status: 'all', stock_status: 'all', featured: 'all' });
      return;
    }
    if (key === 'active') {
      setFilterPatch({ status: 'active', stock_status: 'all', featured: 'all' });
      return;
    }
    if (key === 'draft') {
      setFilterPatch({ status: 'draft', stock_status: 'all', featured: 'all' });
      return;
    }
    if (key === 'out') {
      setFilterPatch({ stock_status: 'out', status: 'all', featured: 'all' });
      return;
    }
    if (key === 'featured') {
      setFilterPatch({ featured: 'true', status: 'all' });
    }
  };

  const onToggleSelect = (id, checked) => {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (checked) set.add(id);
      else set.delete(id);
      return Array.from(set);
    });
  };

  const onToggleSelectAll = (checked) => {
    if (checked) setSelectedIds(items.map((item) => item.id));
    else setSelectedIds([]);
  };

  const bulkUpdate = async (action, data) => {
    try {
      await productService.bulkUpdateProducts({ ids: selectedIds, action, data });
      showToast('Cập nhật hàng loạt thành công', 'success');
      setSelectedIds([]);
      fetchAdminProducts();
    } catch (error) {
      const parsed = parseApiError(error);
      showToast(parsed?.message || 'Bulk update thất bại', 'error', 7000);
    }
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
              <Package size={14} />
              Catalog
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">Quản lý sản phẩm</h1>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Tổng {headerTotalText} sản phẩm. Theo dõi giá, tồn kho, biến thể và trạng thái bán hàng trong một màn.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[30rem]">
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
                  <div className="mt-2 text-2xl font-black leading-none">{item.value}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/admin/products/create')}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(225,29,72,0.22)] transition hover:bg-rose-700 sm:w-auto"
            >
              <Plus size={18} />
              Tạo sản phẩm
            </button>
          </div>

          <FilterBar
            filters={filters}
            onChange={setFilterPatch}
            onReset={resetFilters}
            categories={categories}
            activeTab={activeTab}
            onTabChange={applyTab}
          />

          <ProductsTable
            items={items}
            loading={loading}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onToggleSelectAll={onToggleSelectAll}
            sort={sort}
            onSortChange={(next) => {
              setPagination((prev) => ({ ...prev, page: 1 }));
              setSort(next);
            }}
            onRefresh={fetchAdminProducts}
          />

          {!loading && items.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-14 text-center dark:border-slate-700 dark:bg-slate-950/50">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm dark:bg-slate-900">
                <Package size={28} />
              </div>
              <div className="mt-4 text-lg font-black text-slate-950 dark:text-white">Bạn chưa có sản phẩm nào</div>
              <div className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
                Tạo sản phẩm thủ công để đưa dữ liệu lên storefront Lộc Sang.
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Hiển thị <span className="font-black text-slate-900 dark:text-white">{currentPageItemsCount}</span> / {headerTotalText} sản phẩm
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Mỗi trang</span>
              <select
                value={pagination.limit}
                onChange={(event) => setPagination((prev) => ({ ...prev, page: 1, limit: Number(event.target.value) }))}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button type="button" onClick={() => setPagination((prev) => ({ ...prev, page: 1 }))} disabled={pagination.page <= 1} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">
                &laquo;
              </button>
              <button type="button" onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))} disabled={pagination.page <= 1} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">
                &lt;
              </button>

              {visiblePages.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPagination((prev) => ({ ...prev, page: pageNumber }))}
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

              <button type="button" onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))} disabled={pagination.page >= totalPages} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">
                &gt;
              </button>
              <button type="button" onClick={() => setPagination((prev) => ({ ...prev, page: totalPages }))} disabled={pagination.page >= totalPages} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">
                &raquo;
              </button>
            </div>
          </div>
        </div>
      </section>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.9rem)] left-0 right-0 z-40 px-4 lg:bottom-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm font-black text-slate-950 dark:text-white">Đã chọn {selectedIds.length} sản phẩm</div>
            <div className="flex flex-wrap gap-2">
              <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950">
                <option value="active">Đang bán</option>
                <option value="draft">Nháp</option>
                <option value="discontinued">Ngừng bán</option>
              </select>
              <button type="button" onClick={() => bulkUpdate('status', { status: bulkStatus })} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black dark:border-slate-700">
                Đổi trạng thái
              </button>

              <select value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950">
                <option value="">Gán danh mục...</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button type="button" disabled={!bulkCategory} onClick={() => bulkUpdate('category', { category_id: Number(bulkCategory) })} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black disabled:opacity-50 dark:border-slate-700">
                Gán danh mục
              </button>

              <input value={bulkAffiliate} onChange={(event) => setBulkAffiliate(event.target.value)} inputMode="numeric" placeholder="Affiliate %" className="h-10 w-32 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950" />
              <button type="button" disabled={!bulkAffiliate} onClick={() => bulkUpdate('affiliate', { affiliate: Number(bulkAffiliate) })} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black disabled:opacity-50 dark:border-slate-700">
                Set %
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`Chuyển ${selectedIds.length} sản phẩm sang Ngừng bán?`)) return;
                  bulkUpdate('delete', { soft: true });
                }}
                className="h-10 rounded-xl bg-red-600 px-4 text-sm font-black text-white hover:bg-red-700"
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
