import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDownUp, ChevronDown } from 'lucide-react';

import { useCart } from '../../contexts/CartContext';
import { getPublicCategories } from '../../services/categoryService';
import { productService } from '../../services/productService';
import { toProductDetailPath } from '../../utils/productUrl';
import { getProductPricing } from '../../utils/productPricing';
import { useSEO } from '../../hooks/useSEO';
import {
  formatVnd,
  canPurchaseProduct,
  getDiscountLabel,
  getProductImage,
  toCartPayload,
} from '../../data/yanmarStorefront';

const FALLBACK_CATEGORY_CHIPS = ['Nhớt', 'Động cơ', 'Lọc nhớt', 'Dây curoa'];

const SORT_OPTIONS = [
  { value: 'default', label: 'Sắp xếp' },
  { value: 'price_asc', label: 'Giá thấp trước' },
  { value: 'price_desc', label: 'Giá cao trước' },
  { value: 'name_asc', label: 'Tên A-Z' },
];

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const ProductList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const selectedCategoryId = searchParams.get('categoryId') || '';
  const selectedCategoryName = searchParams.get('category') || '';
  const selectedSaleOnly = searchParams.get('sale') === '1';
  const activeCategoryKey = selectedSaleOnly
    ? 'sale'
    : selectedCategoryId
      ? `id:${selectedCategoryId}`
      : selectedCategoryName
        ? `name:${selectedCategoryName}`
        : 'all';

  useSEO({
    title: 'Phụ tùng và nhớt Yanmar',
    description: 'Danh sách phụ tùng, lọc nhớt, lọc gió, dây curoa và dầu nhớt Yanmar chính hãng tại Lộc Sang.',
    canonicalPath: '/products',
  });

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await productService.getStorefrontProducts({
          status: 'active',
          limit: 100,
          page: 1,
          categoryId: selectedCategoryId || undefined,
        });
        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : []);
          setLoadFailed(false);
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
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId]);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const data = await getPublicCategories();
        if (!cancelled) {
          setCategories(data.filter((category) => category.is_active !== false));
        }
      } catch {
        if (!cancelled) setCategories([]);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasSaleProducts = useMemo(
    () => products.some((product) => canPurchaseProduct(product) && getProductPricing(product).hasDiscount),
    [products],
  );

  const categoryChips = useMemo(() => {
    const liveCategories = categories
      .filter((category) => category.name)
      .map((category) => ({
        key: `id:${category.id}`,
        label: category.name,
        categoryId: String(category.id),
      }));

    const saleChip = hasSaleProducts ? [{ key: 'sale', label: 'Khuyến mãi', saleOnly: true }] : [];

    if (liveCategories.length > 0) {
      return [{ key: 'all', label: 'Tất cả' }, ...saleChip, ...liveCategories];
    }

    return [
      { key: 'all', label: 'Tất cả' },
      ...saleChip,
      ...FALLBACK_CATEGORY_CHIPS.map((label) => ({
        key: `name:${label}`,
        label,
        categoryName: label,
      })),
    ];
  }, [categories, hasSaleProducts]);

  const selectCategory = (category) => {
    const next = new URLSearchParams(searchParams);
    next.delete('categoryId');
    next.delete('category');
    next.delete('sale');

    if (category.saleOnly) {
      next.set('sale', '1');
    } else if (category.categoryId) {
      next.set('categoryId', category.categoryId);
    } else if (category.categoryName) {
      next.set('category', category.categoryName);
    }

    setSearchParams(next);
  };

  const visibleProducts = useMemo(() => {
    let next = products.filter((product) => {
      if (!canPurchaseProduct(product)) return false;
      if (!selectedCategoryName) return true;
      const categoryToken = normalizeText(selectedCategoryName);
      const haystack = normalizeText(`${product?.category_name || ''} ${product?.name || ''} ${product?.description || ''}`);
      return haystack.includes(categoryToken);
    });

    if (selectedSaleOnly) {
      next = next.filter((product) => getProductPricing(product).hasDiscount);
    }

    next = [...next];
    if (sortBy === 'price_asc') {
      next.sort((a, b) => getProductPricing(a).currentPrice - getProductPricing(b).currentPrice);
    } else if (sortBy === 'price_desc') {
      next.sort((a, b) => getProductPricing(b).currentPrice - getProductPricing(a).currentPrice);
    } else if (sortBy === 'name_asc') {
      next.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'vi'));
    }

    return next;
  }, [selectedCategoryName, selectedSaleOnly, sortBy, products]);

  const addProduct = (product) => {
    if (!canPurchaseProduct(product)) return;
    addToCart(toCartPayload(product, 1));
  };

  const buyNow = (product) => {
    if (!canPurchaseProduct(product)) return;
    addProduct(product);
    navigate('/checkout');
  };

  return (
    <div className="bg-white text-[#111] md:bg-[#f5f5f5]">
      <main className="mx-auto w-full max-w-[944px] bg-white px-3.5 pb-8 pt-5 font-sans sm:px-6 md:shadow-2xl md:shadow-black/10">
        <h1 className="font-sans text-[2.05rem] font-black leading-none tracking-normal text-black max-[390px]:text-[1.82rem]">
          Phụ tùng & nhớt
        </h1>

        <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoryChips.map((category) => {
            const active = category.key === activeCategoryKey;
            return (
              <button
                key={category.key}
                type="button"
                onClick={() => selectCategory(category)}
                className={`h-11 shrink-0 rounded-xl border px-4 text-[0.98rem] font-black transition active:scale-[0.98] max-[390px]:px-3.5 max-[390px]:text-[0.88rem] ${
                  active
                    ? 'border-[#e30613] bg-[#e30613] text-white shadow-[0_8px_20px_rgba(227,6,19,0.18)]'
                    : 'border-[#d6d6d6] bg-white text-[#202020]'
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <label className="relative flex h-14 w-full items-center justify-between rounded-xl border border-[#d9d9d9] bg-white px-4 text-[#111] sm:max-w-[18rem]">
            <span className="flex items-center gap-2 text-[1.02rem] font-black max-[390px]:text-[0.92rem]">
              <ArrowDownUp size={26} className="text-[#e30613]" />
              {SORT_OPTIONS.find((item) => item.value === sortBy)?.label || 'Sắp xếp'}
            </span>
            <ChevronDown size={22} />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="absolute inset-0 h-full w-full opacity-0"
              aria-label="Sắp xếp sản phẩm"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section className="mt-4 grid grid-cols-2 gap-3">
          {(loading || loadFailed) && products.length === 0
            ? Array.from({ length: 6 }).map((_, index) => <ProductSkeleton key={index} />)
            : visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpen={() => navigate(toProductDetailPath(product))}
                  onAdd={() => addProduct(product)}
                  onBuy={() => buyNow(product)}
                />
              ))}
        </section>

        {!loading && !loadFailed && visibleProducts.length === 0 && (
          <div className="mt-8 rounded-2xl border border-[#eee] bg-[#fafafa] px-5 py-8 text-center">
            <p className="text-lg font-black text-[#111]">Chưa có sản phẩm phù hợp</p>
            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams())}
              className="mt-4 h-11 rounded-xl bg-[#e30613] px-5 text-sm font-black text-white active:scale-[0.98]"
            >
              Xem tất cả
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

const ProductSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-white p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
    <div className="h-[8rem] rounded-lg bg-[#f2f2f2] max-[390px]:h-[7rem]" />
    <div className="mt-3 h-4 w-4/5 rounded bg-[#eeeeee]" />
    <div className="mt-4 h-7 w-3/4 rounded bg-[#eeeeee]" />
    <div className="mt-4 h-10 rounded-md bg-[#eeeeee]" />
    <div className="mt-1.5 h-9 rounded-md bg-[#f5f5f5]" />
  </div>
);

const ProductCard = ({ product, onOpen, onAdd, onBuy }) => {
  const pricing = getProductPricing(product);
  const discountLabel = getDiscountLabel(product) || (pricing.hasDiscount ? '-15%' : '');
  const canPurchase = canPurchaseProduct(product);

  return (
    <article className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#e5e5e5] bg-white p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      {discountLabel && (
        <div className="absolute left-2 top-2 z-10 rounded-md bg-[#e30613] px-2 py-1 text-[0.92rem] font-black leading-none text-white max-[390px]:text-[0.8rem]">
          {discountLabel}
        </div>
      )}

      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex h-[8.4rem] items-center justify-center rounded-lg bg-white max-[390px]:h-[7rem]">
          <img src={getProductImage(product)} alt={product.name} className="max-h-full max-w-full object-contain" />
        </div>

        <div className="mt-2 flex min-h-[5.1rem] flex-col">
          <h2 className="line-clamp-2 font-sans text-[1rem] font-black leading-[1.12] text-[#111] max-[390px]:text-[0.88rem]">
            {product.name}
          </h2>
          <div className="mt-auto pt-2">
            <div className="text-[1.22rem] font-black leading-none text-[#e30613] max-[390px]:text-[1.02rem]">
              {formatVnd(pricing.currentPrice)}
            </div>
            {pricing.originalPrice && (
              <div className="mt-1 text-[0.82rem] leading-none text-[#777] line-through max-[390px]:text-[0.7rem]">
                {formatVnd(pricing.originalPrice)}
              </div>
            )}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={onBuy}
        disabled={!canPurchase}
        className={`mt-2 h-10 w-full rounded-md text-[1rem] font-black active:translate-y-px max-[390px]:h-9 max-[390px]:text-[0.88rem] ${
          canPurchase ? 'bg-[#e30613] text-white' : 'cursor-not-allowed bg-[#e5e7eb] text-[#8a8f98]'
        }`}
      >
        {canPurchase ? 'Mua ngay' : 'Tạm hết hàng'}
      </button>
      <button
        type="button"
        onClick={onAdd}
        disabled={!canPurchase}
        className={`mt-1.5 flex h-9 w-full items-center justify-center rounded-md border text-[0.86rem] font-bold active:bg-[#fff1f2] max-[390px]:h-8 max-[390px]:text-[0.76rem] ${
          canPurchase
            ? 'border-[#e30613] bg-white text-[#e30613]'
            : 'cursor-not-allowed border-[#d1d5db] bg-white text-[#9ca3af]'
        }`}
      >
        Thêm vào giỏ
      </button>
    </article>
  );
};

export default ProductList;
