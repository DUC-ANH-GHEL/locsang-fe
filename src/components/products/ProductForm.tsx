import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Image as ImageIcon,
  Package,
  Plus,
  Save,
  Settings2,
  Trash2,
} from 'lucide-react';

import ImageUploader from './ImageUploader';
import { useToast } from '../Toast';
import { createCategory as createCategoryApi, getCategories as getCategoriesApi } from '../../services/categoryService';
import {
  AdminProductPayload,
  AdminProductStatus,
  createAdminProduct,
  getProductById,
  updateAdminProduct,
  uploadAdminProductImage,
} from '../../services/productService';

type ProductFormProps = {
  id: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  readOnly?: boolean;
};

type CategoryOption = {
  id: number;
  name: string;
};

type ProductImageDraft = File | string;

type SpecificationDraft = {
  localId: string;
  label: string;
  value: string;
};

type VariantDraft = {
  localId: string;
  id?: number;
  name: string;
  sku: string;
  price: string;
  salePrice: string;
  stock: string;
  allowBackorder: boolean;
  status: 'active' | 'inactive';
  imageUrl: string;
};

type ProductDraft = {
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  status: AdminProductStatus;
  featured: boolean;
  brand: string;
  shortDescription: string;
  description: string;
  price: string;
  salePrice: string;
  stock: string;
  allowBackorder: boolean;
  hasVariants: boolean;
  variants: VariantDraft[];
  specifications: SpecificationDraft[];
};

type FormErrors = Record<string, string>;

const makeId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyDraft: ProductDraft = {
  name: '',
  slug: '',
  sku: '',
  categoryId: '',
  status: 'draft',
  featured: false,
  brand: 'Yanmar',
  shortDescription: '',
  description: '',
  price: '',
  salePrice: '',
  stock: '0',
  allowBackorder: false,
  hasVariants: false,
  variants: [],
  specifications: [
    { localId: makeId(), label: 'Xuất xứ', value: '' },
    { localId: makeId(), label: 'Dùng cho', value: '' },
  ],
};

const statusOptions: Array<{ value: AdminProductStatus; label: string; hint: string }> = [
  { value: 'active', label: 'Đang bán', hint: 'Hiển thị trên storefront và có thể đặt hàng' },
  { value: 'draft', label: 'Nháp', hint: 'Lưu nội bộ, chưa bán' },
  { value: 'discontinued', label: 'Ngừng bán', hint: 'Giữ dữ liệu nhưng không bán' },
];

const currencyFormatter = new Intl.NumberFormat('vi-VN');

const newSpec = (): SpecificationDraft => ({ localId: makeId(), label: '', value: '' });

const newVariant = (skuPrefix = ''): VariantDraft => ({
  localId: makeId(),
  name: '',
  sku: skuPrefix ? `${skuPrefix}-` : '',
  price: '',
  salePrice: '',
  stock: '0',
  allowBackorder: false,
  status: 'active',
  imageUrl: '',
});

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

const toNumber = (value: string, fallback = 0) => {
  const cleaned = String(value || '').replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalNumber = (value: string) => {
  const cleaned = String(value || '').trim();
  if (!cleaned) return null;
  return toNumber(cleaned);
};

const getErrorMessage = (error: any) => {
  const data = error?.response?.data;
  const detail = data?.detail;
  const message = data?.message || detail?.message || detail || error?.message;
  const text = typeof message === 'string' ? message : 'Không lưu được sản phẩm. Vui lòng kiểm tra lại dữ liệu.';

  if (data?.error_code === 'SLUG_DUPLICATE' || text.toLowerCase().includes('slug')) {
    return 'Slug đã tồn tại. Vui lòng đổi slug hoặc đổi tên sản phẩm.';
  }
  if (data?.error_code === 'SKU_DUPLICATE' || text.toLowerCase().includes('sku')) {
    return 'SKU đã tồn tại. Vui lòng dùng mã phụ tùng khác.';
  }
  return text;
};

const normalizeProduct = (raw: any) => raw?.data ?? raw;

const normalizeCategoryOption = (item: any): CategoryOption | null => {
  const id = Number(item?.id || 0);
  const name = String(item?.name || '').trim();
  return id > 0 && name ? { id, name } : null;
};

const extractImageUrls = (product: any): string[] => {
  const urls: string[] = [];
  const push = (value: any) => {
    const url = typeof value === 'string' ? value : value?.url || value?.image_url;
    const normalized = String(url || '').trim();
    if (normalized && !urls.includes(normalized)) urls.push(normalized);
  };

  if (Array.isArray(product?.media)) product.media.forEach(push);
  if (Array.isArray(product?.images)) product.images.forEach(push);
  push(product?.thumbnail);
  return urls;
};

const normalizeSpecs = (product: any): SpecificationDraft[] => {
  const raw = Array.isArray(product?.specifications)
    ? product.specifications
    : Array.isArray(product?.specs)
      ? product.specs
      : [];

  const specs = raw
    .map((item: any) => ({
      localId: makeId(),
      label: String(item?.label || item?.key || item?.name || '').trim(),
      value: String(item?.value || '').trim(),
    }))
    .filter((item: SpecificationDraft) => item.label || item.value);

  return specs.length > 0 ? specs : emptyDraft.specifications.map((item) => ({ ...item, localId: makeId() }));
};

const normalizeVariant = (variant: any, index: number): VariantDraft => {
  const attrs = variant?.attribute_values || variant?.attributeValues || {};
  const attrName = Object.values(attrs).filter(Boolean).join(' / ');
  return {
    localId: makeId(),
    id: Number.isFinite(Number(variant?.id)) ? Number(variant.id) : undefined,
    name: String(variant?.variant_name || variant?.variantName || attrName || '').trim(),
    sku: String(variant?.sku || '').trim(),
    price: variant?.price !== undefined && variant?.price !== null ? String(variant.price) : '',
    salePrice:
      variant?.sale_price !== undefined && variant?.sale_price !== null
        ? String(variant.sale_price)
        : variant?.salePrice !== undefined && variant?.salePrice !== null
          ? String(variant.salePrice)
          : '',
    stock: variant?.stock !== undefined && variant?.stock !== null ? String(variant.stock) : '0',
    allowBackorder: Boolean(variant?.allow_backorder ?? variant?.allowBackorder ?? false),
    status: variant?.status === 'inactive' || variant?.is_active === false ? 'inactive' : 'active',
    imageUrl: String(variant?.image_url || variant?.imageUrl || '').trim(),
  };
};

const FieldError = ({ message }: { message?: string }) =>
  message ? <div className="mt-1 text-sm font-semibold text-red-600">{message}</div> : null;

const sectionClass =
  'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none sm:p-5';

const labelClass = 'mb-1 block text-sm font-bold text-slate-900 dark:text-slate-100';
const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-rose-500 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-rose-500/15';

const PRODUCT_DRAFT_DB_NAME = 'locsang-admin-product-drafts';
const PRODUCT_DRAFT_STORE_NAME = 'productDrafts';
const PRODUCT_CREATE_DRAFT_KEY = 'create-product';

type SavedProductDraftImage =
  | { kind: 'url'; url: string }
  | { kind: 'file'; file: File };

type SavedProductDraftPayload = {
  draft: ProductDraft;
  images: SavedProductDraftImage[];
  savedAt: string;
};

const openProductDraftDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = window.indexedDB.open(PRODUCT_DRAFT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PRODUCT_DRAFT_STORE_NAME)) {
        db.createObjectStore(PRODUCT_DRAFT_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Cannot open product draft database'));
  });

const readProductDraft = async (key: string): Promise<SavedProductDraftPayload | null> => {
  const db = await openProductDraftDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRODUCT_DRAFT_STORE_NAME, 'readonly');
    const request = tx.objectStore(PRODUCT_DRAFT_STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as SavedProductDraftPayload | undefined) || null);
    request.onerror = () => reject(request.error || new Error('Cannot read product draft'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Cannot read product draft'));
    };
  });
};

const writeProductDraft = async (key: string, payload: SavedProductDraftPayload) => {
  const db = await openProductDraftDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PRODUCT_DRAFT_STORE_NAME, 'readwrite');
    tx.objectStore(PRODUCT_DRAFT_STORE_NAME).put(payload, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Cannot write product draft'));
    };
  });
};

const deleteProductDraft = async (key: string) => {
  const db = await openProductDraftDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PRODUCT_DRAFT_STORE_NAME, 'readwrite');
    tx.objectStore(PRODUCT_DRAFT_STORE_NAME).delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Cannot delete product draft'));
    };
  });
};

const hasDraftContent = (draft: ProductDraft, images: ProductImageDraft[]) =>
  Boolean(
    draft.name.trim() ||
      draft.slug.trim() ||
      draft.sku.trim() ||
      draft.categoryId ||
      draft.shortDescription.trim() ||
      draft.description.trim() ||
      draft.price.trim() ||
      draft.salePrice.trim() ||
      images.length > 0 ||
      draft.specifications.some((item) => item.label.trim() || item.value.trim()) ||
      draft.variants.length > 0,
  );

const serializeDraftImages = (images: ProductImageDraft[]): SavedProductDraftImage[] =>
  images.map((item) => (typeof item === 'string' ? { kind: 'url', url: item } : { kind: 'file', file: item }));

const deserializeDraftImages = (images: SavedProductDraftImage[] | undefined): ProductImageDraft[] =>
  (images || [])
    .map((item) => (item.kind === 'url' ? item.url : item.file instanceof File ? item.file : null))
    .filter((item): item is ProductImageDraft => Boolean(item));

const ProductForm = ({ id, onSuccess, onCancel, readOnly = false }: ProductFormProps) => {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<ProductDraft>(() => ({ ...emptyDraft, specifications: emptyDraft.specifications.map((item) => ({ ...item, localId: makeId() })) }));
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imageItems, setImageItems] = useState<ProductImageDraft[]>([]);
  const [existingVariantIds, setExistingVariantIds] = useState<number[]>([]);
  const [existingAttributeIds, setExistingAttributeIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(Boolean(id));
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [quickCategoryOpen, setQuickCategoryOpen] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [quickCategorySaving, setQuickCategorySaving] = useState(false);
  const [quickCategoryError, setQuickCategoryError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const quickCategoryInputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef<ProductDraft>(draft);
  const imageItemsRef = useRef<ProductImageDraft[]>(imageItems);
  const autosaveWarnedRef = useRef(false);

  const disabled = readOnly || saving;
  const initialImages = useMemo(() => imageItems, [imageItems]);

  const completion = useMemo(() => {
    const checks = [
      Boolean(draft.name.trim()),
      Boolean(draft.sku.trim()),
      Boolean(draft.categoryId),
      Boolean(imageItems.length),
      toNumber(draft.price) > 0,
      Number.isInteger(toNumber(draft.stock)) && toNumber(draft.stock) >= 0,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [draft.categoryId, draft.name, draft.price, draft.sku, draft.stock, imageItems.length]);

  const loadCategories = useCallback(async () => {
    const response = await getCategoriesApi();
    const list = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
    setCategories(
      list
        .map(normalizeCategoryOption)
        .filter((item: CategoryOption | null): item is CategoryOption => Boolean(item)),
    );
  }, []);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    imageItemsRef.current = imageItems;
  }, [imageItems]);

  useEffect(() => {
    if (id || readOnly) {
      setDraftHydrated(true);
      return;
    }

    let cancelled = false;
    const hydrateDraft = async () => {
      try {
        const saved = await readProductDraft(PRODUCT_CREATE_DRAFT_KEY);
        if (cancelled) return;
        if (saved?.draft) {
          const restoredImages = deserializeDraftImages(saved.images);
          setDraft({
            ...emptyDraft,
            ...saved.draft,
            specifications:
              Array.isArray(saved.draft.specifications) && saved.draft.specifications.length > 0
                ? saved.draft.specifications
                : emptyDraft.specifications.map((item) => ({ ...item, localId: makeId() })),
            variants: Array.isArray(saved.draft.variants) ? saved.draft.variants : [],
          });
          setImageItems(restoredImages);
          setImageFiles(restoredImages.filter((item): item is File => item instanceof File));
          setExistingImages(restoredImages.filter((item): item is string => typeof item === 'string'));
          setSlugTouched(Boolean(saved.draft.slug));
          setDraftSavedAt(saved.savedAt || null);
          if (hasDraftContent(saved.draft, restoredImages)) {
            showToast('Đã khôi phục nháp sản phẩm đang nhập dở.', 'info');
          }
        }
      } catch (error) {
        console.warn('Cannot restore product draft', error);
      } finally {
        if (!cancelled) setDraftHydrated(true);
      }
    };

    hydrateDraft();
    return () => {
      cancelled = true;
    };
  }, [id, readOnly, showToast]);

  useEffect(() => {
    if (id || readOnly || !draftHydrated) return;

    const saveDraft = async () => {
      const currentDraft = draftRef.current;
      const currentImages = imageItemsRef.current;
      if (!hasDraftContent(currentDraft, currentImages)) return;

      try {
        const savedAt = new Date().toISOString();
        await writeProductDraft(PRODUCT_CREATE_DRAFT_KEY, {
          draft: currentDraft,
          images: serializeDraftImages(currentImages),
          savedAt,
        });
        setDraftSavedAt(savedAt);
        autosaveWarnedRef.current = false;
      } catch (error) {
        if (!autosaveWarnedRef.current) {
          autosaveWarnedRef.current = true;
          console.warn('Cannot autosave product draft', error);
          showToast('Không tự lưu được nháp sản phẩm trên trình duyệt này.', 'warning', 5000);
        }
      }
    };

    const timer = window.setInterval(saveDraft, 10000);
    return () => window.clearInterval(timer);
  }, [id, readOnly, draftHydrated, showToast]);

  const openQuickCategory = () => {
    setQuickCategoryOpen(true);
    setQuickCategoryError('');
    window.setTimeout(() => quickCategoryInputRef.current?.focus(), 50);
  };

  const createQuickCategory = async () => {
    const name = quickCategoryName.trim();
    if (!name) {
      setQuickCategoryError('Nhập tên danh mục trước khi lưu.');
      quickCategoryInputRef.current?.focus();
      return;
    }
    if (name.length > 100) {
      setQuickCategoryError('Tên danh mục tối đa 100 ký tự.');
      quickCategoryInputRef.current?.focus();
      return;
    }

    try {
      setQuickCategorySaving(true);
      setQuickCategoryError('');
      const response = await createCategoryApi({ name, is_active: true });
      const created = normalizeCategoryOption(response?.data ?? response);
      if (!created) throw new Error('Không nhận được danh mục mới từ hệ thống.');

      setCategories((prev) => {
        const exists = prev.some((item) => item.id === created.id);
        return exists ? prev : [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      });
      setField('categoryId', String(created.id));
      setQuickCategoryName('');
      setQuickCategoryOpen(false);
      showToast('Đã thêm và chọn danh mục mới.', 'success');
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const message =
        typeof detail === 'string' && detail.toLowerCase().includes('already')
          ? 'Danh mục này đã tồn tại. Vui lòng chọn trong danh sách.'
          : detail || error?.message || 'Không tạo được danh mục mới.';
      setQuickCategoryError(String(message));
      showToast(String(message), 'error');
      quickCategoryInputRef.current?.focus();
    } finally {
      setQuickCategorySaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(Boolean(id));
        await loadCategories();
        if (!id) return;

        const raw = await getProductById(id);
        if (cancelled) return;
        const product = normalizeProduct(raw);
        const variants = Array.isArray(product?.variants) ? product.variants.map(normalizeVariant) : [];
        const firstVariant = variants[0];
        const hasVariants = Boolean(product?.has_variants && variants.length > 1);

        setDraft({
          name: String(product?.name || '').trim(),
          slug: String(product?.slug || '').trim(),
          sku: String(firstVariant?.sku || product?.sku || '').trim(),
          categoryId: product?.category_id ? String(product.category_id) : '',
          status: (product?.status || (product?.is_active ? 'active' : 'draft')) as AdminProductStatus,
          featured: Boolean(product?.featured),
          brand: String(product?.brand || 'Yanmar').trim(),
          shortDescription: String(product?.short_description || product?.shortDescription || '').trim(),
          description: String(product?.description || '').trim(),
          price:
            firstVariant?.price ||
            (product?.price !== undefined && product?.price !== null ? String(product.price) : ''),
          salePrice:
            firstVariant?.salePrice ||
            (product?.sale_price !== undefined && product?.sale_price !== null
              ? String(product.sale_price)
              : product?.salePrice !== undefined && product?.salePrice !== null
                ? String(product.salePrice)
                : ''),
          stock:
            firstVariant?.stock ||
            (product?.stock !== undefined && product?.stock !== null ? String(product.stock) : '0'),
          allowBackorder: Boolean(firstVariant?.allowBackorder ?? product?.allow_backorder ?? product?.allowBackorder ?? false),
          hasVariants,
          variants: hasVariants ? variants : [],
          specifications: normalizeSpecs(product),
        });

        const productImages = extractImageUrls(product);
        setExistingImages(productImages);
        setImageFiles([]);
        setImageItems(productImages);
        setExistingVariantIds(variants.map((variant) => variant.id).filter((value): value is number => Number.isFinite(Number(value))));
        setExistingAttributeIds(
          (Array.isArray(product?.attributes) ? product.attributes : [])
            .map((item: any) => Number(item?.id))
            .filter((value: number) => Number.isFinite(value)),
        );
        setSlugTouched(true);
      } catch (error: any) {
        showToast(getErrorMessage(error), 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, loadCategories, showToast]);

  const setField = <K extends keyof ProductDraft>(field: K, value: ProductDraft[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field as string]) return prev;
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  };

  const onNameChange = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      name: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.name;
      delete next.slug;
      return next;
    });
  };

  const onImagesUpdate = useCallback((files: File[], existing: string[], orderedImages?: ProductImageDraft[]) => {
    setImageFiles(files);
    setExistingImages(existing);
    setImageItems(orderedImages || [...existing, ...files]);
    setErrors((prev) => {
      if (!prev.images) return prev;
      const next = { ...prev };
      delete next.images;
      return next;
    });
  }, []);

  const updateSpec = (localId: string, patch: Partial<SpecificationDraft>) => {
    setDraft((prev) => ({
      ...prev,
      specifications: prev.specifications.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    }));
  };

  const updateVariant = (localId: string, patch: Partial<VariantDraft>) => {
    setDraft((prev) => ({
      ...prev,
      variants: prev.variants.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    }));
  };

  const validate = () => {
    const next: FormErrors = {};
    const name = draft.name.trim();
    const slug = draft.slug.trim();
    const sku = draft.sku.trim();
    const price = toNumber(draft.price);
    const salePrice = toOptionalNumber(draft.salePrice);
    const stock = toNumber(draft.stock);
    const totalImages = imageItems.length;

    if (!name) next.name = 'Tên sản phẩm là bắt buộc.';
    if (name.length > 180) next.name = 'Tên sản phẩm tối đa 180 ký tự.';
    if (!slug) next.slug = 'Slug là bắt buộc.';
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) next.slug = 'Slug chỉ dùng chữ thường, số và dấu gạch ngang.';
    if (!draft.categoryId) next.categoryId = 'Cần chọn danh mục.';
    if (!totalImages) next.images = 'Cần ít nhất 1 ảnh sản phẩm.';
    if (!sku) next.sku = 'SKU hoặc mã phụ tùng là bắt buộc.';
    if (sku.length > 80) next.sku = 'SKU tối đa 80 ký tự.';
    if (!Number.isFinite(price) || price <= 0) next.price = 'Giá bán phải lớn hơn 0.';
    if (salePrice !== null && (salePrice <= 0 || salePrice > price)) next.salePrice = 'Giá sale phải lớn hơn 0 và không vượt giá bán.';
    if (!Number.isInteger(stock) || stock < 0) next.stock = 'Tồn kho phải là số nguyên không âm.';

    draft.specifications.forEach((spec, index) => {
      const hasLabel = Boolean(spec.label.trim());
      const hasValue = Boolean(spec.value.trim());
      if (hasLabel !== hasValue) next[`spec-${spec.localId}`] = `Thông số #${index + 1} cần đủ tên và giá trị.`;
    });

    if (draft.hasVariants) {
      if (draft.variants.length === 0) next.variants = 'Cần thêm ít nhất một biến thể hoặc tắt chế độ biến thể.';
      const seen = new Set<string>();
      draft.variants.forEach((variant, index) => {
        const prefix = `variant-${variant.localId}`;
        const variantSku = variant.sku.trim();
        const variantPrice = toNumber(variant.price);
        const variantSalePrice = toOptionalNumber(variant.salePrice);
        const variantStock = toNumber(variant.stock);
        if (!variantSku) next[`${prefix}-sku`] = `Biến thể #${index + 1} thiếu SKU.`;
        const skuKey = variantSku.toLowerCase();
        if (skuKey && seen.has(skuKey)) next[`${prefix}-sku`] = `SKU biến thể bị trùng: ${variantSku}.`;
        seen.add(skuKey);
        if (!Number.isFinite(variantPrice) || variantPrice <= 0) next[`${prefix}-price`] = 'Giá biến thể phải lớn hơn 0.';
        if (variantSalePrice !== null && (variantSalePrice <= 0 || variantSalePrice > variantPrice)) next[`${prefix}-sale`] = 'Giá sale phải lớn hơn 0 và không vượt giá bán.';
        if (!Number.isInteger(variantStock) || variantStock < 0) next[`${prefix}-stock`] = 'Tồn kho phải là số nguyên không âm.';
      });
    }

    setErrors(next);
    return next;
  };

  const getFirstErrorKey = (validation: FormErrors) => {
    const baseOrder = ['name', 'slug', 'sku', 'categoryId', 'images', 'price', 'salePrice', 'stock'];
    const specOrder = draft.specifications.map((spec) => `spec-${spec.localId}`);
    const variantOrder = draft.variants.flatMap((variant) => {
      const prefix = `variant-${variant.localId}`;
      return [`${prefix}-sku`, `${prefix}-price`, `${prefix}-sale`, `${prefix}-stock`];
    });
    const order = [...baseOrder, ...specOrder, 'variants', ...variantOrder];
    return order.find((key) => validation[key]) || Object.keys(validation)[0] || null;
  };

  const focusErrorField = (errorKey: string | null) => {
    if (!errorKey || !formRef.current) return;
    const targets = Array.from(formRef.current.querySelectorAll<HTMLElement>('[data-error-key]'));
    const target = targets.find((element) => element.dataset.errorKey === errorKey);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      target.focus({ preventScroll: true });
    }, 180);
  };

  const uploadNewImages = async () => {
    const uploaded: string[] = [];
    for (const file of imageFiles) {
      const result = await uploadAdminProductImage(file);
      if (!result.url) throw new Error('Upload ảnh thất bại, không nhận được URL.');
      uploaded.push(result.url);
    }
    return [...existingImages, ...uploaded];
  };

  const uploadOrderedImages = async () => {
    const uploadedByFile = new Map<File, string>();
    const orderedUrls: string[] = [];

    for (const item of imageItems) {
      if (typeof item === 'string') {
        orderedUrls.push(item);
        continue;
      }

      const existingUpload = uploadedByFile.get(item);
      if (existingUpload) {
        orderedUrls.push(existingUpload);
        continue;
      }

      const result = await uploadAdminProductImage(item);
      if (!result.url) throw new Error('Upload ảnh thất bại, không nhận được URL.');
      uploadedByFile.set(item, result.url);
      orderedUrls.push(result.url);
    }

    return orderedUrls;
  };

  const buildPayload = async (): Promise<AdminProductPayload> => {
    const imageUrls = await uploadOrderedImages();
    const baseSku = draft.sku.trim();
    const baseStatus = draft.status === 'active' ? 'active' : 'inactive';
    const specs = draft.specifications
      .map((item) => ({ label: item.label.trim(), value: item.value.trim() }))
      .filter((item) => item.label && item.value);

    const variants = draft.hasVariants
      ? draft.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku.trim(),
          price: toNumber(variant.price),
          sale_price: toOptionalNumber(variant.salePrice),
          compare_price: null,
          cost_price: null,
          stock: toNumber(variant.stock),
          manage_stock: true,
          allow_backorder: variant.allowBackorder,
          status: variant.status,
          image_url: variant.imageUrl.trim() || null,
          attribute_values: variant.name.trim() ? { 'Quy cách': variant.name.trim() } : {},
        }))
      : [
          {
            id: existingVariantIds[0],
            sku: baseSku,
            price: toNumber(draft.price),
            sale_price: toOptionalNumber(draft.salePrice),
            compare_price: null,
            cost_price: null,
            stock: toNumber(draft.stock),
            manage_stock: true,
            allow_backorder: draft.allowBackorder,
            status: baseStatus,
            attribute_values: {},
            image_url: null,
          },
        ];

    const variantNames = Array.from(
      new Set(
        draft.variants
          .map((variant) => variant.name.trim())
          .filter(Boolean),
      ),
    );

    const activeVariantIds = variants.map((variant) => Number(variant.id)).filter((value) => Number.isFinite(value));
    const deletedVariantIds = id ? existingVariantIds.filter((variantId) => !activeVariantIds.includes(variantId)) : [];

    return {
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      short_description: draft.shortDescription.trim() || null,
      description: draft.description.trim() || null,
      status: draft.status,
      featured: draft.featured,
      category_id: Number(draft.categoryId),
      brand: draft.brand.trim() || 'Yanmar',
      tags: [],
      specifications: specs,
      has_variants: draft.hasVariants,
      media: imageUrls.map((url, index) => ({ url, type: 'image', sort_order: index + 1 })),
      attributes: draft.hasVariants && variantNames.length > 0 ? [{ name: 'Quy cách', values: variantNames }] : [],
      variants,
      deleted_variant_ids: deletedVariantIds,
      deleted_attribute_ids: id ? existingAttributeIds : [],
    };
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly) return;

    const validation = validate();
    if (Object.keys(validation).length > 0) {
      focusErrorField(getFirstErrorKey(validation));
      showToast('Vui lòng xử lý các lỗi trong form trước khi lưu.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const payload = await buildPayload();
      if (id) {
        await updateAdminProduct(id, payload);
      } else {
        await createAdminProduct(payload);
        await deleteProductDraft(PRODUCT_CREATE_DRAFT_KEY).catch(() => undefined);
        setDraftSavedAt(null);
      }
      showToast(id ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm.', 'success');
      onSuccess?.();
    } catch (error: any) {
      const message = getErrorMessage(error);
      let serverErrorKey: string | null = null;
      if (message.toLowerCase().includes('slug')) {
        serverErrorKey = 'slug';
        setErrors((prev) => ({ ...prev, slug: message }));
      }
      if (message.toLowerCase().includes('sku')) {
        serverErrorKey = serverErrorKey || 'sku';
        setErrors((prev) => ({ ...prev, sku: message }));
      }
      if (serverErrorKey) {
        focusErrorField(serverErrorKey);
      }
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        Đang tải dữ liệu sản phẩm...
      </div>
    );
  }

  const errorList = Object.values(errors);
  const draftSavedTimeLabel = draftSavedAt
    ? new Date(draftSavedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4 pb-24">
      <div className="rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50 to-white p-4 dark:border-rose-500/20 dark:from-rose-500/10 dark:to-slate-950 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-300">
              <Package size={18} />
              Sản phẩm Lộc Sang
            </div>
            <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
              {id ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm mới'}
            </h2>
            <p className="mt-1 max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-300">
              Nhập đúng mã phụ tùng, giá, kho và thông số kỹ thuật để dữ liệu hiển thị ngay trên storefront.
            </p>
          </div>
          <div className="rounded-2xl border border-white bg-white/80 p-3 text-sm font-bold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            Hoàn tất {completion}%
            <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full rounded-full bg-rose-600" style={{ width: `${completion}%` }} />
            </div>
            {!id && (
              <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {draftSavedTimeLabel ? `Đã tự lưu nháp lúc ${draftSavedTimeLabel}` : 'Tự lưu nháp mỗi 10 giây'}
              </div>
            )}
          </div>
        </div>
      </div>

      {errorList.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          <div className="flex items-center gap-2 font-black">
            <AlertCircle size={18} />
            Cần kiểm tra lại {errorList.length} mục
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold">
            {errorList.slice(0, 6).map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2">
          <BadgeCheck size={20} className="text-rose-600" />
          <h3 className="text-lg font-black text-slate-950 dark:text-white">Thông tin bắt buộc</h3>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className={labelClass}>Tên sản phẩm *</label>
            <input
              data-error-key="name"
              className={inputClass}
              value={draft.name}
              disabled={disabled}
              placeholder="VD: Lọc nhớt Yanmar 119305-35153"
              onChange={(event) => onNameChange(event.target.value)}
            />
            <FieldError message={errors.name} />
          </div>
          <div>
            <label className={labelClass}>Slug *</label>
            <input
              data-error-key="slug"
              className={inputClass}
              value={draft.slug}
              disabled={disabled}
              placeholder="loc-nhot-yanmar-119305-35153"
              onChange={(event) => {
                setSlugTouched(true);
                setField('slug', slugify(event.target.value));
              }}
            />
            <FieldError message={errors.slug} />
          </div>
          <div>
            <label className={labelClass}>SKU hoặc mã phụ tùng *</label>
            <input
              data-error-key="sku"
              className={inputClass}
              value={draft.sku}
              disabled={disabled}
              placeholder="VD: 119305-35153"
              onChange={(event) => setField('sku', event.target.value.toUpperCase().trim())}
            />
            <FieldError message={errors.sku} />
          </div>
          <div>
            <label className={labelClass}>Danh mục *</label>
            <select
              data-error-key="categoryId"
              className={inputClass}
              value={draft.categoryId}
              disabled={disabled}
              onChange={(event) => setField('categoryId', event.target.value)}
            >
              <option value="">Chọn danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.categoryId} />
            {!readOnly && (
              <div className="mt-2">
                {!quickCategoryOpen ? (
                  <button
                    type="button"
                    onClick={openQuickCategory}
                    disabled={disabled}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-rose-300 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                  >
                    <Plus size={14} />
                    Thêm danh mục mới
                  </button>
                ) : (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/25 dark:bg-rose-500/10">
                    <label className="mb-1 block text-xs font-black text-slate-800 dark:text-slate-100">Tên danh mục mới</label>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <input
                        ref={quickCategoryInputRef}
                        className={inputClass}
                        value={quickCategoryName}
                        disabled={disabled || quickCategorySaving}
                        maxLength={100}
                        placeholder="VD: Lọc nhớt"
                        onChange={(event) => {
                          setQuickCategoryName(event.target.value);
                          setQuickCategoryError('');
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            createQuickCategory();
                          }
                          if (event.key === 'Escape') {
                            setQuickCategoryOpen(false);
                            setQuickCategoryError('');
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={createQuickCategory}
                        disabled={disabled || quickCategorySaving}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-600 px-4 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {quickCategorySaving ? 'Đang lưu...' : 'Lưu'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickCategoryOpen(false);
                          setQuickCategoryName('');
                          setQuickCategoryError('');
                        }}
                        disabled={quickCategorySaving}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      >
                        Hủy
                      </button>
                    </div>
                    {quickCategoryError && <div className="mt-2 text-sm font-semibold text-red-600">{quickCategoryError}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Trạng thái bán</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setField('status', option.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    draft.status === option.value
                      ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
                      : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                  }`}
                >
                  <div className="text-sm font-black">{option.label}</div>
                  <div className="mt-1 text-xs font-semibold opacity-75">{option.hint}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Thương hiệu</label>
            <input className={inputClass} value={draft.brand} disabled={disabled} onChange={(event) => setField('brand', event.target.value)} />
            <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={draft.featured}
                disabled={disabled}
                onChange={(event) => setField('featured', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-rose-600"
              />
              Ghim nổi bật trên storefront
            </label>
          </div>
        </div>
      </section>

      <section className={sectionClass} data-error-key="images" tabIndex={-1}>
        <div className="mb-4 flex items-center gap-2">
          <ImageIcon size={20} className="text-rose-600" />
          <h3 className="text-lg font-black text-slate-950 dark:text-white">Ảnh sản phẩm *</h3>
        </div>
        <ImageUploader
          initialImages={initialImages}
          onImagesUpdate={onImagesUpdate}
          label="Ảnh sản phẩm"
          helpText="Ảnh đầu tiên sẽ là ảnh chính trên storefront. Nên dùng nền trắng, thấy rõ sản phẩm."
          requiredPrimary
          disabled={disabled}
          maxImages={9}
        />
        <FieldError message={errors.images} />
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex items-center gap-2">
          <Settings2 size={20} className="text-rose-600" />
          <h3 className="text-lg font-black text-slate-950 dark:text-white">Giá và kho</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className={labelClass}>Giá bán *</label>
            <input data-error-key="price" className={inputClass} value={draft.price} disabled={disabled} inputMode="numeric" placeholder="180000" onChange={(event) => setField('price', event.target.value)} />
            <FieldError message={errors.price} />
          </div>
          <div>
            <label className={labelClass}>Giá sale</label>
            <input data-error-key="salePrice" className={inputClass} value={draft.salePrice} disabled={disabled} inputMode="numeric" placeholder="160000" onChange={(event) => setField('salePrice', event.target.value)} />
            <FieldError message={errors.salePrice} />
          </div>
          <div>
            <label className={labelClass}>Tồn kho *</label>
            <input data-error-key="stock" className={inputClass} value={draft.stock} disabled={disabled} inputMode="numeric" placeholder="20" onChange={(event) => setField('stock', event.target.value)} />
            <FieldError message={errors.stock} />
          </div>
        </div>
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
          <input
            type="checkbox"
            checked={draft.allowBackorder}
            disabled={disabled}
            onChange={(event) => setField('allowBackorder', event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600"
          />
          <span>
            Cho phép bán khi hết hàng
            <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Bật nếu vẫn nhận đơn khi tồn kho bằng 0 hoặc âm.
            </span>
          </span>
        </label>
        <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900 sm:grid-cols-2">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Giá bán</div>
            <div className="text-base font-black text-slate-950 dark:text-white">{currencyFormatter.format(toNumber(draft.price))} đ</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Giá sale</div>
            <div className="text-base font-black text-rose-600">{draft.salePrice ? `${currencyFormatter.format(toNumber(draft.salePrice))} đ` : 'Không có'}</div>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className="mb-4 text-lg font-black text-slate-950 dark:text-white">Nội dung hiển thị</h3>
        <div className="grid gap-4">
          <div>
            <label className={labelClass}>Mô tả ngắn</label>
            <textarea
              className={`${inputClass} min-h-[84px] resize-y`}
              value={draft.shortDescription}
              disabled={disabled}
              maxLength={280}
              placeholder="VD: Dùng cho động cơ Yanmar, hàng chính hãng, bền bỉ."
              onChange={(event) => setField('shortDescription', event.target.value)}
            />
            <div className="mt-1 text-xs font-semibold text-slate-500">{draft.shortDescription.length}/280 ký tự</div>
          </div>
          <div>
            <label className={labelClass}>Mô tả chi tiết</label>
            <textarea
              className={`${inputClass} min-h-[140px] resize-y`}
              value={draft.description}
              disabled={disabled}
              placeholder="Nhập mô tả chi tiết, hướng dẫn sử dụng, lưu ý lắp đặt hoặc bảo quản."
              onChange={(event) => setField('description', event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Thông số kỹ thuật</h3>
            <p className="text-sm font-medium text-slate-500">Các dòng này sẽ hiển thị ở trang chi tiết sản phẩm.</p>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setField('specifications', [...draft.specifications, newSpec()])}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-800 transition hover:border-rose-300 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <Plus size={16} />
              Thêm thông số
            </button>
          )}
        </div>
        <div className="space-y-3">
          {draft.specifications.map((spec) => (
            <div key={spec.localId} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
              <input data-error-key={`spec-${spec.localId}`} className={inputClass} value={spec.label} disabled={disabled} placeholder="Tên thông số, VD: Độ nhớt" onChange={(event) => updateSpec(spec.localId, { label: event.target.value })} />
              <input className={inputClass} value={spec.value} disabled={disabled} placeholder="Giá trị, VD: 10W-30" onChange={(event) => updateSpec(spec.localId, { value: event.target.value })} />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setField('specifications', draft.specifications.filter((item) => item.localId !== spec.localId))}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-red-200 px-3 text-red-600 transition hover:bg-red-50"
                  aria-label="Xóa thông số"
                >
                  <Trash2 size={17} />
                </button>
              )}
              <div className="sm:col-span-3">
                <FieldError message={errors[`spec-${spec.localId}`]} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Biến thể</h3>
            <p className="text-sm font-medium text-slate-500">Chỉ bật khi cùng một sản phẩm có nhiều quy cách, dung tích hoặc mã con.</p>
          </div>
          <label className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-black text-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <input
              type="checkbox"
              checked={draft.hasVariants}
              disabled={disabled}
              onChange={(event) => {
                const checked = event.target.checked;
                setDraft((prev) => ({
                  ...prev,
                  hasVariants: checked,
                  variants: checked && prev.variants.length === 0 ? [newVariant(prev.sku.trim())] : prev.variants,
                }));
              }}
              className="h-4 w-4 rounded border-slate-300 text-rose-600"
            />
            Sản phẩm có biến thể
          </label>
        </div>

        {!draft.hasVariants ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Form đang ở chế độ sản phẩm đơn. Hệ thống vẫn tạo một biến thể mặc định để checkout trừ kho ổn định.
          </div>
        ) : (
          <div className="space-y-3" data-error-key="variants" tabIndex={-1}>
            <FieldError message={errors.variants} />
            {draft.variants.map((variant, index) => {
              const prefix = `variant-${variant.localId}`;
              return (
                <div key={variant.localId} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="font-black text-slate-900 dark:text-white">Biến thể #{index + 1}</div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => setField('variants', draft.variants.filter((item) => item.localId !== variant.localId))}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                        Xóa
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                    <div className="lg:col-span-2">
                      <label className={labelClass}>Quy cách</label>
                      <input className={inputClass} value={variant.name} disabled={disabled} placeholder="VD: 4L hoặc 119305-35153" onChange={(event) => updateVariant(variant.localId, { name: event.target.value })} />
                    </div>
                    <div className="lg:col-span-2">
                      <label className={labelClass}>SKU *</label>
                      <input data-error-key={`${prefix}-sku`} className={inputClass} value={variant.sku} disabled={disabled} onChange={(event) => updateVariant(variant.localId, { sku: event.target.value.toUpperCase().trim() })} />
                      <FieldError message={errors[`${prefix}-sku`]} />
                    </div>
                    <div>
                      <label className={labelClass}>Giá *</label>
                      <input data-error-key={`${prefix}-price`} className={inputClass} value={variant.price} disabled={disabled} inputMode="numeric" onChange={(event) => updateVariant(variant.localId, { price: event.target.value })} />
                      <FieldError message={errors[`${prefix}-price`]} />
                    </div>
                    <div>
                      <label className={labelClass}>Giá sale</label>
                      <input data-error-key={`${prefix}-sale`} className={inputClass} value={variant.salePrice} disabled={disabled} inputMode="numeric" onChange={(event) => updateVariant(variant.localId, { salePrice: event.target.value })} />
                      <FieldError message={errors[`${prefix}-sale`]} />
                    </div>
                    <div>
                      <label className={labelClass}>Tồn *</label>
                      <input data-error-key={`${prefix}-stock`} className={inputClass} value={variant.stock} disabled={disabled} inputMode="numeric" onChange={(event) => updateVariant(variant.localId, { stock: event.target.value })} />
                      <FieldError message={errors[`${prefix}-stock`]} />
                    </div>
                    <label className="md:col-span-2 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                      <input
                        type="checkbox"
                        checked={variant.allowBackorder}
                        disabled={disabled}
                        onChange={(event) => updateVariant(variant.localId, { allowBackorder: event.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600"
                      />
                      Cho phép bán khi hết hàng
                    </label>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Ảnh riêng của biến thể</label>
                      <input className={inputClass} value={variant.imageUrl} disabled={disabled} placeholder="URL ảnh nếu cần" onChange={(event) => updateVariant(variant.localId, { imageUrl: event.target.value })} />
                    </div>
                    <div>
                      <label className={labelClass}>Trạng thái</label>
                      <select className={inputClass} value={variant.status} disabled={disabled} onChange={(event) => updateVariant(variant.localId, { status: event.target.value as VariantDraft['status'] })}>
                        <option value="active">Đang bán</option>
                        <option value="inactive">Ẩn</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
            {!readOnly && (
              <button
                type="button"
                onClick={() => setField('variants', [...draft.variants, newVariant(draft.sku.trim())])}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-rose-300 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
              >
                <Plus size={17} />
                Thêm biến thể
              </button>
            )}
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:left-[255px]">
        <div className="mx-auto flex max-w-5xl gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <ArrowLeft size={17} />
            Hủy
          </button>
          {!readOnly && (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-black text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {saving ? 'Đang lưu...' : id ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </button>
          )}
        </div>
      </div>
    </form>
  );
};

export default ProductForm;
