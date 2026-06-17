import * as React from "react";
import { useState, useEffect, FormEvent } from 'react';
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { loginWithApi } from '../../services/authService';
import { useToast } from '../../components/Toast';
import { validateForm, ValidationRules } from '../../utils/validation';
import LoadingButton from '../../components/common/LoadingButton';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import { logo_url } from '../../config/api';



interface LoginFormData {
  email: string;
  password: string;
}

const loginValidationRules: ValidationRules = {
  email: {
    required: true,
    email: true,
    message: 'Vui lòng nhập email hợp lệ'
  },
  password: {
    required: true,
    minLength: 6,
    message: 'Mật khẩu phải có ít nhất 6 ký tự'
  }
};

const getSafeAdminRedirect = (raw: string | null) => {
  const fallback = '/admin/';
  const value = String(raw || '').trim();
  if (!value || value.startsWith('//') || /[\u0000-\u001f]/.test(value)) return fallback;

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/admin')) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};

const AdminLoginPage: React.FC = () => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Focus on email input when component mounts
  useEffect(() => {
    const emailInput = document.getElementById('email');
    if (emailInput) emailInput.focus();

  }, []);

  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });

    // Clear errors when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validateForm(formData, loginValidationRules);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast('Vui lòng kiểm tra lại thông tin đăng nhập', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginWithApi(formData.email, formData.password);

      if (!result.success) {
        showToast(result.message || 'Đăng nhập thất bại.', 'error');
        setErrors({ general: result.message || 'Đăng nhập thất bại.' });
        return;
      }

      showToast('Đăng nhập thành công!', 'success');
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = getSafeAdminRedirect(urlParams.get('redirect'));

      localStorage.setItem('adminToken', result.token);
      sessionStorage.removeItem('adminToken');

      window.location.assign(redirectUrl);

    } catch (error) {
      showToast('Đăng nhập thất bại. Vui lòng thử lại.', 'error');
      setErrors({ general: 'Đăng nhập thất bại. Vui lòng thử lại.' });
    } finally {
      setIsLoading(false);
    }
  };


  // Handle "Forgot password" click
  const handleForgotPassword = () => {
    // In a real app, this would navigate to the forgot password page
    alert('Tính năng đang được phát triển');
  };


  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // In a real app, you would update the document class or use a context
  };

  return (
    <>
      <LoadingOverlay isLoading={isLoading} text="Đang đăng nhập..." />
      <div className={`min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gradient-to-br from-rose-50 to-white'}`}>
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-900 hover:bg-gray-800 text-yellow-300' : 'bg-white/80 hover:bg-white text-gray-700 ring-1 ring-gray-200'}`}
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <img
              className="mx-auto h-12 w-auto"
              src={logo_url}
              alt="Lộc Sang"
            />
            <div className={`mt-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Lộc Sang Admin</div>
          </div>

          <div className={`${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'} p-8 rounded-2xl shadow-sm transition-all duration-300`}>
            <div className="mb-6 text-center">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Đăng nhập tài khoản Admin
              </h2>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Input */}
              <div className="relative">
                <label htmlFor="email" className="sr-only">Email</label>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={`block w-full pl-10 pr-3 py-3 border ${errors.email ? 'border-red-500' : darkMode ? 'border-gray-700' : 'border-gray-300'} rounded-xl ${darkMode ? 'bg-gray-950 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-rose-500 transition duration-150 ease-in-out`}
                  placeholder="Email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="relative">
                <label htmlFor="password" className="sr-only">Mật khẩu</label>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`block w-full pl-10 pr-10 py-3 border ${errors.password ? 'border-red-500' : darkMode ? 'border-gray-700' : 'border-gray-300'} rounded-xl ${darkMode ? 'bg-gray-950 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-rose-500 transition duration-150 ease-in-out`}
                  placeholder="Mật khẩu"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {/* Forgot Password */}
              <div className="flex items-center justify-end">
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className={`font-medium ${darkMode ? 'text-rose-300 hover:text-rose-200' : 'text-rose-700 hover:text-rose-800'} transition duration-150 ease-in-out`}
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <div>
                <LoadingButton
                  type="submit"
                  isLoading={isLoading}
                  loadingText="Đang đăng nhập..."
                  variant="primary"
                  fullWidth
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 bg-rose-600 hover:bg-rose-700"
                >
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-rose-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  Đăng nhập
                </LoadingButton>
              </div>

              {/* General error message */}
              {errors.general && (
                <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                  {errors.general}
                </div>
              )}
            </form>

          </div>

          {/* Footer */}
          <div className="mt-4 text-center">
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              © 2025 Lộc Sang.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminLoginPage;
