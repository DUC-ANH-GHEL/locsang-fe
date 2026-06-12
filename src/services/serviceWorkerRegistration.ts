export const registerLocSangServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return null;

  try {
    const reloadGuardKey = 'locsang_sw_controller_reload_v1';
    let reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      try {
        const guard = sessionStorage.getItem(reloadGuardKey);
        if (guard === '1') return;
        sessionStorage.setItem(reloadGuardKey, '1');
      } catch {
        // Continue with a runtime guard even if storage is unavailable.
      }

      reloading = true;
      window.location.reload();
    });

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    registration.update().catch(() => {
      // Ignore update check errors; the current app can keep running.
    });

    return registration;
  } catch (error) {
    console.warn('[LocSang] Khong dang ky duoc service worker', error);
    return null;
  }
};
