import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, BellRing, ChevronDown, KeyRound, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logo_url } from '../../config/api';
import { logout } from '../../services/authService';
import {
  AdminPushState,
  getAdminPushState,
  subscribeAdminPush,
  unsubscribeAdminPush,
} from '../../services/adminPushNotificationService';
import { useToast } from '../Toast';
import { adminNavItems } from './adminNavigation';

interface HeaderProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  sidebarOpen: boolean;
  onOpenMobileMenu: () => void;
}

const getCurrentTitle = (pathname: string) => {
  const match = adminNavItems
    .filter((item) => (item.end ? pathname === item.url : pathname.startsWith(item.url)))
    .sort((a, b) => b.url.length - a.url.length)[0];

  if (pathname.includes('/create')) return 'Tạo mới';
  if (pathname.includes('/edit') || pathname.includes('/update')) return 'Chỉnh sửa';
  return match?.name || 'Admin';
};

const getPushTitle = (state: AdminPushState, loading: boolean) => {
  if (loading) return 'Đang kiểm tra thông báo';
  if (state === 'subscribed') return 'Đang nhận thông báo đơn mới. Bấm để tắt.';
  if (state === 'denied') return 'Thông báo đang bị chặn trong trình duyệt/PWA.';
  if (state === 'unconfigured') return 'Backend chưa cấu hình Web Push.';
  if (state === 'unsupported') return 'Trình duyệt này chưa hỗ trợ thông báo đẩy.';
  return 'Bật thông báo đơn hàng mới';
};

const Header = ({ darkMode, toggleDarkMode, sidebarOpen, onOpenMobileMenu }: HeaderProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pushState, setPushState] = useState<AdminPushState>('default');
  const [pushLoading, setPushLoading] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const title = getCurrentTitle(location.pathname);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;
    const refreshPushState = async () => {
      try {
        const state = await getAdminPushState();
        if (active) setPushState(state);
      } catch {
        if (active) setPushState('default');
      }
    };

    refreshPushState();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handlePushClick = async () => {
    if (pushLoading) return;
    setPushLoading(true);
    try {
      if (pushState === 'subscribed') {
        await unsubscribeAdminPush();
        setPushState(await getAdminPushState());
        showToast('Đã tắt thông báo đơn hàng mới trên thiết bị này.', 'success');
        return;
      }

      await subscribeAdminPush();
      setPushState('subscribed');
      showToast('Đã bật thông báo đơn hàng mới cho thiết bị này.', 'success');
    } catch (error: any) {
      const message = error?.message || 'Không bật được thông báo. Vui lòng thử lại.';
      showToast(message, pushState === 'denied' ? 'warning' : 'error', 6000);
      try {
        setPushState(await getAdminPushState());
      } catch {
        // keep current state
      }
    } finally {
      setPushLoading(false);
    }
  };

  const PushIcon = pushState === 'subscribed' ? BellRing : pushState === 'denied' ? BellOff : Bell;
  const pushButtonClass = pushState === 'subscribed'
    ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10'
    : pushState === 'denied' || pushState === 'unconfigured'
      ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10'
      : 'text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-rose-300';

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-30 border-b border-slate-200 bg-white/92 backdrop-blur-xl transition-all dark:border-slate-800 dark:bg-slate-950/88 lg:left-auto ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
      }`}
    >
      <div className="flex h-[4.7rem] items-center justify-between px-4 sm:px-6 lg:h-[4.5rem]">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 lg:hidden"
            aria-label="Mở menu admin"
          >
            <Menu size={23} />
          </button>

          <img src={logo_url} alt="Lộc Sang" className="h-9 w-9 shrink-0 rounded-full bg-white object-contain ring-1 ring-slate-200 dark:ring-slate-800" />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-base font-black text-slate-950 dark:text-white lg:text-sm">Lộc Sang</div>
            <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{title}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handlePushClick}
            disabled={pushLoading}
            className={`relative inline-flex h-10 w-10 items-center justify-center rounded-2xl transition-colors disabled:cursor-wait disabled:opacity-70 ${pushButtonClass}`}
            title={getPushTitle(pushState, pushLoading)}
            aria-label={getPushTitle(pushState, pushLoading)}
          >
            <PushIcon size={20} />
            {pushState === 'subscribed' && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            title={darkMode ? 'Chế độ sáng' : 'Chế độ tối'}
            aria-label={darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
          </button>

          <div className="relative" ref={avatarRef}>
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-2xl px-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900"
              onClick={() => setDropdownOpen((value) => !value)}
              aria-label="Tài khoản admin"
            >
              <img src={logo_url} alt="Admin" className="h-8 w-8 rounded-full bg-white object-contain ring-2 ring-rose-200 dark:ring-rose-500/30" />
              <span className="hidden text-sm font-bold text-slate-700 dark:text-slate-200 sm:block">Admin</span>
              <ChevronDown size={16} className="hidden text-slate-400 sm:block" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
                <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                  <KeyRound size={16} /> Đổi mật khẩu
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                >
                  <LogOut size={16} /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
