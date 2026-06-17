import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import BrandLockup from './BrandLockup';

const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const CartDropdown = ({
  cart,
  total,
  removeFromCart,
  clearCart,
  updateCartItemQuantity,
  onCheckout,
}) => (
  <div className="absolute right-0 z-50 mt-2 w-80 animate-fadeIn rounded-2xl border border-black/10 bg-white py-2 shadow-2xl">
    <div className="border-b border-gray-100 px-4 py-2 text-lg font-bold text-[#d50918]">
      Giỏ hàng
    </div>
    {cart.length === 0 ? (
      <div className="px-4 py-6 text-center text-gray-500">
        Chưa có sản phẩm nào
      </div>
    ) : (
      <>
        <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
          {cart.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 px-4 py-2">
              <img src={item.image} alt={item.title} className="h-10 w-10 rounded border object-cover" />
              <div className="min-w-0 flex-1">
                <div className="break-words text-sm font-semibold leading-snug text-gray-900">
                  {item.title}
                </div>
                {item.variant_label && (
                  <div className="mt-0.5 break-words text-xs leading-snug text-gray-500">
                    Phân loại: <span className="font-medium text-gray-700">{item.variant_label}</span>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  SL: {item.quantity} x {formatVnd(item.price)}
                </div>
                <div className="mt-1 inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateCartItemQuantity(item.item_key, item.quantity - 1)}
                    className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-300 text-[10px] font-bold text-gray-700 hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="w-5 text-center text-[10px] font-semibold text-gray-700">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateCartItemQuantity(item.item_key, item.quantity + 1)}
                    className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-300 text-[10px] font-bold text-gray-700 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
              <button className="p-1 text-red-500 hover:text-red-700" onClick={() => removeFromCart(item.item_key)} title="Xóa">
                <Trash2 size={16} strokeWidth={2.4} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
          <span className="font-semibold text-gray-700">Tổng:</span>
          <span className="text-lg font-bold text-[#d50918]">{formatVnd(total)}</span>
        </div>
        <div className="flex gap-2 px-4 pb-2">
          <button
            className="flex-1 rounded-xl bg-[#e30613] py-2 font-bold text-white transition hover:bg-[#ba0610]"
            onClick={onCheckout}
          >
            Thanh toán
          </button>
          <button className="rounded-xl bg-gray-200 px-3 py-2 font-bold text-gray-700 transition hover:bg-gray-300" onClick={clearCart}>
            Xóa hết
          </button>
        </div>
      </>
    )}
  </div>
);

const Header = ({ onOpenSearch }) => {
  const { cart, removeFromCart, clearCart, updateCartItemQuantity } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const desktopCartRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleClickOutside(event) {
      const insideDesktopCart = desktopCartRef.current && desktopCartRef.current.contains(event.target);
      if (!insideDesktopCart) {
        setCartOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const total = cart.reduce((sum, p) => sum + Number(p.price || 0) * p.quantity, 0);
  const cartCount = cart.reduce((sum, p) => sum + p.quantity, 0);

  const isHomeActive = location.pathname === '/';
  const isProductsActive = location.pathname.startsWith('/products') || location.pathname.startsWith('/san-pham');
  const isProductDetailMobileHeader = /^\/products\/\d+/.test(location.pathname) || location.pathname.startsWith('/san-pham/');

  const handleCheckout = () => {
    setCartOpen(false);
    navigate('/checkout');
  };

  const handleHomeClick = (event) => {
    event?.preventDefault();
    setCartOpen(false);
    navigate('/');
  };

  const handleMobileBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/products');
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white">
      <div className="hidden border-b border-[#e5e5e5] bg-white md:block">
        <div className="mx-auto flex h-[4.75rem] max-w-[944px] items-center justify-between px-6">
          <Link to="/" onClick={handleHomeClick} className="flex min-w-0 items-center" aria-label="Về trang chủ Lộc Sang">
            <BrandLockup />
          </Link>

          <nav className="flex items-center gap-7 text-[14px] font-black text-[#2a2a2a]">
            <Link to="/" className={`transition hover:text-[#d90616] ${isHomeActive ? 'text-[#d90616]' : ''}`}>
              Trang chủ
            </Link>
            <Link to="/products" className={`transition hover:text-[#d90616] ${isProductsActive ? 'text-[#d90616]' : ''}`}>
              Sản phẩm
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onOpenSearch}
              className="inline-flex h-12 w-12 items-center justify-center text-[#d50918] transition hover:bg-[#fff0f1]"
              aria-label="Tìm kiếm sản phẩm"
            >
              <Search size={34} strokeWidth={2.5} />
            </button>

            <div className="relative" ref={desktopCartRef}>
              <button
                className="relative inline-flex h-12 w-12 items-center justify-center text-[#d50918] transition hover:bg-[#fff0f1]"
                onClick={() => setCartOpen((v) => !v)}
                aria-label="Giỏ hàng"
              >
                <ShoppingCart size={34} strokeWidth={2.6} className="cart-fly-target" />
                {cartCount > 0 && (
                  <span className="absolute right-0 top-0 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#e30613] px-1 text-[11px] font-bold leading-none text-white">
                    {cartCount}
                  </span>
                )}
              </button>
              {cartOpen && (
                <CartDropdown
                  cart={cart}
                  total={total}
                  removeFromCart={removeFromCart}
                  clearCart={clearCart}
                  updateCartItemQuantity={updateCartItemQuantity}
                  onCheckout={handleCheckout}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-[#ededed] bg-white px-5 md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto grid h-[5.05rem] max-w-[944px] grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-3">
          {isProductDetailMobileHeader ? (
            <button
              type="button"
              onClick={handleMobileBack}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-[#111] active:scale-[0.98]"
              aria-label="Quay lại"
            >
              <ChevronLeft size={39} strokeWidth={2.5} />
            </button>
          ) : (
            <span aria-hidden="true" />
          )}

          <Link to="/" onClick={handleHomeClick} className="col-start-2 flex min-w-0 justify-center" aria-label="Về trang chủ Lộc Sang">
            <BrandLockup compact />
          </Link>

          <span aria-hidden="true" />
        </div>
      </div>
    </header>
  );
};

export default Header;
