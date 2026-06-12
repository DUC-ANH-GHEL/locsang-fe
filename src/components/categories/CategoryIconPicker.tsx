import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { ImagePlus, RotateCcw, UploadCloud } from 'lucide-react';

import { uploadAdminProductImage } from '../../services/productService';
import {
  CATEGORY_ICON_OPTIONS,
  CategoryIconPreview,
  getCategoryIconKey,
  getCategoryIconValue,
  isCategoryImageUrl,
  mapCategoryIcon,
} from '../../utils/categoryIcons';

type CategoryIconPickerProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const CategoryIconPicker = ({ name, value, onChange, disabled = false }: CategoryIconPickerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const autoOption = useMemo(() => mapCategoryIcon(name), [name]);
  const selectedKey = getCategoryIconKey(value);
  const hasCustomImage = isCategoryImageUrl(value);

  const uploadIcon = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn đúng file ảnh.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh icon tối đa 5MB.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const result = await uploadAdminProductImage(file);
      if (!result.url) throw new Error('Upload failed');
      onChange(result.url);
    } catch {
      setError('Không upload được ảnh icon. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Icon danh mục</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Nếu không chọn, hệ thống tự chọn icon theo tên danh mục. Bộ icon này chỉ gồm nhóm sản phẩm Lộc Sang.
          </div>
        </div>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20">
          <CategoryIconPreview
            name={name}
            value={value}
            size={36}
            iconClassName="text-rose-600 dark:text-rose-300"
            imageClassName="h-12 w-12 rounded-xl object-contain"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('')}
          className={`flex min-h-[4.9rem] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center text-xs font-black transition ${
            !value
              ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30'
              : 'border-gray-200 text-gray-700 hover:border-rose-200 dark:border-gray-800 dark:text-gray-200'
          }`}
        >
          <CategoryIconPreview name={name} value="" size={28} iconClassName="text-rose-600" />
          Tự động
          <span className="text-[10px] font-semibold text-gray-400">{autoOption.label}</span>
        </button>

        {CATEGORY_ICON_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(getCategoryIconValue(option.key))}
            className={`flex min-h-[4.9rem] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center text-xs font-black transition ${
              selectedKey === option.key
                ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30'
                : 'border-gray-200 text-gray-700 hover:border-rose-200 dark:border-gray-800 dark:text-gray-200'
            }`}
          >
            <CategoryIconPreview name={option.label} value={getCategoryIconValue(option.key)} size={30} iconClassName="text-rose-600" />
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-black text-gray-800 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          <UploadCloud size={18} />
          {uploading ? 'Đang upload...' : 'Upload ảnh icon'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadIcon} />
        {hasCustomImage && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange('')}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-black text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200"
          >
            <RotateCcw size={18} />
            Dùng icon tự động
          </button>
        )}
      </div>

      {hasCustomImage && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
          <ImagePlus size={16} />
          Đang dùng ảnh upload riêng.
        </div>
      )}
      {error && <div className="mt-3 text-sm font-semibold text-red-600">{error}</div>}
    </section>
  );
};

export default CategoryIconPicker;
