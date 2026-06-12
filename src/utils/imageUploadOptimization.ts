const WEBP_TYPE = 'image/webp';
const SVG_TYPE = 'image/svg+xml';
const MAX_UPLOAD_MB = 10;

type OptimizeImageOptions = {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  initialQuality?: number;
};

const toWebpName = (name: string) => {
  const baseName = String(name || 'image').replace(/\.[^.]+$/, '').trim() || 'image';
  return `${baseName}.webp`;
};

export const optimizeImageForUpload = async (
  file: File,
  options: OptimizeImageOptions = {},
): Promise<File> => {
  const fileType = (file.type || '').toLowerCase();

  if (!fileType.startsWith('image/')) return file;
  if (fileType === SVG_TYPE) {
    throw new Error(`${file.name}: SVG không hỗ trợ chuyển sang WebP. Vui lòng dùng JPG, PNG hoặc WebP.`);
  }

  const imageCompression = (await import('browser-image-compression')).default;
  const optimized = await imageCompression(file, {
    maxSizeMB: options.maxSizeMB ?? MAX_UPLOAD_MB,
    maxWidthOrHeight: options.maxWidthOrHeight ?? 2560,
    useWebWorker: true,
    initialQuality: options.initialQuality ?? 0.86,
    fileType: WEBP_TYPE,
  });

  const result =
    optimized instanceof File
      ? optimized
      : new File([optimized], toWebpName(file.name), { type: WEBP_TYPE });

  if (result.type === WEBP_TYPE && result.name.toLowerCase().endsWith('.webp')) {
    return result;
  }

  return new File([result], toWebpName(file.name), {
    type: WEBP_TYPE,
    lastModified: Date.now(),
  });
};
