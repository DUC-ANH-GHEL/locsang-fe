import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Pencil, Trash2, Search, CheckCircle2 } from 'lucide-react';

import { tipCategoryService } from '../../../services/tipCategoryService';
import { useToast } from '../../../components/Toast';
import { parseApiError } from '../../../utils/apiError';

const TipCategories = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await tipCategoryService.getAdminTipCategories({
        search,
        is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
      });
      setItems(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      const parsed = parseApiError(error);
      showToast(parsed?.message || 'Không tải được danh mục bài viết', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeFilter]);

  const totals = useMemo(() => {
    const active = items.filter((item) => item.is_active).length;
    return { total: items.length, active, inactive: items.length - active };
  }, [items]);

  const onDelete = async (id, name) => {
    if (!window.confirm(`Xoá danh mục "${name}"?`)) return;
    try {
      await tipCategoryService.deleteAdminTipCategory(id);
      showToast('Đã xoá danh mục', 'success');
      fetchData();
    } catch (error) {
      const parsed = parseApiError(error);
      showToast(parsed?.message || 'Không xoá được danh mục', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#353229]">
      <div className="flex items-center gap-2 text-sm text-[#7f7a6f]">
        <span>Mẹo chăm sóc</span>
        <ChevronRight size={14} />
        <span className="font-semibold text-[#8a4f41]">Danh mục bài viết</span>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#8a4f41]">Quản lý danh mục bài viết</h1>
          <p className="mt-1 text-[#635f54]">Tạo và quản lý các nhóm chủ đề cho nội dung blog.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/tips/categories/create')}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8a4f41] px-6 py-3 font-bold text-white shadow-[0_8px_20px_rgba(138,79,65,0.28)] transition hover:opacity-90"
        >
          <Plus size={16} /> Tạo danh mục
        </button>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-[1.6rem] bg-[#f4ede2] p-5">
          <div className="text-sm font-semibold text-[#7f7a6f]">Tổng danh mục</div>
          <div className="mt-2 text-3xl font-extrabold text-[#2f2b24]">{totals.total}</div>
        </div>
        <div className="rounded-[1.6rem] bg-[#f4ede2] p-5">
          <div className="text-sm font-semibold text-[#7f7a6f]">Đang hoạt động</div>
          <div className="mt-2 text-3xl font-extrabold text-[#316354]">{totals.active}</div>
        </div>
        <div className="rounded-[1.6rem] bg-[#f4ede2] p-5">
          <div className="text-sm font-semibold text-[#7f7a6f]">Đã ẩn</div>
          <div className="mt-2 text-3xl font-extrabold text-[#8a4f41]">{totals.inactive}</div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-[#f4ede2] p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="relative md:col-span-3">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7a6f]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, mô tả..."
              className="w-full rounded-full border-none bg-white px-9 py-3 text-sm text-[#353229] placeholder:text-[#9a958a] focus:ring-2 focus:ring-[#fdb19f]"
            />
          </div>

          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
            className="md:col-span-2 rounded-full border-none bg-white px-4 py-3 text-sm font-semibold text-[#4e4a43] focus:ring-2 focus:ring-[#fdb19f]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã ẩn</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] bg-[#f4ede2] p-3 md:p-4">
        <div className="grid grid-cols-1 gap-3">
          {loading ? (
            <div className="rounded-[1.5rem] bg-white p-8 text-center text-[#7f7a6f]">Đang tải dữ liệu...</div>
          ) : items.length === 0 ? (
            <div className="rounded-[1.5rem] bg-white p-8 text-center text-[#7f7a6f]">Chưa có danh mục nào.</div>
          ) : (
            items.map((item) => (
              <article key={item.id} className="rounded-[1.5rem] bg-white px-4 py-4 shadow-[0_8px_20px_rgba(53,50,41,0.05)] md:px-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 font-semibold ${
                          item.is_active ? 'bg-[#c7fce9] text-[#316354]' : 'bg-[#e9e2d4] text-[#635f54]'
                        }`}
                      >
                        {item.is_active ? 'Đang hoạt động' : 'Đã ẩn'}
                      </span>
                      <span className="text-[#7f7a6f]">Thứ tự: {item.sort_order || 0}</span>
                    </div>

                    <h3 className="mt-2 truncate text-lg font-bold text-[#2f2b24]">{item.name}</h3>
                    <div className="mt-1 text-xs text-[#7f7a6f]">/{item.slug}</div>
                    <div className="mt-2 text-sm text-[#6a665d]">{item.description || 'Chưa có mô tả'}</div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/tips/categories/${item.id}/edit`)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#d8d0c2] bg-white px-4 py-2 text-sm font-semibold text-[#5a564f] hover:bg-[#f9f3e9]"
                    >
                      <Pencil size={14} /> Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id, item.name)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#f3cbc2] bg-[#fff7f6] px-4 py-2 text-sm font-semibold text-[#ac3149] hover:bg-[#ffeceb]"
                    >
                      <Trash2 size={14} /> Xoá
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default TipCategories;
