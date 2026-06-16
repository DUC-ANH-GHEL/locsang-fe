const STATIC_CACHE = 'locsang-static-v2';
const IMAGE_CACHE = 'locsang-images-v2';
const PUBLIC_API_CACHE = 'locsang-public-api-v2';
const PUBLIC_API_MAX_AGE_MS = 60 * 1000;
const PUBLIC_API_STALE_MS = 5 * 60 * 1000;

const isAssetRequest = (requestUrl) =>
  requestUrl.origin === self.location.origin &&
  (requestUrl.pathname.startsWith('/assets/') ||
    requestUrl.pathname.startsWith('/locsang-assets/') ||
    requestUrl.pathname.endsWith('.js') ||
    requestUrl.pathname.endsWith('.css') ||
    requestUrl.pathname.endsWith('.svg') ||
    requestUrl.pathname.endsWith('.webmanifest'));

const isPublicApiRequest = (requestUrl) =>
  requestUrl.origin === 'https://locsang-be.cgnn.vn' &&
  (requestUrl.pathname === '/api/home' ||
    requestUrl.pathname === '/api/home-content' ||
    requestUrl.pathname === '/api/categories' ||
    requestUrl.pathname === '/api/products' ||
    requestUrl.pathname.startsWith('/api/products/'));

const isSensitiveRequest = (requestUrl) =>
  requestUrl.pathname.includes('/admin') ||
  requestUrl.pathname.includes('/checkout') ||
  requestUrl.pathname.includes('/orders') ||
  requestUrl.pathname.includes('/account') ||
  requestUrl.pathname.includes('/cart');

const withTimestamp = (response) => {
  const headers = new Headers(response.headers);
  headers.set('x-locsang-sw-cached-at', String(Date.now()));
  return new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const getCachedAge = (response) => {
  const cachedAt = Number(response?.headers?.get('x-locsang-sw-cached-at') || 0);
  return cachedAt > 0 ? Date.now() - cachedAt : Number.POSITIVE_INFINITY;
};

const getSafeAdminPath = (value) => {
  try {
    const url = new URL(value || '/admin/orders', self.location.origin);
    if (url.origin !== self.location.origin || !url.pathname.startsWith('/admin')) {
      return '/admin/orders';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/admin/orders';
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('locsang-') && ![STATIC_CACHE, IMAGE_CACHE, PUBLIC_API_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (isSensitiveRequest(requestUrl)) return;

  if (isAssetRequest(requestUrl)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.destination === 'image' || requestUrl.origin === 'https://res.cloudinary.com') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  if (isPublicApiRequest(requestUrl)) {
    event.respondWith(
      caches.open(PUBLIC_API_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const age = getCachedAge(cached);

        if (cached && age < PUBLIC_API_MAX_AGE_MS) return cached;

        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, withTimestamp(response.clone()));
            return response;
          })
          .catch(() => cached);

        if (cached && age < PUBLIC_API_STALE_MS) {
          event.waitUntil(network.catch(() => undefined));
          return cached;
        }

        return network;
      }),
    );
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Có đơn hàng mới', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Có đơn hàng mới';
  const safeUrl = getSafeAdminPath(payload.url);
  const options = {
    body: payload.body || 'Lộc Sang vừa nhận một đơn hàng mới.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.tag || `locsang-order-${Date.now()}`,
    renotify: true,
    data: {
      url: safeUrl,
      orderId: payload.orderId || null,
      trackingCode: payload.trackingCode || null,
    },
  };

  const notifyOpenAdminTabs = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'LOCSANG_ADMIN_NEW_ORDER_PUSH',
        payload: {
          ...payload,
          title,
          body: options.body,
          url: options.data.url,
          orderId: options.data.orderId,
          trackingCode: options.data.trackingCode,
        },
      });
    });
  });

  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    notifyOpenAdminTabs,
  ]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(getSafeAdminPath(event.notification.data?.url), self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
