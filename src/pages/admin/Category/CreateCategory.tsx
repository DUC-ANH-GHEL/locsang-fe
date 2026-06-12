import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Tag, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadingOverlay from '../../../components/common/LoadingOverlay';
import { useToast } from '../../../components/Toast';
import CategoryIconPicker from '../../../components/categories/CategoryIconPicker';
import { createCategory } from '../../../services/categoryService';

type FormError = Record<string, string>;

const CreateCategory = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
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

  const validate = (): FormError => {
    const next: FormError = {};
    if (!name.trim()) {
      next.name = 'Tên danh mục không được để trống';
    } else if (name.trim().length < 2 || name.trim().length > 100) {
      next.name = 'Tên danh mục phải từ 2 đến 100 ký tự';
    }
    return next;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      nameInputRef.current?.focus();
      showToast('Vui lòng kiểm tra lại thông tin danh mục', 'warning');
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    try {
      await createCategory({
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        image: image.trim() ? image.trim() : null,
        is_active: isActive,
      });

      showToast('Tạo danh mục thành công!', 'success');
      setName('');
      setDescription('');
      setImage('');
      setIsActive(true);
      setErrors({});

      navigate('/admin/categories');
    } catch (error) {
      console.error('Error creating category:', error);
      showToast('Không tạo được danh mục. Vui lòng thử lại.', 'error');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <LoadingOverlay isLoading={loading} text="Đang tạo danh mục..." />
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onSubmit={onSubmit}
        className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm text-gray-500 dark:text-gray-400">Danh mục sản phẩm</div>
            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">Tạo danh mục mới</h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 ring-1 ring-gray-200 dark:bg-rose-500/10 dark:ring-gray-800">
            <Tag size={18} className="text-rose-600 dark:text-rose-200" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-900 dark:text-gray-100">Tên danh mục</label>
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
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            placeholder="VD: Lọc nhớt"
          />
          {errors.name && <div className="mt-1 text-xs text-red-500">{errors.name}</div>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-900 dark:text-gray-100">Mô tả</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            placeholder="Mô tả ngắn cho danh mục, có thể để trống"
            rows={4}
          />
        </div>

        <CategoryIconPicker name={name} value={image} onChange={setImage} disabled={isSubmitting} />

        <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Trạng thái</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Bật để hiển thị danh mục trên storefront</div>
          </div>
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? 'bg-rose-600' : 'bg-gray-300 dark:bg-gray-700'
            }`}
            aria-label="Bật tắt trạng thái danh mục"
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="flex flex-col justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <XCircle size={18} /> Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
          >
            <Save size={18} /> {isSubmitting ? 'Đang lưu...' : 'Lưu danh mục'}
          </button>
        </div>
      </motion.form>
    </>
  );
};

export default CreateCategory;
