import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaHeart, FaShare, FaPhoneAlt, FaTruck, FaShieldAlt, FaStar, FaRegStar, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../components/Toast/ToastContext';
import { productService } from '../../services/productService';
import { toProductDetailPath } from '../../utils/productUrl';
import { useSEO } from '../../hooks/useSEO';

const IMAGE_DEFAULT_URL = 'https://res.cloudinary.com/diwxfpt92/image/upload/v1770981822/logo_d2wmlf.png';

const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
};

const getPromotionKindLabel = (kind) => {
  const token = String(kind || '').trim().toLowerCase();
  if (token === 'discount_by_product') return 'Giảm trực tiếp theo sản phẩm';
  if (token === 'fixed_prices') return 'Giá cố định ưu đãi';
  if (token === 'order_value_discount') return 'Ưu đãi theo giá trị đơn hàng';
  if (token === 'voucher_coupon') return 'Mã giảm giá/Voucher';
  if (token === 'discount_by_attachment_products') return 'Giảm khi mua kèm sản phẩm đính kèm';
  if (token === 'combo_bundle') return 'Ưu đãi theo gói sản phẩm';
  return 'Ưu đãi đang áp dụng';
};

const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const formatDiscountTag = (value, isPercent) => {
  const amount = Number(value ?? NaN);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (isPercent) return `Giảm ${Math.round(amount)}%`;
  return `Giảm ${formatVnd(amount)}`;
};

const isDirectPricePromotion = (offer) => {
  const kind = String(offer?.promotion_kind || '').trim().toLowerCase();
  const meta = asObject(offer?.meta);
  const scope = String(meta?.scope || '').trim().toLowerCase();
  return scope === 'product' || ['discount_by_product', 'fixed_prices', 'general'].includes(kind);
};

const isVoucherPromotion = (offer) => {
  const kind = String(offer?.promotion_kind || '').trim().toLowerCase();
  const type = String(offer?.promotion_type || '').trim().toLowerCase();
  const meta = asObject(offer?.meta);
  const scope = String(meta?.scope || '').trim().toLowerCase();
  return scope === 'order' || ['order_value_discount', 'voucher_coupon'].includes(kind) || ['discount_by_order_price', 'discount_by_coupon_id', 'coupon'].includes(type);
};

const matchesCurrentProduct = (item, localProductId, pancakeProductId) => {
  const itemLocalId = String(item?.local_product_id ?? '');
  const itemPancakeId = String(item?.pancake_product_id ?? '');
  return (
    (!itemLocalId && !itemPancakeId)
    || (itemLocalId && localProductId && itemLocalId === localProductId)
    || (itemPancakeId && pancakeProductId && itemPancakeId === pancakeProductId)
  );
};

const estimateOfferPriceForCurrentProduct = ({
  offer,
  localProductId,
  pancakeProductId,
  basePrice,
}) => {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return null;

  const asPositivePrice = (...values) => {
    for (const value of values) {
      const parsed = Number(value ?? NaN);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return null;
  };

  const promotionProduct = asObject(offer?.promotion_product);

  // Prefer explicit discounted/fixed prices when backend already resolved promotion price.
  let candidate = asPositivePrice(
    offer?.discounted_price,
    offer?.price_after_discount,
    offer?.discount_price,
    offer?.fixed_prices,
    promotionProduct?.discounted_price,
    promotionProduct?.price_after_discount,
    promotionProduct?.discount_price,
    promotionProduct?.fixed_prices,
  );

  const items = Array.isArray(offer?.items) ? offer.items : [];
  const matchedItems = items.filter((item) => matchesCurrentProduct(item, localProductId, pancakeProductId));

  const itemPrices = matchedItems
    .map((item) => asPositivePrice(
      item?.discounted_price,
      item?.price_after_discount,
      item?.discount_price,
      item?.fixed_prices,
      item?.price,
      asObject(item?.product)?.discounted_price,
      asObject(item?.product)?.price_after_discount,
      asObject(item?.product)?.discount_price,
      asObject(item?.product)?.fixed_prices,
      asObject(item?.product)?.price,
      asObject(item?.item)?.discounted_price,
      asObject(item?.item)?.price_after_discount,
      asObject(item?.item)?.discount_price,
      asObject(item?.item)?.fixed_prices,
      asObject(item?.item)?.price,
      asObject(item?.variation)?.discounted_price,
      asObject(item?.variation)?.price_after_discount,
      asObject(item?.variation)?.discount_price,
      asObject(item?.variation)?.fixed_prices,
      asObject(item?.variation)?.price,
    ))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (itemPrices.length > 0) {
    const matchedItemMin = Math.min(...itemPrices);
    candidate = candidate == null ? matchedItemMin : Math.min(candidate, matchedItemMin);
  }

  // Fallback: some payloads omit product ids inside items for direct-product promotions.
  if (candidate == null && items.length > 0) {
    const looseItemPrices = items
      .map((item) => asPositivePrice(
        item?.discounted_price,
        item?.price_after_discount,
        item?.discount_price,
        item?.fixed_prices,
        item?.price,
      ))
      .filter((price) => Number.isFinite(price) && price > 0);
    if (looseItemPrices.length > 0) {
      candidate = Math.min(...looseItemPrices);
    }
  }

  const meta = asObject(offer?.meta);
  const fixedPrice = Number(meta?.fixed_price ?? NaN);
  if (Number.isFinite(fixedPrice) && fixedPrice > 0) {
    candidate = candidate == null ? fixedPrice : Math.min(candidate, fixedPrice);
  }

  const discountValue = Number(meta?.discount_value ?? NaN);
  if (Number.isFinite(discountValue) && discountValue > 0 && matchedItems.length > 0) {
    if (Boolean(meta?.is_percent)) {
      const pct = Math.max(0, Math.min(100, discountValue));
      let amount = basePrice * (pct / 100);
      const maxDiscount = Number(meta?.max_discount ?? NaN);
      if (Number.isFinite(maxDiscount) && maxDiscount > 0) {
        amount = Math.min(amount, maxDiscount);
      }
      const estimated = Math.max(0, basePrice - amount);
      candidate = candidate == null ? estimated : Math.min(candidate, estimated);
    } else {
      const estimated = Math.max(0, basePrice - discountValue);
      candidate = candidate == null ? estimated : Math.min(candidate, estimated);
    }
  }

  if (!Number.isFinite(candidate) || candidate == null || candidate >= basePrice) return null;
  return Number(candidate);
};

const getVariantLabel = (variant, index = 0) => {
  const apiVariantName = String(variant?.variant_name || '').trim();
  if (apiVariantName) return apiVariantName;

  const attributeMap = variant?.attribute_values && typeof variant.attribute_values === 'object'
    ? Object.values(variant.attribute_values).filter(Boolean)
    : [];
  const fromAttributeMap = attributeMap.join(' / ');

  const attributeValues = variant?.attribute_values && typeof variant.attribute_values === 'object'
    ? Object.values(variant.attribute_values).filter(Boolean)
    : [];
  const fromAttributes = attributeValues.join(' / ');
  const fromCommonFields = [variant?.size, variant?.color, variant?.material].filter(Boolean).join(' / ');
  return fromAttributeMap || fromAttributes || fromCommonFields || String(variant?.sku || `Biến thể ${index + 1}`);
};

const ProductDetail = () => {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { showToast } = useToast ? useToast() : { showToast: () => { } };

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [flyingImage, setFlyingImage] = useState(null);
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  // Thay selectedVariantId bằng selectedAttrs cho chọn thuộc tính kiểu Shopee
  const [selectedAttrs, setSelectedAttrs] = useState({});
  const [loading, setLoading] = useState(true);
  const galleryTopRef = useRef(null);
  const relatedVariantResolveCacheRef = useRef(new Map());
  const comboVariantResolveCacheRef = useRef(new Map());
  const [relatedVariantModalProduct, setRelatedVariantModalProduct] = useState(null);
  const [relatedVariantSelections, setRelatedVariantSelections] = useState({});
  const [relatedSelectedVariantId, setRelatedSelectedVariantId] = useState(null);
  const [comboSelectionMap, setComboSelectionMap] = useState({});
  const [comboVariantSelectionByItemKey, setComboVariantSelectionByItemKey] = useState({});
  const [comboVariantModalContext, setComboVariantModalContext] = useState(null);
  const [comboVariantSelections, setComboVariantSelections] = useState({});
  const [comboSelectedVariantId, setComboSelectedVariantId] = useState(null);
  const [comboBundleAutoAddPending, setComboBundleAutoAddPending] = useState(false);

  const productId = Number(id);

  // useEffect(() => {
  //   let cancelled = false;

  //   const loadProduct = async () => {
  //     if (!Number.isFinite(productId) || productId <= 0) {
  //       setProduct(null);
  //       setRelatedProducts([]);
  //       setLoading(false);
  //       return;
  //     }

  //     try {
  //       setLoading(true);
  //       const [detailResult, listResult] = await Promise.allSettled([
  //         productService.getStorefrontProductById(productId),
  //         productService.getStorefrontProducts({ status: 'active', limit: 100 }),
  //       ]);

  //       if (cancelled) return;

  //       const detail = detailResult.status === 'fulfilled' ? detailResult.value : null;
  //       const list = listResult.status === 'fulfilled' ? listResult.value : [];

  //       setProduct(detail || null);

  //       if (detail) {
  //         const related = (Array.isArray(list) ? list : [])
  //           .filter((p) => p.category_id === detail.category_id && p.id !== detail.id)
  //           .slice(0, 8);
  //         setRelatedProducts(related);

  //         const firstActiveVariant = Array.isArray(detail.variants)
  //           ? detail.variants.find((v) => v?.is_active !== false)
  //           : null;
  //         setSelectedVariantId(firstActiveVariant?.id ?? null);
  //       } else {
  //         setRelatedProducts([]);
  //         setSelectedVariantId(null);
  //       }
  //     } catch (error) {
  //       if (!cancelled) {
  //         setProduct(null);
  //         setRelatedProducts([]);
  //         if (showToast) showToast('Không tải được thông tin sản phẩm', 'error');
  //       }
  //     } finally {
  //       if (!cancelled) setLoading(false);
  //     }
  //   };

  //   loadProduct();
  //   return () => {
  //     cancelled = true;
  //   };
  // }, [productId, showToast]);

  const tagList = useMemo(() => (Array.isArray(product?.tags) ? product.tags.filter(Boolean) : []), [product]);

  const comboOffer = useMemo(() => {
    const offers = Array.isArray(product?.combo_offers) ? product.combo_offers : [];
    const first = offers.find((offer) => Array.isArray(offer?.items) && offer.items.length > 0);
    return first || null;
  }, [product]);

  const promotionOffers = useMemo(() => {
    const offers = Array.isArray(product?.promotion_offers) ? product.promotion_offers : [];
    return offers.filter((offer) => Array.isArray(offer?.items) && offer.items.length > 0);
  }, [product]);

  const comboItems = useMemo(() => (Array.isArray(comboOffer?.items) ? comboOffer.items : []), [comboOffer]);

  const selectedComboItems = useMemo(() => {
    return comboItems
      .map((item, index) => {
        const key = `${item?.local_product_id || item?.pancake_product_id || item?.label || index}`;
        return { ...item, __comboKey: key, __comboIndex: index };
      })
      .filter((item) => {
        const selected = comboSelectionMap[item.__comboKey];
        if (item?.required) return true;
        return Boolean(selected);
      });
  }, [comboItems, comboSelectionMap]);

  const getComboItemKey = (item, index) => `${item?.local_product_id || item?.pancake_product_id || item?.label || index}`;

  const getComboUnitPrice = (item, index) => {
    const key = item?.__comboKey || getComboItemKey(item, index);
    const selected = comboVariantSelectionByItemKey[key];
    const selectedPrice = Number(selected?.price ?? NaN);
    if (Number.isFinite(selectedPrice) && selectedPrice > 0) return selectedPrice;
    return Number(item?.price ?? 0);
  };

  const selectedComboBaseExtrasPrice = useMemo(() => {
    return selectedComboItems.reduce((sum, item) => {
      const unitPrice = getComboUnitPrice(item, item?.__comboIndex ?? 0);
      const qty = Math.max(1, Number(item?.quantity ?? 1));
      return sum + (Number.isFinite(unitPrice) ? unitPrice : 0) * qty;
    }, 0);
  }, [selectedComboItems, comboVariantSelectionByItemKey]);

  const comboSelectionStatus = useMemo(() => {
    let pending = 0;
    let missing = 0;

    for (const item of selectedComboItems) {
      const itemKey = item?.__comboKey || getComboItemKey(item, item?.__comboIndex ?? 0);
      const localProductId = Number(item?.local_product_id ?? 0);
      if (!Number.isFinite(localProductId) || localProductId <= 0) continue;

      const resolved = comboVariantResolveCacheRef.current.get(localProductId);
      if (!resolved) {
        pending += 1;
        continue;
      }

      const variants = Array.isArray(resolved?.variants)
        ? resolved.variants.filter((variant) => variant?.is_active !== false)
        : [];
      if (variants.length <= 1) continue;

      const manual = comboVariantSelectionByItemKey[itemKey];
      const hasValidManual = Number.isFinite(Number(manual?.product_variant_id))
        && variants.some((variant) => Number(variant?.id) === Number(manual?.product_variant_id));
      if (!hasValidManual) missing += 1;
    }

    return { pending, missing };
  }, [selectedComboItems, comboVariantSelectionByItemKey]);

  const richDescription = useMemo(() => {
    const value = String(product?.description || product?.short_description || '');
    const hasHtml = /<\/?[a-z][\s\S]*>/i.test(value);
    return {
      hasHtml,
      html: hasHtml ? value : '',
      text: value || 'Sản phẩm chưa có mô tả chi tiết.',
    };
  }, [product]);

  const reviewsList = useMemo(() => {
    return Array.isArray(product?.reviews) ? product.reviews : [];
  }, [product]);

  const ratingSummary = useMemo(() => {
    return product?.rating_summary || { average: 0, count: 0, breakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } };
  }, [product]);

  const renderStars = (rating, size = 14) => {
    const rounded = Math.max(0, Math.min(5, Math.round(Number(rating || 0))));
    return Array.from({ length: 5 }).map((_, idx) => (
      idx < rounded
        ? <FaStar key={idx} size={size} className="text-amber-400" />
        : <FaRegStar key={idx} size={size} className="text-gray-300" />
    ));
  };

  // const handleAddToCart = (e) => {
  //   if (e) e.preventDefault();
  //   if (!product) return;
  //   addToCart({
  //     product_id: Number(product.id),
  //     product_variant_id: Number.isFinite(Number(selectedVariant?.id)) ? Number(selectedVariant?.id) : null,
  //     title: product.name,
  //     price: Number(displayPrice || 0),
  //     image: cartImage,
  //     quantity,
  //     sku: selectedVariant?.sku || product.sku,
  //   });
  //   if (showToast) showToast('Đã thêm vào giỏ hàng!', 'success');
  // };

  // const handleBuyNow = (e) => {
  //   if (e) e.preventDefault();
  //   if (!product || productStock <= 0) return;
  //   addToCart({
  //     product_id: Number(product.id),
  //     product_variant_id: Number.isFinite(Number(selectedVariant?.id)) ? Number(selectedVariant?.id) : null,
  //     title: product.name,
  //     price: Number(displayPrice || 0),
  //     image: cartImage,
  //     quantity,
  //     sku: selectedVariant?.sku || product.sku,
  //     variant_label: selectedVariant?.variant_name   // ← thêm dòng này
  //       || Object.values(selectedVariant?.attribute_values || {}).filter(Boolean).join(' / ')
  //       || '',
  //   });
  //   navigate('/checkout');
  // };

  useEffect(() => {
    if (!product || loading) return;
    if (Number(product.id) !== productId) return;

    const expectedPath = toProductDetailPath(product);
    const currentPath = window.location.pathname;
    if (slug !== product.slug || currentPath !== expectedPath) {
      navigate(expectedPath, { replace: true });
    }
  }, [product, slug, navigate, loading]);

  const variants = useMemo(() => {
    if (!product?.variants || !Array.isArray(product.variants)) return [];
    return product.variants.filter((v) => v?.is_active !== false);
  }, [product]);


  // attributeStructure: [{ name, values: [] }]
  const attributeStructure = useMemo(() => {
    if (!variants.length) return [];
    const attrMap = {};
    const attrOrder = [];
    variants.forEach((variant) => {
      const av = variant?.attribute_values;
      if (!av || typeof av !== 'object') return;
      Object.entries(av).forEach(([key, value]) => {
        if (!key || !value) return;
        if (!attrMap[key]) { attrMap[key] = []; attrOrder.push(key); }
        if (!attrMap[key].includes(String(value))) attrMap[key].push(String(value));
      });
    });
    return attrOrder.map((name) => ({ name, values: attrMap[name] }));
  }, [variants]);

  // Tìm variant đúng với selectedAttrs
  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    if (!attributeStructure.length) return variants[0];
    // const attrKeys = attributeStructure.map((a) => a.name);
    // const allSelected = attrKeys.every((key) => selectedAttrs[key]);
    // if (!allSelected) return null;
    const attrKeys = attributeStructure.map((a) => a.name);
    // Chỉ require chọn đủ các attr mà variant hiện tại có
    const allSelected = attrKeys.every((key) => {
      if (selectedAttrs[key]) return true; // đã chọn → ok
      // Chưa chọn → chỉ fail nếu attr này applicable (có variant support nó)
      return !variants.some((v) => {
        const val = v.attribute_values?.[key];
        if (!val) return false;
        // Variant này có attr key, và match các attr đã chọn khác không?
        return attrKeys
          .filter((k) => k !== key)
          .every((k) => {
            const sel = selectedAttrs[k];
            if (!sel) return true;
            const vVal = v.attribute_values?.[k];
            if (!vVal) return true;
            return String(vVal) === String(sel);
          });
      });
    });
    if (!allSelected) return null;
    return (
      variants.find((variant) =>
        attrKeys.every((key) => String(variant?.attribute_values?.[key]) === String(selectedAttrs[key]))
      ) || null
    );
  }, [variants, attributeStructure, selectedAttrs]);

  const galleryMedia = useMemo(() => {
    const items = [];
    const seen = new Set();
    const push = (url, type = 'image') => {
      const normalized = String(url || '').trim();
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      items.push({ url: normalized, type });
    };

    if (Array.isArray(selectedVariant?.video_urls)) {
      selectedVariant.video_urls.forEach((video) => push(video, 'video'));
    }
    if (Array.isArray(selectedVariant?.media_urls)) {
      selectedVariant.media_urls.forEach((img) => push(img, 'image'));
    }
    push(selectedVariant?.video_url, 'video');
    push(selectedVariant?.image, 'image');

    // fallback if variant has no media
    if (items.length === 0) {
      push(product?.video_url, 'video');
      if (Array.isArray(product?.images)) {
        product.images.forEach((img) => push(img, 'image'));
      }
      push(product?.thumbnail, 'image');
    }

    return items.length ? items : [{ url: IMAGE_DEFAULT_URL, type: 'image' }];
  }, [selectedVariant, product]);

  useEffect(() => {
    setSelectedImage(0);
  }, [selectedVariant?.id, productId]);
  // Hàm 1: Value có tồn tại trong bất kỳ variant nào không (bất kể selection)
  const isValueAvailable = (attrName, attrValue) => {
    return variants.some((v) => {
      if (!v?.attribute_values) return false;
      const val = v.attribute_values[attrName];
      return val && String(val) === String(attrValue);
    });
  };

  // Hàm 2: Value có compatible với TẤT CẢ attrs đang chọn không
  const isValueCompatible = (attrName, attrValue) => {
    // Chỉ check constraint từ các attr đứng TRƯỚC attrName trong attributeStructure
    const attrIndex = attributeStructure.findIndex((a) => a.name === attrName);
    const priorAttrs = attributeStructure.slice(0, attrIndex);

    return variants.some((v) => {
      if (!v?.attribute_values) return false;
      const val = v.attribute_values[attrName];
      if (!val || String(val) !== String(attrValue)) return false;
      return priorAttrs.every(({ name }) => {
        const sel = selectedAttrs[name];
        if (!sel) return true;
        const variantVal = v.attribute_values[name];
        if (!variantVal) return true;
        return String(variantVal) === String(sel);
      });
    });
  };

  // Kiểm tra attribute này có xuất hiện trong bất kỳ variant nào
  // phù hợp với các attr đã chọn không
  const isAttrApplicable = (attrName) => {
    return variants.some((v) => {
      if (!v?.attribute_values) return false;
      // Variant phải có attribute này
      const val = v.attribute_values[attrName];
      if (val === undefined || val === null || val === '') return false;
      // Và phải match tất cả các attr khác đã chọn
      return attributeStructure
        .filter((a) => a.name !== attrName)
        .every(({ name }) => {
          const sel = selectedAttrs[name];
          if (!sel) return true;
          const variantVal = v.attribute_values[name];
          if (variantVal === undefined || variantVal === null || variantVal === '') return true;
          return String(variantVal) === String(sel);
        });
    });
  };

  const activeMedia = galleryMedia[Math.min(selectedImage, galleryMedia.length - 1)] || { url: IMAGE_DEFAULT_URL, type: 'image' };
  const cartImage = useMemo(() => {
    const firstImage = galleryMedia.find((m) => m.type === 'image');
    return firstImage?.url || selectedVariant?.image || product?.images?.[0] || IMAGE_DEFAULT_URL;
  }, [galleryMedia, selectedVariant, product]);

  const currentBasePrice = useMemo(() => Number(
    selectedVariant?.sale_price
    ?? selectedVariant?.price
    ?? product?.sale_price
    ?? product?.price
    ?? 0,
  ), [selectedVariant, product]);

  const currentProductKeys = useMemo(() => ({
    localProductId: String(product?.id ?? ''),
    pancakeProductId: String(product?.raw_data?.pancake_product_id ?? product?.pancake_product_id ?? ''),
  }), [product]);

  const effectivePricePromotionMap = useMemo(() => {
    const map = new Map();
    for (const offer of promotionOffers) {
      // Only direct product promotions should affect displayed variant price.
      if (!isDirectPricePromotion(offer)) continue;
      const candidate = estimateOfferPriceForCurrentProduct({
        offer,
        localProductId: currentProductKeys.localProductId,
        pancakeProductId: currentProductKeys.pancakeProductId,
        basePrice: currentBasePrice,
      });
      if (!Number.isFinite(candidate) || candidate == null) continue;
      const key = String(offer?.id || offer?.title || JSON.stringify(offer || {}));
      map.set(key, Number(candidate));
    }
    return map;
  }, [promotionOffers, currentProductKeys, currentBasePrice]);

  const promotionDiscountPrice = useMemo(() => {
    const candidates = Array.from(effectivePricePromotionMap.values())
      .filter((price) => Number.isFinite(price) && price > 0);

    if (!candidates.length) return null;
    return Math.min(...candidates);
  }, [effectivePricePromotionMap]);

  const displayPrice = useMemo(() => {
    const fallbackPrice = currentBasePrice;
    if (!Number.isFinite(promotionDiscountPrice) || promotionDiscountPrice == null) return fallbackPrice;
    return Math.min(fallbackPrice, Number(promotionDiscountPrice));
  }, [currentBasePrice, promotionDiscountPrice]);

  const basePrice = useMemo(() => {
    return Number(selectedVariant?.price ?? product?.price ?? 0);
  }, [selectedVariant, product]);

  const cheapestMainVariantPrice = useMemo(() => {
    const candidates = variants
      .map((variant) => Number(
        variant?.sale_price
        ?? variant?.price
        ?? product?.sale_price
        ?? product?.price
        ?? 0,
      ))
      .filter((price) => Number.isFinite(price) && price > 0);

    if (candidates.length > 0) return Math.min(...candidates);
    const fallback = Number(displayPrice || 0);
    return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
  }, [variants, product, displayPrice]);

  const comboBundleTargetPrice = useMemo(() => {
    if (selectedComboItems.length === 0) return null;
    if (!Number.isFinite(cheapestMainVariantPrice) || cheapestMainVariantPrice <= 0) return null;
    return cheapestMainVariantPrice + Number(selectedComboBaseExtrasPrice || 0);
  }, [selectedComboItems, cheapestMainVariantPrice, selectedComboBaseExtrasPrice]);

  const comboAppliedExtrasPrice = useMemo(() => {
    if (!Number.isFinite(comboBundleTargetPrice) || comboBundleTargetPrice == null) {
      return Number(selectedComboBaseExtrasPrice || 0);
    }
    const adjusted = Number(comboBundleTargetPrice) - Number(displayPrice || 0);
    return Math.max(0, adjusted);
  }, [comboBundleTargetPrice, selectedComboBaseExtrasPrice, displayPrice]);

  const comboBundleEstimatedTotal = useMemo(() => {
    return Number(displayPrice || 0) * Math.max(1, quantity) + Number(comboAppliedExtrasPrice || 0);
  }, [displayPrice, quantity, comboAppliedExtrasPrice]);

  const comboAdjustedLineTotalByKey = useMemo(() => {
    const selectedKeys = new Set(selectedComboItems.map((item) => item.__comboKey));
    const map = {};
    let remainingDiscount = Math.max(0, Number(selectedComboBaseExtrasPrice || 0) - Number(comboAppliedExtrasPrice || 0));

    for (let index = 0; index < comboItems.length; index += 1) {
      const item = comboItems[index];
      const key = getComboItemKey(item, index);
      const qty = Math.max(1, Number(item?.quantity ?? 1));
      const rawLineTotal = Math.max(0, Number(getComboUnitPrice(item, index) || 0)) * qty;

      if (!selectedKeys.has(key)) {
        map[key] = rawLineTotal;
        continue;
      }

      const appliedDiscount = Math.min(remainingDiscount, rawLineTotal);
      map[key] = Math.max(0, rawLineTotal - appliedDiscount);
      remainingDiscount -= appliedDiscount;
    }

    return map;
  }, [comboItems, selectedComboItems, selectedComboBaseExtrasPrice, comboAppliedExtrasPrice, comboVariantSelectionByItemKey]);

  const priceAffectingOfferKeys = useMemo(() => new Set(Array.from(effectivePricePromotionMap.keys())), [effectivePricePromotionMap]);

  const displayPromotionOffers = useMemo(() => {
    return promotionOffers.filter((offer) => {
      const key = String(offer?.id || offer?.title || JSON.stringify(offer || {}));
      return !priceAffectingOfferKeys.has(key);
    });
  }, [promotionOffers, priceAffectingOfferKeys]);

  const voucherPromotionOffers = useMemo(() => {
    return displayPromotionOffers.filter((offer) => isVoucherPromotion(offer));
  }, [displayPromotionOffers]);

  const productStock = useMemo(() => {
    return Number(selectedVariant?.stock ?? product?.stock ?? 0);
  }, [selectedVariant, product]);

  const allowBackorder = useMemo(() => {
    return Boolean(selectedVariant?.allow_backorder ?? product?.allow_backorder ?? false);
  }, [selectedVariant, product]);

  const canBuy = productStock > 0 || allowBackorder;

  const seoDescription = useMemo(() => {
    const raw = String(product?.short_description || product?.description || '');
    const normalized = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (normalized) return normalized.slice(0, 155);
    return 'Chi tiet san pham Lộc Sang voi thong tin ro rang, gia tot va giao nhanh.';
  }, [product]);

  const canonicalPath = useMemo(() => {
    if (product) return toProductDetailPath(product);
    if (Number.isFinite(productId) && productId > 0) return `/products/${productId}`;
    return '/products';
  }, [product, productId]);

  const seoImage = useMemo(() => {
    return product?.images?.[0] || product?.thumbnail || IMAGE_DEFAULT_URL;
  }, [product]);

  useSEO({
    title: product?.name || 'Chi Tiet San Pham',
    description: seoDescription,
    canonicalPath,
    image: seoImage,
    type: 'product',
    jsonLd: product
      ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: [seoImage],
        description: seoDescription,
        sku: selectedVariant?.sku || product.sku || undefined,
        brand: {
          '@type': 'Brand',
          name: String(product.brand || 'Lộc Sang'),
        },
        offers: {
          '@type': 'Offer',
          url: `https://locsang.shop${canonicalPath}`,
          priceCurrency: 'VND',
          price: Number(displayPrice || 0),
          availability: canBuy ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
        aggregateRating: Number(ratingSummary?.count || 0) > 0
          ? {
            '@type': 'AggregateRating',
            ratingValue: Number(ratingSummary.average || 0),
            reviewCount: Number(ratingSummary.count || 0),
          }
          : undefined,
      }
      : null,
  });

  const scrollToGallery = () => {
    if (!galleryTopRef.current) return;
    galleryTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const reveal = {
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.42, ease: 'easeOut' },
  };

  const detailRows = useMemo(() => {
    const rows = [
      { label: 'Danh mục', value: product?.category_name || (product?.category_id ? `Danh mục ${product.category_id}` : null) },
      { label: 'Thương hiệu', value: product?.brand || 'Lộc Sang' },
      { label: 'Chất liệu', value: selectedVariant?.material || product?.material || null },
      {
        label: 'Khối lượng',
        value:
          selectedVariant?.weight_gram != null
            ? `${selectedVariant.weight_gram} g`
            : product?.weight
              ? `${product.weight} kg`
              : null,
      },
    ];

    return rows.filter((row) => {
      const value = String(row?.value ?? '').trim();
      return value !== '' && value !== '-';
    });
  }, [product, selectedVariant]);

  useEffect(() => {
    let cancelled = false;
    const loadProduct = async () => {
      if (!Number.isFinite(productId) || productId <= 0) {
        setProduct(null);
        setRelatedProducts([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [detailResult, listResult] = await Promise.allSettled([
          productService.getStorefrontProductById(productId),
          productService.getStorefrontProducts({ status: 'active', limit: 100 }),
        ]);
        if (cancelled) return;
        const detail = detailResult.status === 'fulfilled' ? detailResult.value : null;
        const list = listResult.status === 'fulfilled' ? listResult.value : [];
        setProduct(detail || null);
        if (detail) {
          const related = (Array.isArray(list) ? list : [])
            .filter((p) => p.category_id === detail.category_id && p.id !== detail.id)
            .slice(0, 8);
          setRelatedProducts(related);
          // Khởi tạo selectedAttrs từ variant đầu tiên
          const activeVariants = Array.isArray(detail.variants)
            ? detail.variants.filter((v) => v?.is_active !== false)
            : [];
          const first = activeVariants[0];
          if (first?.attribute_values && typeof first.attribute_values === 'object') {
            const initial = {};
            Object.entries(first.attribute_values).forEach(([k, v]) => {
              if (k && v) initial[k] = String(v);
            });
            setSelectedAttrs(initial);
          }
        } else {
          setRelatedProducts([]);
          setSelectedAttrs({});
        }
      } catch (error) {
        if (!cancelled) {
          setProduct(null);
          setRelatedProducts([]);
          if (showToast) showToast('Không tải được thông tin sản phẩm', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadProduct();
    return () => {
      cancelled = true;
    };
  }, [productId, showToast]);

  useEffect(() => {
    const next = {};
    comboItems.forEach((item, index) => {
      const key = `${item?.local_product_id || item?.pancake_product_id || item?.label || index}`;
      next[key] = Boolean(item?.required || index === 0);
    });
    setComboSelectionMap(next);
  }, [comboItems]);

  const handleAddToCart = (e) => {
    if (e) e.preventDefault();
    if (!product) return;
    addToCart({
      product_id: Number(product.id),
      product_variant_id: Number.isFinite(Number(selectedVariant?.id)) ? Number(selectedVariant?.id) : null,
      title: product.name,
      price: Number(displayPrice || 0),
      image: cartImage,
      quantity,
      sku: selectedVariant?.sku || product.sku,
      variant_label: selectedVariant?.variant_name
        || Object.values(selectedVariant?.attribute_values || {}).filter(Boolean).join(' / ')
        || '',
    });
    if (showToast) showToast('Đã thêm vào giỏ hàng!', 'success');
  };

  const handleBuyNow = (e) => {
    if (e) e.preventDefault();
    if (!product || !canBuy) return;
    addToCart({
      product_id: Number(product.id),
      product_variant_id: Number.isFinite(Number(selectedVariant?.id)) ? Number(selectedVariant?.id) : null,
      title: product.name,
      price: Number(displayPrice || 0),
      image: cartImage,
      quantity,
      sku: selectedVariant?.sku || product.sku,
      variant_label: selectedVariant?.variant_name
        || Object.values(selectedVariant?.attribute_values || {}).filter(Boolean).join(' / ')
        || '',
    });
    navigate('/checkout');
  };

  const handleToggleComboItem = (item, index) => {
    if (item?.required) return;
    const key = `${item?.local_product_id || item?.pancake_product_id || item?.label || index}`;
    setComboSelectionMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resolveComboProductForVariantCheck = async (item, index, options = {}) => {
    const silent = Boolean(options?.silent);
    const localProductId = Number(item?.local_product_id ?? 0);
    if (!Number.isFinite(localProductId) || localProductId <= 0) return null;

    const cached = comboVariantResolveCacheRef.current.get(localProductId);
    if (cached) return cached;

    try {
      const detail = await productService.getStorefrontProductById(localProductId);
      if (detail && typeof detail === 'object') {
        comboVariantResolveCacheRef.current.set(localProductId, detail);
        return detail;
      }
      return null;
    } catch {
      if (!silent && showToast) showToast(`Không tải được biến thể cho ${item?.label || `món combo ${index + 1}`}`, 'warning');
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const tasks = selectedComboItems
        .map((item) => {
          const localProductId = Number(item?.local_product_id ?? 0);
          if (!Number.isFinite(localProductId) || localProductId <= 0) return null;
          if (comboVariantResolveCacheRef.current.get(localProductId)) return null;
          return resolveComboProductForVariantCheck(item, item?.__comboIndex ?? 0, { silent: true });
        })
        .filter(Boolean);

      if (!tasks.length) return;
      await Promise.all(tasks);
      if (!cancelled) {
        setComboSelectionMap((prev) => ({ ...prev }));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedComboItems]);

  const openComboVariantModal = async (item, index) => {
    const resolvedProduct = await resolveComboProductForVariantCheck(item, index);
    const variants = getActiveVariants(resolvedProduct);
    if (!variants.length) {
      if (showToast) showToast('Món combo này không có biến thể để chọn', 'info');
      return;
    }

    const itemKey = getComboItemKey(item, index);
    const existingSelection = comboVariantSelectionByItemKey[itemKey];
    const existingVariantId = Number(existingSelection?.product_variant_id ?? 0);

    const firstPurchasable = variants.find((variant) => isVariantPurchasable(resolvedProduct, variant)) || variants[0] || null;
    const selectedByExisting = Number.isFinite(existingVariantId)
      ? (variants.find((variant) => Number(variant?.id) === existingVariantId) || firstPurchasable)
      : firstPurchasable;

    setComboVariantModalContext({ item, index, itemKey, product: resolvedProduct });
    setComboSelectedVariantId(Number.isFinite(Number(selectedByExisting?.id)) ? Number(selectedByExisting.id) : null);
    setComboVariantSelections(normalizeVariantAttributes(selectedByExisting));
  };

  const closeComboVariantModal = (preserveAutoAddPending = false) => {
    setComboVariantModalContext(null);
    setComboVariantSelections({});
    setComboSelectedVariantId(null);
    if (!preserveAutoAddPending) {
      setComboBundleAutoAddPending(false);
    }
  };

  const ensureComboVariantSelections = async (selectionMapOverride = comboVariantSelectionByItemKey) => {
    for (const item of selectedComboItems) {
      const localProductId = Number(item?.local_product_id ?? 0);
      if (!Number.isFinite(localProductId) || localProductId <= 0) continue;

      const itemKey = item?.__comboKey || getComboItemKey(item, item?.__comboIndex ?? 0);
      const manualSelection = selectionMapOverride[itemKey];
      const resolvedProduct = await resolveComboProductForVariantCheck(item, item?.__comboIndex ?? 0);
      const comboVariants = Array.isArray(resolvedProduct?.variants)
        ? resolvedProduct.variants.filter((variant) => variant?.is_active !== false)
        : [];

      if (comboVariants.length <= 1) continue;

      const hasValidManualVariant = Number.isFinite(Number(manualSelection?.product_variant_id))
        && comboVariants.some((variant) => Number(variant?.id) === Number(manualSelection?.product_variant_id));

      if (!hasValidManualVariant) {
        if (showToast) showToast(`Vui lòng chọn phân loại cho ${item?.label || 'món combo'}`, 'warning');
        await openComboVariantModal(item, item?.__comboIndex ?? 0);
        return false;
      }
    }
    return true;
  };

  const handleAddComboBundle = async (isResume = false, selectionMapOverride = null) => {
    if (!product || !canBuy || !selectedVariant) {
      setComboBundleAutoAddPending(false);
      return;
    }

    let activeSelectionMap = selectionMapOverride || comboVariantSelectionByItemKey;
    if (!isResume) {
      // Mỗi lần bấm nút "thêm sản phẩm chính + combo" sẽ chọn phân loại lại từ đầu.
      activeSelectionMap = {};
      setComboVariantSelectionByItemKey({});
    }

    setComboBundleAutoAddPending(true);

    const comboSelectionReady = await ensureComboVariantSelections(activeSelectionMap);
    if (!comboSelectionReady) return;

    addToCart({
      product_id: Number(product.id),
      product_variant_id: Number.isFinite(Number(selectedVariant?.id)) ? Number(selectedVariant?.id) : null,
      title: product.name,
      price: Number(displayPrice || 0),
      image: cartImage,
      quantity,
      sku: selectedVariant?.sku || product.sku,
      variant_label: selectedVariant?.variant_name
        || Object.values(selectedVariant?.attribute_values || {}).filter(Boolean).join(' / ')
        || '',
    });

    const comboLinePayloads = [];
    for (let index = 0; index < selectedComboItems.length; index += 1) {
      const item = selectedComboItems[index];
      const localProductId = Number(item?.local_product_id ?? 0);
      if (!Number.isFinite(localProductId) || localProductId <= 0) {
        continue;
      }

      const key = item?.__comboKey || getComboItemKey(item, item?.__comboIndex ?? index);
      const manualSelection = activeSelectionMap[key];
      const resolvedProduct = await resolveComboProductForVariantCheck(item, item?.__comboIndex ?? index);

      const comboVariants = Array.isArray(resolvedProduct?.variants)
        ? resolvedProduct.variants.filter((variant) => variant?.is_active !== false)
        : [];
      const selectedComboVariantByManual = Number.isFinite(Number(manualSelection?.product_variant_id))
        ? comboVariants.find((variant) => Number(variant?.id) === Number(manualSelection.product_variant_id))
        : null;
      const selectedComboVariantByStock = comboVariants.find((variant) => {
        const manageStock = Boolean(variant?.manage_stock ?? true);
        const stock = Number(variant?.stock ?? 0);
        const allowBackorderFlag = Boolean(variant?.allow_backorder ?? false);
        if (!manageStock) return true;
        return stock > 0 || allowBackorderFlag;
      }) || comboVariants[0] || null;
      const selectedComboVariant = selectedComboVariantByManual || selectedComboVariantByStock;

      const selectedComboVariantPrice = Number(
        manualSelection?.price
        ?? selectedComboVariant?.sale_price
        ?? selectedComboVariant?.price
        ?? getComboUnitPrice(item, item?.__comboIndex ?? index)
        ?? 0,
      );

      const selectedComboVariantLabel = manualSelection?.variant_label
        || selectedComboVariant?.variant_name
        || Object.values(selectedComboVariant?.attribute_values || {}).filter(Boolean).join(' / ')
        || '';

      const itemQty = Math.max(1, Number(item?.quantity ?? 1));
      comboLinePayloads.push({
        item,
        localProductId,
        selectedComboVariant,
        resolvedProduct,
        manualSelection,
        selectedComboVariantLabel,
        itemQty,
        rawUnitPrice: Number.isFinite(selectedComboVariantPrice) ? selectedComboVariantPrice : 0,
        index,
      });
    }

    const rawComboTotal = comboLinePayloads.reduce((sum, line) => {
      return sum + Math.max(0, Number(line.rawUnitPrice || 0)) * Math.max(1, Number(line.itemQty || 1));
    }, 0);
    const desiredComboTotal = Number.isFinite(Number(comboAppliedExtrasPrice))
      ? Math.max(0, Number(comboAppliedExtrasPrice))
      : rawComboTotal;
    const cappedComboTotal = Math.min(rawComboTotal, desiredComboTotal);

    let remainingDiscount = Math.max(0, rawComboTotal - cappedComboTotal);
    let addedComboCount = 0;
    for (const line of comboLinePayloads) {
      const itemQty = Math.max(1, Number(line.itemQty || 1));
      const lineRawTotal = Math.max(0, Number(line.rawUnitPrice || 0)) * itemQty;
      const appliedLineDiscount = Math.min(remainingDiscount, lineRawTotal);
      const lineFinalTotal = Math.max(0, lineRawTotal - appliedLineDiscount);
      remainingDiscount -= appliedLineDiscount;
      const effectiveUnitPrice = Math.max(0, Math.round(lineFinalTotal / itemQty));

      addToCart({
        product_id: line.localProductId,
        product_variant_id: Number.isFinite(Number(line.selectedComboVariant?.id)) ? Number(line.selectedComboVariant?.id) : null,
        title: String(line.resolvedProduct?.name || line.item?.label || 'San pham combo'),
        price: effectiveUnitPrice,
        image: String(line.manualSelection?.image || line.selectedComboVariant?.image || line.item?.image || line.resolvedProduct?.images?.[0] || IMAGE_DEFAULT_URL),
        quantity: itemQty,
        sku: line.manualSelection?.sku || line.selectedComboVariant?.sku || line.resolvedProduct?.sku || `combo-${line.localProductId}-${line.index}`,
        variant_label: line.selectedComboVariantLabel,
      });
      addedComboCount += 1;
    }

    if (addedComboCount < selectedComboItems.length && showToast) {
      showToast('Một vài sản phẩm combo chưa map với catalog nên chưa thể thêm tự động.', 'info', 4500);
    }

    if (showToast) {
      showToast(`Đã thêm sản phẩm chính và ${addedComboCount} món combo vào giỏ!`, 'success');
    }

    setComboBundleAutoAddPending(false);
  };

  const normalizeVariantAttributes = (variant) => {
    if (!variant) return {};
    if (variant.attribute_values && typeof variant.attribute_values === 'object' && !Array.isArray(variant.attribute_values)) {
      return Object.fromEntries(
        Object.entries(variant.attribute_values)
          .filter(([k, v]) => k && v)
          .map(([k, v]) => [String(k), String(v)]),
      );
    }
    if (Array.isArray(variant.attributes)) {
      return Object.fromEntries(
        variant.attributes
          .filter((attr) => attr?.name && attr?.value)
          .map((attr) => [String(attr.name), String(attr.value)]),
      );
    }
    return {};
  };

  const getVariantPrice = (baseProduct, variant) => Number(
    variant?.sale_price
    ?? variant?.price
    ?? baseProduct?.sale_price
    ?? baseProduct?.price
    ?? 0,
  );

  const isVariantPurchasable = (baseProduct, variant) => {
    if (!variant || variant?.is_active === false) return false;
    const manageStock = Boolean(variant?.manage_stock ?? baseProduct?.manage_stock ?? true);
    const stock = Number(variant?.stock ?? 0);
    const allowBackorderFlag = Boolean(variant?.allow_backorder ?? baseProduct?.allow_backorder ?? false);
    if (!manageStock) return true;
    return stock > 0 || allowBackorderFlag;
  };

  const getActiveVariants = (baseProduct) => {
    if (!Array.isArray(baseProduct?.variants) || baseProduct.variants.length === 0) return [];
    return baseProduct.variants.filter((variant) => variant?.is_active !== false);
  };

  const buildVariantLabel = (variant) => {
    if (!variant) return '';
    const attrs = normalizeVariantAttributes(variant);
    return variant?.variant_name || Object.values(attrs).filter(Boolean).join(' / ') || getVariantLabel(variant);
  };

  const comboModalVariants = useMemo(() => getActiveVariants(comboVariantModalContext?.product), [comboVariantModalContext]);

  const comboModalAttributes = useMemo(() => {
    if (!comboModalVariants.length) return [];
    const attrMap = {};
    const attrOrder = [];
    comboModalVariants.forEach((variant) => {
      const attrs = normalizeVariantAttributes(variant);
      Object.entries(attrs).forEach(([key, value]) => {
        if (!attrMap[key]) {
          attrMap[key] = [];
          attrOrder.push(key);
        }
        if (!attrMap[key].includes(value)) attrMap[key].push(value);
      });
    });
    return attrOrder.map((name) => ({ name, values: attrMap[name] }));
  }, [comboModalVariants]);

  const selectedComboModalVariant = useMemo(() => {
    if (!comboModalVariants.length) return null;
    if (comboModalAttributes.length === 0) {
      if (Number.isFinite(Number(comboSelectedVariantId))) {
        return comboModalVariants.find((variant) => Number(variant?.id) === Number(comboSelectedVariantId)) || comboModalVariants[0];
      }
      return comboModalVariants[0];
    }

    return comboModalVariants.find((variant) => {
      const attrs = normalizeVariantAttributes(variant);
      return comboModalAttributes.every((attr) => String(attrs[attr.name] || '') === String(comboVariantSelections[attr.name] || ''));
    }) || null;
  }, [comboModalVariants, comboModalAttributes, comboVariantSelections, comboSelectedVariantId]);

  const selectedComboModalVariantPurchasable = useMemo(
    () => isVariantPurchasable(comboVariantModalContext?.product, selectedComboModalVariant),
    [comboVariantModalContext, selectedComboModalVariant],
  );

  const isComboAttrValueAvailable = (attrName, attrValue) => {
    return comboModalVariants.some((variant) => {
      const attrs = normalizeVariantAttributes(variant);
      const val = attrs[attrName];
      return val && String(val) === String(attrValue);
    });
  };

  const isComboAttrValueCompatible = (attrName, attrValue) => {
    const attrIndex = comboModalAttributes.findIndex((attr) => attr.name === attrName);
    const priorAttrs = comboModalAttributes.slice(0, attrIndex);

    return comboModalVariants.some((variant) => {
      const attrs = normalizeVariantAttributes(variant);
      const val = attrs[attrName];
      if (!val || String(val) !== String(attrValue)) return false;
      return priorAttrs.every((attr) => {
        const selected = comboVariantSelections[attr.name];
        if (!selected) return true;
        const variantVal = attrs[attr.name];
        if (!variantVal) return true;
        return String(variantVal) === String(selected);
      });
    });
  };

  const isComboAttrApplicable = (attrName) => {
    return comboModalVariants.some((variant) => {
      const attrs = normalizeVariantAttributes(variant);
      const val = attrs[attrName];
      if (val === undefined || val === null || val === '') return false;
      return comboModalAttributes
        .filter((attr) => attr.name !== attrName)
        .every((attr) => {
          const selected = comboVariantSelections[attr.name];
          if (!selected) return true;
          const variantVal = attrs[attr.name];
          if (variantVal === undefined || variantVal === null || variantVal === '') return true;
          return String(variantVal) === String(selected);
        });
    });
  };

  const handleChooseComboVariantAttr = (attrName, value) => {
    setComboVariantSelections((prev) => {
      const next = { ...prev, [attrName]: value };
      comboModalAttributes.forEach((attr) => {
        const otherName = attr.name;
        if (otherName === attrName) return;
        const stillValid = comboModalVariants.some((variant) => {
          const attrs = normalizeVariantAttributes(variant);
          const thisMatch = String(attrs[attrName] || '') === String(value);
          const otherVal = attrs[otherName];
          const otherMatch = !!otherVal && String(otherVal) === String(next[otherName] || '');
          return thisMatch && otherMatch;
        });

        if (!stillValid) {
          delete next[otherName];
          const applicableValues = comboModalVariants
            .filter((variant) => String(normalizeVariantAttributes(variant)[attrName] || '') === String(value))
            .map((variant) => String(normalizeVariantAttributes(variant)[otherName] || ''))
            .filter(Boolean);

          const uniqueValues = [...new Set(applicableValues)];
          if (uniqueValues.length === 1) next[otherName] = uniqueValues[0];
        }
      });
      return next;
    });
  };

  const handleConfirmComboVariant = () => {
    if (!comboVariantModalContext) return;
    if (!selectedComboModalVariant) {
      if (showToast) showToast('Vui lòng chọn đầy đủ phân loại cho món combo', 'warning');
      return;
    }
    if (!selectedComboModalVariantPurchasable) {
      if (showToast) showToast('Biến thể combo đã chọn đang hết hàng', 'warning');
      return;
    }

    const variantLabel = selectedComboModalVariant?.variant_name
      || Object.values(selectedComboModalVariant?.attribute_values || {}).filter(Boolean).join(' / ')
      || '';

    const variantPrice = Number(
      selectedComboModalVariant?.sale_price
      ?? selectedComboModalVariant?.price
      ?? comboVariantModalContext?.item?.price
      ?? 0,
    );

    const mergedSelectionMap = {
      ...comboVariantSelectionByItemKey,
      [comboVariantModalContext.itemKey]: {
        product_variant_id: Number.isFinite(Number(selectedComboModalVariant?.id)) ? Number(selectedComboModalVariant.id) : null,
        variant_label: variantLabel,
        price: variantPrice,
        sku: selectedComboModalVariant?.sku || null,
        image: selectedComboModalVariant?.image || null,
      },
    };
    setComboVariantSelectionByItemKey(mergedSelectionMap);

    const shouldContinueAutoAdd = comboBundleAutoAddPending;
    closeComboVariantModal(true);

    if (shouldContinueAutoAdd) {
      setTimeout(() => {
        void handleAddComboBundle(true, mergedSelectionMap);
      }, 0);
    }
  };

  const commitRelatedAddToCart = (baseProduct, variant, quantityToAdd = 1) => {
    addToCart({
      product_id: Number(baseProduct.id),
      product_variant_id: Number.isFinite(Number(variant?.id)) ? Number(variant?.id) : null,
      title: baseProduct.name,
      price: getVariantPrice(baseProduct, variant),
      image: variant?.image || baseProduct.images?.[0] || IMAGE_DEFAULT_URL,
      quantity: quantityToAdd,
      sku: variant?.sku || baseProduct?.sku,
      variant_label: buildVariantLabel(variant),
    });
    if (showToast) showToast('Đã thêm vào giỏ hàng!', 'success');
  };

  const openRelatedVariantModal = (baseProduct, variants) => {
    const firstPurchasable = variants.find((variant) => isVariantPurchasable(baseProduct, variant)) || null;
    const firstVariant = firstPurchasable || variants[0] || null;
    setRelatedVariantModalProduct(baseProduct);
    setRelatedSelectedVariantId(Number.isFinite(Number(firstVariant?.id)) ? Number(firstVariant.id) : null);
    setRelatedVariantSelections(normalizeVariantAttributes(firstVariant));
  };

  const closeRelatedVariantModal = () => {
    setRelatedVariantModalProduct(null);
    setRelatedVariantSelections({});
    setRelatedSelectedVariantId(null);
  };

  const resolveRelatedProductForVariantCheck = async (baseProduct) => {
    const productIdNum = Number(baseProduct?.id);
    if (!Number.isFinite(productIdNum) || productIdNum <= 0) return baseProduct;

    const cached = relatedVariantResolveCacheRef.current.get(productIdNum);
    if (cached) return cached;

    const hasInlineVariants = Array.isArray(baseProduct?.variants) && baseProduct.variants.length > 0;
    const shouldFetchDetail = Boolean(baseProduct?.has_variants) || !hasInlineVariants;
    if (!shouldFetchDetail) {
      relatedVariantResolveCacheRef.current.set(productIdNum, baseProduct);
      return baseProduct;
    }

    try {
      const detail = await productService.getStorefrontProductById(productIdNum);
      const resolved = detail && typeof detail === 'object' ? { ...baseProduct, ...detail } : baseProduct;
      relatedVariantResolveCacheRef.current.set(productIdNum, resolved);
      return resolved;
    } catch {
      return baseProduct;
    }
  };

  const handleRelatedAddToCart = async (e, relatedItem) => {
    e.preventDefault();
    e.stopPropagation();

    const resolvedProduct = await resolveRelatedProductForVariantCheck(relatedItem);
    const activeVariants = getActiveVariants(resolvedProduct);
    const availableVariants = activeVariants.filter((variant) => isVariantPurchasable(resolvedProduct, variant));

    if (activeVariants.length > 1) {
      openRelatedVariantModal(resolvedProduct, activeVariants);
      return;
    }

    if (Boolean(resolvedProduct?.has_variants) && activeVariants.length === 0) {
      if (showToast) showToast('Sản phẩm có nhiều phân loại, vui lòng chọn trước khi thêm giỏ', 'info');
      navigate(toProductDetailPath(resolvedProduct));
      return;
    }

    const onlyVariant = activeVariants[0] || availableVariants[0] || null;
    commitRelatedAddToCart(resolvedProduct, onlyVariant, 1);
  };

  useEffect(() => {
    if (!relatedVariantModalProduct && !comboVariantModalContext) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [relatedVariantModalProduct, comboVariantModalContext]);

  const relatedModalVariants = useMemo(() => getActiveVariants(relatedVariantModalProduct), [relatedVariantModalProduct]);

  const relatedModalAttributes = useMemo(() => {
    if (!relatedModalVariants.length) return [];
    const attrMap = {};
    const attrOrder = [];
    relatedModalVariants.forEach((variant) => {
      const attrs = normalizeVariantAttributes(variant);
      Object.entries(attrs).forEach(([key, value]) => {
        if (!attrMap[key]) {
          attrMap[key] = [];
          attrOrder.push(key);
        }
        if (!attrMap[key].includes(value)) attrMap[key].push(value);
      });
    });
    return attrOrder.map((name) => ({ name, values: attrMap[name] }));
  }, [relatedModalVariants]);

  const selectedRelatedModalVariant = useMemo(() => {
    if (!relatedModalVariants.length) return null;
    if (relatedModalAttributes.length === 0) {
      if (Number.isFinite(Number(relatedSelectedVariantId))) {
        return relatedModalVariants.find((variant) => Number(variant?.id) === Number(relatedSelectedVariantId)) || relatedModalVariants[0];
      }
      return relatedModalVariants[0];
    }

    return relatedModalVariants.find((variant) => {
      const attrs = normalizeVariantAttributes(variant);
      return relatedModalAttributes.every(
        (attr) => String(attrs[attr.name] || '') === String(relatedVariantSelections[attr.name] || ''),
      );
    }) || null;
  }, [relatedModalVariants, relatedModalAttributes, relatedVariantSelections, relatedSelectedVariantId]);

  const selectedRelatedModalVariantPurchasable = useMemo(
    () => isVariantPurchasable(relatedVariantModalProduct, selectedRelatedModalVariant),
    [relatedVariantModalProduct, selectedRelatedModalVariant],
  );

  const isRelatedAttrValueAvailable = (attrName, attrValue) => {
    return relatedModalVariants.some((variant) => {
      const attrs = normalizeVariantAttributes(variant);
      const val = attrs[attrName];
      return val && String(val) === String(attrValue);
    });
  };

  const isRelatedAttrValueCompatible = (attrName, attrValue) => {
    const attrIndex = relatedModalAttributes.findIndex((attr) => attr.name === attrName);
    const priorAttrs = relatedModalAttributes.slice(0, attrIndex);

    return relatedModalVariants.some((variant) => {
      const attrs = normalizeVariantAttributes(variant);
      const val = attrs[attrName];
      if (!val || String(val) !== String(attrValue)) return false;
      return priorAttrs.every((attr) => {
        const selected = relatedVariantSelections[attr.name];
        if (!selected) return true;
        const variantVal = attrs[attr.name];
        if (!variantVal) return true;
        return String(variantVal) === String(selected);
      });
    });
  };

  const isRelatedAttrApplicable = (attrName) => {
    return relatedModalVariants.some((variant) => {
      const attrs = normalizeVariantAttributes(variant);
      const val = attrs[attrName];
      if (val === undefined || val === null || val === '') return false;
      return relatedModalAttributes
        .filter((attr) => attr.name !== attrName)
        .every((attr) => {
          const selected = relatedVariantSelections[attr.name];
          if (!selected) return true;
          const variantVal = attrs[attr.name];
          if (variantVal === undefined || variantVal === null || variantVal === '') return true;
          return String(variantVal) === String(selected);
        });
    });
  };

  const handleChooseRelatedVariantAttr = (attrName, value) => {
    setRelatedVariantSelections((prev) => {
      const next = { ...prev, [attrName]: value };
      relatedModalAttributes.forEach((attr) => {
        const otherName = attr.name;
        if (otherName === attrName) return;
        const stillValid = relatedModalVariants.some((variant) => {
          const attrs = normalizeVariantAttributes(variant);
          const thisMatch = String(attrs[attrName] || '') === String(value);
          const otherVal = attrs[otherName];
          const otherMatch = !!otherVal && String(otherVal) === String(next[otherName] || '');
          return thisMatch && otherMatch;
        });

        if (!stillValid) {
          delete next[otherName];
          const applicableValues = relatedModalVariants
            .filter((variant) => String(normalizeVariantAttributes(variant)[attrName] || '') === String(value))
            .map((variant) => String(normalizeVariantAttributes(variant)[otherName] || ''))
            .filter(Boolean);

          const uniqueValues = [...new Set(applicableValues)];
          if (uniqueValues.length === 1) next[otherName] = uniqueValues[0];
        }
      });
      return next;
    });
  };

  const handleConfirmRelatedVariantAdd = () => {
    if (!relatedVariantModalProduct) return;
    if (!selectedRelatedModalVariant) {
      if (showToast) showToast('Vui lòng chọn đầy đủ phân loại', 'warning');
      return;
    }
    if (!selectedRelatedModalVariantPurchasable) {
      if (showToast) showToast('Biến thể đã chọn đang hết hàng', 'warning');
      return;
    }
    commitRelatedAddToCart(relatedVariantModalProduct, selectedRelatedModalVariant, 1);
    closeRelatedVariantModal();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff9f0] pt-8 pb-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="rounded-[1.8rem] bg-[#f4ede2] p-8 text-center text-[#635f54]">Đang tải sản phẩm...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#fff9f0] pt-8 pb-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="rounded-[1.8rem] bg-[#f4ede2] p-8 text-center">
            <h1 className="text-2xl font-extrabold text-[#353229]">Không tìm thấy sản phẩm</h1>
            <p className="mt-2 text-[#635f54]">Sản phẩm bạn đang xem không tồn tại hoặc đã bị ẩn.</p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#8a4f41] px-6 py-3 font-semibold text-white transition hover:bg-[#7b473a]"
            >
              Quay lại cửa hàng
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fff9f0] pt-6 pb-28 md:pt-7 md:pb-12">
      <div className="pointer-events-none absolute left-[-120px] top-[-140px] h-[320px] w-[320px] rounded-full bg-[#f5d8c4]/50 blur-3xl" />
      <div className="pointer-events-none absolute right-[-140px] top-[260px] h-[340px] w-[340px] rounded-full bg-[#d4f3e8]/45 blur-3xl" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2 text-sm text-[#7f7a6f] md:mb-7">
          <Link to="/" className="hover:text-[#8a4f41]">Trang chủ</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-[#8a4f41]">Sản phẩm liên quan</Link>
          <span>/</span>
          <span className="line-clamp-1 font-semibold text-[#8a4f41]">{product.name}</span>
        </div>

        <motion.div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr,1.35fr]" {...reveal}>
          <div className="space-y-4" ref={galleryTopRef}>
            <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-[#f9f3e9] shadow-sm">
              {activeMedia?.type === 'video' ? (
                <video src={activeMedia.url} controls className="w-full h-full object-cover bg-black" />
              ) : (
                <img
                  src={activeMedia?.url || IMAGE_DEFAULT_URL}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              )}
              <button className="absolute right-4 top-4 rounded-full bg-white/90 p-2 shadow" onClick={handleAddToCart}>
                <FaShoppingCart className="text-[#8a4f41]" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {galleryMedia.map((media, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square overflow-hidden rounded-[1rem] border-2 ${selectedImage === index ? 'border-[#8a4f41]' : 'border-transparent'
                    }`}
                >
                  {media.type === 'video' ? (
                    <div className="w-full h-full bg-gray-900 text-white text-[10px] flex items-center justify-center">Video</div>
                  ) : (
                    <img src={media.url} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[1.8rem] bg-[#fffdf8] p-6 shadow-sm">
              <div className="mb-2 inline-flex items-center gap-2">
                <span className="rounded-full bg-[#c7fce9] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1d5042]">Sản phẩm mới</span>
                <div className="flex items-center gap-1 text-[#9e404a]">
                  {renderStars(ratingSummary.average, 11)}
                  <span className="ml-1 text-xs font-semibold text-[#635f54]">({ratingSummary.count || 0} đánh giá)</span>
                </div>
              </div>
              <h1 className="text-[1.82rem] font-extrabold leading-[1.1] tracking-[-0.01em] text-[#1f1d18] md:text-[3.15rem] md:leading-[1.04] md:tracking-[-0.018em]">{product.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#635f54]">
                {/* <span>Mã mẫu: <b>{selectedVariant?.sku || product.sku || '-'}</b></span>
                <span>|</span> */}
                <span>Tình trạng: <b className={canBuy ? 'text-[#2a5c4d]' : 'text-[#ac3149]'}>{productStock > 0 ? 'Còn hàng' : (allowBackorder ? 'Còn hàng' : 'Hết hàng')}</b></span>
                {product.featured && (
                  <span className="rounded-full bg-[#ff9ea4] px-3 py-1 font-semibold text-[#691724]">Nổi bật</span>
                )}
              </div>
              {tagList.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tagList.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#eee7db] px-3 py-1 text-xs font-medium text-[#635f54]">#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[1.8rem] bg-[#fffdf8] p-6 shadow-sm lg:sticky lg:top-24">
              <div className="flex items-end gap-3">
                <span className="text-3xl font-extrabold text-[#8a4f41] md:text-4xl">{formatVnd(displayPrice)}</span>
                {basePrice > displayPrice && (
                  <span className="text-lg text-[#9e9a91] line-through">{formatVnd(basePrice)}</span>
                )}
              </div>

              {false && basePrice <= displayPrice && voucherPromotionOffers.length > 0 && (
                <div className="mt-4 rounded-2xl border border-[#d8eadf] bg-[#f4fbf6] p-3.5">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.1em] text-[#2b6952]">Voucher & ưu đãi theo đơn</div>
                  <div className="flex flex-wrap gap-2">
                    {voucherPromotionOffers.slice(0, 4).map((offer, index) => {
                      const meta = asObject(offer?.meta);
                      const discountTag = formatDiscountTag(meta?.discount_value, Boolean(meta?.is_percent));
                      const minOrder = Number(meta?.minimum_order_total ?? NaN);
                      const voucherCode = String(meta?.voucher_code || '').trim();
                      return (
                        <div key={`${offer?.id || offer?.title || 'voucher'}-${index}`} className="rounded-xl border border-[#bcdcca] bg-white px-3 py-2 text-xs text-[#355947]">
                          <div className="font-black">{offer?.title || 'Voucher'}</div>
                          {discountTag && <div className="mt-1 font-bold text-[#287454]">{discountTag}</div>}
                          {Number.isFinite(minOrder) && minOrder > 0 && (
                            <div className="mt-1">Đơn tối thiểu {formatVnd(minOrder)}</div>
                          )}
                          {voucherCode && <div className="mt-1 font-semibold">Mã: {voucherCode}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {attributeStructure.length > 0 && (
                <div className="mt-5 space-y-4">
                  {/* {attributeStructure.map(({ name, values }) => (
                    <div key={name}> */}
                  {attributeStructure.map(({ name, values }) => {
                    if (!isAttrApplicable(name)) return null; // ← ẩn hẳn row này
                    return (
                      <div key={name}>
                        <div className="mb-2 text-sm font-semibold text-[#353229]">
                          {name}
                          {selectedAttrs[name] && (
                            <span className="ml-1 font-normal text-[#635f54]">: {selectedAttrs[name]}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {values.map((value) => {
                            const isSelected = selectedAttrs[name] === value;
                            const compatible = isValueCompatible(name, value);
                            const available = isValueAvailable(name, value);

                            // Ẩn hẳn nếu không compatible với selection hiện tại
                            if (!compatible) return null;

                            return (
                              <button
                                key={value}
                                type="button"
                                disabled={!available}
                                onClick={() => {
                                  setSelectedAttrs((prev) => {
                                    const next = { ...prev, [name]: value };
                                    attributeStructure.forEach(({ name: otherName }) => {
                                      if (otherName === name) return;
                                      const stillValid = variants.some((v) => {
                                        const thisMatch = String(v.attribute_values?.[name]) === String(value);
                                        const otherVal = v.attribute_values?.[otherName];
                                        const otherMatch = !!otherVal && String(otherVal) === String(next[otherName]);
                                        return thisMatch && otherMatch;
                                      });
                                      if (!stillValid) {
                                        delete next[otherName];
                                        // Auto-select nếu chỉ có 1 giá trị
                                        const applicableValues = variants
                                          .filter((v) => String(v.attribute_values?.[name]) === String(value) && v.attribute_values?.[otherName])
                                          .map((v) => String(v.attribute_values[otherName]));
                                        const uniqueValues = [...new Set(applicableValues)];
                                        if (uniqueValues.length === 1) next[otherName] = uniqueValues[0];
                                      }
                                    });
                                    return next;
                                  });
                                }}
                                className={`rounded-full border px-3 py-2 text-sm transition duration-150 active:scale-[0.98] ${
                                  isSelected
                                    ? 'border-[#8a4f41] bg-[#8a4f41] text-white font-semibold shadow-[0_4px_12px_rgba(138,79,65,0.28)]'
                                    : 'border-[#e6ded2] bg-[#f9f3e9] text-[#635f54] hover:-translate-y-[1px] hover:border-[#fdb19f] hover:shadow-[0_8px_18px_rgba(138,79,65,0.12)]'
                                }`}
                              >
                                {value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      // ))}
                    ); // ← thêm dấu này
                  })}
                  {!selectedVariant && (
                    <div className="text-sm text-[#9e404a]">Vui lòng chọn đầy đủ phân loại</div>
                  )}

                  {selectedVariant && (
                    <div className="md:hidden rounded-[1rem] border border-[#eadfce] bg-[#fff9f0] p-2.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={cartImage}
                          alt={getVariantLabel(selectedVariant)}
                          className="h-12 w-12 rounded-[0.7rem] object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold text-[#353229]">{getVariantLabel(selectedVariant)}</div>
                          <div className="text-sm font-bold text-[#8a4f41]">{formatVnd(displayPrice)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={scrollToGallery}
                          className="rounded-full bg-[#f4ede2] px-3 py-1.5 text-[11px] font-bold text-[#635f54]"
                        >
                          Xem ảnh lớn
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 flex items-center space-x-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4ede2] text-[#635f54]"
                >
                  -
                </button>
                <span className="w-12 text-center font-semibold text-[#353229]">{quantity}</span>
                <button
                  onClick={() => setQuantity(allowBackorder ? quantity + 1 : Math.min(productStock || 1, quantity + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4ede2] text-[#635f54]"
                >
                  +
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={handleAddToCart}
                  disabled={!canBuy || !selectedVariant}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-[#c7fce9] py-3.5 text-[15px] font-black text-[#1d5042] transition duration-150 hover:bg-[#b9eedb] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#88cdb8] disabled:cursor-not-allowed disabled:bg-[#e3ddd2] disabled:text-[#9a9489] md:py-4 md:text-base"
                >
                  <FaShoppingCart size={20} /> {canBuy ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
                </button>
                <button
                  type="button"
                  className="w-full rounded-full bg-[#8a4f41] py-3.5 text-[15px] font-black text-white transition duration-150 hover:bg-[#7b473a] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bf8f82] md:py-4 md:text-base"
                  onClick={handleBuyNow}
                  disabled={!canBuy || !selectedVariant}
                >
                  Mua ngay
                </button>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <button className="flex items-center gap-2 text-[#635f54] hover:text-[#8a4f41]">
                  <FaHeart />
                  <span>Yêu thích</span>
                </button>
                <button className="flex items-center gap-2 text-[#635f54] hover:text-[#8a4f41]">
                  <FaShare />
                  <span>Chia sẻ</span>
                </button>
              </div>
            </div>

            <div className="rounded-[1.8rem] bg-[#f4ede2] p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-[1.2rem] bg-[#fff9f0] p-3">
                  <div className="flex items-center gap-2 font-semibold text-[#353229]"><FaTruck /> Vận chuyển</div>
                  <div className="mt-1 text-sm text-[#635f54]">Giao nhanh toàn quốc, đóng gói chống sốc.</div>
                </div>
                <div className="rounded-[1.2rem] bg-[#fff9f0] p-3">
                  <div className="flex items-center gap-2 font-semibold text-[#353229]"><FaShieldAlt /> Bảo đảm</div>
                  <div className="mt-1 text-sm text-[#635f54]">Sản phẩm như mô tả, hỗ trợ đổi size nếu cần.</div>
                </div>
                <div className="rounded-[1.2rem] bg-[#fff9f0] p-3">
                  <div className="flex items-center gap-2 font-semibold text-[#353229]"><FaPhoneAlt /> Tư vấn</div>
                  <a href="tel:0966201140" className="mt-1 inline-block text-sm text-[#8a4f41] hover:underline">0966 201 140</a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {comboItems.length > 0 && (
          <motion.div className="mb-10 rounded-[1.8rem] bg-[#fffdf8] p-5 shadow-sm md:mb-12 md:p-6" {...reveal} transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold text-[#2c2922]">{comboOffer?.title || 'Combo gợi ý'}</h2>
                <p className="mt-1 text-sm text-[#6b665a]">{comboOffer?.description || 'Chọn thêm sản phẩm đi kèm để tiết kiệm hơn và mua sắm đồng bộ.'}</p>
              </div>
              <div className="rounded-full bg-[#f4ede2] px-4 py-2 text-sm font-bold text-[#5a554a]">
                Cộng thêm: {formatVnd(comboAppliedExtrasPrice)}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {comboItems.map((item, index) => {
                const key = `${item?.local_product_id || item?.pancake_product_id || item?.label || index}`;
                const checked = item?.required ? true : Boolean(comboSelectionMap[key]);
                const quantityText = Math.max(1, Number(item?.quantity ?? 1));
                const canAutoAdd = Number(item?.local_product_id || 0) > 0;
                const selectedVariantMeta = comboVariantSelectionByItemKey[key] || null;
                const rawLineTotal = Number(getComboUnitPrice(item, index) || 0) * quantityText;
                const effectiveLineTotal = checked
                  ? Number(comboAdjustedLineTotalByKey[key] ?? rawLineTotal)
                  : rawLineTotal;
                const comboDiscountValue = checked ? Math.max(0, rawLineTotal - effectiveLineTotal) : 0;
                return (
                  <div
                    key={key}
                    onClick={() => handleToggleComboItem(item, index)}
                    className={`flex items-start gap-3 rounded-[1.2rem] border p-3 text-left transition ${checked ? 'border-[#8a4f41] bg-[#fff5ef]' : 'border-[#eadfce] bg-[#fffaf3]'} ${item?.required ? 'cursor-default' : 'cursor-pointer hover:-translate-y-[1px] hover:shadow-sm'}`}
                  >
                    <img src={item?.image || IMAGE_DEFAULT_URL} alt={item?.label || 'Combo item'} className="h-20 w-20 shrink-0 rounded-xl bg-white p-1 object-contain" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold leading-5 text-[#353229] break-words">{item?.label || 'Sản phẩm combo'}</div>
                      {selectedVariantMeta?.variant_label && (
                        <div className="mt-1 text-xs font-semibold text-[#8a4f41] break-words">Phân loại: {selectedVariantMeta.variant_label}</div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6f6a5f]">
                        <span className="rounded-full bg-[#eee7db] px-2 py-0.5">SL x{quantityText}</span>
                        {!item?.required && checked && <span className="rounded-full bg-[#d8f6e9] px-2 py-0.5 font-semibold text-[#206b52]">Đã chọn</span>}
                        {item?.required && <span className="rounded-full bg-[#ffe6ba] px-2 py-0.5 font-semibold text-[#805a1b]">Bắt buộc</span>}
                        {!canAutoAdd && <span className="rounded-full bg-[#f6d6d8] px-2 py-0.5 font-semibold text-[#8f2f3c]">Chưa map catalog</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-[#8a4f41]">{formatVnd(rawLineTotal)}</div>
                      {comboDiscountValue > 0 && (
                        <div className="mt-1 text-[11px] font-semibold text-[#2b6f57]">Ưu đãi combo: -{formatVnd(comboDiscountValue)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#6b665a]">
                Tổng tạm tính bộ: <span className="font-black text-[#8a4f41]">{formatVnd(comboBundleEstimatedTotal)}</span>
              </p>
              <button
                type="button"
                onClick={handleAddComboBundle}
                disabled={!canBuy || !selectedVariant}
                className="rounded-full bg-[#8a4f41] px-6 py-3 text-sm font-black text-white transition hover:bg-[#7b473a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {!canBuy
                  ? 'Hết hàng'
                  : !selectedVariant
                    ? 'Chọn phân loại sản phẩm chính'
                    : 'Thêm sản phẩm chính + combo'}
              </button>
            </div>
            {comboSelectionStatus.pending > 0 && (
              <p className="mt-2 text-xs font-semibold text-[#8f5b1f]">
                Đang kiểm tra biến thể của các món combo, vui lòng đợi một chút.
              </p>
            )}
          </motion.div>
        )}

        {false && displayPromotionOffers.length > 0 && (
          <motion.div className="mb-10 rounded-[1.8rem] bg-[#fffdf8] p-5 shadow-sm md:mb-12 md:p-6" {...reveal} transition={{ duration: 0.45, ease: 'easeOut', delay: 0.07 }}>
            <div className="mb-4">
              <h2 className="text-2xl font-extrabold text-[#2c2922]">Khuyến mãi đang áp dụng</h2>
              <p className="mt-1 text-sm text-[#6b665a]">Các ưu đãi dưới đây được tách riêng theo loại khuyến mãi, không gộp vào combo.</p>
            </div>

            <div className="space-y-3">
              {displayPromotionOffers.map((offer, offerIndex) => {
                const offerKey = `${offer?.id || offer?.title || 'promo'}-${offerIndex}`;
                const visibleItems = Array.isArray(offer?.items) ? offer.items.slice(0, 4) : [];
                const meta = asObject(offer?.meta);
                const discountTag = formatDiscountTag(meta?.discount_value, Boolean(meta?.is_percent));
                const minQty = Number(meta?.minimum_quantity ?? NaN);
                const minOrder = Number(meta?.minimum_order_total ?? NaN);
                const tiers = Array.isArray(meta?.tiers) ? meta.tiers.slice(0, 3) : [];
                const orderTiers = Array.isArray(meta?.order_tiers) ? meta.order_tiers.slice(0, 3) : [];
                const gifts = Array.isArray(meta?.gifts) ? meta.gifts.slice(0, 3) : [];
                return (
                  <article key={offerKey} className="rounded-[1.2rem] border border-[#eadfce] bg-[#fffaf3] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-black text-[#353229]">{offer?.title || 'Khuyến mãi'}</h3>
                        {offer?.description && (
                          <p className="mt-1 text-sm text-[#6f6a5f]">{offer.description}</p>
                        )}
                      </div>
                      <span className="rounded-full bg-[#d8f6e9] px-3 py-1 text-xs font-bold text-[#206b52]">
                        {getPromotionKindLabel(offer?.promotion_kind)}
                      </span>
                    </div>

                    {(offer?.starts_at || offer?.ends_at) && (
                      <p className="mt-2 text-xs font-semibold text-[#7f7a6f]">
                        Hiệu lực: {offer?.starts_at ? formatDate(offer.starts_at) : '-'} - {offer?.ends_at ? formatDate(offer.ends_at) : '-'}
                      </p>
                    )}

                    {(discountTag || (Number.isFinite(minQty) && minQty > 0) || (Number.isFinite(minOrder) && minOrder > 0)) && (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#5b554b]">
                        {discountTag && <span className="rounded-full bg-[#fde7cf] px-2.5 py-1 text-[#8a4f41]">{discountTag}</span>}
                        {Number.isFinite(minQty) && minQty > 0 && (
                          <span className="rounded-full bg-[#ece6d9] px-2.5 py-1">Mua từ {Math.round(minQty)} sản phẩm</span>
                        )}
                        {Number.isFinite(minOrder) && minOrder > 0 && (
                          <span className="rounded-full bg-[#ece6d9] px-2.5 py-1">Đơn từ {formatVnd(minOrder)}</span>
                        )}
                      </div>
                    )}

                    {tiers.length > 0 && (
                      <div className="mt-3 rounded-xl bg-white p-2.5">
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-[#7d776a]">Mức giảm theo số lượng</p>
                        <div className="mt-1.5 space-y-1 text-xs text-[#5f594f]">
                          {tiers.map((tier, tierIndex) => {
                            const from = Number(tier?.from_quantity ?? NaN);
                            const to = Number(tier?.to_quantity ?? NaN);
                            const tierDiscount = formatDiscountTag(tier?.discount, Boolean(tier?.is_percent));
                            return (
                              <p key={`${offerKey}-tier-${tierIndex}`}>
                                {Number.isFinite(from) ? `Từ ${Math.round(from)}` : 'Theo mức'}
                                {Number.isFinite(to) && to > from ? ` - ${Math.round(to)}` : ''}: {tierDiscount || 'Ưu đãi áp dụng'}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {orderTiers.length > 0 && (
                      <div className="mt-3 rounded-xl bg-white p-2.5">
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-[#7d776a]">Mức giảm theo giá trị đơn</p>
                        <div className="mt-1.5 space-y-1 text-xs text-[#5f594f]">
                          {orderTiers.map((tier, tierIndex) => {
                            const from = Number(tier?.from_total ?? NaN);
                            const discount = formatDiscountTag(tier?.discount, Boolean(tier?.is_percent));
                            return (
                              <p key={`${offerKey}-order-tier-${tierIndex}`}>
                                {Number.isFinite(from) && from > 0 ? `Đơn từ ${formatVnd(from)}` : 'Theo mức đơn'}: {discount || 'Ưu đãi áp dụng'}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {gifts.length > 0 && (
                      <div className="mt-3 rounded-xl bg-white p-2.5">
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-[#7d776a]">Quà tặng kèm</p>
                        <div className="mt-1.5 space-y-1 text-xs text-[#5f594f]">
                          {gifts.map((gift, giftIndex) => (
                            <p key={`${offerKey}-gift-${giftIndex}`}>
                              {gift?.label || 'Quà tặng'} x{Math.max(1, Number(gift?.quantity ?? 1))}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {visibleItems.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {visibleItems.map((item, itemIndex) => (
                          <div key={`${offerKey}-item-${itemIndex}`} className="flex items-center gap-2 rounded-xl bg-white p-2.5">
                            <img
                              src={item?.image || IMAGE_DEFAULT_URL}
                              alt={item?.label || 'Promotion item'}
                              className="h-11 w-11 rounded-lg bg-[#f5eee3] object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-sm font-semibold text-[#3a362e]">{item?.label || 'Sản phẩm khuyến mãi'}</p>
                              <p className="text-xs text-[#7a7468]">SL x{Math.max(1, Number(item?.quantity ?? 1))}</p>
                            </div>
                            {Number(item?.price || 0) > 0 && (
                              <p className="text-xs font-black text-[#8a4f41]">{formatVnd(item.price)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div className="mb-10 grid grid-cols-1 gap-5 lg:mb-12 lg:grid-cols-5 lg:gap-6" {...reveal} transition={{ duration: 0.46, ease: 'easeOut', delay: 0.04 }}>
          <div className="lg:col-span-3 rounded-[1.8rem] bg-[#fffdf8] p-5 shadow-sm md:p-6">
            <div className="mb-5 flex gap-5 overflow-x-auto border-b border-[#e8decd] pb-3 text-sm font-semibold text-[#635f54] md:gap-8">
              <span className="border-b-2 border-[#8a4f41] pb-2 text-[#8a4f41]">Chi tiết sản phẩm</span>
              {/* <span>Kích thước & Chất liệu</span>
              <span>Hướng dẫn bảo quản</span> */}
            </div>
            {richDescription.hasHtml ? (
              <div
                className="prose prose-sm max-w-none leading-7 text-[#4f4b42]"
                dangerouslySetInnerHTML={{ __html: richDescription.html }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-[15px] leading-7 text-[#4f4b42]">{richDescription.text}</div>
            )}
          </div>

          <div className="lg:col-span-2 rounded-[1.8rem] bg-[#f4ede2] p-5 md:p-6">
            <h2 className="mb-4 text-xl font-bold text-[#353229]">Lưu ý từ Lộc Sang</h2>
            <p className="mb-6 text-sm italic leading-6 text-[#635f54]">
              Kiểm tra kỹ thông tin sản phẩm, phân loại và chính sách giao hàng trước khi đặt mua.
            </p>
            <h3 className="mb-3 text-base font-bold text-[#353229]">Thông tin chi tiết</h3>
            <div className="grid grid-cols-1 gap-2">
              {detailRows.map((row) => (
                <div key={row.label} className="grid grid-cols-5 gap-2 border-b border-[#e8decd] py-2.5">
                  <span className="col-span-2 text-sm text-[#7f7a6f]">{row.label}</span>
                  <span className="col-span-3 break-words text-sm font-medium text-[#353229]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
        {/*
        {Array.isArray(product.variants) && product.variants.length > 0 && (
          <div className="rounded-xl bg-white border border-black/5 p-6 mb-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Bảng biến thể</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="text-left px-3 py-2">Mã mẫu</th>
                    <th className="text-left px-3 py-2">Kích cỡ</th>
                    <th className="text-left px-3 py-2">Màu</th>
                    <th className="text-left px-3 py-2">Chất liệu</th>
                    <th className="text-left px-3 py-2">Giá</th>
                    <th className="text-left px-3 py-2">Kho</th>
                    <th className="text-left px-3 py-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((variant) => (
                    <tr key={variant.id || variant.sku} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-900">{variant.sku || '-'}</td>
                      <td className="px-3 py-2">{variant.size || '-'}</td>
                      <td className="px-3 py-2">{variant.color || '-'}</td>
                      <td className="px-3 py-2">{variant.material || '-'}</td>
                      <td className="px-3 py-2">{formatVnd(variant.sale_price || variant.price || 0)}</td>
                      <td className="px-3 py-2">{variant.stock ?? 0}</td>
                      <td className="px-3 py-2">{variant.is_active ? 'Đang bán' : 'Ẩn'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )} */}

        <motion.div className="mb-11 rounded-[1.8rem] bg-[#f4ede2] p-4 shadow-sm md:mb-12 md:p-6" {...reveal} transition={{ duration: 0.48, ease: 'easeOut', delay: 0.06 }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold text-[#2c2922]">Đánh giá từ Hội Sen</h2>
              <div className="mt-1 flex items-center gap-2 text-[#7f7a6f]">
                <span className="text-4xl font-extrabold leading-none text-[#8a4f41]">{Number(ratingSummary.average || 0).toFixed(1)}</span>
                <div className="flex items-center gap-1">{renderStars(ratingSummary.average, 13)}</div>
                <span className="text-sm font-semibold">({ratingSummary.count || 0} đánh giá)</span>
              </div>
            </div>
          </div>

          {reviewsList.length === 0 ? (
            <div className="rounded-[1.1rem] bg-[#fff9f0] p-4 text-sm text-[#7f7a6f]">Chưa có đánh giá nào cho sản phẩm này.</div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {reviewsList.map((review) => (
                <article key={review.id} className="min-w-[270px] flex-1 rounded-[1.1rem] bg-[#fff9f0] p-3.5 ring-1 ring-[#e8decd] md:min-w-[310px]">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#bff1df] text-xs font-black text-[#2f6a5a]">
                        {String(review.reviewer_name || 'K').trim().slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[1rem] font-extrabold leading-tight text-[#2f2c25]">{review.reviewer_name}</div>
                        <div className="text-xs font-semibold text-[#8f887a]">Đã mua size M</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">{renderStars(review.rating, 11)}</div>
                  </div>
                  <p className="line-clamp-4 whitespace-pre-wrap text-[15px] leading-6 text-[#514d43]">{review.comment || 'Sản phẩm rất ổn, chất liệu đẹp và phù hợp với mô tả.'}</p>
                </article>
              ))}
            </div>
          )}

          <div className="mt-4">
            <button
              type="button"
              className="w-full rounded-full border border-[#d8ccba] bg-[#f6efe4] py-3 text-base font-bold text-[#746d60] transition hover:bg-[#efe6d9]"
            >
              Xem tất cả {ratingSummary.count || reviewsList.length || 0} đánh giá
            </button>
          </div>
        </motion.div>

        <motion.div className="pt-4 md:pt-8" {...reveal} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.08 }}>
          <div className="mb-6 flex items-end justify-between md:mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-[#1f1d18] md:text-3xl">Sản phẩm cùng bộ sưu tập</h2>
              <p className="mt-1 text-sm text-[#635f54]">Phối hợp hoàn hảo cho diện mạo sang trọng của bé</p>
            </div>
            <Link to="/products" className="text-sm font-bold text-[#8a4f41] hover:underline">Xem tất cả</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-6">
            {relatedProducts.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -4 }}
                className="group overflow-hidden rounded-[1.25rem] bg-white shadow-sm ring-1 ring-[#efe5d6] transition hover:-translate-y-1 hover:shadow-lg sm:rounded-[1.6rem]"
              >
                <Link to={toProductDetailPath(item)} className="block">
                  <div className="relative">
                    <img
                      src={item.images?.[0] || IMAGE_DEFAULT_URL}
                      alt={item.name}
                      className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-48"
                    />
                    <button
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow"
                      onClick={(e) => handleRelatedAddToCart(e, item)}
                    >
                      <FaShoppingCart className="text-[#8a4f41]" />
                    </button>
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-[#353229] sm:text-base">{item.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-bold text-[#8a4f41] sm:text-lg">{formatVnd(item.price)}</span>
                      <span className="rounded-full bg-[#f4ede2] px-3 py-1.5 text-xs font-semibold text-[#635f54] sm:px-4 sm:py-2 sm:text-sm">Chi tiết</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="fixed inset-x-0 bottom-[84px] z-40 bg-white/90 px-3 pb-3 pt-2 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2 rounded-[1.2rem] bg-[#fff9f0] px-2.5 py-2.5 shadow-[0_-8px_28px_rgba(53,50,41,0.08)] min-[390px]:rounded-[1.4rem] min-[390px]:px-3 min-[390px]:py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-medium text-[#7f7a6f] min-[390px]:text-[11px]">{(selectedVariant ? getVariantLabel(selectedVariant) : product.name) || 'Sản phẩm Lộc Sang'}</div>
            <div className="text-[15px] font-extrabold text-[#8a4f41] min-[390px]:text-base">{formatVnd(displayPrice)}</div>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canBuy || !selectedVariant}
            className="rounded-full bg-[#c7fce9] px-3.5 py-2 text-[11px] font-black text-[#1d5042] transition duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#88cdb8] disabled:opacity-50 min-[390px]:px-4 min-[390px]:text-xs"
          >
            Thêm giỏ
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={!canBuy || !selectedVariant}
            className="rounded-full bg-[#8a4f41] px-3.5 py-2 text-[11px] font-black text-white shadow transition duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bf8f82] disabled:bg-gray-300 min-[390px]:px-4 min-[390px]:text-xs"
          >
            {canBuy ? 'Mua ngay' : 'Hết hàng'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {comboVariantModalContext && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
            onClick={closeComboVariantModal}
          >
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-t-[1.6rem] bg-white p-5 shadow-2xl sm:rounded-[1.4rem]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-[#2f2b24]">Chọn phân loại combo</h3>
                  <p className="mt-1 text-sm text-[#6f6a5f]">{comboVariantModalContext?.product?.name || comboVariantModalContext?.item?.label || 'Sản phẩm combo'}</p>
                </div>
                <button
                  type="button"
                  onClick={closeComboVariantModal}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f3ece0] text-[#6c6559]"
                >
                  <FaTimes size={12} />
                </button>
              </div>

              {comboModalAttributes.length > 0 ? (
                <div className="space-y-4">
                  {comboModalAttributes.map((attr) => {
                    if (!isComboAttrApplicable(attr.name)) return null;
                    return (
                      <div key={attr.name}>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#7c766a]">{attr.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {attr.values.map((value) => {
                            const active = String(comboVariantSelections[attr.name] || '') === String(value);
                            const available = isComboAttrValueAvailable(attr.name, value);
                            const compatible = isComboAttrValueCompatible(attr.name, value);
                            if (!compatible) return null;

                            return (
                              <button
                                key={`${attr.name}-${value}`}
                                type="button"
                                disabled={!available}
                                onClick={() => handleChooseComboVariantAttr(attr.name, value)}
                                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${active ? 'bg-[#8a4f41] text-white' : 'bg-[#eee7db] text-[#5f5a50]'} ${!available ? 'cursor-not-allowed opacity-40' : 'hover:bg-[#e3dacb]'}`}
                              >
                                {value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {comboModalVariants.map((variant) => {
                    const active = Number(variant?.id) === Number(comboSelectedVariantId);
                    return (
                      <button
                        key={variant?.id || variant?.sku}
                        type="button"
                        onClick={() => setComboSelectedVariantId(Number(variant?.id))}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left ${active ? 'bg-[#8a4f41] text-white' : 'bg-[#f4ede2] text-[#5f5a50]'}`}
                      >
                        <span className="font-semibold">{buildVariantLabel(variant) || variant?.sku || 'Biến thể'}</span>
                        <span className="text-sm font-bold">{formatVnd(getVariantPrice(comboVariantModalContext?.product, variant))}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between rounded-xl bg-[#f7efe4] px-3 py-2">
                <span className="text-sm font-semibold text-[#5f5a50]">Giá</span>
                <span className="text-lg font-black text-[#8a4f41]">{formatVnd(getVariantPrice(comboVariantModalContext?.product, selectedComboModalVariant))}</span>
              </div>

              {selectedComboModalVariant && !selectedComboModalVariantPurchasable && (
                <p className="mt-2 text-sm font-semibold text-[#b54747]">Biến thể này hiện đang hết hàng</p>
              )}

              <button
                type="button"
                onClick={handleConfirmComboVariant}
                disabled={!selectedComboModalVariant || !selectedComboModalVariantPurchasable}
                className="mt-4 w-full rounded-full bg-[#8a4f41] py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Xác nhận phân loại
              </button>
            </motion.div>
          </motion.div>
        )}

        {relatedVariantModalProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
            onClick={closeRelatedVariantModal}
          >
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-t-[1.6rem] bg-white p-5 shadow-2xl sm:rounded-[1.4rem]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-[#2f2b24]">Chọn phân loại</h3>
                  <p className="mt-1 text-sm text-[#6f6a5f]">{relatedVariantModalProduct.name}</p>
                </div>
                <button
                  type="button"
                  onClick={closeRelatedVariantModal}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f3ece0] text-[#6c6559]"
                >
                  <FaTimes size={12} />
                </button>
              </div>

              {relatedModalAttributes.length > 0 ? (
                <div className="space-y-4">
                  {relatedModalAttributes.map((attr) => {
                    if (!isRelatedAttrApplicable(attr.name)) return null;
                    return (
                      <div key={attr.name}>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#7c766a]">{attr.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {attr.values.map((value) => {
                            const active = String(relatedVariantSelections[attr.name] || '') === String(value);
                            const available = isRelatedAttrValueAvailable(attr.name, value);
                            const compatible = isRelatedAttrValueCompatible(attr.name, value);
                            if (!compatible) return null;

                            return (
                              <button
                                key={`${attr.name}-${value}`}
                                type="button"
                                disabled={!available}
                                onClick={() => handleChooseRelatedVariantAttr(attr.name, value)}
                                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${active ? 'bg-[#8a4f41] text-white' : 'bg-[#eee7db] text-[#5f5a50]'} ${!available ? 'cursor-not-allowed opacity-40' : 'hover:bg-[#e3dacb]'}`}
                              >
                                {value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {relatedModalVariants.map((variant) => {
                    const active = Number(variant?.id) === Number(relatedSelectedVariantId);
                    return (
                      <button
                        key={variant?.id || variant?.sku}
                        type="button"
                        onClick={() => setRelatedSelectedVariantId(Number(variant?.id))}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left ${active ? 'bg-[#8a4f41] text-white' : 'bg-[#f4ede2] text-[#5f5a50]'}`}
                      >
                        <span className="font-semibold">{buildVariantLabel(variant) || variant?.sku || 'Biến thể'}</span>
                        <span className="text-sm font-bold">{formatVnd(getVariantPrice(relatedVariantModalProduct, variant))}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between rounded-xl bg-[#f7efe4] px-3 py-2">
                <span className="text-sm font-semibold text-[#5f5a50]">Giá</span>
                <span className="text-lg font-black text-[#8a4f41]">{formatVnd(getVariantPrice(relatedVariantModalProduct, selectedRelatedModalVariant))}</span>
              </div>

              {selectedRelatedModalVariant && !selectedRelatedModalVariantPurchasable && (
                <p className="mt-2 text-sm font-semibold text-[#b54747]">Biến thể này hiện đang hết hàng</p>
              )}

              <button
                type="button"
                onClick={handleConfirmRelatedVariantAdd}
                disabled={!selectedRelatedModalVariant || !selectedRelatedModalVariantPurchasable}
                className="mt-4 w-full rounded-full bg-[#8a4f41] py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Thêm vào giỏ hàng
              </button>
            </motion.div>
          </motion.div>
        )}

        {flyingImage && (
          <motion.div
            initial={{
              position: 'fixed',
              top: flyingImage.rect.top,
              left: flyingImage.rect.left,
              width: flyingImage.rect.width,
              height: flyingImage.rect.height,
              zIndex: 50,
            }}
            animate={{
              top: '20px',
              right: '20px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
            }}
            exit={{
              opacity: 0,
              scale: 0,
            }}
            transition={{
              duration: 1,
              ease: 'easeInOut',
            }}
            className="pointer-events-none"
          >
            <img src={flyingImage.src} alt="Flying product" className="w-full h-full object-cover rounded-full" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductDetail;
