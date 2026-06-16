import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, X } from 'lucide-react';

import { useCart } from '../../contexts/CartContext';
import { checkoutService } from '../../services/checkoutService';
import { productService } from '../../services/productService';
import { useStorefrontAuth } from '../../contexts/StorefrontAuthContext';
import { useSEO } from '../../hooks/useSEO';
import { canPurchaseProduct, canPurchaseVariant, formatVnd } from '../../data/yanmarStorefront';
import BrandLockup from '../../components/BrandLockup';

const VN_PHONE_REGEX = /^(?:\+?84|0)\d{9,10}$/;
const CHECKOUT_FORM_STORAGE_KEY = 'locsang_storefront_checkout_form_v1';
const ORDER_HISTORY_STORAGE_KEY = 'locsang_storefront_order_history_v1';

const DEFAULT_FORM = {
  name: '',
  phone: '',
  address: '',
  note: '',
};

const loadSavedForm = () => {
  try {
    const raw = localStorage.getItem(CHECKOUT_FORM_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_FORM;
    return {
      ...DEFAULT_FORM,
      name: String(parsed.name || ''),
      phone: String(parsed.phone || ''),
      address: String(parsed.address || parsed.addressDetail || ''),
      note: String(parsed.note || ''),
    };
  } catch {
    return DEFAULT_FORM;
  }
};

const appendOrderToLocalHistory = (orderData, form) => {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const history = Array.isArray(list) ? list : [];
    const orderCode = orderData?.trackingCode || orderData?.tracking_code || orderData?.id;
    const entry = {
      id: orderData?.id,
      trackingCode: orderCode,
      totalAmount: Number(orderData?.totalAmount ?? orderData?.total_amount ?? 0),
      receiverName: orderData?.receiverName || orderData?.receiver_name || form.name,
      receiverPhone: orderData?.receiverPhone || orderData?.receiver_phone || form.phone,
      receiverAddress: orderData?.receiverAddress || orderData?.receiver_address || form.address,
      status: orderData?.status || 'pending',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify([entry, ...history].slice(0, 20)));
  } catch {
    // ignore local history errors
  }
};

const validate = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Vui lòng nhập họ và tên';
  if (!form.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại';
  else if (!VN_PHONE_REGEX.test(form.phone.trim())) errors.phone = 'Số điện thoại không hợp lệ';
  if (!form.address.trim()) errors.address = 'Vui lòng nhập địa chỉ nhận hàng';
  return errors;
};

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useStorefrontAuth();
  const { cart, clearCart, removeFromCart, updateCartItemQuantity } = useCart();
  const [form, setForm] = useState(loadSavedForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [cartNotice, setCartNotice] = useState('');
  const [checkingCart, setCheckingCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const fieldRefs = useRef({});
  const cartCheckRef = useRef(0);

  useSEO({
    title: 'Thanh toán',
    description: 'Thông tin đặt hàng Lộc Sang.',
    canonicalPath: '/checkout',
    noindex: true,
  });

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || String(user.full_name || ''),
    }));
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(CHECKOUT_FORM_STORAGE_KEY, JSON.stringify(form));
    } catch {
      // ignore storage errors
    }
  }, [form]);

  const cartCount = cart.reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)), 0);
  const total = subtotal;

  const invalidCartItems = useMemo(
    () => cart.filter((item) => !Number.isFinite(Number(item.product_id)) || Number(item.product_id) <= 0),
    [cart],
  );
  const cartAvailabilityKey = useMemo(
    () => cart.map((item) => `${item.item_key}:${item.product_id}:${item.product_variant_id}`).join('|'),
    [cart],
  );

  const validateCartAvailability = async ({ silent = false } = {}) => {
    const checkId = cartCheckRef.current + 1;
    cartCheckRef.current = checkId;
    if (cart.length === 0) return { removed: 0, valid: true };

    if (!silent) setCheckingCart(true);
    const removedKeys = new Set();

    try {
      const uniqueProductIds = Array.from(
        new Set(
          cart
            .map((item) => Number(item.product_id))
            .filter((productId) => Number.isFinite(productId) && productId > 0),
        ),
      );
      const productEntries = await Promise.all(
        uniqueProductIds.map(async (productId) => [
          productId,
          await productService.getStorefrontProductByIdFresh(productId),
        ]),
      );
      const productById = new Map(productEntries);

      cart.forEach((item) => {
        const productId = Number(item.product_id);
        if (!Number.isFinite(productId) || productId <= 0) {
          removedKeys.add(item.item_key);
          return;
        }

        const product = productById.get(productId);
        if (!product || !canPurchaseProduct(product)) {
          removedKeys.add(item.item_key);
          return;
        }

        const variantId = Number(item.product_variant_id);
        if (Number.isFinite(variantId) && variantId > 0) {
          const variant = Array.isArray(product.variants)
            ? product.variants.find((candidate) => Number(candidate?.id) === variantId)
            : null;
          if (!variant || !canPurchaseVariant(variant)) {
            removedKeys.add(item.item_key);
          }
        }
      });

      if (cartCheckRef.current !== checkId) return { removed: 0, valid: false };

      removedKeys.forEach((itemKey) => removeFromCart(itemKey));
      if (removedKeys.size > 0) {
        const message = 'Một số sản phẩm trong giỏ đã ngừng bán hoặc hết hàng nên đã được tự động xóa khỏi giỏ.';
        setCartNotice(message);
        setSubmitError(message);
      } else if (!silent) {
        setCartNotice('');
      }
      return { removed: removedKeys.size, valid: removedKeys.size === 0 };
    } catch {
      if (!silent) {
        setCartNotice('Chưa kiểm tra được tình trạng sản phẩm. Vui lòng thử đặt hàng lại sau vài giây.');
      }
      return { removed: 0, valid: true };
    } finally {
      if (cartCheckRef.current === checkId) setCheckingCart(false);
    }
  };

  useEffect(() => {
    validateCartAvailability({ silent: true });
  }, [cartAvailabilityKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const focusFirstError = (nextErrors) => {
    const firstField = ['name', 'phone', 'address', 'note'].find((field) => nextErrors[field]);
    const target = firstField ? fieldRefs.current[firstField] : null;
    if (!target) return;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.focus({ preventScroll: true });
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const availability = await validateCartAvailability();
    if (!availability.valid) return;

    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    if (cart.length === 0) {
      setSubmitError('Giỏ hàng đang trống.');
      return;
    }
    if (invalidCartItems.length > 0) {
      setSubmitError('Giỏ hàng có sản phẩm chưa đồng bộ với hệ thống. Vui lòng xóa sản phẩm đó và thêm lại từ danh sách sản phẩm.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        receiver_name: form.name.trim(),
        receiver_phone: form.phone.trim(),
        receiver_address: form.address.trim(),
        note: form.note.trim() || undefined,
        payment_method: 'cod',
        items: cart.map((item) => ({
          product_id: Number(item.product_id),
          product_variant_id:
            Number.isFinite(Number(item.product_variant_id)) && Number(item.product_variant_id) > 0
              ? Number(item.product_variant_id)
              : null,
          quantity: Math.max(1, Number(item.quantity || 1)),
        })),
      };

      const result = await checkoutService.createPublicOrder(payload);
      const orderData = result?.data || result || {};
      setOrderResult(orderData);
      appendOrderToLocalHistory(orderData, form);
      clearCart();
    } catch (error) {
      const rawMessage = String(
        error?.response?.data?.message ||
          error?.response?.data?.detail ||
          error?.message ||
          '',
      );
      if (/product\s+\d+\s+is\s+not\s+available/i.test(rawMessage)) {
        await validateCartAvailability();
        setSubmitError('Sản phẩm trong giỏ đã ngừng bán hoặc hết hàng. Hệ thống đã cập nhật lại giỏ hàng, vui lòng kiểm tra lại.');
        return;
      }
      setSubmitError(rawMessage || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (orderResult) {
    const orderCode = orderResult.trackingCode || orderResult.tracking_code || orderResult.id || 'Đã ghi nhận';
    const orderTotal = Number(orderResult.totalAmount ?? orderResult.total_amount ?? total);
    return (
      <div className="min-h-screen bg-white pb-[calc(env(safe-area-inset-bottom,0px)+6rem)] font-sans text-[#111]">
        <CheckoutHeader cartCount={0} onBack={() => navigate('/products')} />
        <main className="mx-auto max-w-[944px] px-4 py-8">
          <div className="rounded-2xl border border-[#e4e4e4] bg-white p-6 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e30613] text-2xl font-black text-white">✓</div>
            <h1 className="mt-4 font-sans text-2xl font-black text-[#111]">Đặt hàng thành công</h1>
            <p className="mt-2 text-[#666]">Lộc Sang đã ghi nhận đơn hàng của bạn.</p>
            <div className="mt-5 rounded-xl bg-[#fafafa] p-4 text-left">
              <div className="flex justify-between gap-4 py-1">
                <span className="text-[#666]">Mã đơn</span>
                <span className="font-black">{orderCode}</span>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <span className="text-[#666]">Tổng tiền</span>
                <span className="font-black text-[#e30613]">{formatVnd(orderTotal)}</span>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/products')} className="mt-6 h-12 w-full rounded-lg bg-[#e30613] text-lg font-black text-white">
              Tiếp tục mua hàng
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-white pb-[calc(env(safe-area-inset-bottom,0px)+6rem)] font-sans text-[#111]">
        <CheckoutHeader cartCount={0} onBack={() => navigate(-1)} />
        <main className="mx-auto flex min-h-[55vh] max-w-[944px] items-center justify-center px-4">
          <div className="w-full rounded-2xl border border-[#e4e4e4] bg-white p-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <ShoppingCart size={46} className="mx-auto text-[#e30613]" />
            <h1 className="mt-4 font-sans text-2xl font-black">Giỏ hàng trống</h1>
            <p className="mt-2 text-[#666]">Bạn chưa có sản phẩm nào để đặt hàng.</p>
            <button type="button" onClick={() => navigate('/products')} className="mt-6 h-12 w-full rounded-lg bg-[#e30613] text-lg font-black text-white">
              Xem sản phẩm
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-[calc(env(safe-area-inset-bottom,0px)+8.5rem)] font-sans text-[#111] md:bg-[#f5f5f5]">
      <CheckoutHeader cartCount={cartCount} onBack={() => navigate(-1)} />

      <main className="mx-auto w-full max-w-[944px] bg-white px-3.5 pb-8 pt-4 sm:px-6 md:shadow-2xl md:shadow-black/10">
        <CheckoutSteps />

        <section className="mt-5 overflow-hidden rounded-xl border border-[#e2e2e2] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
          <h1 className="px-4 pt-4 font-sans text-[1.15rem] font-black uppercase text-[#111]">
            Đơn hàng ({cartCount} sản phẩm)
          </h1>
          <div className="mt-2 divide-y divide-[#eeeeee]">
            {cart.map((item) => (
              <CartLine
                key={item.item_key}
                item={item}
                onRemove={() => removeFromCart(item.item_key)}
                onQuantity={(quantity) => updateCartItemQuantity(item.item_key, quantity)}
              />
            ))}
          </div>
          <SummaryRow label="Tạm tính" value={formatVnd(subtotal)} />
          <SummaryRow label="Tổng cộng" value={formatVnd(total)} strong />
        </section>

        {(checkingCart || cartNotice) && (
          <div
            className={`mt-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
              checkingCart
                ? 'border-[#dbe7ff] bg-[#f4f8ff] text-[#31527a]'
                : 'border-[#ffd6da] bg-[#fff1f2] text-[#c60010]'
            }`}
          >
            {checkingCart ? 'Đang kiểm tra lại giỏ hàng...' : cartNotice}
          </div>
        )}

        <form id="checkout-form" onSubmit={handleSubmit} className="mt-4">
          <section className="rounded-xl border border-[#e2e2e2] bg-white px-4 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <h2 className="font-sans text-[1.15rem] font-black uppercase text-[#111]">Thông tin khách hàng</h2>

            <Field
              label="Họ và tên"
              name="name"
              inputRef={(node) => {
                fieldRefs.current.name = node;
              }}
              value={form.name}
              placeholder="Nhập họ và tên"
              error={errors.name}
              onChange={handleChange}
            />
            <Field
              label="Số điện thoại"
              name="phone"
              inputRef={(node) => {
                fieldRefs.current.phone = node;
              }}
              value={form.phone}
              placeholder="Nhập số điện thoại"
              error={errors.phone}
              onChange={handleChange}
              inputMode="tel"
            />
            <Field
              label="Địa chỉ nhận hàng"
              name="address"
              inputRef={(node) => {
                fieldRefs.current.address = node;
              }}
              value={form.address}
              placeholder="Nhập địa chỉ nhận hàng"
              error={errors.address}
              onChange={handleChange}
              textarea
            />
            <Field
              label="Ghi chú"
              optional="tùy chọn"
              name="note"
              inputRef={(node) => {
                fieldRefs.current.note = node;
              }}
              value={form.note}
              placeholder="Nhập ghi chú nếu có"
              onChange={handleChange}
              textarea
            />
          </section>

          {submitError && (
            <div className="mt-3 rounded-xl border border-[#ffd6da] bg-[#fff1f2] px-4 py-3 text-sm font-semibold text-[#c60010]">
              {submitError}
            </div>
          )}
        </form>

        <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-[#eeeeee] bg-white/95 px-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 shadow-[0_-10px_28px_rgba(0,0,0,0.12)] backdrop-blur md:sticky md:bottom-4 md:mt-5 md:rounded-2xl md:border md:px-4 md:pb-4 md:shadow-[0_14px_34px_rgba(0,0,0,0.12)]">
          <div className="mx-auto flex max-w-[944px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase text-[#7a8799]">Tổng thanh toán</p>
              <p className="truncate text-xl font-black text-[#e30613]">{formatVnd(total)}</p>
            </div>
            <button
              type="submit"
              form="checkout-form"
              disabled={submitting || checkingCart}
              className="h-14 min-w-[12.5rem] rounded-xl bg-[#e30613] px-5 text-lg font-black text-white shadow-[0_10px_22px_rgba(227,6,19,0.24)] active:translate-y-px disabled:bg-[#bbbbbb] max-[390px]:min-w-[10.5rem] max-[390px]:text-base"
            >
              {submitting ? 'Đang đặt...' : checkingCart ? 'Đang kiểm tra...' : 'Đặt hàng ngay'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

const CheckoutHeader = ({ cartCount, onBack }) => (
  <header className="sticky top-0 z-50 border-b border-[#e7e7e7] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
    <div className="mx-auto flex h-[5.45rem] max-w-[944px] items-center justify-between px-4">
      <button type="button" onClick={onBack} className="inline-flex h-12 w-12 items-center justify-center text-[#e30613]" aria-label="Quay lại">
        <ChevronLeft size={42} strokeWidth={2.5} />
      </button>
      <BrandLockup compact className="scale-[1.08] max-[390px]:scale-100" />
      <button type="button" className="relative inline-flex h-12 w-12 items-center justify-center text-[#e30613]" aria-label="Giỏ hàng">
        <ShoppingCart size={37} strokeWidth={2.4} />
        {cartCount > 0 && (
          <span className="absolute right-0 top-0 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#e30613] px-1 text-xs font-black text-white">
            {cartCount}
          </span>
        )}
      </button>
    </div>
  </header>
);

const CheckoutSteps = () => (
  <div className="px-2">
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-2 text-center">
      <StepCircle number="1" label="Giỏ hàng" />
      <div className="mt-6 h-px bg-[#bcbcbc]" />
      <StepCircle number="2" label="Thông tin" active />
      <div className="mt-6 h-px bg-[#e30613]" />
      <StepCircle number="3" label="Xác nhận" />
    </div>
  </div>
);

const StepCircle = ({ number, label, active = false }) => (
  <div className={active ? 'text-[#e30613]' : 'text-[#555]'}>
    <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full border text-xl font-black ${
      active ? 'border-[#e30613] bg-[#e30613] text-white' : 'border-[#d5d5d5] bg-[#f0f0f0] text-[#333]'
    }`}>
      {number}
    </div>
    <div className="mt-2 text-[1rem] font-medium max-[390px]:text-sm">{label}</div>
  </div>
);

const CartLine = ({ item, onRemove, onQuantity }) => {
  const quantity = Math.max(1, Number(item.quantity || 1));
  const price = Number(item.price || 0);

  return (
    <div className="grid grid-cols-[4.7rem_1fr] gap-3 px-4 py-4">
      <img src={item.image} alt={item.title} className="h-[4.7rem] w-[4.7rem] rounded-lg object-contain" />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-2 font-sans text-[1.02rem] font-black leading-tight text-[#111]">{item.title}</h3>
            {item.variant_label && <p className="mt-1 text-sm text-[#666]">Phân loại: {item.variant_label}</p>}
            <p className="mt-1 text-sm text-[#666]">Đơn giá: {formatVnd(price)}</p>
          </div>
          <button type="button" onClick={onRemove} className="shrink-0 p-1 text-[#555]" aria-label="Xóa sản phẩm">
            <X size={23} />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="grid h-9 w-[8.7rem] grid-cols-3 overflow-hidden rounded-md border border-[#cfcfcf]">
            <button type="button" onClick={() => onQuantity(quantity - 1)} className="text-xl">-</button>
            <div className="flex items-center justify-center border-x border-[#eeeeee] text-base font-black">{quantity}</div>
            <button type="button" onClick={() => onQuantity(quantity + 1)} className="text-xl">+</button>
          </div>
          <div className="text-[1.08rem] font-black text-[#e30613]">{formatVnd(price * quantity)}</div>
        </div>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value, strong = false }) => (
  <div className={`flex items-center justify-between border-t border-[#eeeeee] px-4 py-3 ${strong ? 'text-[#e30613]' : 'text-[#111]'}`}>
    <span className={strong ? 'text-[1.2rem] font-black' : 'text-base font-medium'}>{label}</span>
    <span className={strong ? 'text-[1.25rem] font-black' : 'text-base font-black'}>{value}</span>
  </div>
);

const Field = ({ label, optional, error, textarea = false, inputRef, ...props }) => (
  <label className="mt-4 block">
    <span className="text-base font-bold text-[#111]">
      {label} {optional && <span className="font-medium text-[#777]">({optional})</span>}
    </span>
    {textarea ? (
      <textarea
        {...props}
        ref={inputRef}
        rows={props.name === 'address' ? 2 : 3}
        className={`mt-2 w-full resize-none rounded-md border px-4 py-3 text-base outline-none placeholder:text-[#888] focus:border-[#e30613] ${
          error ? 'border-[#e30613]' : 'border-[#cfcfcf]'
        }`}
      />
    ) : (
      <input
        {...props}
        ref={inputRef}
        className={`mt-2 h-12 w-full rounded-md border px-4 text-base outline-none placeholder:text-[#888] focus:border-[#e30613] ${
          error ? 'border-[#e30613]' : 'border-[#cfcfcf]'
        }`}
      />
    )}
    {error && <span className="mt-1 block text-sm font-semibold text-[#e30613]">{error}</span>}
  </label>
);

export default Checkout;
