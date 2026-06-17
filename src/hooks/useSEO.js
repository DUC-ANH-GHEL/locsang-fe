import { useEffect } from 'react';

const SITE_NAME = 'Lộc Sang';
const DEFAULT_DESCRIPTION = 'Lộc Sang - Mua sắm online sản phẩm chọn lọc, giá tốt và giao nhanh toàn quốc.';
const DEFAULT_IMAGE = '/favicon.svg';
const DEFAULT_URL = 'https://locsang.vn';

const upsertMeta = (selector, attrs, content) => {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

export const useSEO = ({
  title,
  description,
  canonicalPath = '/',
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
  jsonLd = null,
}) => {
  useEffect(() => {
    const resolvedTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const resolvedDescription = description || DEFAULT_DESCRIPTION;
    const safePath = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
    const canonicalUrl = `${DEFAULT_URL}${safePath}`;

    document.title = resolvedTitle;
    document.documentElement.setAttribute('lang', 'vi');

    upsertMeta('meta[name="description"]', { name: 'description' }, resolvedDescription);
    upsertMeta('meta[name="language"]', { name: 'language' }, 'vi');
    upsertMeta('meta[http-equiv="content-language"]', { 'http-equiv': 'content-language' }, 'vi-VN');
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale' }, 'vi_VN');
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, resolvedTitle);
    upsertMeta('meta[property="og:description"]', { property: 'og:description' }, resolvedDescription);
    upsertMeta('meta[property="og:type"]', { property: 'og:type' }, type);
    upsertMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
    upsertMeta('meta[property="og:image"]', { property: 'og:image' }, image);
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, resolvedTitle);
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, resolvedDescription);
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, image);
    upsertMeta('meta[name="robots"]', { name: 'robots' }, noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    const existingLd = document.head.querySelector('script[data-seo-jsonld="true"]');
    if (existingLd) existingLd.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', 'true');
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, canonicalPath, image, type, noindex, jsonLd]);
};
