import { Home, LogOut, Menu, Package, ShoppingCart, Tag, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logo_url } from '../../config/api';
import { logout } from '../../services/authService';

interface SidebarProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const navItems = [
  { name: 'Tổng quan', url: '/admin', icon: <Home size={20} />, end: true },
  { name: 'Sản phẩm', url: '/admin/products', icon: <Package size={20} /> },
  { name: 'Danh mục', url: '/admin/categories', icon: <Tag size={20} /> },
  { name: 'Đơn hàng', url: '/admin/orders', icon: <ShoppingCart size={20} /> },
];

const Sidebar = ({ sidebarOpen, toggleSidebar }: SidebarProps) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <aside
      className={`${sidebarOpen ? 'w-64' : 'w-20'} fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-gray-200 bg-white text-gray-900 transition-all duration-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100`}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
        {sidebarOpen ? (
          <div className="flex min-w-0 items-center gap-2">
            <img src={logo_url} alt="Lộc Sang" className="h-8 w-8 rounded-full ring-1 ring-gray-200 dark:ring-gray-800" />
            <div className="min-w-0 leading-tight">
              <div className="truncate font-semibold tracking-wide">Lộc Sang</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Admin</div>
            </div>
          </div>
        ) : (
          <img src={logo_url} alt="Lộc Sang" className="mx-auto h-8 w-8 rounded-full ring-1 ring-gray-200 dark:ring-gray-800" />
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Thu gọn sidebar"
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.end}
            title={!sidebarOpen ? item.name : undefined}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                sidebarOpen ? '' : 'justify-center',
                isActive
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
              ].join(' ')
            }
          >
            {item.icon}
            {sidebarOpen && <span className="truncate">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-2 pb-4">
        <button
          type="button"
          onClick={handleLogout}
          className={`flex w-full items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-800 ${
            sidebarOpen ? '' : 'justify-center'
          }`}
        >
          <LogOut size={18} />
          {sidebarOpen && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
