import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgePercent,
  ChevronRight,
  Droplet,
  Flame,
  Package,
  Search,
  Settings,
  Tag,
} from 'lucide-react';

import { Product } from '../../types/product';
import { productService } from '../../services/productService';
import { getProductPricing } from '../../utils/productPricing';
import { useSEO } from '../../hooks/useSEO';
import { useCart } from '../../contexts/CartContext';
import { HERO_IMAGE, PRODUCT_PLACEHOLDER } from '../../data/yanmarStorefront';

type HomeProduct = {
  id: string;
  name: string;
  code: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  discountLabel?: string;
  raw?: Product;
};

const CATEGORY_LINKS = [
  { title: 'Phụ tùng', icon: Settings },
  { title: 'Nhớt động cơ', icon: Droplet },
  { title: 'Lọc gió & lọc nhớt', icon: Package },
  { title: 'Khuyến mãi', icon: BadgePercent },
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
    code: product.sku || product.brand || 'Yanmar chính hãng',
    description: product.short_description || product.description || 'Phụ tùng chính hãng',
    price: pricing.currentPrice || Number(product.price || 0),
    originalPrice,
    discountLabel: discount,
    image,
    raw: product,
  };
};

const Home = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
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
  }, []);

  const apiProducts = useMemo(() => products.map(toHomeProduct), [products]);

  const bestProducts = useMemo(
    () => apiProducts.slice(0, 3),
    [apiProducts],
  );

  const saleProducts = useMemo(() => {
    const discounted = apiProducts.filter((product) => product.discountLabel).slice(0, 3);
    return discounted;
  }, [apiProducts]);

  const addProductToCart = (product: HomeProduct) => {
    addToCart({
      product_id: product.raw?.id,
      sku: product.raw?.sku || product.code,
      title: product.name,
      image: product.image,
      price: product.price,
      variant_label: product.code,
    });
  };

  const buyNow = (product: HomeProduct) => {
    addProductToCart(product);
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-white pb-[calc(env(safe-area-inset-bottom,0px)+5.8rem)] text-[#101010] md:bg-[#f5f5f5] md:pb-16">
      <div className="mx-auto w-full max-w-[944px] bg-white font-sans md:shadow-2xl md:shadow-black/10">
        <section className="overflow-hidden border-b border-[#e4e4e4] bg-[#d70918]">
          <img
            src={HERO_IMAGE}
            alt="Phụ tùng và nhớt chính hãng Yanmar"
            className="block aspect-[944/317] w-full object-cover"
          />
        </section>

        <main className="px-3.5 pt-4 sm:px-6">
          <label className="flex h-[4.35rem] items-center gap-3 rounded-[1.15rem] border border-[#dedede] bg-white px-5 text-[#8b8b8b] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <Search size={31} strokeWidth={2.5} className="shrink-0 text-[#777]" />
            <input
              type="search"
              placeholder="Tìm phụ tùng, nhớt..."
              className="h-full min-w-0 flex-1 bg-transparent text-[1.35rem] font-medium outline-none placeholder:text-[#9b9b9b] max-[390px]:text-[1.05rem]"
              onFocus={() => navigate('/products')}
            />
          </label>

          <div className="mt-4 grid grid-cols-4 gap-3 max-[390px]:gap-2">
            {CATEGORY_LINKS.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.title}
                  type="button"
                  onClick={() => navigate('/products')}
                  className="flex min-h-[5.6rem] flex-col items-center justify-center rounded-xl border border-[#e4e4e4] bg-white px-1.5 py-2 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                >
                  <Icon size={38} strokeWidth={2.8} className="text-[#e30613]" />
                  <span className="mt-2 text-[0.92rem] font-black leading-[1.06] text-[#111] max-[390px]:text-[0.78rem]">
                    {category.title}
                  </span>
                </button>
              );
            })}
          </div>

          <ProductSection
            title="Sản phẩm bán chạy"
            icon={<Flame size={24} fill="#e30613" className="text-[#e30613]" />}
            products={bestProducts}
            loading={(loading || loadFailed) && products.length === 0}
            onAdd={addProductToCart}
            onBuy={buyNow}
          />

          {(saleProducts.length > 0 || ((loading || loadFailed) && products.length === 0)) && (
            <ProductSection
              title="Đang giảm giá"
              icon={<Tag size={24} fill="#e30613" className="text-[#e30613]" />}
              products={saleProducts}
              loading={(loading || loadFailed) && products.length === 0}
              onAdd={addProductToCart}
              onBuy={buyNow}
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
  onAdd: (product: HomeProduct) => void;
  onBuy: (product: HomeProduct) => void;
};

const ProductSection = ({ title, icon, products, loading = false, onAdd, onBuy }: ProductSectionProps) => (
  <section className="mt-5">
    <div className="mb-2.5 flex items-center justify-between">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <h2 className="truncate font-sans text-[1.35rem] font-black leading-tight text-[#111] max-[390px]:text-[1.12rem]">
          {title}
        </h2>
      </div>
      <button
        type="button"
        className="flex shrink-0 items-center gap-1 text-[1rem] font-medium text-[#e30613] max-[390px]:text-[0.84rem]"
      >
        Xem tất cả
        <ChevronRight size={19} strokeWidth={2.6} />
      </button>
    </div>

    <div className="grid grid-cols-3 gap-2.5 max-[390px]:gap-2">
      {loading
        ? Array.from({ length: 3 }).map((_, index) => <ProductCardSkeleton key={index} />)
        : products.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={onAdd} onBuy={onBuy} />
          ))}
    </div>
  </section>
);

const ProductCardSkeleton = () => (
  <div className="rounded-xl border border-[#e3e3e3] bg-white p-2 shadow-[0_1px_5px_rgba(0,0,0,0.06)]">
    <div className="h-[6rem] rounded-lg bg-[#f2f2f2] max-[390px]:h-[5rem]" />
    <div className="mt-2 h-4 rounded bg-[#eeeeee]" />
    <div className="mt-1 h-3 w-3/4 rounded bg-[#eeeeee]" />
    <div className="mt-4 h-5 w-4/5 rounded bg-[#eeeeee]" />
    <div className="mt-3 h-8 rounded-md bg-[#eeeeee]" />
    <div className="mt-1.5 h-7 rounded-md bg-[#f5f5f5]" />
  </div>
);

type ProductCardProps = {
  product: HomeProduct;
  onAdd: (product: HomeProduct) => void;
  onBuy: (product: HomeProduct) => void;
};

const ProductCard = ({ product, onAdd, onBuy }: ProductCardProps) => (
  <article className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#e3e3e3] bg-white p-2 shadow-[0_1px_5px_rgba(0,0,0,0.06)]">
    {product.discountLabel && (
      <div className="absolute left-1.5 top-1.5 z-10 rounded-md bg-[#e30613] px-1.5 py-0.5 text-[0.85rem] font-black leading-none text-white shadow-sm">
        {product.discountLabel}
      </div>
    )}

    <div className="flex h-[7.25rem] items-center justify-center rounded-lg bg-white max-[430px]:h-[6rem] max-[390px]:h-[5rem]">
      <img src={product.image} alt={product.name} className="max-h-full max-w-full object-contain" />
    </div>

    <div className="mt-1 flex min-h-[6.7rem] flex-1 flex-col">
      <h3 className="line-clamp-2 font-sans text-[0.94rem] font-black leading-[1.08] text-[#111] max-[390px]:text-[0.78rem]">
        {product.name}
      </h3>
      <p className="mt-1 line-clamp-1 text-[0.82rem] leading-tight text-[#686868] max-[390px]:text-[0.68rem]">
        {product.code}
      </p>
      <p className="line-clamp-2 text-[0.78rem] leading-tight text-[#686868] max-[390px]:text-[0.65rem]">
        {product.description}
      </p>
      <div className="mt-auto pt-1.5">
        <div className="text-[1.12rem] font-black leading-none text-[#e30613] max-[390px]:text-[0.93rem]">
          {formatVnd(product.price)}
        </div>
        {product.originalPrice && (
          <div className="mt-1 text-[0.78rem] leading-none text-[#7f7f7f] line-through max-[390px]:text-[0.65rem]">
            {formatVnd(product.originalPrice)}
          </div>
        )}
      </div>
    </div>

    <button
      type="button"
      onClick={() => onBuy(product)}
      className="mt-2 h-8 rounded-md bg-[#e30613] text-[0.98rem] font-black text-white shadow-[0_2px_0_rgba(120,0,8,0.15)] active:translate-y-px max-[390px]:h-7 max-[390px]:text-[0.8rem]"
    >
      Mua ngay
    </button>
    <button
      type="button"
      onClick={() => onAdd(product)}
      className="mt-1.5 flex h-7 items-center justify-center rounded-md border border-[#e30613] bg-white px-1 text-[0.78rem] font-medium leading-none text-[#e30613] active:bg-[#fff1f2] max-[390px]:h-6 max-[390px]:text-[0.65rem]"
    >
      <span className="whitespace-nowrap">Thêm vào giỏ</span>
    </button>
  </article>
);

export default Home;
