import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStorefrontAuth } from '../../contexts/StorefrontAuthContext';
import { useSEO } from '../../hooks/useSEO';

const PROFILE_STORAGE_KEY = 'locsang_storefront_profile_v1';

const loadLocalProfile = (userId) => {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return { phone: '', address: '' };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { phone: '', address: '' };
    const profile = parsed[String(userId)] || {};
    return {
      phone: String(profile.phone || ''),
      address: String(profile.address || ''),
    };
  } catch {
    return { phone: '', address: '' };
  }
};

const saveLocalProfile = (userId, data) => {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const next = parsed && typeof parsed === 'object' ? parsed : {};
    next[String(userId)] = data;
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore local storage error
  }
};

const AccountProfile = () => {
  const navigate = useNavigate();
  const { user, loading, updateProfile, logout } = useStorefrontAuth();

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', address: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useSEO({
    title: 'Tai Khoan Ca Nhan',
    description: 'Trang thong tin tai khoan Lộc Sang.',
    canonicalPath: '/account',
    noindex: true,
  });

  useEffect(() => {
    if (!user) return;
    const local = loadLocalProfile(user.id);
    setForm((prev) => ({
      ...prev,
      full_name: user.full_name || '',
      email: user.email || '',
      phone: local.phone || '',
      address: local.address || '',
      password: '',
    }));
  }, [user]);

  const joinedDate = useMemo(() => {
    const d = new Date(user?.created_at || '');
    if (Number.isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(d);
  }, [user?.created_at]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!form.full_name.trim()) {
      setError('Họ tên không được để trống');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password.trim() ? form.password : undefined,
      });
      saveLocalProfile(user.id, { phone: form.phone.trim(), address: form.address.trim() });
      setForm((prev) => ({ ...prev, password: '' }));
      setSuccess('Đã lưu thông tin tài khoản');
    } catch (err) {
      setError(
        err?.response?.data?.detail
        || err?.response?.data?.message
        || err?.message
        || 'Không thể lưu thông tin tài khoản',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-6 pb-12">
        <div className="max-w-2xl mx-auto px-4">Đang tải tài khoản...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pt-6 pb-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900">Tài khoản của bạn</h1>
            <p className="mt-1 text-sm text-gray-600">Bạn chưa đăng nhập, nhưng vẫn có thể xem và tra cứu đơn hàng.</p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                to="/account/orders"
                className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                Xem đơn hàng của tôi
              </Link>
              <Link
                to="/account/login"
                state={{ from: '/account' }}
                className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Đăng nhập tài khoản
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900">Tài khoản của bạn</h1>
          <p className="mt-1 text-sm text-gray-600">Tham gia từ: {joinedDate}</p>

          <Link
            to="/account/orders"
            className="mt-4 flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 md:hidden"
          >
            Xem đơn hàng của tôi
          </Link>

          {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {success && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

          <form className="mt-5 space-y-4" onSubmit={onSave}>
            <div>
              <label className="block text-sm font-semibold text-gray-800">Họ và tên</label>
              <input name="full_name" value={form.full_name} onChange={onChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800">Email</label>
              <input name="email" type="email" value={form.email} onChange={onChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800">Số điện thoại</label>
              <input name="phone" value={form.phone} onChange={onChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Dùng để tự điền checkout" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800">Địa chỉ mặc định</label>
              <textarea name="address" value={form.address} onChange={onChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" rows={3} placeholder="Dùng để tự điền checkout" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800">Mật khẩu mới (không bắt buộc)</label>
              <input name="password" type="password" value={form.password} onChange={onChange} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" autoComplete="new-password" />
            </div>

            <button type="submit" disabled={saving} className="w-full rounded-lg bg-rose-600 py-2.5 text-white font-semibold hover:bg-rose-700 disabled:opacity-60">
              {saving ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <Link to="/checkout" className="text-rose-600 font-semibold hover:underline">Đi tới checkout</Link>
              <Link to="/account/orders" className="text-rose-600 font-semibold hover:underline">Đơn hàng của tôi</Link>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountProfile;
