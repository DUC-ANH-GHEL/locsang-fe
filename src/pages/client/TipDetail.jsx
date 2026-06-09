import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { FaFacebookF, FaLink } from 'react-icons/fa';

import { tipService } from '../../services/tipService';
import { useSEO } from '../../hooks/useSEO';
import { formatViDate } from '../../utils/dateTime';
import TipBlocksRenderer, { extractTipPreviewText } from '../../components/tips/TipBlocksRenderer';

const fallbackImage = '/locsang-assets/brand-logo.svg';

const formatDate = (value) => {
  return formatViDate(value, { dateStyle: 'full' });
};

const stripHtml = (text) => String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const TipDetail = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const res = await tipService.getPublicTipDetail(String(slug || ''));
        if (cancelled) return;
        setItem(res?.data || null);
        setRelated(Array.isArray(res?.related) ? res.related : []);
      } catch {
        if (cancelled) return;
        setItem(null);
        setRelated([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const seoDescription = useMemo(() => {
    const blockPreview = extractTipPreviewText(item?.content_blocks || []);
    const source = item?.seo_description || item?.excerpt || blockPreview || stripHtml(item?.content || '');
    return String(source || '').slice(0, 155);
  }, [item]);

  useSEO({
    title: item?.seo_title || item?.title || 'Chi tiet meo cham soc',
    description: seoDescription || 'Bai viet cam nang mua sam tu Lộc Sang.',
    canonicalPath: item?.slug ? `/tips/${item.slug}` : '/tips',
    image: item?.featured_image || fallbackImage,
    type: 'article',
  });

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-[#635f54]">Đang tải bài viết...</div>;
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl bg-[#f9f3e9] p-8 text-center text-[#635f54]">Bài viết không tồn tại hoặc đã ẩn.</div>
      </div>
    );
  }

  const contentIsHtml = /<\/?[a-z][\s\S]*>/i.test(String(item.content || ''));
  const hasBlocks = Array.isArray(item?.content_blocks) && item.content_blocks.length > 0;
  const tipSlug = encodeURIComponent(String(item.slug || slug || ''));
  const shareSiteBase = (typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://locsang.shop').replace(/\/+$/, '');
  const backendShareBase = 'https://locsang-be.cgnn.vn';
  const shareVersionSeed = String(item.updated_at || item.published_at || item.created_at || '');
  const shareVersion = Date.parse(shareVersionSeed);
  const shareQuery = Number.isFinite(shareVersion) ? `?v=${shareVersion}` : '';
  const publicArticleUrl = `${shareSiteBase}/tips/${tipSlug}`;
  const backendShareUrl = `${backendShareBase}/api/tips/${tipSlug}/share${shareQuery}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(backendShareUrl)}`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(publicArticleUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors to avoid blocking reading flow.
    }
  };

  return (
    <div className="min-h-screen bg-[#fff9f0] text-[#353229]">
      <article className="mx-auto max-w-5xl px-4 py-8 md:py-10">
        <Link to="/tips" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8a4f41]">
          <ArrowLeft size={14} /> Quay về trang mẹo chăm sóc
        </Link>

        <header className="mb-8">
          {item.category && <div className="mb-3 inline-flex rounded-full bg-[#c7fce9] px-3 py-1 text-xs font-semibold text-[#316354]">{item.category}</div>}
          <h1 className="text-3xl font-black leading-tight text-[#2f2722] md:text-5xl">{item.title}</h1>
          <div className="mt-3 text-sm text-[#7f7a6f]">{formatDate(item.published_at || item.created_at)}</div>
          {item.excerpt && <p className="mt-5 text-lg text-[#635f54]">{item.excerpt}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <a
              href={facebookShareUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1668d8]"
            >
              <FaFacebookF size={13} /> Chia sẻ Facebook
            </a>
            <button
              type="button"
              onClick={copyShareLink}
              className="inline-flex items-center gap-2 rounded-full border border-[#e7d8c8] bg-white px-4 py-2 text-sm font-semibold text-[#635f54] transition hover:bg-[#f9f3e9]"
            >
              <FaLink size={12} /> {copied ? 'Đã copy link' : 'Copy link'}
            </button>
          </div>
        </header>

        <div className="mb-8 overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_40px_rgba(53,50,41,0.08)]">
          <img src={item.featured_image || fallbackImage} alt={item.title} className="h-auto w-full object-cover" />
        </div>

        <div className="rounded-[2rem] bg-white px-6 py-7 shadow-[0_12px_30px_rgba(53,50,41,0.06)] md:px-8">
          {hasBlocks ? (
            <TipBlocksRenderer blocks={item.content_blocks} />
          ) : contentIsHtml ? (
            <div
              className="prose max-w-none prose-headings:text-[#2f2722] prose-p:text-[#453f36] prose-a:text-[#8a4f41]"
              dangerouslySetInnerHTML={{ __html: String(item.content || '') }}
            />
          ) : (
            <div className="whitespace-pre-line text-[1.04rem] leading-8 text-[#453f36]">{item.content || 'Nội dung đang cập nhật.'}</div>
          )}
        </div>

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-black text-[#2f2722]">Bài viết liên quan</h2>
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              {related.map((post) => (
                <Link
                  key={post.id}
                  to={`/tips/${post.slug}`}
                  className="group overflow-hidden rounded-[1.4rem] bg-white shadow-[0_12px_24px_rgba(53,50,41,0.06)]"
                >
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={post.featured_image || fallbackImage}
                      alt={post.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="line-clamp-2 text-lg font-bold text-[#2f2722]">{post.title}</h3>
                    <p className="line-clamp-2 text-sm text-[#635f54]">{post.excerpt || stripHtml(post.content || '').slice(0, 120)}</p>
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-[#8a4f41]">
                      Xem chi tiết <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
};

export default TipDetail;
