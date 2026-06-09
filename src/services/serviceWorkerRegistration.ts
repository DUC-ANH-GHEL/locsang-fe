export const registerLocSangServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return null;

  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (error) {
    console.warn('[LocSang] Không đăng ký được service worker', error);
    return null;
  }
};
