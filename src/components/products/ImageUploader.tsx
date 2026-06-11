// src/components/products/ImageUploader.tsx
import { useState, useEffect, ChangeEvent } from 'react';
import React from "react";
import imageCompression from 'browser-image-compression';

type ImageItem = File | string; // File mới hoặc URL cũ
const DEFAULT_MAX_IMAGES = 9;

interface ImageUploaderProps {
  onImagesUpdate: (images: File[], existing: string[]) => void;
  initialImages?: Array<string | File>;
  label?: string;
  helpText?: string;
  requiredPrimary?: boolean;
  maxImages?: number;
  disabled?: boolean;
}

const ImageUploader = ({
  onImagesUpdate,
  initialImages = [],
  label = 'Ảnh sản phẩm',
  helpText,
  requiredPrimary,
  maxImages = DEFAULT_MAX_IMAGES,
  disabled = false,
}: ImageUploaderProps) => {
  const [images, setImages] = useState<ImageItem[]>([...initialImages]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragIndexRef = React.useRef<number | null>(null);
  const pointerDragRef = React.useRef<{ pointerId: number; fromIndex: number; startX: number; startY: number; active: boolean } | null>(null);

  // Keep stable object URLs per File to avoid blob: URL churn and revoke-too-early issues
  const objectUrlMapRef = React.useRef<Map<File, string>>(new Map());

  const areImageListsEqual = (a: ImageItem[], b: ImageItem[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  useEffect(() => {
    const next = [...initialImages];
    setImages((prev) => (areImageListsEqual(prev, next) ? prev : next));
  }, [initialImages]);

  // Tạo previews khi images thay đổi
  useEffect(() => {
    const map = objectUrlMapRef.current;

    // Revoke object URLs for Files that are no longer in the list
    const currentFiles = new Set<File>();
    images.forEach((img) => {
      if (img instanceof File) currentFiles.add(img);
    });
    for (const [file, url] of map.entries()) {
      if (!currentFiles.has(file)) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
        map.delete(file);
      }
    }

    // Build previews (reuse existing object URLs)
    const nextPreviews: string[] = images
      .map((img) => {
        if (typeof img === 'string') return img;
        const existing = map.get(img);
        if (existing) return existing;
        try {
          const created = URL.createObjectURL(img);
          map.set(img, created);
          return created;
        } catch {
          return '';
        }
      })
      .filter(Boolean);

    setPreviews(nextPreviews);

    // Callback để truyền images ra ngoài
    const files = images.filter(img => img instanceof File) as File[];
    const existing = images.filter((img): img is string => typeof img === 'string');
    onImagesUpdate(files, existing);

    // Cleanup khi component unmount
    return () => {
      // Do not revoke here; revoke is handled by removal + final unmount cleanup below.
    };
  }, [images, onImagesUpdate]);

  // Final unmount cleanup
  useEffect(() => {
    return () => {
      const map = objectUrlMapRef.current;
      for (const url of map.values()) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }
      map.clear();
    };
  }, []);

  const compressIfNeeded = async (file: File): Promise<File> => {
    const maxBytes = 10 * 1024 * 1024;
    if (file.size <= maxBytes) return file;

    // SVG isn't reliably compressible via canvas; reject if too large
    if ((file.type ?? '') === 'image/svg+xml') {
      throw new Error(`${file.name}: SVG > 10MB không hỗ trợ nén`);
    }

    // Try to compress under 10MB
    const compressed = await imageCompression(file, {
      maxSizeMB: 10,
      maxWidthOrHeight: 2560,
      useWebWorker: true,
      initialQuality: 0.85,
    });

    // Library returns a File; keep original name for UX
    const result = compressed instanceof File
      ? compressed
      : new File([compressed], file.name, { type: file.type || 'image/jpeg' });

    if (result.size > maxBytes) {
      throw new Error(`${file.name}: không nén xuống <= 10MB (hiện ${(result.size / (1024 * 1024)).toFixed(1)}MB)`);
    }

    return result;
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (!e.target.files) return;

    // allow selecting same file again
    const filesArray = Array.from(e.target.files);
    e.target.value = '';

    setUploadError(null);

    // Process asynchronously so UI doesn't freeze
    (async () => {
      const remainingSlots = Math.max(0, maxImages - images.length);
      const accepted: File[] = [];
      const rejected: string[] = [];

      if (remainingSlots <= 0) {
        setUploadError(`Tối đa ${maxImages} ảnh`);
        return;
      }

      for (const file of filesArray) {
        if (accepted.length >= remainingSlots) {
          rejected.push(`Chỉ được tối đa ${maxImages} ảnh`);
          continue;
        }
        const isImage = (file.type ?? '').startsWith('image/');
        if (!isImage) {
          rejected.push(`${file.name}: không phải ảnh`);
          continue;
        }
        try {
          const finalFile = await compressIfNeeded(file);
          accepted.push(finalFile);
        } catch (err: any) {
          rejected.push(err?.message ? String(err.message) : `${file.name}: lỗi nén ảnh`);
        }
      }

      if (rejected.length > 0) {
        setUploadError(rejected.join(' | '));
      }

      if (accepted.length > 0) {
        setImages((prev) => [...prev, ...accepted]);
      }
    })();
  };

  const handleDropFiles = (files: File[]) => {
    if (disabled) return;
    if (!files || files.length === 0) return;
    setUploadError(null);

    (async () => {
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
        const isImage = (file.type ?? '').startsWith('image/');
        if (!isImage) {
          rejected.push(`${file.name}: không phải ảnh`);
          continue;
        }
        try {
          const finalFile = await compressIfNeeded(file);
          accepted.push(finalFile);
        } catch (err: any) {
          rejected.push(err?.message ? String(err.message) : `${file.name}: lỗi nén ảnh`);
        }
      }

      if (rejected.length > 0) setUploadError(rejected.join(' | '));
      if (accepted.length > 0) setImages((prev) => [...prev, ...accepted]);
    })();
  };

  const reorder = (fromIndex: number, toIndex: number) => {
    if (disabled) return;
    if (fromIndex === toIndex) return;
    setImages((prev) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    dragIndexRef.current = toIndex;
    if (pointerDragRef.current) {
      pointerDragRef.current.fromIndex = toIndex;
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointerState = pointerDragRef.current;
    if (disabled || !pointerState || pointerState.pointerId !== event.pointerId) return;

    const distance = Math.abs(event.clientX - pointerState.startX) + Math.abs(event.clientY - pointerState.startY);
    if (!pointerState.active && distance < 8) return;

    pointerState.active = true;
    event.preventDefault();

    const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    const imageTarget = target?.closest('[data-image-index]') as HTMLElement | null;
    if (!imageTarget) return;

    const nextIndex = Number(imageTarget.dataset.imageIndex);
    if (!Number.isInteger(nextIndex) || nextIndex === pointerState.fromIndex) return;
    setDragOverIndex(nextIndex);
    reorder(pointerState.fromIndex, nextIndex);
  };

  const stopPointerDrag = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (event && pointerDragRef.current?.pointerId === event.pointerId) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    }
    pointerDragRef.current = null;
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const removeImage = (index: number) => {
    if (disabled) return;
    setImages(prev => {
      const newImages = [...prev];
      newImages.splice(index, 1);
      return newImages;
    });
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{requiredPrimary ? ' *' : ''}
      </label>
      {helpText && <div className="text-xs text-gray-500 mb-2">{helpText}</div>}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          e.stopPropagation();
          const dt = e.dataTransfer;
          const dropped = Array.from(dt?.files ?? []);
          handleDropFiles(dropped);
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
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-gray-500">
              Kéo thả hoặc click để chọn ảnh
            </p>
            <p className="text-xs text-gray-500">Tối đa {maxImages} ảnh</p>
            <p className="text-xs text-gray-500">Ảnh &gt; 10MB sẽ tự nén về &le; 10MB</p>
            <p className="text-xs text-gray-500">Kéo thả thumbnail để sắp xếp (ảnh đầu tiên là ảnh chính)</p>
          </div>
        </label>
      </div>

      {/* Image preview */}
      {uploadError && (
        <div className="mt-2 text-xs text-red-600">{uploadError}</div>
      )}
      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {previews.map((src, index) => (
            <div
              key={index}
              data-image-index={index}
              className={`relative touch-none cursor-grab select-none rounded-md outline-none transition active:cursor-grabbing ${
                dragOverIndex === index ? 'scale-[1.02] ring-2 ring-rose-500 ring-offset-2' : ''
              }`}
              draggable={!disabled}
              onPointerDown={(e) => {
                if (disabled || e.button !== 0) return;
                pointerDragRef.current = {
                  pointerId: e.pointerId,
                  fromIndex: index,
                  startX: e.clientX,
                  startY: e.clientY,
                  active: false,
                };
                dragIndexRef.current = index;
                setDragOverIndex(index);
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // ignore
                }
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={stopPointerDrag}
              onPointerCancel={stopPointerDrag}
              onDragStart={(e) => {
                dragIndexRef.current = index;
                setDragOverIndex(index);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(index));
              }}
              onDragOver={(e) => {
                if (disabled) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverIndex(index);
              }}
              onDragEnter={(e) => {
                if (disabled) return;
                e.preventDefault();
                const from = dragIndexRef.current;
                if (typeof from === 'number' && from !== index) {
                  reorder(from, index);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const from = dragIndexRef.current;
                if (typeof from === 'number') reorder(from, index);
                dragIndexRef.current = null;
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                dragIndexRef.current = null;
                setDragOverIndex(null);
              }}
            >
              <img
                src={src}
                alt={`Preview ${index + 1}`}
                className="h-24 w-full object-cover rounded-md"
              />
              {index === 0 && (
                <div className="absolute bottom-1 left-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white">
                  Chính
                </div>
              )}
              <button
                type="button"
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                disabled={disabled}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
