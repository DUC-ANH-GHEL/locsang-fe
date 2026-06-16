import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import PlaceholderExtension from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import TextAlignExtension from '@tiptap/extension-text-align';
import UnderlineExtension from '@tiptap/extension-underline';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Bold,
  Eraser,
  Heading2,
  Heading3,
  Image as ImageIcon,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Package,
  Plus,
  Quote,
  Redo2,
  Save,
  Settings2,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';

import ImageUploader from './ImageUploader';
import { useToast } from '../Toast';
import { createCategory as createCategoryApi, getCategories as getCategoriesApi } from '../../services/categoryService';
import { stripClipboardFragments } from '../../utils/richTextSanitizer';
import {
  AdminProductPayload,
  AdminProductStatus,
  cleanupAdminProductUploads,
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

type UploadedImageResult = {
  url: string;
  publicId?: string | null;
};

type ProductPayloadBuildResult = {
  payload: AdminProductPayload;
  uploadedPublicIds: string[];
};

type SpecificationDraft = {
  localId: string;
  label: string;
  value: string;
};

type VariantDraft = {
  localId: string;
  id?: number;
  name: string;
  attributeValues: Record<string, string>;
  sku: string;
  price: string;
  salePrice: string;
  stock: string;
  allowBackorder: boolean;
  status: 'active' | 'inactive';
  imageUrl: string;
};

type VariantAttributeDraft = {
  localId: string;
  id?: number;
  name: string;
  valueInput: string;
  values: string[];
};

type ProductDraft = {
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  status: AdminProductStatus;
  brand: string;
  shortDescription: string;
  description: string;
  price: string;
  salePrice: string;
  stock: string;
  allowBackorder: boolean;
  hasVariants: boolean;
  variantAttributes: VariantAttributeDraft[];
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
  brand: 'Yanmar',
  shortDescription: '',
  description: '',
  price: '',
  salePrice: '',
  stock: '0',
  allowBackorder: false,
  hasVariants: false,
  variantAttributes: [],
  variants: [],
  specifications: [{ localId: makeId(), label: '', value: '' }],
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
  attributeValues: {},
  sku: skuPrefix ? `${skuPrefix}-` : '',
  price: '',
  salePrice: '',
  stock: '0',
  allowBackorder: false,
  status: 'active',
  imageUrl: '',
});

const newVariantAttribute = (): VariantAttributeDraft => ({
  localId: makeId(),
  name: '',
  valueInput: '',
  values: [],
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
  const cleaned = String(value || '').replace(/[^\d-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeVariantToken = (value: string) => String(value || '').trim().toLowerCase();

const parseAttributeValues = (value: string) =>
  Array.from(
    new Set(
      String(value || '')
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

const variantCombinationKey = (attributeValues: Record<string, string>, attributeNames?: string[]) => {
  const names = attributeNames && attributeNames.length > 0 ? attributeNames : Object.keys(attributeValues);
  return names
    .map((name) => `${normalizeVariantToken(name)}=${normalizeVariantToken(attributeValues[name] || '')}`)
    .join('|');
};

const buildAttributeCombinations = (attributes: VariantAttributeDraft[]) => {
  const activeAttributes = attributes
    .map((attribute) => ({
      ...attribute,
      name: attribute.name.trim(),
      values: attribute.values.map((value) => value.trim()).filter(Boolean),
    }))
    .filter((attribute) => attribute.name && attribute.values.length > 0);

  if (activeAttributes.length === 0) return [];

  return activeAttributes.reduce<Array<Record<string, string>>>(
    (combinations, attribute) =>
      combinations.flatMap((combo) => attribute.values.map((value) => ({ ...combo, [attribute.name]: value }))),
    [{}],
  );
};

const buildVariantSku = (baseSku: string, attributeValues: Record<string, string>, index: number) => {
  const suffix = Object.values(attributeValues)
    .map((value) => slugify(value).replace(/-/g, '').toUpperCase())
    .filter(Boolean)
    .join('-');
  const prefix = baseSku.trim().toUpperCase();
  if (prefix && suffix) return `${prefix}-${suffix}`.slice(0, 80);
  if (prefix) return `${prefix}-${index + 1}`.slice(0, 80);
  return suffix || `VAR-${index + 1}`;
};

const syncVariantMatrix = (attributes: VariantAttributeDraft[], existingVariants: VariantDraft[], baseSku: string) => {
  const combinations = buildAttributeCombinations(attributes);
  const attributeNames = attributes.map((attribute) => attribute.name.trim()).filter(Boolean);
  const byKey = new Map<string, VariantDraft>();
  existingVariants.forEach((variant) => {
    const key = variantCombinationKey(variant.attributeValues || {}, attributeNames);
    if (key) byKey.set(key, variant);
  });

  return combinations.map((attributeValues, index) => {
    const key = variantCombinationKey(attributeValues, attributeNames);
    const existing = byKey.get(key);
    const label = Object.values(attributeValues).join(' / ');
    if (existing) {
      return {
        ...existing,
        name: label,
        attributeValues,
      };
    }
    return {
      ...newVariant(''),
      name: label,
      attributeValues,
      sku: buildVariantSku(baseSku, attributeValues, index),
    };
  });
};

const toOptionalNumber = (value: string) => {
  const cleaned = String(value || '').trim();
  if (!cleaned) return null;
  return toNumber(cleaned);
};

const formatMoneyInput = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return currencyFormatter.format(Number(digits));
};

const uniqueStrings = (values: string[]) => Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));

const getCloudinaryPublicIdFromUrl = (url: string) => {
  const cleanUrl = String(url || '').split('?')[0].trim();
  if (!cleanUrl || !cleanUrl.includes('/upload/')) return null;

  const afterUpload = cleanUrl.split('/upload/')[1] || '';
  const segments = afterUpload.split('/').filter(Boolean);
  const versionIndex = segments.findIndex((segment) => /^v\d+$/i.test(segment));
  const publicPathSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;
  const productIndex = publicPathSegments.findIndex((segment) => segment === 'products');
  const normalizedSegments = productIndex >= 0 ? publicPathSegments.slice(productIndex) : publicPathSegments;
  if (normalizedSegments[0] !== 'products' || normalizedSegments.length < 2) return null;

  const last = normalizedSegments[normalizedSegments.length - 1] || '';
  const withoutExtension = last.replace(/\.[a-z0-9]+$/i, '');
  const publicId = [...normalizedSegments.slice(0, -1), withoutExtension].join('/');
  return publicId.startsWith('products/') ? decodeURIComponent(publicId) : null;
};

const extractRichTextImagePublicIds = (html: string) => {
  if (typeof window === 'undefined') return [];
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  const ids = Array.from(template.content.querySelectorAll('img'))
    .map((image) => getCloudinaryPublicIdFromUrl(image.getAttribute('src') || ''))
    .filter((value): value is string => Boolean(value));
  return uniqueStrings(ids);
};

const extractImageItemPublicIds = (items: ProductImageDraft[]) =>
  uniqueStrings(
    items
      .filter((item): item is string => typeof item === 'string')
      .map((url) => getCloudinaryPublicIdFromUrl(url))
      .filter((value): value is string => Boolean(value)),
  );

const sanitizeRichText = (html: string) => {
  if (typeof window === 'undefined') return stripClipboardFragments(String(html || ''));
  const decodeTextarea = document.createElement('textarea');
  const inputHtml = stripClipboardFragments(String(html || ''));
  decodeTextarea.innerHTML = inputHtml;
  const decodedHtml = stripClipboardFragments(/[&][a-z#0-9]+;/i.test(inputHtml) ? decodeTextarea.value : inputHtml);
  const template = document.createElement('template');
  template.innerHTML = decodedHtml;
  const allowedTags = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'H2', 'H3', 'BLOCKQUOTE', 'A', 'IMG']);
  const blockTags = new Set(['P', 'H2', 'H3', 'BLOCKQUOTE', 'LI']);

  const normalizeTextAlign = (value: string | null) => {
    const match = String(value || '').match(/text-align\s*:\s*(left|center|right)/i);
    return match ? `text-align: ${match[1].toLowerCase()};` : '';
  };

  const replaceElement = (element: HTMLElement, nextTagName: string) => {
    const next = document.createElement(nextTagName);
    next.innerHTML = element.innerHTML;
    const textAlign = normalizeTextAlign(element.getAttribute('style'));
    if (textAlign) next.setAttribute('style', textAlign);
    element.replaceWith(next);
    return next;
  };

  const convertStyledSpan = (element: HTMLElement) => {
    const style = String(element.getAttribute('style') || '');
    const wrappers: HTMLElement[] = [];
    if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) wrappers.push(document.createElement('strong'));
    if (/font-style\s*:\s*italic/i.test(style)) wrappers.push(document.createElement('em'));
    if (/text-decoration[^;]*underline/i.test(style)) wrappers.push(document.createElement('u'));
    if (wrappers.length === 0) return null;

    wrappers[wrappers.length - 1].innerHTML = element.innerHTML;
    for (let index = wrappers.length - 2; index >= 0; index -= 1) {
      wrappers[index].appendChild(wrappers[index + 1]);
    }
    element.replaceWith(wrappers[0]);
    return wrappers[0];
  };

  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;
        if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
          element.remove();
          return;
        }
        if (element.tagName === 'DIV') {
          walk(replaceElement(element, 'p'));
          return;
        }
        if (element.tagName === 'SPAN') {
          const converted = convertStyledSpan(element);
          if (converted) {
            walk(converted);
            return;
          }
        }
        if (!allowedTags.has(element.tagName)) {
          const children = Array.from(element.childNodes);
          element.replaceWith(...children);
          children.forEach(walk);
          return;
        }
        const textAlign = blockTags.has(element.tagName) ? normalizeTextAlign(element.getAttribute('style')) : '';
        const linkHref = element.tagName === 'A' ? String((child as HTMLAnchorElement).href || element.getAttribute('href') || '').trim() : '';
        const imageSrc = element.tagName === 'IMG' ? String((child as HTMLImageElement).src || element.getAttribute('src') || '').trim() : '';
        const imageAlt = element.tagName === 'IMG' ? String((child as HTMLImageElement).alt || element.getAttribute('alt') || 'Ảnh mô tả sản phẩm').slice(0, 160) : '';
        Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
        if (textAlign) element.setAttribute('style', textAlign);
        if (element.tagName === 'A') {
          if (!/^https?:\/\//i.test(linkHref) && !/^tel:/i.test(linkHref)) {
            element.replaceWith(...Array.from(element.childNodes));
            return;
          }
          element.setAttribute('href', linkHref);
          element.setAttribute('target', '_blank');
          element.setAttribute('rel', 'noopener noreferrer');
        }
        if (element.tagName === 'IMG') {
          if (!/^https?:\/\//i.test(imageSrc)) {
            element.remove();
            return;
          }
          element.setAttribute('src', imageSrc);
          element.setAttribute('alt', imageAlt);
          element.setAttribute('loading', 'lazy');
        }
        if (element.tagName === 'B') {
          const strong = document.createElement('strong');
          strong.innerHTML = element.innerHTML;
          element.replaceWith(strong);
          walk(strong);
          return;
        }
        if (element.tagName === 'I') {
          const em = document.createElement('em');
          em.innerHTML = element.innerHTML;
          element.replaceWith(em);
          walk(em);
          return;
        }
      }
      walk(child);
    });
  };

  walk(template.content);
  return stripClipboardFragments(template.innerHTML)
    .replace(/<div>/gi, '<p>')
    .replace(/<\/div>/gi, '</p>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/^(<br\s*\/?>|\s)+$/gi, '')
    .trim();
};

const getErrorMessage = (error: any) => {
  const data = error?.response?.data;
  const detail = data?.detail;
  const message = data?.message || detail?.message || detail || error?.message;
  const text = typeof message === 'string' ? message : 'Không lưu được sản phẩm. Vui lòng kiểm tra lại dữ liệu.';

  if (data?.error_code === 'SLUG_DUPLICATE') {
    return 'Slug đã tồn tại. Vui lòng đổi tên sản phẩm để tạo slug khác.';
  }
  if (data?.error_code === 'SKU_DUPLICATE') {
    return 'SKU đã tồn tại. Vui lòng dùng mã phụ tùng khác.';
  }
  const lower = text.toLowerCase();
  if (lower.includes('sku') && !lower.includes('slug')) {
    return 'SKU đã tồn tại. Vui lòng dùng mã phụ tùng khác.';
  }
  if (lower.includes('slug') && !lower.includes('sku')) {
    return 'Slug đã tồn tại. Vui lòng đổi tên sản phẩm để tạo slug khác.';
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

  return specs;
};

const normalizeVariant = (variant: any, index: number): VariantDraft => {
  const attrs = variant?.attribute_values || variant?.attributeValues || {};
  const attributeValues =
    attrs && typeof attrs === 'object' && !Array.isArray(attrs)
      ? Object.entries(attrs).reduce<Record<string, string>>((acc, [name, value]) => {
          const cleanName = String(name || '').trim();
          const cleanValue = String(value || '').trim();
          if (cleanName && cleanValue) acc[cleanName] = cleanValue;
          return acc;
        }, {})
      : {};
  const attrName = Object.values(attributeValues).filter(Boolean).join(' / ');
  const fallbackName = String(variant?.variant_name || variant?.variantName || '').trim();
  if (Object.keys(attributeValues).length === 0 && fallbackName && fallbackName !== String(variant?.sku || '').trim()) {
    attributeValues['Quy cách'] = fallbackName;
  }
  return {
    localId: makeId(),
    id: Number.isFinite(Number(variant?.id)) ? Number(variant.id) : undefined,
    name: Object.values(attributeValues).join(' / ') || fallbackName || attrName || '',
    attributeValues,
    sku: String(variant?.sku || '').trim(),
    price: variant?.price !== undefined && variant?.price !== null ? formatMoneyInput(String(variant.price)) : '',
    salePrice:
      variant?.sale_price !== undefined && variant?.sale_price !== null
        ? formatMoneyInput(String(variant.sale_price))
        : variant?.salePrice !== undefined && variant?.salePrice !== null
          ? formatMoneyInput(String(variant.salePrice))
          : '',
    stock: variant?.stock !== undefined && variant?.stock !== null ? String(variant.stock) : '0',
    allowBackorder: Boolean(variant?.allow_backorder ?? variant?.allowBackorder ?? false),
    status: variant?.status === 'inactive' || variant?.is_active === false ? 'inactive' : 'active',
    imageUrl: String(variant?.image_url || variant?.imageUrl || '').trim(),
  };
};

const normalizeVariantAttributes = (product: any, variants: VariantDraft[]): VariantAttributeDraft[] => {
  const rawAttributes = Array.isArray(product?.attributes)
    ? product.attributes
    : Array.isArray(product?.variantAttributes)
      ? product.variantAttributes
      : Array.isArray(product?.variant_attributes)
        ? product.variant_attributes
        : [];

  const fromProduct = rawAttributes
    .map((attribute: any) => {
      const values = Array.isArray(attribute?.values)
        ? attribute.values.map((value: any) => String(value?.value ?? value ?? '').trim()).filter(Boolean)
        : [];
      return {
        localId: makeId(),
        id: Number.isFinite(Number(attribute?.id)) ? Number(attribute.id) : undefined,
        name: String(attribute?.name || '').trim(),
        valueInput: values.join(', '),
        values,
      };
    })
    .filter((attribute: VariantAttributeDraft) => attribute.name && attribute.values.length > 0);

  if (fromProduct.length > 0) return fromProduct;

  const order: string[] = [];
  const valuesByName = new Map<string, Set<string>>();
  variants.forEach((variant) => {
    Object.entries(variant.attributeValues || {}).forEach(([name, value]) => {
      const cleanName = String(name || '').trim();
      const cleanValue = String(value || '').trim();
      if (!cleanName || !cleanValue) return;
      if (!valuesByName.has(cleanName)) {
        valuesByName.set(cleanName, new Set());
        order.push(cleanName);
      }
      valuesByName.get(cleanName)?.add(cleanValue);
    });
  });

  return order.map((name) => {
    const values = Array.from(valuesByName.get(name) || []);
    return {
      localId: makeId(),
      name,
      valueInput: values.join(', '),
      values,
    };
  });
};

const FieldError = ({ message }: { message?: string }) =>
  message ? <div className="mt-1 text-sm font-semibold text-red-600">{message}</div> : null;

type RichTextEditorProps = {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
  onChange: (value: string) => void;
};

const RichTextEditor = ({ value, disabled, placeholder, onImageUpload, onChange }: RichTextEditorProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      UnderlineExtension,
      LinkExtension.configure({
        autolink: true,
        openOnClick: false,
        linkOnPaste: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      ImageExtension.configure({
        allowBase64: false,
        HTMLAttributes: {
          loading: 'lazy',
        },
      }),
      TextAlignExtension.configure({
        types: ['heading', 'paragraph', 'blockquote'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
      PlaceholderExtension.configure({
        placeholder: placeholder || '',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: sanitizeRichText(value),
    onUpdate: ({ editor: currentEditor }) => {
      onChange(sanitizeRichText(currentEditor.getHTML()));
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[220px] max-w-none px-3 py-3 text-sm font-semibold leading-7 text-slate-900 outline-none dark:text-slate-100',
      },
      transformPastedHTML: (html) => sanitizeRichText(html),
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const safeValue = sanitizeRichText(value);
    if (safeValue !== sanitizeRichText(editor.getHTML())) {
      editor.commands.setContent(safeValue || '', false);
    }
  }, [editor, value]);

  const runCommand = (callback: () => void) => {
    if (!editor || disabled) return;
    callback();
  };

  const insertLink = () => {
    if (!editor || disabled) return;
    const currentHref = editor.getAttributes('link').href || '';
    const href = window.prompt('Nhập link cần gắn vào nội dung', currentHref);
    if (href === null) return;
    const normalized = href.trim();
    if (!normalized) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    if (!/^https?:\/\//i.test(normalized) && !/^tel:/i.test(normalized)) {
      window.alert('Link cần bắt đầu bằng https://, http:// hoặc tel:');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
  };

  const insertImageUrl = () => {
    if (!editor || disabled) return;
    const src = window.prompt('Dán URL ảnh cần chèn vào mô tả');
    if (!src) return;
    const normalized = src.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      window.alert('URL ảnh cần bắt đầu bằng https:// hoặc http://');
      return;
    }
    editor.chain().focus().setImage({ src: normalized, alt: 'Ảnh mô tả sản phẩm' }).run();
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || disabled || !onImageUpload || !editor) return;

    try {
      setUploadingImage(true);
      const url = await onImageUpload(file);
      if (!url) throw new Error('Không nhận được URL ảnh.');
      editor.chain().focus().setImage({ src: url, alt: file.name || 'Ảnh mô tả sản phẩm' }).run();
    } catch (error) {
      console.error('Cannot upload rich text image', error);
      window.alert('Không upload được ảnh mô tả. Vui lòng thử lại.');
    } finally {
      setUploadingImage(false);
    }
  };

  const clearFormat = () => {
    runCommand(() => editor?.chain().focus().clearNodes().unsetAllMarks().run());
  };

  const toolbarButtonClass =
    'inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-black text-slate-800 transition hover:bg-white hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-100 dark:hover:bg-slate-800';
  const activeButtonClass =
    'bg-white text-rose-600 shadow-sm ring-1 ring-rose-200 dark:bg-slate-800 dark:ring-rose-500/30';

  const ToolbarButton = ({
    title,
    active = false,
    children,
    onClick,
  }: {
    title: string;
    active?: boolean;
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button
      type="button"
      disabled={disabled || !editor}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`${toolbarButtonClass} ${active ? activeButtonClass : ''}`}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white transition focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:ring-rose-500/15">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900">
        <ToolbarButton title="Đoạn văn" active={editor?.isActive('paragraph')} onClick={() => runCommand(() => editor?.chain().focus().setParagraph().run())}>
          Đoạn
        </ToolbarButton>
        <ToolbarButton title="Tiêu đề H2" active={editor?.isActive('heading', { level: 2 })} onClick={() => runCommand(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())}>
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton title="Tiêu đề H3" active={editor?.isActive('heading', { level: 3 })} onClick={() => runCommand(() => editor?.chain().focus().toggleHeading({ level: 3 }).run())}>
          <Heading3 size={16} />
        </ToolbarButton>
        <ToolbarButton title="In đậm" active={editor?.isActive('bold')} onClick={() => runCommand(() => editor?.chain().focus().toggleBold().run())}>
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton title="In nghiêng" active={editor?.isActive('italic')} onClick={() => runCommand(() => editor?.chain().focus().toggleItalic().run())}>
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton title="Gạch chân" active={editor?.isActive('underline')} onClick={() => runCommand(() => editor?.chain().focus().toggleUnderline().run())}>
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton title="Danh sách chấm" active={editor?.isActive('bulletList')} onClick={() => runCommand(() => editor?.chain().focus().toggleBulletList().run())}>
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton title="Danh sách số" active={editor?.isActive('orderedList')} onClick={() => runCommand(() => editor?.chain().focus().toggleOrderedList().run())}>
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton title="Trích dẫn" active={editor?.isActive('blockquote')} onClick={() => runCommand(() => editor?.chain().focus().toggleBlockquote().run())}>
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton title="Căn trái" active={editor?.isActive({ textAlign: 'left' })} onClick={() => runCommand(() => editor?.chain().focus().setTextAlign('left').run())}>
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton title="Căn giữa" active={editor?.isActive({ textAlign: 'center' })} onClick={() => runCommand(() => editor?.chain().focus().setTextAlign('center').run())}>
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton title="Căn phải" active={editor?.isActive({ textAlign: 'right' })} onClick={() => runCommand(() => editor?.chain().focus().setTextAlign('right').run())}>
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton title="Gắn link" active={editor?.isActive('link')} onClick={insertLink}>
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton title="Chèn ảnh bằng URL" onClick={insertImageUrl}>
          URL ảnh
        </ToolbarButton>
        <button
          type="button"
          disabled={disabled || uploadingImage || !onImageUpload || !editor}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => imageInputRef.current?.click()}
          className={toolbarButtonClass}
          title="Upload ảnh"
          aria-label="Upload ảnh"
        >
          <ImagePlus size={16} />
          {uploadingImage ? 'Đang up' : ''}
        </button>
        <ToolbarButton title="Xóa định dạng" onClick={clearFormat}>
          <Eraser size={16} />
        </ToolbarButton>
        <ToolbarButton title="Hoàn tác" onClick={() => runCommand(() => editor?.chain().focus().undo().run())}>
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton title="Làm lại" onClick={() => runCommand(() => editor?.chain().focus().redo().run())}>
          <Redo2 size={16} />
        </ToolbarButton>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />
      </div>
      <EditorContent
        editor={editor}
        className="[&_.ProseMirror]:min-h-[220px] [&_.ProseMirror]:max-w-none [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-3 [&_.ProseMirror]:text-sm [&_.ProseMirror]:font-semibold [&_.ProseMirror]:leading-7 [&_.ProseMirror]:text-slate-900 [&_.ProseMirror]:outline-none dark:[&_.ProseMirror]:text-slate-100 [&_.ProseMirror_a]:font-bold [&_.ProseMirror_a]:text-rose-600 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-rose-200 [&_.ProseMirror_blockquote]:bg-rose-50/60 [&_.ProseMirror_blockquote]:px-3 [&_.ProseMirror_blockquote]:py-2 [&_.ProseMirror_blockquote]:text-slate-700 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:mt-3 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-black [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-black [&_.ProseMirror_img]:my-3 [&_.ProseMirror_img]:max-h-[24rem] [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-xl [&_.ProseMirror_img]:border [&_.ProseMirror_img]:border-slate-200 [&_.ProseMirror_li]:ml-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_ul]:list-disc [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-slate-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
      />
    </div>
  );
};

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
  const [imageItems, setImageItems] = useState<ProductImageDraft[]>([]);
  const [existingVariantIds, setExistingVariantIds] = useState<number[]>([]);
  const [defaultVariantId, setDefaultVariantId] = useState<number | undefined>(undefined);
  const [existingAttributeIds, setExistingAttributeIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
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
  const initialRichTextImagePublicIdsRef = useRef<string[]>([]);
  const richTextUploadedPublicIdsRef = useRef<string[]>([]);

  const disabled = readOnly || saving;
  const initialImages = useMemo(() => imageItems, [imageItems]);

  const completion = useMemo(() => {
    const checks = [
      Boolean(draft.name.trim()),
      Boolean(draft.sku.trim()),
      Boolean(draft.categoryId),
      Boolean(imageItems.length),
      toNumber(draft.price) > 0,
      Number.isInteger(toNumber(draft.stock)) && (toNumber(draft.stock) >= 0 || draft.allowBackorder),
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [draft.allowBackorder, draft.categoryId, draft.name, draft.price, draft.sku, draft.stock, imageItems.length]);

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
          initialRichTextImagePublicIdsRef.current = extractRichTextImagePublicIds(String(saved.draft.description || ''));
          setDraft({
            ...emptyDraft,
            ...saved.draft,
            slug: slugify(String(saved.draft.name || '')),
            specifications:
              Array.isArray(saved.draft.specifications)
                ? saved.draft.specifications
                : emptyDraft.specifications.map((item) => ({ ...item, localId: makeId() })),
            variantAttributes: Array.isArray(saved.draft.variantAttributes) ? saved.draft.variantAttributes : [],
            variants: Array.isArray(saved.draft.variants) ? saved.draft.variants : [],
          });
          setImageItems(restoredImages);
          setDraftSavedAt(saved.savedAt || null);
          if (hasDraftContent(saved.draft, restoredImages)) {
            showToast('Đã khôi phục nháp sản phẩm đang nhập dở.', 'info');
          }
        } else {
          initialRichTextImagePublicIdsRef.current = [];
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
        if (!id) {
          initialRichTextImagePublicIdsRef.current = [];
          return;
        }

        const raw = await getProductById(id);
        if (cancelled) return;
        const product = normalizeProduct(raw);
        const variants = Array.isArray(product?.variants) ? product.variants.map(normalizeVariant) : [];
        const firstVariant = variants[0];
        const variantAttributes = normalizeVariantAttributes(product, variants);
        const hasVariants = Boolean(product?.has_variants && variantAttributes.length > 0 && variants.length > 0);
        const initialDescription = String(product?.description || '').trim();

        setDraft({
          name: String(product?.name || '').trim(),
          slug: slugify(String(product?.name || '').trim()),
          sku: String(firstVariant?.sku || product?.sku || '').trim(),
          categoryId: product?.category_id ? String(product.category_id) : '',
          status: (product?.status || (product?.is_active ? 'active' : 'draft')) as AdminProductStatus,
          brand: String(product?.brand || 'Yanmar').trim(),
          shortDescription: String(product?.short_description || product?.shortDescription || '').trim(),
          description: initialDescription,
          price:
            firstVariant?.price ||
            (product?.price !== undefined && product?.price !== null ? formatMoneyInput(String(product.price)) : ''),
          salePrice:
            firstVariant?.salePrice ||
            (product?.sale_price !== undefined && product?.sale_price !== null
              ? formatMoneyInput(String(product.sale_price))
              : product?.salePrice !== undefined && product?.salePrice !== null
                ? formatMoneyInput(String(product.salePrice))
                : ''),
          stock:
            firstVariant?.stock ||
            (product?.stock !== undefined && product?.stock !== null ? String(product.stock) : '0'),
          allowBackorder: Boolean(firstVariant?.allowBackorder ?? product?.allow_backorder ?? product?.allowBackorder ?? false),
          hasVariants,
          variantAttributes: hasVariants ? variantAttributes : [],
          variants: hasVariants ? variants : [],
          specifications: normalizeSpecs(product),
        });

        const productImages = extractImageUrls(product);
        initialRichTextImagePublicIdsRef.current = extractRichTextImagePublicIds(initialDescription);
        setImageItems(productImages);
        const variantIds = variants.map((variant) => variant.id).filter((value): value is number => Number.isFinite(Number(value)));
        setExistingVariantIds(variantIds);
        setDefaultVariantId(firstVariant?.id);
        setExistingAttributeIds(
          (Array.isArray(product?.attributes) ? product.attributes : [])
            .map((item: any) => Number(item?.id))
            .filter((value: number) => Number.isFinite(value)),
        );
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
    draftRef.current = { ...draftRef.current, [field]: value };
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
      slug: slugify(value),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.name;
      delete next.slug;
      return next;
    });
  };

  const onImagesUpdate = useCallback((files: File[], existing: string[], orderedImages?: ProductImageDraft[]) => {
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

  const setVariantAttributes = (updater: (attributes: VariantAttributeDraft[]) => VariantAttributeDraft[]) => {
    setDraft((prev) => {
      const nextAttributes = updater(prev.variantAttributes);
      const nextVariants = syncVariantMatrix(nextAttributes, prev.variants, prev.sku.trim());
      const nextDraft = {
        ...prev,
        variantAttributes: nextAttributes,
        variants: nextVariants,
      };
      draftRef.current = nextDraft;
      return nextDraft;
    });
  };

  const updateVariantAttribute = (localId: string, patch: Partial<Pick<VariantAttributeDraft, 'name' | 'valueInput'>>) => {
    setDraft((prev) => {
      const currentAttribute = prev.variantAttributes.find((attribute) => attribute.localId === localId);
      const oldName = String(currentAttribute?.name || '').trim();
      const newName = Object.prototype.hasOwnProperty.call(patch, 'name') ? String(patch.name || '').trim() : oldName;
      const nextAttributes = prev.variantAttributes.map((attribute) => {
        if (attribute.localId !== localId) return attribute;
        const next = { ...attribute, ...patch };
        if (Object.prototype.hasOwnProperty.call(patch, 'valueInput')) {
          next.values = parseAttributeValues(String(patch.valueInput || ''));
        }
        return next;
      });
      const renamedVariants =
        oldName && newName && oldName !== newName
          ? prev.variants.map((variant) => {
              const attributeValues = { ...(variant.attributeValues || {}) };
              if (Object.prototype.hasOwnProperty.call(attributeValues, oldName)) {
                attributeValues[newName] = attributeValues[oldName];
                delete attributeValues[oldName];
              }
              return {
                ...variant,
                attributeValues,
              };
            })
          : prev.variants;
      const nextDraft = {
        ...prev,
        variantAttributes: nextAttributes,
        variants: syncVariantMatrix(nextAttributes, renamedVariants, prev.sku.trim()),
      };
      draftRef.current = nextDraft;
      return nextDraft;
    });
  };

  const removeVariantAttribute = (localId: string) => {
    setVariantAttributes((attributes) => attributes.filter((attribute) => attribute.localId !== localId));
  };

  const addVariantAttribute = () => {
    setVariantAttributes((attributes) => [...attributes, newVariantAttribute()]);
  };

  const updateVariant = (localId: string, patch: Partial<VariantDraft>) => {
    setDraft((prev) => {
      const nextDraft = {
        ...prev,
        variants: prev.variants.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
      };
      draftRef.current = nextDraft;
      return nextDraft;
    });
  };

  const uploadRichTextImage = async (file: File) => {
    const result = await uploadAdminProductImage(file);
    if (!result.url) throw new Error('Upload ảnh mô tả thất bại, không nhận được URL.');
    if (result.public_id) {
      richTextUploadedPublicIdsRef.current = [...richTextUploadedPublicIdsRef.current, result.public_id];
    }
    return result.url;
  };

  const getRichTextOrphanPublicIds = (html = draftRef.current.description, includeExisting = false) => {
    const currentRichTextIds = extractRichTextImagePublicIds(html);
    const galleryIds = extractImageItemPublicIds(imageItemsRef.current);
    const protectedIds = new Set([...currentRichTextIds, ...galleryIds]);
    const candidates = includeExisting
      ? [...initialRichTextImagePublicIdsRef.current, ...richTextUploadedPublicIdsRef.current]
      : [...richTextUploadedPublicIdsRef.current];

    return uniqueStrings(candidates).filter((publicId) => !protectedIds.has(publicId));
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
    if (!Number.isInteger(stock)) next.stock = 'Tồn kho phải là số nguyên.';
    if (Number.isInteger(stock) && stock < 0 && !draft.allowBackorder) {
      next.stock = 'Tồn kho âm chỉ hợp lệ khi bật cho phép bán khi hết hàng.';
    }

    draft.specifications.forEach((spec, index) => {
      const hasLabel = Boolean(spec.label.trim());
      const hasValue = Boolean(spec.value.trim());
      if (hasLabel !== hasValue) next[`spec-${spec.localId}`] = `Thông số #${index + 1} cần đủ tên và giá trị.`;
    });

    if (draft.hasVariants) {
      if (draft.variantAttributes.length === 0) next.variantAttributes = 'Cần thêm ít nhất một thuộc tính biến thể.';
      const attributeNameSeen = new Set<string>();
      draft.variantAttributes.forEach((attribute, index) => {
        const prefix = `variant-attribute-${attribute.localId}`;
        const name = attribute.name.trim();
        const nameKey = normalizeVariantToken(name);
        if (!name) next[`${prefix}-name`] = `Thuộc tính #${index + 1} cần tên.`;
        if (nameKey && attributeNameSeen.has(nameKey)) next[`${prefix}-name`] = `Tên thuộc tính bị trùng: ${name}.`;
        attributeNameSeen.add(nameKey);
        if (attribute.values.length === 0) next[`${prefix}-values`] = `Thuộc tính #${index + 1} cần ít nhất một giá trị.`;
        const valueSeen = new Set<string>();
        attribute.values.forEach((value) => {
          const valueKey = normalizeVariantToken(value);
          if (valueKey && valueSeen.has(valueKey)) next[`${prefix}-values`] = `Giá trị trong thuộc tính ${name || `#${index + 1}`} bị trùng.`;
          valueSeen.add(valueKey);
        });
      });

      if (draft.variants.length === 0) next.variants = 'Bảng biến thể chưa có tổ hợp nào.';
      const seenSku = new Set<string>();
      const seenCombo = new Set<string>();
      const attributeNames = draft.variantAttributes.map((attribute) => attribute.name.trim()).filter(Boolean);
      draft.variants.forEach((variant, index) => {
        const prefix = `variant-${variant.localId}`;
        const variantSku = variant.sku.trim();
        const variantPrice = toNumber(variant.price);
        const variantSalePrice = toOptionalNumber(variant.salePrice);
        const variantStock = toNumber(variant.stock);
        if (!variantSku) next[`${prefix}-sku`] = `Biến thể #${index + 1} thiếu SKU.`;
        const skuKey = variantSku.toLowerCase();
        if (skuKey && seenSku.has(skuKey)) next[`${prefix}-sku`] = `SKU biến thể bị trùng: ${variantSku}.`;
        seenSku.add(skuKey);
        if (attributeNames.some((name) => !String(variant.attributeValues?.[name] || '').trim())) {
          next[`${prefix}-attributes`] = `Biến thể #${index + 1} thiếu phân loại.`;
        }
        const comboKey = variantCombinationKey(variant.attributeValues || {}, attributeNames);
        if (comboKey && seenCombo.has(comboKey)) next[`${prefix}-attributes`] = `Tổ hợp biến thể #${index + 1} bị trùng.`;
        seenCombo.add(comboKey);
        if (!Number.isFinite(variantPrice) || variantPrice <= 0) next[`${prefix}-price`] = 'Giá biến thể phải lớn hơn 0.';
        if (variantSalePrice !== null && (variantSalePrice <= 0 || variantSalePrice > variantPrice)) next[`${prefix}-sale`] = 'Giá sale phải lớn hơn 0 và không vượt giá bán.';
        if (!Number.isInteger(variantStock)) next[`${prefix}-stock`] = 'Tồn kho phải là số nguyên.';
        if (Number.isInteger(variantStock) && variantStock < 0 && !variant.allowBackorder) {
          next[`${prefix}-stock`] = 'Tồn kho âm chỉ hợp lệ khi bật cho phép bán khi hết hàng.';
        }
      });
    }

    setErrors(next);
    return next;
  };

  const getFirstErrorKey = (validation: FormErrors) => {
    const baseOrder = ['name', 'slug', 'sku', 'categoryId', 'images', 'price', 'salePrice', 'stock'];
    const specOrder = draft.specifications.map((spec) => `spec-${spec.localId}`);
    const attributeOrder = draft.variantAttributes.flatMap((attribute) => {
      const prefix = `variant-attribute-${attribute.localId}`;
      return [`${prefix}-name`, `${prefix}-values`];
    });
    const variantOrder = draft.variants.flatMap((variant) => {
      const prefix = `variant-${variant.localId}`;
      return [`${prefix}-attributes`, `${prefix}-sku`, `${prefix}-price`, `${prefix}-sale`, `${prefix}-stock`];
    });
    const order = [...baseOrder, ...specOrder, 'variantAttributes', ...attributeOrder, 'variants', ...variantOrder];
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

  const uploadOrderedImages = async () => {
    const uploadedByFile = new Map<File, UploadedImageResult>();
    const orderedImages: UploadedImageResult[] = [];
    const uploadedPublicIds: string[] = [];

    for (const item of imageItems) {
      if (typeof item === 'string') {
        orderedImages.push({ url: item, publicId: null });
        continue;
      }

      const existingUpload = uploadedByFile.get(item);
      if (existingUpload) {
        orderedImages.push(existingUpload);
        continue;
      }

      const result = await uploadAdminProductImage(item);
      if (!result.url) throw new Error('Upload ảnh thất bại, không nhận được URL.');
      const uploaded = { url: result.url, publicId: result.public_id ?? null };
      uploadedByFile.set(item, uploaded);
      orderedImages.push(uploaded);
      if (result.public_id) uploadedPublicIds.push(result.public_id);
    }

    return { orderedImages, uploadedPublicIds };
  };

  const buildPayload = async (): Promise<ProductPayloadBuildResult> => {
    const { orderedImages, uploadedPublicIds } = await uploadOrderedImages();
    const currentDraft = draftRef.current;
    const baseSku = currentDraft.sku.trim();
    const baseStatus = currentDraft.status === 'active' ? 'active' : 'inactive';
    const specs = currentDraft.specifications
      .map((item) => ({ label: item.label.trim(), value: item.value.trim() }))
      .filter((item) => item.label && item.value);
    const cleanVariantAttributes = currentDraft.hasVariants
      ? currentDraft.variantAttributes
          .map((attribute) => ({
            id: attribute.id,
            name: attribute.name.trim(),
            values: parseAttributeValues(attribute.valueInput),
          }))
          .filter((attribute) => attribute.name && attribute.values.length > 0)
      : [];
    const attributeNames = cleanVariantAttributes.map((attribute) => attribute.name);

    const variants = currentDraft.hasVariants
      ? currentDraft.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku.trim(),
          price: toNumber(variant.price),
          sale_price: toOptionalNumber(variant.salePrice),
          stock: toNumber(variant.stock),
          manage_stock: true,
          allow_backorder: variant.allowBackorder,
          status: variant.status,
          image_url: variant.imageUrl.trim() || null,
          attribute_values: attributeNames.reduce<Record<string, string>>((acc, name) => {
            const value = String(variant.attributeValues?.[name] || '').trim();
            if (value) acc[name] = value;
            return acc;
          }, {}),
        }))
      : [
          {
            id: existingVariantIds[0] ?? defaultVariantId,
            sku: baseSku,
            price: toNumber(currentDraft.price),
            sale_price: toOptionalNumber(currentDraft.salePrice),
            stock: toNumber(currentDraft.stock),
            manage_stock: true,
            allow_backorder: currentDraft.allowBackorder,
            status: baseStatus,
            attribute_values: {},
            image_url: null,
          },
        ];

    const activeVariantIds = variants.map((variant) => Number(variant.id)).filter((value) => Number.isFinite(value));
    const deletedVariantIds = id ? existingVariantIds.filter((variantId) => !activeVariantIds.includes(variantId)) : [];
    const activeAttributeIds = cleanVariantAttributes.map((attribute) => Number(attribute.id)).filter((value) => Number.isFinite(value));
    const deletedAttributeIds = id ? existingAttributeIds.filter((attributeId) => !activeAttributeIds.includes(attributeId)) : [];

    const payload: AdminProductPayload = {
      name: currentDraft.name.trim(),
      slug: currentDraft.slug.trim(),
      short_description: currentDraft.shortDescription.trim() || null,
      description: sanitizeRichText(currentDraft.description).trim() || null,
      status: currentDraft.status,
      category_id: Number(currentDraft.categoryId),
      brand: currentDraft.brand.trim() || 'Yanmar',
      tags: [],
      specifications: specs,
      has_variants: currentDraft.hasVariants,
      media: orderedImages.map((image, index) => ({
        url: image.url,
        type: 'image',
        sort_order: index + 1,
        public_id: image.publicId ?? null,
      })),
      attributes: cleanVariantAttributes,
      variants,
      deleted_variant_ids: deletedVariantIds,
      deleted_attribute_ids: deletedAttributeIds,
    };
    return { payload, uploadedPublicIds };
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

    let uploadedPublicIds: string[] = [];

    try {
      setSaving(true);
      const built = await buildPayload();
      uploadedPublicIds = built.uploadedPublicIds;
      const payload = built.payload;
      if (id) {
        await updateAdminProduct(id, payload);
      } else {
        await createAdminProduct(payload);
        await deleteProductDraft(PRODUCT_CREATE_DRAFT_KEY).catch(() => undefined);
        setDraftSavedAt(null);
      }
      const richTextOrphans = getRichTextOrphanPublicIds(payload.description || '', true);
      if (richTextOrphans.length > 0) {
        cleanupAdminProductUploads(richTextOrphans).catch((cleanupError) => {
          console.warn('Cannot cleanup removed rich text images after save', cleanupError);
        });
      }
      initialRichTextImagePublicIdsRef.current = extractRichTextImagePublicIds(payload.description || '');
      richTextUploadedPublicIdsRef.current = [];
      showToast(id ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm.', 'success');
      onSuccess?.();
    } catch (error: any) {
      const message = getErrorMessage(error);
      const errorCode = error?.response?.data?.error_code || error?.response?.data?.detail?.error_code;
      let serverErrorKey: string | null = null;
      if (errorCode === 'SLUG_DUPLICATE') {
        serverErrorKey = 'name';
        setErrors((prev) => ({ ...prev, name: message }));
      }
      if (errorCode === 'SKU_DUPLICATE') {
        serverErrorKey = serverErrorKey || 'sku';
        setErrors((prev) => ({ ...prev, sku: message }));
      }
      if (serverErrorKey) {
        focusErrorField(serverErrorKey);
      }
      const orphanRichTextUploads = getRichTextOrphanPublicIds(draftRef.current.description, false);
      const cleanupIds = uniqueStrings([...uploadedPublicIds, ...orphanRichTextUploads]);
      if (cleanupIds.length > 0) {
        cleanupAdminProductUploads(cleanupIds)
          .then(() => {
            const cleaned = new Set(cleanupIds);
            richTextUploadedPublicIdsRef.current = richTextUploadedPublicIdsRef.current.filter((publicId) => !cleaned.has(publicId));
          })
          .catch((cleanupError) => {
            console.warn('Cannot cleanup uploaded product images after failed save', cleanupError);
          });
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
    <form ref={formRef} onSubmit={submit} className="space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+12rem)] lg:pb-24">
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
              className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400`}
              value={draft.slug}
              disabled
              placeholder="loc-nhot-yanmar-119305-35153"
              readOnly
            />
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Slug tự động sinh theo tên sản phẩm để giữ URL SEO nhất quán.
            </p>
            <FieldError message={errors.slug} />
          </div>
          <div>
            <label className={labelClass}>SKU hoặc mã phụ tùng *</label>
            <input
              data-error-key="sku"
              className={inputClass}
              value={draft.sku}
              disabled={disabled}
              placeholder="VD: NHOT-DONG-CO-4T-10W30"
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
            <input
              data-error-key="price"
              className={inputClass}
              value={draft.price}
              disabled={disabled}
              inputMode="numeric"
              placeholder="180.000"
              onChange={(event) => setField('price', formatMoneyInput(event.target.value))}
            />
            <FieldError message={errors.price} />
          </div>
          <div>
            <label className={labelClass}>Giá sale</label>
            <input
              data-error-key="salePrice"
              className={inputClass}
              value={draft.salePrice}
              disabled={disabled}
              inputMode="numeric"
              placeholder="160.000"
              onChange={(event) => setField('salePrice', formatMoneyInput(event.target.value))}
            />
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
        {draft.status === 'active' && Number.isInteger(toNumber(draft.stock)) && toNumber(draft.stock) <= 0 && !draft.allowBackorder && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Sản phẩm đang hết hàng và chưa cho phép bán khi hết hàng, nên sẽ không hiển thị trên storefront.
          </div>
        )}
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
            <RichTextEditor
              value={draft.description}
              disabled={disabled}
              placeholder="Nhập mô tả chi tiết, hướng dẫn sử dụng, lưu ý lắp đặt hoặc bảo quản."
              onImageUpload={uploadRichTextImage}
              onChange={(value) => setField('description', value)}
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
                setDraft((prev) => {
                  const nextAttributes = checked && prev.variantAttributes.length === 0 ? [newVariantAttribute()] : prev.variantAttributes;
                  const nextDraft = {
                    ...prev,
                    hasVariants: checked,
                    variantAttributes: checked ? nextAttributes : prev.variantAttributes,
                    variants: checked ? syncVariantMatrix(nextAttributes, prev.variants, prev.sku.trim()) : prev.variants,
                  };
                  draftRef.current = nextDraft;
                  return nextDraft;
                });
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
            <div data-error-key="variantAttributes" tabIndex={-1} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-black text-slate-900 dark:text-white">Thuộc tính biến thể</div>
                  <p className="text-sm font-semibold text-slate-500">VD: Dung tích: 4L, 5L; Dòng máy: 4TNV88, 3TNV76.</p>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={addVariantAttribute}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-800 transition hover:border-rose-300 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <Plus size={17} />
                    Thêm thuộc tính
                  </button>
                )}
              </div>
              <FieldError message={errors.variantAttributes} />
              <div className="space-y-3">
                {draft.variantAttributes.map((attribute, index) => {
                  const prefix = `variant-attribute-${attribute.localId}`;
                  return (
                    <div key={attribute.localId} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.8fr)_auto] dark:border-slate-800 dark:bg-slate-950">
                      <div>
                        <label className={labelClass}>Tên thuộc tính #{index + 1}</label>
                        <input
                          data-error-key={`${prefix}-name`}
                          className={inputClass}
                          value={attribute.name}
                          disabled={disabled}
                          placeholder="VD: Dung tích"
                          onChange={(event) => updateVariantAttribute(attribute.localId, { name: event.target.value })}
                        />
                        <FieldError message={errors[`${prefix}-name`]} />
                      </div>
                      <div>
                        <label className={labelClass}>Giá trị</label>
                        <input
                          data-error-key={`${prefix}-values`}
                          className={inputClass}
                          value={attribute.valueInput}
                          disabled={disabled}
                          placeholder="VD: 4L, 5L, 10W-30"
                          onChange={(event) => updateVariantAttribute(attribute.localId, { valueInput: event.target.value })}
                        />
                        <div className="mt-1 text-xs font-semibold text-slate-500">Ngăn cách nhiều giá trị bằng dấu phẩy.</div>
                        <FieldError message={errors[`${prefix}-values`]} />
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => removeVariantAttribute(attribute.localId)}
                          className="inline-flex h-11 items-center justify-center gap-1 self-end rounded-xl border border-red-200 px-3 text-sm font-black text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                          Xóa
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="mb-3">
                <div className="font-black text-slate-900 dark:text-white">Bảng biến thể</div>
                <p className="text-sm font-semibold text-slate-500">Mỗi dòng là một tổ hợp phân loại. Nhập SKU, giá, kho và trạng thái cho từng dòng.</p>
              </div>
              {draft.variants.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                  Nhập tên thuộc tính và giá trị để hệ thống tự tạo bảng biến thể.
                </div>
              ) : (
                <div className="space-y-3">
                  {draft.variants.map((variant, index) => {
              const prefix = `variant-${variant.localId}`;
              return (
                <div key={variant.localId} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-500">Tổ hợp #{index + 1}</div>
                      <div data-error-key={`${prefix}-attributes`} tabIndex={-1} className="text-base font-black text-slate-900 dark:text-white">
                        {Object.values(variant.attributeValues || {}).filter(Boolean).join(' / ') || 'Chưa đủ phân loại'}
                      </div>
                      <FieldError message={errors[`${prefix}-attributes`]} />
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      {variant.status === 'inactive' ? 'Ẩn' : 'Đang bán'}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                    <div className="lg:col-span-2">
                      <label className={labelClass}>SKU *</label>
                      <input data-error-key={`${prefix}-sku`} className={inputClass} value={variant.sku} disabled={disabled} onChange={(event) => updateVariant(variant.localId, { sku: event.target.value.toUpperCase().trim() })} />
                      <FieldError message={errors[`${prefix}-sku`]} />
                    </div>
                    <div>
                      <label className={labelClass}>Giá *</label>
                      <input data-error-key={`${prefix}-price`} className={inputClass} value={variant.price} disabled={disabled} inputMode="numeric" onChange={(event) => updateVariant(variant.localId, { price: formatMoneyInput(event.target.value) })} />
                      <FieldError message={errors[`${prefix}-price`]} />
                    </div>
                    <div>
                      <label className={labelClass}>Giá sale</label>
                      <input data-error-key={`${prefix}-sale`} className={inputClass} value={variant.salePrice} disabled={disabled} inputMode="numeric" onChange={(event) => updateVariant(variant.localId, { salePrice: formatMoneyInput(event.target.value) })} />
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
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+5.8rem)] z-[45] border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:bottom-0 lg:left-[255px]">
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
