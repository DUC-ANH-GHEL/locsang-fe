import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';

import { productService } from '../services/productService';
import { getProductPricing } from '../utils/productPricing';
import { toProductDetailPath } from '../utils/productUrl';
import {
  canPurchaseProduct,
  formatVnd,
  getDisplayDescription,
  getProductImage,
  getStockLabel,
} from '../data/yanmarStorefront';

const normalizeQuery = (value) => String(value || '').trim();

const ProductQuickSearch = ({ open, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const cleanQuery = useMemo(() => normalizeQuery(query), [query]);
  const hasQuery = cleanQuery.length >= 2;

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
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setLoadFailed(false);
        const data = await productService.getStorefrontProducts({
          status: 'active',
          limit: hasQuery ? 8 : 6,
          page: 1,
          search: hasQuery ? cleanQuery : undefined,
        });

        if (!cancelled) {
          setResults((Array.isArray(data) ? data : []).filter(canPurchaseProduct));
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, hasQuery ? 260 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cleanQuery, hasQuery, open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setLoadFailed(false);
      setLoading(false);
    }
  }, [open]);

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
              <p className="text-sm font-medium text-gray-500">Nhập tên sản phẩm hoặc mã phụ tùng.</p>
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
              placeholder="Ví dụ: lọc nhớt, dây curoa, 119305..."
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
              <div className="mt-1 text-sm text-gray-500">Bạn có thể thử mã phụ tùng hoặc tên ngắn hơn.</div>
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
                      <span className="mt-1 block truncate text-xs font-semibold text-gray-500">
                        {product.sku || getDisplayDescription(product)}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-base font-black text-[#e30613]">{formatVnd(pricing.currentPrice || product.price)}</span>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                          {getStockLabel(product)}
                        </span>
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
