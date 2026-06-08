import React, { useEffect, useMemo, useRef, useState } from 'react';
import Breadcrumb from '../../components/layout/Breadcrumb';
import { HomeContentPayload, homeContentService } from '../../services/homeContentService';

const DEFAULT_FOOTER_CONTENT = {
  footer_brand_name: 'Lộc Sang',
  footer_desktop_caption: '© 2024 Lộc Sang. Mua sắm tiện lợi, giao nhanh toàn quốc.',
  footer_mobile_description: 'Nơi hội tụ những sản phẩm thiết thực, đẹp và dễ mua cho mọi gia đình.',
  footer_products_title: 'sản phẩm',
  footer_products_item_1: 'Sản Phẩm Mới',
  footer_products_item_2: 'Ưu Đãi Nổi Bật',
  footer_products_item_3: 'Đồ Chơi Bé Yêu',
  footer_products_item_4: 'Giường & Nệm',
  footer_info_title: 'thông tin',
  footer_info_item_1: 'Thông tin giao hàng',
  footer_info_item_2: 'Chính sách đổi trả',
  footer_info_item_3: 'Hướng dẫn chọn size',
  footer_info_item_4: 'Liên hệ về chúng mình',
  footer_social_title: 'mạng xã hội',
  footer_social_item_1: 'Instagram',
  footer_social_item_2: 'Pinterest',
  footer_social_item_3: 'Facebook',
  footer_social_item_4: 'TikTok',
  footer_social_instagram_url: '#',
  footer_social_pinterest_url: '#',
  footer_social_facebook_url: '#',
  footer_social_tiktok_url: '#',
  footer_policy_title: 'Chính sách',
  footer_policy_item_1: 'Đổi trả 7 ngày',
  footer_policy_item_2: 'Bảo hành 6 tháng',
  footer_policy_item_3: 'Vận chuyển',
  footer_contact_title: 'Liên hệ',
  footer_contact_hotline: 'Hotline: 1900 8888',
  footer_contact_email: 'Email: hello@locsang.shop',
  footer_copyright_text: '© 2024 Lộc Sang. All rights reserved.',
} as const;

type FooterField = keyof typeof DEFAULT_FOOTER_CONTENT;

type FieldConfig = {
  field: FooterField;
  label: string;
  rows?: number;
};

const FOOTER_GROUPS: Array<{ title: string; fields: FieldConfig[] }> = [
  {
    title: 'Thông tin chung',
    fields: [
      { field: 'footer_brand_name', label: 'Tên thương hiệu' },
      { field: 'footer_desktop_caption', label: 'Caption desktop', rows: 2 },
      { field: 'footer_mobile_description', label: 'Mô tả mobile', rows: 2 },
      { field: 'footer_copyright_text', label: 'Dòng copyright' },
    ],
  },
  {
    title: 'Cột Sản phẩm',
    fields: [
      { field: 'footer_products_title', label: 'Tiêu đề cột' },
      { field: 'footer_products_item_1', label: 'Item 1' },
      { field: 'footer_products_item_2', label: 'Item 2' },
      { field: 'footer_products_item_3', label: 'Item 3' },
      { field: 'footer_products_item_4', label: 'Item 4' },
    ],
  },
  {
    title: 'Cột Thông tin',
    fields: [
      { field: 'footer_info_title', label: 'Tiêu đề cột' },
      { field: 'footer_info_item_1', label: 'Item 1' },
      { field: 'footer_info_item_2', label: 'Item 2' },
      { field: 'footer_info_item_3', label: 'Item 3' },
      { field: 'footer_info_item_4', label: 'Item 4' },
    ],
  },
  {
    title: 'Cột Mạng xã hội',
    fields: [
      { field: 'footer_social_title', label: 'Tiêu đề cột' },
      { field: 'footer_social_item_1', label: 'Label Instagram' },
      { field: 'footer_social_item_2', label: 'Label Pinterest' },
      { field: 'footer_social_item_3', label: 'Label Facebook' },
      { field: 'footer_social_item_4', label: 'Label TikTok' },
      { field: 'footer_social_instagram_url', label: 'URL Instagram' },
      { field: 'footer_social_pinterest_url', label: 'URL Pinterest' },
      { field: 'footer_social_facebook_url', label: 'URL Facebook' },
      { field: 'footer_social_tiktok_url', label: 'URL TikTok' },
    ],
  },
  {
    title: 'Mobile: Chính sách & Liên hệ',
    fields: [
      { field: 'footer_policy_title', label: 'Tiêu đề chính sách' },
      { field: 'footer_policy_item_1', label: 'Chính sách 1' },
      { field: 'footer_policy_item_2', label: 'Chính sách 2' },
      { field: 'footer_policy_item_3', label: 'Chính sách 3' },
      { field: 'footer_contact_title', label: 'Tiêu đề liên hệ' },
      { field: 'footer_contact_hotline', label: 'Hotline' },
      { field: 'footer_contact_email', label: 'Email' },
    ],
  },
];

const FooterManager = () => {
  const [homeDraft, setHomeDraft] = useState<HomeContentPayload | null>(null);
  const [homePublishedAt, setHomePublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showAdvancedInputs, setShowAdvancedInputs] = useState(false);
  const [editingField, setEditingField] = useState<FooterField | null>(null);
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
            || 'Không tải được dữ liệu Footer. Vui lòng thử lại.',
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

  const updateDraftField = (field: FooterField, value: string) => {
    setHomeDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const inlineStateRef = useRef<{ homeDraft: HomeContentPayload | null; editingField: FooterField | null }>({
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
      field: FooterField;
      className?: string;
      multiline?: boolean;
      rows?: number;
    }) => {
      const currentDraft = inlineStateRef.current.homeDraft;
      const currentEditingField = inlineStateRef.current.editingField;
      if (!currentDraft) return null;

      const value = String(currentDraft[field] || DEFAULT_FOOTER_CONTENT[field] || '');
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

  const isPreviewZoneActive = (fields: FooterField[]) => {
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
      setMessage('Đã lưu bản nháp Footer thành công.');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail
          || err?.response?.data?.message
          || 'Không thể lưu Footer. Vui lòng thử lại.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!homeDraft) return;
    const ok = window.confirm('Xuất bản Footer lên storefront ngay bây giờ?');
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
      setMessage('Đã xuất bản Footer thành công.');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail
          || err?.response?.data?.message
          || 'Không thể xuất bản Footer. Vui lòng thử lại.',
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="space-y-6">
      <Breadcrumb items={[{ name: 'Trang chủ', path: '/admin' }, { name: 'Footer', path: '/admin/footer' }]} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Chỉnh sửa Footer</h1>
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
            Không có dữ liệu để chỉnh Footer.
          </p>
        )}

        {!loading && homeDraft && (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-bold text-gray-700 dark:text-gray-200">Xem trước footer (click trực tiếp để sửa)</div>
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
                'footer_brand_name',
                'footer_desktop_caption',
                'footer_mobile_description',
                'footer_products_title',
                'footer_products_item_1',
                'footer_products_item_2',
                'footer_products_item_3',
                'footer_products_item_4',
                'footer_info_title',
                'footer_info_item_1',
                'footer_info_item_2',
                'footer_info_item_3',
                'footer_info_item_4',
                'footer_social_title',
                'footer_social_item_1',
                'footer_social_item_2',
                'footer_social_item_3',
                'footer_social_item_4',
                'footer_social_instagram_url',
                'footer_social_pinterest_url',
                'footer_social_facebook_url',
                'footer_social_tiktok_url',
              ]), 'hidden md:block rounded-2xl bg-[#efe7db] p-6 text-[#4a443b]')}>
                <div className="grid grid-cols-[1.2fr_2fr] gap-8">
                  <div>
                    <div className="text-xl font-extrabold text-[#8a4f41]"><InlineEditable field="footer_brand_name" className="text-xl font-extrabold text-[#8a4f41]" /></div>
                    <p className="mt-3 max-w-sm text-[11px] text-[#7a756a]"><InlineEditable field="footer_desktop_caption" className="text-[11px] text-[#7a756a]" multiline rows={2} /></p>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-[#7a756a]">
                      <div>IG: <InlineEditable field="footer_social_instagram_url" className="text-[11px] text-[#7a756a]" /></div>
                      <div>Pin: <InlineEditable field="footer_social_pinterest_url" className="text-[11px] text-[#7a756a]" /></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-[12px]">
                    <div>
                      <div className="mb-2 text-sm font-semibold lowercase"><InlineEditable field="footer_products_title" className="text-sm font-semibold lowercase" /></div>
                      <ul className="space-y-1.5 text-[#7a756a]">
                        <li><InlineEditable field="footer_products_item_1" className="text-[12px] text-[#7a756a]" /></li>
                        <li><InlineEditable field="footer_products_item_2" className="text-[12px] text-[#7a756a]" /></li>
                        <li><InlineEditable field="footer_products_item_3" className="text-[12px] text-[#7a756a]" /></li>
                        <li><InlineEditable field="footer_products_item_4" className="text-[12px] text-[#7a756a]" /></li>
                      </ul>
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-semibold lowercase"><InlineEditable field="footer_info_title" className="text-sm font-semibold lowercase" /></div>
                      <ul className="space-y-1.5 text-[#7a756a]">
                        <li><InlineEditable field="footer_info_item_1" className="text-[12px] text-[#7a756a]" /></li>
                        <li><InlineEditable field="footer_info_item_2" className="text-[12px] text-[#7a756a]" /></li>
                        <li><InlineEditable field="footer_info_item_3" className="text-[12px] text-[#7a756a]" /></li>
                        <li><InlineEditable field="footer_info_item_4" className="text-[12px] text-[#7a756a]" /></li>
                      </ul>
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-semibold lowercase"><InlineEditable field="footer_social_title" className="text-sm font-semibold lowercase" /></div>
                      <ul className="space-y-1.5 text-[#7a756a]">
                        <li><InlineEditable field="footer_social_item_1" className="text-[12px] text-[#7a756a]" /></li>
                        <li><InlineEditable field="footer_social_item_2" className="text-[12px] text-[#7a756a]" /></li>
                        <li><InlineEditable field="footer_social_item_3" className="text-[12px] text-[#7a756a]" /></li>
                        <li><InlineEditable field="footer_social_item_4" className="text-[12px] text-[#7a756a]" /></li>
                      </ul>
                      <div className="mt-3 space-y-1 text-[11px] text-[#7a756a]">
                        <div>FB: <InlineEditable field="footer_social_facebook_url" className="text-[11px] text-[#7a756a]" /></div>
                        <div>TikTok: <InlineEditable field="footer_social_tiktok_url" className="text-[11px] text-[#7a756a]" /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className={zoneClass(isPreviewZoneActive([
                'footer_brand_name',
                'footer_mobile_description',
                'footer_policy_title',
                'footer_policy_item_1',
                'footer_policy_item_2',
                'footer_policy_item_3',
                'footer_contact_title',
                'footer_contact_hotline',
                'footer_contact_email',
                'footer_copyright_text',
              ]), 'md:hidden rounded-t-[2rem] bg-[#efe7db] px-4 pb-6 pt-6 text-[#4a443b]')}>
                <div className="text-xl font-extrabold text-[#8a4f41]"><InlineEditable field="footer_brand_name" className="text-xl font-extrabold text-[#8a4f41]" /></div>
                <p className="mt-3 text-sm text-[#7a756a]"><InlineEditable field="footer_mobile_description" className="text-sm text-[#7a756a]" multiline rows={2} /></p>

                <div className="mt-6 grid grid-cols-2 gap-6">
                  <div>
                    <div className="mb-2 font-bold"><InlineEditable field="footer_policy_title" className="font-bold" /></div>
                    <ul className="space-y-1.5 text-sm text-[#7a756a]">
                      <li><InlineEditable field="footer_policy_item_1" className="text-sm text-[#7a756a]" /></li>
                      <li><InlineEditable field="footer_policy_item_2" className="text-sm text-[#7a756a]" /></li>
                      <li><InlineEditable field="footer_policy_item_3" className="text-sm text-[#7a756a]" /></li>
                    </ul>
                  </div>
                  <div>
                    <div className="mb-2 font-bold"><InlineEditable field="footer_contact_title" className="font-bold" /></div>
                    <ul className="space-y-1.5 text-sm text-[#7a756a]">
                      <li><InlineEditable field="footer_contact_hotline" className="text-sm text-[#7a756a]" /></li>
                      <li><InlineEditable field="footer_contact_email" className="text-sm text-[#7a756a]" /></li>
                    </ul>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-1 text-xs text-[#7a756a]">
                  <div>IG URL: <InlineEditable field="footer_social_instagram_url" className="text-xs text-[#7a756a]" /></div>
                  <div>FB URL: <InlineEditable field="footer_social_facebook_url" className="text-xs text-[#7a756a]" /></div>
                </div>

                <div className="mt-5 text-center text-[10px] text-[#9c968b]"><InlineEditable field="footer_copyright_text" className="text-[10px] text-[#9c968b]" /></div>
              </section>
            </div>

            {showAdvancedInputs && (
              <div className="space-y-5 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                {FOOTER_GROUPS.map((group) => (
                  <div key={group.title} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{group.title}</h3>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {group.fields.map((item) => (
                        <label key={item.field} className={`block text-sm font-semibold text-gray-700 dark:text-gray-200 ${item.rows ? 'sm:col-span-2' : ''}`}>
                          {item.label}
                          {item.rows ? (
                            <textarea
                              value={String(homeDraft[item.field] || DEFAULT_FOOTER_CONTENT[item.field])}
                              onChange={(e) => updateDraftField(item.field, e.target.value)}
                              rows={item.rows}
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                            />
                          ) : (
                            <input
                              value={String(homeDraft[item.field] || DEFAULT_FOOTER_CONTENT[item.field])}
                              onChange={(e) => updateDraftField(item.field, e.target.value)}
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
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
                {publishing ? 'Đang xuất bản...' : 'Xuất bản Footer'}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default FooterManager;
