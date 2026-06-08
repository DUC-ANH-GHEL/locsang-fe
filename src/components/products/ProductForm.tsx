import * as React from 'react';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import ImageUploader from './ImageUploader';
import LoadingOverlay from '../common/LoadingOverlay';
import { useToast } from '../Toast';
import { logo_url } from '../../config/api';
import { parseApiError } from '../../utils/apiError';
import { logout } from '../../services/authService';
import { createProduct, getProductById, updateProduct } from '../../services/productService';
import { getCategories as getCategoriesApi } from '../../services/categoryService';

type ProductStatus = 'draft' | 'active' | 'discontinued';

type PetType = 'dog' | 'cat' | 'both';
type Season = 'winter' | 'summer' | 'all_season';

type AttributeDef = {
  id: string;
  name: string;
  values: string[];
};

type VariantRow = {
  id: string;
  image?: File | string | null;
  attributes: Record<string, string>; // attributeName -> value
  sku: string;
  price: string;
  cost_price: string;
  stock: string;
  status: 'active' | 'inactive';
};

type ProductDraft = {
  // TAB 1
  name: string;
  slug: string;
  short_description: string;
  description: string; // rich text html
  video_url: string;
  category_id: string;
  brand: string;
  pet_type: PetType;
  season: Season;
  tags: string[];
  status: ProductStatus;

  // TAB 2
  has_variants: boolean;
  // simple product
  sku: string;
  price: string;
  compare_price: string;
  cost_price: string;
  manage_stock: boolean;
  stock: string;
  allow_backorder: boolean;

  // variants
  attributes: AttributeDef[];
  variants: VariantRow[];
  sku_pattern: string;
  manage_stock_by_variant: boolean;

  // TAB 3
  meta_title: string;
  meta_description: string;
  seo_slug: string;

  weight_gram: string;
  length_cm: string;
  width_cm: string;
  height_cm: string;

  low_stock_threshold: string;
  featured: boolean;
  display_order: string;
};

type ProductFormProps = {
  id: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  readOnly?: boolean;
};

const DEFAULT_DRAFT: ProductDraft = {
  name: '',
  slug: '',
  short_description: '',
  description: '',
  video_url: '',
  category_id: '',
  brand: '',
  pet_type: 'both',
  season: 'all_season',
  tags: [],
  status: 'draft',

  has_variants: false,
  sku: '',
  price: '',
  compare_price: '',
  cost_price: '',
  manage_stock: true,
  stock: '0',
  allow_backorder: false,

  attributes: [],
  variants: [],
  sku_pattern: '{{product_code}}-{{attribute_values}}',
  manage_stock_by_variant: true,

  meta_title: '',
  meta_description: '',
  seo_slug: '',

  weight_gram: '0',
  length_cm: '0',
  width_cm: '0',
  height_cm: '0',

  low_stock_threshold: '',
  featured: false,
  display_order: '',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const uniq = (list: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of list) {
    const k = x.trim();
    if (!k) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k);
  }
  return out;
};

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeAttrName = (name: string) => name.trim().toLowerCase();
const isColorAttr = (name: string) => {
  const n = normalizeAttrName(name);
  return n === 'màu' || n === 'mau' || n === 'color' || n === 'colour';
};

const cartesian = (attrs: AttributeDef[]): Array<Record<string, string>> => {
  const clean = attrs
    .map((a) => ({ name: a.name.trim(), values: uniq(a.values) }))
    .filter((a) => a.name && a.values.length > 0);

  if (clean.length === 0) return [];

  let acc: Array<Record<string, string>> = [{}];
  for (const a of clean) {
    const next: Array<Record<string, string>> = [];
    for (const combo of acc) {
      for (const v of a.values) {
        next.push({ ...combo, [a.name]: v });
      }
    }
    acc = next;
    if (acc.length > 200) return acc; // early exit for UX
  }

  return acc;
};

const buildVariantKey = (attributes: Record<string, string>) => {
  const keys = Object.keys(attributes)
    .map((k) => k.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  return keys.map((k) => `${k}=${attributes[k]}`).join('|');
};

const applySkuPattern = (pattern: string, productCode: string, attributes: Record<string, string>) => {
  const values = Object.keys(attributes)
    .map((k) => attributes[k])
    .filter(Boolean);
  const joined = values
    .join('-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .toUpperCase();

  return pattern
    .replaceAll('{{product_code}}', (productCode || '').toUpperCase())
    .replaceAll('{{attribute_values}}', joined)
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const TagInput = ({
  value,
  onChange,
  placeholder,
  disabled,
  maxItems,
  onLimitReached,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxItems?: number;
  onLimitReached?: () => void;
}) => {
  const [text, setText] = useState('');

  const commit = () => {
    const v = text.trim();
    if (!v) return;
    const next = uniq([...value, v]);
    if (typeof maxItems === 'number' && maxItems > 0 && next.length > maxItems) {
      onLimitReached?.();
      return;
    }
    onChange(next);
    setText('');
  };

  return (
    <div className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2">
      <div className="flex flex-wrap gap-2">
        {value.map((t) => (
          <span
            key={t.toLowerCase()}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200"
          >
            {t}
            <button
              type="button"
              disabled={disabled}
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              onClick={() => onChange(value.filter((x) => x.toLowerCase() !== t.toLowerCase()))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          disabled={disabled}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => commit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
            if (e.key === ',') {
              e.preventDefault();
              commit();
            }
            if (e.key === 'Backspace' && !text && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          className="min-w-[160px] flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
};

const TABS = [
  { key: 'basic', label: 'Thông tin cơ bản' },
  { key: 'variants', label: 'Biến thể & Giá' },
  { key: 'seo', label: 'SEO & Nâng cao' },
] as const;

const MAX_PRODUCT_IMAGES = 9;

const ProductForm = ({ id, onSuccess, onCancel, readOnly = false }: ProductFormProps) => {
  const { showToast } = useToast();

  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('basic');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<ProductDraft>(DEFAULT_DRAFT);

  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);

  // images: first item is primary
  const [imagesFiles, setImagesFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

  const [dirty, setDirty] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const lastLoadedRef = useRef(false);
  const autosaveRef = useRef<number | null>(null);

  const [attributesLocked, setAttributesLocked] = useState(false);
  const [confirmEditAttributes, setConfirmEditAttributes] = useState(false);
  const [applyBulkToAll, setApplyBulkToAll] = useState(false);
  const [variantImageAttrName, setVariantImageAttrName] = useState<string>('');

  const slugAutoRef = useRef({
    initialized: false,
    slugLocked: false,
    seoLocked: false,
    lastAutoSlug: '',
    lastAutoSeoSlug: '',
  });

  const draftKey = useMemo(() => (id ? `locsang_admin_product_draft_v1:${id}` : 'locsang_admin_product_draft_v1:new'), [id]);

  // Profit/margin (simple)
  const simpleProfit = useMemo(() => {
    const price = Number(draft.price || 0);
    const cost = Number(draft.cost_price || 0);
    if (!Number.isFinite(price) || !Number.isFinite(cost)) return 0;
    return price - cost;
  }, [draft.price, draft.cost_price]);

  const simpleMargin = useMemo(() => {
    const price = Number(draft.price || 0);
    if (!price) return 0;
    return (simpleProfit / price) * 100;
  }, [draft.price, simpleProfit]);

  const totalVariantStock = useMemo(() => {
    if (!draft.manage_stock_by_variant) return 0;
    return draft.variants.reduce((sum, v) => {
      const s = Number(v.stock || 0);
      return sum + (Number.isFinite(s) ? s : 0);
    }, 0);
  }, [draft.variants, draft.manage_stock_by_variant]);

  const skuExample = useMemo(() => {
    const productCode = draft.sku.trim();
    const pattern = draft.sku_pattern || '{{product_code}}-{{attribute_values}}';
    if (!productCode) return '';

    const firstVariantAttrs = draft.variants?.[0]?.attributes;
    if (firstVariantAttrs && Object.keys(firstVariantAttrs).length > 0) {
      return applySkuPattern(pattern, productCode, firstVariantAttrs);
    }

    const exampleAttrs: Record<string, string> = {};
    for (const a of draft.attributes) {
      const name = a.name.trim();
      if (!name) continue;
      const first = uniq(a.values)[0];
      if (!first) continue;
      exampleAttrs[name] = first;
    }
    if (Object.keys(exampleAttrs).length === 0) return '';
    return applySkuPattern(pattern, productCode, exampleAttrs);
  }, [draft.attributes, draft.sku, draft.sku_pattern, draft.variants]);

  const defaultVariantImageAttrName = useMemo(() => {
    const found = draft.attributes.find((a) => isColorAttr(a.name));
    return found?.name?.trim() || '';
  }, [draft.attributes]);

  const uploaderInitialImages = useMemo(() => [...existingImageUrls, ...imagesFiles], [existingImageUrls, imagesFiles]);

  useEffect(() => {
    // Keep the image-attribute selection stable; default to a color-like attribute.
    const existingNames = new Set(draft.attributes.map((a) => a.name.trim()).filter(Boolean));
    setVariantImageAttrName((prev) => {
      if (prev && existingNames.has(prev)) return prev;
      if (defaultVariantImageAttrName && existingNames.has(defaultVariantImageAttrName)) return defaultVariantImageAttrName;
      const first = draft.attributes.find((a) => a.name.trim())?.name?.trim() || '';
      return first;
    });
  }, [defaultVariantImageAttrName, draft.attributes]);

  const validate = (): string | null => {
    // TAB 1 requireds
    if (!draft.name.trim()) return 'Tên sản phẩm là bắt buộc';
    if (!draft.slug.trim()) return 'Slug là bắt buộc';
    if (!draft.category_id) return 'Danh mục là bắt buộc';

    // Media: primary image required
    const totalImages = (existingImageUrls?.length ?? 0) + (imagesFiles?.length ?? 0);
    if (totalImages <= 0) return 'Ảnh chính là bắt buộc';
    if (totalImages > MAX_PRODUCT_IMAGES) return `Tối đa ${MAX_PRODUCT_IMAGES} ảnh`;

    // Shipping required per existing backend
    const weight = Number(draft.weight_gram);
    const len = Number(draft.length_cm);
    const wid = Number(draft.width_cm);
    const hei = Number(draft.height_cm);
    if (![weight, len, wid, hei].every((x) => Number.isFinite(x) && x >= 0)) {
      return 'Thông số vận chuyển (khối lượng/dài/rộng/cao) không hợp lệ';
    }

    // TAB 2 logic
    if (!draft.has_variants) {
      if (!draft.sku.trim()) return 'SKU là bắt buộc (Sản phẩm đơn)';
      const price = Number(draft.price);
      if (!Number.isFinite(price) || price <= 0) return 'Giá bán phải > 0 (Sản phẩm đơn)';
      if (draft.manage_stock) {
        const st = Number(draft.stock);
        if (!Number.isFinite(st) || st < 0) return 'Kho không được âm (Sản phẩm đơn)';
      }
      return null;
    }

    // Variants
    if (draft.attributes.length === 0) return 'Vui lòng thêm ít nhất 1 thuộc tính';

    // Keep validation consistent with the variant builder constraints
    if (attributesForGeneration.errors.tooManyAttrs) return 'Tối đa 3 thuộc tính để tạo biến thể';
    if (attributesForGeneration.errors.dupName) return 'Tên thuộc tính bị trùng. Vui lòng chỉnh lại.';
    if (attributesForGeneration.errors.tooManyValues) return 'Mỗi thuộc tính tối đa 20 giá trị';
    if (attributesForGeneration.errors.hasEmptyName) return 'Tên thuộc tính không được để trống';
    if (attributesForGeneration.errors.hasEmptyValues) return 'Mỗi thuộc tính cần ít nhất 1 giá trị';
    if (attributesForGeneration.overLimit) return 'Số biến thể vượt giới hạn 200';

    for (const a of draft.attributes) {
      if (!a.name.trim()) return 'Tên thuộc tính không được để trống';
      if (uniq(a.values).length === 0) return `Thuộc tính "${a.name || '(chưa đặt tên)'}" cần ít nhất 1 giá trị`;
    }

    if (draft.variants.length === 0) return 'Vui lòng tạo biến thể';

    const skuSeen = new Set<string>();
    const comboSeen = new Set<string>();
    for (let i = 0; i < draft.variants.length; i++) {
      const v = draft.variants[i];
      if (!v.sku.trim()) return `Biến thể #${i + 1}: thiếu SKU`;
      const skuKey = v.sku.trim().toLowerCase();
      if (skuSeen.has(skuKey)) return `SKU bị trùng: ${v.sku}`;
      skuSeen.add(skuKey);

      const price = Number(v.price);
      if (!Number.isFinite(price) || price <= 0) return `Biến thể #${i + 1}: giá phải > 0`;

      if (draft.manage_stock_by_variant) {
        const st = Number(v.stock);
        if (!Number.isFinite(st) || st < 0) return `Biến thể #${i + 1}: kho không được âm`;
      }

      // Ensure all attribute columns filled
      const requiredAttrNames = draft.attributes.map((a) => a.name.trim()).filter(Boolean);
      for (const n of requiredAttrNames) {
        if (!v.attributes?.[n]) return `Biến thể #${i + 1}: thiếu giá trị thuộc tính "${n}"`;
      }

      const key = buildVariantKey(v.attributes);
      if (comboSeen.has(key)) return `Biến thể bị trùng tổ hợp thuộc tính (#${i + 1})`;
      comboSeen.add(key);
    }

    return null;
  };

  // Load categories + draft from localStorage
  useEffect(() => {
    (async () => {
      try {
        const data = await getCategoriesApi();
        const list = Array.isArray(data) ? data : [];
        setCategories(list.map((c: any) => ({ id: Number(c.id), name: String(c.name ?? '') })));
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  // Load existing product for update
  useEffect(() => {
    (async () => {
      if (lastLoadedRef.current) return;
      lastLoadedRef.current = true;

      // Restore local draft first
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          setDraft((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // ignore
      }

      if (!id) return;

      setLoading(true);
      try {
        const p: any = await getProductById(id);

        // Map backend -> UI (best-effort)
        setDraft((prev) => ({
          ...prev,
          name: String(p?.name ?? prev.name),
          slug: String(p?.slug ?? prev.slug),
          description: String(p?.description ?? prev.description),
          category_id: String(p?.category_id ?? prev.category_id),
          sku: String(p?.sku ?? prev.sku),
          price: p?.price !== undefined && p?.price !== null ? String(p.price) : prev.price,
          status: p?.is_active ? 'active' : 'draft',
          seo_slug: String(p?.slug ?? prev.seo_slug),
          weight_gram: p?.weight !== undefined && p?.weight !== null ? String(Number(p.weight) * 1000) : prev.weight_gram,
          length_cm: p?.length !== undefined && p?.length !== null ? String(p.length) : prev.length_cm,
          width_cm: p?.width !== undefined && p?.width !== null ? String(p.width) : prev.width_cm,
          height_cm: p?.height !== undefined && p?.height !== null ? String(p.height) : prev.height_cm,
        }));

        // images
        const urls: string[] = Array.isArray(p?.images)
          ? p.images
              .map((x: any) => (typeof x === 'string' ? x : x?.url || x?.image_url))
              .filter((x: any) => typeof x === 'string' && x)
          : [];
        setExistingImageUrls(urls);
        setImagesFiles([]);
      } catch (e) {
        showToast('Không tải được sản phẩm', 'error');
      } finally {
        setLoading(false);
      }

      // Treat loaded data as baseline (not dirty)
      setDirty(false);
      setHydrated(true);
    })();
  }, [draftKey, id, showToast]);

  // Mark hydrated after initial load in create mode
  useEffect(() => {
    if (id) return;
    // allow any localStorage restore above to settle
    const t = window.setTimeout(() => {
      setDirty(false);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, [id]);

  // Init slug auto-state after hydration
  useEffect(() => {
    if (!hydrated) return;
    if (slugAutoRef.current.initialized) return;

    const auto = slugify(draft.name || '');
    const currentSlug = String(draft.slug || '').trim();
    const currentSeo = String(draft.seo_slug || '').trim();

    slugAutoRef.current.slugLocked = Boolean(currentSlug) && currentSlug !== auto;
    slugAutoRef.current.seoLocked = Boolean(currentSeo) && currentSeo !== auto;
    slugAutoRef.current.lastAutoSlug = auto;
    slugAutoRef.current.lastAutoSeoSlug = auto;
    slugAutoRef.current.initialized = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Slug auto-generate from name until user edits slug manually
  useEffect(() => {
    if (!hydrated) return;

    setDraft((prev) => {
      const auto = slugify(prev.name || '');

      const currentSlug = String(prev.slug || '').trim();
      const currentSeo = String(prev.seo_slug || '').trim();

      const shouldAutoSlug =
        !slugAutoRef.current.slugLocked || !currentSlug || currentSlug === slugAutoRef.current.lastAutoSlug;
      const shouldAutoSeo =
        !slugAutoRef.current.seoLocked || !currentSeo || currentSeo === slugAutoRef.current.lastAutoSeoSlug;

      let changed = false;
      const next = { ...prev };

      if (shouldAutoSlug && currentSlug !== auto) {
        next.slug = auto;
        changed = true;
      }
      if (shouldAutoSeo && currentSeo !== auto) {
        next.seo_slug = auto;
        changed = true;
      }

      slugAutoRef.current.lastAutoSlug = auto;
      slugAutoRef.current.lastAutoSeoSlug = auto;

      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.name, hydrated]);

  // mark dirty on changes (after initial hydration)
  useEffect(() => {
    if (readOnly) return;
    if (!hydrated) return;
    setDirty(true);
  }, [draft, imagesFiles, existingImageUrls, hydrated, readOnly]);

  // Autosave every 10s (localStorage) - non-file fields only
  useEffect(() => {
    if (readOnly) return;
    if (autosaveRef.current) window.clearInterval(autosaveRef.current);
    autosaveRef.current = window.setInterval(() => {
      try {
        const toSave = { ...draft };
        localStorage.setItem(draftKey, JSON.stringify(toSave));
      } catch {
        // ignore
      }
    }, 10_000);

    return () => {
      if (autosaveRef.current) window.clearInterval(autosaveRef.current);
      autosaveRef.current = null;
    };
  }, [draft, draftKey, readOnly]);

  // Warn on leave if not saved (client-side dirty)
  useEffect(() => {
    if (readOnly) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, readOnly]);

  const onImagesUpdate = useCallback((files: File[], existing: string[]) => {
    setImagesFiles(files);
    setExistingImageUrls(existing);
  }, []);

  const setField = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const addAttribute = () => {
    if (attributesLocked) {
      showToast('Thuộc tính đã được khoá sau khi generate. Hãy chọn “Chỉnh sửa thuộc tính”.', 'warning');
      return;
    }
    if (draft.attributes.length >= 3) {
      showToast('Tối đa 3 thuộc tính', 'warning');
      return;
    }
    setDraft((prev) => ({ ...prev, attributes: [...prev.attributes, { id: newId(), name: '', values: [] }] }));
  };

  const removeAttribute = (attrId: string) => {
    if (attributesLocked) {
      showToast('Thuộc tính đã được khoá sau khi generate. Hãy chọn “Chỉnh sửa thuộc tính”.', 'warning');
      return;
    }
    setDraft((prev) => {
      const nextAttrs = prev.attributes.filter((a) => a.id !== attrId);
      const removed = prev.attributes.find((a) => a.id === attrId);
      const removedName = removed?.name?.trim();

      const nextVariants = prev.variants.map((v) => {
        const attrs = { ...(v.attributes || {}) };
        if (removedName && attrs[removedName] !== undefined) {
          delete attrs[removedName];
        }
        return { ...v, attributes: attrs };
      });

      return { ...prev, attributes: nextAttrs, variants: nextVariants };
    });
  };

  // Lock attributes after generate (or when loading an existing product with variants)
  useEffect(() => {
    if (!hydrated) return;
    if (!draft.has_variants) {
      setAttributesLocked(false);
      return;
    }
    if (draft.variants.length > 0) setAttributesLocked(true);
  }, [draft.has_variants, draft.variants.length, hydrated]);

  const attributesForGeneration = useMemo(() => {
    const trimmed = draft.attributes
      .map((a) => ({ id: a.id, name: a.name.trim(), values: uniq(a.values) }))
      .filter((a) => a.name || a.values.length > 0);

    const normalizedNames = trimmed.map((a) => normalizeAttrName(a.name));
    const dupName = normalizedNames.some((n, i) => n && normalizedNames.indexOf(n) !== i);
    const tooManyAttrs = trimmed.length > 3;
    const tooManyValues = trimmed.some((a) => a.values.length > 20);
    const hasEmptyName = trimmed.some((a) => a.values.length > 0 && !a.name);
    const hasEmptyValues = trimmed.some((a) => a.name && a.values.length === 0);

    // valid means ready for counting/generation (non-empty names + values, no dup names)
    const valid =
      trimmed.length > 0 &&
      !tooManyAttrs &&
      !tooManyValues &&
      !dupName &&
      !hasEmptyName &&
      !hasEmptyValues &&
      trimmed.every((a) => a.name && a.values.length > 0);

    const breakdown = valid ? trimmed.map((a) => `${a.values.length} ${a.name}`).join(' × ') : '';
    const count = valid ? trimmed.reduce((acc, a) => acc * a.values.length, 1) : 0;
    const overLimit = count > 200;

    return {
      list: trimmed,
      valid,
      count,
      breakdown,
      overLimit,
      errors: {
        tooManyAttrs,
        tooManyValues,
        dupName,
        hasEmptyName,
        hasEmptyValues,
      },
    };
  }, [draft.attributes]);

  const generateVariants = async () => {
    setIsGenerating(true);
    try {
      if (!attributesForGeneration.valid) {
        if (attributesForGeneration.errors.tooManyAttrs) {
          showToast('Tối đa 3 thuộc tính để tạo biến thể', 'warning');
          return;
        }
        if (attributesForGeneration.errors.dupName) {
          showToast('Tên thuộc tính bị trùng. Vui lòng chỉnh lại.', 'warning');
          return;
        }
        if (attributesForGeneration.errors.tooManyValues) {
          showToast('Mỗi thuộc tính tối đa 20 giá trị', 'warning');
          return;
        }
        showToast('Chưa đủ thuộc tính/giá trị để tạo biến thể', 'warning');
        return;
      }
      if (attributesForGeneration.overLimit) {
        showToast('Số biến thể vượt giới hạn 200', 'error');
        return;
      }
      if (!draft.sku.trim()) {
        showToast('Vui lòng nhập Product code (SKU) trước khi generate', 'warning');
        return;
      }

      // Generate from trimmed/unique attribute list so keys match validation/counting exactly.
      const attrsForCartesian = attributesForGeneration.list.map((a) => ({ name: a.name, values: a.values }));
      const combos = cartesian(attrsForCartesian as any);

      // Preserve existing edits by combo key
      const byKey = new Map<string, VariantRow>();
      for (const v of draft.variants) {
        const normalizedAttrs: Record<string, string> = {};
        for (const [k, val] of Object.entries(v.attributes || {})) {
          const kk = String(k || '').trim();
          if (!kk) continue;
          normalizedAttrs[kk] = String(val ?? '');
        }
        byKey.set(buildVariantKey(normalizedAttrs), { ...v, attributes: normalizedAttrs });
      }

      const productCode = draft.sku.trim();
      const pattern = draft.sku_pattern || '{{product_code}}-{{attribute_values}}';

      const next: VariantRow[] = combos.map((attrs) => {
        const key = buildVariantKey(attrs);
        const existing = byKey.get(key);
        if (existing) return existing;

        const sku = applySkuPattern(pattern, productCode, attrs);
        return {
          id: newId(),
          image: null,
          attributes: attrs,
          sku,
          price: draft.price || '',
          cost_price: draft.cost_price || '',
          stock: '0',
          status: 'active',
        };
      });

      // Validate combos unique by key already
      setDraft((prev) => ({ ...prev, variants: next }));
      setSelectedVariantIds([]);
      setAttributesLocked(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);

  const allVariantSelected = draft.variants.length > 0 && draft.variants.every((v) => selectedVariantIds.includes(v.id));

  const ensureBulkTargets = () => {
    if (applyBulkToAll) return true;
    if (selectedVariantIds.length > 0) return true;
    showToast('Chọn ít nhất 1 biến thể hoặc tick “Áp dụng cho tất cả biến thể”', 'warning');
    return false;
  };

  const bulkSet = (field: 'price' | 'cost_price' | 'stock', value: string) => {
    if (!ensureBulkTargets()) return;
    setDraft((prev) => {
      const set = new Set(selectedVariantIds);
      const next = prev.variants.map((v) => {
        if (!applyBulkToAll && !set.has(v.id)) return v;
        return { ...v, [field]: value };
      });
      return { ...prev, variants: next };
    });
  };

  const bulkAdjustPercent = (percent: number) => {
    if (!ensureBulkTargets()) return;
    setDraft((prev) => {
      const set = new Set(selectedVariantIds);
      const next = prev.variants.map((v) => {
        if (!applyBulkToAll && !set.has(v.id)) return v;
        const p = Number(v.price);
        if (!Number.isFinite(p) || p <= 0) return v;
        const nextPrice = Math.round(p * (1 + percent / 100));
        return { ...v, price: String(nextPrice) };
      });
      return { ...prev, variants: next };
    });
  };

  const bulkSetStatus = (status: VariantRow['status']) => {
    if (!ensureBulkTargets()) return;
    setDraft((prev) => {
      const set = new Set(selectedVariantIds);
      const next = prev.variants.map((v) => {
        if (!applyBulkToAll && !set.has(v.id)) return v;
        return { ...v, status };
      });
      return { ...prev, variants: next };
    });
  };

  const assignImageByAttributeValue = (attrValue: string, file: File | null) => {
    const attrName = variantImageAttrName?.trim();
    if (!attrName) return;
    setDraft((prev) => {
      const next = prev.variants.map((v) => {
        if ((v.attributes?.[attrName] || '') !== attrValue) return v;
        return { ...v, image: file };
      });
      return { ...prev, variants: next };
    });
  };

  const onSubmit = async () => {
    if (readOnly) return;
    const err = validate();
    if (err) {
      showToast(err, 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      // Map PRD status -> existing backend is_active
      const is_active = draft.status === 'active';

      if (!draft.has_variants) {
        // Simple
        const payload: any = {
          name: draft.name.trim(),
          slug: draft.slug.trim(),
          description: draft.description,
          price: Number(draft.price),
          sku: draft.sku.trim(),
          stock: draft.manage_stock ? Number(draft.stock || 0) : 0,
          currency: 'VND',
          affiliate: 0,
          weight: Number(draft.weight_gram || 0) / 1000,
          length: Number(draft.length_cm || 0),
          width: Number(draft.width_cm || 0),
          height: Number(draft.height_cm || 0),
          is_active,
          category_id: Number(draft.category_id),
          images: [...existingImageUrls, ...imagesFiles],
        };

        if (id) {
          await updateProduct({ ...payload, id });
        } else {
          await createProduct(payload);
        }

        showToast(id ? 'Cập nhật sản phẩm thành công!' : 'Tạo sản phẩm thành công!', 'success');
        setDirty(false);
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // ignore
        }
        onSuccess?.();
        return;
      }

      // Variants
      const minPrice = Math.min(...draft.variants.map((v) => Number(v.price) || Infinity));
      const productPrice = Number.isFinite(minPrice) && minPrice !== Infinity ? minPrice : Number(draft.price || 0);
      const stock = draft.manage_stock_by_variant ? totalVariantStock : 0;

      // Best-effort compatibility mapping for current backend variants (size/color/material)
      const toCompat = (attrs: Record<string, string>) => {
        const out: any = {};
        for (const [k, v] of Object.entries(attrs || {})) {
          const n = normalizeAttrName(k);
          if (n === 'size') out.size = v;
          if (n === 'màu' || n === 'mau' || n === 'color') out.color = v;
          if (n === 'chất liệu' || n === 'chat lieu' || n === 'material') out.material = v;
        }
        return out;
      };

      const variantsPayload = draft.variants.map((v) => ({
        sku: v.sku.trim(),
        price: Number(v.price),
        stock: draft.manage_stock_by_variant ? Number(v.stock || 0) : 0,
        is_active: v.status === 'active',
        ...toCompat(v.attributes),
      }));

      const payload: any = {
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        description: draft.description,
        price: productPrice,
        sku: draft.sku.trim(),
        stock,
        currency: 'VND',
        affiliate: 0,
        weight: Number(draft.weight_gram || 0) / 1000,
        length: Number(draft.length_cm || 0),
        width: Number(draft.width_cm || 0),
        height: Number(draft.height_cm || 0),
        is_active,
        category_id: Number(draft.category_id),
        variants: variantsPayload,
        images: [...existingImageUrls, ...imagesFiles],
      };

      if (id) {
        await updateProduct({ ...payload, id });
      } else {
        await createProduct(payload);
      }

      showToast(id ? 'Cập nhật sản phẩm thành công!' : 'Tạo sản phẩm thành công!', 'success');
      setDirty(false);
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
      onSuccess?.();
    } catch (e: any) {
      const parsed = parseApiError(e);
      if (parsed?.status === 401) {
        showToast('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 'error', 5000);
        logout();
        const current = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/admin/login?redirect=${encodeURIComponent(current)}`;
        return;
      }
      showToast(parsed?.message || 'Có lỗi xảy ra. Vui lòng thử lại.', 'error', 6000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTabBasic = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Thông tin chính</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Tên, slug và mô tả sản phẩm</div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Tên sản phẩm *</label>
                <input
                  value={draft.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="VD: Áo hoodie"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Slug *</label>
                <input
                  value={draft.slug}
                  onChange={(e) => {
                    const next = slugify(e.target.value);
                    if (next) {
                      slugAutoRef.current.slugLocked = true;
                    } else {
                      slugAutoRef.current.slugLocked = false;
                    }
                    setField('slug', next);
                    if (!slugAutoRef.current.seoLocked && (!draft.seo_slug || draft.seo_slug === slugAutoRef.current.lastAutoSeoSlug)) {
                      setField('seo_slug', next);
                    }
                  }}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="ao-hoodie-cho-cho"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Mô tả ngắn</label>
                <textarea
                  value={draft.short_description}
                  onChange={(e) => setField('short_description', e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Tóm tắt nổi bật của sản phẩm..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Mô tả chi tiết</label>
                <div className="rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <ReactQuill theme="snow" value={draft.description} readOnly={readOnly} onChange={(v) => setField('description', v)} />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Media</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Ảnh chính, gallery và video</div>
              </div>
              <ImageUploader
                initialImages={uploaderInitialImages}
                onImagesUpdate={onImagesUpdate}
                label="Ảnh sản phẩm"
                helpText={`Ảnh đầu tiên là ảnh chính. Kéo thả để sắp xếp. Tối đa ${MAX_PRODUCT_IMAGES} ảnh.`}
                requiredPrimary
                maxImages={MAX_PRODUCT_IMAGES}
                disabled={readOnly}
              />

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Video (optional)</label>
                <input
                  value={draft.video_url}
                  onChange={(e) => setField('video_url', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Phân loại</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Danh mục, thương hiệu và tags</div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Danh mục *</label>
                <select
                  value={draft.category_id}
                  onChange={(e) => setField('category_id', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">— Chọn danh mục —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Thương hiệu</label>
                <input
                  value={draft.brand}
                  onChange={(e) => setField('brand', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="VD: Lộc Sang"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Nhóm sản phẩm</label>
                <select
                  value={draft.pet_type}
                  onChange={(e) => setField('pet_type', e.target.value as PetType)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="dog">Nhóm 1</option>
                  <option value="cat">Nhóm 2</option>
                  <option value="both">Cả hai</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Mùa</label>
                <select
                  value={draft.season}
                  onChange={(e) => setField('season', e.target.value as Season)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="winter">Winter</option>
                  <option value="summer">Summer</option>
                  <option value="all_season">All season</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Tags</label>
                <TagInput value={draft.tags} onChange={(next) => setField('tags', next)} placeholder="Nhập tag và Enter..." />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Trạng thái</div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Trạng thái</label>
                <select
                  value={draft.status}
                  onChange={(e) => setField('status', e.target.value as ProductStatus)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="draft">Nháp</option>
                  <option value="active">Đang bán</option>
                  <option value="discontinued">Ngừng bán</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabVariants = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Loại sản phẩm</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Sản phẩm đơn hoặc nhiều biến thể</div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <input
                type="checkbox"
                checked={draft.has_variants}
                onChange={(e) => setField('has_variants', e.target.checked)}
                className="h-4 w-4"
              />
              Sản phẩm có nhiều biến thể
            </label>
          </div>
        </div>

        {!draft.has_variants ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sản phẩm đơn</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">SKU, giá và tồn kho</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">SKU *</label>
                <input
                  value={draft.sku}
                  onChange={(e) => setField('sku', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
                  placeholder="VD: LOCSANG-HOODIE"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Giá bán *</label>
                <input
                  value={draft.price}
                  onChange={(e) => setField('price', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
                  placeholder="199000"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Giá so sánh</label>
                <input
                  value={draft.compare_price}
                  onChange={(e) => setField('compare_price', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
                  placeholder="249000"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Giá vốn</label>
                <input
                  value={draft.cost_price}
                  onChange={(e) => setField('cost_price', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
                  placeholder="120000"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-950">
                <div className="text-xs text-gray-500">Lợi nhuận</div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{Number.isFinite(simpleProfit) ? simpleProfit.toLocaleString('vi-VN') : '0'} đ</div>
                <div className="text-xs text-gray-500">Biên lợi nhuận</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{Number.isFinite(simpleMargin) ? simpleMargin.toFixed(1) : '0.0'}%</div>
              </div>

              <div className="space-y-3">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <input
                    type="checkbox"
                    checked={draft.manage_stock}
                    onChange={(e) => setField('manage_stock', e.target.checked)}
                    className="h-4 w-4"
                  />
                  Quản lý tồn kho?
                </label>

                <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <input
                    type="checkbox"
                    checked={draft.allow_backorder}
                    onChange={(e) => setField('allow_backorder', e.target.checked)}
                    className="h-4 w-4"
                  />
                  Cho phép bán khi hết hàng?
                </label>

                {draft.manage_stock && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Kho *</label>
                    <input
                      value={draft.stock}
                      onChange={(e) => setField('stock', e.target.value)}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
                      inputMode="numeric"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Attribute Builder</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Tối đa 3 thuộc tính. Mỗi thuộc tính tối đa 20 giá trị. Không trùng tên/value.</div>
                </div>
                {attributesLocked ? (
                  <button
                    type="button"
                    onClick={() => setConfirmEditAttributes(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 font-semibold text-gray-800 dark:text-gray-200"
                  >
                    Chỉnh sửa thuộc tính
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={addAttribute}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 font-semibold"
                  >
                    + Thêm thuộc tính
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {draft.attributes.map((a) => (
                  <div key={a.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Tên thuộc tính</label>
                      <input
                        value={a.name}
                        disabled={attributesLocked}
                        onChange={(e) => {
                          if (attributesLocked) return;
                          const nextName = e.target.value;
                          setDraft((prev) => {
                            const nextTrim = nextName.trim();
                            const nextNorm = normalizeAttrName(nextTrim);
                            if (nextNorm) {
                              const dup = prev.attributes.some(
                                (x) => x.id !== a.id && normalizeAttrName(x.name.trim()) === nextNorm,
                              );
                              if (dup) {
                                showToast('Không cho trùng tên thuộc tính', 'warning');
                                return prev;
                              }
                            }

                            const oldTrim = a.name.trim();
                            if (variantImageAttrName && oldTrim && variantImageAttrName === oldTrim) {
                              setVariantImageAttrName(nextTrim);
                            }

                            return {
                              ...prev,
                              attributes: prev.attributes.map((x) => (x.id === a.id ? { ...x, name: nextName } : x)),
                            };
                          });
                        }}
                        className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
                        placeholder="VD: Size"
                      />

                      <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                        <input
                          type="radio"
                          name="variantImageAttr"
                          disabled={attributesLocked || !a.name.trim()}
                          checked={variantImageAttrName === a.name.trim()}
                          onChange={() => setVariantImageAttrName(a.name.trim())}
                          className="h-4 w-4"
                        />
                        Gán ảnh theo thuộc tính này
                      </label>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Giá trị</label>
                      <TagInput
                        value={a.values}
                        disabled={attributesLocked}
                        maxItems={20}
                        onLimitReached={() => showToast('Mỗi thuộc tính tối đa 20 giá trị', 'warning')}
                        onChange={(next) => {
                          if (attributesLocked) return;
                          setDraft((prev) => ({
                            ...prev,
                            attributes: prev.attributes.map((x) => (x.id === a.id ? { ...x, values: next } : x)),
                          }));
                        }}
                        placeholder="Nhập giá trị và Enter..."
                      />
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => removeAttribute(a.id)}
                          disabled={attributesLocked}
                          className="text-sm font-semibold text-red-600 hover:text-red-700"
                        >
                          Xoá thuộc tính
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {draft.attributes.length === 0 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">Chưa có thuộc tính. Thêm thuộc tính để tạo biến thể.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="text-sm text-gray-800 dark:text-gray-200">
                Tổng số biến thể sẽ tạo:{' '}
                <span className="font-semibold">{attributesForGeneration.valid ? attributesForGeneration.count : 0}</span>
                {attributesForGeneration.breakdown ? (
                  <span className="text-xs text-gray-500 dark:text-gray-400"> ({attributesForGeneration.breakdown})</span>
                ) : null}
              </div>
              {attributesForGeneration.overLimit && (
                <div className="mt-1 text-sm font-semibold text-red-600">Số biến thể vượt giới hạn 200</div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Generate Variants</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Sinh Cartesian product. Tối đa 200 biến thể.</div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="min-w-[240px]">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">SKU pattern</label>
                    <input
                      value={draft.sku_pattern}
                      onChange={(e) => setField('sku_pattern', e.target.value)}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    />
                    <div className="text-[11px] text-gray-500 mt-1">Mặc định: {'{{product_code}}-{{attribute_values}}'}</div>
                    {skuExample && (
                      <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-1">
                        Ví dụ SKU: <span className="font-semibold">{skuExample}</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-[220px]">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Product code (SKU) *</label>
                    <input
                      value={draft.sku}
                      onChange={(e) => setField('sku', e.target.value)}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                      placeholder="VD: LOCSANG-HOODIE"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isGenerating || attributesForGeneration.overLimit}
                    onClick={generateVariants}
                    className="h-[42px] self-end inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white px-4 py-2 font-semibold"
                  >
                    {isGenerating ? 'Đang tạo...' : 'Tạo tất cả tổ hợp'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bulk Actions</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Áp dụng cho dòng đã chọn, hoặc cho tất cả nếu tick bên dưới.</div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => bulkAdjustPercent(10)} className="rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                    +10%
                  </button>
                  <button type="button" onClick={() => bulkAdjustPercent(-10)} className="rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                    -10%
                  </button>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <input
                  type="checkbox"
                  checked={applyBulkToAll}
                  onChange={(e) => setApplyBulkToAll(e.target.checked)}
                  className="h-4 w-4"
                />
                Áp dụng cho tất cả biến thể
              </label>

              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Set giá:</span>
                  <input
                    className="w-32 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    placeholder="199000"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const v = (e.target as HTMLInputElement).value;
                      bulkSet('price', v);
                      (e.target as HTMLInputElement).value = '';
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Set giá vốn:</span>
                  <input
                    className="w-32 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    placeholder="120000"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const v = (e.target as HTMLInputElement).value;
                      bulkSet('cost_price', v);
                      (e.target as HTMLInputElement).value = '';
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Set kho:</span>
                  <input
                    className="w-24 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    placeholder="0"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const v = (e.target as HTMLInputElement).value;
                      bulkSet('stock', v);
                      (e.target as HTMLInputElement).value = '';
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Set trạng thái:</span>
                  <select
                    className="w-36 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    defaultValue=""
                    onChange={(e) => {
                      const v = e.target.value as VariantRow['status'] | '';
                      if (!v) return;
                      bulkSetStatus(v);
                      e.target.value = '';
                    }}
                  >
                    <option value="">—</option>
                    <option value="active">Đang bán</option>
                    <option value="inactive">Ẩn</option>
                  </select>
                </div>
              </div>
            </div>

            {variantImageAttrName && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ảnh theo biến thể (theo {variantImageAttrName})</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Gán 1 ảnh cho tất cả biến thể có cùng giá trị thuộc tính.</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {uniq(draft.attributes.find((a) => a.name.trim() === variantImageAttrName)?.values || []).map((val) => (
                    <label key={val} className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{val}</div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => assignImageByAttributeValue(val, e.target.files?.[0] ?? null)}
                        className="text-xs"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bảng quản lý biến thể</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Tổng biến thể: {draft.variants.length}</div>
                </div>

                <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <input
                    type="checkbox"
                    checked={draft.manage_stock_by_variant}
                    onChange={(e) => setField('manage_stock_by_variant', e.target.checked)}
                    className="h-4 w-4"
                  />
                  Quản lý tồn kho theo biến thể
                </label>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="max-h-[420px] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-300 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={allVariantSelected}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedVariantIds(draft.variants.map((v) => v.id));
                              else setSelectedVariantIds([]);
                            }}
                          />
                        </th>
                        <th className="px-3 py-2 text-left">Ảnh</th>
                        <th className="px-3 py-2 text-left">SKU *</th>
                        <th className="px-3 py-2 text-left">Thuộc tính</th>
                        <th className="px-3 py-2 text-left">Giá *</th>
                        <th className="px-3 py-2 text-left">Giá vốn</th>
                        <th className="px-3 py-2 text-left">Kho{draft.manage_stock_by_variant ? ' *' : ''}</th>
                        <th className="px-3 py-2 text-left">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {draft.variants.map((v) => (
                        <tr key={v.id} className="text-gray-800 dark:text-gray-100">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedVariantIds.includes(v.id)}
                              onChange={(e) => {
                                setSelectedVariantIds((prev) =>
                                  e.target.checked ? uniq([...prev, v.id]) : prev.filter((x) => x !== v.id)
                                );
                              }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                setDraft((prev) => ({
                                  ...prev,
                                  variants: prev.variants.map((x) => (x.id === v.id ? { ...x, image: file } : x)),
                                }));
                              }}
                              className="text-xs"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={v.sku}
                              onChange={(e) => {
                                const value = e.target.value;
                                setDraft((prev) => ({
                                  ...prev,
                                  variants: prev.variants.map((x) => (x.id === v.id ? { ...x, sku: value } : x)),
                                }));
                              }}
                              className="w-56 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <div className="min-w-[220px] space-y-0.5 text-xs text-gray-700 dark:text-gray-200">
                              {draft.attributes
                                .map((a) => a.name.trim())
                                .filter(Boolean)
                                .slice(0, 3)
                                .map((name) => (
                                  <div key={name}>
                                    <span className="font-semibold">{name}:</span> {v.attributes?.[name] || '—'}
                                  </div>
                                ))}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={v.price}
                              onChange={(e) => {
                                const value = e.target.value;
                                setDraft((prev) => ({
                                  ...prev,
                                  variants: prev.variants.map((x) => (x.id === v.id ? { ...x, price: value } : x)),
                                }));
                              }}
                              inputMode="numeric"
                              className="w-32 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={v.cost_price}
                              onChange={(e) => {
                                const value = e.target.value;
                                setDraft((prev) => ({
                                  ...prev,
                                  variants: prev.variants.map((x) => (x.id === v.id ? { ...x, cost_price: value } : x)),
                                }));
                              }}
                              inputMode="numeric"
                              className="w-32 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={v.stock}
                              disabled={!draft.manage_stock_by_variant}
                              onChange={(e) => {
                                const value = e.target.value;
                                setDraft((prev) => ({
                                  ...prev,
                                  variants: prev.variants.map((x) => (x.id === v.id ? { ...x, stock: value } : x)),
                                }));
                              }}
                              inputMode="numeric"
                              className="w-24 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 disabled:opacity-60"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={v.status}
                              onChange={(e) => {
                                const value = e.target.value as VariantRow['status'];
                                setDraft((prev) => ({
                                  ...prev,
                                  variants: prev.variants.map((x) => (x.id === v.id ? { ...x, status: value } : x)),
                                }));
                              }}
                              className="w-32 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
                            >
                              <option value="active">Đang bán</option>
                              <option value="inactive">Ẩn</option>
                            </select>
                          </td>
                        </tr>
                      ))}

                      {draft.variants.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                            Chưa có biến thể.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-300">
                Kho tổng: <span className="font-semibold">{totalVariantStock}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTabSeo = () => {
    const previewTitle = draft.meta_title || draft.name || 'Tiêu đề SEO';
    const previewDesc = draft.meta_description || 'Mô tả SEO sẽ hiển thị ở đây...';
    const previewSlug = draft.seo_slug || draft.slug || 'san-pham';

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">SEO</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Meta title, meta description, SEO slug</div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Meta title</label>
                <input
                  value={draft.meta_title}
                  onChange={(e) => setField('meta_title', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Meta description</label>
                <textarea
                  value={draft.meta_description}
                  onChange={(e) => setField('meta_description', e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">SEO slug</label>
                <input
                  value={draft.seo_slug}
                  onChange={(e) => {
                    const next = slugify(e.target.value);
                    if (next) {
                      slugAutoRef.current.seoLocked = true;
                    } else {
                      slugAutoRef.current.seoLocked = false;
                    }
                    setField('seo_slug', next);
                  }}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
                />
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="text-xs text-gray-500">Google snippet preview</div>
                <div className="mt-2">
                  <div className="text-blue-700 dark:text-blue-300 text-lg font-semibold line-clamp-2">{previewTitle}</div>
                  <div className="text-green-700 dark:text-green-300 text-sm">https://locsang.shop/{previewSlug}</div>
                  <div className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">{previewDesc}</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Vận chuyển</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Khối lượng và kích thước (dùng cho vận chuyển)</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Khối lượng (gram)</label>
                  <input value={draft.weight_gram} onChange={(e) => setField('weight_gram', e.target.value)} inputMode="numeric" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Dài (cm)</label>
                  <input value={draft.length_cm} onChange={(e) => setField('length_cm', e.target.value)} inputMode="numeric" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Rộng (cm)</label>
                  <input value={draft.width_cm} onChange={(e) => setField('width_cm', e.target.value)} inputMode="numeric" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Cao (cm)</label>
                  <input value={draft.height_cm} onChange={(e) => setField('height_cm', e.target.value)} inputMode="numeric" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nâng cao</div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <input
                  type="checkbox"
                  checked={draft.allow_backorder}
                  onChange={(e) => setField('allow_backorder', e.target.checked)}
                  className="h-4 w-4"
                />
                Cho phép bán khi hết hàng
              </label>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Ngưỡng cảnh báo tồn kho thấp</label>
                <input
                  value={draft.low_stock_threshold}
                  onChange={(e) => setField('low_stock_threshold', e.target.value)}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
                  placeholder="VD: 5"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) => setField('featured', e.target.checked)}
                  className="h-4 w-4"
                />
                Hiển thị sản phẩm nổi bật
              </label>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Thứ tự hiển thị</label>
                <input
                  value={draft.display_order}
                  onChange={(e) => setField('display_order', e.target.value)}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2"
                  placeholder="VD: 1"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="text-xs text-gray-500 dark:text-gray-400">Autosave</div>
              <div className="text-sm text-gray-700 dark:text-gray-200">Tự lưu nháp mỗi 10 giây (local).</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <LoadingOverlay isLoading={loading || isSubmitting} text={loading ? 'Đang tải sản phẩm...' : isSubmitting ? 'Đang lưu sản phẩm...' : ''} />

      {confirmEditAttributes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">Chỉnh sửa thuộc tính?</div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Thay đổi thuộc tính sẽ xoá toàn bộ biến thể hiện tại. Bạn có chắc muốn tiếp tục?
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmEditAttributes(false)}
                className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmEditAttributes(false);
                  setDraft((prev) => ({ ...prev, variants: [] }));
                  setSelectedVariantIds([]);
                  setAttributesLocked(false);
                }}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mx-auto max-w-7xl px-4 py-6"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="text-sm text-gray-500 dark:text-gray-400">Lộc Sang Admin</div>
            <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{readOnly ? 'Chi tiết sản phẩm' : id ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm'}</h2>
            {!readOnly && dirty && <div className="mt-1 text-xs text-rose-600">Có thay đổi chưa lưu</div>}
          </div>
          <img src={logo_url} alt="Lộc Sang" className="h-10 w-10 rounded-full ring-1 ring-gray-200 dark:ring-gray-800" />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                'rounded-xl px-4 py-2 text-sm font-semibold border transition ' +
                (tab === t.key
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800')
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={readOnly ? 'pointer-events-none' : ''}>
          {tab === 'basic' && renderTabBasic()}
          {tab === 'variants' && renderTabVariants()}
          {tab === 'seo' && renderTabSeo()}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={() => {
              if (!readOnly && dirty && !window.confirm('Bạn có thay đổi chưa lưu. Rời trang?')) return;
              onCancel?.();
            }}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {readOnly ? 'Quay lại' : 'Huỷ'}
          </button>
          {!readOnly && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onSubmit}
              className="inline-flex items-center justify-center rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white px-5 py-2 font-semibold"
            >
              Lưu sản phẩm
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default ProductForm;
