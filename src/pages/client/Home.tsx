import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronRight, Flame, Search, Tag } from 'lucide-react';

import { Product } from '../../types/product';
import { productService } from '../../services/productService';
import { Category, getPublicCategories } from '../../services/categoryService';
import { HomeContentPayload, homeContentService } from '../../services/homeContentService';
import { getProductPricing } from '../../utils/productPricing';
import { toProductDetailPath } from '../../utils/productUrl';
import { useSEO } from '../../hooks/useSEO';
import { useCart } from '../../contexts/CartContext';
import {
  HERO_IMAGE,
  PRODUCT_PLACEHOLDER,
  canPurchaseProduct,
  getDefaultCartVariant,
  toCartPayload,
} from '../../data/yanmarStorefront';
import { CategoryIconPreview, getCategoryIconValue } from '../../utils/categoryIcons';

type HomeProduct = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  discountLabel?: string;
  canPurchase: boolean;
  soldCount: number;
  raw?: Product;
};

type CategoryLink = {
  title: string;
  categoryId?: number;
  image?: string | null;
  saleOnly?: boolean;
};

const FALLBACK_CATEGORY_LINKS: CategoryLink[] = [
  { title: 'Phụ tùng', image: getCategoryIconValue('parts') },
  { title: 'Nhớt', image: getCategoryIconValue('oil') },
  { title: 'Động cơ', image: getCategoryIconValue('engine') },
  { title: 'Lọc nhớt', image: getCategoryIconValue('oil_filter') },
];

const formatVnd = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  })
    .format(Number(value || 0))
    .replace(/\s/g, '');

const toHomeProduct = (product: Product): HomeProduct => {
  const pricing = getProductPricing(product);
  const image = product.thumbnail || product.images?.[0] || PRODUCT_PLACEHOLDER;
  const originalPrice = pricing.hasDiscount ? pricing.originalPrice : null;
  const discount =
    originalPrice && originalPrice > pricing.currentPrice
      ? `-${Math.round(((originalPrice - pricing.currentPrice) / originalPrice) * 100)}%`
      : undefined;

  return {
    id: String(product.id),
    name: product.name || 'Sản phẩm Yanmar',
    price: pricing.currentPrice || Number(product.price || 0),
    originalPrice,
    discountLabel: discount,
    canPurchase: canPurchaseProduct(product),
    soldCount: Number(product.sold_count || 0),
    image,
    raw: product,
  };
};

const Home = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ openProductSearch?: () => void } | null>();
  const openProductSearch = outletContext?.openProductSearch;
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [homeContent, setHomeContent] = useState<HomeContentPayload | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useSEO({
    title: 'Phụ tùng và nhớt Yanmar chính hãng',
    description: 'Lộc Sang cung cấp phụ tùng, lọc nhớt, lọc gió và dầu nhớt Yanmar chính hãng.',
    canonicalPath: '/',
  });

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await productService.getStorefrontProducts({
          status: 'active',
          limit: 24,
          page: 1,
          sortBy: 'bestSelling',
          order: 'desc',
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

    const loadHomeContent = async () => {
      try {
        const response = await homeContentService.getPublicHomeContent();
        if (!cancelled) setHomeContent(response.content || null);
      } catch {
        if (!cancelled) setHomeContent(null);
      }
    };

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

    loadProducts();
    loadHomeContent();
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const apiProducts = useMemo(() => products.map(toHomeProduct).filter((product) => product.canPurchase), [products]);

  const bestProducts = useMemo(
    () =>
      [...apiProducts]
        .sort((a, b) => b.soldCount - a.soldCount || a.name.localeCompare(b.name, 'vi'))
        .slice(0, 4),
    [apiProducts],
  );

  const saleProducts = useMemo(() => apiProducts.filter((product) => product.discountLabel).slice(0, 4), [apiProducts]);

  const categoryLinks = useMemo<CategoryLink[]>(() => {
    const liveLinks = categories
      .filter((category) => category.name)
      .slice(0, saleProducts.length > 0 ? 3 : 4)
      .map((category) => ({
        title: category.name,
        categoryId: category.id,
        image: category.image,
      }));

    const baseLinks = liveLinks.length > 0 ? liveLinks : FALLBACK_CATEGORY_LINKS.slice(0, saleProducts.length > 0 ? 3 : 4);
    return saleProducts.length > 0
      ? [{ title: 'Khuyến mãi', image: getCategoryIconValue('sale'), saleOnly: true }, ...baseLinks]
      : baseLinks;
  }, [categories, saleProducts.length]);

  const heroImage = homeContent?.hero_image_url?.trim() || HERO_IMAGE;
  const heroAlt =
    [homeContent?.hero_headline_line1, homeContent?.hero_headline_line2]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Phụ tùng và nhớt chính hãng Yanmar';

  const addProductToCart = (product: HomeProduct) => {
    if (!product.raw || !product.canPurchase) return;
    addToCart(toCartPayload(product.raw, 1, getDefaultCartVariant(product.raw)));
  };

  const buyNow = (product: HomeProduct) => {
    if (!product.canPurchase) return;
    addProductToCart(product);
    navigate('/checkout');
  };

  const openProductDetail = (product: HomeProduct) => {
    if (!product.raw) return;
    navigate(toProductDetailPath(product.raw));
  };

  return (
    <div className="bg-white pb-7 text-[#101010] md:bg-[#f5f5f5] md:pb-10">
      <div className="mx-auto w-full max-w-[944px] bg-white font-sans md:shadow-2xl md:shadow-black/10">
        <section className="overflow-hidden border-b border-[#e4e4e4] bg-white">
          <img src={heroImage} alt={heroAlt} className="block aspect-[944/317] w-full object-contain" />
        </section>

        <main className="px-3.5 pt-4 sm:px-6">
          <button
            type="button"
            onClick={() => openProductSearch?.()}
            className="flex h-16 w-full items-center gap-3 rounded-[1.15rem] border border-[#dedede] bg-white px-5 text-left text-[#8b8b8b] shadow-[0_1px_4px_rgba(0,0,0,0.04)] active:scale-[0.99]"
          >
            <Search size={29} strokeWidth={2.5} className="shrink-0 text-[#777]" />
            <span className="min-w-0 flex-1 truncate text-[1.12rem] font-bold text-[#9b9b9b] max-[390px]:text-[1rem]">
              Tìm sản phẩm...
            </span>
          </button>

          <div className="mt-4 grid grid-cols-4 gap-2.5 max-[390px]:gap-2">
            {categoryLinks.map((category) => (
              <button
                key={category.title}
                type="button"
                onClick={() => navigate(category.saleOnly ? '/products?sale=1' : category.categoryId ? `/products?categoryId=${category.categoryId}` : '/products')}
                className="flex min-h-[5.6rem] flex-col items-center justify-center rounded-xl border border-[#e4e4e4] bg-white px-1 py-2 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)] active:scale-[0.98]"
              >
                <CategoryIconPreview
                  name={category.title}
                  value={category.image}
                  size={36}
                  iconClassName="text-[#e30613]"
                  imageClassName="h-9 w-9 rounded-lg object-contain"
                />
                <span className="mt-2 line-clamp-2 text-[0.82rem] font-black leading-[1.05] text-[#111] max-[390px]:text-[0.72rem]">
                  {category.title}
                </span>
              </button>
            ))}
          </div>

          <ProductSection
            title="Sản phẩm bán chạy"
            icon={<Flame size={24} fill="#e30613" className="text-[#e30613]" />}
            products={bestProducts}
            loading={(loading || loadFailed) && products.length === 0}
            onOpen={openProductDetail}
            onAdd={addProductToCart}
            onBuy={buyNow}
            onViewAll={() => navigate('/products')}
          />

          {(saleProducts.length > 0 || ((loading || loadFailed) && products.length === 0)) && (
            <ProductSection
              title="Đang giảm giá"
              icon={<Tag size={24} fill="#e30613" className="text-[#e30613]" />}
              products={saleProducts}
              loading={(loading || loadFailed) && products.length === 0}
              onOpen={openProductDetail}
              onAdd={addProductToCart}
              onBuy={buyNow}
              onViewAll={() => navigate('/products?sale=1')}
            />
          )}
        </main>
      </div>
    </div>
  );
};

type ProductSectionProps = {
  title: string;
  icon: React.ReactNode;
  products: HomeProduct[];
  loading?: boolean;
  onOpen: (product: HomeProduct) => void;
  onAdd: (product: HomeProduct) => void;
  onBuy: (product: HomeProduct) => void;
  onViewAll?: () => void;
};

const ProductSection = ({ title, icon, products, loading = false, onOpen, onAdd, onBuy, onViewAll }: ProductSectionProps) => (
  <section className="mt-5">
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <h2 className="truncate font-sans text-[1.35rem] font-black leading-tight text-[#111] max-[390px]:text-[1.12rem]">
          {title}
        </h2>
      </div>
      <button
        type="button"
        onClick={onViewAll}
        className="flex h-9 shrink-0 items-center gap-1 rounded-full px-1 text-[0.95rem] font-bold text-[#e30613] max-[390px]:text-[0.82rem]"
      >
        Xem tất cả
        <ChevronRight size={19} strokeWidth={2.6} />
      </button>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {loading
        ? Array.from({ length: 4 }).map((_, index) => <ProductCardSkeleton key={index} />)
        : products.map((product) => <ProductCard key={product.id} product={product} onOpen={onOpen} onAdd={onAdd} onBuy={onBuy} />)}
    </div>
  </section>
);

const ProductCardSkeleton = () => (
  <div className="rounded-xl border border-[#e3e3e3] bg-white p-1.5 shadow-[0_1px_5px_rgba(0,0,0,0.06)]">
    <div className="aspect-square rounded-lg bg-[#f2f2f2]" />
    <div className="mt-2 h-4 rounded bg-[#eeeeee]" />
    <div className="mt-2 h-5 w-4/5 rounded bg-[#eeeeee]" />
    <div className="mt-3 h-10 rounded-md bg-[#eeeeee]" />
    <div className="mt-1.5 h-9 rounded-md bg-[#f5f5f5]" />
  </div>
);

type ProductCardProps = {
  product: HomeProduct;
  onOpen: (product: HomeProduct) => void;
  onAdd: (product: HomeProduct) => void;
  onBuy: (product: HomeProduct) => void;
};

const ProductCard = ({ product, onOpen, onAdd, onBuy }: ProductCardProps) => (
  <article className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#e3e3e3] bg-white p-1.5 shadow-[0_1px_5px_rgba(0,0,0,0.06)]">
    {product.discountLabel && (
      <div className="absolute left-2 top-2 z-10 rounded-md bg-[#e30613] px-2 py-1 text-[0.92rem] font-black leading-none text-white shadow-sm max-[390px]:text-[0.8rem]">
        {product.discountLabel}
      </div>
    )}

    <button type="button" onClick={() => onOpen(product)} className="block min-w-0 text-left">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-[#f7f7f7]">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
      </div>

      <div className="px-0.5 pt-2">
        <h3 className="line-clamp-2 font-sans text-[1rem] font-black leading-[1.12] text-[#111] max-[390px]:text-[0.88rem]">
          {product.name}
        </h3>
        <div className="mt-2">
          <div className="text-[1.28rem] font-black leading-none text-[#e30613] max-[390px]:text-[1.08rem]">
            {formatVnd(product.price).replace('₫', 'đ')}
          </div>
          {product.originalPrice && (
            <div className="mt-1 text-[0.8rem] leading-none text-[#7f7f7f] line-through max-[390px]:text-[0.68rem]">
              {formatVnd(product.originalPrice).replace('₫', 'đ')}
            </div>
          )}
        </div>
      </div>
    </button>

    <button
      type="button"
      onClick={() => onBuy(product)}
      disabled={!product.canPurchase}
      className={`mt-2 h-10 rounded-md text-[1rem] font-black shadow-[0_2px_0_rgba(120,0,8,0.15)] active:translate-y-px max-[390px]:h-9 max-[390px]:text-[0.88rem] ${
        product.canPurchase ? 'bg-[#e30613] text-white' : 'cursor-not-allowed bg-[#e5e7eb] text-[#8a8f98]'
      }`}
    >
      {product.canPurchase ? 'Mua ngay' : 'Tạm hết hàng'}
    </button>
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={!product.canPurchase}
      className={`mt-1.5 flex h-9 items-center justify-center rounded-md border bg-white px-1 text-[0.86rem] font-bold leading-none active:bg-[#fff1f2] max-[390px]:h-8 max-[390px]:text-[0.76rem] ${
        product.canPurchase
          ? 'border-[#e30613] text-[#e30613]'
          : 'cursor-not-allowed border-[#d1d5db] text-[#9ca3af]'
      }`}
    >
      <span className="whitespace-nowrap">Thêm vào giỏ</span>
    </button>
  </article>
);

export default Home;
