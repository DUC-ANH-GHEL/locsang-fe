import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Package,
  X,
  Menu,
  LogOut,
  Tag,
  NotebookPen,
  FolderTree,
  MessageSquareQuote,
  Mail,
  Play,
  Images,
  PanelTop,
  PanelBottom,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react';
import { logo_url } from '../../config/api';
import { logout } from '../../services/authService';

interface SidebarProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

type SidebarSubItem = {
  name: string;
  url: string;
  icon?: React.ReactNode;
  children?: SidebarSubItem[];
};

type SidebarGroup = {
  id: string;
  name: string;
  icon: React.ReactNode;
  defaultUrl: string;
  children: SidebarSubItem[];
};

const Sidebar = ({ sidebarOpen, toggleSidebar }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const flyoutRef = useRef<HTMLDivElement>(null);

  const navGroups: SidebarGroup[] = [
    {
      name: 'Dashboard',
      id: 'dashboard',
      icon: <Home size={20} />,
      defaultUrl: '/admin',
      children: [
        { name: 'Tổng quan', url: '/admin', icon: <LayoutDashboard size={16} /> },
        { name: 'Header', url: '/admin/header', icon: <PanelTop size={16} /> },
        { name: 'Footer', url: '/admin/footer', icon: <PanelBottom size={16} /> },
      ],
    },
    {
      name: 'Sản phẩm',
      id: 'products',
      icon: <Package size={20} />,
      defaultUrl: '/admin/products',
      children: [
        { name: 'Danh sách sản phẩm', url: '/admin/products', icon: <Package size={16} /> },
        { name: 'Danh mục', url: '/admin/categories', icon: <Tag size={16} /> },
      ],
    },
    {
      name: 'Nội dung',
      id: 'content',
      icon: <NotebookPen size={20} />,
      defaultUrl: '/admin/tips',
      children: [
        {
          name: 'Mẹo chăm sóc',
          url: '/admin/tips',
          icon: <NotebookPen size={16} />,
          children: [
            { name: 'DM bài viết', url: '/admin/tips/categories', icon: <FolderTree size={15} /> },
          ],
        },
        { name: 'Liên hệ', url: '/admin/contacts', icon: <Mail size={16} /> },
        { name: 'Câu chuyện KH', url: '/admin/customer-stories', icon: <MessageSquareQuote size={16} /> },
        { name: 'Lộc Sang Shorts', url: '/admin/shorts', icon: <Play size={16} /> },
        { name: 'Cộng đồng', url: '/admin/community', icon: <Images size={16} /> },
      ],
    },
  ];

  const isUrlActive = (url: string) => {
    if (url === '/admin') return location.pathname === '/admin';
    return location.pathname === url || location.pathname.startsWith(`${url}/`);
  };

  const isSubtreeActive = (item: SidebarSubItem): boolean => {
    if (isUrlActive(item.url)) return true;
    if (!item.children?.length) return false;
    return item.children.some((child) => isSubtreeActive(child));
  };

  const isGroupActive = (group: SidebarGroup) => group.children.some((child) => isSubtreeActive(child));

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    navGroups.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.id] = true;
      return acc;
    }, {}),
  );

  const [expandedSubItems, setExpandedSubItems] = useState<Record<string, boolean>>(() => {
    const next: Record<string, boolean> = {};
    navGroups.forEach((group) => {
      group.children.forEach((child) => {
        if (child.children?.length) next[child.url] = true;
      });
    });
    return next;
  });

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      let changed = false;

      navGroups.forEach((group) => {
        if (isGroupActive(group) && !next[group.id]) {
          next[group.id] = true;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [location.pathname]);

  useEffect(() => {
    setExpandedSubItems((prev) => {
      const next = { ...prev };
      let changed = false;

      navGroups.forEach((group) => {
        group.children.forEach((child) => {
          if (child.children?.length && isSubtreeActive(child) && !next[child.url]) {
            next[child.url] = true;
            changed = true;
          }
        });
      });

      return changed ? next : prev;
    });
  }, [location.pathname]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const toggleSubItem = (url: string) => {
    setExpandedSubItems((prev) => ({
      ...prev,
      [url]: !prev[url],
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <aside
      className={`${sidebarOpen ? 'w-64' : 'w-20'} fixed top-0 left-0 h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-30 flex flex-col`}
      ref={flyoutRef}
    >
      {/* Logo + Toggle */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
        {sidebarOpen ? (
          <div className="flex items-center gap-2">
            <img src={logo_url} alt="Logo" className="h-8 w-8 rounded-full ring-1 ring-gray-200 dark:ring-gray-800" />
            <div className="leading-tight">
              <div className="font-semibold tracking-wide">Lộc Sang</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Admin</div>
            </div>
          </div>
        ) : (
          <img src={logo_url} alt="Logo" className="h-8 w-8 rounded-full ring-1 ring-gray-200 dark:ring-gray-800 mx-auto" />
        )}
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Toggle sidebar">
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {/* Navigation */}
      <nav className="mt-4 px-2 space-y-1 flex-1">
        {navGroups.map((group) => {
          const groupActive = isGroupActive(group);
          const groupExpanded = Boolean(expandedGroups[group.id]);
          const groupExactActive = isUrlActive(group.defaultUrl);

          return (
            <div key={group.id} className="space-y-1">
              <div className="flex items-center gap-1">
                <NavLink
                  to={group.defaultUrl}
                  title={!sidebarOpen ? group.name : undefined}
                  className={[
                    'flex min-w-0 flex-1 items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                    sidebarOpen ? '' : 'justify-center',
                    !sidebarOpen && groupActive
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
                      : sidebarOpen && groupExactActive
                        ? 'text-rose-700 dark:text-rose-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
                  ].join(' ')}
                  end={group.defaultUrl === '/admin'}
                >
                  {group.icon}
                  {sidebarOpen && <span className="truncate">{group.name}</span>}
                </NavLink>

                {sidebarOpen && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-label={groupExpanded ? `Thu gọn ${group.name}` : `Mở rộng ${group.name}`}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  >
                    {groupExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                )}
              </div>

              {sidebarOpen && groupExpanded ? (
                <div className="ml-6 space-y-1 border-l border-gray-200 pl-3 dark:border-gray-700">
                  {group.children.map((child) => {
                    const childExactActive = isUrlActive(child.url);
                    const childSubtreeActive = isSubtreeActive(child);
                    const childExpanded = Boolean(expandedSubItems[child.url]);
                    return (
                      <div key={child.url} className="space-y-1">
                        <div className="flex items-center gap-1">
                          <NavLink
                            to={child.url}
                            className={[
                              'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                              childExactActive
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                            ].join(' ')}
                            end={child.url === '/admin'}
                          >
                            {child.icon}
                            <span className="truncate">{child.name}</span>
                          </NavLink>

                          {child.children?.length ? (
                            <button
                              type="button"
                              onClick={() => toggleSubItem(child.url)}
                              aria-label={childExpanded ? `Thu gọn ${child.name}` : `Mở rộng ${child.name}`}
                              className={[
                                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
                                childSubtreeActive ? 'text-rose-600 dark:text-rose-300' : '',
                              ].join(' ')}
                            >
                              {childExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          ) : null}
                        </div>

                        {child.children?.length && childExpanded ? (
                          <div className="ml-5 space-y-1 border-l border-gray-200 pl-2 dark:border-gray-700">
                            {child.children.map((subChild) => {
                              const subChildActive = isUrlActive(subChild.url);
                              return (
                                <NavLink
                                  key={subChild.url}
                                  to={subChild.url}
                                  className={[
                                    'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                                    subChildActive
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                                  ].join(' ')}
                                >
                                  {subChild.icon}
                                  <span className="truncate">{subChild.name}</span>
                                </NavLink>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      {/* Bottom: Đăng xuất */}
      <div className="px-2 pb-4 mt-auto">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-4 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
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
