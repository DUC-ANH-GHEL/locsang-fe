import { Link } from 'react-router-dom';

const FALLBACK_PRODUCT_IMAGE = 'https://res.cloudinary.com/diwxfpt92/image/upload/v1770981822/logo_d2wmlf.png';

const resolveVideoEmbedUrl = (url) => {
  const value = String(url || '').trim();
  if (!value) return '';

  const youtubeMatch = value.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  if (youtubeMatch?.[1]) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;

  const vimeoMatch = value.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch?.[1]) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return value;
};

const splitLines = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => String(item || '').trim()).filter(Boolean);
};

const normalizeFaqItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      question: String(item?.question || '').trim(),
      answer: String(item?.answer || '').trim(),
    }))
    .filter((item) => item.question || item.answer);
};

const normalizeTableRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell || '').trim()) : []))
    .filter((row) => row.some(Boolean));
};

const slugifyHeading = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const buildHeadingEntries = (blocks) => {
  if (!Array.isArray(blocks)) return [];

  const occurrences = {};
  return blocks
    .map((block, index) => {
      if (block?.type !== 'heading') return null;
      const text = String(block?.text || '').trim();
      if (!text) return null;

      const level = [2, 3, 4].includes(Number(block?.level)) ? Number(block.level) : 2;
      const base = slugifyHeading(text) || `section-${index + 1}`;
      occurrences[base] = (occurrences[base] || 0) + 1;
      const suffix = occurrences[base] > 1 ? `-${occurrences[base]}` : '';

      return {
        index,
        level,
        text,
        id: `tip-${base}${suffix}`,
      };
    })
    .filter(Boolean);
};

const normalizeTocPlacement = (blocks) => {
  const list = Array.isArray(blocks) ? blocks.filter(Boolean) : [];
  const firstToc = list.find((item) => item?.type === 'toc');
  if (!firstToc) return list;
  const withoutToc = list.filter((item) => item?.type !== 'toc');
  return [firstToc, ...withoutToc];
};

const normalizeProductItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === 'string') {
        const [name = '', url = '', image = '', price = ''] = String(item).split('|').map((part) => String(part || '').trim());
        return { name, url, image, price };
      }

      return {
        name: String(item?.name || '').trim(),
        url: String(item?.url || '').trim(),
        image: String(item?.image || '').trim(),
        price: String(item?.price || '').trim(),
      };
    })
    .filter((item) => item.name || item.url || item.image || item.price);
};

const toneStyle = {
  info: 'border-[#9ad5ff] bg-[#ecf7ff] text-[#214861]',
  warning: 'border-[#ffd3a1] bg-[#fff6eb] text-[#6e3f12]',
  success: 'border-[#b5efcf] bg-[#edfdf4] text-[#1e5a37]',
};

export const extractTipPreviewText = (blocks) => {
  if (!Array.isArray(blocks)) return '';

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    if (block.type === 'paragraph' && String(block.text || '').trim()) return String(block.text).trim();
    if (block.type === 'image_text' && String(block.text || '').trim()) return String(block.text).trim();
    if (block.type === 'quote' && String(block.quote || '').trim()) return String(block.quote).trim();
    if (block.type === 'heading' && String(block.text || '').trim()) return String(block.text).trim();
  }

  return '';
};

const TipBlocksRenderer = ({ blocks = [] }) => {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  const normalizedBlocks = normalizeTocPlacement(blocks);
  const headingEntries = buildHeadingEntries(normalizedBlocks);
  const headingIdByIndex = new Map(headingEntries.map((entry) => [entry.index, entry.id]));

  return (
    <div className="space-y-6">
      {normalizedBlocks.map((block, index) => {
        const key = block?.id || `${block?.type || 'block'}-${index}`;

        if (block?.type === 'heading') {
          const HeadingTag = block.level === 3 ? 'h3' : block.level === 4 ? 'h4' : 'h2';
          const headingId = headingIdByIndex.get(index);
          return <HeadingTag id={headingId} key={key} className="scroll-mt-24 font-extrabold text-[#2f2722]">{block.text || 'Tiêu đề'}</HeadingTag>;
        }

        if (block?.type === 'toc') {
          const title = String(block.title || '').trim() || 'Mục lục';
          const maxItems = Math.max(1, Math.min(40, Number(block.max_items || 20)));
          const tocItems = headingEntries.slice(0, maxItems);

          return (
            <section key={key} className="rounded-2xl border border-[#e9e0cf] bg-[#f8f3ea] p-4">
              <h3 className="text-lg font-extrabold text-[#2f2722]">{title}</h3>
              {tocItems.length > 0 ? (
                <ul className="mt-3 space-y-1.5 text-sm text-[#51493f]">
                  {tocItems.map((entry) => {
                    const indentClass = entry.level >= 4 ? 'pl-8' : entry.level === 3 ? 'pl-4' : '';
                    return (
                      <li key={`${key}-${entry.id}`} className={indentClass}>
                        <a href={`#${entry.id}`} className="hover:text-[#8a4f41] hover:underline">
                          {entry.text}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[#7f7a6f]">Mục lục sẽ tự tạo khi bài có block tiêu đề.</p>
              )}
            </section>
          );
        }

        if (block?.type === 'paragraph') {
          return <p key={key} className="whitespace-pre-line leading-8 text-[#453f36]">{block.text || ''}</p>;
        }

        if (block?.type === 'image') {
          return (
            <figure key={key} className="overflow-hidden rounded-2xl border border-[#eee5d6] bg-[#faf8f2]">
              {block.url ? <img src={block.url} alt={block.caption || 'Tip image'} className="h-auto w-full object-cover" /> : null}
              {block.caption ? <figcaption className="px-4 py-3 text-sm text-[#7a756a]">{block.caption}</figcaption> : null}
            </figure>
          );
        }

        if (block?.type === 'image_text') {
          const reverse = block.image_position === 'right';
          return (
            <section key={key} className={`grid grid-cols-1 gap-4 rounded-2xl bg-[#faf8f2] p-4 md:grid-cols-2 ${reverse ? 'md:[&>*:first-child]:order-2' : ''}`}>
              <div className="overflow-hidden rounded-xl bg-[#efe8dc]">{block.image_url ? <img src={block.image_url} alt={block.title || 'Image'} className="h-full w-full object-cover" /> : null}</div>
              <div className="space-y-2">
                {block.title ? <h3 className="text-xl font-bold text-[#2f2722]">{block.title}</h3> : null}
                <p className="whitespace-pre-line text-[#4d473f]">{block.text || ''}</p>
              </div>
            </section>
          );
        }

        if (block?.type === 'gallery') {
          const images = splitLines(block.images);
          return (
            <section key={key} className="space-y-3">
              {block.title ? <h3 className="text-xl font-extrabold text-[#2f2722]">{block.title}</h3> : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {images.map((url, i) => (
                  <div key={`${key}-${i}`} className="overflow-hidden rounded-xl bg-[#efe8dc]">
                    <img src={url} alt={`Gallery ${i + 1}`} className="h-52 w-full object-cover" />
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (block?.type === 'video') {
          const embedUrl = resolveVideoEmbedUrl(block.url);
          return (
            <section key={key} className="space-y-3 rounded-2xl bg-[#faf8f2] p-4">
              {block.title ? <h3 className="text-xl font-extrabold text-[#2f2722]">{block.title}</h3> : null}
              {embedUrl ? (
                <div className="overflow-hidden rounded-xl bg-black">
                  <iframe
                    title={block.title || 'Video'}
                    src={embedUrl}
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : null}
              {block.description ? <p className="text-[#4d473f]">{block.description}</p> : null}
            </section>
          );
        }

        if (block?.type === 'quote') {
          return (
            <blockquote key={key} className="rounded-2xl border-l-4 border-[#8a4f41] bg-[#f8efe8] px-5 py-4 italic text-[#4d473f]">
              <p>"{block.quote || ''}"</p>
              {block.author ? <footer className="mt-2 not-italic font-semibold text-[#2f2722]">- {block.author}</footer> : null}
            </blockquote>
          );
        }

        if (block?.type === 'checklist') {
          const items = splitLines(block.items);
          return (
            <section key={key} className="space-y-3 rounded-2xl bg-[#f4f9ef] p-4">
              {block.title ? <h3 className="text-lg font-extrabold text-[#2f2722]">{block.title}</h3> : null}
              <ul className="space-y-2">
                {items.map((itemText, i) => (
                  <li key={`${key}-${i}`} className="flex items-start gap-2 text-[#374331]">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[#67a341]" />
                    <span>{itemText}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        }

        if (block?.type === 'list') {
          const items = splitLines(block.items);
          const isOrdered = Boolean(block.ordered);
          const ListTag = isOrdered ? 'ol' : 'ul';
          return (
            <section key={key} className="space-y-3 rounded-2xl bg-[#f8f3ea] p-4">
              {block.title ? <h3 className="text-lg font-extrabold text-[#2f2722]">{block.title}</h3> : null}
              <ListTag className={`space-y-2 pl-5 text-[#453f36] ${isOrdered ? 'list-decimal' : 'list-disc'}`}>
                {items.map((itemText, i) => (
                  <li key={`${key}-${i}`}>{itemText}</li>
                ))}
              </ListTag>
            </section>
          );
        }

        if (block?.type === 'faq') {
          const faqItems = normalizeFaqItems(block.items);
          return (
            <section key={key} className="space-y-3 rounded-2xl bg-[#faf8f2] p-4">
              {block.title ? <h3 className="text-lg font-extrabold text-[#2f2722]">{block.title}</h3> : null}
              <div className="space-y-2">
                {faqItems.map((item, i) => (
                  <details key={`${key}-${i}`} className="rounded-xl border border-[#e9e0cf] bg-white px-3 py-2">
                    <summary className="cursor-pointer font-semibold text-[#2f2722]">{item.question || `Câu hỏi ${i + 1}`}</summary>
                    {item.answer ? <p className="mt-2 whitespace-pre-line text-[#4d473f]">{item.answer}</p> : null}
                  </details>
                ))}
              </div>
            </section>
          );
        }

        if (block?.type === 'table') {
          const headers = splitLines(block.headers);
          const rows = normalizeTableRows(block.rows);
          return (
            <section key={key} className="space-y-3">
              {block.title ? <h3 className="text-lg font-extrabold text-[#2f2722]">{block.title}</h3> : null}
              <div className="overflow-x-auto rounded-2xl border border-[#e9e0cf] bg-white">
                <table className="min-w-full text-left text-sm text-[#453f36]">
                  {headers.length > 0 ? (
                    <thead className="bg-[#f8f3ea]">
                      <tr>
                        {headers.map((header, idx) => (
                          <th key={`${key}-h-${idx}`} className="border-b border-[#eee5d6] px-3 py-2 font-bold text-[#2f2722]">{header}</th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={`${key}-r-${rowIndex}`}>
                        {row.map((cell, colIndex) => (
                          <td key={`${key}-c-${rowIndex}-${colIndex}`} className="border-b border-[#f1e9da] px-3 py-2 align-top">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        }

        if (block?.type === 'divider') {
          return <hr key={key} className="border-0 border-t border-dashed border-[#e4dcca]" />;
        }

        if (block?.type === 'spacer') {
          const height = Math.max(12, Math.min(140, Number(block.height || 40)));
          return <div key={key} style={{ height }} aria-hidden="true" />;
        }

        if (block?.type === 'callout') {
          const tone = toneStyle[block.tone] || toneStyle.info;
          return (
            <section key={key} className={`rounded-2xl border px-4 py-3 ${tone}`}>
              {block.title ? <h3 className="font-extrabold">{block.title}</h3> : null}
              <p className="mt-1 whitespace-pre-line">{block.text || ''}</p>
            </section>
          );
        }

        if (block?.type === 'cta') {
          return (
            <section key={key} className="rounded-2xl bg-[#2f2722] px-5 py-6 text-[#fff4e9]">
              {block.title ? <h3 className="text-2xl font-extrabold">{block.title}</h3> : null}
              {block.description ? <p className="mt-2 text-[#e4d5c2]">{block.description}</p> : null}
              {block.button_text && block.button_url ? (
                <div className="mt-4">
                  <Link to={String(block.button_url)} className="inline-flex rounded-full bg-[#fdb19f] px-5 py-2.5 font-bold text-[#4c2219]">
                    {block.button_text}
                  </Link>
                </div>
              ) : null}
            </section>
          );
        }

        if (block?.type === 'products') {
          const items = normalizeProductItems(block.items);
          const title = String(block.title || '').trim() || 'Sản phẩm liên quan';

          return (
            <section key={key} className="space-y-3 rounded-2xl bg-[#faf8f2] p-4">
              <h3 className="text-lg font-extrabold text-[#2f2722]">{title}</h3>
              {items.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {items.map((item, itemIndex) => {
                    const imageUrl = item.image || FALLBACK_PRODUCT_IMAGE;
                    const Wrapper = item.url ? 'a' : 'div';
                    const wrapperProps = item.url
                      ? { href: item.url, target: '_blank', rel: 'noreferrer' }
                      : {};

                    return (
                      <Wrapper
                        key={`${key}-product-${itemIndex}`}
                        {...wrapperProps}
                        className={`overflow-hidden rounded-xl border border-[#e8decd] bg-white ${item.url ? 'transition hover:shadow-[0_10px_20px_rgba(53,50,41,0.12)]' : ''}`}
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-[#efe8dc]">
                          <img src={imageUrl} alt={item.name || `Sản phẩm ${itemIndex + 1}`} className="h-full w-full object-cover" />
                        </div>
                        <div className="space-y-1 p-3">
                          <div className="line-clamp-2 font-bold text-[#2f2722]">{item.name || `Sản phẩm ${itemIndex + 1}`}</div>
                          {item.price ? <div className="text-sm font-semibold text-[#8a4f41]">{item.price}</div> : null}
                          {item.url ? <div className="text-xs font-semibold text-[#7d4f3f]">Xem chi tiết</div> : null}
                        </div>
                      </Wrapper>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#7f7a6f]">Chưa có sản phẩm nào trong block này.</p>
              )}
            </section>
          );
        }

        return null;
      })}
    </div>
  );
};

export default TipBlocksRenderer;
