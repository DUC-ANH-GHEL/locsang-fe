import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Save } from 'lucide-react';

import { tipCategoryService } from '../../../services/tipCategoryService';
import { useToast } from '../../../components/Toast';
import { parseApiError } from '../../../utils/apiError';

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

const TipCategoryEditor = () => {
  const { id } = useParams();
  const categoryId = Number(id || 0);
  const isEdit = Number.isFinite(categoryId) && categoryId > 0;

  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    if (!isEdit) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const data = await tipCategoryService.getAdminTipCategoryById(categoryId);
        if (cancelled) return;

        setForm({
          name: data?.name || '',
          slug: data?.slug || '',
          description: data?.description || '',
          is_active: Boolean(data?.is_active),
          sort_order: Number(data?.sort_order || 0),
        });
        setSlugTouched(true);
      } catch (error) {
        const parsed = parseApiError(error);
        showToast(parsed?.message || 'Không tải được danh mục', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isEdit, categoryId, showToast]);

  useEffect(() => {
    if (slugTouched) return;
    setForm((prev) => ({ ...prev, slug: slugify(prev.name) }));
  }, [form.name, slugTouched]);

  const nameLen = useMemo(() => form.name.trim().length, [form.name]);

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      showToast('Vui lòng nhập tên danh mục', 'warning');
      return;
    }

    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };

    try {
      setSaving(true);
      if (isEdit) {
        await tipCategoryService.updateAdminTipCategory(categoryId, payload);
        showToast('Đã cập nhật danh mục', 'success');
      } else {
        await tipCategoryService.createAdminTipCategory(payload);
        showToast('Đã tạo danh mục mới', 'success');
      }
      navigate('/admin/tips/categories');
    } catch (error) {
      const parsed = parseApiError(error);
      showToast(parsed?.message || 'Không thể lưu danh mục', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-3xl bg-[#f4ede2] p-8 text-center text-[#635f54]">Đang tải dữ liệu danh mục...</div>;
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-5xl space-y-6 text-[#353229]">
      <div className="flex items-center gap-2 text-sm text-[#7f7a6f]">
        <span>Mẹo chăm sóc</span>
        <ChevronRight size={14} />
        <span>Danh mục bài viết</span>
        <ChevronRight size={14} />
        <span className="font-semibold text-[#8a4f41]">{isEdit ? 'Cập nhật danh mục' : 'Tạo danh mục mới'}</span>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#8a4f41]">{isEdit ? 'Cập nhật danh mục' : 'Tạo danh mục mới'}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/tips/categories')}
            className="rounded-full px-6 py-2.5 font-bold text-[#635f54] transition hover:bg-[#e9e2d4]"
          >
            Huỷ
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#8a4f41] px-6 py-2.5 font-bold text-white shadow-[0_8px_20px_rgba(138,79,65,0.28)] transition hover:opacity-90 disabled:opacity-60"
          >
            <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu danh mục'}
          </button>
        </div>
      </div>

      <section className="space-y-5 rounded-[2rem] bg-[#f4ede2] p-6 md:p-8">
        <div>
          <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Tên danh mục</label>
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-2xl border-none bg-white px-4 py-3 text-lg font-bold text-[#353229] placeholder:text-[#9a958a] focus:ring-2 focus:ring-[#fdb19f]"
            placeholder="Ví dụ: Chăm sóc sức khỏe"
          />
          <div className="mt-1 px-2 text-xs text-[#8f8a80]">{nameLen}/120 ký tự</div>
        </div>

        <div>
          <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Slug / URL</label>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm">
            <span className="whitespace-nowrap text-[#8f8a80]">locsang.shop/tips/category/</span>
            <input
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true);
                setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }));
              }}
              className="w-full border-none bg-transparent p-0 text-sm font-semibold text-[#5a564f] focus:ring-0"
              placeholder="cham-soc-suc-khoe"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Mô tả</label>
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            rows={4}
            className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm text-[#4e4a43] placeholder:text-[#9a958a] focus:ring-2 focus:ring-[#fdb19f]"
            placeholder="Mô tả ngắn cho danh mục này"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-[#eee7db] px-3 py-3 text-sm font-bold text-[#635f54]">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
              className="h-4 w-4 rounded border-[#b7b1a4] text-[#8a4f41] focus:ring-[#fdb19f]"
            />
            Kích hoạt danh mục
          </label>

          <div>
            <label className="mb-2 ml-2 block text-sm font-bold text-[#635f54]">Thứ tự hiển thị</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(event) => setForm((prev) => ({ ...prev, sort_order: Number(event.target.value || 0) }))}
              className="w-full rounded-2xl border-none bg-white px-4 py-3 text-sm font-semibold text-[#4e4a43] focus:ring-2 focus:ring-[#fdb19f]"
            />
          </div>
        </div>
      </section>
    </form>
  );
};

export default TipCategoryEditor;
