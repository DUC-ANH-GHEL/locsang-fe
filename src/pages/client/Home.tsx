import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import { ShieldCheck, Truck, ArrowRight, Scissors, ShoppingBasket, Quote, ChevronLeft, ChevronRight } from 'lucide-react';

import { Product } from '../../types/product';
import { homeContentService, HomeContentPayload } from '../../services/homeContentService';
import { customerStoryService } from '../../services/customerStoryService';
import { productService } from '../../services/productService';
import { getProductPricing } from '../../utils/productPricing';
import { toProductDetailPath } from '../../utils/productUrl';
import { useSEO } from '../../hooks/useSEO';

const STORE_DEFAULT_IMAGE_URL = 'https://res.cloudinary.com/diwxfpt92/image/upload/v1770981822/logo_d2wmlf.png';

type SpotlightCategory = {
  id: number;
  name: string;
  description: string;
  image: string;
  count: number;
};

type HomeCommunityItem = {
  image_url: string;
  alt_text?: string;
  link?: string;
};

const DEFAULT_HOME_CONTENT: HomeContentPayload = {
  hero_badge: 'Bộ sưu tập mới mỗi tuần',
  hero_title: 'Lộc Sang',
  hero_headline_line1: 'Sản Phẩm Chọn Lọc -',
  hero_headline_line2: 'Bé Yêu Lung Linh',
  hero_subtitle: 'Mặc đẹp cho bé cưng, thoải mái cả ngày',
  hero_description: 'Mỗi mẫu đều được chọn kỹ về chất liệu và phom dáng để bé cưng mặc êm, dễ chịu và lên hình xinh xắn.',
  hero_image_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1900&q=80',
  primary_cta_text: 'Mua ngay',
  primary_cta_link: '/products',
  secondary_cta_text: 'Tư vấn chọn cỡ',
  secondary_cta_link: '/contact',
  header_brand_name: 'Lộc Sang',
  header_brand_tagline: 'Mua sắm chọn lọc, giao nhanh toàn quốc',
  header_nav_shop_text: 'Cửa hàng',
  header_nav_new_arrivals_text: 'Hàng mới về',
  header_nav_tips_text: 'Mẹo chăm sóc',
  header_nav_shorts_text: 'Lộc Sang Shorts',
  header_nav_orders_text: 'Đơn hàng',
  footer_brand_name: 'Lộc Sang',
  footer_desktop_caption: '© 2024 Lộc Sang. Mua sắm tiện lợi, giao nhanh toàn quốc.',
  footer_mobile_description: 'Nơi hội tụ những sản phẩm thiết thực, đẹp và dễ mua cho mọi gia đình.',
  footer_products_title: 'sản phẩm',
  footer_products_item_1: 'Sản Phẩm Mới',
  footer_products_item_2: 'Ưu Đãi Nổi Bật',
  footer_products_item_3: 'Đồ Chơi Bé Yêu',
  footer_products_item_4: 'Giường & Nệm',
  footer_info_title: 'thông tin',
  footer_info_item_1: 'Thông tin giao hàng',
  footer_info_item_2: 'Chính sách đổi trả',
  footer_info_item_3: 'Hướng dẫn chọn size',
  footer_info_item_4: 'Liên hệ về chúng mình',
  footer_social_title: 'mạng xã hội',
  footer_social_item_1: 'Instagram',
  footer_social_item_2: 'Pinterest',
  footer_social_item_3: 'Facebook',
  footer_social_item_4: 'TikTok',
  footer_social_instagram_url: '#',
  footer_social_pinterest_url: '#',
  footer_social_facebook_url: '#',
  footer_social_tiktok_url: '#',
  footer_policy_title: 'Chính sách',
  footer_policy_item_1: 'Đổi trả 7 ngày',
  footer_policy_item_2: 'Bảo hành 6 tháng',
  footer_policy_item_3: 'Vận chuyển',
  footer_contact_title: 'Liên hệ',
  footer_contact_hotline: 'Hotline: 1900 8888',
  footer_contact_email: 'Email: hello@locsang.shop',
  footer_copyright_text: '© 2024 Lộc Sang. All rights reserved.',
  hero_feature_1_title: 'Chất liệu êm',
  hero_feature_1_desc: 'Chọn lọc kỹ, dùng bền đẹp.',
  hero_feature_2_title: 'Giao nhanh',
  hero_feature_2_desc: 'Đóng gói gọn gàng, gửi liền tay.',
  hero_feature_3_title: 'Hàng đang bán',
  hero_feature_3_desc: 'Hiển thị theo dữ liệu sản phẩm active.',
  hero_stats_title: 'Số liệu nhanh tại cửa hàng',
  hero_stats_products_label: 'Sản phẩm active',
  hero_stats_categories_label: 'Danh mục nổi bật',
  hero_stats_price_label: 'Khoảng giá hiện tại',
  hero_stats_catalog_link_text: 'Xem toàn bộ catalog',
  category_section_title: 'Danh mục đang chạy tốt',
  category_section_desktop_title: 'Mua sắm theo danh mục sản phẩm',
  category_section_desktop_subtitle: 'Khám phá những món đồ thiết yếu cho bé yêu',
  category_section_link_text: 'Xem toàn bộ cửa hàng',
  mobile_category_title: 'Khám Phá Theo Loại',
  category_section_subtitle: 'Tự động gom từ dữ liệu sản phẩm active hiện tại.',
  category_section_view_all_text: 'Xem tất cả',
  category_section_empty_text: 'Chưa có dữ liệu danh mục từ hệ thống.',
  category_section_loading_text: 'Đang tải dữ liệu trang chủ...',
  new_arrivals_title: 'Sản phẩm mới lên kệ',
  best_seller_section_title: 'Sản Phẩm Bán Chạy',
  best_seller_section_subtitle: 'Những sản phẩm được khách hàng yêu thích nhất tại Lộc Sang.',
  best_seller_badge_text: 'Bán chạy nhất',
  mobile_best_seller_title: 'Bán Chạy Nhất',
  mobile_view_all_text: 'Xem tất cả',
  new_arrivals_subtitle: 'Hiển thị realtime theo dữ liệu public API.',
  new_arrivals_live_badge: 'Live data',
  new_arrivals_price_prefix: 'Mức giá hiện có từ',
  new_arrivals_empty_text: 'Chưa có sản phẩm active để hiển thị.',
  bottom_cta_title: 'Cần tư vấn size nhanh?',
  bottom_cta_description: 'Lộc Sang hỗ trợ tư vấn nhanh để bạn chọn đúng sản phẩm ngay từ lần đầu.',
  bottom_cta_button_text: 'Liên hệ ngay',
  bottom_cta_button_link: '/contact',
  shorts_section_title: 'Lộc Sang Shorts',
  shorts_section_subtitle: 'Lướt nhanh video sản phẩm mới nhất',
  shorts_section_link_text: 'Xem Shorts',
  shorts_items: [],
  community_section_title: 'Cộng Đồng #LocSang',
  community_section_subtitle: 'Chia sẻ khoảnh khắc hạnh phúc của bé yêu cùng chúng mình nhé!',
  testimonial_section_title: 'Câu chuyện từ khách hàng',
  delivery_feature_title: 'Giao Hàng Nhanh',
  delivery_feature_desc: 'Vận chuyển hỏa tốc đến tận tay bé yêu để niềm vui không phải chờ.',
  community_items: [],
};

const Home = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [homeContent, setHomeContent] = useState<HomeContentPayload>(DEFAULT_HOME_CONTENT);
  const [customerStories, setCustomerStories] = useState<any[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);
  const [categoryImageIndexById, setCategoryImageIndexById] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const formatVnd = (value: number): string =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);

  const getRatingText = (product: Product): string => {
    const avg = Number(product?.rating_summary?.average || 0);
    const count = Number(product?.rating_summary?.count || 0);
    if (avg > 0 && count > 0) return `${avg.toFixed(1)} (${count})`;
    return '5.0 (0)';
  };

  useSEO({
    title: 'San Pham Chon Loc',
    description: 'Lộc Sang - San pham chon loc, gia tot va giao nhanh toan quoc.',
    canonicalPath: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Lộc Sang',
      url: 'https://locsang.shop',
      logo: 'https://res.cloudinary.com/diwxfpt92/image/upload/v1770981822/logo_d2wmlf.png',
      sameAs: [],
    },
  });

  useEffect(() => {
    let cancelled = false;

    const loadStorefrontData = async () => {
      try {
        setLoading(true);
        const data = await productService.getStorefrontProducts({
          status: 'active',
          limit: 100,
          page: 1,
        });
        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStorefrontData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!customerStories.length) {
      setStoryIndex(0);
      return;
    }
    if (storyIndex >= customerStories.length) {
      setStoryIndex(0);
    }
  }, [customerStories, storyIndex]);

  useEffect(() => {
    if (customerStories.length <= 1 || isStoryPaused) return;

    const timer = window.setInterval(() => {
      setStoryIndex((prev) => (prev + 1) % customerStories.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [customerStories, isStoryPaused]);

  useEffect(() => {
    let cancelled = false;

    const loadStories = async () => {
      try {
        const res = await customerStoryService.getPublicStories(12);
        if (!cancelled) setCustomerStories(Array.isArray(res?.data) ? res.data : []);
      } catch {
        if (!cancelled) setCustomerStories([]);
      }
    };

    loadStories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadHomeContent = async () => {
      try {
        const res = await homeContentService.getPublicHomeContent();
        if (!cancelled) {
          setHomeContent({ ...DEFAULT_HOME_CONTENT, ...(res?.content || {}) });
        }
      } catch {
        if (!cancelled) {
          setHomeContent(DEFAULT_HOME_CONTENT);
        }
      }
    };

    loadHomeContent();
    return () => {
      cancelled = true;
    };
  }, []);

  const featuredProducts = useMemo(() => products.slice(0, 8), [products]);

  const spotlightCategories = useMemo<SpotlightCategory[]>(() => {
    const map = new Map<number, SpotlightCategory>();

    for (const p of products) {
      const id = Number(p.category_id || 0);
      if (!id) continue;
      const current = map.get(id);
      if (current) {
        current.count += 1;
        continue;
      }

      map.set(id, {
        id,
        name: p.category_name || `Danh mục ${id}`,
        description: `Có ${1} sản phẩm đang mở bán`,
        image: p.images?.[0] || 'https://res.cloudinary.com/diwxfpt92/image/upload/v1770981822/logo_d2wmlf.png',
        count: 1,
      });
    }

    return Array.from(map.values())
      .map((c) => ({ ...c, description: `Có ${c.count} sản phẩm đang mở bán` }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [products]);

  const categoryImagePoolById = useMemo<Record<number, string[]>>(() => {
    const pool: Record<number, string[]> = {};

    for (const p of products) {
      const categoryId = Number(p.category_id || 0);
      if (!categoryId) continue;

      const images = Array.isArray(p.images)
        ? p.images.map((src) => String(src || '').trim()).filter(Boolean)
        : [];

      if (!images.length) continue;

      if (!pool[categoryId]) pool[categoryId] = [];
      pool[categoryId].push(...images);
    }

    Object.keys(pool).forEach((key) => {
      const id = Number(key);
      pool[id] = Array.from(new Set(pool[id] || []));
    });

    return pool;
  }, [products]);

  useEffect(() => {
    if (!spotlightCategories.length) {
      setCategoryImageIndexById({});
      return;
    }

    setCategoryImageIndexById((prev) => {
      const next: Record<number, number> = {};

      for (const category of spotlightCategories) {
        const candidates = categoryImagePoolById[category.id] || [];
        if (!candidates.length) {
          next[category.id] = 0;
          continue;
        }

        const prevIndex = Number(prev[category.id]);
        if (Number.isFinite(prevIndex) && prevIndex >= 0 && prevIndex < candidates.length) {
          next[category.id] = prevIndex;
        } else {
          next[category.id] = Math.floor(Math.random() * candidates.length);
        }
      }

      return next;
    });
  }, [spotlightCategories, categoryImagePoolById]);

  useEffect(() => {
    if (!spotlightCategories.length) return;

    const timer = window.setInterval(() => {
      setCategoryImageIndexById((prev) => {
        const next = { ...prev };

        for (const category of spotlightCategories) {
          const candidates = categoryImagePoolById[category.id] || [];
          if (candidates.length <= 1) continue;

          const currentIndex = Number(next[category.id] ?? 0);
          const safeIndex = Number.isFinite(currentIndex) ? currentIndex : 0;
          next[category.id] = (safeIndex + 1) % candidates.length;
        }

        return next;
      });
    }, 10000);

    return () => window.clearInterval(timer);
  }, [spotlightCategories, categoryImagePoolById]);

  const categoryDisplayImageById = useMemo<Record<number, string>>(() => {
    const map: Record<number, string> = {};

    for (const category of spotlightCategories) {
      const candidates = categoryImagePoolById[category.id] || [];
      const fallback = category.image;
      if (!candidates.length) {
        map[category.id] = fallback;
        continue;
      }

      const index = Number(categoryImageIndexById[category.id] ?? 0);
      const safeIndex = Number.isFinite(index) ? Math.max(0, Math.min(candidates.length - 1, index)) : 0;
      map[category.id] = candidates[safeIndex] || fallback;
    }

    return map;
  }, [spotlightCategories, categoryImagePoolById, categoryImageIndexById]);

  const minPrice = useMemo(() => {
    const prices = products.map((p) => getProductPricing(p).currentPrice).filter((x) => Number.isFinite(x) && x > 0);
    return prices.length ? Math.min(...prices) : 0;
  }, [products]);

  const maxPrice = useMemo(() => {
    const prices = products.map((p) => getProductPricing(p).currentPrice).filter((x) => Number.isFinite(x) && x > 0);
    return prices.length ? Math.max(...prices) : 0;
  }, [products]);

  const fallbackHero =
    'https://res.cloudinary.com/diwxfpt92/image/upload/v1770981822/logo_d2wmlf.png';

  const heroImage = homeContent.hero_image_url || DEFAULT_HOME_CONTENT.hero_image_url;

  const bestSellerProducts = useMemo(() => featuredProducts.slice(0, 3), [featuredProducts]);

  const galleryImages = useMemo(() => {
    const images = products
      .flatMap((p) => (Array.isArray(p.images) ? p.images : []))
      .filter((src): src is string => Boolean(src && String(src).trim()));
    const unique = Array.from(new Set(images));
    return unique.slice(0, 6);
  }, [products]);

  const communityItems = useMemo<HomeCommunityItem[]>(() => {
    const raw = Array.isArray(homeContent?.community_items) ? homeContent.community_items : [];
    return raw
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const imageUrl = String((item as any).image_url || '').trim();
        if (!imageUrl) return null;
        return {
          image_url: imageUrl,
          alt_text: String((item as any).alt_text || '').trim() || undefined,
          link: String((item as any).link || '').trim() || undefined,
        };
      })
      .filter((item): item is HomeCommunityItem => Boolean(item));
  }, [homeContent?.community_items]);

  const communityImages = useMemo(() => {
    const fromAdmin = communityItems;
    if (fromAdmin.length) return fromAdmin;

    const fromProducts = galleryImages.slice(0, 6).map((src, index) => ({
      image_url: src,
      alt_text: `Community ${index + 1}`,
    }));
    const pool = [...fromProducts];
    while (pool.length < 4) {
      pool.push({ image_url: heroImage || fallbackHero, alt_text: 'Community image' });
    }
    return pool;
  }, [communityItems, galleryImages, heroImage]);

  const shortsPreviewItems = useMemo(() => {
    const raw = Array.isArray(homeContent?.shorts_items) ? homeContent.shorts_items : [];
    return raw
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const url = String(item.url || '').trim();
        if (!url) return null;
        return {
          id: `${index}-${url}`,
          title: String(item.title || '').trim() || `Video ${index + 1}`,
          thumbnail: String(item.thumbnail_url || '').trim() || STORE_DEFAULT_IMAGE_URL,
        };
      })
      .filter(Boolean)
      .slice(0, 4);
  }, [homeContent]);

  const testimonialProductImage =
    products.find((p) => p.images?.[0])?.images?.[0] ||
    'https://res.cloudinary.com/diwxfpt92/image/upload/v1770981822/logo_d2wmlf.png';

  const activeStory = useMemo(() => {
    if (!customerStories.length) return null;
    return customerStories[storyIndex] || customerStories[0];
  }, [customerStories, storyIndex]);
  const testimonialImage = activeStory?.image_url || testimonialProductImage;
  const testimonialName = activeStory
    ? `${activeStory.customer_name}${activeStory.pet_name ? ` & ${activeStory.pet_name}` : ''}`
    : 'Chị Lan & Bé Mochi';
  const testimonialTitle = activeStory?.customer_title || 'Khách hàng thân thiết';
  const testimonialQuote = activeStory?.quote || 'Mình rất hài lòng với chất lượng sản phẩm tại Lộc Sang. Hàng đóng gói đẹp, giao nhanh và đúng mô tả. Sẽ ủng hộ shop dài dài!';
  const testimonialRating = Math.max(1, Math.min(5, Number(activeStory?.rating || 5)));
  const totalStories = customerStories.length;

  const goToStory = (index: number) => {
    if (!totalStories) return;
    const normalized = (index + totalStories) % totalStories;
    setStoryIndex(normalized);
  };

  const goToNextStory = () => goToStory(storyIndex + 1);

  const goToPrevStory = () => goToStory(storyIndex - 1);

  const handleStoryDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 70;
    if (info.offset.x <= -swipeThreshold) {
      goToNextStory();
      return;
    }
    if (info.offset.x >= swipeThreshold) {
      goToPrevStory();
    }
  };

  const heroDisplayImage = heroImage || fallbackHero;

  return (
    <div className="min-h-screen bg-[#fff9f0] text-[#353229]">
      {/* Desktop layout */}
      <div className="hidden md:block px-6 pb-20">
        <section className="mx-auto max-w-7xl pt-8">
          <div className="relative overflow-hidden rounded-[2.2rem] bg-[#f4ede2] p-8 lg:p-14">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(138,79,65,0.08) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-2 items-center">
              <div className="space-y-6">
                <span className="inline-flex rounded-full bg-[#ff9ea4]/30 px-4 py-2 text-sm font-semibold text-[#9e404a]">
                  {homeContent.hero_badge || DEFAULT_HOME_CONTENT.hero_badge}
                </span>
                <h1 className="text-5xl lg:text-[4rem] font-extrabold leading-[0.96] tracking-tight text-[#2f2b24]">
                  {homeContent.hero_headline_line1 || DEFAULT_HOME_CONTENT.hero_headline_line1}
                  <span className="block italic text-[#8a4f41]">{homeContent.hero_headline_line2 || DEFAULT_HOME_CONTENT.hero_headline_line2}</span>
                </h1>
                <p className="max-w-xl text-lg leading-relaxed text-[#635f54]">
                  {homeContent.hero_description || DEFAULT_HOME_CONTENT.hero_description}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    to={homeContent.primary_cta_link || DEFAULT_HOME_CONTENT.primary_cta_link}
                    className="rounded-full bg-[#8a4f41] px-10 py-5 text-lg font-bold text-white shadow-lg"
                  >
                    {homeContent.primary_cta_text || DEFAULT_HOME_CONTENT.primary_cta_text}
                  </Link>
                  <Link
                    to={homeContent.secondary_cta_link || DEFAULT_HOME_CONTENT.secondary_cta_link}
                    className="rounded-full bg-white px-10 py-5 text-lg font-bold text-[#8a4f41] shadow-sm"
                  >
                    {homeContent.secondary_cta_text || DEFAULT_HOME_CONTENT.secondary_cta_text}
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="overflow-hidden rounded-[1.75rem] shadow-2xl">
                  <img src={heroDisplayImage} alt="Hero" className="h-[500px] w-full object-cover" />
                </div>
                <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-[#c7fce9] opacity-60 blur-xl" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-7xl">
          <div className="mb-12 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold">{homeContent.category_section_desktop_title || DEFAULT_HOME_CONTENT.category_section_desktop_title}</h2>
              <p className="mt-2 text-[#635f54]">{homeContent.category_section_desktop_subtitle || DEFAULT_HOME_CONTENT.category_section_desktop_subtitle}</p>
            </div>
            <Link to="/products" className="inline-flex items-center gap-2 font-bold text-[#8a4f41]">
              {homeContent.category_section_link_text || DEFAULT_HOME_CONTENT.category_section_link_text} <ArrowRight size={18} />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-7">
            {spotlightCategories.map((category) => (
              <Link key={category.id} to="/products" className="group text-center">
                <div className="relative mb-6 aspect-square overflow-hidden rounded-full border-[10px] border-[#f4ede2] bg-[#eee7db] shadow-sm transition-all duration-500 group-hover:shadow-xl">
                  <img src={categoryDisplayImageById[category.id] || category.image} alt={category.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                </div>
                <h3 className="text-lg font-bold transition-colors group-hover:text-[#8a4f41]">{category.name}</h3>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-20 bg-[#f9f3e9] py-24">
          <div className="mx-auto max-w-7xl px-2">
            <div className="mb-16 text-center">
              <h2 className="text-4xl font-extrabold">{homeContent.best_seller_section_title || DEFAULT_HOME_CONTENT.best_seller_section_title}</h2>
              <p className="mx-auto mt-4 max-w-xl text-[#635f54]">{homeContent.best_seller_section_subtitle || DEFAULT_HOME_CONTENT.best_seller_section_subtitle}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {bestSellerProducts.map((product) => {
                const pricing = getProductPricing(product);
                return (
                  <Link key={product.id} to={toProductDetailPath(product)} className="rounded-[1.35rem] bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl">
                    <div className="relative mb-5 aspect-[4/3] overflow-hidden rounded-[1rem] bg-[#eee7db]">
                      <span className="absolute left-4 top-4 z-10 rounded-full bg-[#8a4f41] px-3 py-1 text-xs font-bold text-white">{homeContent.best_seller_badge_text || DEFAULT_HOME_CONTENT.best_seller_badge_text}</span>
                      <img src={product.images?.[0] || fallbackHero} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                    </div>
                    <h3 className="mb-2 text-[1.35rem] font-bold leading-tight">{product.name}</h3>
                    <p className="mb-4 text-sm text-[#635f54] line-clamp-2">{product.short_description || product.description || 'Sản phẩm nổi bật của Lộc Sang.'}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap items-end gap-2">
                        {pricing.hasDiscount && pricing.originalPrice && (
                          <span className="text-sm font-semibold text-[#9a9489] line-through">{formatVnd(pricing.originalPrice)}</span>
                        )}
                        <span className="text-lg font-extrabold text-[#8a4f41]">{formatVnd(pricing.currentPrice)}</span>
                      </div>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#c7fce9] text-[#316354]">
                        <ShoppingBasket size={18} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="rounded-2xl bg-[#f9f3e9] p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#c7fce9] text-[#316354]"><ShieldCheck size={28} /></div>
            <h3 className="mb-4 text-xl font-bold">{homeContent.hero_feature_1_title || 'Chất Liệu Cao Cấp'}</h3>
            <p className="text-[#635f54]">{homeContent.hero_feature_1_desc || 'Chọn lọc kỹ, bền bỉ và dễ dùng hằng ngày.'}</p>
          </div>
          <div className="rounded-2xl bg-[#f9f3e9] p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#ff9ea4] text-[#691724]"><Scissors size={26} /></div>
            <h3 className="mb-4 text-xl font-bold">{homeContent.hero_feature_2_title || 'Chế Tác Thủ Công'}</h3>
            <p className="text-[#635f54]">{homeContent.hero_feature_2_desc || 'Mỗi sản phẩm đều được làm tỉ mỉ bằng tay.'}</p>
          </div>
          <div className="rounded-2xl bg-[#f9f3e9] p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#fdb19f] text-[#633024]"><Truck size={26} /></div>
            <h3 className="mb-4 text-xl font-bold">{homeContent.delivery_feature_title || DEFAULT_HOME_CONTENT.delivery_feature_title}</h3>
            <p className="text-[#635f54]">{homeContent.delivery_feature_desc || DEFAULT_HOME_CONTENT.delivery_feature_desc}</p>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-7xl">
          <div
            className="relative overflow-hidden rounded-[1.2rem] bg-[#e9e2d4] p-12"
            onMouseEnter={() => setIsStoryPaused(true)}
            onMouseLeave={() => setIsStoryPaused(false)}
            onTouchStart={() => setIsStoryPaused(true)}
            onTouchEnd={() => setIsStoryPaused(false)}
          >
            <div className="absolute right-8 top-8 text-[#b7b1a4]">
              <Quote size={54} />
            </div>
            <h2 className="relative z-10 mb-12 text-center text-3xl font-extrabold">{homeContent.testimonial_section_title || DEFAULT_HOME_CONTENT.testimonial_section_title}</h2>
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
              drag={customerStories.length > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.08}
              onDragEnd={handleStoryDragEnd}
            >
              <div className="relative mx-auto w-full aspect-square max-w-sm overflow-hidden rounded-full border-8 border-white shadow-xl">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.img
                    key={`story-image-${activeStory?.id ?? storyIndex}`}
                    src={testimonialImage}
                    alt={testimonialName}
                    className="absolute inset-0 h-full w-full object-cover"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                </AnimatePresence>
              </div>
              <div className="relative min-h-[260px] rounded-xl bg-white p-8 shadow-lg">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`story-content-${activeStory?.id ?? storyIndex}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  >
                    <p className="mb-6 text-lg italic leading-relaxed text-[#635f54]">
                      "{testimonialQuote}"
                    </p>
                    <div className="font-bold">{testimonialName}</div>
                    <div className="mt-1 text-xs text-[#7b766b]">{testimonialTitle}</div>
                    <div className="mt-1 text-[#9e404a]">{'★'.repeat(testimonialRating)}</div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {customerStories.length > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={goToPrevStory}
                  aria-label="Câu chuyện trước"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#6f3a2f] shadow-sm transition hover:bg-white"
                >
                  <ChevronLeft size={18} />
                </button>
                {customerStories.map((story, index) => (
                  <button
                    key={story.id || index}
                    type="button"
                    onClick={() => goToStory(index)}
                    aria-label={`Xem câu chuyện ${index + 1}`}
                    className={`h-2.5 rounded-full transition-all ${index === storyIndex ? 'w-8 bg-[#8a4f41]' : 'w-2.5 bg-[#c7bfb0]'}`}
                  />
                ))}
                <button
                  type="button"
                  onClick={goToNextStory}
                  aria-label="Câu chuyện tiếp theo"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#6f3a2f] shadow-sm transition hover:bg-white"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-7xl pb-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-extrabold">{homeContent.community_section_title || DEFAULT_HOME_CONTENT.community_section_title}</h2>
            <p className="text-[#635f54]">{homeContent.community_section_subtitle || DEFAULT_HOME_CONTENT.community_section_subtitle}</p>
          </div>
          <div className="grid h-[600px] grid-cols-2 md:grid-cols-4 gap-4">
            {communityImages.slice(0, 6).map((item, idx) => {
              const cls = idx === 0 ? 'row-span-2' : idx === 1 || idx === 5 ? 'col-span-2' : '';
              const cardClassName = `overflow-hidden rounded-xl shadow-lg block ${cls}`;

              if (item.link) {
                return (
                  <Link key={`${item.image_url}-${idx}`} to={item.link} className={cardClassName}>
                    <img src={item.image_url} alt={item.alt_text || `Community ${idx + 1}`} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                  </Link>
                );
              }

              return (
                <div key={`${item.image_url}-${idx}`} className={cardClassName}>
                  <img src={item.image_url} alt={item.alt_text || `Community ${idx + 1}`} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* Mobile layout */}
      <div className="md:hidden px-4 pt-3 pb-28">
        <section className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative overflow-hidden rounded-[2rem] bg-[#f3e2de] aspect-[4/5]"
          >
            <img src={heroDisplayImage} alt="Hero" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#fff9f0]/95 via-[#fff9f0]/56 to-[#2f2b24]/30" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="mt-3 text-[2.2rem] font-extrabold leading-[0.96] tracking-tight text-[#8a4f41]">
                {`${homeContent.hero_headline_line1 || DEFAULT_HOME_CONTENT.hero_headline_line1} ${homeContent.hero_headline_line2 || DEFAULT_HOME_CONTENT.hero_headline_line2}`.trim()}
              </h1>
              <p className="mt-3 max-w-xl text-sm text-[#635f54] line-clamp-3">
                {homeContent.hero_description || DEFAULT_HOME_CONTENT.hero_description}
              </p>
              <Link
                to={homeContent.primary_cta_link || DEFAULT_HOME_CONTENT.primary_cta_link}
                className="mt-5 inline-flex rounded-full bg-[#8a4f41] px-7 py-3 text-sm font-bold text-white shadow-lg"
              >
                {homeContent.primary_cta_text || DEFAULT_HOME_CONTENT.primary_cta_text}
              </Link>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl rounded-[1.6rem] bg-[#f4ede2] p-4">
          <h2 className="text-[2rem] font-bold">{homeContent.mobile_category_title || DEFAULT_HOME_CONTENT.mobile_category_title}</h2>
          {loading && (
            <div className="mt-5 rounded-2xl bg-[#f4ede2] px-4 py-3 text-sm text-[#635f54]">
              {homeContent.category_section_loading_text || DEFAULT_HOME_CONTENT.category_section_loading_text}
            </div>
          )}
          {!loading && spotlightCategories.length === 0 && (
            <div className="mt-5 rounded-2xl bg-[#f4ede2] px-4 py-3 text-sm text-[#635f54]">
              {homeContent.category_section_empty_text || DEFAULT_HOME_CONTENT.category_section_empty_text}
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 gap-4">
            {spotlightCategories.map((category) => (
              <Link key={category.id} to="/products" className="rounded-2xl bg-[#f9f3e9] p-3 text-center">
                <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border-[3px] border-[#fdb19f]">
                  <img src={categoryDisplayImageById[category.id] || category.image} alt={category.name} className="h-full w-full object-cover" />
                </div>
                <h3 className="mt-3 text-[15px] font-semibold text-[#353229]">{category.name}</h3>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-7xl">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-[2rem] font-bold">{homeContent.mobile_best_seller_title || DEFAULT_HOME_CONTENT.mobile_best_seller_title}</h2>
            <Link to="/products" className="text-sm font-semibold text-[#8a4f41]">{homeContent.mobile_view_all_text || DEFAULT_HOME_CONTENT.mobile_view_all_text}</Link>
          </div>
          <div className="space-y-4">
            {bestSellerProducts.map((product, idx) => {
              const pricing = getProductPricing(product);
              return (
                <Link
                  key={product.id}
                  to={toProductDetailPath(product)}
                  className="flex items-center gap-3 rounded-[1.4rem] bg-white p-2.5 shadow-sm"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.1rem] bg-[#f4ede2]">
                    <img src={product.images?.[0] || fallbackHero} alt={product.name} className="h-full w-full object-cover" />
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-[#ff9ea4] px-2 py-0.5 text-[9px] font-bold text-[#691724]">
                      {idx === 0 ? 'HOT' : 'NEW'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-[15px] font-bold leading-tight">{product.name}</h3>
                    <div className="mt-1 flex items-center gap-1 text-xs text-[#635f54]">
                      <span className="text-[#f3a78f]">★</span>
                      <span>{getRatingText(product)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex flex-wrap items-end gap-1.5">
                        {pricing.hasDiscount && pricing.originalPrice && (
                          <span className="text-[11px] font-semibold text-[#9a9489] line-through">{formatVnd(pricing.originalPrice)}</span>
                        )}
                        <span className="text-base font-extrabold text-[#8a4f41]">{formatVnd(pricing.currentPrice)}</span>
                      </div>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#c7fce9] text-[#316354]">
                        <ShoppingBasket size={15} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
            {!loading && bestSellerProducts.length === 0 && (
              <div className="rounded-2xl bg-white p-4 text-sm text-[#635f54]">
                {homeContent.new_arrivals_empty_text || DEFAULT_HOME_CONTENT.new_arrivals_empty_text}
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-7xl space-y-4 rounded-3xl bg-[#f4ede2] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#8a4f41]"><ShieldCheck size={20} /></div>
            <div>
              <h3 className="font-bold">{homeContent.hero_feature_1_title || 'Chất Liệu Cao Cấp'}</h3>
              <p className="text-xs text-[#635f54]">{homeContent.hero_feature_1_desc || 'Chọn lọc kỹ, phù hợp nhu cầu hằng ngày.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#8a4f41]"><Scissors size={18} /></div>
            <div>
              <h3 className="font-bold">{homeContent.hero_feature_2_title || 'Chế Tác Thủ Công'}</h3>
              <p className="text-xs text-[#635f54]">{homeContent.hero_feature_2_desc || 'Tỉ mỉ từng đường kim mũi chỉ.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#8a4f41]"><Truck size={18} /></div>
            <div>
              <h3 className="font-bold">{homeContent.delivery_feature_title || DEFAULT_HOME_CONTENT.delivery_feature_title}</h3>
              <p className="text-xs text-[#635f54]">{homeContent.delivery_feature_desc || DEFAULT_HOME_CONTENT.delivery_feature_desc}</p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-7xl">
          <div
            className="relative rounded-3xl bg-[#f9eee8] p-5"
            onTouchStart={() => setIsStoryPaused(true)}
            onTouchEnd={() => setIsStoryPaused(false)}
          >
            <div className="absolute right-4 top-4 text-[#c9bdb0]">
              <Quote size={34} />
            </div>
            <motion.div
              drag={customerStories.length > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleStoryDragEnd}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`story-mobile-${activeStory?.id ?? storyIndex}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <div className="mb-3 flex items-center gap-3 pr-10">
                    <img src={testimonialImage} alt={testimonialName} className="h-11 w-11 rounded-full border-2 border-white object-cover" />
                    <div>
                      <h2 className="text-[15px] font-bold">{testimonialName}</h2>
                      <p className="text-[11px] text-[#7b766b]">{testimonialTitle}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm italic text-[#635f54]">
                    "{testimonialQuote}"
                  </p>
                  <div className="mt-2 text-[#9e404a]">{'★'.repeat(testimonialRating)}</div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {customerStories.length > 1 && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={goToPrevStory}
                aria-label="Câu chuyện trước"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f4e6da] text-[#6f3a2f]"
              >
                <ChevronLeft size={16} />
              </button>
              {customerStories.map((story, index) => (
                <button
                  key={story.id || index}
                  type="button"
                  onClick={() => goToStory(index)}
                  aria-label={`Xem câu chuyện ${index + 1}`}
                  className={`h-2 rounded-full transition-all ${index === storyIndex ? 'w-7 bg-[#8a4f41]' : 'w-2 bg-[#d8cbbb]'}`}
                />
              ))}
              <button
                type="button"
                onClick={goToNextStory}
                aria-label="Câu chuyện tiếp theo"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f4e6da] text-[#6f3a2f]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>

        <section className="mx-auto mt-12 max-w-7xl">
          <div className="mb-8 rounded-[1.6rem] bg-[#111217] p-5 text-white md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{homeContent.shorts_section_title || DEFAULT_HOME_CONTENT.shorts_section_title}</h2>
                <p className="mt-1 text-sm text-[#d7d2ca]">{homeContent.shorts_section_subtitle || DEFAULT_HOME_CONTENT.shorts_section_subtitle}</p>
              </div>
              <Link
                to="/shorts"
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-black text-[#111217]"
              >
                {homeContent.shorts_section_link_text || DEFAULT_HOME_CONTENT.shorts_section_link_text}
              </Link>
            </div>

            {shortsPreviewItems.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {shortsPreviewItems.map((item) => (
                  <Link key={item.id} to="/shorts" className="group overflow-hidden rounded-xl bg-white/10">
                    <div className="aspect-[9/14] overflow-hidden">
                      <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    </div>
                    <div className="p-2.5 text-xs font-semibold text-[#efebe3] line-clamp-2">{item.title}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <h2 className="text-[2rem] font-bold">{homeContent.community_section_title || DEFAULT_HOME_CONTENT.community_section_title}</h2>
          <p className="mt-1 text-sm text-[#635f54]">{homeContent.community_section_subtitle || DEFAULT_HOME_CONTENT.community_section_subtitle}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {communityImages.slice(0, 4).map((item, idx) => (
              item.link ? (
                <Link
                  key={`${item.image_url}-${idx}`}
                  to={item.link}
                  className="overflow-hidden rounded-[1rem] bg-[#e9e2d4] aspect-square block"
                >
                  <img src={item.image_url} alt={item.alt_text || `Community ${idx + 1}`} className="h-full w-full object-cover" />
                </Link>
              ) : (
                <div key={`${item.image_url}-${idx}`} className="overflow-hidden rounded-[1rem] bg-[#e9e2d4] aspect-square block">
                  <img src={item.image_url} alt={item.alt_text || `Community ${idx + 1}`} className="h-full w-full object-cover" />
                </div>
              )
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Home;
