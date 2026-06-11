import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Settings as SettingsIcon,
  ShieldCheck,
  Smartphone,
  UserPlus,
  UsersRound,
  WifiOff,
} from 'lucide-react';
import {
  AdminPushState,
  getAdminPushState,
  subscribeAdminPush,
  unsubscribeAdminPush,
} from '../../services/adminPushNotificationService';
import { adminAccountService, AdminAccount } from '../../services/adminAccountService';
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

const getApiMessage = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail || error?.response?.data?.message || error?.message;
  if (typeof detail === 'string' && detail.trim()) return detail;
  return fallback;
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const isStrongPassword = (value: string) => value.length >= 8 && /[A-Za-zÀ-ỹ]/.test(value) && /\d/.test(value);

const Settings = () => {
  const { showToast } = useToast();
  const [pushState, setPushState] = useState<AdminPushState>('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountSaving, setAccountSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [accountForm, setAccountForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    is_active: true,
  });

  const passwordHint = useMemo(() => {
    if (!changePasswordForm.new_password) return 'Tối thiểu 8 ký tự, gồm chữ và số.';
    if (!isStrongPassword(changePasswordForm.new_password)) return 'Mật khẩu cần có ít nhất 8 ký tự, gồm chữ và số.';
    if (changePasswordForm.confirm_password && changePasswordForm.confirm_password !== changePasswordForm.new_password) return 'Xác nhận mật khẩu chưa khớp.';
    return 'Mật khẩu mới hợp lệ.';
  }, [changePasswordForm.confirm_password, changePasswordForm.new_password]);

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

  const loadAccounts = async () => {
    setAccountsLoading(true);
    try {
      setAccounts(await adminAccountService.list());
    } catch (error: any) {
      showToast(getApiMessage(error, 'Không tải được danh sách tài khoản admin.'), 'error', 6000);
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    refreshState();
    loadAccounts();
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

  const submitCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fullName = accountForm.full_name.trim();
    const email = accountForm.email.trim().toLowerCase();
    if (fullName.length < 2) {
      showToast('Vui lòng nhập tên admin.', 'warning');
      return;
    }
    if (!email || !email.includes('@')) {
      showToast('Email admin chưa hợp lệ.', 'warning');
      return;
    }
    if (!isStrongPassword(accountForm.password)) {
      showToast('Mật khẩu tài khoản mới cần có ít nhất 8 ký tự, gồm chữ và số.', 'warning');
      return;
    }
    if (accountForm.password !== accountForm.confirm_password) {
      showToast('Xác nhận mật khẩu tài khoản mới chưa khớp.', 'warning');
      return;
    }

    setAccountSaving(true);
    try {
      await adminAccountService.create({
        full_name: fullName,
        email,
        password: accountForm.password,
        is_active: accountForm.is_active,
      });
      setAccountForm({ full_name: '', email: '', password: '', confirm_password: '', is_active: true });
      await loadAccounts();
      showToast('Đã thêm tài khoản admin.', 'success');
    } catch (error: any) {
      showToast(getApiMessage(error, 'Không tạo được tài khoản admin.'), 'error', 6000);
    } finally {
      setAccountSaving(false);
    }
  };

  const copy = stateCopy[pushState];
  const passwordInputType = showPasswords ? 'text' : 'password';

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
            Quản lý tài khoản đăng nhập, mật khẩu và thông báo vận hành của Lộc Sang.
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
                    Dùng cho tài khoản admin đang đăng nhập trên thiết bị này.
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
              <div className={`rounded-2xl px-4 py-3 text-xs font-bold ${isStrongPassword(changePasswordForm.new_password) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-slate-50 text-slate-500 dark:bg-slate-950/60 dark:text-slate-400'}`}>
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
                <UserPlus size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Thêm tài khoản admin</h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                  Tài khoản mới có quyền đăng nhập vào admin và quản lý bán hàng.
                </p>
              </div>
            </div>

            <form onSubmit={submitCreateAccount} className="mt-5 grid gap-3 lg:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-black text-slate-800 dark:text-slate-100">
                Tên admin
                <input
                  value={accountForm.full_name}
                  onChange={(event) => setAccountForm((form) => ({ ...form, full_name: event.target.value }))}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-rose-500/10"
                  placeholder="VD: Lộc Sang Admin"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-black text-slate-800 dark:text-slate-100">
                Email đăng nhập
                <input
                  type="email"
                  value={accountForm.email}
                  onChange={(event) => setAccountForm((form) => ({ ...form, email: event.target.value }))}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-rose-500/10"
                  placeholder="admin@locsang.vn"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-black text-slate-800 dark:text-slate-100">
                Mật khẩu
                <input
                  type={passwordInputType}
                  autoComplete="new-password"
                  value={accountForm.password}
                  onChange={(event) => setAccountForm((form) => ({ ...form, password: event.target.value }))}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-rose-500/10"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-black text-slate-800 dark:text-slate-100">
                Nhập lại mật khẩu
                <input
                  type={passwordInputType}
                  autoComplete="new-password"
                  value={accountForm.confirm_password}
                  onChange={(event) => setAccountForm((form) => ({ ...form, confirm_password: event.target.value }))}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-rose-500/10"
                />
              </label>
              <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-800 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 lg:col-span-2">
                <input
                  type="checkbox"
                  checked={accountForm.is_active}
                  onChange={(event) => setAccountForm((form) => ({ ...form, is_active: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                Cho phép đăng nhập ngay
              </label>
              <button
                type="submit"
                disabled={accountSaving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(225,29,72,0.22)] transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 lg:col-span-2"
              >
                {accountSaving && <Loader2 size={18} className="animate-spin" />}
                Tạo tài khoản admin
              </button>
            </form>
          </section>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                <UsersRound size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Tài khoản admin</h2>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                  Danh sách tài khoản đang có quyền truy cập admin.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {accounts.length} tài khoản
            </span>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            {accountsLoading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : accounts.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm font-bold text-slate-500">Chưa có tài khoản admin.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {accounts.map((account) => (
                  <div key={account.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-black text-slate-950 dark:text-white">{account.full_name}</div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${account.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {account.is_active ? 'Đang hoạt động' : 'Đã tắt'}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-xs font-semibold text-slate-500">{account.email}</div>
                      <div className="mt-1 text-[11px] font-bold text-slate-400">Tạo ngày {formatDate(account.created_at)}</div>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                      <ShieldCheck size={14} />
                      Admin
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900 sm:p-5">
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
              {loading ? 'Đang kiểm tra...' : copy.title}
            </div>
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

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
              <Smartphone size={18} />
              Điện thoại PWA
            </div>
            <div className="mt-3 space-y-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              <p>Mở website admin bằng trình duyệt, thêm vào màn hình chính, rồi mở bằng icon app đã cài.</p>
              <p>Sau đó vào màn này và bật thông báo cho đúng thiết bị cần nhận đơn.</p>
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-white p-3 text-xs font-bold leading-5 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>Nếu thiết bị đã chặn quyền, cần mở lại trong cài đặt trình duyệt hoặc cài đặt của app PWA.</span>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
};

export default Settings;
