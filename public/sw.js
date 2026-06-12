self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
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
  const options = {
    body: payload.body || 'Lộc Sang vừa nhận một đơn hàng mới.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.tag || `locsang-order-${Date.now()}`,
    renotify: true,
    data: {
      url: payload.url || '/admin/orders',
      orderId: payload.orderId || null,
      trackingCode: payload.trackingCode || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/admin/orders', self.location.origin).href;

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
