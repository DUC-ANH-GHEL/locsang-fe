import { apiClient } from './apiClient';
import { registerLocSangServiceWorker } from './serviceWorkerRegistration';

export type AdminPushState =
  | 'unsupported'
  | 'unconfigured'
  | 'denied'
  | 'default'
  | 'granted'
  | 'subscribed';

type PushConfigResponse = {
  configured: boolean;
  publicKey?: string | null;
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

export const isPushSupported = () =>
  typeof window !== 'undefined'
  && 'Notification' in window
  && 'serviceWorker' in navigator
  && 'PushManager' in window;

export const getAdminPushConfig = async (): Promise<PushConfigResponse> => {
  const response = await apiClient.get('/admin/notifications/push/config', {
    skipGlobalLoading: true,
  } as any);
  return response.data;
};

export const getAdminPushState = async (): Promise<AdminPushState> => {
  if (!isPushSupported()) return 'unsupported';

  const permission = Notification.permission;
  if (permission === 'denied') return 'denied';

  const config = await getAdminPushConfig();
  if (!config.configured || !config.publicKey) return 'unconfigured';

  const registration = await registerLocSangServiceWorker();
  const readyRegistration = registration || (await navigator.serviceWorker.ready);
  const subscription = await readyRegistration.pushManager.getSubscription();
  if (subscription) return 'subscribed';

  return permission === 'granted' ? 'granted' : 'default';
};

export const subscribeAdminPush = async () => {
  if (!isPushSupported()) {
    throw new Error('Trình duyệt này chưa hỗ trợ thông báo đẩy.');
  }

  if (Notification.permission === 'denied') {
    throw new Error('Thông báo đang bị chặn. Hãy mở quyền thông báo trong cài đặt trình duyệt hoặc PWA.');
  }

  const config = await getAdminPushConfig();
  if (!config.configured || !config.publicKey) {
    throw new Error('Backend chưa cấu hình VAPID key cho Web Push.');
  }

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Bạn chưa cấp quyền nhận thông báo.');
  }

  const registration = await registerLocSangServiceWorker();
  const readyRegistration = registration || (await navigator.serviceWorker.ready);
  const existing = await readyRegistration.pushManager.getSubscription();
  const subscription = existing || await readyRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(config.publicKey),
  });

  const payload = subscription.toJSON() as any;
  await apiClient.post('/admin/notifications/push/subscriptions', payload, {
    skipGlobalLoading: true,
  } as any);

  return subscription;
};

export const unsubscribeAdminPush = async () => {
  if (!isPushSupported()) return false;

  const registration = await registerLocSangServiceWorker();
  const readyRegistration = registration || (await navigator.serviceWorker.ready);
  const subscription = await readyRegistration.pushManager.getSubscription();
  if (!subscription) return false;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await apiClient.delete('/admin/notifications/push/subscriptions', {
    data: { endpoint },
    skipGlobalLoading: true,
  } as any);
  return true;
};
