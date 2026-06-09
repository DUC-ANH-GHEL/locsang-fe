import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductsTable from '../../../components/products/List/ProductsTable';
import FilterBar from '../../../components/products/List/FillterBar';
import { productService } from '../../../services/productService';
import { useToast } from '../../../components/Toast';
import { parseApiError } from '../../../utils/apiError';
import { logout } from '../../../services/authService';
import { getCategories } from '../../../services/categoryService';

const STORAGE_SAVED_FILTERS = 'locsang_admin_product_saved_filters_v1';
const STORAGE_COLUMNS = 'locsang_admin_product_columns_v1';

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

const DEFAULT_COLUMNS = {
  profit: true,
  category: true,
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

  const [columnVisibility, setColumnVisibility] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_COLUMNS);
      return raw ? { ...DEFAULT_COLUMNS, ...JSON.parse(raw) } : DEFAULT_COLUMNS;
    } catch {
      return DEFAULT_COLUMNS;
    }
  });

  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SAVED_FILTERS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const importInputRef = useRef(null);

  const totalPages = useMemo(() => {
    const t = Number(pagination.total || 0);
    const l = Number(pagination.limit || 20);
    return Math.max(1, Math.ceil(t / l));
  }, [pagination.total, pagination.limit]);

  const headerTotalText = useMemo(() => {
    return Number(pagination.total || 0).toLocaleString('vi-VN');
  }, [pagination.total]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getCategories();
        const list = Array.isArray(data) ? data : [];
        setCategories(list.map((c) => ({ id: Number(c.id), name: String(c.name ?? '') })));
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COLUMNS, JSON.stringify(columnVisibility));
    } catch {
      // ignore
    }
  }, [columnVisibility]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SAVED_FILTERS, JSON.stringify(savedFilters));
    } catch {
      // ignore
    }
  }, [savedFilters]);

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
      setItems(res.data || []);
      setPagination((p) => ({
        ...p,
        page: Number(res.pagination?.page ?? p.page),
        limit: Number(res.pagination?.limit ?? p.limit),
        total: Number(res.pagination?.total ?? 0),
      }));
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed?.status === 401) {
        showToast('PhiÃªn Ä‘Äƒng nháº­p háº¿t háº¡n. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.', 'error', 5000);
        logout();
        const current = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/admin/login?redirect=${encodeURIComponent(current)}`;
        return;
      }
      showToast(parsed?.message || 'KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch sáº£n pháº©m', 'error', 6000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page, pagination.limit, sort]);

  const setFilterPatch = (patch) => {
    setPagination((p) => ({ ...p, page: 1 }));
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const resetFilters = () => {
    setActiveTab('all');
    setSelectedIds([]);
    setSort('created_desc');
    setPagination((p) => ({ ...p, page: 1, limit: 20 }));
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
    if (checked) setSelectedIds(items.map((x) => x.id));
    else setSelectedIds([]);
  };

  const downloadCsv = (rows, filename) => {
    const escape = (v) => {
      const s = String(v ?? '');
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replaceAll('"', '""')}"`;
      return s;
    };
    const csv = rows.map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = (mode) => {
    const list = mode === 'selected' ? items.filter((x) => selectedIds.includes(x.id)) : items;
    if (list.length === 0) {
      showToast('KhÃ´ng cÃ³ dá»¯ liá»‡u Ä‘á»ƒ export', 'warning');
      return;
    }
    const header = [
      'id',
      'name',
      'sku',
      'slug',
      'price_min',
      'price_max',
      'stock_total',
      'variant_count',
      'status',
      'category',
    ];
    const rows = [header];
    for (const p of list) {
      rows.push([
        p.id,
        p.name,
        p.sku ?? '',
        p.slug ?? '',
        p.price_min ?? '',
        p.price_max ?? '',
        p.stock_total ?? '',
        p.variant_count ?? '',
        p.status ?? '',
        p.category ?? '',
      ]);
    }
    downloadCsv(rows, `locsang-products-${mode}-${Date.now()}.csv`);
  };

  const parseCsv = (text) => {
    const lines = text.split(/\r?\n/).filter((x) => x.trim().length > 0);
    if (lines.length === 0) return [];

    const parseLine = (line) => {
      const out = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
          continue;
        }
        if (ch === ',' && !inQuotes) {
          out.push(cur);
          cur = '';
          continue;
        }
        cur += ch;
      }
      out.push(cur);
      return out;
    };

    const header = parseLine(lines[0]).map((x) => x.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row = {};
      for (let j = 0; j < header.length; j++) row[header[j]] = values[j];
      rows.push(row);
    }
    return rows;
  };

  const handleImportCsv = async (file) => {
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        showToast('CSV rá»—ng', 'warning');
        return;
      }
      if (!window.confirm(`Import ${rows.length} dÃ²ng tá»« CSV?`)) return;

      let ok = 0;
      let fail = 0;
      for (const r of rows) {
        try {
          const name = String(r.name ?? '').trim();
          const sku = String(r.sku ?? '').trim();
          const slug = String(r.slug ?? '').trim() || name.toLowerCase().replace(/\s+/g, '-');
          const price = Number(r.price ?? r.price_min ?? 0);
          const stock = Number(r.stock ?? r.stock_total ?? 0);
          const category_id = Number(r.category_id ?? filters.category_id ?? 0);
          if (!name || !sku || !slug || !Number.isFinite(price) || price <= 0 || !Number.isFinite(category_id) || category_id <= 0) {
            fail++;
            continue;
          }

          await productService.createProduct({
            name,
            slug,
            description: String(r.description ?? ''),
            sku,
            price,
            sale_price: null,
            currency: 'VND',
            affiliate: Number(r.affiliate ?? 0) || 0,
            stock: Number.isFinite(stock) ? stock : 0,
            weight: 0,
            length: 0,
            width: 0,
            height: 0,
            is_active: true,
            category_id,
            brand: String(r.brand ?? ''),
            material: String(r.material ?? ''),
            size: String(r.size ?? ''),
            color: String(r.color ?? ''),
            pet_type: String(r.pet_type ?? ''),
            season: String(r.season ?? ''),
            labels: [],
            images: [],
            specs: [],
            metaTitle: '',
            metaDescription: '',
          });
          ok++;
        } catch {
          fail++;
        }
      }

      showToast(`Import xong. ThÃ nh cÃ´ng: ${ok}, lá»—i: ${fail}`, fail > 0 ? 'warning' : 'success', 7000);
      fetchAdminProducts();
    } catch {
      showToast('KhÃ´ng import Ä‘Æ°á»£c CSV', 'error');
    }
  };

  const bulkUpdate = async (action, data) => {
    try {
      await productService.bulkUpdateProducts({ ids: selectedIds, action, data });
      showToast('Cáº­p nháº­t hÃ ng loáº¡t thÃ nh cÃ´ng', 'success');
      setSelectedIds([]);
      fetchAdminProducts();
    } catch (error) {
      const parsed = parseApiError(error);
      if (parsed?.status === 404) {
        showToast('Backend chÆ°a há»— trá»£ bulk update (/admin/products/bulk)', 'error', 7000);
        return;
      }
      showToast(parsed?.message || 'Bulk update tháº¥t báº¡i', 'error', 7000);
    }
  };

  const [bulkStatus, setBulkStatus] = useState('active');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkAffiliate, setBulkAffiliate] = useState('');

  const currentPageItemsCount = items?.length ?? 0;

  const visiblePages = useMemo(() => {
    const p = pagination.page;
    const out = [];
    const start = Math.max(1, p - 2);
    const end = Math.min(totalPages, p + 2);
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  }, [pagination.page, totalPages]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quản lý sản phẩm</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Tổng: {headerTotalText} sản phẩm</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportCsv(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={() => handleExportCsv('all')}
            className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/products/create')}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Tạo sản phẩm
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        {/* Filter & Search */}
        <FilterBar
          filters={filters}
          onChange={setFilterPatch}
          onReset={resetFilters}
          categories={categories}
          activeTab={activeTab}
          onTabChange={applyTab}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          savedFilters={savedFilters}
          onSaveCurrentFilter={() => {
            const name = window.prompt('Tên filter?');
            if (!name) return;
            setSavedFilters((prev) => [{ name, filters }, ...(prev ?? [])].slice(0, 20));
            showToast('Đã lưu filter', 'success');
          }}
          onApplySavedFilter={(idx) => {
            const preset = savedFilters?.[idx];
            if (!preset) return;
            setActiveTab('all');
            setPagination((p) => ({ ...p, page: 1 }));
            setFilters(preset.filters);
            showToast(`Đã áp dụng: ${preset.name}`, 'success');
          }}
        />

        {/* Data Table */}
        <div className="mt-6">
          <ProductsTable
            items={items}
            loading={loading}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onToggleSelectAll={onToggleSelectAll}
            sort={sort}
            onSortChange={(next) => {
              setPagination((p) => ({ ...p, page: 1 }));
              setSort(next);
            }}
            columnVisibility={columnVisibility}
            onRefresh={fetchAdminProducts}
          />
        </div>

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">Báº¡n chÆ°a cÃ³ sáº£n pháº©m nÃ o</div>
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">Hãy tạo sản phẩm mới hoặc import CSV để bắt đầu quản lý catalog.</div>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Hiá»ƒn thá»‹ {currentPageItemsCount} / {headerTotalText} sáº£n pháº©m
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm text-gray-600 dark:text-gray-300">Hiá»ƒn thá»‹</div>
            <select
              value={pagination.limit}
              onChange={(e) => setPagination((p) => ({ ...p, page: 1, limit: Number(e.target.value) }))}
              className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <div className="text-sm text-gray-600 dark:text-gray-300">/ trang</div>

            <button
              type="button"
              onClick={() => setPagination((p) => ({ ...p, page: 1 }))}
              disabled={pagination.page <= 1}
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 disabled:opacity-50"
            >
              â‰ª
            </button>
            <button
              type="button"
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 disabled:opacity-50"
            >
              &lt;
            </button>

            {visiblePages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPagination((x) => ({ ...x, page: p }))}
                className={
                  'px-3 py-2 rounded-xl border text-sm font-semibold ' +
                  (p === pagination.page
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200')
                }
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPagination((p) => ({ ...p, page: Math.min(totalPages, p.page + 1) }))}
              disabled={pagination.page >= totalPages}
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 disabled:opacity-50"
            >
              &gt;
            </button>
            <button
              type="button"
              onClick={() => setPagination((p) => ({ ...p, page: totalPages }))}
              disabled={pagination.page >= totalPages}
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 disabled:opacity-50"
            >
              â‰«
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
          <div className="mx-auto max-w-7xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">ÄÃ£ chá»n {selectedIds.length} sáº£n pháº©m</div>
            <div className="flex flex-wrap gap-2">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <option value="active">Äang bÃ¡n</option>
                <option value="draft">NhÃ¡p</option>
                <option value="discontinued">Ngá»«ng bÃ¡n</option>
              </select>
              <button
                type="button"
                onClick={() => bulkUpdate('status', { status: bulkStatus })}
                className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-semibold"
              >
                Äá»•i tráº¡ng thÃ¡i
              </button>

              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <option value="">GÃ¡n danh má»¥c...</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!bulkCategory}
                onClick={() => bulkUpdate('category', { category_id: Number(bulkCategory) })}
                className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                GÃ¡n danh má»¥c
              </button>

              <input
                value={bulkAffiliate}
                onChange={(e) => setBulkAffiliate(e.target.value)}
                inputMode="numeric"
                placeholder="Affiliate %"
                className="w-32 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={!bulkAffiliate}
                onClick={() => bulkUpdate('affiliate', { affiliate: Number(bulkAffiliate) })}
                className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                Set affiliate %
              </button>

              <button
                type="button"
                onClick={() => handleExportCsv('selected')}
                className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-semibold"
              >
                Export
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`Chuyá»ƒn ${selectedIds.length} sáº£n pháº©m sang Ngá»«ng bÃ¡n?`)) return;
                  bulkUpdate('delete', { soft: true });
                }}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-semibold"
              >
                XoÃ¡
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
