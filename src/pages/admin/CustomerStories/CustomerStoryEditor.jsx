import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ChevronRight, ImagePlus, X } from 'lucide-react';

import { customerStoryService } from '../../../services/customerStoryService';
import { useToast } from '../../../components/Toast';
import { parseApiError } from '../../../utils/apiError';

const CustomerStoryEditor = () => {
  const { id } = useParams();
  const storyId = Number(id || 0);
  const isEdit = Number.isFinite(storyId) && storyId > 0;

  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    customer_name: '',
    pet_name: '',
    customer_title: '',
    quote: '',
    rating: 5,
    image_url: '',
    is_featured: false,
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    if (!isEdit) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const data = await customerStoryService.getAdminStoryById(storyId);
        if (cancelled) return;

        setForm({
          customer_name: data?.customer_name || '',
          pet_name: data?.pet_name || '',
          customer_title: data?.customer_title || '',
          quote: data?.quote || '',
          rating: Number(data?.rating || 5),
          image_url: data?.image_url || '',
          is_featured: Boolean(data?.is_featured),
          is_active: Boolean(data?.is_active),
          sort_order: Number(data?.sort_order || 0),
        });
      } catch (error) {
        const parsed = parseApiError(error);
        showToast(parsed?.message || 'Không tải được câu chuyện', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isEdit, storyId, showToast]);

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!form.customer_name.trim() || !form.quote.trim()) {
      showToast('Vui lòng nhập tên khách và nội dung câu chuyện', 'warning');
      return;
    }

    const payload = {
      customer_name: form.customer_name,
      pet_name: form.pet_name || null,
      customer_title: form.customer_title || null,
      quote: form.quote,
      rating: Number(form.rating || 5),
      image_url: form.image_url || null,
      is_featured: form.is_featured,
      is_active: form.is_active,
      sort_order: Number(form.sort_order || 0),
    };

    try {
      setSaving(true);
      if (isEdit) {
        await customerStoryService.updateAdminStory(storyId, payload);
        showToast('Đã cập nhật câu chuyện', 'success');
      } else {
        await customerStoryService.createAdminStory(payload);
        showToast('Đã tạo câu chuyện mới', 'success');
      }
      navigate('/admin/customer-stories');
    } catch (error) {
      const parsed = parseApiError(error);
      showToast(parsed?.message || 'Không thể lưu câu chuyện', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      setUploadProgress(0);
      const data = await customerStoryService.uploadAdminStoryImage(file, setUploadProgress);
      setForm((prev) => ({ ...prev, image_url: data?.url || prev.image_url }));
      showToast('Đã tải ảnh lên', 'success');
    } catch (error) {
      const parsed = parseApiError(error);
      showToast(parsed?.message || 'Không thể tải ảnh', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="rounded-3xl bg-[#f4ede2] p-8 text-center text-[#635f54]">Đang tải dữ liệu câu chuyện...</div>;
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-5xl space-y-6 text-[#353229]">
      <div className="flex items-center gap-2 text-sm text-[#7f7a6f]">
        <span>Câu chuyện khách hàng</span>
        <ChevronRight size={14} />
        <span className="font-semibold text-[#8a4f41]">{isEdit ? 'Cập nhật câu chuyện' : 'Tạo câu chuyện mới'}</span>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#8a4f41]">{isEdit ? 'Cập nhật câu chuyện' : 'Tạo câu chuyện mới'}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/customer-stories')}
            className="rounded-full px-6 py-2.5 font-bold text-[#635f54] transition hover:bg-[#e9e2d4]"
          >
            Huỷ
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#8a4f41] px-6 py-2.5 font-bold text-white shadow-[0_8px_20px_rgba(138,79,65,0.28)] transition hover:opacity-90 disabled:opacity-60"
          >
            <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu câu chuyện'}
          </button>
        </div>
      </div>

      <section className="space-y-5 rounded-[2rem] bg-[#f4ede2] p-6 md:p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Tên khách hàng</label>
            <input
              value={form.customer_name}
              onChange={(event) => setForm((prev) => ({ ...prev, customer_name: event.target.value }))}
              className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm font-semibold text-[#353229] placeholder:text-[#9a958a] focus:ring-2 focus:ring-[#fdb19f]"
              placeholder="Ví dụ: Chị Lan"
            />
          </div>
          <div>
            <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Tên bé cưng</label>
            <input
              value={form.pet_name}
              onChange={(event) => setForm((prev) => ({ ...prev, pet_name: event.target.value }))}
              className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm text-[#353229] placeholder:text-[#9a958a] focus:ring-2 focus:ring-[#fdb19f]"
              placeholder="Ví dụ: Mochi"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Vai trò/ghi chú</label>
          <input
            value={form.customer_title}
            onChange={(event) => setForm((prev) => ({ ...prev, customer_title: event.target.value }))}
            className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm text-[#353229] placeholder:text-[#9a958a] focus:ring-2 focus:ring-[#fdb19f]"
            placeholder="Ví dụ: Khách hàng thân thiết"
          />
        </div>

        <div>
          <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Nội dung câu chuyện</label>
          <textarea
            value={form.quote}
            onChange={(event) => setForm((prev) => ({ ...prev, quote: event.target.value }))}
            rows={5}
            className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm text-[#4e4a43] placeholder:text-[#9a958a] focus:ring-2 focus:ring-[#fdb19f]"
            placeholder="Chia sẻ trải nghiệm của khách hàng với sản phẩm Lộc Sang..."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Đánh giá sao</label>
            <select
              value={form.rating}
              onChange={(event) => setForm((prev) => ({ ...prev, rating: Number(event.target.value || 5) }))}
              className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm font-semibold text-[#4e4a43] focus:ring-2 focus:ring-[#fdb19f]"
            >
              <option value={5}>5 sao</option>
              <option value={4}>4 sao</option>
              <option value={3}>3 sao</option>
              <option value={2}>2 sao</option>
              <option value={1}>1 sao</option>
            </select>
          </div>

          <div>
            <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Thứ tự hiển thị</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(event) => setForm((prev) => ({ ...prev, sort_order: Number(event.target.value || 0) }))}
              className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm font-semibold text-[#4e4a43] focus:ring-2 focus:ring-[#fdb19f]"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[#eee7db] px-3 py-3 text-sm font-bold text-[#635f54] md:mt-8">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(event) => setForm((prev) => ({ ...prev, is_featured: event.target.checked }))}
              className="h-4 w-4 rounded border-[#b7b1a4] text-[#8a4f41] focus:ring-[#fdb19f]"
            />
            Ghim nổi bật
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[#eee7db] px-3 py-3 text-sm font-bold text-[#635f54] md:mt-8">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
              className="h-4 w-4 rounded border-[#b7b1a4] text-[#8a4f41] focus:ring-[#fdb19f]"
            />
            Hiển thị ở storefront
          </label>
        </div>

        <div>
          <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Ảnh đại diện khách hàng</label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#fff7f6] px-4 py-2.5 text-sm font-bold text-[#8a4f41] hover:bg-white disabled:opacity-60"
            >
              <ImagePlus size={14} /> {uploading ? `Đang upload ${uploadProgress}%` : form.image_url ? 'Đổi ảnh trực tiếp' : 'Upload ảnh trực tiếp'}
            </button>
            {form.image_url ? (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, image_url: '' }))}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#e3dac8] px-4 py-2.5 text-sm font-semibold text-[#7a7368] hover:bg-[#f8f1e6]"
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
          {form.image_url && (
            <div className="mt-3 overflow-hidden rounded-xl bg-white p-2 shadow-sm">
              <img src={form.image_url} alt="Preview" className="h-40 w-full rounded-lg object-cover" />
            </div>
          )}
        </div>
      </section>
    </form>
  );
};

export default CustomerStoryEditor;
