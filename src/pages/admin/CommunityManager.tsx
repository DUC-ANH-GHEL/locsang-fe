import React, { useEffect, useMemo, useState } from 'react';
import Breadcrumb from '../../components/layout/Breadcrumb';
import { HomeContentPayload, homeContentService } from '../../services/homeContentService';

type HomeCommunityItem = {
  image_url: string;
  alt_text?: string;
  link?: string;
};

const DEFAULT_COMMUNITY_CONTENT = {
  community_section_title: 'Cộng Đồng #LocSang',
  community_section_subtitle: 'Chia sẻ khoảnh khắc hạnh phúc của bé yêu cùng chúng mình nhé!',
};

const normalizeCommunityItems = (value: unknown): HomeCommunityItem[] => {
  if (!Array.isArray(value)) return [];
  return value.reduce<HomeCommunityItem[]>((acc, item) => {
    if (!item || typeof item !== 'object') return acc;
    acc.push({
      image_url: String((item as any).image_url || '').trim(),
      alt_text: String((item as any).alt_text || '').trim() || undefined,
      link: String((item as any).link || '').trim() || undefined,
    });
    return acc;
  }, []);
};

const CommunityManager = () => {
  const [homeDraft, setHomeDraft] = useState<HomeContentPayload | null>(null);
  const [homePublishedAt, setHomePublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
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
            || 'Không tải được dữ liệu Cộng đồng. Vui lòng thử lại.',
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

  const communityItems = useMemo(
    () => normalizeCommunityItems(homeDraft?.community_items),
    [homeDraft?.community_items],
  );

  const updateDraftField = (field: 'community_section_title' | 'community_section_subtitle', value: string) => {
    setHomeDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const setCommunityItems = (items: HomeCommunityItem[]) => {
    setHomeDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, community_items: items };
    });
  };

  const addCommunityItem = () => {
    setCommunityItems([...communityItems, { image_url: '', alt_text: '', link: '' }]);
  };

  const updateCommunityItem = (index: number, field: keyof HomeCommunityItem, value: string) => {
    const next = [...communityItems];
    const current = next[index] || { image_url: '', alt_text: '', link: '' };
    next[index] = { ...current, [field]: value };
    setCommunityItems(next);
  };

  const removeCommunityItem = (index: number) => {
    const next = [...communityItems];
    next.splice(index, 1);
    setCommunityItems(next);
  };

  const moveCommunityItem = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= communityItems.length) return;
    const next = [...communityItems];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    setCommunityItems(next);
  };

  const handleItemImageUpload = async (index: number, file?: File | null) => {
    if (!file) return;

    try {
      setUploadingIndex(index);
      setUploadProgress(0);
      setError('');
      setMessage('');
      const data = await homeContentService.uploadHomeImage(file, (percent) => {
        setUploadProgress(percent);
      });
      if (!data?.url) {
        throw new Error('Không nhận được URL ảnh sau khi upload.');
      }
      updateCommunityItem(index, 'image_url', data.url);
      setMessage('Đã tải ảnh community thành công. Nhớ lưu nháp hoặc xuất bản để áp dụng.');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail
          || err?.response?.data?.message
          || err?.message
          || 'Không thể tải ảnh community. Vui lòng thử lại.',
      );
    } finally {
      setUploadingIndex(null);
      setUploadProgress(0);
    }
  };

  const buildPayload = (): HomeContentPayload | null => {
    if (!homeDraft) return null;
    return {
      ...homeDraft,
      community_items: communityItems.filter((item) => String(item.image_url || '').trim() !== ''),
    };
  };

  const handleSaveDraft = async () => {
    const payload = buildPayload();
    if (!payload) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');
      const data = await homeContentService.updateDraft(payload);
      setHomeDraft((data?.draft || payload) as HomeContentPayload);
      setHomePublishedAt(data?.published_at || null);
      setMessage('Đã lưu bản nháp Cộng đồng thành công.');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail
          || err?.response?.data?.message
          || 'Không thể lưu bản nháp Cộng đồng. Vui lòng thử lại.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    const payload = buildPayload();
    if (!payload) return;
    const ok = window.confirm('Xuất bản Cộng đồng lên storefront ngay bây giờ?');
    if (!ok) return;

    try {
      setPublishing(true);
      setError('');
      setMessage('');
      await homeContentService.updateDraft(payload);
      const data = await homeContentService.publishDraft();
      setHomeDraft((data?.draft || payload) as HomeContentPayload);
      setHomePublishedAt(data?.published_at || null);
      setMessage('Đã xuất bản Cộng đồng thành công.');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail
          || err?.response?.data?.message
          || 'Không thể xuất bản Cộng đồng. Vui lòng thử lại.',
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main className="space-y-6">
      <Breadcrumb items={[{ name: 'Trang chủ', path: '/admin' }, { name: 'Quản lý Cộng đồng', path: '/admin/community' }]} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Quản lý Cộng đồng</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Màn riêng để quản lý section Cộng đồng trên Home: tiêu đề, mô tả và danh sách ảnh.
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
            Không có dữ liệu trang chủ để chỉnh Cộng đồng.
          </p>
        )}

        {!loading && homeDraft && (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 sm:col-span-2">
                Tiêu đề section
                <input
                  value={homeDraft.community_section_title || DEFAULT_COMMUNITY_CONTENT.community_section_title}
                  onChange={(e) => updateDraftField('community_section_title', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 sm:col-span-2">
                Mô tả section
                <textarea
                  rows={2}
                  value={homeDraft.community_section_subtitle || DEFAULT_COMMUNITY_CONTENT.community_section_subtitle}
                  onChange={(e) => updateDraftField('community_section_subtitle', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                />
              </label>
            </div>

            <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
              {communityItems.map((item, index) => {
                const isUploadingThisItem = uploadingIndex === index;

                return (
                  <div key={`community-${index}`} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-950">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 sm:col-span-2">
                        URL ảnh
                        <input
                          value={item.image_url || ''}
                          onChange={(e) => updateCommunityItem(index, 'image_url', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                          placeholder="https://..."
                        />
                      </label>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        Alt text
                        <input
                          value={item.alt_text || ''}
                          onChange={(e) => updateCommunityItem(index, 'alt_text', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                          placeholder="Mô tả ngắn của ảnh"
                        />
                      </label>
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        Link khi click (tuỳ chọn)
                        <input
                          value={item.link || ''}
                          onChange={(e) => updateCommunityItem(index, 'link', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                          placeholder="https://instagram.com/..."
                        />
                      </label>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                        {isUploadingThisItem ? `Đang upload... ${uploadProgress}%` : 'Upload ảnh'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingThisItem || saving || publishing || loading}
                          onChange={(e) => {
                            const picked = e.target.files?.[0] || null;
                            void handleItemImageUpload(index, picked);
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => moveCommunityItem(index, 'up')}
                        disabled={index === 0}
                        className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
                      >
                        Len
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCommunityItem(index, 'down')}
                        disabled={index === communityItems.length - 1}
                        className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
                      >
                        Xuong
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCommunityItem(index)}
                        className="ml-auto rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Xoa
                      </button>
                    </div>

                    {isUploadingThisItem && (
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                        <div className="h-full rounded-full bg-rose-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    )}

                    {!!item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.alt_text || `Community ${index + 1}`}
                        className="mt-2 h-24 w-full rounded-md border border-gray-200 object-cover dark:border-gray-700"
                      />
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addCommunityItem}
                className="rounded-lg border border-dashed border-gray-400 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-900"
              >
                + Thêm ảnh cộng đồng
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
                disabled={saving || publishing || loading || uploadingIndex !== null}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                {saving ? 'Đang lưu nháp...' : 'Lưu bản nháp'}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving || publishing || loading || uploadingIndex !== null}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {publishing ? 'Đang xuất bản...' : 'Xuất bản Cộng đồng'}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default CommunityManager;
