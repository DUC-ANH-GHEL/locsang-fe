import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FaShoppingCart, FaTrash, FaRegUserCircle } from 'react-icons/fa';
import { useState, useRef, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useStorefrontAuth } from '../contexts/StorefrontAuthContext';
import { logo_url } from '../config/api';
import { homeContentService } from '../services/homeContentService';

const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const DEFAULT_HEADER_CONTENT = {
  header_brand_name: 'Lộc Sang',
  header_brand_tagline: 'Mua sắm chọn lọc, giao nhanh toàn quốc',
  header_nav_shop_text: 'Cửa hàng',
  header_nav_new_arrivals_text: 'Hàng mới về',
  header_nav_tips_text: 'Mẹo chăm sóc',
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
          header_brand_name: String(content.header_brand_name || DEFAULT_HEADER_CONTENT.header_brand_name),
          header_brand_tagline: String(content.header_brand_tagline || DEFAULT_HEADER_CONTENT.header_brand_tagline),
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

  // Đóng dropdown khi click ra ngoài
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

  const total = cart.reduce((sum, p) => {
    const priceNum = Number(p.price || 0);
    return sum + priceNum * p.quantity;
  }, 0);

  const cartCount = cart.reduce((sum, p) => sum + p.quantity, 0);

  const isShopActive = location.pathname === '/';
  const isNewArrivalsActive = location.pathname.startsWith('/products');
  const isTipsActive = location.pathname.startsWith('/tips');
  const isShortsActive = location.pathname.startsWith('/shorts');
  const isOrdersActive = location.pathname.startsWith('/account/orders');

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="hidden md:block px-4 pt-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-[#f1e6da] bg-white/85 px-6 py-[0.7rem] shadow-xl shadow-orange-900/5 backdrop-blur-xl">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo_url} alt="Lộc Sang" className="h-10 w-10 rounded-full object-cover ring-1 ring-[#e9dfd4]" />
            <div className="leading-tight">
              <div className="text-xl font-extrabold tracking-tight text-[#8a4f41]">{headerContent.header_brand_name}</div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-[#8a4f41]/60">{headerContent.header_brand_tagline}</div>
            </div>
          </Link>

          <nav className="flex items-center gap-8 text-[12.5px] font-medium text-[#7a756a]">
            <Link to="/" className={`pb-0.5 ${isShopActive ? 'border-b-2 border-[#f4e1d7] text-[#8a4f41] font-semibold' : 'hover:text-[#8a4f41]'}`}>{headerContent.header_nav_shop_text}</Link>
            <Link to="/products" className={`pb-0.5 ${isNewArrivalsActive ? 'border-b-2 border-[#f4e1d7] text-[#8a4f41] font-semibold' : 'hover:text-[#8a4f41]'}`}>{headerContent.header_nav_new_arrivals_text}</Link>
            <Link to="/tips" className={`${isTipsActive ? 'text-[#8a4f41] font-semibold' : 'hover:text-[#8a4f41]'}`}>{headerContent.header_nav_tips_text}</Link>
            <Link to="/shorts" className={`${isShortsActive ? 'text-[#8a4f41] font-semibold' : 'hover:text-[#8a4f41]'}`}>{headerContent.header_nav_shorts_text}</Link>
            <Link to="/account/orders" className={`${isOrdersActive ? 'text-[#8a4f41] font-semibold' : 'hover:text-[#8a4f41]'}`}>{headerContent.header_nav_orders_text}</Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="relative" ref={desktopCartRef}>
              <button
                className="relative rounded-full p-2.5 text-[#8a4f41] transition hover:bg-[#f9f3e9]"
                onClick={() => setCartOpen((v) => !v)}
                aria-label="Giỏ hàng"
              >
                <FaShoppingCart size={18} className="cart-fly-target" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-[#e25544] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </button>
              {cartOpen && (
                <div className="absolute right-0 mt-2 w-80 animate-fadeIn rounded-2xl border border-black/10 bg-white py-2 shadow-2xl z-50">
                  <div className="border-b border-gray-100 px-4 py-2 text-lg font-bold text-[#b93a2e]">Giỏ hàng</div>
                  {cart.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500">Chưa có sản phẩm nào</div>
                  ) : (
                    <>
                      <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
                        {cart.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 px-4 py-2">
                            <img src={item.image} alt={item.title} className="h-10 w-10 rounded object-cover border" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-900 break-words leading-snug">{item.title}</div>
                              {item.variant_label && (
                                <div className="mt-0.5 text-xs text-gray-500 break-words leading-snug">
                                  Phân loại: <span className="font-medium text-gray-700">{item.variant_label}</span>
                                </div>
                              )}
                              <div className="text-xs text-gray-500">SL: {item.quantity} x {formatVnd(item.price)}</div>
                              <div className="mt-1 inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateCartItemQuantity(item.item_key, item.quantity - 1)}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-300 text-[11px] font-bold text-gray-700 hover:bg-gray-100"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center text-[11px] font-semibold text-gray-700">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateCartItemQuantity(item.item_key, item.quantity + 1)}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-300 text-[11px] font-bold text-gray-700 hover:bg-gray-100"
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
                        <span className="font-semibold text-gray-700">Tổng:</span>
                        <span className="text-lg font-bold text-[#b93a2e]">{formatVnd(total)}</span>
                      </div>
                      <div className="flex gap-2 px-4 pb-2">
                        <button
                          className="flex-1 rounded-xl bg-[#e25544] py-2 font-bold text-white transition hover:bg-[#b93a2e]"
                          onClick={() => {
                            setCartOpen(false);
                            navigate('/checkout');
                          }}
                        >
                          Thanh toán
                        </button>
                        <button className="rounded-xl bg-gray-200 px-3 py-2 font-bold text-gray-700 transition hover:bg-gray-300" onClick={clearCart}>Xóa hết</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <Link to={isAuthenticated ? '/account' : '/account/login'} className="rounded-full p-2.5 text-[#8a4f41] transition hover:bg-[#f9f3e9]" aria-label="Tài khoản">
              {isAuthenticated && avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={String(user?.full_name || 'Tài khoản')}
                  className="h-[18px] w-[18px] rounded-full object-cover ring-1 ring-[#e9dfd4]"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <FaRegUserCircle size={18} />
              )}
            </Link>
          </div>
        </div>
      </div>

      <div
        className="md:hidden border-b border-[#ece2d6] bg-[#fff9f0] px-4 pb-2 shadow-[0_8px_20px_rgba(58,44,34,0.06)]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.55rem)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link to="/" className="min-w-0 flex items-center gap-2.5">
            <img src={logo_url} alt="Lộc Sang" className="h-9 w-9 rounded-full object-cover ring-1 ring-[#e9dfd4]" />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[1.32rem] font-extrabold tracking-[-0.01em] text-[#8a4f41]">{headerContent.header_brand_name}</div>
              <div className="hidden truncate text-[8px] uppercase tracking-[0.14em] text-[#8a4f41]/60 min-[390px]:block">{headerContent.header_brand_tagline}</div>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            <div className="relative" ref={mobileCartRef}>
              <button
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[#8a4f41] transition hover:bg-[#f5ece1] active:scale-[0.98]"
                onClick={() => setCartOpen((v) => !v)}
                aria-label="Giỏ hàng"
              >
                <FaShoppingCart size={15} className="cart-fly-target" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#e25544] px-1 text-[9px] font-bold leading-none text-white">
                    {cartCount}
                  </span>
                )}
              </button>
              {cartOpen && (
                <div className="absolute right-0 mt-2 w-[min(92vw,20rem)] animate-fadeIn rounded-2xl border border-black/10 bg-white py-2 shadow-2xl z-50">
                  <div className="border-b border-gray-100 px-4 py-2 text-base font-bold text-[#b93a2e]">Giỏ hàng</div>
                  {cart.length === 0 ? (
                    <div className="px-4 py-5 text-center text-sm text-gray-500">Chưa có sản phẩm nào</div>
                  ) : (
                    <>
                      <ul className="max-h-56 divide-y divide-gray-100 overflow-y-auto">
                        {cart.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 px-4 py-2">
                            <img src={item.image} alt={item.title} className="h-9 w-9 rounded object-cover border" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-gray-900 break-words leading-snug">{item.title}</div>
                              {item.variant_label && (
                                <div className="mt-0.5 text-[11px] text-gray-500 break-words leading-snug">
                                  Phân loại: <span className="font-medium text-gray-700">{item.variant_label}</span>
                                </div>
                              )}
                              <div className="text-[11px] text-gray-500">SL: {item.quantity} x {formatVnd(item.price)}</div>
                              <div className="mt-1 inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateCartItemQuantity(item.item_key, item.quantity - 1)}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-300 text-[10px] font-bold text-gray-700"
                                >
                                  -
                                </button>
                                <span className="w-5 text-center text-[10px] font-semibold text-gray-700">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateCartItemQuantity(item.item_key, item.quantity + 1)}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-300 text-[10px] font-bold text-gray-700"
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
                        <span className="text-sm font-semibold text-gray-700">Tổng:</span>
                        <span className="font-bold text-[#b93a2e]">{formatVnd(total)}</span>
                      </div>
                      <div className="flex gap-2 px-4 pb-2">
                        <button
                          className="flex-1 rounded-xl bg-[#e25544] py-2 text-sm font-bold text-white transition hover:bg-[#b93a2e]"
                          onClick={() => {
                            setCartOpen(false);
                            navigate('/checkout');
                          }}
                        >
                          Thanh toán
                        </button>
                        <button className="rounded-xl bg-gray-200 px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-300" onClick={clearCart}>Xóa</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <Link
              to={isAuthenticated ? '/account' : '/account/login'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#8a4f41] transition hover:bg-[#f5ece1] active:scale-[0.98]"
              aria-label="Tài khoản"
            >
              {isAuthenticated && avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={String(user?.full_name || 'Tài khoản')}
                  className="h-[15px] w-[15px] rounded-full object-cover ring-1 ring-[#e9dfd4]"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <FaRegUserCircle size={15} />
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
