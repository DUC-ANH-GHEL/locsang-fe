import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, ChevronRight, Sparkles, CircleHelp } from 'lucide-react';

import { tipService } from '../../../services/tipService';
import { useToast } from '../../../components/Toast';
import { parseApiError } from '../../../utils/apiError';
import { formatViDate, parseApiDateTime } from '../../../utils/dateTime';

const formatDate = (value) => {
  const formatted = formatViDate(value, { dateStyle: 'medium', timeStyle: 'short' });
  return formatted || '-';
};

const isScheduledDraft = (item) => {
  if (!item || item.status !== 'draft' || !item.published_at) return false;
  const publishedAt = parseApiDateTime(item.published_at);
  if (!publishedAt) return false;
  return publishedAt.getTime() > Date.now();
};

const PAGE_SIZE = 8;

const TipsList = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [featured, setFeatured] = useState('all');
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await tipService.getAdminTips({
        page: 1,
        limit: 100,
        search,
        status,
        featured,
      });
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      const parsed = parseApiError(error);
      showToast(parsed?.message || 'Không tải được danh sách bài viết', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, featured]);

  useEffect(() => {
    setPage(1);
  }, [search, status, featured]);

  const totals = useMemo(() => {
    const published = items.filter((item) => item.status === 'published').length;
    const drafts = items.filter((item) => item.status === 'draft').length;
    const scheduled = items.filter((item) => isScheduledDraft(item)).length;
    return { total: items.length, published, drafts, scheduled };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageButtons = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, totalPages];
    if (page >= totalPages - 2) return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, page - 1, page, page + 1, totalPages];
  }, [page, totalPages]);

  const onDelete = async (id, title) => {
    if (!window.confirm(`Xoá bài viết "${title}"?`)) return;
    try {
      await tipService.deleteAdminTip(id);
      showToast('Đã xoá bài viết', 'success');
      fetchData();
    } catch (error) {
      const parsed = parseApiError(error);
      showToast(parsed?.message || 'Không xoá được bài viết', 'error');
    }
  };

  const renderSkeletons = () =>
    Array.from({ length: 4 }).map((_, index) => (
      <article key={`skeleton-${index}`} className="animate-pulse rounded-[1.5rem] bg-white px-4 py-4 md:px-5">
        <div className="h-4 w-40 rounded-full bg-[#efe7d9]" />
        <div className="mt-4 h-6 w-4/5 rounded-xl bg-[#efe7d9]" />
        <div className="mt-3 h-4 w-1/3 rounded-full bg-[#f5eee3]" />
        <div className="mt-6 flex justify-end gap-2">
          <div className="h-9 w-20 rounded-full bg-[#f5eee3]" />
          <div className="h-9 w-20 rounded-full bg-[#f3dfdb]" />
        </div>
      </article>
    ));

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#353229]">
      <div className="flex items-center gap-2 text-sm text-[#7f7a6f]">
        <span>Mẹo chăm sóc</span>
        <ChevronRight size={14} />
        <span className="font-semibold text-[#8a4f41]">Danh sách bài viết</span>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#8a4f41]">Quản lý bài viết</h1>
          <p className="mt-1 text-[#635f54]">Theo dõi nội dung blog để tăng traffic và tương tác tự nhiên.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/tips/create')}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8a4f41] px-6 py-3 font-bold text-white shadow-[0_8px_20px_rgba(138,79,65,0.28)] transition hover:opacity-90"
        >
          <Plus size={16} /> Tạo bài viết
        </button>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-[1.6rem] bg-[#f4ede2] p-5">
          <div className="text-sm font-semibold text-[#7f7a6f]">Tổng bài viết</div>
          <div className="mt-2 text-3xl font-extrabold text-[#2f2b24]">{totals.total}</div>
        </div>
        <div className="rounded-[1.6rem] bg-[#f4ede2] p-5">
          <div className="text-sm font-semibold text-[#7f7a6f]">Đã xuất bản</div>
          <div className="mt-2 text-3xl font-extrabold text-[#316354]">{totals.published}</div>
        </div>
        <div className="rounded-[1.6rem] bg-[#f4ede2] p-5">
          <div className="text-sm font-semibold text-[#7f7a6f]">Bản nháp</div>
          <div className="mt-2 text-3xl font-extrabold text-[#8a4f41]">{totals.drafts}</div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-[#f4ede2] p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="relative md:col-span-3">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7f7a6f]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tiêu đề, mô tả, slug..."
              className="w-full rounded-full border-none bg-white px-9 py-3 text-sm text-[#353229] placeholder:text-[#9a958a] focus:ring-2 focus:ring-[#fdb19f]"
            />
          </div>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-full border-none bg-white px-4 py-3 text-sm font-semibold text-[#4e4a43] focus:ring-2 focus:ring-[#fdb19f]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">Nháp</option>
            <option value="published">Đã xuất bản</option>
            <option value="archived">Lưu trữ</option>
          </select>

          <select
            value={featured}
            onChange={(event) => setFeatured(event.target.value)}
            className="rounded-full border-none bg-white px-4 py-3 text-sm font-semibold text-[#4e4a43] focus:ring-2 focus:ring-[#fdb19f]"
          >
            <option value="all">Tất cả bài viết</option>
            <option value="true">Nổi bật</option>
            <option value="false">Không nổi bật</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] bg-[#f4ede2] p-3 md:p-4">
        <div className="grid grid-cols-1 gap-3">
          {loading ? (
            renderSkeletons()
          ) : items.length === 0 ? (
            <div className="rounded-[1.5rem] bg-white p-8 text-center text-[#7f7a6f]">Chưa có bài viết nào.</div>
          ) : (
            pagedItems.map((item) => (
              <article key={item.id} className="rounded-[1.5rem] bg-white px-4 py-4 shadow-[0_8px_20px_rgba(53,50,41,0.05)] md:px-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {isScheduledDraft(item) ? (
                        <span className="inline-flex rounded-full bg-[#ffe6b3] px-2.5 py-1 font-semibold text-[#7a4d00]">
                          Đang hẹn giờ
                        </span>
                      ) : null}
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 font-semibold ${
                          item.status === 'published'
                            ? 'bg-[#c7fce9] text-[#316354]'
                            : item.status === 'draft'
                              ? 'bg-[#fdb19f] text-[#633024]'
                              : 'bg-[#e9e2d4] text-[#635f54]'
                        }`}
                      >
                        {item.status === 'published' ? 'Đã xuất bản' : item.status === 'draft' ? 'Nháp' : 'Lưu trữ'}
                      </span>
                      {item.featured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#ff9ea4]/40 px-2.5 py-1 font-semibold text-[#691724]">
                          <Sparkles size={12} /> Nổi bật
                        </span>
                      )}
                      <span className="text-[#7f7a6f]">{item.category || 'Chưa có danh mục'}</span>
                    </div>

                    <h3 className="mt-2 truncate text-lg font-bold text-[#2f2b24]">{item.title}</h3>
                    <div className="mt-1 text-xs text-[#7f7a6f]">/{item.slug}</div>
                    <div className="mt-2 text-xs text-[#8f8a80]">Xuất bản: {formatDate(item.published_at)}</div>
                    {isScheduledDraft(item) && <div className="mt-1 text-xs font-semibold text-[#7a4d00]">Lên lịch: {formatDate(item.published_at)}</div>}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/tips/${item.id}/edit`)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#d8d0c2] bg-white px-4 py-2 text-sm font-semibold text-[#5a564f] hover:bg-[#f9f3e9]"
                    >
                      <Pencil size={14} /> Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id, item.title)}
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

        {!loading && items.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 rounded-[1.5rem] bg-white p-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-[#7f7a6f]">
              Hiển thị <span className="font-semibold text-[#4e4a43]">{(page - 1) * PAGE_SIZE + 1}</span>-
              <span className="font-semibold text-[#4e4a43]">{Math.min(page * PAGE_SIZE, items.length)}</span> /{' '}
              <span className="font-semibold text-[#4e4a43]">{items.length}</span> bài viết
              {totals.scheduled > 0 && (
                <span className="ml-2 inline-flex rounded-full bg-[#ffe6b3] px-2 py-0.5 text-xs font-semibold text-[#7a4d00]">
                  {totals.scheduled} bài đang hẹn giờ
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-full border border-[#ded6c8] px-3 py-1.5 text-sm font-semibold text-[#5a564f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Trước
              </button>

              {pageButtons.map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => setPage(btn)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    btn === page ? 'bg-[#8a4f41] text-white' : 'bg-[#f4ede2] text-[#635f54] hover:bg-[#ece3d3]'
                  }`}
                >
                  {btn}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="rounded-full border border-[#ded6c8] px-3 py-1.5 text-sm font-semibold text-[#5a564f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="fixed bottom-8 right-10 z-30 hidden md:block">
        <button type="button" className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#8a4f41] text-white shadow-[0_10px_24px_rgba(138,79,65,0.28)]">
          <CircleHelp size={20} />
        </button>
      </div>
    </div>
  );
};

export default TipsList;
