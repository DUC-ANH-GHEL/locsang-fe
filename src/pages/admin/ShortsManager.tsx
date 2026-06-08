import React, { useEffect, useMemo, useState } from 'react';
import Breadcrumb from '../../components/layout/Breadcrumb';
import { HomeContentPayload, homeContentService } from '../../services/homeContentService';

type HomeShortItem = {
  title?: string;
  url: string;
  thumbnail_url?: string;
};

const DEFAULT_SHORTS_CONTENT = {
  shorts_section_title: 'Lộc Sang Shorts',
  shorts_section_subtitle: 'Lướt nhanh video sản phẩm mới nhất',
  shorts_section_link_text: 'Xem Shorts',
};

const normalizeShortItems = (value: unknown): HomeShortItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      return {
        title: String((item as any).title || '').trim() || undefined,
        url: String((item as any).url || '').trim(),
        thumbnail_url: String((item as any).thumbnail_url || '').trim() || undefined,
      };
    })
    .filter((item) => Boolean(item)) as HomeShortItem[];
};

const ShortsManager = () => {
  const [homeDraft, setHomeDraft] = useState<HomeContentPayload | null>(null);
  const [homePublishedAt, setHomePublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
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
            || 'Không tải được dữ liệu Shorts. Vui lòng thử lại.',
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

  const shortsItems = useMemo(() => normalizeShortItems(homeDraft?.shorts_items), [homeDraft?.shorts_items]);

  const updateDraftField = (field: 'shorts_section_title' | 'shorts_section_subtitle' | 'shorts_section_link_text', value: string) => {
    setHomeDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const setShortsItems = (items: HomeShortItem[]) => {
    setHomeDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, shorts_items: items };
    });
  };

  const addShortItem = () => {
    setShortsItems([...shortsItems, { title: '', url: '', thumbnail_url: '' }]);
  };

  const updateShortItem = (index: number, field: keyof HomeShortItem, value: string) => {
    const next = [...shortsItems];
    const current = next[index] || { title: '', url: '', thumbnail_url: '' };
    next[index] = { ...current, [field]: value };
    setShortsItems(next);
  };

  const removeShortItem = (index: number) => {
    const next = [...shortsItems];
    next.splice(index, 1);
    setShortsItems(next);
  };

  const handleSaveDraft = async () => {
    if (!homeDraft) return;
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const payload: HomeContentPayload = {
        ...homeDraft,
        shorts_items: shortsItems.filter((item) => String(item.url || '').trim() !== ''),
      };
      const data = await homeContentService.updateDraft(payload);
      setHomeDraft((data?.draft || payload) as HomeContentPayload);
      setHomePublishedAt(data?.published_at || null);
      setMessage('Đã lưu bản nháp Shorts thành công.');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail
          || err?.response?.data?.message
          || 'Không thể lưu bản nháp Shorts. Vui lòng thử lại.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!homeDraft) return;
    const ok = window.confirm('Xuất bản Shorts lên storefront ngay bây giờ?');
    if (!ok) return;

    try {
      setPublishing(true);
      setError('');
      setMessage('');
      const payload: HomeContentPayload = {
        ...homeDraft,
        shorts_items: shortsItems.filter((item) => String(item.url || '').trim() !== ''),
      };
      await homeContentService.updateDraft(payload);
      const data = await homeContentService.publishDraft();
      setHomeDraft((data?.draft || payload) as HomeContentPayload);
      setHomePublishedAt(data?.published_at || null);
      setMessage('Đã xuất bản Shorts thành công.');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail
          || err?.response?.data?.message
          || 'Không thể xuất bản Shorts. Vui lòng thử lại.',
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="space-y-6">
      <Breadcrumb items={[{ name: 'Trang chủ', path: '/admin' }, { name: 'Quản lý Shorts', path: '/admin/shorts' }]} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Quản lý Lộc Sang Shorts</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Màn riêng để chỉnh tiêu đề section và danh sách video Shorts hiển thị ngoài storefront.
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
            Không có dữ liệu trang chủ để chỉnh Shorts.
          </p>
        )}

        {!loading && homeDraft && (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Tiêu đề section
                <input
                  value={homeDraft.shorts_section_title || DEFAULT_SHORTS_CONTENT.shorts_section_title}
                  onChange={(e) => updateDraftField('shorts_section_title', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Text nút vào Shorts
                <input
                  value={homeDraft.shorts_section_link_text || DEFAULT_SHORTS_CONTENT.shorts_section_link_text}
                  onChange={(e) => updateDraftField('shorts_section_link_text', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 sm:col-span-2">
                Mô tả section
                <textarea
                  value={homeDraft.shorts_section_subtitle || DEFAULT_SHORTS_CONTENT.shorts_section_subtitle}
                  onChange={(e) => updateDraftField('shorts_section_subtitle', e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                />
              </label>
            </div>

            <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
              {shortsItems.map((item, index) => (
                <div key={`short-${index}`} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-950">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 sm:col-span-2">
                      URL video (MP4 hoặc YouTube Shorts)
                      <input
                        value={item.url}
                        onChange={(e) => updateShortItem(index, 'url', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                        placeholder="https://..."
                      />
                    </label>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Tiêu đề video
                      <input
                        value={item.title || ''}
                        onChange={(e) => updateShortItem(index, 'title', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                        placeholder="Ví dụ: Sản phẩm mới vừa về"
                      />
                    </label>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Thumbnail (tuỳ chọn)
                      <input
                        value={item.thumbnail_url || ''}
                        onChange={(e) => updateShortItem(index, 'thumbnail_url', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                        placeholder="https://..."
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeShortItem(index)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Xoá video
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addShortItem}
                className="rounded-lg border border-dashed border-gray-400 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-900"
              >
                + Thêm short video
              </button>
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
                {publishing ? 'Đang xuất bản...' : 'Xuất bản Shorts'}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default ShortsManager;
