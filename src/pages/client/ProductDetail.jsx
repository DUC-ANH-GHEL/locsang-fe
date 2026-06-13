import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ShoppingCart } from 'lucide-react';

import { useCart } from '../../contexts/CartContext';
import { productService } from '../../services/productService';
import { toProductDetailPath } from '../../utils/productUrl';
import { getProductPricing } from '../../utils/productPricing';
import { flyProductImageToCart } from '../../utils/cartFlyAnimation';
import { getProductCardImageUrl, getProductDetailImageUrl } from '../../utils/cloudinaryImage';
import { useSEO } from '../../hooks/useSEO';
import {
  formatVnd,
  canPurchaseProduct,
  getActiveVariants,
  getDiscountLabel,
  getDisplayDescription,
  getProductImage,
  toCartPayload,
} from '../../data/yanmarStorefront';

const getVariantLabel = (variant) => {
  if (!variant) return '';
  const attrValues = variant?.attribute_values && typeof variant.attribute_values === 'object'
    ? Object.values(variant.attribute_values).filter(Boolean)
    : [];
  return variant.variant_name || attrValues.join(' / ') || variant.sku || '';
};

const getGalleryImages = (product, variant) => {
  const images = [];
  const push = (url) => {
    const src = String(url || '').trim();
    if (src && !images.includes(src)) images.push(src);
  };

  push(variant?.image);
  if (Array.isArray(variant?.media_urls)) variant.media_urls.forEach(push);
  push(product?.thumbnail);
  if (Array.isArray(product?.images)) product.images.forEach(push);
  push(getProductImage(product));

  return images.slice(0, 5);
};

const cleanText = (value) =>
  String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizeDescriptionHtml = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (typeof window === 'undefined') return escapeHtml(raw);

  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  const html = hasHtml
    ? raw
    : raw
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
        .join('');

  const template = document.createElement('template');
  template.innerHTML = html;
  const allowedTags = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'UL', 'OL', 'LI']);

  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') {
          child.remove();
          return;
        }
        if (!allowedTags.has(child.tagName)) {
          const children = Array.from(child.childNodes);
          child.replaceWith(...children);
          children.forEach(walk);
          return;
        }
        Array.from(child.attributes).forEach((attribute) => child.removeAttribute(attribute.name));
      }
      walk(child);
    });
  };

  walk(template.content);
  return template.innerHTML.trim();
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const mainImageRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const productId = Number(id);

    const loadDetail = async () => {
      try {
        setLoading(true);
        const [detailResult, listResult] = await Promise.allSettled([
          Number.isFinite(productId) && productId > 0 ? productService.getStorefrontProductById(productId) : Promise.resolve(null),
          productService.getStorefrontProducts({
            status: 'active',
            limit: 12,
            page: 1,
            includeTotal: false,
            card: true,
            cacheKey: 'product-detail-related',
          }),
        ]);
        if (cancelled) return;

        const list = listResult.status === 'fulfilled' && Array.isArray(listResult.value) ? listResult.value : [];
        const detail =
          detailResult.status === 'fulfilled' && detailResult.value
            ? detailResult.value
            : list.find((item) => Number(item?.id) === Number(productId)) || null;

        setProduct(detail);
        setLoadFailed(false);
        setRelatedProducts(detail ? list.filter((item) => Number(item?.id) !== Number(detail?.id)).slice(0, 4) : []);

        const firstVariant = detail ? getActiveVariants(detail)[0] : null;
        setSelectedVariantId(firstVariant?.id ?? null);
        setSelectedImageIndex(0);
      } catch {
        if (!cancelled) {
          setProduct(null);
          setRelatedProducts([]);
          setSelectedVariantId(null);
          setSelectedImageIndex(0);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const variants = useMemo(() => getActiveVariants(product), [product]);
  const selectedVariant = useMemo(
    () => variants.find((variant) => Number(variant?.id) === Number(selectedVariantId)) || variants[0] || null,
    [selectedVariantId, variants],
  );
  const pricing = getProductPricing(selectedVariant || product);
  const galleryImages = useMemo(() => getGalleryImages(product, selectedVariant), [product, selectedVariant]);
  const stock = Number(selectedVariant?.stock ?? product?.stock ?? 0);
  const inStock = canPurchaseProduct(product, selectedVariant);
  const isBackorder = stock <= 0 && Boolean(selectedVariant?.allow_backorder ?? product?.allow_backorder);
  const canIncreaseQuantity = inStock && (isBackorder || stock <= 0 || quantity < stock);
  const discountLabel = getDiscountLabel(selectedVariant || product) || (pricing.hasDiscount ? '-15%' : '');
  const shortDescription = useMemo(() => cleanText(product?.short_description), [product?.short_description]);
  const longDescription = useMemo(() => sanitizeDescriptionHtml(product?.description), [product?.description]);

  useEffect(() => {
    if (selectedImageIndex >= galleryImages.length) {
      setSelectedImageIndex(0);
    }
  }, [galleryImages.length, selectedImageIndex]);

  const specifications = useMemo(() => {
    const rawSpecs = Array.isArray(product?.specifications) ? product.specifications : [];
    return rawSpecs
      .map((item) => ({
        label: String(item?.label || item?.key || item?.name || '').trim(),
        value: String(item?.value || '').trim(),
      }))
      .filter((item) => item.label && item.value);
  }, [product?.specifications]);

  useSEO({
    title: product?.name || 'Chi tiết sản phẩm Yanmar',
    description: getDisplayDescription(product),
    canonicalPath: product ? toProductDetailPath(product) : `/products/${id}`,
  });

  const addProduct = ({ animate = true } = {}) => {
    if (!product) return;
    if (!inStock) return;
    if (animate) flyProductImageToCart(mainImageRef.current);
    addToCart(toCartPayload(product, quantity, selectedVariant));
  };

  const buyNow = () => {
    addProduct({ animate: false });
    navigate('/checkout');
  };

  if ((loading || loadFailed) && !product) {
    return (
      <div className="min-h-[65vh] bg-white px-4 py-10 text-center font-sans">
        <div className="mx-auto h-10 w-10 rounded-full border-[3px] border-[#f1c1c5] border-t-[#e30613] animate-spin" />
        <p className="mt-4 font-bold text-[#555]">Đang tải sản phẩm...</p>
        <div className="mx-auto mt-8 h-[18rem] max-w-sm rounded-2xl bg-[#f2f2f2]" />
        <div className="mx-auto mt-4 h-8 max-w-sm rounded bg-[#eeeeee]" />
        <div className="mx-auto mt-3 h-8 max-w-[12rem] rounded bg-[#eeeeee]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[65vh] bg-white px-4 py-10 text-center font-sans">
        <p className="text-xl font-black text-[#111]">Không tìm thấy sản phẩm</p>
        <button type="button" onClick={() => navigate('/products')} className="mt-5 rounded-xl bg-[#e30613] px-5 py-3 font-black text-white">
          Về danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-[calc(env(safe-area-inset-bottom,0px)+10.3rem)] text-[#111] md:bg-[#f5f5f5]">
      <main className="mx-auto w-full max-w-[944px] bg-white font-sans md:shadow-2xl md:shadow-black/10">
        <section className="relative border-b border-[#e5e5e5] bg-white">
          {discountLabel && (
            <div className="absolute left-4 top-4 z-10 rounded-lg bg-[#e30613] px-3 py-2 text-[1.25rem] font-black leading-none text-white">
              {discountLabel}
            </div>
          )}
          <div className="flex min-h-[25rem] items-center justify-center px-5 py-6 max-[430px]:min-h-[20rem] max-[390px]:min-h-[17rem]">
            <img
              ref={mainImageRef}
              data-cart-fly-image
              src={getProductDetailImageUrl(galleryImages[selectedImageIndex] || getProductImage(product))}
              alt={product.name}
              fetchPriority="high"
              decoding="async"
              className="max-h-[23rem] max-w-full object-contain max-[430px]:max-h-[18.5rem] max-[390px]:max-h-[15.5rem]"
            />
          </div>
        </section>

        {galleryImages.length > 1 && (
          <section className="border-b border-[#eeeeee] px-4 py-3">
            <div className="grid grid-cols-4 gap-3">
              {galleryImages.slice(0, 4).map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex aspect-[1.35/1] items-center justify-center rounded-lg border bg-white p-1.5 ${
                    index === selectedImageIndex ? 'border-2 border-[#e30613]' : 'border-[#e1e1e1]'
                  }`}
                >
                  <img
                    src={getProductCardImageUrl(image)}
                    alt={`${product.name} ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="max-h-full max-w-full object-contain"
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="px-4 py-4">
          <h1 className="font-sans text-[2rem] font-black leading-tight text-[#333] max-[390px]:text-[1.55rem]">
            {product.name}
          </h1>

          <div className="mt-2 flex flex-wrap items-end gap-4">
            <span className="text-[2rem] font-black leading-none text-[#e30613] max-[390px]:text-[1.55rem]">
              {formatVnd(pricing.currentPrice)}
            </span>
            {pricing.originalPrice && (
              <span className="text-[1.25rem] leading-none text-[#777] line-through max-[390px]:text-[1rem]">
                {formatVnd(pricing.originalPrice)}
              </span>
            )}
          </div>

          {shortDescription && (
            <p className="mt-3 whitespace-pre-line text-[1.05rem] font-semibold leading-6 text-[#444] max-[390px]:text-[0.98rem]">
              {shortDescription}
            </p>
          )}

          {variants.length > 1 && (
            <div className="mt-4">
              <div className="text-sm font-bold text-[#333]">Phân loại</div>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {variants.map((variant) => {
                  const active = Number(variant.id) === Number(selectedVariant?.id);
                  return (
                    <button
                      key={variant.id || variant.sku}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-bold ${
                        active ? 'border-[#e30613] bg-[#fff1f2] text-[#e30613]' : 'border-[#dddddd] bg-white text-[#333]'
                      }`}
                    >
                      {getVariantLabel(variant)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center gap-4">
            <span className="text-[1.05rem] font-medium text-[#333]">Số lượng</span>
            <div className="grid h-10 w-[10rem] grid-cols-3 overflow-hidden rounded-lg border border-[#dddddd] bg-white">
              <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="text-2xl font-medium">-</button>
              <div className="flex items-center justify-center border-x border-[#eeeeee] text-lg font-black">{quantity}</div>
              <button
                type="button"
                disabled={!canIncreaseQuantity}
                onClick={() => setQuantity((value) => value + 1)}
                className="text-2xl font-medium disabled:cursor-not-allowed disabled:text-[#b7b7b7]"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-5 hidden grid-cols-2 gap-3 md:grid">
            <button
              type="button"
              onClick={buyNow}
              disabled={!inStock}
              className="h-12 rounded-lg bg-[#e30613] text-[1.05rem] font-black uppercase text-white shadow-[0_10px_24px_rgba(227,6,19,0.18)] transition hover:bg-[#c90512] disabled:cursor-not-allowed disabled:bg-[#bbbbbb] disabled:shadow-none"
            >
              Mua ngay
            </button>
            <button
              type="button"
              onClick={() => addProduct()}
              disabled={!inStock}
              className="flex h-12 items-center justify-center gap-3 rounded-lg border border-[#e30613] bg-white text-[1rem] font-black uppercase text-[#e30613] transition hover:bg-[#fff1f2] disabled:cursor-not-allowed disabled:border-[#bbbbbb] disabled:text-[#999]"
            >
              <ShoppingCart size={24} />
              Thêm vào giỏ
            </button>
          </div>


          {longDescription && (
            <div className="mt-4 rounded-xl border border-[#e1e1e1] bg-white p-4">
              <h2 className="text-[1.05rem] font-black uppercase text-[#111]">Mô tả sản phẩm</h2>
              <div
                className="mt-2 text-[1rem] font-medium leading-7 text-[#444] [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_strong]:font-black [&_ul]:list-disc"
                dangerouslySetInnerHTML={{ __html: longDescription }}
              />
            </div>
          )}

          {specifications.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-xl border border-[#e1e1e1] bg-white">
              <div className="border-b border-[#eeeeee] px-4 py-3 text-sm font-black uppercase text-[#e30613]">
                Thông số kỹ thuật
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm max-[390px]:text-xs">
                {specifications.map((spec) => (
                  <SpecRow key={`${spec.label}-${spec.value}`} label={spec.label} value={spec.value} />
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="px-4 pb-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-sans text-[1.2rem] font-black uppercase text-[#111]">Sản phẩm liên quan</h2>
            <button type="button" onClick={() => navigate('/products')} className="flex items-center gap-1 text-sm font-bold text-[#e30613]">
              Xem thêm <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {relatedProducts.map((item) => {
              const itemPricing = getProductPricing(item);
              const itemDiscount = getDiscountLabel(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(toProductDetailPath(item))}
                  className="relative overflow-hidden rounded-xl border border-[#e5e5e5] bg-white p-1.5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] active:scale-[0.99]"
                >
                  {itemDiscount && (
                    <span className="absolute left-2 top-2 z-10 rounded-md bg-[#e30613] px-2 py-1 text-[0.85rem] font-black leading-none text-white">
                      {itemDiscount}
                    </span>
                  )}
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-[#f7f7f7]">
                    <img
                      src={getProductCardImageUrl(getProductImage(item))}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="px-0.5 pb-1.5 pt-2">
                    <div className="line-clamp-2 min-h-[2.15rem] text-[1rem] font-black leading-[1.08] text-[#111] max-[390px]:text-[0.9rem]">
                      {item.name}
                    </div>
                    <div className="mt-2 flex flex-wrap items-end gap-1.5">
                      <span className="text-[1.2rem] font-black leading-none text-[#e30613] max-[390px]:text-[1.05rem]">
                        {formatVnd(itemPricing.currentPrice)}
                      </span>
                      {itemPricing.originalPrice && (
                        <span className="text-[0.82rem] font-bold leading-none text-[#888] line-through">
                          {formatVnd(itemPricing.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-[5.35rem] z-40 border-t border-[#eeeeee] bg-white px-3.5 py-2 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] md:hidden">
        <div className="mx-auto max-w-[944px] space-y-2">
          <button
            type="button"
            onClick={buyNow}
            disabled={!inStock}
            className="h-12 w-full rounded-lg bg-[#e30613] text-[1.25rem] font-black uppercase text-white disabled:bg-[#bbbbbb]"
          >
            Mua ngay
          </button>
          <button
            type="button"
            onClick={() => addProduct()}
            disabled={!inStock}
            className="flex h-10 w-full items-center justify-center gap-3 rounded-lg border border-[#e30613] bg-white text-[1rem] font-black uppercase text-[#e30613] disabled:border-[#bbbbbb] disabled:text-[#999]"
          >
            <ShoppingCart size={24} />
            Thêm vào giỏ
          </button>
        </div>
      </div>
    </div>
  );
};


const SpecRow = ({ label, value }) => (
  <>
    <div className="text-[#555]">{label}</div>
    <div className="font-medium text-[#111]">{value}</div>
  </>
);

export default ProductDetail;
