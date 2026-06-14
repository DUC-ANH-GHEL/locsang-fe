import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStorefrontAuth } from '../../contexts/StorefrontAuthContext';
import { useSEO } from '../../hooks/useSEO';
import { forgotStorefrontPassword, resetStorefrontPassword } from '../../services/customerAccountService';

const AUTH_MODES = ['login', 'register', 'forgot', 'reset'];

const getModeFromSearch = (search) => {
  const params = new URLSearchParams(search);
  const mode = String(params.get('mode') || 'login').trim().toLowerCase();
  return AUTH_MODES.includes(mode) ? mode : 'login';
};

const getResetTokenFromSearch = (search) => {
  const params = new URLSearchParams(search);
  return String(params.get('token') || '').trim();
};

const getModeTitle = (mode) => {
  if (mode === 'register') return 'Dang Ky Tai Khoan';
  if (mode === 'forgot') return 'Quen Mat Khau';
  if (mode === 'reset') return 'Dat Lai Mat Khau';
  return 'Dang Nhap Tai Khoan';
};

const getHeading = (mode) => {
  if (mode === 'register') return 'Tạo tài khoản mới';
  if (mode === 'forgot') return 'Quên mật khẩu';
  if (mode === 'reset') return 'Đặt lại mật khẩu';
  return 'Đăng nhập tài khoản';
};

const getDescription = (mode) => {
  if (mode === 'forgot') return 'Nhập email tài khoản để tạo yêu cầu đặt lại mật khẩu.';
  if (mode === 'reset') return 'Tạo mật khẩu mới cho tài khoản của bạn.';
  return 'Lưu thông tin cá nhân để checkout nhanh hơn.';
};

const parseError = (error, fallbackMessage) => {
  return (
    error?.response?.data?.detail
    || error?.response?.data?.message
    || error?.message
    || fallbackMessage
  );
};

const AccountAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const facebookAppId = String(import.meta.env.VITE_FACEBOOK_APP_ID || '').trim();
  const facebookLoginEnabled = false;
  const redirectTo = useMemo(() => {
    const fromState = location.state?.from;
    if (typeof fromState === 'string' && fromState.trim()) return fromState;
    return '/';
  }, [location.state]);

  const { login, register, loginWithFacebook } = useStorefrontAuth();
  const [mode, setMode] = useState(() => getModeFromSearch(location.search));
  const [loading, setLoading] = useState(false);
  const [facebookReady, setFacebookReady] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const resetTokenFromUrl = useMemo(() => getResetTokenFromSearch(location.search), [location.search]);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setMode(getModeFromSearch(location.search));
  }, [location.search]);

  useEffect(() => {
    if (mode !== 'login' || !facebookLoginEnabled || !facebookAppId) {
      setFacebookReady(false);
      return;
    }

    let cancelled = false;

    const markReady = () => {
      if (cancelled || !window.FB) return;
      window.FB.init({
        appId: facebookAppId,
        cookie: true,
        xfbml: false,
        version: 'v20.0',
      });
      setFacebookReady(true);
    };

    if (window.FB) {
      markReady();
      return () => {
        cancelled = true;
      };
    }

    window.fbAsyncInit = markReady;

    const existingSdk = document.getElementById('facebook-jssdk');
    if (!existingSdk) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [facebookAppId, facebookLoginEnabled, mode]);

  const changeMode = (nextMode, options = {}) => {
    const params = new URLSearchParams(location.search);
    params.set('mode', nextMode);

    if (nextMode === 'reset') {
      const token = String(options.token || resetTokenFromUrl || '').trim();
      if (token) params.set('token', token);
    } else {
      params.delete('token');
    }

    navigate(
      {
        pathname: '/account/login',
        search: params.toString() ? `?${params.toString()}` : '',
      },
      {
        replace: true,
        state: location.state,
      },
    );

    setError('');
    setInfo('');
  };

  useSEO({
    title: getModeTitle(mode),
    description: 'Trang tai khoan Lộc Sang.',
    canonicalPath: '/account/login',
    noindex: true,
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (info) setInfo('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (mode === 'forgot') {
      if (!form.email.trim()) {
        setError('Vui lòng nhập email');
        return;
      }

      try {
        setLoading(true);
        const response = await forgotStorefrontPassword({ email: form.email.trim() });
        const resetToken = String(response?.reset_token || '').trim();
        if (resetToken) {
          setInfo('Đã tạo yêu cầu đặt lại mật khẩu. Vui lòng nhập mật khẩu mới.');
          changeMode('reset', { token: resetToken });
          return;
        }

        setInfo(response?.message || 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.');
      } catch (err) {
        setError(parseError(err, 'Không thể xử lý yêu cầu quên mật khẩu.'));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'reset') {
      if (form.password.length < 8) {
        setError('Mật khẩu mới tối thiểu 8 ký tự');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Mật khẩu nhập lại chưa khớp');
        return;
      }

      if (!resetTokenFromUrl) {
        setError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
        return;
      }

      try {
        setLoading(true);
        const response = await resetStorefrontPassword({
          token: resetTokenFromUrl,
          new_password: form.password,
        });
        setInfo(response?.message || 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
        setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
        changeMode('login');
      } catch (err) {
        setError(parseError(err, 'Không thể đặt lại mật khẩu.'));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!form.email.trim() || !form.password.trim()) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }

    if (mode === 'register') {
      if (!form.full_name.trim()) {
        setError('Vui lòng nhập họ tên');
        return;
      }
      if (form.password.length < 8) {
        setError('Mật khẩu tối thiểu 8 ký tự');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Mật khẩu nhập lại chưa khớp');
        return;
      }
    }

    try {
      setLoading(true);
      if (mode === 'login') {
        await login({ email: form.email.trim(), password: form.password });
      } else {
        await register({
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
        });
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(parseError(err, 'Không thể đăng nhập. Vui lòng thử lại.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    if (!facebookLoginEnabled) {
      setError('Đăng nhập Facebook đang tạm ẩn.');
      return;
    }

    if (!facebookAppId) {
      setError('Chưa cấu hình Facebook App ID.');
      return;
    }

    if (!window.FB) {
      setError('Facebook SDK chưa sẵn sàng, vui lòng thử lại sau ít giây.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const loginResponse = await new Promise((resolve) => {
        window.FB.login(
          (response) => resolve(response),
          { scope: 'public_profile,email' },
        );
      });

      const accessToken = String(loginResponse?.authResponse?.accessToken || '').trim();
      const userId = String(loginResponse?.authResponse?.userID || '').trim();

      if (!accessToken) {
        setError('Bạn đã huỷ đăng nhập Facebook hoặc chưa cấp quyền email.');
        return;
      }

      await loginWithFacebook({
        access_token: accessToken,
        user_id: userId || undefined,
      });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(parseError(err, 'Không thể đăng nhập với Facebook.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-12">
      <div className="relative max-w-md mx-auto bg-white rounded-2xl border border-gray-200 shadow p-6">
        {loading && (
          <div className="absolute inset-0 z-10 rounded-2xl bg-white/75 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm">
              <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300 border-t-rose-600 animate-spin" />
              Đang xử lý, vui lòng chờ...
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900">{getHeading(mode)}</h1>
        <p className="mt-1 text-sm text-gray-600">{getDescription(mode)}</p>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {info && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</div>}
        {loading && <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">Đang gửi yêu cầu, vui lòng không tắt trang.</div>}

        <form className="mt-5 space-y-4" onSubmit={submit}>
          <fieldset disabled={loading} className="space-y-4 disabled:opacity-85">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-semibold text-gray-800">Họ và tên</label>
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Nguyen Van A"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-800">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <div>
              <label className="block text-sm font-semibold text-gray-800">Mật khẩu</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={onChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              </div>
            )}

            {(mode === 'register' || mode === 'reset') && (
              <div>
                <label className="block text-sm font-semibold text-gray-800">Nhập lại mật khẩu</label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  autoComplete="new-password"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-rose-600 py-2.5 text-white font-semibold hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <span className="inline-block h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />}
              {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : mode === 'register' ? 'Tạo tài khoản' : mode === 'forgot' ? 'Gửi yêu cầu' : 'Đặt lại mật khẩu'}
            </button>
          </fieldset>
        </form>


        <div className="mt-4 text-sm text-gray-600">
          {mode === 'login' && (
            <>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                disabled={loading}
                onClick={() => changeMode('register')}
                className="text-rose-600 font-semibold hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Đăng ký ngay
              </button>
              {' '}·{' '}
              <button
                type="button"
                disabled={loading}
                onClick={() => changeMode('forgot')}
                className="text-rose-600 font-semibold hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Quên mật khẩu?
              </button>
            </>
          )}

          {mode === 'register' && (
            <>
              Đã có tài khoản?{' '}
              <button
                type="button"
                disabled={loading}
                onClick={() => changeMode('login')}
                className="text-rose-600 font-semibold hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Đăng nhập
              </button>
            </>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <button
              type="button"
              disabled={loading}
              onClick={() => changeMode('login')}
              className="text-rose-600 font-semibold hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Quay lại đăng nhập
            </button>
          )}
        </div>

        <div className="mt-3 text-sm">
          <Link to="/" className="text-gray-500 hover:text-gray-700">Quay lại trang chủ</Link>
        </div>
      </div>
    </div>
  );
};

export default AccountAuth;
