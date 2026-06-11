import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Image, RefreshCw, Save, Send, Upload } from 'lucide-react';

import { useToast } from '../../../components/Toast';
import {
  HomeContentPayload,
  homeContentService,
} from '../../../services/homeContentService';
import { formatViDateTime } from '../../../utils/dateTime';

type EditableBannerField = 'hero_image_url';

const fallbackBanner = '/locsang-assets/hero-yanmar.svg';
const inputClass =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100';

const normalizeImageUrl = (value: string) => {
  const trimmed = String(value || '').trim();
  return trimmed || fallbackBanner;
};

const HomeContentEditor = () => {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<HomeContentPayload | null>(null);
  const [published, setPublished] = useState<HomeContentPayload | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  const previewImage = useMemo(
    () => normalizeImageUrl(draft?.hero_image_url || ''),
    [draft?.hero_image_url],
  );

  const loadContent = async () => {
    try {
      setLoading(true);
      const response = await homeContentService.getAdminHomeContent();
      setDraft(response.draft);
      setPublished(response.published);
      setPublishedAt(response.published_at || null);
    } catch {
      showToast('Không tải được nội dung banner', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const updateField = (field: EditableBannerField, value: string) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const saveDraft = async () => {
    if (!draft) return;
    try {
      setSaving(true);
      const response = await homeContentService.updateDraft(draft);
      setDraft(response.draft);
      setPublished(response.published);
      setPublishedAt(response.published_at || null);
      showToast('Đã lưu nháp banner', 'success');
    } catch {
      showToast('Không lưu được banner', 'error');
    } finally {
      setSaving(false);
    }
  };

  const publishDraft = async () => {
    if (!draft) return;
    try {
      setPublishing(true);
      await homeContentService.updateDraft(draft);
      const response = await homeContentService.publishDraft();
      setDraft(response.draft);
      setPublished(response.published);
      setPublishedAt(response.published_at || null);
      showToast('Đã xuất bản banner ra storefront', 'success');
    } catch {
      showToast('Không xuất bản được banner', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setUploading(true);
      setUploadPercent(0);
      const response = await homeContentService.uploadHomeImage(file, setUploadPercent);
      updateField('hero_image_url', response.url);
      showToast('Đã tải ảnh banner lên', 'success');
    } catch {
      showToast('Không upload được ảnh banner', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        Đang tải nội dung banner...
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
        Chưa có dữ liệu banner để chỉnh sửa.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-300">
            Storefront CMS
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Banner trang chủ
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Banner storefront chỉ là một ảnh. Admin thay ảnh, lưu nháp rồi xuất bản để trang chủ nhận ảnh mới.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadContent}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RefreshCw size={16} />
            Tải lại
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving || publishing}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900 dark:bg-gray-900 dark:text-rose-200"
          >
            <Save size={16} />
            {saving ? 'Đang lưu...' : 'Lưu nháp'}
          </button>
          <button
            type="button"
            onClick={publishDraft}
            disabled={saving || publishing}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            <Send size={16} />
            {publishing ? 'Đang xuất bản...' : 'Xuất bản'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-800 dark:text-gray-100">
            <Image size={18} />
            Ảnh banner
          </div>

          <div className="grid gap-4">
            <Field label="Ảnh banner">
              <div className="flex gap-2">
                <input
                  value={draft.hero_image_url}
                  onChange={(event) => updateField('hero_image_url', event.target.value)}
                  className={inputClass}
                  placeholder="/locsang-assets/hero-yanmar.svg"
                />
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-gray-300 px-3 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                  <Upload size={18} />
                  <input type="file" accept="image/*" onChange={uploadImage} className="hidden" />
                </label>
              </div>
              {uploading && (
                <div className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300">
                  Đang upload {uploadPercent}%
                </div>
              )}
            </Field>

            <p className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:bg-gray-950 dark:text-gray-400">
              Khuyến nghị dùng ảnh ngang tỉ lệ 944:317 để banner hiển thị sát mock trên mobile.
            </p>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-800 dark:text-gray-100">
              Preview
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-[#d70918] dark:border-gray-800">
              <img
                src={previewImage}
                alt="Banner Lộc Sang"
                className="block aspect-[944/317] w-full object-cover"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            <div className="font-bold text-gray-900 dark:text-gray-100">Trạng thái xuất bản</div>
            <div className="mt-2">
              {publishedAt ? `Đã xuất bản: ${formatViDateTime(publishedAt)}` : 'Chưa có thời điểm xuất bản.'}
            </div>
            <div className="mt-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-950">
              Ảnh public hiện tại:{' '}
              <span className="break-all font-semibold text-gray-900 dark:text-gray-100">
                {published?.hero_image_url || fallbackBanner}
              </span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

const Field = ({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) => (
  <label className={`block ${className}`}>
    <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">
      {label}
    </span>
    {children}
  </label>
);

export default HomeContentEditor;
