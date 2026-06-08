import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import LoadingOverlay from '../../../components/common/LoadingOverlay';
import { useToast } from '../../../components/Toast';
import { deleteCategory, getCategories } from '../../../services/categoryService';

type CategoryRow = {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

const Categories = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CategoryRow[]>([]);
  const [search, setSearch] = useState('');

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      const list = Array.isArray(data) ? data : [];
      setItems(
        list.map((c: any) => ({
          id: Number(c.id),
          name: String(c.name ?? ''),
          description: c.description === null || c.description === undefined ? null : String(c.description),
          image: c.image === null || c.image === undefined ? null : String(c.image),
          is_active: Boolean(c.is_active),
          created_at: c.created_at,
          updated_at: c.updated_at,
        }))
      );
    } catch (e) {
      setItems([]);
      showToast('Không tải được danh mục', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => x.name.toLowerCase().includes(q));
  }, [items, search]);

  const onDelete = async (categoryId: number, name: string) => {
    if (!window.confirm(`Xoá danh mục "${name}"?`)) return;
    setLoading(true);
    try {
      await deleteCategory(categoryId);
      showToast('Đã xoá danh mục', 'success');
      await fetchList();
    } catch (e) {
      showToast('Không xoá được danh mục', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoadingOverlay isLoading={loading} text="Đang tải danh mục..." />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mx-auto max-w-7xl px-4 py-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="min-w-0">
            <div className="text-sm text-gray-500 dark:text-gray-400">Quản lý</div>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">Danh mục</h1>
          </div>
          {/* <button
            onClick={() => navigate('/admin/categories/create')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 font-semibold shadow-sm transition-colors"
          >
            <Plus size={18} /> Tạo danh mục
          </button> */}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-semibold">
              <Tag size={18} />
              <span>Danh sách danh mục</span>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-80 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="Tìm theo tên danh mục..."
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/40 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Avatar</th>
                  <th className="text-left px-4 py-3 font-semibold">Tên</th>
                  <th className="text-left px-4 py-3 font-semibold">Mô tả</th>
                  <th className="text-left px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="text-right px-4 py-3 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filtered.map((c) => (
                  <tr key={c.id} className="text-gray-800 dark:text-gray-100">
                    <td className="px-4 py-3">
                      {c.image ? (
                        <img
                          src={c.image}
                          alt={c.name}
                          className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.description || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ' +
                          (c.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300')
                        }
                      >
                        {c.is_active ? 'Đang dùng' : 'Ẩn'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/categories/${c.id}/edit`)}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                          <Pencil size={16} /> Sửa
                        </button>
                        <button
                          onClick={() => onDelete(c.id, c.name)}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 font-semibold text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                          <Trash2 size={16} /> Xoá
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                      Không có danh mục.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Categories;
