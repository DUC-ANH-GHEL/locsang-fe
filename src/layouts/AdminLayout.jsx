import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { adminBottomNavItems, adminNavItems } from '../components/layout/adminNavigation';
import { logo_url } from '../config/api';
import { logout } from '../services/authService';

const AdminDrawer = ({ open, onClose }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/admin/login');
  };

  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute left-0 top-0 flex h-full w-[min(20rem,82vw)] flex-col bg-white shadow-2xl shadow-slate-950/25 transition-transform duration-300 dark:bg-slate-950 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[5.2rem] items-center justify-between border-b border-slate-100 px-5 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logo_url} alt="Lộc Sang" className="h-10 w-10 rounded-full bg-white object-contain ring-1 ring-slate-200 dark:ring-slate-800" />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-base font-black text-slate-950 dark:text-white">Admin Panel</div>
              <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">Lộc Sang</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Đóng menu"
          >
            <X size={21} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    'flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-black transition-colors',
                    isActive
                      ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
                  ].join(' ')
                }
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-50 text-sm font-black text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </aside>
    </div>
  );
};

const AdminBottomNav = () => (
  <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.45rem)] pt-2 shadow-[0_-16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/92 lg:hidden">
    <div className="mx-auto grid max-w-xs grid-cols-2 gap-2">
      {adminBottomNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.end}
            className={({ isActive }) =>
              [
                'flex min-h-[3.65rem] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black transition-colors',
                isActive
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
                  : 'text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-900',
              ].join(' ')
            }
          >
            <Icon size={22} />
            <span className="leading-none">{item.name}</span>
          </NavLink>
        );
      })}
    </div>
  </nav>
);

const AdminLayout = () => {
  const location = useLocation();
  const mainRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('locsang_admin_theme');
      if (saved === 'dark') {
        setDarkMode(true);
        return;
      }
      if (saved === 'light') {
        setDarkMode(false);
        return;
      }
    } catch {
      // ignore
    }

    const prefersDark =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(Boolean(prefersDark));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('locsang_admin_theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileMenuOpen]);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen((value) => !value)} />
        <AdminDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

        <div className={`min-h-screen min-w-0 overflow-x-hidden transition-[margin] duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          <Header
            sidebarOpen={sidebarOpen}
            darkMode={darkMode}
            toggleDarkMode={() => setDarkMode((value) => !value)}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          <main
            ref={mainRef}
            className="h-screen overflow-x-hidden overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+6.4rem)] pt-[5.7rem] sm:px-6 lg:px-8 lg:pb-8 lg:pt-[5.75rem]"
          >
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>

        <AdminBottomNav />
      </div>
    </div>
  );
};

export default AdminLayout;
