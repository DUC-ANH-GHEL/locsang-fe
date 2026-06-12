import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';

import { productService } from '../services/productService';
import { getProductPricing } from '../utils/productPricing';
import { toProductDetailPath } from '../utils/productUrl';
import {
  canPurchaseProduct,
  formatVnd,
  getProductImage,
} from '../data/yanmarStorefront';

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeCode = (value) => normalizeText(value).replace(/\s+/g, '');

const scoreProduct = (product, query) => {
  const q = normalizeText(query);
  const qCode = normalizeCode(query);
  if (!q) return 0;

  const name = normalizeText(product?.name);
  const nameCode = normalizeCode(product?.name);

  let score = 0;

  if (name === q) score += 140;
  if (name.startsWith(q)) score += 90;
  if (nameCode.startsWith(qCode)) score += 86;
  if (name.includes(q)) score += 64;
  if (nameCode.includes(qCode)) score += 60;

  if (Number(product?.stock || 0) > 0) score += 4;

  return score;
};

const sortSearchResults = (products, query) =>
  products
    .map((product) => ({ product, score: scoreProduct(product, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || String(a.product?.name || '').localeCompare(String(b.product?.name || ''), 'vi'))
    .map((item) => item.product);

const ProductQuickSearch = ({ open, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const cleanQuery = useMemo(() => String(query || '').trim(), [query]);
  const normalizedQuery = useMemo(() => normalizeText(cleanQuery), [cleanQuery]);
  const isEmptyQuery = cleanQuery.length === 0;
  const hasQuery = normalizedQuery.length >= 1;

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const debounce = window.setTimeout(() => {
      const loadProducts = async () => {
        try {
          setLoading(true);
          setLoadFailed(false);
          const data = await productService.getStorefrontProducts({
            status: 'active',
            limit: 100,
            page: 1,
            search: hasQuery ? cleanQuery : undefined,
          });

          if (!cancelled) {
            setProducts((Array.isArray(data) ? data : []).filter(canPurchaseProduct));
          }
        } catch {
          if (!cancelled) {
            setProducts([]);
            setLoadFailed(true);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      };

      loadProducts();
    }, hasQuery ? 180 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
    };
  }, [cleanQuery, hasQuery, open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setProducts([]);
      setLoadFailed(false);
      setLoading(false);
    }
  }, [open]);

  const results = useMemo(() => {
    if (isEmptyQuery) return products.slice(0, 6);
    return sortSearchResults(products, cleanQuery).slice(0, 8);
  }, [cleanQuery, isEmptyQuery, products]);

  const openProduct = (product) => {
    onClose();
    navigate(toProductDetailPath(product));
  };

  const openAllProducts = () => {
    onClose();
    navigate('/products');
  };

  const submitSearch = (event) => {
    event.preventDefault();
    if (results[0]) {
      openProduct(results[0]);
      return;
    }
    openAllProducts();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/45 px-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] md:px-6 md:pt-24" role="dialog" aria-modal="true" aria-label="Tìm nhanh sản phẩm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Đóng tìm kiếm" onClick={onClose} />

      <section className="relative mx-auto flex max-h-[min(42rem,calc(100dvh-2rem))] w-full max-w-[38rem] flex-col overflow-hidden rounded-[1.35rem] bg-white shadow-2xl shadow-black/20 md:rounded-3xl">
        <div className="border-b border-gray-100 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#111]">Tìm sản phẩm</h2>
              <p className="text-sm font-medium text-gray-500">Nhập tên sản phẩm cần tìm.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 active:scale-[0.98]"
              aria-label="Đóng tìm kiếm"
            >
              <X size={21} />
            </button>
          </div>

          <form onSubmit={submitSearch} className="relative">
            <Search size={24} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#d50918]" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ví dụ: nhớt, lọc nhớt, xylanh..."
              className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-12 pr-4 text-base font-bold text-[#111] outline-none transition placeholder:text-gray-400 focus:border-[#e30613] focus:bg-white focus:ring-4 focus:ring-[#e30613]/10"
            />
          </form>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-gray-400">
            {hasQuery ? 'Kết quả phù hợp' : 'Gợi ý nhanh'}
          </div>

          {loading && (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-[5.35rem] animate-pulse rounded-2xl bg-gray-100" />
              ))}
            </div>
          )}

          {!loading && loadFailed && (
            <div className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
              Chưa tải được gợi ý sản phẩm. Vui lòng thử lại.
            </div>
          )}

          {!loading && !loadFailed && results.length === 0 && (
            <div className="rounded-2xl bg-gray-50 p-5 text-center">
              <div className="text-sm font-black text-gray-900">Không thấy sản phẩm phù hợp</div>
              <div className="mt-1 text-sm text-gray-500">Bạn có thể thử tên ngắn hơn hoặc tên đầy đủ hơn.</div>
            </div>
          )}

          {!loading && !loadFailed && results.length > 0 && (
            <div className="space-y-2">
              {results.map((product) => {
                const pricing = getProductPricing(product);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => openProduct(product)}
                    className="flex w-full gap-3 rounded-2xl border border-gray-100 bg-white p-2 text-left shadow-[0_1px_5px_rgba(0,0,0,0.04)] active:scale-[0.99]"
                  >
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="h-20 w-20 shrink-0 rounded-xl border border-gray-100 bg-gray-50 object-contain"
                    />
                    <span className="min-w-0 flex-1 py-1">
                      <span className="line-clamp-2 text-sm font-black leading-snug text-[#111]">{product.name}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-base font-black text-[#e30613]">{formatVnd(pricing.currentPrice || product.price)}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 p-3">
          <button
            type="button"
            onClick={openAllProducts}
            className="h-11 w-full rounded-2xl border border-[#e30613] text-sm font-black text-[#e30613]"
          >
            Xem tất cả sản phẩm
          </button>
        </div>
      </section>
    </div>
  );
};

export default ProductQuickSearch;
