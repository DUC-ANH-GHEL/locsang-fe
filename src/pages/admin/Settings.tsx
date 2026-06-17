import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Settings as SettingsIcon,
  Smartphone,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';
import {
  AdminPushState,
  getAdminPushState,
  subscribeAdminPush,
  unsubscribeAdminPush,
} from '../../services/adminPushNotificationService';
import { adminAccountService } from '../../services/adminAccountService';
import { useToast } from '../../components/Toast';
import {
  isAdminNotificationSoundEnabled,
  setAdminNotificationSoundEnabled,
} from '../../utils/adminNotificationSound';

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

const getApiMessage = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail || error?.response?.data?.message || error?.message;
  return typeof detail === 'string' && detail.trim() ? detail : fallback;
};

const isStrongPassword = (value: string) => value.length >= 8 && /[A-Za-zÀ-ỹ]/.test(value) && /\d/.test(value);

const Settings = () => {
  const { showToast } = useToast();
  const [pushState, setPushState] = useState<AdminPushState>('default');
  const [notificationSoundEnabled, setNotificationSoundEnabledState] = useState(() => isAdminNotificationSoundEnabled());
  const [loadingPush, setLoadingPush] = useState(true);
  const [savingPush, setSavingPush] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const passwordHint = useMemo(() => {
    if (!changePasswordForm.new_password) return 'Tối thiểu 8 ký tự, gồm chữ và số.';
    if (!isStrongPassword(changePasswordForm.new_password)) return 'Mật khẩu cần có ít nhất 8 ký tự, gồm chữ và số.';
    if (changePasswordForm.confirm_password && changePasswordForm.confirm_password !== changePasswordForm.new_password) {
      return 'Xác nhận mật khẩu chưa khớp.';
    }
    return 'Mật khẩu mới hợp lệ.';
  }, [changePasswordForm.confirm_password, changePasswordForm.new_password]);

  const refreshState = async () => {
    setLoadingPush(true);
    try {
      setPushState(await getAdminPushState());
    } catch {
      setPushState('default');
    } finally {
      setLoadingPush(false);
    }
  };

  useEffect(() => {
    refreshState();
  }, []);

  const setNotificationSoundEnabled = (enabled: boolean) => {
    setNotificationSoundEnabledState(enabled);
    setAdminNotificationSoundEnabled(enabled);
    showToast(enabled ? 'Đã bật âm thanh thông báo.' : 'Đã tắt âm thanh thông báo.', 'success');
  };

  const enablePush = async () => {
    setSavingPush(true);
    try {
      await subscribeAdminPush();
      setPushState('subscribed');
      showToast('Đã bật thông báo đơn hàng mới cho thiết bị này.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Không bật được thông báo.', 'error', 6000);
      await refreshState();
    } finally {
      setSavingPush(false);
    }
  };

  const disablePush = async () => {
    setSavingPush(true);
    try {
      await unsubscribeAdminPush();
      await refreshState();
      showToast('Đã tắt thông báo trên thiết bị này.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Không tắt được thông báo.', 'error', 6000);
    } finally {
      setSavingPush(false);
    }
  };

  const submitChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!changePasswordForm.current_password.trim()) {
      showToast('Vui lòng nhập mật khẩu hiện tại.', 'warning');
      return;
    }
    if (!isStrongPassword(changePasswordForm.new_password)) {
      showToast('Mật khẩu mới cần có ít nhất 8 ký tự, gồm chữ và số.', 'warning');
      return;
    }
    if (changePasswordForm.new_password !== changePasswordForm.confirm_password) {
      showToast('Xác nhận mật khẩu mới chưa khớp.', 'warning');
      return;
    }

    setPasswordSaving(true);
    try {
      await adminAccountService.changePassword({
        current_password: changePasswordForm.current_password,
        new_password: changePasswordForm.new_password,
      });
      setChangePasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      showToast('Đã đổi mật khẩu admin.', 'success');
    } catch (error: any) {
      showToast(getApiMessage(error, 'Không đổi được mật khẩu.'), 'error', 6000);
    } finally {
      setPasswordSaving(false);
    }
  };

  const copy = stateCopy[pushState];
  const passwordInputType = showPasswords ? 'text' : 'password';
  const canEnablePush = !['unsupported', 'unconfigured', 'denied', 'subscribed'].includes(pushState);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
            <SettingsIcon size={14} />
            Cài đặt
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Cài đặt admin
          </h1>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
            Đổi mật khẩu tài khoản đang đăng nhập và cấu hình thông báo đơn hàng mới cho thiết bị hiện tại.
          </p>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[0.95fr_1.05fr]">
          <form onSubmit={submitChangePassword} className="rounded-[1.4rem] border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200">
                  <KeyRound size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">Đổi mật khẩu</h2>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                    Chỉ áp dụng cho tài khoản admin đang đăng nhập trên trình duyệt này.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswords((value) => !value)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:text-rose-600 dark:border-slate-700 dark:text-slate-300"
                aria-label={showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <label className="grid gap-1.5 text-sm font-black text-slate-800 dark:text-slate-100">
                Mật khẩu hiện tại
                <input
                  type={passwordInputType}
                  autoComplete="current-password"
                  value={changePasswordForm.current_password}
                  onChange={(event) => setChangePasswordForm((form) => ({ ...form, current_password: event.target.value }))}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-rose-500/10"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-black text-slate-800 dark:text-slate-100">
                Mật khẩu mới
                <input
                  type={passwordInputType}
                  autoComplete="new-password"
                  value={changePasswordForm.new_password}
                  onChange={(event) => setChangePasswordForm((form) => ({ ...form, new_password: event.target.value }))}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-rose-500/10"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-black text-slate-800 dark:text-slate-100">
                Nhập lại mật khẩu mới
                <input
                  type={passwordInputType}
                  autoComplete="new-password"
                  value={changePasswordForm.confirm_password}
                  onChange={(event) => setChangePasswordForm((form) => ({ ...form, confirm_password: event.target.value }))}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-rose-500/10"
                />
              </label>
              <div
                className={`rounded-2xl px-4 py-3 text-xs font-bold ${
                  isStrongPassword(changePasswordForm.new_password)
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                    : 'bg-slate-50 text-slate-500 dark:bg-slate-950/60 dark:text-slate-400'
                }`}
              >
                {passwordHint}
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordSaving}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(225,29,72,0.22)] transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordSaving && <Loader2 size={18} className="animate-spin" />}
              Lưu mật khẩu mới
            </button>
          </form>

          <section className="rounded-[1.4rem] border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200">
                <BellRing size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Thông báo đơn hàng mới</h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                  Nhận thông báo trên trình duyệt và điện thoại nếu đã cài website thành PWA.
                </p>
              </div>
            </div>

            <div className={`mt-5 rounded-2xl px-4 py-3 ${copy.tone}`}>
              <div className="flex items-center gap-2 text-sm font-black">
                {pushState === 'subscribed' && <CheckCircle2 size={16} />}
                {loadingPush ? 'Đang kiểm tra...' : copy.title}
              </div>
              <p className="mt-1 text-xs font-bold opacity-80">{copy.description}</p>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm dark:bg-slate-900 dark:text-rose-200">
                  {notificationSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </div>
                <div>
                  <div className="text-sm font-black text-slate-950 dark:text-white">Âm thanh thông báo</div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                    Mặc định bật. Tắt nếu không muốn nghe tiếng báo khi có đơn hàng mới trên thiết bị này.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notificationSoundEnabled}
                onClick={() => setNotificationSoundEnabled(!notificationSoundEnabled)}
                className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                  notificationSoundEnabled ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                    notificationSoundEnabled ? 'left-7' : 'left-1'
                  }`}
                />
                <span className="sr-only">
                  {notificationSoundEnabled ? 'Tắt âm thanh thông báo' : 'Bật âm thanh thông báo'}
                </span>
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
                  <Smartphone size={18} className="text-rose-600" />
                  Trình duyệt/PWA
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  Mỗi thiết bị cần bật thông báo riêng. Khi đổi máy hoặc trình duyệt, vào lại trang này để bật.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
                  <WifiOff size={18} className="text-rose-600" />
                  Khi bị chặn quyền
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  Nếu trình duyệt đã chặn, cần mở quyền trong phần cài đặt site hoặc app PWA trước khi bật lại.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {pushState === 'subscribed' ? (
                <button
                  type="button"
                  disabled={savingPush || loadingPush}
                  onClick={disablePush}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
                >
                  {savingPush && <Loader2 size={18} className="animate-spin" />}
                  Tắt trên thiết bị này
                </button>
              ) : (
                <button
                  type="button"
                  disabled={savingPush || loadingPush || !canEnablePush}
                  onClick={enablePush}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(225,29,72,0.22)] transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPush && <Loader2 size={18} className="animate-spin" />}
                  Bật thông báo
                </button>
              )}
              <button
                type="button"
                disabled={savingPush || loadingPush}
                onClick={refreshState}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
              >
                Kiểm tra lại
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};

export default Settings;
