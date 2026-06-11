import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Search, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

const MobileBottomNav = ({ onOpenSearch, searchOpen = false }) => {
  const location = useLocation();
  const { cart } = useCart();

  const isHome = location.pathname === '/';
  const isProducts = location.pathname.startsWith('/products');
  const isCart = location.pathname.startsWith('/checkout');
  const cartCount = cart.reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0);

  const itemClass = (active) =>
    `relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 ${
      active ? 'text-[#e30613]' : 'text-[#888]'
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e8e8e8] bg-white md:hidden [padding-bottom:env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-[5.35rem] max-w-[944px] items-center justify-around px-2">
        <Link to="/" className={itemClass(isHome)}>
          <Home size={29} fill={isHome ? '#e30613' : 'none'} strokeWidth={2.5} />
          <span className="text-[0.88rem] font-medium leading-none max-[390px]:text-[0.76rem]">Trang chủ</span>
        </Link>

        <button type="button" onClick={onOpenSearch} className={itemClass(searchOpen)}>
          <Search size={29} strokeWidth={2.5} />
          <span className="text-[0.88rem] font-medium leading-none max-[390px]:text-[0.76rem]">Tìm kiếm</span>
        </button>

        <Link to="/products" className={itemClass(isProducts)}>
          <LayoutGrid size={28} fill={isProducts ? '#e30613' : 'none'} strokeWidth={2.2} />
          <span className="text-[0.88rem] font-medium leading-none max-[390px]:text-[0.76rem]">Sản phẩm</span>
        </Link>

        <Link to="/checkout" className={itemClass(isCart)}>
          <ShoppingCart size={30} strokeWidth={2.3} className="cart-fly-target" />
          {cartCount > 0 && (
            <span className="absolute right-[18%] top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e30613] px-1 text-[11px] font-black leading-none text-white">
              {cartCount}
            </span>
          )}
          <span className="text-[0.88rem] font-medium leading-none max-[390px]:text-[0.76rem]">Giỏ hàng</span>
        </Link>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
