type CloudinaryOptions = {
  width?: number;
  quality?: 'auto' | number;
  fit?: 'cover' | 'contain' | 'fill' | 'limit';
};

const CLOUDINARY_UPLOAD_SEGMENT = '/image/upload/';

const toCloudinaryCropMode = (fit?: CloudinaryOptions['fit']) => {
  if (fit === 'fill') return 'fill';
  return 'limit';
};

export const getOptimizedCloudinaryUrl = (url?: string | null, options: CloudinaryOptions = {}) => {
  const src = String(url || '').trim();
  if (!src || !src.includes('res.cloudinary.com') || !src.includes(CLOUDINARY_UPLOAD_SEGMENT)) return src;

  const width = Number(options.width || 0);
  const quality = options.quality ?? 'auto';
  const cropMode = toCloudinaryCropMode(options.fit);
  const transforms = [
    'f_auto',
    `q_${quality}`,
    width > 0 ? `w_${Math.round(width)}` : '',
    `c_${cropMode}`,
  ].filter(Boolean);

  const [prefix, suffix] = src.split(CLOUDINARY_UPLOAD_SEGMENT);
  if (!prefix || !suffix) return src;

  if (/^(?:f_auto|q_|w_|c_|dpr_|e_|g_|h_|ar_|b_)/.test(suffix)) return src;

  return `${prefix}${CLOUDINARY_UPLOAD_SEGMENT}${transforms.join(',')}/${suffix}`;
};

export const getProductCardImageUrl = (url?: string | null) =>
  getOptimizedCloudinaryUrl(url, { width: 420, fit: 'cover' });

export const getProductDetailImageUrl = (url?: string | null) =>
  getOptimizedCloudinaryUrl(url, { width: 960, fit: 'contain' });

export const getBannerImageUrl = (url?: string | null) =>
  getOptimizedCloudinaryUrl(url, { width: 944, fit: 'contain' });
