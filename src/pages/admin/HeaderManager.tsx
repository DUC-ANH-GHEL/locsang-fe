import React, { useEffect, useMemo, useRef, useState } from 'react';
import Breadcrumb from '../../components/layout/Breadcrumb';
import { HomeContentPayload, homeContentService } from '../../services/homeContentService';

const DEFAULT_HEADER_CONTENT = {
  header_brand_name: 'Lộc Sang',
  header_brand_tagline: 'Mua sắm chọn lọc, giao nhanh toàn quốc',
  header_nav_shop_text: 'Cửa hàng',
  header_nav_new_arrivals_text: 'Hàng mới về',
  header_nav_tips_text: 'Mẹo chăm sóc',
  header_nav_shorts_text: 'Lộc Sang Shorts',
  header_nav_orders_text: 'Đơn hàng',
} as const;

type HeaderField = keyof typeof DEFAULT_HEADER_CONTENT;

const HEADER_FIELD_LABELS: Array<{ field: HeaderField; label: string; rows?: number }> = [
  { field: 'header_brand_name', label: 'Tên thương hiệu' },
  { field: 'header_brand_tagline', label: 'Tagline header', rows: 2 },
  { field: 'header_nav_shop_text', label: 'Menu: Cửa hàng' },
  { field: 'header_nav_new_arrivals_text', label: 'Menu: Hàng mới về' },
  { field: 'header_nav_tips_text', label: 'Menu: Mẹo chăm sóc' },
  { field: 'header_nav_shorts_text', label: 'Menu: Lộc Sang Shorts' },
  { field: 'header_nav_orders_text', label: 'Menu: Đơn hàng' },
];

const HeaderManager = () => {
  const [homeDraft, setHomeDraft] = useState<HomeContentPayload | null>(null);
  const [homePublishedAt, setHomePublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showAdvancedInputs, setShowAdvancedInputs] = useState(false);
  const [editingField, setEditingField] = useState<HeaderField | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const data = await homeContentService.getAdminHomeContent();
        if (cancelled) return;
        setHomeDraft((data?.draft || null) as HomeContentPayload | null);
        setHomePublishedAt(data?.published_at || null);
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err?.response?.data?.detail
            || err?.response?.data?.message
            || 'Không tải được dữ liệu Header. Vui lòng thử lại.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateDraftField = (field: HeaderField, value: string) => {
    setHomeDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const inlineStateRef = useRef<{ homeDraft: HomeContentPayload | null; editingField: HeaderField | null }>({
    homeDraft: null,
    editingField: null,
  });
  inlineStateRef.current = { homeDraft, editingField };

  const updateDraftFieldRef = useRef(updateDraftField);
  updateDraftFieldRef.current = updateDraftField;

  const InlineEditable = useMemo(() => {
    const StableInlineEditable = ({
      field,
      className = '',
      multiline = false,
      rows = 2,
    }: {
      field: HeaderField;
      className?: string;
      multiline?: boolean;
      rows?: number;
    }) => {
      const currentDraft = inlineStateRef.current.homeDraft;
      const currentEditingField = inlineStateRef.current.editingField;
      if (!currentDraft) return null;

      const value = String(currentDraft[field] || DEFAULT_HEADER_CONTENT[field] || '');
      const isEditing = currentEditingField === field;

      if (isEditing) {
        if (multiline) {
          return (
            <textarea
              autoFocus
              rows={rows}
              value={String(currentDraft[field] || '')}
              onChange={(e) => updateDraftFieldRef.current(field, e.target.value)}
              onBlur={() => setEditingField(null)}
              className={`w-full rounded-md border border-rose-300 bg-white/95 px-2 py-1 text-[#111827] outline-none ring-2 ring-rose-200 ${className}`}
            />
          );
        }

        return (
          <input
            autoFocus
            value={String(currentDraft[field] || '')}
            onChange={(e) => updateDraftFieldRef.current(field, e.target.value)}
            onBlur={() => setEditingField(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className={`w-full rounded-md border border-rose-300 bg-white/95 px-2 py-1 text-[#111827] outline-none ring-2 ring-rose-200 ${className}`}
          />
        );
      }

      return (
        <span
          role="button"
          tabIndex={0}
          onClick={() => setEditingField(field)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setEditingField(field);
            }
          }}
          className={`cursor-text rounded px-1 -mx-1 hover:bg-white/50 focus:bg-white/50 focus:outline-none ${className}`}
          title="Click để sửa trực tiếp"
        >
          {value}
        </span>
      );
    };

    return StableInlineEditable;
  }, []);

  const isPreviewZoneActive = (fields: HeaderField[]) => {
    if (!editingField) return false;
    return fields.includes(editingField);
  };

  const zoneClass = (active: boolean, base: string) => (
    `${base} transition-all duration-200 ${active ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-transparent bg-white/5' : ''}`
  );

  const handleSaveDraft = async () => {
    if (!homeDraft) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');
      const payload: HomeContentPayload = { ...homeDraft };
      const data = await homeContentService.updateDraft(payload);
      setHomeDraft((data?.draft || payload) as HomeContentPayload);
      setHomePublishedAt(data?.published_at || null);
      setMessage('Đã lưu bản nháp Header thành công.');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail
          || err?.response?.data?.message
          || 'Không thể lưu Header. Vui lòng thử lại.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!homeDraft) return;
    const ok = window.confirm('Xuất bản Header lên storefront ngay bây giờ?');
    if (!ok) return;

    try {
      setPublishing(true);
      setError('');
      setMessage('');
      const payload: HomeContentPayload = { ...homeDraft };
      await homeContentService.updateDraft(payload);
      const data = await homeContentService.publishDraft();
      setHomeDraft((data?.draft || payload) as HomeContentPayload);
      setHomePublishedAt(data?.published_at || null);
      setMessage('Đã xuất bản Header thành công.');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail
          || err?.response?.data?.message
          || 'Không thể xuất bản Header. Vui lòng thử lại.',
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="space-y-6">
      <Breadcrumb items={[{ name: 'Trang chủ', path: '/admin' }, { name: 'Header', path: '/admin/header' }]} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Chỉnh sửa Header</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Chế độ ưu tiên chỉnh trực tiếp trên preview giống Dashboard.
            </p>
          </div>
          {homePublishedAt && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              Đã publish: {new Date(homePublishedAt).toLocaleString('vi-VN')}
            </span>
          )}
        </div>

        {loading && <p className="mt-4 text-sm text-gray-500">Đang tải dữ liệu...</p>}

        {!loading && !homeDraft && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Không có dữ liệu để chỉnh Header.
          </p>
        )}

        {!loading && homeDraft && (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-bold text-gray-700 dark:text-gray-200">Xem trước header (click trực tiếp để sửa)</div>
              <button
                type="button"
                onClick={() => setShowAdvancedInputs((prev) => !prev)}
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200"
              >
                {showAdvancedInputs ? 'Ẩn form nâng cao' : 'Hiện form nâng cao'}
              </button>
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-[#fff9f0] p-4">
              <section className={zoneClass(isPreviewZoneActive([
                'header_brand_name',
                'header_brand_tagline',
                'header_nav_shop_text',
                'header_nav_new_arrivals_text',
                'header_nav_tips_text',
                'header_nav_shorts_text',
                'header_nav_orders_text',
              ]), 'hidden md:block rounded-2xl bg-white/90 p-4 shadow-sm')}>
                <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-[#f1e6da] bg-white/85 px-6 py-[0.7rem] shadow-xl shadow-orange-900/5 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#e9dfd4] ring-1 ring-[#d9cfbf]" />
                    <div className="leading-tight">
                      <div className="text-xl font-extrabold tracking-tight text-[#8a4f41]"><InlineEditable field="header_brand_name" className="text-xl font-extrabold text-[#8a4f41]" /></div>
                      <div className="text-[10px] uppercase tracking-[0.15em] text-[#8a4f41]/60"><InlineEditable field="header_brand_tagline" className="text-[10px] uppercase text-[#8a4f41]/60" multiline rows={2} /></div>
                    </div>
                  </div>
                  <nav className="flex items-center gap-8 text-[12.5px] font-medium text-[#7a756a]">
                    <span className="pb-0.5 border-b-2 border-[#f4e1d7] text-[#8a4f41] font-semibold"><InlineEditable field="header_nav_shop_text" className="text-[12.5px] font-semibold text-[#8a4f41]" /></span>
                    <span className="pb-0.5 text-[#8a4f41] font-semibold"><InlineEditable field="header_nav_new_arrivals_text" className="text-[12.5px] font-semibold text-[#8a4f41]" /></span>
                    <span><InlineEditable field="header_nav_tips_text" className="text-[12.5px] font-medium text-[#7a756a]" /></span>
                    <span><InlineEditable field="header_nav_shorts_text" className="text-[12.5px] font-medium text-[#7a756a]" /></span>
                    <span><InlineEditable field="header_nav_orders_text" className="text-[12.5px] font-medium text-[#7a756a]" /></span>
                  </nav>
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-[#f9f3e9]" />
                    <div className="h-9 w-9 rounded-full bg-[#f9f3e9]" />
                  </div>
                </div>
              </section>

              <section className={zoneClass(isPreviewZoneActive([
                'header_brand_name',
                'header_brand_tagline',
              ]), 'md:hidden rounded-2xl border border-[#ece2d6] bg-[#fff9f0] p-4 shadow-[0_8px_20px_rgba(58,44,34,0.06)]')}>
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-[#e9dfd4]" />
                    <div className="min-w-0 leading-tight">
                      <div className="truncate text-[1.32rem] font-extrabold tracking-[-0.01em] text-[#8a4f41]"><InlineEditable field="header_brand_name" className="text-[1.32rem] font-extrabold text-[#8a4f41]" /></div>
                      <div className="truncate text-[8px] uppercase tracking-[0.14em] text-[#8a4f41]/60"><InlineEditable field="header_brand_tagline" className="text-[8px] uppercase text-[#8a4f41]/60" multiline rows={2} /></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-9 w-9 rounded-full bg-[#f5ece1]" />
                    <div className="h-9 w-9 rounded-full bg-[#f5ece1]" />
                  </div>
                </div>
              </section>
            </div>

            {showAdvancedInputs && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                {HEADER_FIELD_LABELS.map((item) => (
                  <label key={item.field} className={`block text-sm font-semibold text-gray-700 dark:text-gray-200 ${item.field === 'header_brand_tagline' ? 'sm:col-span-2' : ''}`}>
                    {item.label}
                    {item.rows ? (
                      <textarea
                        value={String(homeDraft[item.field] || DEFAULT_HEADER_CONTENT[item.field])}
                        onChange={(e) => updateDraftField(item.field, e.target.value)}
                        rows={item.rows}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                      />
                    ) : (
                      <input
                        value={String(homeDraft[item.field] || DEFAULT_HEADER_CONTENT[item.field])}
                        onChange={(e) => updateDraftField(item.field, e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                      />
                    )}
                  </label>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              Nội dung ngoài storefront chỉ thay đổi sau khi bạn bấm Xuất bản.
            </div>

            {message && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving || publishing || loading}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                {saving ? 'Đang lưu nháp...' : 'Lưu bản nháp'}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving || publishing || loading}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {publishing ? 'Đang xuất bản...' : 'Xuất bản Header'}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default HeaderManager;
