import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaFilter, FaShoppingCart, FaChevronLeft, FaChevronRight, FaStar, FaChevronDown, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../components/Toast/ToastContext';
import { productService } from '../../services/productService';
import { toProductDetailPath } from '../../utils/productUrl';
import { getProductPricing } from '../../utils/productPricing';
import { useSEO } from '../../hooks/useSEO';

import { formatVnd } from '../../data/storefrontMock';

const IMAGE_DEFAULT_URL = 'https://res.cloudinary.com/diwxfpt92/image/upload/v1770981822/logo_d2wmlf.png';
const MOBILE_CTA_VARIANT_KEY = 'locsang_mobile_checkout_cta_variant_v1';
const MOBILE_CTA_METRICS_KEY = 'locsang_mobile_checkout_cta_metrics_v1';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'popular', label: 'Phổ biến' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
  { value: 'name_asc', label: 'Tên A-Z' },
];

const trackMobileCtaMetric = (variant, eventName) => {
  try {
    if (!variant || !eventName) return;
    const raw = localStorage.getItem(MOBILE_CTA_METRICS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const safe = parsed && typeof parsed === 'object' ? parsed : {};
    const bucket = safe[variant] && typeof safe[variant] === 'object' ? safe[variant] : {};
    bucket[eventName] = Number(bucket[eventName] || 0) + 1;
    bucket.lastUpdatedAt = new Date().toISOString();
    safe[variant] = bucket;
    localStorage.setItem(MOBILE_CTA_METRICS_KEY, JSON.stringify(safe));
  } catch {
    // ignore localStorage errors
  }
};

const ProductList = () => {
  const { addToCart, cart } = useCart();
  const navigate = useNavigate();
  const { showToast } = useToast ? useToast() : { showToast: () => {} };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedMaxPrice, setSelectedMaxPrice] = useState(0);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showMobileSortMenu, setShowMobileSortMenu] = useState(false);
  const [flyingImage, setFlyingImage] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [mobileCtaVariant, setMobileCtaVariant] = useState('checkout_now');
  const [variantModalProduct, setVariantModalProduct] = useState(null);
  const [variantSelections, setVariantSelections] = useState({});
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const variantResolveCacheRef = useRef(new Map());
  const sortMenuRef = useRef(null);
  const mobileSortMenuRef = useRef(null);

  useSEO({
    title: 'Danh Muc San Pham',
    description: 'Kham pha danh muc san pham Lộc Sang: hang chon loc, mau ma da dang, gia tot va giao nhanh.',
    canonicalPath: '/products',
  });

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await productService.getStorefrontProducts({
          status: 'active',
          limit: 100,
        });
        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setProducts([]);
          if (showToast) showToast('Không tải được sản phẩm từ hệ thống', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    try {
      const saved = String(sessionStorage.getItem(MOBILE_CTA_VARIANT_KEY) || '').trim();
      if (saved === 'checkout_now' || saved === 'order_quick') {
        setMobileCtaVariant(saved);
        return;
      }
      const next = Math.random() < 0.5 ? 'checkout_now' : 'order_quick';
      sessionStorage.setItem(MOBILE_CTA_VARIANT_KEY, next);
      setMobileCtaVariant(next);
    } catch {
      // ignore sessionStorage errors
    }
  }, []);

  useEffect(() => {
    const handleOutside = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
      if (mobileSortMenuRef.current && !mobileSortMenuRef.current.contains(event.target)) {
        setShowMobileSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!variantModalProduct) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [variantModalProduct]);

  const cartSummary = useMemo(() => {
    const totalItems = cart.reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0);
    const totalAmount = cart.reduce(
      (sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)),
      0,
    );
    return { totalItems, totalAmount };
  }, [cart]);

  useEffect(() => {
    if (cartSummary.totalItems <= 0) return;
    trackMobileCtaMetric(mobileCtaVariant, 'impressions');
  }, [cartSummary.totalItems, mobileCtaVariant]);

  const categories = useMemo(() => {
    const fromProducts = products.reduce((acc, product) => {
      const id = String(product?.category_id ?? '');
      if (!id || acc.some((item) => item.id === id)) return acc;
      acc.push({ id, name: product?.category_name || `Danh mục ${id}` });
      return acc;
    }, []);

    return [{ id: 'all', name: 'Tất cả' }, ...fromProducts];
  }, [products]);

  const colorOptions = useMemo(() => {
    const fromColorField = products
      .map((p) => String(p?.color || '').trim())
      .filter(Boolean);

    const fromVariants = products
      .flatMap((p) => (Array.isArray(p?.variants) ? p.variants : []))
      .flatMap((v) => (Array.isArray(v?.attributes) ? v.attributes : []))
      .filter((a) => String(a?.name || '').toLowerCase().includes('color') || String(a?.name || '').toLowerCase().includes('màu'))
      .map((a) => String(a?.value || '').trim())
      .filter(Boolean);

    return Array.from(new Set([...fromColorField, ...fromVariants])).slice(0, 8);
  }, [products]);

  const sizeOptions = useMemo(() => {
    const fromSizeField = products
      .map((p) => String(p?.size || '').trim())
      .filter(Boolean);

    const fromVariants = products
      .flatMap((p) => (Array.isArray(p?.variants) ? p.variants : []))
      .flatMap((v) => (Array.isArray(v?.attributes) ? v.attributes : []))
      .filter((a) => String(a?.name || '').toLowerCase().includes('size') || String(a?.name || '').toLowerCase().includes('kích'))
      .map((a) => String(a?.value || '').trim())
      .filter(Boolean);

    return Array.from(new Set([...fromSizeField, ...fromVariants])).slice(0, 8);
  }, [products]);

  const priceStats = useMemo(() => {
    const priceList = products
      .map((p) => getProductPricing(p).currentPrice)
      .filter((v) => Number.isFinite(v) && v > 0);
    const min = priceList.length ? Math.min(...priceList) : 0;
    const max = priceList.length ? Math.max(...priceList) : 1000000;
    return { min, max };
  }, [products]);

  useEffect(() => {
    if (!selectedMaxPrice) {
      setSelectedMaxPrice(priceStats.max || 1000000);
    }
  }, [priceStats.max, selectedMaxPrice]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategory, selectedMaxPrice, selectedSizes, selectedColors, sortBy]);

  const getProductPrice = (product) => getProductPricing(product).currentPrice;

  const getRatingSummary = (product) => {
    const avg = Number(product?.rating_summary?.average || 0);
    const count = Number(product?.rating_summary?.count || 0);
    return {
      avg: avg > 0 ? avg : 5,
      count,
    };
  };

  const collectProductSizes = (product) => {
    const direct = String(product?.size || '').trim();
    const attrs = (Array.isArray(product?.variants) ? product.variants : [])
      .flatMap((v) => (Array.isArray(v?.attributes) ? v.attributes : []))
      .filter((a) => String(a?.name || '').toLowerCase().includes('size') || String(a?.name || '').toLowerCase().includes('kích'))
      .map((a) => String(a?.value || '').trim())
      .filter(Boolean);
    return Array.from(new Set([...(direct ? [direct] : []), ...attrs]));
  };

  const collectProductColors = (product) => {
    const direct = String(product?.color || '').trim();
    const attrs = (Array.isArray(product?.variants) ? product.variants : [])
      .flatMap((v) => (Array.isArray(v?.attributes) ? v.attributes : []))
      .filter((a) => String(a?.name || '').toLowerCase().includes('color') || String(a?.name || '').toLowerCase().includes('màu'))
      .map((a) => String(a?.value || '').trim())
      .filter(Boolean);
    return Array.from(new Set([...(direct ? [direct] : []), ...attrs]));
  };

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const priceCap = Number(selectedMaxPrice || 0) || priceStats.max;

    const next = products.filter((product) => {
      const name = String(product?.name || '').toLowerCase();
      const desc = String(product?.description || '').toLowerCase();
      const cat = String(product?.category_name || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || desc.includes(q) || cat.includes(q);
      const matchesCategory = selectedCategory === 'all' || String(product?.category_id) === selectedCategory;
      const matchesPrice = getProductPrice(product) <= priceCap;

      const sizes = collectProductSizes(product);
      const colors = collectProductColors(product);

      const matchesSize = selectedSizes.length === 0 || sizes.some((s) => selectedSizes.includes(s));
      const matchesColor = selectedColors.length === 0 || colors.some((c) => selectedColors.includes(c));

      return matchesSearch && matchesCategory && matchesPrice && matchesSize && matchesColor;
    });

    next.sort((a, b) => {
      if (sortBy === 'price_asc') return getProductPrice(a) - getProductPrice(b);
      if (sortBy === 'price_desc') return getProductPrice(b) - getProductPrice(a);
      if (sortBy === 'name_asc') return String(a?.name || '').localeCompare(String(b?.name || ''), 'vi');
      if (sortBy === 'popular') return Number(b?.rating_summary?.count || 0) - Number(a?.rating_summary?.count || 0);
      return Number(b?.id || 0) - Number(a?.id || 0);
    });

    return next;
  }, [products, searchTerm, selectedCategory, selectedMaxPrice, selectedSizes, selectedColors, sortBy, priceStats.max]);

  const itemsPerPage = isMobile ? 4 : 6;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const toggleOption = (value, selected, setSelected) => {
    setSelected((prev) => {
      if (prev.includes(value)) return prev.filter((x) => x !== value);
      return [...prev, value];
    });
  };

  const handleFilterReset = () => {
    setSelectedCategory('all');
    setSearchTerm('');
    setSelectedSizes([]);
    setSelectedColors([]);
    setSortBy('newest');
    setSelectedMaxPrice(priceStats.max || 1000000);
    setPage(1);
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

  const getVariantPrice = (product, variant) => Number(
    variant?.sale_price
    ?? variant?.price
    ?? product?.sale_price
    ?? product?.price
    ?? 0,
  );

  const isVariantPurchasable = (product, variant) => {
    if (!variant || variant?.is_active === false) return false;
    const manageStock = Boolean(variant?.manage_stock ?? product?.manage_stock ?? true);
    const stock = Number(variant?.stock ?? 0);
    const allowBackorder = Boolean(variant?.allow_backorder ?? product?.allow_backorder ?? false);
    if (!manageStock) return true;
    return stock > 0 || allowBackorder;
  };

  const getAvailableVariants = (product) => {
    if (!Array.isArray(product?.variants) || product.variants.length === 0) return [];
    return product.variants.filter((variant) => isVariantPurchasable(product, variant));
  };

  const getActiveVariants = (product) => {
    if (!Array.isArray(product?.variants) || product.variants.length === 0) return [];
    return product.variants.filter((variant) => variant?.is_active !== false);
  };

  const buildVariantLabel = (variant) => {
    if (!variant) return '';
    const attrs = normalizeVariantAttributes(variant);
    return variant?.variant_name || Object.values(attrs).filter(Boolean).join(' / ') || '';
  };

  const commitAddToCart = (product, variant, quantity = 1) => {
    addToCart({
      product_id: Number(product.id),
      product_variant_id: Number.isFinite(Number(variant?.id)) ? Number(variant?.id) : null,
      title: product.name,
      price: getVariantPrice(product, variant),
      image: variant?.image || product.images?.[0] || IMAGE_DEFAULT_URL,
      quantity,
      sku: variant?.sku || product?.sku,
      variant_label: buildVariantLabel(variant),
    });
    if (showToast) showToast('Đã thêm vào giỏ hàng!', 'success');
  };

  const openVariantModal = (product, variants) => {
    const firstPurchasable = variants.find((variant) => isVariantPurchasable(product, variant)) || null;
    const firstVariant = firstPurchasable || variants[0] || null;
    setVariantModalProduct(product);
    setSelectedVariantId(Number.isFinite(Number(firstVariant?.id)) ? Number(firstVariant.id) : null);
    setVariantSelections(normalizeVariantAttributes(firstVariant));
  };

  const closeVariantModal = () => {
    setVariantModalProduct(null);
    setVariantSelections({});
    setSelectedVariantId(null);
  };

  const variantModalVariants = useMemo(() => getActiveVariants(variantModalProduct), [variantModalProduct]);

  const variantModalAttributes = useMemo(() => {
    if (!variantModalVariants.length) return [];
    const attrMap = {};
    const attrOrder = [];
    variantModalVariants.forEach((variant) => {
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
  }, [variantModalVariants]);

  const selectedModalVariant = useMemo(() => {
    if (!variantModalVariants.length) return null;
    if (variantModalAttributes.length === 0) {
      if (Number.isFinite(Number(selectedVariantId))) {
        return variantModalVariants.find((variant) => Number(variant?.id) === Number(selectedVariantId)) || variantModalVariants[0];
      }
      return variantModalVariants[0];
    }
    return variantModalVariants.find((variant) => {
      const attrs = normalizeVariantAttributes(variant);
      return variantModalAttributes.every((attr) => String(attrs[attr.name] || '') === String(variantSelections[attr.name] || ''));
    }) || null;
  }, [variantModalVariants, variantModalAttributes, variantSelections, selectedVariantId]);

  const selectedModalVariantPurchasable = useMemo(
    () => isVariantPurchasable(variantModalProduct, selectedModalVariant),
    [variantModalProduct, selectedModalVariant],
  );

  const isAttrValueAvailable = (attrName, attrValue) => {
    return variantModalVariants.some((variant) => {
      const attrs = normalizeVariantAttributes(variant);
      const val = attrs[attrName];
      return val && String(val) === String(attrValue);
    });
  };

  const isAttrValueCompatible = (attrName, attrValue) => {
    const attrIndex = variantModalAttributes.findIndex((attr) => attr.name === attrName);
    const priorAttrs = variantModalAttributes.slice(0, attrIndex);

    return variantModalVariants.some((variant) => {
      const attrs = normalizeVariantAttributes(variant);
      const val = attrs[attrName];
      if (!val || String(val) !== String(attrValue)) return false;
      return priorAttrs.every((attr) => {
        const selected = variantSelections[attr.name];
        if (!selected) return true;
        const variantVal = attrs[attr.name];
        if (!variantVal) return true;
        return String(variantVal) === String(selected);
      });
    });
  };

  const isAttrApplicable = (attrName) => {
    return variantModalVariants.some((variant) => {
      const attrs = normalizeVariantAttributes(variant);
      const val = attrs[attrName];
      if (val === undefined || val === null || val === '') return false;
      return variantModalAttributes
        .filter((attr) => attr.name !== attrName)
        .every((attr) => {
          const selected = variantSelections[attr.name];
          if (!selected) return true;
          const variantVal = attrs[attr.name];
          if (variantVal === undefined || variantVal === null || variantVal === '') return true;
          return String(variantVal) === String(selected);
        });
    });
  };

  const handleChooseVariantAttr = (attrName, value) => {
    setVariantSelections((prev) => {
      const next = { ...prev, [attrName]: value };
      variantModalAttributes.forEach((attr) => {
        const otherName = attr.name;
        if (otherName === attrName) return;
        const stillValid = variantModalVariants.some((variant) => {
          const attrs = normalizeVariantAttributes(variant);
          const thisMatch = String(attrs[attrName] || '') === String(value);
          const otherVal = attrs[otherName];
          const otherMatch = !!otherVal && String(otherVal) === String(next[otherName] || '');
          return thisMatch && otherMatch;
        });

        if (!stillValid) {
          delete next[otherName];

          const applicableValues = variantModalVariants
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

  const handleConfirmVariantAdd = () => {
    if (!variantModalProduct) return;
    if (!selectedModalVariant) {
      if (showToast) showToast('Vui lòng chọn đầy đủ phân loại', 'warning');
      return;
    }
    if (!selectedModalVariantPurchasable) {
      if (showToast) showToast('Biến thể đã chọn đang hết hàng', 'warning');
      return;
    }
    commitAddToCart(variantModalProduct, selectedModalVariant, 1);
    closeVariantModal();
  };

  const resolveProductForVariantCheck = async (product) => {
    const productId = Number(product?.id);
    if (!Number.isFinite(productId) || productId <= 0) return product;

    const cached = variantResolveCacheRef.current.get(productId);
    if (cached) return cached;

    const hasInlineVariants = Array.isArray(product?.variants) && product.variants.length > 0;
    const shouldFetchDetail = Boolean(product?.has_variants) || !hasInlineVariants;

    if (!shouldFetchDetail) {
      variantResolveCacheRef.current.set(productId, product);
      return product;
    }

    try {
      const detail = await productService.getStorefrontProductById(productId);
      const resolved = detail && typeof detail === 'object' ? { ...product, ...detail } : product;
      variantResolveCacheRef.current.set(productId, resolved);
      return resolved;
    } catch {
      return product;
    }
  };

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    const card = e.currentTarget?.closest('[data-product-card="true"]');
    const image = card?.querySelector('img');
    const imageSrc = image?.src || '';
    const imageRect = image?.getBoundingClientRect();

    const resolvedProduct = await resolveProductForVariantCheck(product);
    const activeVariants = getActiveVariants(resolvedProduct);
    const availableVariants = activeVariants.filter((variant) => isVariantPurchasable(resolvedProduct, variant));

    if (activeVariants.length > 1) {
      openVariantModal(resolvedProduct, activeVariants);
      return;
    }

    if (Boolean(resolvedProduct?.has_variants) && activeVariants.length === 0) {
      if (showToast) showToast('Sản phẩm có nhiều phân loại, vui lòng chọn trong trang chi tiết', 'info');
      navigate(toProductDetailPath(resolvedProduct));
      return;
    }

    const onlyVariant = activeVariants[0] || availableVariants[0] || null;
    commitAddToCart(resolvedProduct, onlyVariant, 1);

    if (imageRect && imageSrc) {
      setFlyingImage({
        src: imageSrc,
        rect: imageRect,
      });
      setTimeout(() => setFlyingImage(null), 850);
    }
  };

  const handleBuyNow = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    const resolvedProduct = await resolveProductForVariantCheck(product);
    const activeVariants = getActiveVariants(resolvedProduct);
    const availableVariants = activeVariants.filter((variant) => isVariantPurchasable(resolvedProduct, variant));

    if (activeVariants.length > 1) {
      if (showToast) showToast('Sản phẩm có nhiều phân loại, vui lòng chọn trong trang chi tiết', 'info');
      navigate(toProductDetailPath(resolvedProduct));
      return;
    }

    const onlyVariant = activeVariants[0] || availableVariants[0] || null;
    addToCart({
      product_id: Number(resolvedProduct.id),
      product_variant_id: Number.isFinite(Number(onlyVariant?.id)) ? Number(onlyVariant?.id) : null,
      title: resolvedProduct.name,
      price: getVariantPrice(resolvedProduct, onlyVariant),
      image: onlyVariant?.image || resolvedProduct.images?.[0] || IMAGE_DEFAULT_URL,
      quantity: 1,
      sku: onlyVariant?.sku || resolvedProduct?.sku,
      variant_label: buildVariantLabel(onlyVariant),
    });
    navigate('/checkout');
  };

  const handleViewDetail = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(toProductDetailPath(product));
  };

  return (
    <div className="min-h-screen bg-[#fff9f0] pb-28 pt-5 md:pb-14 md:pt-8">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="hidden xl:grid grid-cols-[240px_1fr] gap-7">
          <aside className="sticky top-24 h-[calc(100vh-8rem)] rounded-r-[2.2rem] bg-[#f4ede2] px-5 py-6">
            <h3 className="text-2xl font-bold text-[#8a4f41]">Danh Mục</h3>
            <p className="text-xs text-[#7a756a]">Dành cho bạn</p>
            <div className="mt-5 space-y-2">
              {categories.slice(0, 5).map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex w-full items-center rounded-full px-4 py-3 text-left text-sm font-semibold transition ${
                    selectedCategory === category.id
                      ? 'bg-[#ff9ea4] text-[#691724]'
                      : 'text-[#635f54] hover:bg-[#fff9f0]'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <div className="mt-8 rounded-2xl bg-[#fdb19f] p-4 text-center">
              <p className="text-xs font-bold text-[#633024]">Đang giảm giá 20%</p>
              <button className="mt-2 w-full rounded-full bg-[#8a4f41] px-3 py-2 text-[11px] font-bold text-white">XEM ƯU ĐÃI MỚI</button>
            </div>
          </aside>

          <div>
            <section className="mb-10 overflow-hidden rounded-3xl bg-[#c7fce9] p-8 lg:p-10">
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
                <div>
                  <span className="inline-flex rounded-full bg-[#366859] px-3 py-1 text-xs font-bold text-[#e4fff4]">MÙA HÈ RỰC RỠ</span>
                  <h2 className="mt-4 text-4xl font-black leading-tight text-[#1d5042]">Sản Phẩm Chọn Lọc<br />Cho Mọi Nhà</h2>
                  <p className="mt-3 max-w-lg text-[#2f6554]">Lộc Sang mang đến những thiết kế thủ công tinh xảo, chất liệu êm ái cho người bạn bốn chân của bạn.</p>
                  <Link to="/products" className="mt-5 inline-flex rounded-full bg-[#8a4f41] px-8 py-3 font-bold text-white shadow-md">Khám Phá Ngay</Link>
                </div>
                <div className="mx-auto h-64 w-full max-w-sm overflow-hidden rounded-[2rem] shadow-2xl lg:h-72">
                  <img src={products[0]?.images?.[0] || IMAGE_DEFAULT_URL} alt="Promo" className="h-full w-full object-cover" />
                </div>
              </div>
            </section>

            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-[3rem] font-black leading-[1.05] tracking-tight text-[#8a4f41]">Bộ Sưu Tập Lộc Sang</h1>
                <p className="mt-2 text-[#635f54]">Khám phá {filteredProducts.length} sản phẩm chọn lọc, sẵn sàng giao nhanh.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a756a]" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm sản phẩm..."
                    className="w-64 rounded-full bg-[#eee7db] pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8a4f41]/30"
                  />
                </div>
                <div className="relative" ref={sortMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowSortMenu((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#eee7db] px-4 py-2.5 text-sm font-semibold text-[#635f54]"
                  >
                    {SORT_OPTIONS.find((x) => x.value === sortBy)?.label || 'Mới nhất'} <FaChevronDown size={12} />
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 top-[110%] z-20 min-w-[200px] rounded-2xl border border-[#e3d8c8] bg-white p-2 shadow-xl">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSortBy(opt.value);
                            setShowSortMenu(false);
                          }}
                          className={`w-full rounded-xl px-3 py-2 text-left text-sm ${sortBy === opt.value ? 'bg-[#8a4f41] text-white' : 'text-[#635f54] hover:bg-[#f4ede2]'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[220px_1fr] gap-8">
              <aside className="space-y-8">
                <div>
                  <h4 className="mb-4 text-sm font-bold text-[#8a4f41]">Bộ Lọc</h4>
                  <p className="text-[11px] font-bold uppercase text-[#7f7a6f]">Khoảng giá (VND)</p>
                  <input
                    type="range"
                    min={priceStats.min}
                    max={priceStats.max || 1000000}
                    value={Math.min(selectedMaxPrice || priceStats.max, priceStats.max || 1000000)}
                    onChange={(e) => setSelectedMaxPrice(Number(e.target.value))}
                    className="mt-3 w-full accent-[#8a4f41]"
                  />
                  <div className="mt-2 flex justify-between text-[11px] font-semibold text-[#635f54]">
                    <span>{formatVnd(priceStats.min || 0)}</span>
                    <span>{formatVnd(selectedMaxPrice || priceStats.max || 0)}</span>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[11px] font-bold uppercase text-[#7f7a6f]">Kích thước</p>
                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.length === 0 && <span className="text-xs text-[#9a9489]">Không có dữ liệu size</span>}
                    {sizeOptions.map((size) => (
                      <button
                        key={size}
                        onClick={() => toggleOption(size, selectedSizes, setSelectedSizes)}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${selectedSizes.includes(size) ? 'bg-[#ff9ea4] text-[#691724]' : 'bg-[#e9e2d4] text-[#635f54]'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[11px] font-bold uppercase text-[#7f7a6f]">Màu sắc</p>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.length === 0 && <span className="text-xs text-[#9a9489]">Không có dữ liệu màu</span>}
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => toggleOption(color, selectedColors, setSelectedColors)}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${selectedColors.includes(color) ? 'bg-[#8a4f41] text-white' : 'bg-[#e9e2d4] text-[#635f54]'}`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleFilterReset}
                  className="rounded-full bg-[#e9e2d4] px-4 py-2 text-xs font-bold text-[#635f54] hover:bg-[#ddd4c4]"
                >
                  Xóa bộ lọc
                </button>
              </aside>

              <div>
                {loading && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 mb-2">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={`skeleton-desktop-${idx}`} className="animate-pulse rounded-3xl bg-white p-4 shadow-sm">
                        <div className="h-56 w-full rounded-2xl bg-[#e9e2d4]" />
                        <div className="mt-4 h-4 w-3/4 rounded bg-[#e9e2d4]" />
                        <div className="mt-2 h-4 w-1/2 rounded bg-[#e9e2d4]" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedProducts.map((product, index) => {
                    const rating = getRatingSummary(product);
                    const pricing = getProductPricing(product);
                    const primaryPrice = pricing.currentPrice;
                    return (
                      <motion.div
                        key={product.id}
                        data-product-card="true"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.03 }}
                        onClick={() => navigate(toProductDetailPath(product))}
                        className="group relative flex h-full cursor-pointer flex-col rounded-[2rem] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                      >
                        {index === 0 && <span className="absolute left-5 top-5 z-10 rounded-full bg-[#9e404a] px-3 py-1 text-[10px] font-black text-white">BÁN CHẠY</span>}
                        <Link to={toProductDetailPath(product)}>
                          <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl bg-[#f4ede2]">
                            <img src={product.images?.[0] || IMAGE_DEFAULT_URL} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <button
                              type="button"
                              onClick={(e) => handleAddToCart(e, product)}
                              className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#8a4f41] text-white opacity-0 shadow-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                            >
                              <FaShoppingCart size={14} />
                            </button>
                          </div>
                        </Link>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7f7a6f]">{product.category_name || 'Phụ kiện'}</p>
                        <h3 className="mt-1 break-words font-['Be_Vietnam_Pro'] text-[1.06rem] leading-[1.35] font-semibold text-[#7a4b42]">{product.name}</h3>
                        <div className="mt-2 flex items-center gap-1">
                          <FaStar className="text-[#f3b331]" size={12} />
                          <span className="text-xs text-[#635f54]">{rating.avg.toFixed(1)} ({rating.count})</span>
                        </div>
                        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                          <div className="flex flex-wrap items-end gap-2">
                            {pricing.hasDiscount && pricing.originalPrice && (
                              <span className="text-sm font-semibold text-[#9a9489] line-through">{formatVnd(pricing.originalPrice)}</span>
                            )}
                            <span className="text-[1.8rem] leading-none font-black text-[#8a4f41]">{formatVnd(primaryPrice)}</span>
                          </div>
                          <button
                            className="max-w-[56px] whitespace-normal break-words text-right text-[11px] leading-[1.05] font-bold text-[#635f54] underline"
                            onClick={(e) => handleViewDetail(e, product)}
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:hidden">
          <section className="relative mb-5 h-44 overflow-hidden rounded-[1.75rem] shadow-sm">
            <img src={products[0]?.images?.[0] || IMAGE_DEFAULT_URL} alt="Promo" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[#3b241d]/80 via-[#56362d]/36 to-transparent px-5 pb-5 pt-6">
              <h1 className="max-w-[250px] text-[1.95rem] font-extrabold leading-[1.02] tracking-[-0.015em] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]">Sản phẩm đẹp cho nhà mình</h1>
              <p className="mt-1 text-[0.73rem] font-medium text-[#f7ede6]/88">Sản phẩm đẹp, dễ mua, giao nhanh</p>
            </div>
          </section>

          <div className="mb-5 flex gap-2 overflow-x-auto rounded-full border border-[#e2d9cc] bg-white/70 p-1.5 shadow-[0_10px_24px_-18px_rgba(58,43,34,0.7)] backdrop-blur-sm">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`shrink-0 rounded-full px-5 py-2 text-[0.93rem] font-bold transition-all duration-200 ${selectedCategory === category.id ? 'bg-[#ff9ea4] text-[#691724] shadow-[0_6px_14px_-8px_rgba(105,23,36,0.65)]' : 'bg-transparent text-[#6a6458] hover:bg-[#f2ebdf]'}`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[1.45rem] font-black text-[#2f2b24]">Sản phẩm ({filteredProducts.length})</h2>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-[#d9d0c2] bg-white px-3.5 py-2 text-sm font-semibold text-[#353229]"
            >
              <FaFilter size={14} /> Bộ lọc
            </button>
          </div>

          {showFilters && (
            <div className="mb-5 rounded-2xl bg-[#f4ede2] p-4">
              <div className="mb-3">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a756a]" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm sản phẩm..."
                    className="w-full rounded-full bg-white pl-10 pr-4 py-2.5 text-sm outline-none"
                  />
                </div>
              </div>
              <div className="mb-3" ref={mobileSortMenuRef}>
                <p className="mb-2 text-xs font-bold uppercase text-[#7f7a6f]">Sắp xếp</p>
                <button
                  type="button"
                  onClick={() => setShowMobileSortMenu((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-[#635f54]"
                >
                  <span>{SORT_OPTIONS.find((x) => x.value === sortBy)?.label || 'Mới nhất'}</span>
                  <FaChevronDown size={12} />
                </button>
                {showMobileSortMenu && (
                  <div className="mt-2 rounded-xl border border-[#e3d8c8] bg-white p-1 shadow-lg">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSortBy(opt.value);
                          setShowMobileSortMenu(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm ${sortBy === opt.value ? 'bg-[#8a4f41] text-white' : 'text-[#635f54] hover:bg-[#f4ede2]'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-[#7f7a6f]">Giá tối đa</p>
                <input
                  type="range"
                  min={priceStats.min}
                  max={priceStats.max || 1000000}
                  value={Math.min(selectedMaxPrice || priceStats.max, priceStats.max || 1000000)}
                  onChange={(e) => setSelectedMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#8a4f41]"
                />
                <p className="mt-1 text-sm font-semibold text-[#635f54]">Đến {formatVnd(selectedMaxPrice || priceStats.max || 0)}</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-2 gap-4 mb-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={`skeleton-mobile-${idx}`} className="animate-pulse rounded-[1.8rem] bg-white p-3 shadow-sm">
                  <div className="h-40 rounded-2xl bg-[#e9e2d4]" />
                  <div className="mt-3 h-4 w-4/5 rounded bg-[#e9e2d4]" />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {paginatedProducts.map((product, index) => {
              const rating = getRatingSummary(product);
              const pricing = getProductPricing(product);
              const primaryPrice = pricing.currentPrice;
              return (
                <motion.div
                  key={product.id}
                  data-product-card="true"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  onClick={() => navigate(toProductDetailPath(product))}
                  className="relative flex h-full cursor-pointer flex-col rounded-[1.6rem] bg-white p-2.5 shadow-sm"
                >
                  {index === 0 && <span className="absolute left-3 top-3 z-10 rounded-full bg-[#ff9ea4] px-2 py-0.5 text-[10px] font-bold text-[#691724]">Bán chạy</span>}
                  <Link to={toProductDetailPath(product)}>
                    <div className="mb-3 aspect-square overflow-hidden rounded-[1rem] bg-[#e9e2d4]">
                      <img src={product.images?.[0] || IMAGE_DEFAULT_URL} alt={product.name} className="h-full w-full object-cover" />
                    </div>
                  </Link>
                  <h3 className="break-words font-['Be_Vietnam_Pro'] text-[0.95rem] leading-[1.3] font-semibold text-[#2f2b24]">{product.name}</h3>
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#6e695f]">
                    <FaStar className="text-[#f3b331]" size={10} /> {rating.avg.toFixed(1)} ({rating.count})
                  </div>
                  <div className="mt-auto flex items-end justify-between pt-2.5">
                    <div className="flex flex-wrap items-end gap-1.5">
                      {pricing.hasDiscount && pricing.originalPrice && (
                        <span className="text-[11px] font-semibold text-[#9a9489] line-through">{formatVnd(pricing.originalPrice)}</span>
                      )}
                      <span className="text-[1.18rem] leading-none font-extrabold text-[#8a4f41]">{formatVnd(primaryPrice)}</span>
                    </div>
                    <button className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#8a4f41] text-white" onClick={(e) => handleAddToCart(e, product)}>
                      <FaShoppingCart size={12.5} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {!loading && filteredProducts.length > itemsPerPage && safePage < totalPages && (
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="mt-8 w-full rounded-full bg-[#e9e2d4] py-4 text-xl font-bold text-[#2f2b24]"
            >
              Xem thêm sản phẩm
            </button>
          )}
        </div>

        {/* Shared pagination */}
        {!loading && filteredProducts.length > 0 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e9e2d4] text-[#635f54] disabled:opacity-40"
            >
              <FaChevronLeft size={12} />
            </button>
            {Array.from({ length: Math.min(totalPages, 3) }).map((_, idx) => {
              const pageNum = idx + 1;
              const active = safePage === pageNum;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full font-bold ${active ? 'bg-[#8a4f41] text-white' : 'bg-[#e9e2d4] text-[#635f54]'}`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e9e2d4] text-[#635f54] disabled:opacity-40"
            >
              <FaChevronRight size={12} />
            </button>
          </div>
        )}

        {/* Flying Image Animation */}
        <AnimatePresence>
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
                left: 'calc(100vw - 56px)',
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
              <img
                src={flyingImage.src}
                alt="Flying product"
                className="w-full h-full object-cover rounded-full"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {variantModalProduct && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
              onClick={closeVariantModal}
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
                    <p className="mt-1 text-sm text-[#6f6a5f]">{variantModalProduct.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeVariantModal}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f3ece0] text-[#6c6559]"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>

                {variantModalAttributes.length > 0 ? (
                  <div className="space-y-4">
                    {variantModalAttributes.map((attr) => {
                      if (!isAttrApplicable(attr.name)) return null;
                      return (
                        <div key={attr.name}>
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#7c766a]">{attr.name}</p>
                          <div className="flex flex-wrap gap-2">
                            {attr.values.map((value) => {
                              const active = String(variantSelections[attr.name] || '') === String(value);
                              const available = isAttrValueAvailable(attr.name, value);
                              const compatible = isAttrValueCompatible(attr.name, value);
                              if (!compatible) return null;

                              return (
                                <button
                                  key={`${attr.name}-${value}`}
                                  type="button"
                                  disabled={!available}
                                  onClick={() => handleChooseVariantAttr(attr.name, value)}
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
                    {variantModalVariants.map((variant) => {
                      const active = Number(variant?.id) === Number(selectedVariantId);
                      return (
                        <button
                          key={variant?.id || variant?.sku}
                          type="button"
                          onClick={() => setSelectedVariantId(Number(variant?.id))}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left ${active ? 'bg-[#8a4f41] text-white' : 'bg-[#f4ede2] text-[#5f5a50]'}`}
                        >
                          <span className="font-semibold">{buildVariantLabel(variant) || variant?.sku || 'Biến thể'}</span>
                          <span className="text-sm font-bold">{formatVnd(getVariantPrice(variantModalProduct, variant))}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between rounded-xl bg-[#f7efe4] px-3 py-2">
                  <span className="text-sm font-semibold text-[#5f5a50]">Giá</span>
                  <span className="text-lg font-black text-[#8a4f41]">{formatVnd(getVariantPrice(variantModalProduct, selectedModalVariant))}</span>
                </div>

                {selectedModalVariant && !selectedModalVariantPurchasable && (
                  <p className="mt-2 text-sm font-semibold text-[#b54747]">Biến thể này hiện đang hết hàng</p>
                )}

                <button
                  type="button"
                  onClick={handleConfirmVariantAdd}
                  disabled={!selectedModalVariant || !selectedModalVariantPurchasable}
                  className="mt-4 w-full rounded-full bg-[#8a4f41] py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Thêm vào giỏ hàng
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No Results */}
        {!loading && filteredProducts.length === 0 && (
          <div className="py-16 text-center">
            <h3 className="text-2xl font-bold text-[#2f2b24]">Không tìm thấy sản phẩm</h3>
            <p className="mt-2 text-[#635f54]">Vui lòng thử lại với bộ lọc khác</p>
            <button
              type="button"
              onClick={handleFilterReset}
              className="mt-4 rounded-full bg-[#8a4f41] px-5 py-2 text-sm font-bold text-white"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        )}

        {cartSummary.totalItems > 0 && (
          <div className="fixed inset-x-0 bottom-[84px] z-40 border-t border-[#eadfd4] bg-white/95 backdrop-blur sm:hidden">
            <div className="locsang-container py-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-500">Giỏ hàng của bạn</div>
                  <div className="text-sm font-bold text-gray-900">
                    {cartSummary.totalItems} sản phẩm • {formatVnd(cartSummary.totalAmount)}
                  </div>
                </div>
                <Link
                  to="/checkout"
                  onClick={() => trackMobileCtaMetric(mobileCtaVariant, 'clicks')}
                  className="inline-flex items-center justify-center rounded-xl bg-[#d66f4b] px-4 py-2 text-sm font-bold text-white shadow hover:bg-[#bf5f3f]"
                >
                  {mobileCtaVariant === 'order_quick' ? 'Đặt hàng nhanh' : 'Thanh toán ngay'}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;
