import { LogOut, Menu, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logo_url } from '../../config/api';
import { logout } from '../../services/authService';
import { adminNavItems } from './adminNavigation';

interface SidebarProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar = ({ sidebarOpen, toggleSidebar }: SidebarProps) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-30 hidden h-screen flex-col border-r border-slate-200 bg-white text-slate-900 shadow-[12px_0_32px_rgba(15,23,42,0.04)] transition-all duration-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 lg:flex ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex h-[4.5rem] items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
        {sidebarOpen ? (
          <div className="flex min-w-0 items-center gap-3">
            <img src={logo_url} alt="Lộc Sang" className="h-9 w-9 rounded-full bg-white object-contain ring-1 ring-slate-200 dark:ring-slate-800" />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-black tracking-wide text-slate-950 dark:text-white">Lộc Sang</div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Admin Panel</div>
            </div>
          </div>
        ) : (
          <img src={logo_url} alt="Lộc Sang" className="mx-auto h-9 w-9 rounded-full bg-white object-contain ring-1 ring-slate-200 dark:ring-slate-800" />
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
          aria-label={sidebarOpen ? 'Thu gọn menu' : 'Mở rộng menu'}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.end}
              title={!sidebarOpen ? item.name : undefined}
              className={({ isActive }) =>
                [
                  'flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition-colors',
                  sidebarOpen ? '' : 'justify-center',
                  isActive
                    ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
                ].join(' ')
              }
            >
              <Icon size={20} />
              {sidebarOpen && <span className="truncate">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-3 py-4 dark:border-slate-800">
        <button
          type="button"
          onClick={handleLogout}
          className={`flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10 ${
            sidebarOpen ? '' : 'justify-center'
          }`}
        >
          <LogOut size={19} />
          {sidebarOpen && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
