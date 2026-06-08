import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

const AdminLayout = () => {
  const location = useLocation();
  const mainRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Kiểm tra kích thước màn hình và cập nhật trạng thái `isMobile`
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth <= 768) {
        // setIsMobile(true);
        setSidebarOpen(false); // Đóng sidebar khi ở mobile
      } else {
        // setIsMobile(false);
        setSidebarOpen(true); // Mở sidebar khi ở desktop
      }
    };

    checkMobile();  // Kiểm tra ngay khi component được render
    window.addEventListener('resize', checkMobile);  // Kiểm tra lại khi thay đổi kích thước màn hình

    return () => {
      window.removeEventListener('resize', checkMobile);  // Dọn dẹp event listener khi component bị unmount
    };
  }, []);

  useEffect(() => {
    // Admin pages use an internal scrolling container, so window.scrollTo is not enough.
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-slate-950">
        <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

        <div
          className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'ml-64' : 'ml-20'
          }`}
        >
          <Header sidebarOpen={sidebarOpen} darkMode={darkMode} toggleDarkMode={() => setDarkMode((v) => !v)} />

          <main ref={mainRef} className="flex-1 overflow-y-auto p-6 pt-24 text-gray-900 dark:text-gray-100">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;


// import React, { useState } from 'react';
// import { Outlet } from 'react-router-dom';
// import Sidebar from '../components/layout/Sidebar';

// const AdminLayout = () => {
//   const [sidebarOpen, setSidebarOpen] = useState(true);

//   const toggleSidebar = () => {
//     setSidebarOpen(!sidebarOpen);
//   };

//   return (
//     <div className="flex h-screen overflow-hidden">
//       <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

//       <div
//         className={`flex-1 transition-all duration-300 ease-in-out ${
//           sidebarOpen ? 'ml-64' : 'ml-20'
//         } bg-gray-100 p-6 overflow-y-auto`}
//       >
//         <Outlet />
//       </div>
//     </div>
//   );
// };

// export default AdminLayout;
