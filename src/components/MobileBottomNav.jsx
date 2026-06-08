import { Link, useLocation } from 'react-router-dom';
import { House, Store, Sparkles, Clapperboard, User } from 'lucide-react';

const MobileBottomNav = () => {
  const location = useLocation();

  const isHome = location.pathname === '/';
  const isShop = location.pathname.startsWith('/products');
  const isTips = location.pathname.startsWith('/tips');
  const isShorts = location.pathname.startsWith('/shorts');
  const isAccount = location.pathname.startsWith('/account');

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pt-2 md:hidden [padding-bottom:env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-t-[2.25rem] bg-white/85 px-2 py-3 text-[#635f54] shadow-[0_-6px_24px_rgba(53,50,41,0.08)] backdrop-blur-md">
        <Link to="/" className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-full px-2 py-1.5 ${isHome ? 'bg-[#ff9ea4] text-white' : 'hover:bg-[#f9f3e9]'}`}>
          <House size={16} />
          <span className="text-[10px] font-semibold">Trang chủ</span>
        </Link>

        <Link to="/products" className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-full px-2 py-1.5 ${isShop ? 'bg-[#ff9ea4] text-white' : 'hover:bg-[#f9f3e9]'}`}>
          <Store size={16} />
          <span className="text-[10px] font-semibold">Cửa hàng</span>
        </Link>

        <Link to="/tips" className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-full px-2 py-1.5 ${isTips ? 'bg-[#ff9ea4] text-white' : 'hover:bg-[#f9f3e9]'}`}>
          <Sparkles size={16} />
          <span className="text-[10px] font-semibold">Mẹo</span>
        </Link>

        <Link to="/shorts" className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-full px-2 py-1.5 ${isShorts ? 'bg-[#ff9ea4] text-white' : 'hover:bg-[#f9f3e9]'}`}>
          <Clapperboard size={16} />
          <span className="text-[10px] font-semibold">Shorts</span>
        </Link>

        <Link to="/account" className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-full px-2 py-1.5 ${isAccount ? 'bg-[#ff9ea4] text-white' : 'hover:bg-[#f9f3e9]'}`}>
          <User size={16} />
          <span className="text-[10px] font-semibold">Tài khoản</span>
        </Link>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
