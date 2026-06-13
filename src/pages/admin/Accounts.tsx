import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { AdminAccount, adminAccountService } from '../../services/adminAccountService';
import { useToast } from '../../components/Toast';
import { formatViDate } from '../../utils/dateTime';

type AccountFormState = {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  is_active: boolean;
};

const emptyForm: AccountFormState = {
  full_name: '',
  email: '',
  password: '',
  confirm_password: '',
  is_active: true,
};

const getApiMessage = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail || error?.response?.data?.message || error?.message;
  return typeof detail === 'string' && detail.trim() ? detail : fallback;
};

const isStrongPassword = (value: string) => value.length >= 8 && /[A-Za-zÀ-ỹ]/.test(value) && /\d/.test(value);

const formatDate = (value?: string | null) =>
  formatViDate(value, { day: '2-digit', month: '2-digit', year: 'numeric' }) || '-';

const normalizePhone = (value: string) => {
  let compact = value.trim().replace(/[\s\-().]/g, '');
  if (compact.startsWith('+84')) compact = `0${compact.slice(3)}`;
  else if (compact.startsWith('84') && [11, 12].includes(compact.length)) compact = `0${compact.slice(2)}`;
  return /^\d{9,11}$/.test(compact) ? compact : '';
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const normalizeLoginIdentifier = (value: string) => {
  const raw = value.trim();
  const phone = normalizePhone(raw);
  return phone || raw.toLowerCase();
};

const isValidLoginIdentifier = (value: string) => {
  const raw = value.trim();
  return isValidEmail(raw.toLowerCase()) || Boolean(normalizePhone(raw));
};

const getLoginIdentifier = (account: AdminAccount) =>
  account.login_identifier || account.phone || account.email || '';

const Accounts = () => {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [form, setForm] = useState<AccountFormState>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      setAccounts(await adminAccountService.list());
    } catch (error: any) {
      showToast(getApiMessage(error, 'Không tải được danh sách tài khoản admin.'), 'error', 6000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const filteredAccounts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return accounts;
    return accounts.filter((account) =>
      [account.full_name, account.email, account.phone, account.login_identifier, account.role_name]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(keyword)),
    );
  }, [accounts, query]);

  const activeCount = accounts.filter((account) => account.is_active).length;
  const isEditingLastActiveAccount = Boolean(editingAccount?.is_active && activeCount <= 1);

  const openCreate = () => {
    setEditingAccount(null);
    setForm(emptyForm);
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEdit = (account: AdminAccount) => {
    setEditingAccount(account);
    setForm({
      full_name: account.full_name || '',
      email: getLoginIdentifier(account),
      password: '',
      confirm_password: '',
      is_active: Boolean(account.is_active),
    });
    setShowPassword(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingAccount(null);
    setForm(emptyForm);
  };

  const validateForm = () => {
    const fullName = form.full_name.trim();
    const loginIdentifier = form.email.trim();
    const password = form.password.trim();
    const confirmPassword = form.confirm_password.trim();

    if (fullName.length < 2) return 'Vui lòng nhập tên admin.';
    if (!isValidLoginIdentifier(loginIdentifier)) return 'Nhập email hoặc số điện thoại đăng nhập hợp lệ.';
    if (!editingAccount || password) {
      if (!isStrongPassword(password)) return 'Mật khẩu cần có ít nhất 8 ký tự, gồm chữ và số.';
      if (password !== confirmPassword) return 'Xác nhận mật khẩu chưa khớp.';
    }
    return '';
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateForm();
    if (error) {
      showToast(error, 'warning');
      return;
    }

    const payload = {
      full_name: form.full_name.trim(),
      email: normalizeLoginIdentifier(form.email),
      is_active: form.is_active,
      ...(form.password.trim() ? { password: form.password.trim() } : {}),
    };

    setSaving(true);
    try {
      if (editingAccount) {
        await adminAccountService.update(editingAccount.id, payload);
        showToast('Đã cập nhật tài khoản admin.', 'success');
      } else {
        await adminAccountService.create({ ...payload, password: form.password.trim() });
        showToast('Đã thêm tài khoản admin.', 'success');
      }
      closeModal();
      await loadAccounts();
    } catch (submitError: any) {
      showToast(
        getApiMessage(
          submitError,
          editingAccount ? 'Không cập nhật được tài khoản.' : 'Không tạo được tài khoản.',
        ),
        'error',
        6000,
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async (account: AdminAccount) => {
    const ok = window.confirm(`Xóa tài khoản admin "${account.full_name || getLoginIdentifier(account)}"?`);
    if (!ok) return;

    setDeletingId(account.id);
    try {
      await adminAccountService.remove(account.id);
      setAccounts((current) => current.filter((item) => item.id !== account.id));
      showToast('Đã xóa tài khoản admin.', 'success');
    } catch (error: any) {
      showToast(getApiMessage(error, 'Không xóa được tài khoản admin.'), 'error', 6000);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (account: AdminAccount) => {
    if (account.is_active && activeCount <= 1) {
      showToast('Phải luôn có ít nhất 1 tài khoản admin đang hoạt động.', 'warning');
      return;
    }
    try {
      const updated = await adminAccountService.update(account.id, { is_active: !account.is_active });
      setAccounts((current) => current.map((item) => (item.id === account.id ? updated : item)));
      showToast(
        updated.is_active ? 'Đã bật đăng nhập cho tài khoản.' : 'Đã tắt đăng nhập cho tài khoản.',
        'success',
      );
    } catch (error: any) {
      showToast(getApiMessage(error, 'Không cập nhật được trạng thái tài khoản.'), 'error', 6000);
    }
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
              <UsersRound size={14} />
              Tài khoản
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Quản lý tài khoản admin
            </h1>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              Thêm, sửa, xóa và bật tắt quyền đăng nhập admin cho đội vận hành Lộc Sang.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(225,29,72,0.22)] transition hover:bg-rose-700"
          >
            <UserPlus size={18} />
            Thêm tài khoản
          </button>
        </div>

        <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60">
            <div className="text-xs font-black uppercase tracking-wide text-slate-400">Tổng tài khoản</div>
            <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{accounts.length}</div>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
            <div className="text-xs font-black uppercase tracking-wide opacity-75">Đang hoạt động</div>
            <div className="mt-2 text-2xl font-black">{activeCount}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60">
            <div className="text-xs font-black uppercase tracking-wide text-slate-400">Đã tắt</div>
            <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              {Math.max(0, accounts.length - activeCount)}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 p-4 dark:border-slate-800 sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên, email hoặc số điện thoại..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-rose-500/10"
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-[1.4rem] border border-slate-200 dark:border-slate-800">
            {loading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm font-bold text-slate-500">
                Không có tài khoản phù hợp.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAccounts.map((account) => {
                  const loginIdentifier = getLoginIdentifier(account);
                  const isLastActiveAccount = account.is_active && activeCount <= 1;
                  return (
                  <div key={account.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-base font-black text-slate-950 dark:text-white">
                          {account.full_name || loginIdentifier}
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${
                            account.is_active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {account.is_active ? 'Đang hoạt động' : 'Đã tắt'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                          <ShieldCheck size={13} />
                          Admin
                        </span>
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-slate-500">{loginIdentifier}</div>
                      <div className="mt-1 text-xs font-bold text-slate-400">Tạo ngày {formatDate(account.created_at)}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
                      <button
                        type="button"
                        disabled={isLastActiveAccount}
                        onClick={() => toggleActive(account)}
                        title={isLastActiveAccount ? 'Phải luôn có ít nhất 1 tài khoản admin đang hoạt động.' : undefined}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700 hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-200"
                      >
                        {account.is_active ? 'Tắt' : 'Bật'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(account)}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700 hover:border-rose-200 hover:text-rose-700 dark:border-slate-700 dark:text-slate-200"
                      >
                        <Edit3 size={15} />
                        Sửa
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === account.id || isLastActiveAccount}
                        onClick={() => deleteAccount(account)}
                        title={isLastActiveAccount ? 'Không thể xóa tài khoản admin hoạt động cuối cùng.' : undefined}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-3 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-500/10 dark:text-rose-200"
                      >
                        {deletingId === account.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        Xóa
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
          <div className="max-h-[92vh] w-full overflow-hidden rounded-t-[1.8rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:max-w-2xl sm:rounded-[1.8rem]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">
                  {editingAccount ? 'Sửa tài khoản admin' : 'Thêm tài khoản admin'}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {editingAccount
                    ? 'Cập nhật thông tin đăng nhập và trạng thái tài khoản.'
                    : 'Tạo tài khoản mới cho người quản trị.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitForm} className="max-h-[calc(92vh-5.5rem)] space-y-4 overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-black text-slate-800 dark:text-slate-100">
                  Tên admin
                  <input
                    value={form.full_name}
                    onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-rose-500/10"
                    placeholder="VD: Lộc Sang Admin"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-black text-slate-800 dark:text-slate-100">
                  Email hoặc số điện thoại đăng nhập
                  <input
                    type="text"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-rose-500/10"
                    placeholder="admin@locsang.vn hoặc 0985763838"
                    autoComplete="username"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-slate-950 dark:text-white">
                    {editingAccount ? 'Đổi mật khẩu tài khoản này' : 'Mật khẩu đăng nhập'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-rose-500/10"
                    placeholder={editingAccount ? 'Bỏ trống nếu không đổi' : 'Mật khẩu'}
                    autoComplete="new-password"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirm_password}
                    onChange={(event) => setForm((current) => ({ ...current, confirm_password: event.target.value }))}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-rose-500/10"
                    placeholder="Nhập lại mật khẩu"
                    autoComplete="new-password"
                  />
                </div>
                <p className="mt-2 text-xs font-bold text-slate-500">Mật khẩu tối thiểu 8 ký tự, gồm chữ và số.</p>
              </div>

              <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  disabled={isEditingLastActiveAccount}
                  onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
                Cho phép đăng nhập admin
              </label>
              {isEditingLastActiveAccount && (
                <p className="-mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
                  Đây là tài khoản admin hoạt động cuối cùng nên không thể tắt đăng nhập.
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(225,29,72,0.22)] transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  {editingAccount ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
