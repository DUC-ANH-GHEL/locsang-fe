import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaRegUserCircle, FaShoppingCart, FaTrash } from 'react-icons/fa';
import { ChevronLeft, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useStorefrontAuth } from '../contexts/StorefrontAuthContext';
import { homeContentService } from '../services/homeContentService';

import { logo_url } from '../config/api';
const BRAND_MARK = `${logo_url}?v=yanmar-3`;

const BrandLockup = ({ compact = false }) => (
  <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
    <img
      src={BRAND_MARK}
      alt="Yanmar"
      className={`${compact ? 'h-6 w-[2.65rem]' : 'h-8 w-[3.55rem]'} shrink-0 object-contain`}
    />
    <div className="flex flex-col items-start leading-[0.82] text-[#d50918]">
      <span className={`${compact ? 'text-[19px]' : 'text-[25px]'} font-black italic uppercase tracking-normal`}>
        YANMAR
      </span>
      <span className={`${compact ? 'text-[11px]' : 'text-[15px]'} font-black uppercase tracking-normal`}>
        LỘC SANG
      </span>
    </div>
  </div>
);

const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const DEFAULT_HEADER_CONTENT = {
  header_nav_shop_text: 'Cửa hàng',
  header_nav_new_arrivals_text: 'Sản phẩm',
  header_nav_tips_text: 'Cẩm nang',
  header_nav_shorts_text: 'Lộc Sang Shorts',
  header_nav_orders_text: 'Đơn hàng',
};

const resolveStorefrontAvatar = (user) => {
  if (!user || typeof user !== 'object') return '';

  const candidates = [
    user.avatar_url,
    user.avatar,
    user.profile_picture,
    user.picture,
    user.photo_url,
    user.image,
    user.image_url,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }

  return '';
};

const CartDropdown = ({
  cart,
  total,
  removeFromCart,
  clearCart,
  updateCartItemQuantity,
  onCheckout,
  compact = false,
}) => (
  <div className={`absolute right-0 z-50 mt-2 animate-fadeIn rounded-2xl border border-black/10 bg-white py-2 shadow-2xl ${compact ? 'w-[min(92vw,20rem)]' : 'w-80'}`}>
    <div className={`border-b border-gray-100 px-4 py-2 font-bold text-[#d50918] ${compact ? 'text-base' : 'text-lg'}`}>
      Giỏ hàng
    </div>
    {cart.length === 0 ? (
      <div className={`px-4 text-center text-gray-500 ${compact ? 'py-5 text-sm' : 'py-6'}`}>
        Chưa có sản phẩm nào
      </div>
    ) : (
      <>
        <ul className={`${compact ? 'max-h-56' : 'max-h-64'} divide-y divide-gray-100 overflow-y-auto`}>
          {cart.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 px-4 py-2">
              <img src={item.image} alt={item.title} className={`${compact ? 'h-9 w-9' : 'h-10 w-10'} rounded border object-cover`} />
              <div className="min-w-0 flex-1">
                <div className={`${compact ? 'text-xs' : 'text-sm'} break-words font-semibold leading-snug text-gray-900`}>
                  {item.title}
                </div>
                {item.variant_label && (
                  <div className={`${compact ? 'text-[11px]' : 'text-xs'} mt-0.5 break-words leading-snug text-gray-500`}>
                    Phân loại: <span className="font-medium text-gray-700">{item.variant_label}</span>
                  </div>
                )}
                <div className={`${compact ? 'text-[11px]' : 'text-xs'} text-gray-500`}>
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
                <FaTrash />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
          <span className={`${compact ? 'text-sm' : ''} font-semibold text-gray-700`}>Tổng:</span>
          <span className={`${compact ? '' : 'text-lg'} font-bold text-[#d50918]`}>{formatVnd(total)}</span>
        </div>
        <div className="flex gap-2 px-4 pb-2">
          <button
            className={`${compact ? 'text-sm' : ''} flex-1 rounded-xl bg-[#e30613] py-2 font-bold text-white transition hover:bg-[#ba0610]`}
            onClick={onCheckout}
          >
            Thanh toán
          </button>
          <button className={`${compact ? 'text-sm' : ''} rounded-xl bg-gray-200 px-3 py-2 font-bold text-gray-700 transition hover:bg-gray-300`} onClick={clearCart}>
            {compact ? 'Xóa' : 'Xóa hết'}
          </button>
        </div>
      </>
    )}
  </div>
);

const Header = () => {
  const { cart, removeFromCart, clearCart, updateCartItemQuantity } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const desktopCartRef = useRef(null);
  const mobileCartRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useStorefrontAuth();
  const [headerContent, setHeaderContent] = useState(DEFAULT_HEADER_CONTENT);
  const resolvedAvatarUrl = resolveStorefrontAvatar(user);
  const avatarUrl = avatarLoadFailed ? '' : resolvedAvatarUrl;

  useEffect(() => {
    let cancelled = false;

    const loadHeaderContent = async () => {
      try {
        const res = await homeContentService.getPublicHomeContent();
        const content = res?.content || {};
        if (cancelled) return;
        setHeaderContent({
          header_nav_shop_text: String(content.header_nav_shop_text || DEFAULT_HEADER_CONTENT.header_nav_shop_text),
          header_nav_new_arrivals_text: String(content.header_nav_new_arrivals_text || DEFAULT_HEADER_CONTENT.header_nav_new_arrivals_text),
          header_nav_tips_text: String(content.header_nav_tips_text || DEFAULT_HEADER_CONTENT.header_nav_tips_text),
          header_nav_shorts_text: String(content.header_nav_shorts_text || DEFAULT_HEADER_CONTENT.header_nav_shorts_text),
          header_nav_orders_text: String(content.header_nav_orders_text || DEFAULT_HEADER_CONTENT.header_nav_orders_text),
        });
      } catch {
        if (!cancelled) setHeaderContent(DEFAULT_HEADER_CONTENT);
      }
    };

    loadHeaderContent();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      const insideDesktopCart = desktopCartRef.current && desktopCartRef.current.contains(event.target);
      const insideMobileCart = mobileCartRef.current && mobileCartRef.current.contains(event.target);
      if (!insideDesktopCart && !insideMobileCart) {
        setCartOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [resolvedAvatarUrl]);

  const total = cart.reduce((sum, p) => sum + Number(p.price || 0) * p.quantity, 0);
  const cartCount = cart.reduce((sum, p) => sum + p.quantity, 0);

  const isShopActive = location.pathname === '/';
  const isNewArrivalsActive = location.pathname.startsWith('/products');
  const isTipsActive = location.pathname.startsWith('/tips');
  const isShortsActive = location.pathname.startsWith('/shorts');
  const isOrdersActive = location.pathname.startsWith('/account/orders');
  const isProductDetailMobileHeader = /^\/products\/\d+/.test(location.pathname);

  const handleCheckout = () => {
    setCartOpen(false);
    navigate('/checkout');
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white">
      <div className="hidden border-b border-[#e5e5e5] bg-white md:block">
        <div className="mx-auto flex h-[4.75rem] max-w-[944px] items-center justify-between px-6">
          <Link to="/" className="flex min-w-0 items-center">
            <BrandLockup />
          </Link>

          <nav className="flex items-center gap-7 text-[13px] font-bold text-[#444]">
            <Link to="/" className={`${isShopActive ? 'text-[#d90616]' : 'hover:text-[#d90616]'}`}>{headerContent.header_nav_shop_text}</Link>
            <Link to="/products" className={`${isNewArrivalsActive ? 'text-[#d90616]' : 'hover:text-[#d90616]'}`}>{headerContent.header_nav_new_arrivals_text}</Link>
            <Link to="/tips" className={`${isTipsActive ? 'text-[#d90616]' : 'hover:text-[#d90616]'}`}>{headerContent.header_nav_tips_text}</Link>
            <Link to="/shorts" className={`${isShortsActive ? 'text-[#d90616]' : 'hover:text-[#d90616]'}`}>{headerContent.header_nav_shorts_text}</Link>
            <Link to="/account/orders" className={`${isOrdersActive ? 'text-[#d90616]' : 'hover:text-[#d90616]'}`}>{headerContent.header_nav_orders_text}</Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="inline-flex h-12 w-12 items-center justify-center text-[#d50918] transition hover:bg-[#fff0f1]"
              aria-label="Tìm kiếm"
            >
              <Search size={34} strokeWidth={2.5} />
            </button>

            <div className="relative" ref={desktopCartRef}>
              <button
                className="relative inline-flex h-12 w-12 items-center justify-center text-[#d50918] transition hover:bg-[#fff0f1]"
                onClick={() => setCartOpen((v) => !v)}
                aria-label="Giỏ hàng"
              >
                <FaShoppingCart size={32} className="cart-fly-target" />
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

            <Link to={isAuthenticated ? '/account' : '/account/login'} className="inline-flex h-12 w-12 items-center justify-center text-[#d50918] transition hover:bg-[#fff0f1]" aria-label="Tài khoản">
              {isAuthenticated && avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={String(user?.full_name || 'Tài khoản')}
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-[#e9dfd4]"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <FaRegUserCircle size={27} />
              )}
            </Link>
          </div>
        </div>
      </div>

      <div
        className={`border-b border-[#ededed] bg-white md:hidden ${
          isProductDetailMobileHeader ? 'px-5' : 'px-[3.95rem] max-[390px]:px-[3.35rem]'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="mx-auto flex h-[5.05rem] max-w-[944px] items-center justify-between gap-5 max-[390px]:gap-4">
          {isProductDetailMobileHeader ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-[#111] active:scale-[0.98]"
              aria-label="Quay lại"
            >
              <ChevronLeft size={39} strokeWidth={2.5} />
            </button>
          ) : (
            <Link to="/" className="min-w-0 flex items-center">
              <BrandLockup compact />
            </Link>
          )}

          {isProductDetailMobileHeader && (
              <Link to="/" className="min-w-0 flex flex-1 justify-center">
              <BrandLockup compact />
            </Link>
          )}

          <div className="flex shrink-0 items-center gap-4 max-[390px]:gap-3">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="inline-flex h-10 w-10 items-center justify-center text-[#d50918] active:scale-[0.98]"
              aria-label="Tìm kiếm"
            >
              <Search size={33} strokeWidth={2.5} />
            </button>

            <div className="relative" ref={mobileCartRef}>
              <button
                className="relative inline-flex h-10 w-10 items-center justify-center text-[#d50918] active:scale-[0.98]"
                onClick={() => setCartOpen((v) => !v)}
                aria-label="Giỏ hàng"
              >
                <FaShoppingCart size={32} className="cart-fly-target" />
                {cartCount > 0 && (
                  <span className="absolute right-0 top-0 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e30613] px-1 text-[10px] font-bold leading-none text-white">
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
                  compact
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
