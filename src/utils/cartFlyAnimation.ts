import type { MouseEvent } from 'react';

const CART_TARGET_SELECTOR = '.cart-fly-target';

const getVisibleCartTarget = (): HTMLElement | null => {
  const targets = Array.from(document.querySelectorAll<HTMLElement>(CART_TARGET_SELECTOR));
  return (
    targets.find((target) => {
      const rect = target.getBoundingClientRect();
      const style = window.getComputedStyle(target);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }) || null
  );
};

const getSourceImageFromEvent = (event?: MouseEvent<HTMLElement>): HTMLImageElement | null => {
  const root = event?.currentTarget?.closest('[data-product-card]');
  return root?.querySelector<HTMLImageElement>('[data-cart-fly-image]') || null;
};

const safeRemove = (node: HTMLElement) => {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
};

export const flyProductImageToCart = (source?: HTMLImageElement | null) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const target = getVisibleCartTarget();
  if (!source || !target) return;

  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  if (sourceRect.width <= 0 || sourceRect.height <= 0 || targetRect.width <= 0 || targetRect.height <= 0) return;

  const clone = source.cloneNode(true) as HTMLImageElement;
  const startSize = Math.min(sourceRect.width, sourceRect.height, 96);
  const endSize = 24;
  const startX = sourceRect.left + sourceRect.width / 2 - startSize / 2;
  const startY = sourceRect.top + sourceRect.height / 2 - startSize / 2;
  const endX = targetRect.left + targetRect.width / 2 - endSize / 2;
  const endY = targetRect.top + targetRect.height / 2 - endSize / 2;

  clone.style.position = 'fixed';
  clone.style.left = `${startX}px`;
  clone.style.top = `${startY}px`;
  clone.style.width = `${startSize}px`;
  clone.style.height = `${startSize}px`;
  clone.style.objectFit = 'cover';
  clone.style.borderRadius = '14px';
  clone.style.pointerEvents = 'none';
  clone.style.zIndex = '9999';
  clone.style.boxShadow = '0 14px 34px rgba(227, 6, 19, 0.25)';
  clone.style.willChange = 'transform, opacity';
  document.body.appendChild(clone);

  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const animation = clone.animate(
    [
      { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
      { transform: `translate3d(${deltaX * 0.45}px, ${deltaY - 58}px, 0) scale(0.72)`, opacity: 0.92, offset: 0.58 },
      { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${endSize / startSize})`, opacity: 0.18 },
    ],
    {
      duration: 680,
      easing: 'cubic-bezier(.2,.82,.2,1)',
      fill: 'forwards',
    },
  );

  target.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.18)', offset: 0.55 },
      { transform: 'scale(1)' },
    ],
    {
      duration: 360,
      delay: 480,
      easing: 'cubic-bezier(.2,.82,.2,1)',
    },
  );

  animation.onfinish = () => safeRemove(clone);
  animation.oncancel = () => safeRemove(clone);
  window.setTimeout(() => safeRemove(clone), 900);
};

export const flyProductImageToCartFromEvent = (event?: MouseEvent<HTMLElement>) => {
  flyProductImageToCart(getSourceImageFromEvent(event));
};
