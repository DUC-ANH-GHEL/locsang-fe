import { useEffect, useState } from 'react';
import { BellRing, Settings as SettingsIcon, Smartphone, WifiOff } from 'lucide-react';
import {
  AdminPushState,
  getAdminPushState,
  subscribeAdminPush,
  unsubscribeAdminPush,
} from '../../services/adminPushNotificationService';
import { useToast } from '../../components/Toast';

const stateCopy: Record<AdminPushState, { title: string; description: string; tone: string }> = {
  unsupported: {
    title: 'Thiết bị chưa hỗ trợ',
    description: 'Trình duyệt hoặc môi trường hiện tại chưa hỗ trợ Web Push.',
    tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  unconfigured: {
    title: 'Backend chưa cấu hình',
    description: 'Cần thêm VAPID key trên Vercel backend để gửi thông báo.',
    tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200',
  },
  denied: {
    title: 'Thông báo đang bị chặn',
    description: 'Hãy mở quyền thông báo trong cài đặt trình duyệt hoặc app PWA.',
    tone: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200',
  },
  default: {
    title: 'Chưa bật',
    description: 'Bật để nhận thông báo khi có đơn hàng mới.',
    tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  granted: {
    title: 'Đã cấp quyền',
    description: 'Thiết bị đã cấp quyền, bấm bật để đăng ký nhận đơn mới.',
    tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200',
  },
  subscribed: {
    title: 'Đang nhận thông báo',
    description: 'Thiết bị này sẽ nhận thông báo khi có đơn hàng mới.',
    tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
  },
};

const Settings = () => {
  const { showToast } = useToast();
  const [pushState, setPushState] = useState<AdminPushState>('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refreshState = async () => {
    setLoading(true);
    try {
      setPushState(await getAdminPushState());
    } catch {
      setPushState('default');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshState();
  }, []);

  const enablePush = async () => {
    setSaving(true);
    try {
      await subscribeAdminPush();
      setPushState('subscribed');
      showToast('Đã bật thông báo đơn hàng mới cho thiết bị này.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Không bật được thông báo.', 'error', 6000);
      await refreshState();
    } finally {
      setSaving(false);
    }
  };

  const disablePush = async () => {
    setSaving(true);
    try {
      await unsubscribeAdminPush();
      await refreshState();
      showToast('Đã tắt thông báo trên thiết bị này.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Không tắt được thông báo.', 'error', 6000);
    } finally {
      setSaving(false);
    }
  };

  const copy = stateCopy[pushState];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
            <SettingsIcon size={14} />
            Cài đặt
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">Cài đặt admin</h1>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
            Quản lý thông báo và các tuỳ chọn vận hành cho thiết bị đang dùng.
          </p>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-[1.4rem] border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200">
                <BellRing size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Thông báo đơn hàng mới</h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                  Khi có khách đặt hàng, admin sẽ nhận thông báo trên trình duyệt và trên điện thoại nếu đã cài website thành PWA.
                </p>
              </div>
            </div>

            <div className={`mt-5 rounded-2xl px-4 py-3 ${copy.tone}`}>
              <div className="text-sm font-black">{loading ? 'Đang kiểm tra...' : copy.title}</div>
              <div className="mt-1 text-xs font-bold opacity-80">{loading ? 'Vui lòng chờ trong giây lát.' : copy.description}</div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {pushState === 'subscribed' ? (
                <button
                  type="button"
                  disabled={saving || loading}
                  onClick={disablePush}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:border-rose-200 hover:text-rose-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                >
                  Tắt trên thiết bị này
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving || loading || pushState === 'unsupported' || pushState === 'unconfigured' || pushState === 'denied'}
                  onClick={enablePush}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-rose-600 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(225,29,72,0.22)] transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Bật thông báo
                </button>
              )}
              <button
                type="button"
                disabled={saving || loading}
                onClick={refreshState}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:border-rose-200 hover:text-rose-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
              >
                Kiểm tra lại
              </button>
            </div>
          </section>

          <section className="rounded-[1.4rem] border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
              <Smartphone size={18} />
              Điện thoại PWA
            </div>
            <div className="mt-4 space-y-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              <p>Trên iPhone hoặc Android, mở website admin bằng trình duyệt rồi chọn thêm vào màn hình chính.</p>
              <p>Sau khi mở bằng icon app đã cài, vào màn này và bấm bật thông báo.</p>
              <p>Nếu thiết bị đã chặn quyền, hãy mở lại trong cài đặt trình duyệt hoặc cài đặt của app PWA.</p>
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
              <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <span>Thông báo đẩy phụ thuộc vào quyền hệ điều hành và trình duyệt. Nếu máy tắt thông báo, website không thể tự bật lại.</span>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};

export default Settings;
