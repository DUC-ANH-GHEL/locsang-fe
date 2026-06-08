import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Quote } from 'lucide-react';

import { customerStoryService } from '../../../services/customerStoryService';
import { useToast } from '../../../components/Toast';
import { parseApiError } from '../../../utils/apiError';

const renderStars = (rating = 5) => '★'.repeat(Math.max(1, Math.min(5, Number(rating || 5))));

const CustomerStoriesList = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await customerStoryService.getAdminStories({
        search,
        is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
      });
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      const parsed = parseApiError(error);
      showToast(parsed?.message || 'Không tải được câu chuyện khách hàng', 'error');
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
    const featured = items.filter((item) => item.is_featured).length;
    return { total: items.length, active, inactive: items.length - active, featured };
  }, [items]);

  const onDelete = async (id, customerName) => {
    if (!window.confirm(`Xoá câu chuyện của "${customerName}"?`)) return;
    try {
      await customerStoryService.deleteAdminStory(id);
      showToast('Đã xoá câu chuyện khách hàng', 'success');
      fetchData();
    } catch (error) {
      const parsed = parseApiError(error);
      showToast(parsed?.message || 'Không xoá được câu chuyện', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#353229]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#8a4f41]">Câu chuyện khách hàng</h1>
          <p className="mt-1 text-[#635f54]">Quản lý testimonial hiển thị trên trang chủ storefront.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/customer-stories/create')}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8a4f41] px-6 py-3 font-bold text-white shadow-[0_8px_20px_rgba(138,79,65,0.28)] transition hover:opacity-90"
        >
          <Plus size={16} /> Tạo câu chuyện
        </button>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-[1.6rem] bg-[#f4ede2] p-5">
          <div className="text-sm font-semibold text-[#7f7a6f]">Tổng mục</div>
          <div className="mt-2 text-3xl font-extrabold text-[#2f2b24]">{totals.total}</div>
        </div>
        <div className="rounded-[1.6rem] bg-[#f4ede2] p-5">
          <div className="text-sm font-semibold text-[#7f7a6f]">Đang hiển thị</div>
          <div className="mt-2 text-3xl font-extrabold text-[#316354]">{totals.active}</div>
        </div>
        <div className="rounded-[1.6rem] bg-[#f4ede2] p-5">
          <div className="text-sm font-semibold text-[#7f7a6f]">Đã ẩn</div>
          <div className="mt-2 text-3xl font-extrabold text-[#8a4f41]">{totals.inactive}</div>
          {totals.featured > 0 && <div className="mt-1 text-xs font-semibold text-[#8a4f41]">{totals.featured} mục nổi bật</div>}
        </div>
      </section>

      <section className="rounded-[2rem] bg-[#f4ede2] p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="relative md:col-span-3">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7a6f]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên khách, bé cưng, nội dung..."
              className="w-full rounded-full border-none bg-white px-9 py-3 text-sm text-[#353229] placeholder:text-[#9a958a] focus:ring-2 focus:ring-[#fdb19f]"
            />
          </div>

          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
            className="md:col-span-2 rounded-full border-none bg-white px-4 py-3 text-sm font-semibold text-[#4e4a43] focus:ring-2 focus:ring-[#fdb19f]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hiển thị</option>
            <option value="inactive">Đã ẩn</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] bg-[#f4ede2] p-3 md:p-4">
        <div className="grid grid-cols-1 gap-3">
          {loading ? (
            <div className="rounded-[1.5rem] bg-white p-8 text-center text-[#7f7a6f]">Đang tải dữ liệu...</div>
          ) : items.length === 0 ? (
            <div className="rounded-[1.5rem] bg-white p-8 text-center text-[#7f7a6f]">Chưa có câu chuyện nào.</div>
          ) : (
            items.map((item) => (
              <article key={item.id} className="rounded-[1.5rem] bg-white px-4 py-4 shadow-[0_8px_20px_rgba(53,50,41,0.05)] md:px-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {item.is_featured && (
                        <span className="inline-flex rounded-full bg-[#ffe6b3] px-2.5 py-1 font-semibold text-[#7a4d00]">
                          Nổi bật
                        </span>
                      )}
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 font-semibold ${
                          item.is_active ? 'bg-[#c7fce9] text-[#316354]' : 'bg-[#e9e2d4] text-[#635f54]'
                        }`}
                      >
                        {item.is_active ? 'Đang hiển thị' : 'Đã ẩn'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff3e5] px-2.5 py-1 font-semibold text-[#8a4f41]">
                        <Quote size={12} /> {renderStars(item.rating)}
                      </span>
                    </div>

                    <h3 className="mt-2 truncate text-lg font-bold text-[#2f2b24]">
                      {item.customer_name}
                      {item.pet_name ? ` & ${item.pet_name}` : ''}
                    </h3>
                    <div className="mt-1 text-sm text-[#7f7a6f]">{item.customer_title || 'Khách hàng Lộc Sang'}</div>
                    <p className="mt-2 line-clamp-2 text-sm text-[#4e4a43]">{item.quote}</p>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/customer-stories/${item.id}/edit`)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#d8d0c2] bg-white px-4 py-2 text-sm font-semibold text-[#5a564f] hover:bg-[#f9f3e9]"
                    >
                      <Pencil size={14} /> Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id, item.customer_name)}
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

export default CustomerStoriesList;
