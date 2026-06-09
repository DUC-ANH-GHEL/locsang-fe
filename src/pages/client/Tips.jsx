import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Search } from 'lucide-react';

import { tipService } from '../../services/tipService';
import { useSEO } from '../../hooks/useSEO';
import { formatViDate } from '../../utils/dateTime';
import { extractTipPreviewText } from '../../components/tips/TipBlocksRenderer';

const fallbackImage = '/favicon.svg';

const formatDate = (value) => {
  return formatViDate(value, { dateStyle: 'medium' });
};

const stripHtml = (text) => String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const Tips = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');

  useSEO({
    title: 'Cam Nang Mua Sam',
    description: 'Blog cam nang mua sam tu Lộc Sang: goi y chon san pham, uu dai va kinh nghiem mua hang huu ich.',
    canonicalPath: '/tips',
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const res = await tipService.getPublicTips({
          page: 1,
          limit: 12,
          search,
          category: selectedCategory || undefined,
        });

        if (cancelled) return;
        setItems(Array.isArray(res?.data) ? res.data : []);
        setCategories(Array.isArray(res?.filters?.categories) ? res.filters.categories : []);
      } catch {
        if (cancelled) return;
        setItems([]);
        setCategories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [search, selectedCategory]);

  const featured = useMemo(() => items.find((item) => item.featured) || items[0] || null, [items]);
  const rest = useMemo(() => {
    if (!featured) return items;
    return items.filter((item) => item.id !== featured.id);
  }, [items, featured]);

  return (
    <div className="min-h-screen bg-[#fff9f0] text-[#353229]">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <section className="mb-8 rounded-[2rem] bg-[#f4ede2] p-5 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#ff9ea4]/35 px-3 py-1 text-xs font-semibold text-[#8f343f]">
                <Sparkles size={14} /> Journal Lộc Sang
              </div>
              <h1 className="text-3xl font-black tracking-tight text-[#2f2722] md:text-5xl">Cẩm nang mua sắm</h1>
              <p className="mt-3 max-w-2xl text-[#635f54]">
                Gói trọn tình yêu và kiến thức thực tế, giúp hành trình nuôi dưỡng những 'người bạn nhỏ' của Sen trở nên dễ dàng và hạnh phúc hơn.
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a4f41]/70" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm bài viết..."
                className="w-full rounded-full border-none bg-white/85 px-10 py-3 text-sm text-[#353229] shadow-sm outline-none ring-2 ring-transparent transition focus:ring-[#fdb19f]"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedCategory === ''
                  ? 'bg-[#ff9ea4] text-[#691724]'
                  : 'bg-white/70 text-[#635f54] hover:bg-[#ffe4e6]'
              }`}
            >
              Tất cả
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedCategory === category
                    ? 'bg-[#ff9ea4] text-[#691724]'
                    : 'bg-white/70 text-[#635f54] hover:bg-[#ffe4e6]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl bg-[#f9f3e9] p-8 text-center text-[#635f54]">Đang tải bài viết...</div>
        ) : !featured ? (
          <div className="rounded-3xl bg-[#f9f3e9] p-8 text-center text-[#635f54]">Chưa có bài viết công khai.</div>
        ) : (
          <>
            <section className="mb-10 grid gap-6 lg:grid-cols-12">
              <Link
                to={`/tips/${featured.slug}`}
                className="group relative overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_50px_rgba(53,50,41,0.08)] lg:col-span-8"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={featured.featured_image || fallbackImage}
                    alt={featured.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="space-y-4 p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {featured.category && (
                      <span className="rounded-full bg-[#c7fce9] px-3 py-1 font-semibold text-[#316354]">{featured.category}</span>
                    )}
                    {featured.published_at && <span className="text-[#7f7a6f]">{formatDate(featured.published_at)}</span>}
                  </div>
                  <h2 className="text-2xl font-black leading-tight text-[#2f2722] md:text-4xl">{featured.title}</h2>
                  <p className="line-clamp-3 text-[#635f54]">
                    {featured.excerpt || extractTipPreviewText(featured.content_blocks || []) || stripHtml(featured.content || '').slice(0, 220) || 'Nhấn để đọc bài viết chi tiết.'}
                  </p>
                  <span className="inline-flex items-center gap-2 font-bold text-[#8a4f41]">
                    Đọc bài viết <ArrowRight size={16} />
                  </span>
                </div>
              </Link>

              <div className="rounded-[2rem] bg-[#ff9ea4]/20 p-6 lg:col-span-4">
                <h3 className="text-2xl font-bold text-[#691724]">Giữ kết nối với Lộc Sang</h3>
                <p className="mt-3 text-sm text-[#7a4048]">
                  Đăng ký để không bỏ lỡ gợi ý mua sắm, cẩm nang chọn sản phẩm và ưu đãi độc quyền từ Lộc Sang.
                </p>
                <div className="mt-6 rounded-2xl bg-white/70 p-4 text-sm text-[#633024]">
                  Gợi ý nội dung: gợi ý theo mùa, checklist mua sắm, hướng dẫn chọn sản phẩm phù hợp.
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-[1.6rem] bg-white shadow-[0_18px_34px_rgba(53,50,41,0.06)]">
                  <Link to={`/tips/${item.slug}`}>
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={item.featured_image || fallbackImage}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-500 hover:scale-105"
                      />
                    </div>
                  </Link>
                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {item.category && <span className="rounded-full bg-[#f9f3e9] px-2.5 py-1 font-semibold text-[#8a4f41]">{item.category}</span>}
                      {item.published_at && <span className="text-[#7f7a6f]">{formatDate(item.published_at)}</span>}
                    </div>
                    <Link to={`/tips/${item.slug}`} className="line-clamp-2 block text-xl font-bold leading-snug text-[#2f2722]">
                      {item.title}
                    </Link>
                    <p className="line-clamp-3 text-sm text-[#635f54]">
                      {item.excerpt || extractTipPreviewText(item.content_blocks || []) || stripHtml(item.content || '').slice(0, 160) || 'Đọc thêm để xem chi tiết.'}
                    </p>
                    <Link to={`/tips/${item.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#8a4f41]">
                      Đọc thêm <ArrowRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Tips;
