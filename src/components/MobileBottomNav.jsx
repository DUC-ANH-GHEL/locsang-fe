import { Link, useLocation } from 'react-router-dom';
import { Home, Package, ShoppingCart } from 'lucide-react';

const MobileBottomNav = () => {
  const location = useLocation();

  const isHome = location.pathname === '/';
  const isProducts = location.pathname.startsWith('/products');
  const isCart = location.pathname.startsWith('/checkout');

  const itemClass = (active) =>
    `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 ${
      active ? 'text-[#e30613]' : 'text-[#888]'
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e8e8e8] bg-white md:hidden [padding-bottom:env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-[5.35rem] max-w-[944px] items-center justify-around px-4">
        <Link to="/" className={itemClass(isHome)}>
          <Home size={31} fill={isHome ? '#e30613' : 'none'} strokeWidth={2.5} />
          <span className="text-[1rem] font-medium leading-none max-[390px]:text-[0.84rem]">Trang chủ</span>
        </Link>

        <Link to="/products" className={itemClass(isProducts)}>
          <Package size={29} strokeWidth={2.2} />
          <span className="text-[1rem] font-medium leading-none max-[390px]:text-[0.84rem]">Sản phẩm</span>
        </Link>

        <Link to="/checkout" className={itemClass(isCart)}>
          <ShoppingCart size={31} strokeWidth={2.3} />
          <span className="text-[1rem] font-medium leading-none max-[390px]:text-[0.84rem]">Giỏ hàng</span>
        </Link>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
