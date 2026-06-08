import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ImagePlus, CalendarDays, ChevronRight, CircleHelp, Link2, Check, Clock3, X, ChevronUp, ChevronDown, Trash2, Plus, Monitor, Smartphone, Eye, Copy, Search, RotateCcw, GripVertical } from 'lucide-react';

import { tipService } from '../../../services/tipService';
import { tipCategoryService } from '../../../services/tipCategoryService';
import { productService } from '../../../services/productService';
import { useToast } from '../../../components/Toast';
import AppSelect from '../../../components/common/AppSelect';
import { parseApiError } from '../../../utils/apiError';
import { fromDateTimeLocalInput, toDateTimeLocalInput } from '../../../utils/dateTime';
import { createBlock } from '../../../data/tipTemplates';
import { toProductDetailPath } from '../../../utils/productUrl';
import { getProductPricing } from '../../../utils/productPricing';
import TipBlocksRenderer from '../../../components/tips/TipBlocksRenderer';

const fallbackImage = 'https://res.cloudinary.com/diwxfpt92/image/upload/v1770981822/logo_d2wmlf.png';

const slugify = (value) =>
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

const TipEditor = () => {
  const { id } = useParams();
  const tipId = Number(id || 0);
  const isEdit = Number.isFinite(tipId) && tipId > 0;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBlockKey, setUploadingBlockKey] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [categoryItems, setCategoryItems] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [collapsedBlocks, setCollapsedBlocks] = useState({});
  const [blockSearch, setBlockSearch] = useState('');
  const [autosaveAt, setAutosaveAt] = useState(null);
  const [hasRestorableDraft, setHasRestorableDraft] = useState(false);
  const [seoTitleTouched, setSeoTitleTouched] = useState(false);
  const [seoDescTouched, setSeoDescTouched] = useState(false);
  const [draggingBlockIndex, setDraggingBlockIndex] = useState(null);
  const [dragOverBlockIndex, setDragOverBlockIndex] = useState(null);
  const [insertTypeByIndex, setInsertTypeByIndex] = useState({});

  const draftStorageKey = useMemo(() => `tip-editor-draft:${isEdit ? `edit-${tipId}` : 'new'}`, [isEdit, tipId]);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    content_blocks: [],
    featured_image: '',
    category: '',
    tagsText: '',
    status: 'draft',
    featured: false,
    seo_title: '',
    seo_description: '',
    published_at: '',
  });

  useEffect(() => {
    if (!isEdit) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const data = await tipService.getAdminTipById(tipId);
        if (cancelled) return;

        setForm({
          title: data?.title || '',
          slug: data?.slug || '',
          excerpt: data?.excerpt || '',
          content: data?.content || '',
          content_blocks: normalizeTocBlocks(Array.isArray(data?.content_blocks) ? data.content_blocks : []),
          featured_image: data?.featured_image || '',
          category: data?.category || '',
          tagsText: Array.isArray(data?.tags) ? data.tags.join(', ') : '',
          status: data?.status || 'draft',
          featured: Boolean(data?.featured),
          seo_title: data?.seo_title || '',
          seo_description: data?.seo_description || '',
          published_at: toDateTimeLocalInput(data?.published_at),
        });

        const sourceTitle = String(data?.title || '').trim();
        const sourceExcerpt = String(data?.excerpt || '').trim();
        const seoTitle = String(data?.seo_title || '').trim();
        const seoDescription = String(data?.seo_description || '').trim();

        setSeoTitleTouched(Boolean(seoTitle) && seoTitle !== sourceTitle);
        setSeoDescTouched(Boolean(seoDescription) && seoDescription !== sourceExcerpt);
        setSlugTouched(true);
      } catch (error) {
        const parsed = parseApiError(error);
        showToast(parsed?.message || 'Không tải được bài viết', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isEdit, tipId, showToast]);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const response = await tipCategoryService.getAdminTipCategories({ is_active: true });
        if (cancelled) return;
        setCategoryItems(Array.isArray(response?.data) ? response.data : []);
      } catch (_error) {
        if (!cancelled) setCategoryItems([]);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCatalogProducts = async () => {
      try {
        setCatalogLoading(true);
        const data = await productService.getStorefrontProducts({
          page: 1,
          limit: 100,
          status: 'active',
        });

        if (!cancelled) {
          setCatalogProducts(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setCatalogProducts([]);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    };

    loadCatalogProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slugTouched) return;
    setForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
  }, [form.title, slugTouched]);

  useEffect(() => {
    if (loading || seoTitleTouched) return;
    const sourceTitle = String(form.title || '').trim();
    setForm((prev) => {
      const currentSeoTitle = String(prev.seo_title || '');
      return currentSeoTitle === sourceTitle ? prev : { ...prev, seo_title: sourceTitle };
    });
  }, [form.title, loading, seoTitleTouched]);

  useEffect(() => {
    if (loading || seoDescTouched) return;
    const sourceExcerpt = String(form.excerpt || '').trim();
    setForm((prev) => {
      const currentSeoDescription = String(prev.seo_description || '');
      return currentSeoDescription === sourceExcerpt ? prev : { ...prev, seo_description: sourceExcerpt };
    });
  }, [form.excerpt, loading, seoDescTouched]);

  const normalizeTocBlocks = (blocks) => {
    const list = Array.isArray(blocks) ? blocks.filter(Boolean) : [];
    const firstToc = list.find((item) => item?.type === 'toc');
    if (!firstToc) return list;
    const withoutToc = list.filter((item) => item?.type !== 'toc');
    return [firstToc, ...withoutToc];
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) {
        setHasRestorableDraft(false);
        return;
      }
      const parsed = JSON.parse(raw);
      setHasRestorableDraft(Boolean(parsed?.form));
      if (parsed?.saved_at) setAutosaveAt(parsed.saved_at);
    } catch {
      setHasRestorableDraft(false);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (loading) return;
    const timer = window.setTimeout(() => {
      try {
        const payload = {
          form,
          slugTouched,
          seoTitleTouched,
          seoDescTouched,
          saved_at: Date.now(),
        };
        window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
        setAutosaveAt(payload.saved_at);
        setHasRestorableDraft(true);
      } catch {
        // Ignore localStorage write errors.
      }
    }, 550);

    return () => window.clearTimeout(timer);
  }, [loading, draftStorageKey, form, slugTouched, seoTitleTouched, seoDescTouched]);

  useEffect(() => {
    const onSaveShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 's') {
        event.preventDefault();
        if (saving) return;
        formRef.current?.requestSubmit();
      }
    };

    window.addEventListener('keydown', onSaveShortcut);
    return () => window.removeEventListener('keydown', onSaveShortcut);
  }, [saving]);

  const tags = useMemo(
    () =>
      String(form.tagsText || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    [form.tagsText],
  );

  const seoTitleCount = String(form.seo_title || '').trim().length;
  const seoDescCount = String(form.seo_description || '').trim().length;
  const seoTitlePercent = Math.min(100, Math.round((seoTitleCount / 70) * 100));
  const seoDescPercent = Math.min(100, Math.round((seoDescCount / 160) * 100));
  const publishedDate = form.published_at ? form.published_at.slice(0, 10) : '';
  const publishedTime = form.published_at ? form.published_at.slice(11, 16) : '';

  const statusOptions = [
    { value: 'published', label: 'Công khai' },
    { value: 'draft', label: 'Nháp' },
    { value: 'archived', label: 'Lưu trữ' },
  ];

  const categoryPresets = useMemo(
    () => categoryItems.map((item) => String(item?.name || '').trim()).filter(Boolean),
    [categoryItems],
  );

  const updateBlock = (index, patch) => {
    setForm((prev) => {
      const blocks = Array.isArray(prev.content_blocks) ? [...prev.content_blocks] : [];
      const current = blocks[index] || {};
      blocks[index] = { ...current, ...patch };
      return { ...prev, content_blocks: blocks };
    });
  };

  const removeBlock = (index) => {
    setForm((prev) => {
      const blocks = Array.isArray(prev.content_blocks) ? [...prev.content_blocks] : [];
      blocks.splice(index, 1);
      return { ...prev, content_blocks: blocks };
    });
  };

  const duplicateBlock = (index) => {
    setForm((prev) => {
      const blocks = Array.isArray(prev.content_blocks) ? [...prev.content_blocks] : [];
      const current = blocks[index];
      if (!current) return prev;

      if (current.type === 'toc') {
        showToast('Mục lục chỉ có một block duy nhất.', 'info');
        return { ...prev, content_blocks: normalizeTocBlocks(blocks) };
      }

      const cloned = JSON.parse(JSON.stringify(current));
      cloned.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      blocks.splice(index + 1, 0, cloned);
      return { ...prev, content_blocks: blocks };
    });
  };

  const toggleBlockCollapsed = (index) => {
    setCollapsedBlocks((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const collapseAllBlocks = (nextCollapsed) => {
    const blocks = Array.isArray(form.content_blocks) ? form.content_blocks : [];
    const next = {};
    blocks.forEach((_, idx) => {
      next[idx] = nextCollapsed;
    });
    setCollapsedBlocks(next);
  };

  const moveBlock = (index, direction) => {
    setForm((prev) => {
      const blocks = Array.isArray(prev.content_blocks) ? [...prev.content_blocks] : [];
      const target = index + direction;
      if (target < 0 || target >= blocks.length) return prev;
      const temp = blocks[index];
      blocks[index] = blocks[target];
      blocks[target] = temp;
      return { ...prev, content_blocks: normalizeTocBlocks(blocks) };
    });
  };

  const reorderBlocksByDrag = (fromIndex, toIndex) => {
    if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex)) return;
    if (fromIndex === toIndex) return;

    setForm((prev) => {
      const blocks = Array.isArray(prev.content_blocks) ? [...prev.content_blocks] : [];
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= blocks.length || toIndex >= blocks.length) return prev;

      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);
      return { ...prev, content_blocks: normalizeTocBlocks(blocks) };
    });
  };

  const handleBlockDragStart = (index, event) => {
    setDraggingBlockIndex(index);
    setDragOverBlockIndex(index);
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  };

  const handleBlockDragOver = (index, event) => {
    event.preventDefault();
    setDragOverBlockIndex(index);
    if (event?.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  };

  const handleBlockDrop = (index, event) => {
    event.preventDefault();
    const fallbackIndex = Number(event?.dataTransfer?.getData('text/plain'));
    const fromIndex = Number.isFinite(draggingBlockIndex) ? draggingBlockIndex : fallbackIndex;
    reorderBlocksByDrag(fromIndex, index);
    setDraggingBlockIndex(null);
    setDragOverBlockIndex(null);
  };

  const handleBlockDragEnd = () => {
    setDraggingBlockIndex(null);
    setDragOverBlockIndex(null);
  };

  const insertBlockAt = (blockType, insertIndex = null) => {
    if (blockType === 'toc') {
      const currentBlocks = Array.isArray(form.content_blocks) ? form.content_blocks : [];
      const hasToc = currentBlocks.some((item) => item?.type === 'toc');

      setForm((prev) => {
        const blocks = Array.isArray(prev.content_blocks) ? prev.content_blocks : [];
        if (blocks.some((item) => item?.type === 'toc')) {
          return { ...prev, content_blocks: normalizeTocBlocks(blocks) };
        }
        return { ...prev, content_blocks: [createBlock('toc'), ...blocks] };
      });

      showToast(hasToc ? 'Bài viết chỉ có 1 mục lục. Đã đưa mục lục lên đầu.' : 'Đã thêm mục lục ở đầu bài.', 'info');
      return;
    }

    setForm((prev) => ({
      ...prev,
      content_blocks: (() => {
        const blocks = Array.isArray(prev.content_blocks) ? [...prev.content_blocks] : [];
        const safeIndex = Number.isFinite(insertIndex)
          ? Math.max(0, Math.min(blocks.length, Number(insertIndex)))
          : blocks.length;
        blocks.splice(safeIndex, 0, createBlock(blockType));
        return normalizeTocBlocks(blocks);
      })(),
    }));
  };

  const addBlockByType = (blockType) => {
    insertBlockAt(blockType);
  };

  const quickBlockTypes = [
    'toc',
    'heading',
    'paragraph',
    'image',
    'image_text',
    'gallery',
    'video',
    'quote',
    'checklist',
    'list',
    'faq',
    'table',
    'products',
    'divider',
    'spacer',
    'callout',
    'cta',
  ];

  const blockTypeLabel = (type) => {
    const map = {
      toc: 'Mục lục',
      heading: 'Tiêu đề',
      paragraph: 'Đoạn văn',
      image: 'Ảnh đơn',
      image_text: 'Ảnh + Nội dung',
      gallery: 'Gallery ảnh',
      video: 'Video',
      quote: 'Trích dẫn',
      checklist: 'Checklist',
      list: 'Danh sách',
      faq: 'FAQ',
      table: 'Bảng',
      products: 'Sản phẩm liên quan',
      divider: 'Đường phân cách',
      spacer: 'Khoảng trống',
      callout: 'Highlight Box',
      cta: 'Call To Action',
    };
    return map[type] || type;
  };

  const blockPreviewText = (block) => {
    if (!block || typeof block !== 'object') return '';
    if (block.type === 'heading' || block.type === 'paragraph') return String(block.text || '').trim();
    if (block.type === 'quote') return String(block.quote || '').trim();
    if (block.type === 'products') return `${Array.isArray(block.items) ? block.items.length : 0} sản phẩm`;
    if (block.type === 'faq') return `${Array.isArray(block.items) ? block.items.length : 0} câu hỏi`;
    return String(block.title || '').trim();
  };

  const parseFaqLines = (raw) =>
    String(raw || '')
      .split('\n')
      .map((line) => String(line || ''))
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf('|');
        const hasSeparator = separatorIndex >= 0;
        const questionRaw = hasSeparator ? line.slice(0, separatorIndex) : line;
        const answerRaw = hasSeparator ? line.slice(separatorIndex + 1) : '';
        return {
          question: String(questionRaw || ''),
          answer: String(answerRaw || ''),
          _has_separator: hasSeparator,
        };
      })
      .filter((item) => item.question || item.answer || item._has_separator);

  const serializeFaqLines = (items) => {
    if (!Array.isArray(items)) return '';
    return items
      .map((item) => {
        const question = String(item?.question || '');
        const answer = String(item?.answer || '');
        const hasSeparator = Boolean(item?._has_separator);
        if (!question && !answer && !hasSeparator) return '';
        return hasSeparator || answer ? `${question} | ${answer}` : question;
      })
      .filter(Boolean)
      .join('\n');
  };

  const parseProductLines = (raw) =>
    String(raw || '')
      .split('\n')
      .map((line) => String(line || ''))
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const [name = '', url = '', image = '', price = ''] = line.split('|').map((part) => String(part || '').trim());
        return { name, url, image, price };
      })
      .filter((item) => item.name || item.url || item.image || item.price);

  const serializeProductLines = (items) => {
    if (!Array.isArray(items)) return '';
    return items
      .map((item) => {
        const name = String(item?.name || '').trim();
        const url = String(item?.url || '').trim();
        const image = String(item?.image || '').trim();
        const price = String(item?.price || '').trim();
        if (!name && !url && !image && !price) return '';
        return [name, url, image, price].join(' | ');
      })
      .filter(Boolean)
      .join('\n');
  };

  const sanitizeBlocksForSave = (blocks) => {
    const normalizedBlocks = normalizeTocBlocks(blocks);
    if (!Array.isArray(normalizedBlocks)) return [];

    return normalizedBlocks.map((block) => {
      if (!block || typeof block !== 'object') return block;
      const next = { ...block };
      delete next.faq_text;
      delete next.products_text;
      delete next.product_search;
      if (next.type === 'faq' && Array.isArray(next.items)) {
        next.items = next.items
          .map((item) => ({
            question: String(item?.question || '').trim(),
            answer: String(item?.answer || '').trim(),
          }))
          .filter((item) => item.question || item.answer);
      }
      if (next.type === 'products' && Array.isArray(next.items)) {
        next.items = next.items
          .map((item) => ({
            name: String(item?.name || '').trim(),
            url: String(item?.url || '').trim(),
            image: String(item?.image || '').trim(),
            price: String(item?.price || '').trim(),
          }))
          .filter((item) => item.name || item.url || item.image || item.price);
      }
      return next;
    });
  };

  const parseTableRows = (raw) =>
    String(raw || '')
      .split('\n')
      .map((line) =>
        String(line || '')
          .split('|')
          .map((cell) => String(cell || '').trim())
      )
      .filter((row) => row.some(Boolean));

  const upsertTag = (raw) => {
    const value = String(raw || '').trim();
    if (!value) return;
    const next = Array.from(new Set([...tags, value]));
    setForm((prev) => ({ ...prev, tagsText: next.join(', ') }));
    setTagDraft('');
  };

  const removeTag = (value) => {
    const next = tags.filter((tag) => tag.toLowerCase() !== String(value).toLowerCase());
    setForm((prev) => ({ ...prev, tagsText: next.join(', ') }));
  };

  const restoreLocalDraft = () => {
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed?.form || typeof parsed.form !== 'object') return;
      setForm((prev) => ({
        ...prev,
        ...parsed.form,
        content_blocks: normalizeTocBlocks(parsed?.form?.content_blocks),
      }));
      setSlugTouched(Boolean(parsed?.slugTouched));
      setSeoTitleTouched(Boolean(parsed?.seoTitleTouched));
      setSeoDescTouched(Boolean(parsed?.seoDescTouched));
      showToast('Đã khôi phục nháp cục bộ', 'success');
    } catch {
      showToast('Không thể khôi phục nháp cục bộ', 'warning');
    }
  };

  const clearLocalDraft = () => {
    try {
      window.localStorage.removeItem(draftStorageKey);
      setHasRestorableDraft(false);
      showToast('Đã xoá nháp cục bộ', 'success');
    } catch {
      showToast('Không thể xoá nháp cục bộ', 'warning');
    }
  };

  const formatVnd = (value) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const updatePublishedDateTime = (nextDate, nextTime) => {
    if (!nextDate) {
      setForm((prev) => ({ ...prev, published_at: '' }));
      return;
    }
    const safeTime = nextTime || '00:00';
    setForm((prev) => ({ ...prev, published_at: `${nextDate}T${safeTime}` }));
  };

  const schedulePreview = useMemo(() => {
    if (!form.published_at) return '';
    const date = new Date(form.published_at);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }, [form.published_at]);

  const previewDateText = useMemo(() => {
    const source = form.published_at || null;
    if (!source) return 'Chưa đặt lịch xuất bản';
    const date = new Date(source);
    if (Number.isNaN(date.getTime())) return 'Chưa đặt lịch xuất bản';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }, [form.published_at]);

  const previewHasBlocks = Array.isArray(form.content_blocks) && form.content_blocks.length > 0;
  const previewContentIsHtml = /<\/?[a-z][\s\S]*>/i.test(String(form.content || ''));
  const contentBlocks = Array.isArray(form.content_blocks) ? form.content_blocks : [];
  const blockCount = Array.isArray(form.content_blocks) ? form.content_blocks.length : 0;
  const blockSearchKeyword = String(blockSearch || '').trim().toLowerCase();
  const filteredQuickBlockTypes = quickBlockTypes.filter((type) => {
    if (!blockSearchKeyword) return true;
    return blockTypeLabel(type).toLowerCase().includes(blockSearchKeyword) || type.toLowerCase().includes(blockSearchKeyword);
  });

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!String(form.title).trim()) {
      showToast('Vui lòng nhập tiêu đề', 'warning');
      return;
    }

    const payload = {
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt || null,
      content: form.content || null,
      template_key: null,
      content_blocks: sanitizeBlocksForSave(form.content_blocks),
      featured_image: form.featured_image || null,
      category: form.category || null,
      tags,
      status: form.status,
      featured: form.featured,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      published_at: fromDateTimeLocalInput(form.published_at),
    };

    try {
      setSaving(true);
      if (isEdit) {
        await tipService.updateAdminTip(tipId, payload);
        showToast('Đã cập nhật bài viết', 'success');
      } else {
        await tipService.createAdminTip(payload);
        showToast('Đã tạo bài viết mới', 'success');
      }
      window.localStorage.removeItem(draftStorageKey);
      setHasRestorableDraft(false);
      navigate('/admin/tips');
    } catch (error) {
      const parsed = parseApiError(error);
      showToast(parsed?.message || 'Không thể lưu bài viết', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const data = await tipService.uploadAdminTipImage(file);
      setForm((prev) => ({ ...prev, featured_image: data?.url || prev.featured_image }));
      showToast('Đã tải ảnh lên', 'success');
    } catch (error) {
      const parsed = parseApiError(error);
      showToast(parsed?.message || 'Không thể tải ảnh', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleBlockImageUpload = async (index, field, file) => {
    if (!file) return;
    const key = `${index}:${field}`;
    try {
      setUploadingBlockKey(key);
      const data = await tipService.uploadAdminTipImage(file);
      updateBlock(index, { [field]: data?.url || '' });
      showToast('Đã tải ảnh lên block', 'success');
    } catch (error) {
      const parsed = parseApiError(error);
      showToast(parsed?.message || 'Không thể tải ảnh block', 'error');
    } finally {
      setUploadingBlockKey('');
    }
  };

  const handleGalleryImageUpload = async (index, files) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;

    const key = `${index}:gallery`;
    try {
      setUploadingBlockKey(key);
      const uploadedUrls = [];
      for (const file of list) {
        const data = await tipService.uploadAdminTipImage(file);
        if (data?.url) uploadedUrls.push(data.url);
      }

      setForm((prev) => {
        const blocks = Array.isArray(prev.content_blocks) ? [...prev.content_blocks] : [];
        const current = blocks[index] || {};
        const currentImages = Array.isArray(current.images) ? current.images : [];
        blocks[index] = { ...current, images: [...currentImages, ...uploadedUrls] };
        return { ...prev, content_blocks: blocks };
      });

      showToast(`Đã tải ${uploadedUrls.length} ảnh vào gallery`, 'success');
    } catch (error) {
      const parsed = parseApiError(error);
      showToast(parsed?.message || 'Không thể tải ảnh gallery', 'error');
    } finally {
      setUploadingBlockKey('');
    }
  };

  if (loading) {
    return <div className="rounded-3xl bg-[#f4ede2] p-8 text-center text-[#635f54]">Đang tải dữ liệu bài viết...</div>;
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="mx-auto max-w-7xl space-y-6 text-[#353229]">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-[#7f7a6f]">
          <span>Mẹo chăm sóc</span>
          <ChevronRight size={14} />
          <span className="font-semibold text-[#8a4f41]">{isEdit ? 'Cập nhật bài viết' : 'Tạo bài viết mới'}</span>
        </div>
        <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf3] px-4 py-3 text-xs text-[#6e675d]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-[#5f5950]">Tiến độ:</span>
            <span>{String(form.title || '').trim() ? 'Tiêu đề: xong' : 'Tiêu đề: thiếu'}</span>
            <span>{String(form.slug || '').trim() ? 'Slug: xong' : 'Slug: thiếu'}</span>
            <span>{blockCount > 0 ? `Blocks: ${blockCount}` : 'Blocks: chưa có'}</span>
            <span>{autosaveAt ? `Tự lưu: ${new Date(autosaveAt).toLocaleTimeString('vi-VN')}` : 'Tự lưu: chưa có'}</span>
            <span className="font-semibold text-[#7d4f3f]">Mẹo: nhấn Ctrl+S để lưu nhanh</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#8a4f41]">{isEdit ? 'Cập nhật bài viết' : 'Tạo bài viết mới'}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {hasRestorableDraft ? (
            <>
              <button
                type="button"
                onClick={restoreLocalDraft}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e6dac9] bg-white px-3 py-2 text-xs font-bold text-[#635f54] hover:bg-[#fff9f0]"
              >
                <RotateCcw size={13} /> Khôi phục nháp
              </button>
              <button
                type="button"
                onClick={clearLocalDraft}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#ead9d5] bg-white px-3 py-2 text-xs font-bold text-[#8a4f41] hover:bg-[#fff7f6]"
              >
                <Trash2 size={13} /> Xoá nháp local
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#fff7f6] px-4 py-2.5 text-sm font-bold text-[#8a4f41] shadow-sm hover:bg-white"
          >
            <Eye size={15} /> Preview
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/tips')}
            className="rounded-full px-6 py-2.5 font-bold text-[#635f54] transition hover:bg-[#e9e2d4]"
          >
            Huỷ
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#8a4f41] px-6 py-2.5 font-bold text-white shadow-[0_8px_20px_rgba(138,79,65,0.28)] transition hover:opacity-90 disabled:opacity-60"
          >
            <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu bài viết'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <section className="space-y-5 rounded-[2rem] bg-[#f4ede2] p-6 md:p-8">
            <div>
              <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Tiêu đề bài viết</label>
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-2xl border-none bg-white px-4 py-3 text-lg font-bold text-[#353229] placeholder:text-[#9a958a] focus:ring-2 focus:ring-[#fdb19f]"
                placeholder="Ví dụ: Cách chọn size áo cho cún con..."
              />
            </div>

            <div>
              <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Slug / URL</label>
              <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm">
                <span className="whitespace-nowrap text-[#8f8a80]">locsang.shop/care/</span>
                <input
                  value={form.slug}
                  maxLength={260}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }));
                  }}
                  className="w-full border-none bg-transparent p-0 text-sm font-semibold text-[#5a564f] focus:ring-0"
                  placeholder="cach-chon-size-ao"
                />
              </div>
              <p className="mt-1 ml-2 text-xs text-[#8f8a80]">Tối đa 260 ký tự</p>
            </div>

            <div>
              <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Mô tả ngắn (Meta description)</label>
              <textarea
                value={form.excerpt}
                onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
                rows={3}
                className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm text-[#4e4a43] placeholder:text-[#9a958a] focus:ring-2 focus:ring-[#fdb19f]"
                placeholder="Tóm tắt ngắn gọn nội dung bài viết để thu hút người đọc..."
              />
            </div>

            <div>
              <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Khối nội dung</label>
              <div className="space-y-3 rounded-2xl border border-[#ddd5c7] bg-white p-4">
                <div className="rounded-xl border border-[#ece3d2] bg-[#fbf8f2] p-3 text-xs text-[#7f7a6f]">
                  Thêm block thủ công theo nhu cầu. Không dùng template có sẵn.
                </div>

                <div className="rounded-xl border border-[#ece3d2] bg-[#fbf8f2] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-bold text-[#5f5950]">Khối nội dung</div>
                    <div className="text-xs text-[#8b857a]">{Array.isArray(form.content_blocks) ? form.content_blocks.length : 0} block</div>
                  </div>

                  <div className="space-y-3">
                    {contentBlocks.map((block, index) => (
                      <div key={block.id || `${block.type}-${index}`} className="space-y-2.5 group/insert">
                        <div
                          onDragOver={(event) => handleBlockDragOver(index, event)}
                          onDrop={(event) => handleBlockDrop(index, event)}
                          className={`rounded-xl border bg-white p-3 ${dragOverBlockIndex === index ? 'border-[#cfae90] ring-2 ring-[#ead7c4]' : 'border-[#e8e0d1]'}`}
                        >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="rounded-full bg-[#f4ede2] px-2.5 py-1 text-xs font-bold text-[#6a6358]">
                            {index + 1}. {blockTypeLabel(block.type)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              draggable
                              onDragStart={(event) => handleBlockDragStart(index, event)}
                              onDragEnd={handleBlockDragEnd}
                              className="cursor-grab rounded-md p-1 text-[#7d776c] hover:bg-[#f4ede2] active:cursor-grabbing"
                              title="Kéo để đổi vị trí"
                            >
                              <GripVertical size={14} />
                            </button>
                            <button type="button" onClick={() => duplicateBlock(index)} className="rounded-md p-1 text-[#7d776c] hover:bg-[#f4ede2]" title="Nhân bản block">
                              <Copy size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleBlockCollapsed(index)}
                              className="rounded-md p-1 text-[#7d776c] hover:bg-[#f4ede2]"
                              title={collapsedBlocks[index] ? 'Mở rộng block' : 'Thu gọn block'}
                            >
                              {collapsedBlocks[index] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                            </button>
                            <button type="button" onClick={() => removeBlock(index)} className="rounded-md p-1 text-[#9e404a] hover:bg-[#fde9eb]">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {collapsedBlocks[index] ? (
                          <div className="rounded-lg border border-dashed border-[#e4dcca] bg-[#faf7f1] px-3 py-2 text-xs text-[#7a7368]">
                            {blockPreviewText(block) || 'Block đã được thu gọn. Bấm mũi tên để mở rộng.'}
                          </div>
                        ) : null}

                        {!collapsedBlocks[index] && (
                          <>

                        {block.type === 'heading' && (
                          <div className="grid gap-2 md:grid-cols-4">
                            <input
                              value={block.text || ''}
                              onChange={(event) => updateBlock(index, { text: event.target.value })}
                              className="md:col-span-3 rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Tiêu đề"
                            />
                            <AppSelect
                              value={block.level || 2}
                              onChange={(event) => updateBlock(index, { level: Number(event.target.value) })}
                              className="rounded-lg py-2"
                            >
                              <option value={2}>H2</option>
                              <option value={3}>H3</option>
                              <option value={4}>H4</option>
                            </AppSelect>
                          </div>
                        )}

                        {block.type === 'toc' && (
                          <div className="space-y-2">
                            <input
                              value={block.title || ''}
                              onChange={(event) => updateBlock(index, { title: event.target.value })}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Tiêu đề mục lục"
                            />
                            <AppSelect
                              value={String(Number(block.max_items || 20))}
                              onChange={(event) => updateBlock(index, { max_items: Number(event.target.value) || 20 })}
                              className="w-full rounded-lg py-2"
                            >
                              <option value="8">Hiển thị tối đa 8 mục</option>
                              <option value="12">Hiển thị tối đa 12 mục</option>
                              <option value="20">Hiển thị tối đa 20 mục</option>
                              <option value="30">Hiển thị tối đa 30 mục</option>
                            </AppSelect>
                            <p className="text-xs text-[#7f7a6f]">Block này tự lấy các block Tiêu đề (H2/H3/H4) làm mục lục.</p>
                          </div>
                        )}

                        {block.type === 'paragraph' && (
                          <textarea
                            value={block.text || ''}
                            onChange={(event) => updateBlock(index, { text: event.target.value })}
                            rows={4}
                            className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                            placeholder="Nội dung đoạn văn"
                          />
                        )}

                        {block.type === 'image' && (
                          <div className="space-y-2">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#fff7f6] px-3 py-1.5 text-xs font-bold text-[#8a4f41] hover:bg-white">
                              <ImagePlus size={14} />
                              {uploadingBlockKey === `${index}:url` ? 'Đang upload...' : block.url ? 'Đổi ảnh' : 'Upload ảnh'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => handleBlockImageUpload(index, 'url', event.target.files?.[0])}
                              />
                            </label>
                            {block.url ? (
                              <button
                                type="button"
                                onClick={() => updateBlock(index, { url: '' })}
                                className="ml-2 inline-flex items-center gap-1 rounded-full border border-[#e3dac8] px-3 py-1.5 text-xs font-semibold text-[#7a7368] hover:bg-[#f8f1e6]"
                              >
                                <X size={12} /> Xoá ảnh
                              </button>
                            ) : null}
                            <input
                              value={block.caption || ''}
                              onChange={(event) => updateBlock(index, { caption: event.target.value })}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Caption ảnh"
                            />
                            {block.url ? (
                              <div className="overflow-hidden rounded-xl border border-[#e7dece] bg-[#f8f3ea]">
                                <img src={block.url} alt={block.caption || 'Preview'} className="h-44 w-full object-cover" />
                              </div>
                            ) : null}
                          </div>
                        )}

                        {block.type === 'image_text' && (
                          <div className="space-y-2">
                            <input
                              value={block.title || ''}
                              onChange={(event) => updateBlock(index, { title: event.target.value })}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Tiêu đề"
                            />
                            <textarea
                              value={block.text || ''}
                              onChange={(event) => updateBlock(index, { text: event.target.value })}
                              rows={3}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Nội dung"
                            />
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#fff7f6] px-3 py-1.5 text-xs font-bold text-[#8a4f41] hover:bg-white">
                              <ImagePlus size={14} />
                              {uploadingBlockKey === `${index}:image_url` ? 'Đang upload...' : block.image_url ? 'Đổi ảnh' : 'Upload ảnh'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) => handleBlockImageUpload(index, 'image_url', event.target.files?.[0])}
                              />
                            </label>
                            {block.image_url ? (
                              <button
                                type="button"
                                onClick={() => updateBlock(index, { image_url: '' })}
                                className="ml-2 inline-flex items-center gap-1 rounded-full border border-[#e3dac8] px-3 py-1.5 text-xs font-semibold text-[#7a7368] hover:bg-[#f8f1e6]"
                              >
                                <X size={12} /> Xoá ảnh
                              </button>
                            ) : null}
                            <AppSelect
                              value={block.image_position || 'left'}
                              onChange={(event) => updateBlock(index, { image_position: event.target.value })}
                              className="w-full rounded-lg py-2"
                            >
                              <option value="left">Ảnh bên trái</option>
                              <option value="right">Ảnh bên phải</option>
                            </AppSelect>
                            {block.image_url ? (
                              <div className="overflow-hidden rounded-xl border border-[#e7dece] bg-[#f8f3ea]">
                                <img src={block.image_url} alt={block.title || 'Preview'} className="h-44 w-full object-cover" />
                              </div>
                            ) : null}
                          </div>
                        )}

                        {block.type === 'gallery' && (
                          <div className="space-y-2">
                            <input
                              value={block.title || ''}
                              onChange={(event) => updateBlock(index, { title: event.target.value })}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Tiêu đề gallery"
                            />
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#fff7f6] px-3 py-1.5 text-xs font-bold text-[#8a4f41] hover:bg-white">
                              <ImagePlus size={14} />
                              {uploadingBlockKey === `${index}:gallery` ? 'Đang upload...' : 'Upload nhiều ảnh'}
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(event) => handleGalleryImageUpload(index, event.target.files)}
                              />
                            </label>
                            {Array.isArray(block.images) && block.images.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => updateBlock(index, { images: [] })}
                                className="ml-2 inline-flex items-center gap-1 rounded-full border border-[#e3dac8] px-3 py-1.5 text-xs font-semibold text-[#7a7368] hover:bg-[#f8f1e6]"
                              >
                                <X size={12} /> Xoá tất cả ảnh
                              </button>
                            ) : null}
                            {Array.isArray(block.images) && block.images.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {block.images.map((url, imageIndex) => (
                                  <div key={`${url}-${imageIndex}`} className="group relative overflow-hidden rounded-lg border border-[#e7dece] bg-[#f8f3ea]">
                                    <img src={url} alt={`Gallery ${imageIndex + 1}`} className="h-24 w-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextImages = block.images.filter((_, idx) => idx !== imageIndex);
                                        updateBlock(index, { images: nextImages });
                                      }}
                                      className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-[#2f2722]/70 text-white group-hover:inline-flex"
                                      title="Xoá ảnh"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )}

                        {block.type === 'video' && (
                          <div className="space-y-2">
                            <input
                              value={block.title || ''}
                              onChange={(event) => updateBlock(index, { title: event.target.value })}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Tiêu đề video"
                            />
                            <input
                              value={block.url || ''}
                              onChange={(event) => updateBlock(index, { url: event.target.value })}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="URL YouTube/Vimeo"
                            />
                            <textarea
                              value={block.description || ''}
                              onChange={(event) => updateBlock(index, { description: event.target.value })}
                              rows={2}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Mô tả ngắn"
                            />
                          </div>
                        )}

                        {block.type === 'quote' && (
                          <div className="space-y-2">
                            <textarea
                              value={block.quote || ''}
                              onChange={(event) => updateBlock(index, { quote: event.target.value })}
                              rows={3}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Nội dung trích dẫn"
                            />
                            <input
                              value={block.author || ''}
                              onChange={(event) => updateBlock(index, { author: event.target.value })}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Tác giả trích dẫn"
                            />
                          </div>
                        )}

                        {block.type === 'checklist' && (
                          <div className="space-y-2">
                            <input
                              value={block.title || ''}
                              onChange={(event) => updateBlock(index, { title: event.target.value })}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Tiêu đề checklist"
                            />
                            <textarea
                              value={Array.isArray(block.items) ? block.items.join('\n') : ''}
                              onChange={(event) => updateBlock(index, { items: event.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
                              rows={4}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Mỗi dòng là một item"
                            />
                          </div>
                        )}

                        {block.type === 'list' && (
                          <div className="space-y-2">
                            <input
                              value={block.title || ''}
                              onChange={(event) => updateBlock(index, { title: event.target.value })}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Tiêu đề danh sách"
                            />
                            <AppSelect
                              value={String(Boolean(block.ordered))}
                              onChange={(event) => updateBlock(index, { ordered: event.target.value === 'true' })}
                              className="w-full rounded-lg py-2"
                            >
                              <option value="false">Danh sách chấm tròn</option>
                              <option value="true">Danh sách đánh số</option>
                            </AppSelect>
                            <textarea
                              value={Array.isArray(block.items) ? block.items.join('\n') : ''}
                              onChange={(event) => updateBlock(index, { items: event.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
                              rows={4}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Mỗi dòng là một mục"
                            />
                          </div>
                        )}

                        {block.type === 'faq' && (
                          <div className="space-y-2">
                            <input
                              value={block.title || ''}
                              onChange={(event) => updateBlock(index, { title: event.target.value })}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Tiêu đề FAQ"
                            />
                            <textarea
                              value={typeof block.faq_text === 'string' ? block.faq_text : serializeFaqLines(block.items)}
                              onChange={(event) => {
                                const rawText = event.target.value;
                                updateBlock(index, { faq_text: rawText, items: parseFaqLines(rawText) });
                              }}
                              rows={5}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Mỗi dòng: Câu hỏi | Câu trả lời"
                            />
                          </div>
                        )}

                        {block.type === 'table' && (
                          <div className="space-y-2">
                            <input
                              value={block.title || ''}
                              onChange={(event) => updateBlock(index, { title: event.target.value })}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Tiêu đề bảng"
                            />
                            <input
                              value={Array.isArray(block.headers) ? block.headers.join(', ') : ''}
                              onChange={(event) => updateBlock(index, { headers: event.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Header cột, ngăn cách bởi dấu phẩy"
                            />
                            <textarea
                              value={Array.isArray(block.rows) ? block.rows.map((row) => (Array.isArray(row) ? row.join(' | ') : '')).join('\n') : ''}
                              onChange={(event) => updateBlock(index, { rows: parseTableRows(event.target.value) })}
                              rows={5}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Mỗi dòng là 1 hàng, mỗi ô ngăn cách bằng |"
                            />
                          </div>
                        )}

                        {block.type === 'products' && (() => {
                          const currentItems = Array.isArray(block.items) ? block.items : [];
                          const searchText = String(block.product_search || '');
                          const keyword = searchText.trim().toLowerCase();
                          const catalogMatches = (Array.isArray(catalogProducts) ? catalogProducts : [])
                            .filter((product) => {
                              if (!keyword) return true;
                              const name = String(product?.name || '').toLowerCase();
                              const slug = String(product?.slug || '').toLowerCase();
                              const sku = String(product?.sku || '').toLowerCase();
                              return name.includes(keyword) || slug.includes(keyword) || sku.includes(keyword);
                            })
                            .slice(0, 8);

                          const removeProductItem = (removeIndex) => {
                            const nextItems = currentItems.filter((_, itemIndex) => itemIndex !== removeIndex);
                            updateBlock(index, {
                              items: nextItems,
                              products_text: serializeProductLines(nextItems),
                            });
                          };

                          const addCatalogProduct = (product) => {
                            const detailPath = toProductDetailPath(product);
                            const duplicate = currentItems.some((item) => String(item?.url || '').trim() === detailPath);
                            if (duplicate) {
                              showToast('Sản phẩm này đã có trong block', 'info');
                              return;
                            }

                            const pricing = getProductPricing(product);
                            const currentPrice = Number(pricing.currentPrice || 0);
                            const priceText = currentPrice > 0
                              ? (pricing.originalPrice
                                ? `${formatVnd(currentPrice)} (gốc ${formatVnd(pricing.originalPrice)})`
                                : formatVnd(currentPrice))
                              : '';

                            const nextItems = [
                              ...currentItems,
                              {
                                name: String(product?.name || '').trim(),
                                url: detailPath,
                                image: String(product?.images?.[0] || product?.thumbnail || '').trim(),
                                price: priceText,
                              },
                            ];

                            updateBlock(index, {
                              items: nextItems,
                              products_text: serializeProductLines(nextItems),
                            });
                          };

                          return (
                            <div className="space-y-3">
                              <input
                                value={block.title || ''}
                                onChange={(event) => updateBlock(index, { title: event.target.value })}
                                className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                                placeholder="Tiêu đề block sản phẩm"
                              />

                              <div className="rounded-lg border border-[#e4dcca] bg-[#fbf8f2] p-2.5">
                                <input
                                  value={searchText}
                                  onChange={(event) => updateBlock(index, { product_search: event.target.value })}
                                  className="w-full rounded-lg border border-[#e4dcca] bg-white px-3 py-2 text-sm"
                                  placeholder="Tìm sản phẩm theo tên, slug, SKU..."
                                />

                                <div className="mt-2 max-h-48 space-y-1 overflow-auto">
                                  {catalogLoading ? (
                                    <div className="rounded-md bg-white px-3 py-2 text-xs text-[#7f7a6f]">Đang tải catalog sản phẩm...</div>
                                  ) : catalogMatches.length > 0 ? (
                                    catalogMatches.map((product) => {
                                      const previewImage = String(product?.images?.[0] || product?.thumbnail || fallbackImage);
                                      const pricing = getProductPricing(product);
                                      return (
                                        <div key={`product-${product.id}`} className="flex items-center gap-2 rounded-md bg-white p-2">
                                          <img src={previewImage} alt={product?.name || 'Product'} className="h-10 w-10 rounded-md object-cover" />
                                          <div className="min-w-0 flex-1">
                                            <div className="truncate text-xs font-semibold text-[#353229]">{product?.name || 'Sản phẩm'}</div>
                                            {Number(pricing.currentPrice || 0) > 0 ? (
                                              <div className="text-[11px] text-[#8a4f41]">{formatVnd(pricing.currentPrice)}</div>
                                            ) : null}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => addCatalogProduct(product)}
                                            className="inline-flex items-center gap-1 rounded-full border border-[#e0d6c6] px-2.5 py-1 text-[11px] font-semibold text-[#5f5950] hover:bg-[#f8f1e6]"
                                          >
                                            <Plus size={11} /> Thêm
                                          </button>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="rounded-md bg-white px-3 py-2 text-xs text-[#7f7a6f]">Không tìm thấy sản phẩm phù hợp.</div>
                                  )}
                                </div>
                              </div>

                              {currentItems.length > 0 ? (
                                <div className="space-y-1 rounded-lg border border-[#e4dcca] bg-white p-2">
                                  {currentItems.map((item, productIndex) => (
                                    <div key={`${item?.url || item?.name || 'item'}-${productIndex}`} className="flex items-center justify-between gap-2 rounded-md bg-[#fbf8f2] px-2.5 py-2">
                                      <div className="min-w-0">
                                        <div className="truncate text-xs font-semibold text-[#353229]">{item?.name || `Sản phẩm ${productIndex + 1}`}</div>
                                        {item?.price ? <div className="text-[11px] text-[#8a4f41]">{item.price}</div> : null}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeProductItem(productIndex)}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#e0d6c6] text-[#8d8578] hover:bg-[#f8f1e6]"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : null}

                              <textarea
                                value={typeof block.products_text === 'string' ? block.products_text : serializeProductLines(block.items)}
                                onChange={(event) => {
                                  const rawText = event.target.value;
                                  updateBlock(index, { products_text: rawText, items: parseProductLines(rawText) });
                                }}
                                rows={6}
                                className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                                placeholder="Mỗi dòng: Tên sản phẩm | Link sản phẩm | Ảnh URL | Giá"
                              />
                              <p className="text-xs text-[#7f7a6f]">Ví dụ: Áo hoodie | /products/12/ao-hoodie | https://...jpg | 249.000đ</p>
                            </div>
                          );
                        })()}

                        {block.type === 'divider' && (
                          <div className="rounded-lg border border-dashed border-[#d9d0be] bg-[#f8f3ea] px-3 py-2 text-xs text-[#7f7a6f]">
                            Block này chỉ để ngăn cách nội dung, không cần nhập dữ liệu.
                          </div>
                        )}

                        {block.type === 'spacer' && (
                          <div className="space-y-2">
                            <AppSelect
                              value={String(Number(block.height || 40))}
                              onChange={(event) => updateBlock(index, { height: Number(event.target.value) || 40 })}
                              className="w-full rounded-lg py-2"
                            >
                              <option value="24">Khoảng trống nhỏ (24px)</option>
                              <option value="40">Khoảng trống vừa (40px)</option>
                              <option value="64">Khoảng trống lớn (64px)</option>
                              <option value="96">Khoảng trống rất lớn (96px)</option>
                            </AppSelect>
                          </div>
                        )}

                        {block.type === 'callout' && (
                          <div className="space-y-2">
                            <input
                              value={block.title || ''}
                              onChange={(event) => updateBlock(index, { title: event.target.value })}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Tiêu đề highlight"
                            />
                            <textarea
                              value={block.text || ''}
                              onChange={(event) => updateBlock(index, { text: event.target.value })}
                              rows={3}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Nội dung highlight"
                            />
                            <AppSelect
                              value={block.tone || 'info'}
                              onChange={(event) => updateBlock(index, { tone: event.target.value })}
                              className="w-full rounded-lg py-2"
                            >
                              <option value="info">Info</option>
                              <option value="warning">Warning</option>
                              <option value="success">Success</option>
                            </AppSelect>
                          </div>
                        )}

                        {block.type === 'cta' && (
                          <div className="space-y-2">
                            <input
                              value={block.title || ''}
                              onChange={(event) => updateBlock(index, { title: event.target.value })}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Tiêu đề CTA"
                            />
                            <textarea
                              value={block.description || ''}
                              onChange={(event) => updateBlock(index, { description: event.target.value })}
                              rows={2}
                              className="w-full rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                              placeholder="Mô tả CTA"
                            />
                            <div className="grid gap-2 md:grid-cols-2">
                              <input
                                value={block.button_text || ''}
                                onChange={(event) => updateBlock(index, { button_text: event.target.value })}
                                className="rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                                placeholder="Nút CTA"
                              />
                              <input
                                value={block.button_url || ''}
                                onChange={(event) => updateBlock(index, { button_url: event.target.value })}
                                className="rounded-lg border border-[#e4dcca] px-3 py-2 text-sm"
                                placeholder="Link CTA"
                              />
                            </div>
                          </div>
                        )}
                          </>
                        )}
                        </div>

                        {index < contentBlocks.length - 1 ? (
                          <div className="relative h-8">
                            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#e2d8c8]" />
                            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-[#e2d8c8] bg-[#fffaf4] px-2 py-1 opacity-0 shadow-sm transition group-hover/insert:pointer-events-auto group-hover/insert:opacity-100 group-focus-within/insert:pointer-events-auto group-focus-within/insert:opacity-100">
                              <span className="text-[11px] font-semibold text-[#7a7368]">Chèn sau block {index + 1}</span>
                              <AppSelect
                                value={insertTypeByIndex[index] || 'paragraph'}
                                onChange={(event) => setInsertTypeByIndex((prev) => ({ ...prev, [index]: event.target.value }))}
                                className="min-w-[150px] rounded-lg border border-[#e4dcca] bg-white py-1 text-xs"
                              >
                                {quickBlockTypes.map((type) => (
                                  <option key={`insert-${index}-${type}`} value={type}>{blockTypeLabel(type)}</option>
                                ))}
                              </AppSelect>
                              <button
                                type="button"
                                onClick={() => insertBlockAt(insertTypeByIndex[index] || 'paragraph', index + 1)}
                                className="inline-flex items-center gap-1 rounded-full border border-[#dacbb7] bg-white px-2.5 py-1 text-xs font-semibold text-[#5f5950] hover:bg-[#fdf6ed]"
                              >
                                <Plus size={12} /> Chèn
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-xl bg-white p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-[#7f7a6f]">Thêm block nhanh (1 chạm)</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => collapseAllBlocks(true)}
                          className="rounded-full border border-[#e5dbc9] px-2.5 py-1 text-[11px] font-semibold text-[#6f695f] hover:bg-[#fbf6ee]"
                        >
                          Thu gọn hết
                        </button>
                        <button
                          type="button"
                          onClick={() => collapseAllBlocks(false)}
                          className="rounded-full border border-[#e5dbc9] px-2.5 py-1 text-[11px] font-semibold text-[#6f695f] hover:bg-[#fbf6ee]"
                        >
                          Mở rộng hết
                        </button>
                      </div>
                    </div>
                    <div className="mb-2 relative">
                      <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9388]" />
                      <input
                        value={blockSearch}
                        onChange={(event) => setBlockSearch(event.target.value)}
                        className="w-full rounded-lg border border-[#e6ddcd] bg-[#fffaf4] py-2 pl-8 pr-3 text-xs text-[#5f5950]"
                        placeholder="Tìm block theo tên..."
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {filteredQuickBlockTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => addBlockByType(type)}
                          className="inline-flex items-center gap-1 rounded-full border border-[#e7dece] bg-[#fffaf5] px-3 py-1.5 text-xs font-semibold text-[#5f5950] hover:border-[#cfbaa2] hover:bg-white"
                        >
                          <Plus size={12} /> {blockTypeLabel(type)}
                        </button>
                      ))}
                      {filteredQuickBlockTypes.length === 0 ? (
                        <div className="text-xs text-[#8f8a80]">Không có block phù hợp từ khoá tìm kiếm.</div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <details className="rounded-xl border border-[#e8e0d1] bg-[#fbf8f2] p-3">
                  <summary className="cursor-pointer text-sm font-bold text-[#5f5950]">Nội dung richtext bổ sung (legacy)</summary>
                  <textarea
                    value={form.content}
                    onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                    rows={8}
                    className="mt-3 w-full resize-y rounded-lg border border-[#e4dcca] px-3 py-3 text-sm leading-7 text-[#4e4a43] placeholder:text-[#9a958a]"
                    placeholder="Dùng khi cần thêm nội dung HTML/richtext cũ..."
                  />
                </details>
              </div>
            </div>
          </section>

          <section className="space-y-5 rounded-[2rem] border border-[#f1d9ca] bg-[#f4ede2] p-6 md:p-8">
            <div className="flex items-center gap-2 text-[#8a4f41]">
              <span className="text-sm">📊</span>
              <h3 className="text-xl font-extrabold">Cấu hình SEO</h3>
            </div>

            <div>
              <div className="mb-2 ml-2 flex items-center justify-between gap-2">
                <label className="block text-sm font-bold text-[#635f54]">SEO Title</label>
                <button
                  type="button"
                  onClick={() => {
                    setSeoTitleTouched(false);
                    setForm((prev) => ({ ...prev, seo_title: String(prev.title || '').trim() }));
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#e7dece] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6f695f] hover:bg-[#fff9f0]"
                >
                  <RotateCcw size={11} /> Auto
                </button>
              </div>
              <input
                value={form.seo_title}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const sourceTitle = String(form.title || '').trim();
                  setSeoTitleTouched(String(nextValue).trim() !== sourceTitle);
                  setForm((prev) => ({ ...prev, seo_title: nextValue }));
                }}
                className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm text-[#4e4a43] placeholder:text-[#9a958a] focus:ring-2 focus:ring-[#fdb19f]"
                placeholder="Tiêu đề hiển thị trên Google"
              />
              <div className="mt-2 flex items-center gap-3 px-1">
                <div className="h-1.5 flex-1 rounded-full bg-[#e8e1d4]">
                  <div className="h-full rounded-full bg-[#c7fce9]" style={{ width: `${seoTitlePercent}%` }} />
                </div>
                <span className="text-[11px] text-[#7f7a6f]">{seoTitleCount}/70 ký tự</span>
              </div>
            </div>

            <div>
              <div className="mb-2 ml-2 flex items-center justify-between gap-2">
                <label className="block text-sm font-bold text-[#635f54]">SEO Description</label>
                <button
                  type="button"
                  onClick={() => {
                    setSeoDescTouched(false);
                    setForm((prev) => ({ ...prev, seo_description: String(prev.excerpt || '').trim() }));
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#e7dece] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6f695f] hover:bg-[#fff9f0]"
                >
                  <RotateCcw size={11} /> Auto
                </button>
              </div>
              <textarea
                value={form.seo_description}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const sourceExcerpt = String(form.excerpt || '').trim();
                  setSeoDescTouched(String(nextValue).trim() !== sourceExcerpt);
                  setForm((prev) => ({ ...prev, seo_description: nextValue }));
                }}
                rows={3}
                className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm text-[#4e4a43] placeholder:text-[#9a958a] focus:ring-2 focus:ring-[#fdb19f]"
                placeholder="Mô tả hiển thị trên kết quả tìm kiếm"
              />
              <div className="mt-2 flex items-center gap-3 px-1">
                <div className="h-1.5 flex-1 rounded-full bg-[#e8e1d4]">
                  <div className="h-full rounded-full bg-[#fdb19f]" style={{ width: `${seoDescPercent}%` }} />
                </div>
                <span className="text-[11px] text-[#7f7a6f]">{seoDescCount}/160 ký tự</span>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-4 xl:col-span-4">
          <section className="rounded-[2rem] bg-[#f4ede2] p-6">
            <label className="mb-3 block text-sm font-bold text-[#635f54]">Ảnh đại diện</label>
            <div className="relative aspect-video overflow-hidden rounded-2xl border-2 border-dashed border-[#b7b1a4] bg-[#e9e2d4]">
              {form.featured_image ? (
                <img src={form.featured_image} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center text-[#7f7a6f]">
                  <ImagePlus size={28} />
                  <p className="mt-2 text-sm font-semibold">Tải lên ảnh bài viết</p>
                  <p className="text-[11px]">Kích thước khuyên dùng 1200x630px</p>
                </div>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#fff7f6] px-4 py-2.5 text-sm font-bold text-[#8a4f41] hover:bg-white disabled:opacity-60"
              >
                <ImagePlus size={14} /> {uploading ? 'Đang upload...' : form.featured_image ? 'Đổi ảnh' : 'Tải ảnh lên'}
              </button>
              {form.featured_image ? (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, featured_image: '' }))}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#e3dac8] px-4 py-2.5 text-sm font-semibold text-[#7a7368] hover:bg-[#f8f1e6]"
                >
                  <X size={14} /> Xoá ảnh
                </button>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-[2rem] bg-[#f4ede2] p-6">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#635f54]">Trạng thái</label>
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#eee7db] p-1.5">
                {statusOptions.map((option) => {
                  const active = form.status === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, status: option.value }))}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-bold transition ${
                        active
                          ? 'bg-white text-[#8a4f41] shadow-[0_6px_12px_rgba(53,50,41,0.08)]'
                          : 'text-[#6e695f] hover:bg-white/75'
                      }`}
                    >
                      {active ? <Check size={14} /> : null}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#635f54]">Thời điểm xuất bản</label>
              <div className="space-y-2 rounded-2xl bg-white p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="relative">
                    <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a4f41]" />
                    <input
                      type="date"
                      value={publishedDate}
                      onChange={(event) => updatePublishedDateTime(event.target.value, publishedTime)}
                      className="w-full rounded-xl border border-[#e4dcca] bg-white py-2.5 pl-10 pr-3 text-sm font-medium focus:ring-2 focus:ring-[#fdb19f]"
                    />
                  </div>

                  <div className="relative">
                    <Clock3 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a4f41]" />
                    <input
                      type="time"
                      value={publishedTime}
                      onChange={(event) => updatePublishedDateTime(publishedDate || new Date().toISOString().slice(0, 10), event.target.value)}
                      className="w-full rounded-xl border border-[#e4dcca] bg-white py-2.5 pl-10 pr-3 text-sm font-medium focus:ring-2 focus:ring-[#fdb19f]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-[#7f7a6f]">{schedulePreview ? `Lịch hẹn: ${schedulePreview}` : 'Chưa đặt lịch xuất bản'}</div>
                  {form.published_at && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, published_at: '' }))}
                      className="inline-flex items-center gap-1 rounded-full border border-[#e3dac8] px-2.5 py-1 text-xs font-semibold text-[#7a7368] hover:bg-[#f8f1e6]"
                    >
                      <X size={12} /> Xoá lịch
                    </button>
                  )}
                </div>
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl bg-[#eee7db] px-3 py-3 text-sm font-bold text-[#635f54]">
              <span>Bài viết nổi bật</span>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => setForm((prev) => ({ ...prev, featured: event.target.checked }))}
                className="h-5 w-5 rounded-md border-[#b7b1a4] text-[#8a4f41] focus:ring-[#fdb19f]"
              />
            </label>
          </section>

          <section className="space-y-5 rounded-[2rem] bg-[#f4ede2] p-6">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#635f54]">Danh mục</label>
              <div className="space-y-2">
                {categoryPresets.map((item) => (
                  <label key={item} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-[#4f4a43] hover:bg-[#ece5da]">
                    <input
                      type="radio"
                      name="tip-category"
                      checked={form.category === item}
                      onChange={() => setForm((prev) => ({ ...prev, category: item }))}
                      className="h-4 w-4 border-[#b7b1a4] text-[#8a4f41] focus:ring-[#fdb19f]"
                    />
                    {item}
                  </label>
                ))}
                {categoryPresets.length === 0 && <div className="px-2 text-sm text-[#8f8a80]">Chưa có danh mục hoạt động.</div>}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Link2 size={14} className="text-[#8a4f41]" />
                <input
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="w-full rounded-xl border-none bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#fdb19f]"
                  placeholder="Hoặc nhập danh mục mới"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#635f54]">Thẻ (Tags)</label>
              <input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ',') {
                    event.preventDefault();
                    upsertTag(tagDraft);
                  }
                }}
                onBlur={() => upsertTag(tagDraft)}
                className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-[#fdb19f]"
                placeholder="Nhập tag và nhấn Enter..."
              />

              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[#ff9ea4]/65 px-3 py-1 text-[11px] font-bold text-[#691724]">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="text-[13px] leading-none hover:opacity-70">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <div className="fixed bottom-8 right-10 z-30 hidden md:block">
        <button type="button" className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#8a4f41] text-white shadow-[0_10px_24px_rgba(138,79,65,0.28)]">
          <CircleHelp size={20} />
        </button>
      </div>

      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2f2722]/45 p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[1.6rem] bg-[#f4ede2] shadow-[0_30px_80px_rgba(53,50,41,0.38)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#dfd4c3] bg-[#efe6d8] px-4 py-3">
              <h3 className="text-base font-extrabold uppercase tracking-wide text-[#8a4f41]">Live Preview</h3>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-full bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                      previewDevice === 'desktop' ? 'bg-[#8a4f41] text-white' : 'text-[#6f695f]'
                    }`}
                  >
                    <Monitor size={12} /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                      previewDevice === 'mobile' ? 'bg-[#8a4f41] text-white' : 'text-[#6f695f]'
                    }`}
                  >
                    <Smartphone size={12} /> Mobile
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#746e64] hover:bg-[#f9f4ea]"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(92vh-56px)] overflow-auto p-4 md:p-6">
              <div className={`${previewDevice === 'mobile' ? 'mx-auto max-w-[390px]' : 'mx-auto max-w-4xl'} overflow-hidden rounded-[1.3rem] border border-[#e5dbc8] bg-white`}>
                <div className="aspect-[16/9] overflow-hidden bg-[#efe8dc]">
                  <img src={form.featured_image || fallbackImage} alt="Preview" className="h-full w-full object-cover" />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {form.category ? <span className="rounded-full bg-[#c7fce9] px-2 py-1 font-bold text-[#316354]">{form.category}</span> : null}
                    <span className="text-[#7f7a6f]">{previewDateText}</span>
                  </div>
                  <h4 className={`${previewDevice === 'mobile' ? 'text-xl' : 'text-3xl'} font-extrabold leading-tight text-[#2f2722]`}>
                    {form.title || 'Tiêu đề bài viết sẽ hiển thị ở đây'}
                  </h4>
                  {form.excerpt ? <p className="text-sm text-[#635f54]">{form.excerpt}</p> : null}

                  {previewHasBlocks ? (
                    <div className="rounded-xl bg-[#faf8f2] p-3">
                      <TipBlocksRenderer blocks={form.content_blocks} />
                    </div>
                  ) : previewContentIsHtml ? (
                    <div
                      className="prose max-w-none text-sm prose-headings:text-[#2f2722] prose-p:text-[#4d473f]"
                      dangerouslySetInnerHTML={{ __html: String(form.content || '') }}
                    />
                  ) : (
                    <p className="whitespace-pre-line text-sm leading-7 text-[#4d473f]">
                      {form.content || 'Chưa có nội dung. Hãy chọn template và thêm block ở bên trái.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default TipEditor;
