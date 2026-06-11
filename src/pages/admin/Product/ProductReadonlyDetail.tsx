import {
  ArrowLeft,
  BadgeCheck,
  BadgePercent,
  Boxes,
  Edit,
  FileText,
  Hash,
  Image as ImageIcon,
  Package,
  Settings2,
  Tag,
  Warehouse,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../../components/layout/Breadcrumb';
import { useToast } from '../../../components/Toast';
import { productService } from '../../../services/productService';

const fallbackImage = '/favicon.svg';

const formatCurrency = (value: unknown) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
};

const getText = (value: unknown, fallback = '-') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const toNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatPriceRange = (min: unknown, max: unknown) => {
  const a = toNumber(min);
  const b = toNumber(max);
  if (a === null && b === null) return '-';
  if (a !== null && b === null) return formatCurrency(a);
  if (a === null && b !== null) return formatCurrency(b);
  if (a === b) return formatCurrency(a);
  return `${formatCurrency(a)} - ${formatCurrency(b)}`;
};

const normalizeStatus = (value: unknown) => {
  const status = String(value || '').toLowerCase();
  if (status === 'active') return 'active';
  if (status === 'draft') return 'draft';
  if (status === 'discontinued' || status === 'inactive') return 'discontinued';
  return 'draft';
};

const statusMeta: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Đang bán',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20',
  },
  draft: {
    label: 'Nháp',
    className: 'bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20',
  },
  discontinued: {
    label: 'Ngừng bán',
    className: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
  },
};

const getImageList = (product: any) => {
  const list: string[] = [];
  const push = (value: unknown) => {
    const text = String(value ?? '').trim();
    if (text && !list.includes(text)) list.push(text);
  };

  if (Array.isArray(product?.media)) {
    product.media
      .slice()
      .sort((a: any, b: any) => Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0))
      .forEach((item: any) => push(item?.url || item?.image_url));
  }
  if (Array.isArray(product?.images)) {
    product.images.forEach((item: any) => {
      if (typeof item === 'string') push(item);
      else push(item?.url || item?.image_url);
    });
  }
  push(product?.thumbnail);
  if (Array.isArray(product?.variants)) {
    product.variants.forEach((variant: any) => push(variant?.image_url || variant?.image));
  }

  return list.length ? list : [fallbackImage];
};

const getSpecs = (product: any) => {
  const raw = Array.isArray(product?.specifications)
    ? product.specifications
    : Array.isArray(product?.specs)
      ? product.specs
      : [];

  return raw
    .map((item: any) => ({
      label: getText(item?.label || item?.key || item?.name || item?.title, ''),
      value: getText(item?.value, ''),
    }))
    .filter((item: { label: string; value: string }) => item.label && item.value);
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  tone = 'slate',
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  tone?: 'rose' | 'emerald' | 'amber' | 'slate';
}) => {
  const toneClass =
    tone === 'rose'
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
        : tone === 'amber'
          ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200'
          : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200';

  return (
    <div className={`rounded-2xl p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-black uppercase tracking-wide opacity-70">{label}</div>
        <Icon size={17} />
      </div>
      <div className="mt-2 break-words text-lg font-black leading-tight">{value}</div>
    </div>
  );
};

const DetailBlock = ({ label, value }: { label: string; value: unknown }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
    <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</div>
    <div className="mt-2 text-sm font-black text-slate-950 dark:text-white">{getText(value)}</div>
  </div>
);

const ProductReadonlyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [activeImage, setActiveImage] = useState(fallbackImage);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await productService.getProductById(id);
        if (mounted) setProduct(data?.data ?? data);
      } catch {
        showToast('Không tải được chi tiết sản phẩm', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, showToast]);

  const images = useMemo(() => getImageList(product), [product]);
  const variants = useMemo(() => (Array.isArray(product?.variants) ? product.variants : []), [product]);
  const specs = useMemo(() => getSpecs(product), [product]);

  useEffect(() => {
    setActiveImage(images[0] || fallbackImage);
  }, [images]);

  const status = normalizeStatus(product?.status || (product?.is_active ? 'active' : 'draft'));
  const statusInfo = statusMeta[status] || statusMeta.draft;
  const categoryLabel = product?.category?.name || product?.category_name || (product?.category_id ? `Danh mục #${product.category_id}` : '-');
  const stockTotal = variants.length
    ? variants.reduce((sum: number, variant: any) => sum + Number(variant?.stock || 0), 0)
    : Number(product?.stock || 0);
  const prices = variants.map((variant: any) => Number(variant?.price)).filter((value: number) => Number.isFinite(value) && value > 0);
  const salePrices = variants.map((variant: any) => Number(variant?.sale_price)).filter((value: number) => Number.isFinite(value) && value > 0);
  const priceMin = prices.length ? Math.min(...prices) : product?.price;
  const priceMax = prices.length ? Math.max(...prices) : product?.price;
  const saleMin = salePrices.length ? Math.min(...salePrices) : product?.sale_price;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="h-8 w-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="h-96 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-96 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          Không tìm thấy sản phẩm.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:py-6">
      <Breadcrumb items={[{ name: 'Trang chủ', path: '/admin' }, { name: 'Sản phẩm', path: '/admin/products' }, { name: getText(product.name, 'Chi tiết') }]} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${statusInfo.className}`}>{statusInfo.label}</span>
            {product.featured && <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20">Nổi bật</span>}
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{getText(product.name)}</h1>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span>SKU: {getText(product.sku)}</span>
            <span>Slug: {getText(product.slug)}</span>
            <span>{categoryLabel}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => navigate('/admin/products')} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <ArrowLeft size={16} /> Quay lại
          </button>
          <button type="button" onClick={() => navigate(`/admin/product/update/${product.id}`)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(225,29,72,0.22)] hover:bg-rose-700">
            <Edit size={16} /> Sửa sản phẩm
          </button>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="grid gap-5 lg:grid-cols-[23rem_minmax(0,1fr)]">
            <div>
              <div className="aspect-square overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800">
                <img src={activeImage} alt={getText(product.name)} className="h-full w-full object-cover" />
              </div>
              {images.length > 1 && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {images.map((src, index) => (
                    <button
                      key={`${src}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(src)}
                      className={`aspect-square overflow-hidden rounded-xl border bg-slate-50 transition ${
                        activeImage === src ? 'border-rose-600 ring-2 ring-rose-600/15' : 'border-slate-200 hover:border-rose-200'
                      }`}
                    >
                      <img src={src} alt={`${getText(product.name)} ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Package size={14} /> Tổng quan sản phẩm
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <StatCard icon={Tag} label="Giá bán" value={formatPriceRange(priceMin, priceMax)} tone="rose" />
                  <StatCard icon={BadgePercent} label="Giá sale" value={saleMin ? formatCurrency(saleMin) : 'Không có'} tone={saleMin ? 'amber' : 'slate'} />
                  <StatCard icon={Warehouse} label="Tồn kho" value={`${stockTotal.toLocaleString('vi-VN')} sản phẩm`} tone={stockTotal > 0 ? 'emerald' : 'rose'} />
                  <StatCard icon={Boxes} label="Biến thể" value={`${variants.length.toLocaleString('vi-VN')} biến thể`} />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                <div className="text-xs font-black uppercase tracking-wide text-slate-400">Mô tả ngắn</div>
                <div className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                  {getText(product.short_description || product.description, 'Chưa có mô tả.')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <DetailBlock label="Thương hiệu" value={product.brand || 'Yanmar'} />
          <DetailBlock label="Danh mục" value={categoryLabel} />
          <DetailBlock label="Mã sản phẩm" value={product.sku} />
          <DetailBlock label="Ảnh" value={`${images.length} ảnh`} />
        </aside>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <Boxes size={19} className="text-rose-600" />
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Biến thể và tồn kho</h2>
            </div>
            {variants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                Sản phẩm chưa có biến thể.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="py-3 pr-4 font-black">SKU</th>
                      <th className="py-3 pr-4 font-black">Tên</th>
                      <th className="py-3 pr-4 font-black">Giá bán</th>
                      <th className="py-3 pr-4 font-black">Giá sale</th>
                      <th className="py-3 pr-4 font-black">Tồn</th>
                      <th className="py-3 pr-4 font-black">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {variants.map((variant: any) => {
                      const variantStatus = statusMeta[normalizeStatus(variant.status || (variant.is_active ? 'active' : 'draft'))] || statusMeta.draft;
                      return (
                        <tr key={variant.id || variant.sku}>
                          <td className="py-3 pr-4 font-black text-slate-950 dark:text-white">{getText(variant.sku)}</td>
                          <td className="py-3 pr-4 font-semibold text-slate-600 dark:text-slate-300">{getText(variant.variant_name || variant.name || variant.title)}</td>
                          <td className="py-3 pr-4 font-black text-slate-950 dark:text-white">{formatCurrency(variant.price)}</td>
                          <td className="py-3 pr-4 font-semibold text-slate-600 dark:text-slate-300">{variant.sale_price ? formatCurrency(variant.sale_price) : 'Không có'}</td>
                          <td className="py-3 pr-4 font-black text-slate-950 dark:text-white">{getText(variant.stock)}</td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${variantStatus.className}`}>{variantStatus.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 size={19} className="text-rose-600" />
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Thông số kỹ thuật</h2>
            </div>
            {specs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                Chưa nhập thông số kỹ thuật.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {specs.map((spec: any, index: number) => (
                  <DetailBlock key={`${spec.label}-${index}`} label={spec.label} value={spec.value} />
                ))}
              </div>
            )}
          </section>

          {product.description && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2">
                <FileText size={19} className="text-rose-600" />
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Mô tả chi tiết</h2>
              </div>
              <div className="whitespace-pre-wrap text-sm font-medium leading-7 text-slate-700 dark:text-slate-200">{product.description}</div>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <Hash size={19} className="text-rose-600" />
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Định danh</h2>
            </div>
            <div className="space-y-3">
              <DetailBlock label="ID" value={product.id} />
              <DetailBlock label="Slug" value={product.slug} />
              <DetailBlock label="Tiền tệ" value={product.currency || 'VND'} />
              <DetailBlock label="Ngày tạo" value={product.created_at ? new Date(product.created_at).toLocaleString('vi-VN') : '-'} />
              <DetailBlock label="Cập nhật" value={product.updated_at ? new Date(product.updated_at).toLocaleString('vi-VN') : '-'} />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon size={19} className="text-rose-600" />
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Media</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {images.map((src, index) => (
                <button
                  key={`${src}-sidebar-${index}`}
                  type="button"
                  onClick={() => setActiveImage(src)}
                  className={`aspect-square overflow-hidden rounded-xl border bg-slate-50 ${
                    activeImage === src ? 'border-rose-600 ring-2 ring-rose-600/15' : 'border-slate-200 hover:border-rose-200'
                  }`}
                >
                  <img src={src} alt={`${getText(product.name)} ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <BadgeCheck size={19} className="text-rose-600" />
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Trạng thái bán</h2>
            </div>
            <div className="space-y-3">
              <DetailBlock label="Hiển thị storefront" value={status === 'active' ? 'Có' : 'Không'} />
              <DetailBlock label="Sản phẩm nổi bật" value={product.featured ? 'Có' : 'Không'} />
              <DetailBlock label="Quản lý tồn kho" value={stockTotal > 0 ? 'Còn hàng' : 'Hết hàng'} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ProductReadonlyDetail;
