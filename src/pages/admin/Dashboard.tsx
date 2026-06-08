// import React, { useState } from 'react';
// import Header from '../../components/layout/Header';
// import Sidebar from '../../components/layout/Sidebar';
// import Breadcrumb from '../../components/layout/Breadcrumb';
// import KpiCard from '../../components/dashboard/KpiCard';
// import RevenueChart from '../../components/dashboard/RevenueChart';
// import TopProductCard from '../../components/dashboard/TopProductCard';
// import OrdersTable from '../../components/dashboard/OrdersTable';
// import CustomerCard from '../../components/dashboard/CustomerCard';

// import {
//   DollarSign,
//   ShoppingCart,
//   Users,
//   TrendingUp
// } from 'lucide-react';

// const Dashboard = () => {
//   const [darkMode, setDarkMode] = useState(false);
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [chartType, setChartType] = useState<'line' | 'bar'>('line');
//   const [timeRange, setTimeRange] = useState<'7days' | '30days' | 'months'>('7days');
//   const loading = false;

//   // Dummy Data
//   const kpis = [
//     { icon: <DollarSign size={20} />, title: 'Tổng doanh thu', value: '₫2,300,000', subtext: 'Tháng này', trend: 12, color: 'bg-blue-100 text-blue-600' },
//     { icon: <ShoppingCart size={20} />, title: 'Đơn hàng', value: '128', subtext: 'Tuần này', trend: 5, color: 'bg-green-100 text-green-600' },
//     { icon: <Users size={20} />, title: 'Khách hàng mới', value: '34', subtext: 'Tuần này', trend: -3, color: 'bg-yellow-100 text-yellow-600' },
//     { icon: <TrendingUp size={20} />, title: 'Tăng trưởng', value: '8.2%', subtext: 'So với tháng trước', trend: 8, color: 'bg-purple-100 text-purple-600' },
//   ];

//   const revenueData = [
//     { name: '01/04', sales: 800000 },
//     { name: '02/04', sales: 1200000 },
//     { name: '03/04', sales: 900000 },
//     { name: '04/04', sales: 1350000 },
//     { name: '05/04', sales: 700000 },
//   ];

//   const topProducts = [
//     { id: 1, name: 'Ty thủy lực 50cm', image: '/img/ty50.jpg', sales: 120, growth: 15 },
//     { id: 2, name: 'Bộ van tay 2 cần', image: '/img/van2.jpg', sales: 85, growth: 10 },
//     { id: 3, name: 'Cầu chì 24V', image: '/img/cauchii.jpg', sales: 60, growth: -5 },
//   ];

//   const orders = [
//     { id: 'ORD001', customer: 'Nguyễn Văn A', mainProduct: 'Ty 50cm', total: 1450000, status: 'completed' as 'completed' },
//     { id: 'ORD002', customer: 'Trần Thị B', mainProduct: 'Van 2 tay', total: 980000, status: 'processing' as 'processing' },
//   ];

//   const customers = [
//     { id: 1, name: 'Nguyễn Văn A', avatar: '/img/ava1.jpg', orders: 5, spent: 7200000 },
//     { id: 2, name: 'Trần Thị B', avatar: '/img/ava2.jpg', orders: 3, spent: 4500000 },
//   ];

//   return (
//     <div className={`flex min-h-screen ${darkMode ? 'dark' : ''}`}>
//       {/* <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} /> */}
//       <div
//       // className={`flex-1 bg-gray-100 dark:bg-gray-900 transition-all duration-300 ml-0 md:ml-[240px]`}
//       // className="flex-1 bg-gray-100 dark:bg-gray-900"
//       // style={{
//       //   marginLeft: sidebarOpen
//       //     ? window.innerWidth >= 768
//       //       ? 240
//       //       : 0
//       //     : window.innerWidth >= 768
//       //       ? 80
//       //       : 0
//       // }}
//       >
//         {/* <Header sidebarOpen={sidebarOpen}  darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} /> */}
//         <main className="p-6 pt-24 space-y-6">
//           <Breadcrumb items={[{ name: 'Trang chủ', path: '/', icon: <HomeIcon /> }, { name: 'Dashboard', path: '/dashboard' }]} />

//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//             {kpis.map((kpi, i) => (
//               <KpiCard key={i} {...kpi} />
//             ))}
//           </div>

//           <RevenueChart
//             data={revenueData}
//             loading={loading}
//             chartType={chartType}
//             timeRange={timeRange}
//             setChartType={setChartType}
//             setTimeRange={setTimeRange}
//           />

//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
//               <h2 className="p-4 text-lg font-medium text-gray-900 dark:text-white border-b dark:border-gray-700">Sản phẩm bán chạy</h2>
//               {topProducts.map((p, i) => (
//                 <TopProductCard key={p.id} product={p} rank={i} />
//               ))}
//             </div>

//             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
//               <h2 className="p-4 text-lg font-medium text-gray-900 dark:text-white border-b dark:border-gray-700">Khách hàng thân thiết</h2>
//               {customers.map((c) => (
//                 <CustomerCard key={c.id} customer={c} />
//               ))}
//             </div>
//           </div>

//           <OrdersTable orders={orders} loading={false} />
//         </main>
//       </div>
//     </div>
//   );
// };

// const HomeIcon = () => <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7m-7-7v18" /></svg>;

// export default Dashboard;



// ver 2
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Quote, Scissors, ShieldCheck, ShoppingBasket, Truck } from 'lucide-react';
import Breadcrumb from '../../components/layout/Breadcrumb';
import { homeContentService, HomeContentPayload } from '../../services/homeContentService';
import { productService } from '../../services/productService';
import { Product } from '../../types/product';

const STORE_DEFAULT_IMAGE_URL = 'https://res.cloudinary.com/diwxfpt92/image/upload/v1770981822/logo_d2wmlf.png';

type HomeCommunityItem = {
  image_url: string;
  alt_text?: string;
};

type EditableHomeTextField = Exclude<keyof HomeContentPayload, 'shorts_items' | 'community_items'>;

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

const Dashboard = () => {
  const [homeDraft, setHomeDraft] = useState<HomeContentPayload>(DEFAULT_HOME_CONTENT);
  const [homePublished, setHomePublished] = useState<HomeContentPayload>(DEFAULT_HOME_CONTENT);
  const [homePublishedAt, setHomePublishedAt] = useState<string | null>(null);
  const [homeSaving, setHomeSaving] = useState(false);
  const [homePublishing, setHomePublishing] = useState(false);
  const [homeImageUploading, setHomeImageUploading] = useState(false);
  const [homeImageUploadProgress, setHomeImageUploadProgress] = useState(0);
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeMessage, setHomeMessage] = useState('');
  const [homeError, setHomeError] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showAdvancedInputs, setShowAdvancedInputs] = useState(false);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [storeLoading, setStoreLoading] = useState(true);
  const [editingField, setEditingField] = useState<keyof HomeContentPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadHomeContent = async () => {
      try {
        setHomeLoading(true);
        const data = await homeContentService.getAdminHomeContent();
        if (cancelled) return;
        setHomeDraft({ ...DEFAULT_HOME_CONTENT, ...(data?.draft || {}) });
        setHomePublished({ ...DEFAULT_HOME_CONTENT, ...(data?.published || {}) });
        setHomePublishedAt(data?.published_at || null);
      } catch (error: any) {
        if (cancelled) return;
        setHomeError(
          error?.response?.data?.detail
            || error?.response?.data?.message
            || 'Không tải được nội dung trang chủ. Vui lòng thử lại.',
        );
      } finally {
        if (!cancelled) setHomeLoading(false);
      }
    };

    loadHomeContent();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadStorefrontData = async () => {
      try {
        setStoreLoading(true);
        const data = await productService.getStorefrontProducts({
          status: 'active',
          limit: 100,
          page: 1,
        });
        if (!cancelled) {
          setStoreProducts(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) setStoreProducts([]);
      } finally {
        if (!cancelled) setStoreLoading(false);
      }
    };

    loadStorefrontData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 360);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleDraftChange = (field: EditableHomeTextField, value: string) => {
    setHomeDraft((prev) => ({ ...prev, [field]: value }));
  };

  const inlineStateRef = useRef<{ homeDraft: HomeContentPayload; editingField: keyof HomeContentPayload | null }>({
    homeDraft: DEFAULT_HOME_CONTENT,
    editingField: null,
  });
  inlineStateRef.current = { homeDraft, editingField };

  const handleDraftChangeRef = useRef(handleDraftChange);
  handleDraftChangeRef.current = handleDraftChange;

  const handleSaveDraft = async () => {
    try {
      setHomeSaving(true);
      setHomeError('');
      setHomeMessage('');
      const payload: HomeContentPayload = { ...homeDraft };
      const data = await homeContentService.updateDraft(payload);
      setHomeDraft({ ...DEFAULT_HOME_CONTENT, ...(data?.draft || {}) });
      setHomePublished({ ...DEFAULT_HOME_CONTENT, ...(data?.published || {}) });
      setHomePublishedAt(data?.published_at || null);
      setHomeMessage('Đã lưu bản nháp trang chủ thành công.');
    } catch (error: any) {
      setHomeError(
        error?.response?.data?.detail
          || error?.response?.data?.message
          || 'Không thể lưu bản nháp. Vui lòng thử lại.',
      );
    } finally {
      setHomeSaving(false);
    }
  };

  const handlePublish = async () => {
    const ok = window.confirm('Bạn muốn xuất bản nội dung này lên storefront ngay bây giờ chứ?');
    if (!ok) return;

    try {
      setHomePublishing(true);
      setHomeError('');
      setHomeMessage('');
      const payload: HomeContentPayload = { ...homeDraft };
      await homeContentService.updateDraft(payload);
      const data = await homeContentService.publishDraft();
      setHomeDraft({ ...DEFAULT_HOME_CONTENT, ...(data?.draft || {}) });
      setHomePublished({ ...DEFAULT_HOME_CONTENT, ...(data?.published || {}) });
      setHomePublishedAt(data?.published_at || null);
      setHomeMessage('Đã xuất bản nội dung trang chủ. Storefront đã áp dụng nội dung mới.');
    } catch (error: any) {
      setHomeError(
        error?.response?.data?.detail
          || error?.response?.data?.message
          || 'Không thể xuất bản. Vui lòng thử lại.',
      );
    } finally {
      setHomePublishing(false);
    }
  };

  const handleHeroImageUpload = async (file?: File | null) => {
    if (!file) return;

    try {
      setHomeImageUploading(true);
      setHomeImageUploadProgress(0);
      setHomeError('');
      setHomeMessage('');
      const data = await homeContentService.uploadHomeImage(file, (percent) => {
        setHomeImageUploadProgress(percent);
      });
      if (!data?.url) {
        throw new Error('Không nhận được URL ảnh sau khi upload.');
      }
      setHomeDraft((prev) => ({ ...prev, hero_image_url: data.url }));
      setHomeMessage('Đã tải ảnh lên thành công. Nhớ bấm Lưu bản nháp hoặc Xuất bản để áp dụng.');
    } catch (error: any) {
      setHomeError(
        error?.response?.data?.detail
          || error?.response?.data?.message
          || error?.message
          || 'Không thể tải ảnh lên. Vui lòng thử lại.',
      );
    } finally {
      setHomeImageUploading(false);
      setHomeImageUploadProgress(0);
      setIsImageDragOver(false);
    }
  };

  const communityItems = useMemo<HomeCommunityItem[]>(() => {
    const raw = Array.isArray(homeDraft.community_items) ? homeDraft.community_items : [];
    return raw
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        return {
          image_url: String((item as any).image_url || '').trim(),
          alt_text: String((item as any).alt_text || '').trim() || undefined,
        };
      })
      .filter((item): item is HomeCommunityItem => Boolean(item && item.image_url));
  }, [homeDraft.community_items]);

  const formatVnd = (value: number): string =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);

  const spotlightCategories = useMemo(() => {
    const map = new Map<number, { id: number; name: string; count: number; image: string }>();

    for (const p of storeProducts) {
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
        image: p.images?.[0] || STORE_DEFAULT_IMAGE_URL,
        count: 1,
      });
    }

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [storeProducts]);

  const featuredProducts = useMemo(() => storeProducts.slice(0, 4), [storeProducts]);
  const bestSellerProducts = useMemo(() => featuredProducts.slice(0, 3), [featuredProducts]);

  const minPrice = useMemo(() => {
    const prices = storeProducts.map((p) => Number(p.price || 0)).filter((x) => Number.isFinite(x) && x > 0);
    return prices.length ? Math.min(...prices) : 0;
  }, [storeProducts]);

  const maxPrice = useMemo(() => {
    const prices = storeProducts.map((p) => Number(p.price || 0)).filter((x) => Number.isFinite(x) && x > 0);
    return prices.length ? Math.max(...prices) : 0;
  }, [storeProducts]);

  const fallbackHero = STORE_DEFAULT_IMAGE_URL;
  const heroDisplayImage = homeDraft.hero_image_url || DEFAULT_HOME_CONTENT.hero_image_url || fallbackHero;

  const galleryImages = useMemo(() => {
    const images = storeProducts
      .flatMap((p) => (Array.isArray(p.images) ? p.images : []))
      .filter((src): src is string => Boolean(src && String(src).trim()));
    return Array.from(new Set(images)).slice(0, 6);
  }, [storeProducts]);

  const communityImages = useMemo(() => {
    if (communityItems.length) return communityItems.slice(0, 6).map((item) => item.image_url);
    const pool = [...galleryImages];
    while (pool.length < 6) pool.push(heroDisplayImage || fallbackHero);
    return pool.slice(0, 6);
  }, [communityItems, galleryImages, heroDisplayImage]);

  const InlineEditable = useMemo(() => {
    const StableInlineEditable = ({
      field,
      className = '',
      multiline = false,
      rows = 3,
    }: {
      field: EditableHomeTextField;
      className?: string;
      multiline?: boolean;
      rows?: number;
    }) => {
      const currentDraft = inlineStateRef.current.homeDraft;
      const currentEditingField = inlineStateRef.current.editingField;
      const value = currentDraft[field] || DEFAULT_HOME_CONTENT[field] || '';
      const isEditing = currentEditingField === field;

      if (isEditing) {
        if (multiline) {
          return (
            <textarea
              autoFocus
              rows={rows}
              value={currentDraft[field] || ''}
              onChange={(e) => handleDraftChangeRef.current(field, e.target.value)}
              onBlur={() => setEditingField(null)}
              className={`w-full rounded-md border border-rose-300 bg-white/95 px-2 py-1 text-[#111827] outline-none ring-2 ring-rose-200 ${className}`}
            />
          );
        }

        return (
          <input
            autoFocus
            value={currentDraft[field] || ''}
            onChange={(e) => handleDraftChangeRef.current(field, e.target.value)}
            onBlur={() => setEditingField(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className={`w-full rounded-md border border-rose-300 bg-white/95 px-2 py-1 text-[#111827] outline-none ring-2 ring-rose-200 ${className}`}
          />
        );
      }

      return (
        <span
          role="button"
          tabIndex={0}
          onClick={() => setEditingField(field)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setEditingField(field);
            }
          }}
          className={`cursor-text rounded px-1 -mx-1 hover:bg-white/20 focus:bg-white/20 focus:outline-none ${className}`}
          title="Click để sửa trực tiếp"
        >
          {value}
        </span>
      );
    };

    return StableInlineEditable;
  }, []);

  const isPreviewZoneActive = (fields: Array<EditableHomeTextField>) => {
    if (!editingField) return false;
    return fields.includes(editingField);
  };

  const zoneClass = (active: boolean, base: string) => (
    `${base} transition-all duration-200 ${active ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-transparent bg-white/5' : ''}`
  );

  return (
    <main className="space-y-6">
      <Breadcrumb items={[{ name: 'Trang chủ', path: '/', icon: <HomeIcon /> }, { name: 'Dashboard', path: '/admin' }]} />

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tùy chỉnh toàn bộ trang chủ</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Chế độ chỉnh trực tiếp trên preview. Nhấn vào chữ trên khung xem trước để sửa nhanh.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {homePublishedAt && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Lần xuất bản gần nhất: {new Date(homePublishedAt).toLocaleString('vi-VN')}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowAdvancedInputs((prev) => !prev)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200"
            >
              {showAdvancedInputs ? 'Ẩn form nâng cao' : 'Hiện form nâng cao'}
            </button>
          </div>
        </div>

        {homeError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{homeError}</div>
        )}
        {homeMessage && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{homeMessage}</div>
        )}

        <div className={showAdvancedInputs ? 'mt-5 grid grid-cols-1 xl:grid-cols-2 gap-6' : 'mt-5'}>
          {showAdvancedInputs && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Nhãn nhỏ phía trên
              <input
                value={homeDraft.hero_badge}
                onChange={(e) => handleDraftChange('hero_badge', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                placeholder="Ví dụ: Bộ sưu tập mới mỗi tuần"
              />
            </label>

            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Tiêu đề chính
              <input
                value={homeDraft.hero_title}
                onChange={(e) => handleDraftChange('hero_title', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
              />
            </label>

            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Dòng nhấn mạnh
              <input
                value={homeDraft.hero_subtitle}
                onChange={(e) => handleDraftChange('hero_subtitle', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
              />
            </label>

            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Mô tả
              <textarea
                value={homeDraft.hero_description}
                onChange={(e) => handleDraftChange('hero_description', e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
              />
            </label>

            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Ảnh banner
              <div
                className={`mt-2 rounded-lg border border-dashed p-4 transition ${isImageDragOver
                  ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                  : 'border-gray-300 dark:border-gray-700'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!homeImageUploading) setIsImageDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsImageDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsImageDragOver(false);
                  if (homeImageUploading || homeSaving || homePublishing || homeLoading) return;
                  const picked = e.dataTransfer.files?.[0] || null;
                  void handleHeroImageUpload(picked);
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const picked = e.target.files?.[0] || null;
                    void handleHeroImageUpload(picked);
                    e.currentTarget.value = '';
                  }}
                  disabled={homeImageUploading || homeSaving || homePublishing || homeLoading}
                  className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:rounded-md file:border-0 file:bg-rose-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-rose-700"
                />
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {homeImageUploading ? `Đang tải ảnh lên... ${homeImageUploadProgress}%` : 'Kéo thả ảnh vào đây hoặc chọn từ máy, hệ thống sẽ tự upload và gắn vào banner.'}
                </div>
                {homeImageUploading && (
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-rose-600 transition-all"
                      style={{ width: `${homeImageUploadProgress}%` }}
                    />
                  </div>
                )}
                {!!homeDraft.hero_image_url && (
                  <img
                    src={homeDraft.hero_image_url}
                    alt="Banner preview"
                    className="mt-3 h-28 w-full rounded-md border border-gray-200 dark:border-gray-700 object-cover"
                  />
                )}
              </div>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Nút chính
                <input
                  value={homeDraft.primary_cta_text}
                  onChange={(e) => handleDraftChange('primary_cta_text', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Đường dẫn nút chính
                <input
                  value={homeDraft.primary_cta_link}
                  onChange={(e) => handleDraftChange('primary_cta_link', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Nút phụ
                <input
                  value={homeDraft.secondary_cta_text}
                  onChange={(e) => handleDraftChange('secondary_cta_text', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Đường dẫn nút phụ
                <input
                  value={homeDraft.secondary_cta_link}
                  onChange={(e) => handleDraftChange('secondary_cta_link', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                />
              </label>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Khối thông tin nổi bật trong Hero</h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Tiêu đề thẻ 1
                  <input
                    value={homeDraft.hero_feature_1_title}
                    onChange={(e) => handleDraftChange('hero_feature_1_title', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Mô tả thẻ 1
                  <input
                    value={homeDraft.hero_feature_1_desc}
                    onChange={(e) => handleDraftChange('hero_feature_1_desc', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Tiêu đề thẻ 2
                  <input
                    value={homeDraft.hero_feature_2_title}
                    onChange={(e) => handleDraftChange('hero_feature_2_title', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Mô tả thẻ 2
                  <input
                    value={homeDraft.hero_feature_2_desc}
                    onChange={(e) => handleDraftChange('hero_feature_2_desc', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Tiêu đề thẻ 3
                  <input
                    value={homeDraft.hero_feature_3_title}
                    onChange={(e) => handleDraftChange('hero_feature_3_title', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Hậu tố số lượng thẻ 3
                  <input
                    value={homeDraft.hero_feature_3_desc}
                    onChange={(e) => handleDraftChange('hero_feature_3_desc', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                    placeholder="Ví dụ: sản phẩm active"
                  />
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Khối số liệu trong Hero</h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Tiêu đề khối số liệu
                  <input
                    value={homeDraft.hero_stats_title}
                    onChange={(e) => handleDraftChange('hero_stats_title', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Nhãn: sản phẩm
                  <input
                    value={homeDraft.hero_stats_products_label}
                    onChange={(e) => handleDraftChange('hero_stats_products_label', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Nhãn: danh mục
                  <input
                    value={homeDraft.hero_stats_categories_label}
                    onChange={(e) => handleDraftChange('hero_stats_categories_label', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Nhãn: khoảng giá
                  <input
                    value={homeDraft.hero_stats_price_label}
                    onChange={(e) => handleDraftChange('hero_stats_price_label', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 sm:col-span-2">
                  Nút dẫn sang catalog
                  <input
                    value={homeDraft.hero_stats_catalog_link_text}
                    onChange={(e) => handleDraftChange('hero_stats_catalog_link_text', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Section Danh mục</h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 sm:col-span-2">
                  Tiêu đề section
                  <input
                    value={homeDraft.category_section_title}
                    onChange={(e) => handleDraftChange('category_section_title', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 sm:col-span-2">
                  Mô tả section
                  <input
                    value={homeDraft.category_section_subtitle}
                    onChange={(e) => handleDraftChange('category_section_subtitle', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Text nút xem tất cả
                  <input
                    value={homeDraft.category_section_view_all_text}
                    onChange={(e) => handleDraftChange('category_section_view_all_text', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Text khi đang tải
                  <input
                    value={homeDraft.category_section_loading_text}
                    onChange={(e) => handleDraftChange('category_section_loading_text', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 sm:col-span-2">
                  Text khi không có dữ liệu
                  <input
                    value={homeDraft.category_section_empty_text}
                    onChange={(e) => handleDraftChange('category_section_empty_text', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Section Sản phẩm mới</h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 sm:col-span-2">
                  Tiêu đề section
                  <input
                    value={homeDraft.new_arrivals_title}
                    onChange={(e) => handleDraftChange('new_arrivals_title', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 sm:col-span-2">
                  Mô tả section
                  <input
                    value={homeDraft.new_arrivals_subtitle}
                    onChange={(e) => handleDraftChange('new_arrivals_subtitle', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Badge nhỏ
                  <input
                    value={homeDraft.new_arrivals_live_badge}
                    onChange={(e) => handleDraftChange('new_arrivals_live_badge', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Tiền tố giá
                  <input
                    value={homeDraft.new_arrivals_price_prefix}
                    onChange={(e) => handleDraftChange('new_arrivals_price_prefix', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 sm:col-span-2">
                  Text khi không có dữ liệu
                  <input
                    value={homeDraft.new_arrivals_empty_text}
                    onChange={(e) => handleDraftChange('new_arrivals_empty_text', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                </label>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={homeSaving || homePublishing || homeLoading}
                className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                {homeSaving ? 'Đang lưu nháp...' : 'Lưu bản nháp'}
              </button>
            </div>
          </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-bold text-gray-700 dark:text-gray-200">Xem trước trước khi xuất bản (click trực tiếp để sửa)</div>
              <button
                type="button"
                onClick={handlePublish}
                disabled={homeSaving || homePublishing || homeImageUploading || homeLoading}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {homePublishing ? 'Đang xuất bản...' : 'Xuất bản'}
              </button>
            </div>

            <div className="max-h-[82vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-[#fff9f0] p-4 space-y-6">
              <section className="mx-auto max-w-7xl pt-2">
                <div className={zoneClass(isPreviewZoneActive([
                  'hero_badge',
                  'hero_headline_line1',
                  'hero_headline_line2',
                  'hero_description',
                  'primary_cta_text',
                  'secondary_cta_text',
                ]), 'relative overflow-hidden rounded-[2.2rem] bg-[#f4ede2] p-8 lg:p-14')}>
                  <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(138,79,65,0.08) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                  <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-2 items-center">
                    <div className="space-y-6">
                      <span className="inline-flex rounded-full bg-[#ff9ea4]/30 px-4 py-2 text-sm font-semibold text-[#9e404a]">
                        <InlineEditable field="hero_badge" className="text-sm font-semibold text-[#9e404a]" />
                      </span>
                      <h2 className="text-5xl lg:text-[4rem] font-extrabold leading-[0.96] tracking-tight text-[#2f2b24]">
                        <InlineEditable field="hero_headline_line1" className="text-5xl lg:text-[4rem] font-extrabold text-[#2f2b24]" />
                        <span className="block italic text-[#8a4f41]"><InlineEditable field="hero_headline_line2" className="text-5xl lg:text-[4rem] font-extrabold italic text-[#8a4f41]" /></span>
                      </h2>
                      <p className="max-w-xl text-lg leading-relaxed text-[#635f54]"><InlineEditable field="hero_description" multiline rows={3} className="text-lg text-[#635f54]" /></p>
                      <div className="flex flex-wrap gap-4">
                        <span className="rounded-full bg-[#8a4f41] px-10 py-5 text-lg font-bold text-white shadow-lg"><InlineEditable field="primary_cta_text" className="text-lg font-bold text-white" /></span>
                        <span className="rounded-full bg-white px-10 py-5 text-lg font-bold text-[#8a4f41] shadow-sm"><InlineEditable field="secondary_cta_text" className="text-lg font-bold text-[#8a4f41]" /></span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="group relative overflow-hidden rounded-[1.75rem] shadow-2xl">
                        <img src={heroDisplayImage} alt="Hero" className="h-[500px] w-full object-cover" />

                        <label className="absolute inset-0 flex cursor-pointer items-end justify-center bg-black/30 p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#2f2b24] shadow-sm">
                            {homeImageUploading ? `Đang tải ảnh... ${homeImageUploadProgress}%` : 'Đổi ảnh banner'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={homeImageUploading || homeSaving || homePublishing || homeLoading}
                            onChange={(e) => {
                              const picked = e.target.files?.[0] || null;
                              void handleHeroImageUpload(picked);
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>

                        {homeImageUploading && (
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
                            <div className="h-full bg-[#f2c94c] transition-all" style={{ width: `${homeImageUploadProgress}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-[#c7fce9] opacity-60 blur-xl" />
                    </div>
                  </div>
                </div>
              </section>

              <section className={zoneClass(isPreviewZoneActive([
                'category_section_desktop_title',
                'category_section_desktop_subtitle',
                'category_section_link_text',
              ]), 'mx-auto max-w-7xl mt-4')}>
                <div className="mb-12 flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-3xl font-bold"><InlineEditable field="category_section_desktop_title" className="text-3xl font-bold text-[#2f2b24]" /></h3>
                    <p className="mt-2 text-[#635f54]"><InlineEditable field="category_section_desktop_subtitle" className="text-base text-[#635f54]" /></p>
                  </div>
                  <span className="inline-flex items-center gap-2 font-bold text-[#8a4f41]"><InlineEditable field="category_section_link_text" className="text-base font-bold text-[#8a4f41]" /> <ArrowRight size={18} /></span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-7">
                  {spotlightCategories.map((category) => (
                    <div key={category.id} className="group text-center">
                      <div className="relative mb-6 aspect-square overflow-hidden rounded-full border-[10px] border-[#f4ede2] bg-[#eee7db] shadow-sm transition-all duration-500 group-hover:shadow-xl">
                        <img src={category.image || STORE_DEFAULT_IMAGE_URL} alt={category.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      </div>
                      <h4 className="text-lg font-bold transition-colors group-hover:text-[#8a4f41]">{category.name}</h4>
                    </div>
                  ))}
                </div>
              </section>

              <section className={zoneClass(isPreviewZoneActive([
                'best_seller_section_title',
                'best_seller_section_subtitle',
                'best_seller_badge_text',
              ]), 'mt-20 bg-[#f9f3e9] py-10 px-3 rounded-2xl')}>
                <div className="mx-auto max-w-7xl">
                  <div className="mb-16 text-center">
                    <h3 className="text-4xl font-extrabold"><InlineEditable field="best_seller_section_title" className="text-4xl font-extrabold text-[#2f2b24]" /></h3>
                    <p className="mx-auto mt-4 max-w-xl text-[#635f54]"><InlineEditable field="best_seller_section_subtitle" multiline rows={2} className="text-base text-[#635f54]" /></p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {bestSellerProducts.map((product) => (
                      <div key={product.id} className="rounded-[1.35rem] bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl">
                        <div className="relative mb-5 aspect-[4/3] overflow-hidden rounded-[1rem] bg-[#eee7db]">
                          <img src={product.images?.[0] || STORE_DEFAULT_IMAGE_URL} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                        <span className="absolute left-2 top-2 rounded-full bg-[#8a4f41] px-2 py-1 text-[10px] font-bold text-white">
                          <InlineEditable field="best_seller_badge_text" className="text-[10px] font-bold text-white" />
                        </span>
                        </div>
                        <h4 className="mb-2 text-[1.35rem] font-bold leading-tight text-[#2f2b24] line-clamp-2">{product.name}</h4>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-extrabold text-[#8a4f41]">{formatVnd(Number(product.price || 0))}</span>
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#c7fce9] text-[#316354]"><ShoppingBasket size={18} /></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className={zoneClass(isPreviewZoneActive([
                'hero_feature_1_title',
                'hero_feature_1_desc',
                'hero_feature_2_title',
                'hero_feature_2_desc',
                'delivery_feature_title',
                'delivery_feature_desc',
              ]), 'mx-auto mt-16 max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-10')}>
                <div className="rounded-2xl bg-[#f9f3e9] p-8 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#c7fce9] text-[#316354]"><ShieldCheck size={28} /></div>
                  <div className="mb-4 text-xl font-bold text-[#2f2b24]"><InlineEditable field="hero_feature_1_title" className="text-xl font-bold text-[#2f2b24]" /></div>
                  <div className="text-[#635f54]"><InlineEditable field="hero_feature_1_desc" className="text-base text-[#635f54]" /></div>
                </div>
                <div className="rounded-2xl bg-[#f9f3e9] p-8 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#ff9ea4] text-[#691724]"><Scissors size={26} /></div>
                  <div className="mb-4 text-xl font-bold text-[#2f2b24]"><InlineEditable field="hero_feature_2_title" className="text-xl font-bold text-[#2f2b24]" /></div>
                  <div className="text-[#635f54]"><InlineEditable field="hero_feature_2_desc" className="text-base text-[#635f54]" /></div>
                </div>
                <div className="rounded-2xl bg-[#f9f3e9] p-8 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#fdb19f] text-[#633024]"><Truck size={26} /></div>
                  <div className="mb-4 text-xl font-bold text-[#2f2b24]"><InlineEditable field="delivery_feature_title" className="text-xl font-bold text-[#2f2b24]" /></div>
                  <div className="text-[#635f54]"><InlineEditable field="delivery_feature_desc" multiline rows={2} className="text-base text-[#635f54]" /></div>
                </div>
              </section>

              <section className="mx-auto mt-16 max-w-7xl">
                <div className="relative overflow-hidden rounded-[1.2rem] bg-[#e9e2d4] p-8">
                  <div className="absolute right-8 top-8 text-[#b7b1a4]"><Quote size={54} /></div>
                  <h3 className="relative z-10 mb-8 text-center text-3xl font-extrabold"><InlineEditable field="testimonial_section_title" className="text-3xl font-extrabold text-[#2f2b24]" /></h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                    <div className="relative mx-auto w-full aspect-square max-w-sm overflow-hidden rounded-full border-8 border-white shadow-xl">
                      <img src={heroDisplayImage} alt="Story" className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                    <div className="relative min-h-[220px] rounded-xl bg-white p-8 shadow-lg">
                      <p className="mb-6 text-lg italic leading-relaxed text-[#635f54]">
                        "Mình rất hài lòng với chất lượng sản phẩm tại Lộc Sang. Sản phẩm đóng gói đẹp, giao nhanh và dùng rất ổn."
                      </p>
                      <div className="font-bold">Khách hàng Lộc Sang</div>
                      <div className="mt-1 text-xs text-[#7b766b]">Khách hàng thân thiết</div>
                      <div className="mt-1 text-[#9e404a]">★★★★★</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className={zoneClass(isPreviewZoneActive([
                'community_section_title',
                'community_section_subtitle',
              ]), 'mx-auto mt-16 max-w-7xl pb-8')}>
                <div className="mb-12 text-center">
                  <h3 className="mb-4 text-3xl font-extrabold text-[#2f2b24]">{homeDraft.community_section_title || DEFAULT_HOME_CONTENT.community_section_title}</h3>
                  <p className="text-[#635f54]">{homeDraft.community_section_subtitle || DEFAULT_HOME_CONTENT.community_section_subtitle}</p>
                  <p className="mt-2 text-xs text-[#8a4f41] font-semibold">Quản lý tại màn riêng: /admin/community</p>
                </div>
                <div className="grid h-[600px] grid-cols-2 md:grid-cols-4 gap-4">
                  {communityImages.map((src, idx) => {
                    const cls = idx === 0 ? 'row-span-2' : idx === 1 || idx === 5 ? 'col-span-2' : '';
                    return (
                      <div key={`${src}-${idx}`} className={`overflow-hidden rounded-xl shadow-lg ${cls}`}>
                        <img src={src} alt={`Community ${idx + 1}`} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                      </div>
                    );
                  })}
                </div>
              </section>

            </div>
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              Nội dung đang hiển thị ngoài storefront sẽ chỉ thay đổi sau khi bạn bấm Xuất bản.
            </div>
          </div>
        </div>
      </section>

      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-rose-700"
        >
          Len dau
        </button>
      )}
    </main>
  );
};

const HomeIcon = () => (
  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M3 12l2-2m0 0l7-7 7 7m-7-7v18" />
  </svg>
);

export default Dashboard;
