import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, KeyRound, LogOut, Menu, Moon, Settings, Sun } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logo_url } from '../../config/api';
import { logout } from '../../services/authService';
import { ADMIN_NEW_ORDER_EVENT, AdminNotification, adminNotificationService } from '../../services/adminNotificationService';
import { adminNavItems } from './adminNavigation';
import { formatViDateTime } from '../../utils/dateTime';

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

const formatNotificationTime = (value?: string | null) =>
  formatViDateTime(value, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });

const Header = ({ darkMode, toggleDarkMode, sidebarOpen, onOpenMobileMenu }: HeaderProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const hasLoadedNotificationsRef = useRef(false);
  const seenNotificationIdsRef = useRef<Set<number>>(new Set());
  const recentPushOrderIdsRef = useRef<Set<number>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();
  const title = getCurrentTitle(location.pathname);

  const dispatchNewOrderNotification = (notification: Partial<AdminNotification>) => {
    window.dispatchEvent(new CustomEvent(ADMIN_NEW_ORDER_EVENT, { detail: notification }));
  };

  const showDesktopNotification = (notification: AdminNotification) => {
    if (typeof window === 'undefined' || !('Notification' in window) || window.Notification.permission !== 'granted') return;

    const orderId = Number(notification.order_id || 0);
    if (orderId && recentPushOrderIdsRef.current.has(orderId)) return;

    const desktopNotification = new window.Notification(notification.title || 'Có đơn hàng mới', {
      body: notification.body || 'Lộc Sang vừa nhận một đơn hàng mới.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: notification.order_id ? `locsang-order-${notification.order_id}` : `locsang-notification-${notification.id}`,
      renotify: true,
      data: {
        url: notification.url || '/admin/orders',
        orderId: notification.order_id || null,
      },
    });

    desktopNotification.onclick = () => {
      window.focus();
      desktopNotification.close();
      if (notification.url) navigate(notification.url);
    };
  };

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const response = await adminNotificationService.list(20);
      const nextNotifications = Array.isArray(response.data) ? response.data : [];
      const firstLoad = !hasLoadedNotificationsRef.current;
      const freshOrderNotifications = firstLoad
        ? []
        : nextNotifications.filter((notification) => (
          notification.type === 'order'
          && !notification.read_at
          && !seenNotificationIdsRef.current.has(notification.id)
        ));

      seenNotificationIdsRef.current = new Set(nextNotifications.map((notification) => notification.id));
      hasLoadedNotificationsRef.current = true;
      setNotifications(nextNotifications);
      setUnreadCount(Number(response.unread_count || 0));

      freshOrderNotifications
        .slice()
        .reverse()
        .forEach((notification) => {
          dispatchNewOrderNotification(notification);
          showDesktopNotification(notification);
        });
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (avatarRef.current && !avatarRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'LOCSANG_ADMIN_NEW_ORDER_PUSH') return;

      const payload = event.data?.payload || {};
      const orderId = Number(payload.orderId || payload.order_id || 0);
      const url = payload.url || (orderId ? `/admin/orders?orderId=${orderId}` : '/admin/orders');
      if (orderId) {
        recentPushOrderIdsRef.current.add(orderId);
        window.setTimeout(() => {
          recentPushOrderIdsRef.current.delete(orderId);
        }, 15000);
      }

      dispatchNewOrderNotification({
        type: 'order',
        title: payload.title || 'Có đơn hàng mới',
        body: payload.body || '',
        url,
        order_id: orderId || null,
        tracking_code: payload.trackingCode || payload.tracking_code || null,
      });
      loadNotifications();
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const openNotification = async (notification: AdminNotification) => {
    if (!notification.read_at) {
      setUnreadCount((value) => Math.max(0, value - 1));
      setNotifications((prev) => prev.map((item) => (item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item)));
      adminNotificationService.markRead(notification.id).catch(() => loadNotifications());
    }
    setNotificationOpen(false);
    if (notification.url) navigate(notification.url);
  };

  const markAllRead = async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    try {
      await adminNotificationService.markAllRead();
    } catch {
      loadNotifications();
    }
  };

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
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationOpen((value) => !value);
                if (!notificationOpen) loadNotifications();
              }}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-rose-300"
              title="Thông báo"
              aria-label="Mở danh sách thông báo"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-950">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="fixed left-3 right-3 top-[4.95rem] z-50 flex max-h-[min(31rem,calc(100dvh-10.8rem))] min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 dark:border-slate-800 dark:bg-slate-900 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[22rem] sm:max-h-[32rem]">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
                  <div>
                    <div className="text-sm font-black text-slate-950 dark:text-white">Thông báo</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{unreadCount} thông báo chưa đọc</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationOpen(false);
                      navigate('/admin/settings');
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    aria-label="Cài đặt thông báo"
                  >
                    <Settings size={18} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto p-2">
                  {notificationsLoading && notifications.length === 0 ? (
                    <div className="space-y-2 p-2">
                      {[0, 1, 2].map((item) => (
                        <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <div className="text-sm font-black text-slate-900 dark:text-white">Chưa có thông báo</div>
                      <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Đơn hàng mới sẽ xuất hiện ở đây.</div>
                    </div>
                  ) : (
                    notifications.map((notification) => {
                      const unread = !notification.read_at;
                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => openNotification(notification)}
                          className="flex w-full gap-3 rounded-2xl px-3 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
                        >
                          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${unread ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-slate-950 dark:text-white">{notification.title}</span>
                            <span className="mt-1 line-clamp-2 block text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{notification.body}</span>
                            <span className="mt-2 block text-[11px] font-bold text-slate-400">{formatNotificationTime(notification.created_at)}</span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                    <button type="button" onClick={markAllRead} className="min-w-0 text-left text-xs font-black text-slate-500 hover:text-rose-600 dark:text-slate-400">
                      Đánh dấu đã đọc
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationOpen(false);
                        navigate('/admin/settings');
                      }}
                      className="shrink-0 text-xs font-black text-rose-600 hover:text-rose-700"
                    >
                      Cài đặt thông báo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

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
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/admin/settings');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <KeyRound size={16} /> Đổi mật khẩu
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/admin/settings');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Settings size={16} /> Cài đặt
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
