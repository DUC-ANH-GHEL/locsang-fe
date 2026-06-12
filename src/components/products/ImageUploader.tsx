import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { optimizeImageForUpload } from '../../utils/imageUploadOptimization';

type ImageItem = File | string;

const DEFAULT_MAX_IMAGES = 9;

interface ImageUploaderProps {
  onImagesUpdate: (images: File[], existing: string[], orderedImages: ImageItem[]) => void;
  initialImages?: Array<string | File>;
  label?: string;
  helpText?: string;
  requiredPrimary?: boolean;
  maxImages?: number;
  disabled?: boolean;
}

const areImageListsEqual = (a: ImageItem[], b: ImageItem[]) => {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
};

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  if (fromIndex === toIndex) return items;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

const isImageItem = (item: unknown): item is ImageItem => item instanceof File || (typeof item === 'string' && item.trim().length > 0);

const sanitizeImageItems = (items: unknown[]): ImageItem[] => items.filter(isImageItem);

const ImageUploader = ({
  onImagesUpdate,
  initialImages = [],
  label = 'Ảnh sản phẩm',
  helpText,
  requiredPrimary,
  maxImages = DEFAULT_MAX_IMAGES,
  disabled = false,
}: ImageUploaderProps) => {
  const [images, setImages] = useState<ImageItem[]>(() => sanitizeImageItems(initialImages));
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const objectUrlMapRef = useRef<Map<File, string>>(new Map());
  const fileKeyMapRef = useRef<WeakMap<File, string>>(new WeakMap());
  const dragRef = useRef<{
    pointerId: number;
    currentIndex: number;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);

  const getItemKey = (item: ImageItem) => {
    if (typeof item === 'string') return `url:${item}`;
    const existing = fileKeyMapRef.current.get(item);
    if (existing) return existing;
    const key = `file:${item.name}:${item.size}:${item.lastModified}:${Math.random().toString(16).slice(2)}`;
    fileKeyMapRef.current.set(item, key);
    return key;
  };

  const getPreviewSrc = (item: ImageItem) => {
    if (typeof item === 'string') return item;
    const existing = objectUrlMapRef.current.get(item);
    if (existing) return existing;
    const created = URL.createObjectURL(item);
    objectUrlMapRef.current.set(item, created);
    return created;
  };

  useEffect(() => {
    const next = sanitizeImageItems(initialImages);
    setImages((prev) => (areImageListsEqual(prev, next) ? prev : next));
  }, [initialImages]);

  useEffect(() => {
    const map = objectUrlMapRef.current;
    const currentFiles = new Set<File>();

    images.forEach((item) => {
      if (item instanceof File) currentFiles.add(item);
    });

    for (const [file, url] of map.entries()) {
      if (!currentFiles.has(file)) {
        URL.revokeObjectURL(url);
        map.delete(file);
      }
    }

    onImagesUpdate(
      images.filter((item): item is File => item instanceof File),
      images.filter((item): item is string => typeof item === 'string'),
      images,
    );
  }, [images, onImagesUpdate]);

  useEffect(() => {
    return () => {
      for (const url of objectUrlMapRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      objectUrlMapRef.current.clear();
    };
  }, []);

  const compressIfNeeded = async (file: File): Promise<File> => {
    const maxBytes = 10 * 1024 * 1024;

    if ((file.type || '') === 'image/svg+xml') {
      throw new Error(`${file.name}: SVG không hỗ trợ chuyển sang WebP. Vui lòng dùng JPG, PNG hoặc WebP.`);
    }

    const result = await optimizeImageForUpload(file, {
      maxSizeMB: 10,
      maxWidthOrHeight: 2560,
      initialQuality: 0.85,
    });

    if (result.size > maxBytes) {
      throw new Error(`${file.name}: ảnh sau khi tối ưu vẫn lớn hơn 10MB.`);
    }

    return result;
  };

  const appendFiles = async (files: File[]) => {
    if (disabled || files.length === 0) return;

    const remainingSlots = Math.max(0, maxImages - images.length);
    const accepted: File[] = [];
    const rejected: string[] = [];

    if (remainingSlots <= 0) {
      setUploadError(`Tối đa ${maxImages} ảnh`);
      return;
    }

    for (const file of files) {
      if (accepted.length >= remainingSlots) {
        rejected.push(`Chỉ được tối đa ${maxImages} ảnh`);
        continue;
      }
      if (!(file.type || '').startsWith('image/')) {
        rejected.push(`${file.name}: không phải ảnh`);
        continue;
      }
      try {
        accepted.push(await compressIfNeeded(file));
      } catch (error: any) {
        rejected.push(error?.message ? String(error.message) : `${file.name}: lỗi nén ảnh`);
      }
    }

    setUploadError(rejected.length > 0 ? rejected.join(' | ') : null);
    if (accepted.length > 0) setImages((prev) => [...prev, ...accepted]);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    event.target.value = '';
    appendFiles(files);
  };

  const reorder = (fromIndex: number, toIndex: number) => {
    setImages((prev) => moveItem(prev, fromIndex, toIndex));
    dragRef.current = dragRef.current ? { ...dragRef.current, currentIndex: toIndex } : null;
    setDraggingIndex(toIndex);
    setDragOverIndex(toIndex);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (disabled || !state || state.pointerId !== event.pointerId) return;

    const distance = Math.abs(event.clientX - state.startX) + Math.abs(event.clientY - state.startY);
    if (!state.active && distance < 6) return;

    state.active = true;
    event.preventDefault();

    const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    const imageTarget = target?.closest('[data-image-index]') as HTMLElement | null;
    if (!imageTarget) return;

    const nextIndex = Number(imageTarget.dataset.imageIndex);
    if (!Number.isInteger(nextIndex) || nextIndex === state.currentIndex) return;
    reorder(state.currentIndex, nextIndex);
  };

  const stopPointerDrag = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (event && dragRef.current?.pointerId === event.pointerId) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }
    dragRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const removeImage = (index: number) => {
    if (disabled) return;
    setImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-bold text-slate-800 dark:text-slate-100">
        {label}
        {requiredPrimary ? ' *' : ''}
      </label>
      {helpText && <div className="mb-2 text-xs font-semibold text-slate-500">{helpText}</div>}

      <div
        className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center transition hover:border-rose-300 dark:border-slate-700 dark:bg-slate-950"
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
        }}
        onDrop={(event) => {
          if (disabled) return;
          event.preventDefault();
          appendFiles(Array.from(event.dataTransfer?.files || []));
        }}
      >
        <input
          type="file"
          id="images"
          name="images"
          className="hidden"
          disabled={disabled}
          onChange={handleImageUpload}
          multiple
          accept="image/*"
        />
        <label htmlFor="images" className={disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}>
          <div className="space-y-1 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm font-bold text-slate-600">Kéo thả hoặc click để chọn ảnh</p>
            <p className="text-xs font-semibold text-slate-500">Tối đa {maxImages} ảnh, ảnh đầu tiên là ảnh chính</p>
            <p className="text-xs font-semibold text-slate-500">Kéo thumbnail sang vị trí mới để sắp xếp</p>
          </div>
        </label>
      </div>

      {uploadError && <div className="mt-2 text-xs font-bold text-red-600">{uploadError}</div>}

      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((imageItem, index) => {
            const src = getPreviewSrc(imageItem);
            const isDragging = draggingIndex === index;
            const isHoverTarget = dragOverIndex === index;

            return (
              <div
                key={getItemKey(imageItem)}
                data-image-index={index}
                className={`group relative touch-none select-none rounded-xl border bg-white p-1 shadow-sm transition-all duration-150 dark:bg-slate-950 ${
                  disabled ? 'cursor-default opacity-75' : 'cursor-grab active:cursor-grabbing'
                } ${
                  isDragging
                    ? 'z-20 scale-[0.98] border-rose-500 opacity-80 shadow-lg ring-2 ring-rose-500 ring-offset-2'
                    : isHoverTarget
                      ? 'border-rose-300 ring-2 ring-rose-200'
                      : 'border-slate-200 hover:border-rose-200'
                }`}
                onPointerDown={(event) => {
                  if (disabled || event.button !== 0) return;
                  dragRef.current = {
                    pointerId: event.pointerId,
                    currentIndex: index,
                    startX: event.clientX,
                    startY: event.clientY,
                    active: false,
                  };
                  setDraggingIndex(index);
                  setDragOverIndex(index);
                  try {
                    event.currentTarget.setPointerCapture(event.pointerId);
                  } catch {
                    // ignore
                  }
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={stopPointerDrag}
                onPointerCancel={stopPointerDrag}
              >
                <img src={src} alt={`Ảnh sản phẩm ${index + 1}`} draggable={false} className="h-28 w-full rounded-lg object-cover" />
                <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-black text-white">
                  #{index + 1}
                </div>
                {index === 0 && (
                  <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-black text-white">
                    Chính
                  </div>
                )}
                <button
                  type="button"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-sm font-black text-white shadow"
                  disabled={disabled}
                  aria-label="Xóa ảnh"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeImage(index);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
