import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, XCircle, Tag } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import LoadingOverlay from '../../../components/common/LoadingOverlay';
import { useToast } from '../../../components/Toast';
import { getCategoryById, updateCategory } from '../../../services/categoryService';

type FormError = Record<string, string>;

const EditCategory = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { id } = useParams();

  const categoryId = useMemo(() => Number(id), [id]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormError>({});

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!Number.isFinite(categoryId) || categoryId <= 0) return;
      setLoading(true);
      try {
        const data = await getCategoryById(categoryId);
        setName(String(data?.name ?? ''));
        setDescription(data?.description ? String(data.description) : '');
        setImage(data?.image ? String(data.image) : '');
        setIsActive(Boolean(data?.is_active));
      } catch (e) {
        showToast('Không tải được danh mục', 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [categoryId, showToast]);

  const validate = (): FormError => {
    const next: FormError = {};
    if (!name.trim()) {
      next.name = 'Tên danh mục không được để trống';
    } else if (name.trim().length < 2 || name.trim().length > 100) {
      next.name = 'Tên danh mục phải từ 2-100 ký tự';
    }
    return next;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      showToast('ID danh mục không hợp lệ', 'error');
      return;
    }

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      showToast('Vui lòng kiểm tra lại thông tin danh mục', 'warning');
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    try {
      await updateCategory(categoryId, {
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        image: image.trim() ? image.trim() : null,
        is_active: isActive,
      });

      showToast('Cập nhật danh mục thành công!', 'success');
      navigate('/admin/categories');
    } catch (error) {
      console.error('Error updating category:', error);
      showToast('Không cập nhật được danh mục. Vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <LoadingOverlay isLoading={loading} text="Đang cập nhật danh mục..." />
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onSubmit={onSubmit}
        className="mx-auto max-w-3xl bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 space-y-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm text-gray-500 dark:text-gray-400">Danh mục sản phẩm</div>
            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">Cập nhật danh mục</h2>
          </div>
          <div className="h-10 w-10 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center ring-1 ring-gray-200 dark:ring-gray-800">
            <Tag size={18} className="text-rose-600 dark:text-rose-200" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Tên danh mục</label>
          <input
            ref={nameInputRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.name;
                  return next;
                });
              }
            }}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
            placeholder="VD: Lọc nhớt"
          />
          {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Mô tả</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
            placeholder="Mô tả ngắn cho danh mục (tuỳ chọn)"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Ảnh avatar danh mục (URL)</label>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
            placeholder="https://..."
          />
          {image.trim() && (
            <div className="mt-3">
              <img
                src={image}
                alt="Preview avatar danh mục"
                className="h-20 w-20 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
                onLoad={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'block';
                }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Trạng thái</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Ẩn/hiện danh mục</div>
          </div>
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? 'bg-rose-600' : 'bg-gray-300 dark:bg-gray-700'
            }`}
            aria-label="Toggle active"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <XCircle size={18} /> Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 font-semibold text-white shadow-sm disabled:opacity-60"
          >
            <Save size={18} /> {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </motion.form>
    </>
  );
};

export default EditCategory;
