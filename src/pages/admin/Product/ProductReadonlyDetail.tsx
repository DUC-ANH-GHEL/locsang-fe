import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Eye, ExternalLink } from 'lucide-react';
import { getProductById, updateAdminProductSeo } from '../../../services/productService';

const slugify = (value?: string | null) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'san-pham';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'san-pham';
};

const truncateText = (value: string, maxLength: number) => {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
};

const formatMoney = (value: any, currency = 'VND') => {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '-';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(num);
};

const looksLikeHtml = (text: string) => /<\/?[a-z][\s\S]*>/i.test(text);

const isObject = (value: any) => typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = (value: any) => (Array.isArray(value) ? value : []);

const getArrayText = (value: any) => {
  if (!Array.isArray(value) || value.length === 0) return '-';
  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (isObject(item)) return String(item.name || item.note || item.value || JSON.stringify(item));
      return String(item);
    })
    .join(', ');
};

const copyToClipboard = async (value: string, label: string) => {
  try {
    await navigator.clipboard.writeText(value);
    alert(`Da copy ${label}`);
  } catch {
    alert(`Khong the copy ${label}`);
  }
};

const FieldRow = ({ label, value }: { label: string; value: any }) => (
  <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
    <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
    <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 break-all">
      {value === null || value === undefined || value === '' ? '-' : String(value)}
    </div>
  </div>
);

const collectVariantMedia = (variant: any) => {
  const raw = variant?.pancake_overview?.raw || variant?.pancake_payload || {};
  const out: Array<{ url: string; type: 'image' | 'video' }> = [];
  const seen = new Set<string>();

  const push = (url?: string | null, type: 'image' | 'video' = 'image') => {
    const normalized = String(url || '').trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push({ url: normalized, type });
  };

  if (typeof variant?.image_url === 'string') push(variant.image_url, 'image');
  if (typeof variant?.image === 'string') push(variant.image, 'image');

  asArray(raw?.images).forEach((item: any) => {
    if (typeof item === 'string') push(item, 'image');
    if (isObject(item)) push(item.url || item.image_url, 'image');
  });

  asArray(raw?.videos).forEach((item: any) => {
    if (typeof item === 'string') push(item, 'video');
    if (isObject(item)) push(item.url || item.video_url, 'video');
  });

  if (typeof raw?.video_url === 'string') push(raw.video_url, 'video');
  return out;
};

const ProductReadonlyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seoDraft, setSeoDraft] = useState({ slug: '', meta_title: '', meta_description: '' });
  const [seoSaving, setSeoSaving] = useState(false);
  const [variantMediaModal, setVariantMediaModal] = useState<{
    variantName: string;
    items: Array<{ url: string; type: 'image' | 'video' }>;
    selectedIndex: number;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getProductById(id);
        setProduct(data);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Không tải được chi tiết sản phẩm');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const baseSeoSlug = useMemo(() => {
    const fromPancake = product?.pancake_overview?.seo_slug || product?.pancake_overview?.raw?._seo_slug;
    return String(fromPancake || product?.slug || slugify(product?.name)).trim();
  }, [product]);

  const baseSeoTitle = useMemo(() => {
    const manual = String(product?.pancake_overview?.meta_title || product?.pancake_overview?.raw?._meta_title || '').trim();
    if (manual) return manual;
    return truncateText(`${product?.name || 'Sản phẩm'} | Lộc Sang`, 60);
  }, [product?.name, product?.pancake_overview?.meta_title, product?.pancake_overview?.raw?._meta_title]);

  const baseSeoDescription = useMemo(() => {
    const manual = String(product?.pancake_overview?.meta_description || product?.pancake_overview?.raw?._meta_description || '').trim();
    if (manual) return manual;
    const candidate = String(product?.short_description || product?.description || '').replace(/\s+/g, ' ').trim();
    if (!candidate) return 'Khám phá sản phẩm chọn lọc tại Lộc Sang, đặt hàng nhanh và giao hàng toàn quốc.';
    return truncateText(candidate, 155);
  }, [
    product?.short_description,
    product?.description,
    product?.pancake_overview?.meta_description,
    product?.pancake_overview?.raw?._meta_description,
  ]);

  useEffect(() => {
    if (!product) return;
    setSeoDraft({
      slug: baseSeoSlug,
      meta_title: baseSeoTitle,
      meta_description: baseSeoDescription,
    });
  }, [product?.id, baseSeoSlug, baseSeoTitle, baseSeoDescription]);

  const seoSlug = useMemo(() => slugify(seoDraft.slug || baseSeoSlug || product?.name), [seoDraft.slug, baseSeoSlug, product?.name]);

  const seoTitle = useMemo(() => {
    const text = String(seoDraft.meta_title || '').trim() || baseSeoTitle;
    return truncateText(text, 60);
  }, [seoDraft.meta_title, baseSeoTitle]);

  const seoDescription = useMemo(() => {
    const text = String(seoDraft.meta_description || '').trim() || baseSeoDescription;
    return truncateText(text, 155);
  }, [seoDraft.meta_description, baseSeoDescription]);

  const seoUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://locsang.shop';
    return `${origin}/products/${id}/${seoSlug}`;
  }, [id, seoSlug]);

  const pancakeRaw = product?.pancake_overview?.raw || {};

  const copyText = (value: string, label: string) => copyToClipboard(value, label);

  const hasSeoChanges = useMemo(() => {
    if (!product) return false;
    return (
      String(seoDraft.slug || '').trim() !== String(baseSeoSlug || '').trim()
      || String(seoDraft.meta_title || '').trim() !== String(baseSeoTitle || '').trim()
      || String(seoDraft.meta_description || '').trim() !== String(baseSeoDescription || '').trim()
    );
  }, [product, seoDraft.slug, seoDraft.meta_title, seoDraft.meta_description, baseSeoSlug, baseSeoTitle, baseSeoDescription]);

  const resetSeoDraft = () => {
    setSeoDraft({
      slug: baseSeoSlug,
      meta_title: baseSeoTitle,
      meta_description: baseSeoDescription,
    });
  };

  const saveSeo = async () => {
    if (!id) return;
    try {
      setSeoSaving(true);
      const productId = Number(id);
      await updateAdminProductSeo(productId, {
        slug: seoSlug,
        seo_slug: seoSlug,
        meta_title: String(seoDraft.meta_title || '').trim() || null,
        meta_description: String(seoDraft.meta_description || '').trim() || null,
        short_description: String(seoDraft.meta_description || '').trim() || null,
      });

      const latest = await getProductById(productId);
      setProduct(latest);
      alert('Da cap nhat SEO');
    } catch (err: any) {
      const statusCode = Number(err?.response?.status || 0);
      if (statusCode === 409) {
        alert('Slug da ton tai, vui long chon slug khac');
      } else {
        alert(err?.response?.data?.message || err?.message || 'Khong the cap nhat SEO');
      }
    } finally {
      setSeoSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-600">Đang tải chi tiết sản phẩm...</div>;
  if (error) return <div className="rounded-2xl border border-rose-300 bg-rose-50 text-rose-700 p-4">{error}</div>;
  if (!product) return <div className="p-6 text-gray-600">Không tìm thấy sản phẩm.</div>;

  const desc = String(product?.description || '').trim();
  const shortDesc = String(product?.short_description || '').trim();
  const productAttributes = asArray(pancakeRaw?.product_attributes);
  const warehouses = asArray(pancakeRaw?.manipulation_warehouses);
  const supplierIds = asArray(pancakeRaw?.supplier_product_ids);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 font-semibold">
          <Eye size={18} /> Chế độ chỉ xem (Read-only)
        </div>
        <button type="button" onClick={() => navigate('/admin/products')} className="inline-flex items-center gap-2 rounded-xl border border-blue-300 dark:border-blue-700 px-3 py-2 text-sm font-semibold">
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{product.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">SKU: {product.sku || '-'}</span>
              <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">Slug: {product.slug || '-'}</span>
              <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">Pancake ID: {product.pancake_product_id || '-'}</span>
              <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">Status: {product.status || '-'}</span>
            </div>
          </div>
          <div className="text-right text-sm text-gray-600 dark:text-gray-300">
            <div>Giá: <span className="font-semibold">{formatMoney(product.price, product.currency)}</span></div>
            <div>Tồn: <span className="font-semibold">{Number(product.stock || 0).toLocaleString('vi-VN')}</span></div>
            <div>Biến thể: <span className="font-semibold">{(product.variants || []).length}</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <h2 className="text-lg font-bold mb-3">Thông tin sản phẩm (Pancake)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldRow label="Tên sản phẩm" value={product?.name || pancakeRaw?.name} />
              <FieldRow label="Mã sản phẩm" value={`${pancakeRaw?.display_id || '-'}`} />
              <FieldRow label="Keyword" value={product?.pancake_overview?.keyword} />
              <FieldRow label="Loại sản phẩm" value={product?.pancake_overview?.product_type} />
              <FieldRow label="Danh mục" value={getArrayText(pancakeRaw?.categories || product?.pancake_overview?.categories)} />
              <FieldRow label="Tags" value={getArrayText(pancakeRaw?.tags || product?.pancake_overview?.tags)} />
              <FieldRow label="Kho thao tác" value={product?.pancake_overview?.warehouse} />
              <FieldRow label="Nhà cung cấp" value={product?.pancake_overview?.supplier} />
              <FieldRow label="Link nhập hàng" value={product?.pancake_overview?.import_link} />
              <FieldRow label="Trạng thái in" value={`hide_name_when_print=${String(Boolean(product?.pancake_overview?.hide_name_when_print))} | skip_print_when_order=${String(Boolean(product?.pancake_overview?.skip_print_when_order))}`} />
              {/* <FieldRow label="Bán tồn âm" value={String(Boolean(product?.pancake_overview?.is_sell_negative))} /> */}
              <FieldRow label="Bán tồn âm" value={String(Boolean(
                product?.variants?.[0]?.allow_backorder
                ?? product?.pancake_overview?.is_sell_negative
              ))} />
              <FieldRow label="Tính tiền theo cân nặng" value={String(Boolean(product?.pancake_overview?.is_weighted_pricing))} />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <h2 className="text-lg font-bold mb-3">Mô tả</h2>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Mô tả ngắn</div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-sm whitespace-pre-wrap">{shortDesc || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Mô tả chi tiết (richtext)</div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-sm leading-6">
                  {desc ? (looksLikeHtml(desc) ? <div dangerouslySetInnerHTML={{ __html: desc }} /> : <div className="whitespace-pre-wrap">{desc}</div>) : '-'}
                </div>
              </div>
            </div>
          </div>

          {productAttributes.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <h2 className="text-lg font-bold mb-3">Thuộc tính sản phẩm</h2>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="px-3 py-2 text-left">Thuộc tính</th>
                      <th className="px-3 py-2 text-left">Giá trị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productAttributes.map((attr: any, idx: number) => (
                      <tr key={`${attr?.name || 'attr'}-${idx}`} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-3 py-2">{attr?.name || '-'}</td>
                        <td className="px-3 py-2">{getArrayText(attr?.values)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
            <h2 className="text-lg font-bold">Biến thể</h2>
            {(product.variants || []).length === 0 && <div className="text-sm text-gray-500">Không có biến thể</div>}
            {(product.variants || []).length > 0 && (
              <div className="overflow-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">Hình ảnh</th>
                      <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Mã mẫu</th>
                      <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Mã vạch</th>
                      <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Giá nhập cuối</th>
                      <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Giá bán</th>
                      <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Thuộc tính</th>
                      <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Trọng lượng (g)</th>
                      <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Tổng nhập</th>
                      <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Có thể bán</th>
                      <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Tồn kho</th>
                      <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Sắp về</th>
                      <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Đang hoàn</th>
                      <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">D x R x C</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(product.variants || []).map((v: any, idx: number) => {
                      const raw = v?.pancake_overview?.raw || v?.pancake_payload || {};
                      const attrText = Object.keys(v.attribute_values || {}).length > 0
                        ? Object.entries(v.attribute_values || {}).map(([k, val]) => `${k}: ${val}`).join(' | ')
                        : '-';
                      const variantCode = String(
                        v?.pancake_overview?.name
                        || v?.pancake_overview?.display_id
                        || raw?.name
                        || raw?.display_id
                        || v?.sku
                        || '-'
                      ).trim() || '-';

                      const importPriceValue =
                        v?.pancake_overview?.last_import_price
                        ?? raw?.last_import_price
                        ?? raw?.lastImportPrice
                        ?? raw?.product?.last_import_price
                        ?? raw?.product?.lastImportPrice
                        ?? raw?.import_price
                        ?? raw?.importPrice
                        ?? v?.cost_price
                        ?? null;

                      const rawFields = Array.isArray(raw?.fields) ? raw.fields : [];
                      const dimensionFromFields = rawFields
                        .map((f: any) => ({
                          name: String(f?.name || '').toLowerCase().trim(),
                          value: String(f?.value || '').trim(),
                        }))
                        .find((f: any) =>
                          f.value && (
                            f.name.includes('d x r x c')
                            || f.name.includes('dxrxc')
                            || f.name.includes('kich thuoc')
                            || f.name.includes('kích thước')
                            || f.name.includes('dimension')
                          )
                        )?.value;

                      const dimParts = [
                        raw?.length ?? product?.length,
                        raw?.width ?? product?.width,
                        raw?.height ?? product?.height,
                      ]
                        .map((x) => (x === null || x === undefined || String(x).trim() === '' ? null : String(x).trim()))
                        .filter(Boolean);
                      const dimText =
                        String(
                          v?.pancake_overview?.size_text
                          || raw?.dimension_text
                          || raw?.dimension
                          || raw?.size_text
                          || raw?.size
                          || raw?.product?.dimension_text
                          || raw?.product?.dimension
                          || raw?.product?.size
                          || dimensionFromFields
                          || ''
                        ).trim()
                        || (dimParts.length === 3 ? dimParts.join(' x ') : '-');
                      const variantMedia = collectVariantMedia(v);
                      const mediaThumb = variantMedia.find((m) => m.type === 'image') || variantMedia[0] || null;

                      return (
                        <tr key={v.id || `${v.sku}-${idx}`} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="px-3 py-2 text-center">
                            {mediaThumb ? (
                              <button
                                type="button"
                                onClick={() => setVariantMediaModal({ variantName: variantCode, items: variantMedia, selectedIndex: 0 })}
                                className="inline-flex h-9 w-9 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 hover:border-blue-400"
                                title="Xem media biến thể"
                              >
                                {mediaThumb.type === 'video' ? (
                                  <span className="h-full w-full bg-gray-900 text-white text-[10px] flex items-center justify-center">VIDEO</span>
                                ) : (
                                  <img src={mediaThumb.url} alt={variantCode} className="h-full w-full object-cover" />
                                )}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{variantCode}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{v?.pancake_overview?.barcode || '-'}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{importPriceValue === null ? '-' : formatMoney(importPriceValue, product.currency)}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{formatMoney(v?.price, product.currency)}</td>
                          <td className="px-3 py-2 min-w-[260px]">{attrText}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{v?.pancake_overview?.weight ?? '-'}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{v?.pancake_overview?.total_import ?? '-'}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{v?.pancake_overview?.available_quantity ?? '-'}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{Number(v?.stock ?? v?.pancake_overview?.remain_quantity ?? 0).toLocaleString('vi-VN')}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{v?.pancake_overview?.incoming_quantity ?? 0}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">{v?.pancake_overview?.returning_quantity ?? 0}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{dimText}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <h2 className="text-lg font-bold mb-3">SEO Preview</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs uppercase tracking-wider text-gray-500">Slug</label>
                <input
                  type="text"
                  value={seoDraft.slug}
                  onChange={(e) => setSeoDraft((prev) => ({ ...prev, slug: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                  placeholder="slug-san-pham"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-gray-500">Meta title</label>
                <input
                  type="text"
                  value={seoDraft.meta_title}
                  onChange={(e) => setSeoDraft((prev) => ({ ...prev, meta_title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                  placeholder="Tieu de SEO"
                />
                <div className="mt-1 text-xs text-gray-500">{seoTitle.length}/60 ky tu</div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-gray-500">Meta description</label>
                <textarea
                  value={seoDraft.meta_description}
                  onChange={(e) => setSeoDraft((prev) => ({ ...prev, meta_description: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm min-h-[88px]"
                  placeholder="Mo ta SEO"
                />
                <div className="mt-1 text-xs text-gray-500">{seoDescription.length}/155 ky tu</div>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-2"><b>Slug chuan:</b> {seoSlug}</div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-2 break-all"><b>URL:</b> {seoUrl}</div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-2"><b>Preview title:</b> {seoTitle}</div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-2"><b>Preview description:</b> {seoDescription}</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveSeo}
                disabled={seoSaving || !hasSeoChanges}
                className="inline-flex items-center gap-1 rounded-xl border border-blue-300 bg-blue-600 text-white px-3 py-1.5 text-xs disabled:opacity-50"
              >
                {seoSaving ? 'Dang luu...' : 'Luu SEO'}
              </button>
              <button
                type="button"
                onClick={resetSeoDraft}
                disabled={seoSaving || !hasSeoChanges}
                className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Hoan tac
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => copyText(seoUrl, 'URL')} className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs"><Copy size={12} /> URL</button>
              <button type="button" onClick={() => copyText(seoTitle, 'Meta Title')} className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs"><Copy size={12} /> Title</button>
              <button type="button" onClick={() => copyText(seoDescription, 'Meta Description')} className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs"><Copy size={12} /> Description</button>
            </div>
          </div>

          {warehouses.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <h2 className="text-lg font-bold mb-3">Kho thao tác</h2>
              <div className="space-y-2 text-sm">
                {warehouses.map((w: any, idx: number) => (
                  <div key={`wh-${idx}`} className="rounded-xl border border-gray-200 dark:border-gray-800 p-2">
                    <div><b>ID:</b> {w?.id ?? '-'}</div>
                    <div><b>Tên kho:</b> {w?.name || w?.warehouse_name || '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <h2 className="text-lg font-bold mb-3">Dữ liệu phụ</h2>
            <div className="space-y-2 text-sm">
              <div><b>Supplier product ids:</b> {supplierIds.length > 0 ? supplierIds.join(', ') : '-'}</div>
              <div><b>Measure group id:</b> {pancakeRaw?.measure_group_id ?? '-'}</div>
              <div><b>Published:</b> {String(pancakeRaw?.is_published ?? '-')}</div>
              <div><b>Inserted at:</b> {pancakeRaw?.inserted_at || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      {variantMediaModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setVariantMediaModal(null)}>
          <div className="w-full max-w-4xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-sm text-gray-500">Media biến thể</div>
                <div className="text-base font-bold text-gray-900 dark:text-gray-100">{variantMediaModal.variantName}</div>
              </div>
              <button type="button" onClick={() => setVariantMediaModal(null)} className="rounded-lg border px-3 py-1.5 text-sm">Đóng</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-50 dark:bg-gray-950">
                {variantMediaModal.items[variantMediaModal.selectedIndex]?.type === 'video' ? (
                  <video src={variantMediaModal.items[variantMediaModal.selectedIndex]?.url} controls className="w-full h-[360px] object-contain bg-black" />
                ) : (
                  <img src={variantMediaModal.items[variantMediaModal.selectedIndex]?.url} alt="variant-media-selected" className="w-full h-[360px] object-contain" />
                )}
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <div className="text-sm font-semibold mb-2">Danh sách media ({variantMediaModal.items.length})</div>
                <div className="grid grid-cols-3 gap-2 max-h-[360px] overflow-auto">
                  {variantMediaModal.items.map((item, idx) => (
                    <button
                      key={`${item.url}-${idx}`}
                      type="button"
                      onClick={() => setVariantMediaModal((prev) => (prev ? { ...prev, selectedIndex: idx } : prev))}
                      className={`rounded-lg overflow-hidden border-2 ${idx === variantMediaModal.selectedIndex ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'
                        }`}
                      title={`${item.type} ${idx + 1}`}
                    >
                      {item.type === 'video' ? (
                        <div className="h-20 w-full bg-gray-900 text-white text-[11px] flex items-center justify-center">VIDEO</div>
                      ) : (
                        <img src={item.url} alt={`variant-media-${idx}`} className="h-20 w-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-3 text-xs">
                  <a
                    href={variantMediaModal.items[variantMediaModal.selectedIndex]?.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline break-all"
                  >
                    Mở media đang chọn <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductReadonlyDetail;
