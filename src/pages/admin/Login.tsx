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
  rememberMe: boolean;
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

const AdminLoginPage: React.FC = () => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Focus on email input when component mounts
  useEffect(() => {
    const emailInput = document.getElementById('email');
    if (emailInput) emailInput.focus();

    try {
      const remembered = localStorage.getItem('locsang_admin_remember_me');
      if (remembered === '0') {
        setFormData((prev) => ({ ...prev, rememberMe: false }));
      } else if (remembered === '1') {
        setFormData((prev) => ({ ...prev, rememberMe: true }));
      }
    } catch {
      // ignore storage read failures
    }
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
      const redirectUrl = urlParams.get('redirect') || '/admin/';

      if (formData.rememberMe) {
        localStorage.setItem('adminToken', result.token);
        sessionStorage.removeItem('adminToken');
      } else {
        sessionStorage.setItem('adminToken', result.token);
        localStorage.removeItem('adminToken');
      }

      try {
        localStorage.setItem('locsang_admin_remember_me', formData.rememberMe ? '1' : '0');
      } catch {
        // ignore storage write failures
      }

      window.location.href = redirectUrl;

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

  // Handle Google login
  const handleGoogleLogin = () => {
    // In a real app, this would initiate OAuth login
    alert('Tính năng đăng nhập với Google đang được phát triển');
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

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className={`h-4 w-4 ${darkMode ? 'bg-gray-950 border-gray-700 text-rose-500' : 'text-rose-600 border-gray-300'} rounded focus:ring-rose-500`}
                  />
                  <label htmlFor="remember-me" className={`ml-2 block text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nhớ đăng nhập
                  </label>
                </div>

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

            {/* Divider */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className={`px-2 ${darkMode ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-500'}`}>hoặc</span>
                </div>
              </div>
            </div>

            {/* Google Login */}
            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className={`w-full flex justify-center items-center py-3 px-4 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150 ease-in-out`}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z" />
                  <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2970012 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z" />
                  <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z" />
                  <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z" />
                </svg>
                Đăng nhập với Google
              </button>
            </div>
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
