import { useCart } from '../../contexts/CartContext';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaPhone, FaMapMarkerAlt, FaStickyNote, FaShieldAlt, FaTruck, FaUniversity, FaWallet, FaMoneyBillWave, FaArrowLeft, FaShoppingBasket } from 'react-icons/fa';
import { checkoutService } from '../../services/checkoutService';
import { useStorefrontAuth } from '../../contexts/StorefrontAuthContext';
import { useSEO } from '../../hooks/useSEO';

const VN_PHONE_REGEX = /^(?:\+?84|0)\d{9,10}$/;

const CHECKOUT_FORM_STORAGE_KEY = 'locsang_storefront_checkout_form_v1';
const ORDER_HISTORY_STORAGE_KEY = 'locsang_storefront_order_history_v1';
const PROFILE_STORAGE_KEY = 'locsang_storefront_profile_v1';

const DEFAULT_CHECKOUT_FORM = {
  name: '',
  phone: '',
  province: '',
  district: '',
  ward: '',
  addressDetail: '',
  note: '',
};

const loadSavedCheckoutForm = () => {
  try {
    const raw = localStorage.getItem(CHECKOUT_FORM_STORAGE_KEY);
    if (!raw) return DEFAULT_CHECKOUT_FORM;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_CHECKOUT_FORM;
    return {
      ...DEFAULT_CHECKOUT_FORM,
      ...parsed,
    };
  } catch {
    return DEFAULT_CHECKOUT_FORM;
  }
};

const saveCheckoutForm = (form) => {
  try {
    localStorage.setItem(CHECKOUT_FORM_STORAGE_KEY, JSON.stringify(form));
  } catch {
    // ignore storage write errors
  }
};

const loadLatestOrderReceiverInfo = () => {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const latest = parsed[0] || {};
    const fullAddress = String(latest.receiverAddress || latest.receiver_address || '').trim();
    const detailOnly = fullAddress.split(',')[0]?.trim() || fullAddress;

    return {
      name: String(latest.receiverName || latest.receiver_name || '').trim(),
      phone: String(latest.receiverPhone || latest.receiver_phone || '').trim(),
      addressDetail: detailOnly,
    };
  } catch {
    return null;
  }
};

const loadRecentReceiverProfiles = () => {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set();
    const profiles = [];
    for (const item of parsed) {
      const fullAddress = String(item?.receiverAddress || item?.receiver_address || '').trim();
      const addressDetail = fullAddress.split(',')[0]?.trim() || fullAddress;
      const name = String(item?.receiverName || item?.receiver_name || '').trim();
      const phone = String(item?.receiverPhone || item?.receiver_phone || '').trim();
      if (!name && !phone && !addressDetail) continue;

      const key = `${name}|${phone}|${addressDetail}`;
      if (seen.has(key)) continue;
      seen.add(key);

      profiles.push({
        id: String(item?.trackingCode || item?.tracking_code || item?.id || key),
        name,
        phone,
        addressDetail,
        provinceId: item?.receiverProvinceId ?? item?.receiver_province_id ?? '',
        districtId: item?.receiverDistrictId ?? item?.receiver_district_id ?? '',
        wardId: item?.receiverWardId ?? item?.receiver_ward_id ?? '',
        provinceName: String(item?.receiverProvinceName || item?.receiver_province_name || '').trim(),
        districtName: String(item?.receiverDistrictName || item?.receiver_district_name || '').trim(),
        wardName: String(item?.receiverWardName || item?.receiver_ward_name || '').trim(),
      });
      if (profiles.length >= 3) break;
    }

    return profiles;
  } catch {
    return [];
  }
};

const appendOrderToLocalHistory = (orderData, receiverProfile = null) => {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const history = Array.isArray(list) ? list : [];

    const profile = receiverProfile && typeof receiverProfile === 'object' ? receiverProfile : {};

    const orderCode = orderData?.trackingCode || orderData?.tracking_code || orderData?.id;
    const entry = {
      id: orderData?.id,
      trackingCode: orderCode,
      pancakeOrderId: orderData?.pancakeOrderId || orderData?.pancake_order_id || null,
      totalAmount: Number(orderData?.totalAmount ?? orderData?.total_amount ?? 0),
      receiverName: orderData?.receiverName || orderData?.receiver_name || '',
      receiverPhone: orderData?.receiverPhone || orderData?.receiver_phone || '',
      receiverAddress: orderData?.receiverAddress || orderData?.receiver_address || '',
      receiverProvinceId: orderData?.receiverProvinceId || orderData?.receiver_province_id || profile.receiver_province_id || null,
      receiverDistrictId: orderData?.receiverDistrictId || orderData?.receiver_district_id || profile.receiver_district_id || null,
      receiverWardId: orderData?.receiverWardId || orderData?.receiver_ward_id || profile.receiver_ward_id || null,
      receiverProvinceName: orderData?.receiverProvinceName || orderData?.receiver_province_name || profile.receiver_province_name || '',
      receiverDistrictName: orderData?.receiverDistrictName || orderData?.receiver_district_name || profile.receiver_district_name || '',
      receiverWardName: orderData?.receiverWardName || orderData?.receiver_ward_name || profile.receiver_ward_name || '',
      status: orderData?.status || 'pending',
      paymentStatus: orderData?.paymentStatus || orderData?.payment_status || 'pending',
      createdAt: new Date().toISOString(),
    };

    const deduped = [entry, ...history.filter((h) => String(h?.trackingCode || h?.id) !== String(orderCode))].slice(0, 20);
    localStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify(deduped));
  } catch {
    // ignore storage write errors
  }
};

const getOptionId = (item) =>
  Number(
    item?.id ?? item?.WARDS_ID ?? item?.DISTRICT_ID ?? item?.PROVINCE_ID ?? 0,
  );
const getOptionName = (item) =>
  String(item?.name ?? item?.PROVINCE_NAME ?? item?.DISTRICT_NAME ?? item?.WARDS_NAME ?? '').trim();

const validate = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Vui lòng nhập họ tên';
  if (!form.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại';
  else if (!VN_PHONE_REGEX.test(form.phone.trim())) errors.phone = 'Số điện thoại không hợp lệ';
  if (!form.province) errors.province = 'Vui lòng chọn tỉnh/thành phố';
  if (!form.district) errors.district = 'Vui lòng chọn quận/huyện';
  if (!form.ward) errors.ward = 'Vui lòng chọn phường/xã';
  if (!form.addressDetail.trim()) errors.addressDetail = 'Vui lòng nhập địa chỉ chi tiết';
  return errors;
};

const Checkout = () => {
  const { cart, clearCart, updateCartItemQuantity } = useCart();
  const { user } = useStorefrontAuth();
  const [form, setForm] = useState(loadSavedCheckoutForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const [loadingAddressOptions, setLoadingAddressOptions] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [recentProfiles, setRecentProfiles] = useState([]);
  const [pendingProfileDistrict, setPendingProfileDistrict] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const navigate = useNavigate();
  const isAddressLoading = loadingAddressOptions && provinces.length === 0;

  useSEO({
    title: 'Thanh Toan',
    description: 'Trang thanh toan don hang Lộc Sang.',
    canonicalPath: '/checkout',
    noindex: true,
  });

  useEffect(() => {
    const latest = loadLatestOrderReceiverInfo();
    setRecentProfiles(loadRecentReceiverProfiles());
    if (!latest) return;

    setForm((prev) => {
      const next = { ...prev };
      if (!String(prev.name || '').trim() && latest.name) next.name = latest.name;
      if (!String(prev.phone || '').trim() && latest.phone) next.phone = latest.phone;
      if (!String(prev.addressDetail || '').trim() && latest.addressDetail) next.addressDetail = latest.addressDetail;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const local = parsed && typeof parsed === 'object' ? parsed[String(user.id)] || {} : {};

      setForm((prev) => ({
        ...prev,
        name: prev.name || String(user.full_name || ''),
        phone: prev.phone || String(local.phone || ''),
        addressDetail: prev.addressDetail || String(local.address || ''),
      }));
    } catch {
      setForm((prev) => ({
        ...prev,
        name: prev.name || String(user.full_name || ''),
      }));
    }
  }, [user]);

  const formatVnd = (value) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const total = cart.reduce((sum, p) => {
    const priceNum = Number(p.price || 0);
    return sum + priceNum * p.quantity;
  }, 0);
  const shippingFee = 0;
  const discountAmount = 0;
  const grandTotal = total + shippingFee - discountAmount;

  useEffect(() => {
    saveCheckoutForm(form);
  }, [form]);

  useEffect(() => {
    let cancelled = false;

    const loadProvinces = async () => {
      try {
        setLoadingAddressOptions(true);
        const list = await checkoutService.getPancakeProvinces();

        if (!cancelled) {
          setProvinces(Array.isArray(list) ? list : []);
        }
      } catch (error) {
        if (!cancelled) {
          setProvinces([]);
          setSubmitError('Không tải được danh sách tỉnh/thành. Vui lòng thử lại.');
        }
      } finally {
        if (!cancelled) setLoadingAddressOptions(false);
      }
    };

    loadProvinces();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDistricts = async () => {
      if (!form.province) {
        setDistricts([]);
        setWards([]);
        setLoadingDistricts(false);
        return;
      }

      // Clear previous options immediately so UI doesn't show stale districts
      setDistricts([]);
      setWards([]);
      setLoadingDistricts(true);

      try {
        const list = await checkoutService.getPancakeDistricts(Number(form.province));

        if (!cancelled) {
          setDistricts(Array.isArray(list) ? list : []);
          // If a pending profile requested a district restore, apply it now
          if (pendingProfileDistrict && pendingProfileDistrict.districtId) {
            setForm((prev) => ({ ...prev, district: pendingProfileDistrict.districtId, ward: pendingProfileDistrict.wardId || '' }));
            setPendingProfileDistrict(null);
          }
        }
      } catch {
        if (!cancelled) setDistricts([]);
      } finally {
        if (!cancelled) setLoadingDistricts(false);
      }
    };

    loadDistricts();
    return () => {
      cancelled = true;
    };
  }, [form.province]);

  useEffect(() => {
    let cancelled = false;

    const loadWards = async () => {
      if (!form.district) {
        setWards([]);
        setLoadingWards(false);
        return;
      }

      // Clear previous wards immediately to avoid showing stale options
      setWards([]);
      setLoadingWards(true);

      try {
        const list = await checkoutService.getPancakeCommunes(Number(form.district));

        if (!cancelled) {
          setWards(Array.isArray(list) ? list : []);
        }
      } catch {
        if (!cancelled) setWards([]);
      } finally {
        if (!cancelled) setLoadingWards(false);
      }
    };

    loadWards();
    return () => {
      cancelled = true;
    };
  }, [form.district]);

  const selectedProvince = useMemo(
    () => provinces.find((p) => String(getOptionId(p)) === String(form.province)),
    [provinces, form.province],
  );
  const selectedDistrict = useMemo(
    () => districts.find((d) => String(getOptionId(d)) === String(form.district)),
    [districts, form.district],
  );
  const selectedWard = useMemo(
    () => wards.find((w) => String(getOptionId(w)) === String(form.ward)),
    [wards, form.ward],
  );

  const fullAddress = useMemo(() => {
    const parts = [
      String(form.addressDetail || '').trim(),
      getOptionName(selectedWard),
      getOptionName(selectedDistrict),
      getOptionName(selectedProvince),
    ].filter(Boolean);
    return parts.join(', ');
  }, [form.addressDetail, selectedWard, selectedDistrict, selectedProvince]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === 'province') {
        return { ...prev, province: value, district: '', ward: '' };
      }
      if (name === 'district') {
        return { ...prev, district: value, ward: '' };
      }
      return { ...prev, [name]: value };
    });
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const handleBlur = (e) => {
    const field = e.target.name;
    const fieldError = validate({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: fieldError[field] });
  };

  const applyRecentProfile = (profile) => {
    if (!profile || typeof profile !== 'object') return;
    // Only set province immediately. Delay restoring district/ward until
    // districts list for that province has been loaded.
    setForm((prev) => ({
      ...prev,
      name: profile.name || prev.name,
      phone: profile.phone || prev.phone,
      addressDetail: profile.addressDetail || prev.addressDetail,
      province: profile.provinceId ? String(profile.provinceId) : prev.province,
      district: '',
      ward: '',
    }));

    if (profile.districtId) {
      setPendingProfileDistrict({ districtId: String(profile.districtId), wardId: profile.wardId ? String(profile.wardId) : '' });
    }

    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const invalidItems = cart.filter((item) => !Number.isFinite(Number(item.product_id)) || Number(item.product_id) <= 0);
    if (invalidItems.length > 0) {
      setSubmitError('Giỏ hàng có sản phẩm không hợp lệ. Vui lòng xóa sản phẩm cũ và thêm lại.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        receiver_name: form.name.trim(),
        receiver_phone: form.phone.trim(),
        receiver_address: fullAddress,
        receiver_province_id: Number(form.province || 0) || undefined,
        receiver_district_id: Number(form.district || 0) || undefined,
        receiver_ward_id: Number(form.ward || 0) || undefined,
        receiver_province_name: getOptionName(selectedProvince) || undefined,
        receiver_district_name: getOptionName(selectedDistrict) || undefined,
        receiver_ward_name: getOptionName(selectedWard) || undefined,
        note: form.note?.trim() || undefined,
        // Keep backend payload stable while other methods are not live yet.
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
      const orderData = result?.data || null;
      setOrderResult(orderData);
      appendOrderToLocalHistory(orderData, payload);
      clearCart();
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.message ||
        'Không thể tạo đơn hàng. Vui lòng thử lại.';
      setSubmitError(String(message));
    } finally {
      setSubmitting(false);
    }
  };

  if (orderResult) {
    const orderCode = orderResult.trackingCode || orderResult.tracking_code || orderResult.id;
    const orderTotal = Number(orderResult.totalAmount ?? orderResult.total_amount ?? 0);
    const receiverName = orderResult.receiverName || orderResult.receiver_name || form.name;
    const receiverPhone = orderResult.receiverPhone || orderResult.receiver_phone || form.phone;
    const receiverAddress = orderResult.receiverAddress || orderResult.receiver_address || fullAddress;

    return (
      <div className="min-h-screen bg-gray-50 pt-6 pb-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
            <h1 className="text-2xl md:text-3xl font-extrabold text-emerald-700">Đặt hàng thành công</h1>
            <p className="mt-2 text-gray-700">Cảm ơn bạn đã mua hàng tại Lộc Sang. Đơn hàng của bạn đã được ghi nhận.</p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Mã đơn hàng</div>
                <div className="text-lg font-bold text-gray-900">{orderCode}</div>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Tổng thanh toán</div>
                <div className="text-lg font-bold text-rose-600">{formatVnd(orderTotal)}</div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Thông tin nhận hàng</div>
              <div className="mt-2 text-gray-900 font-medium">{receiverName}</div>
              <div className="text-gray-700">{receiverPhone}</div>
              <div className="text-gray-700">{receiverAddress}</div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="flex-1 py-3 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition"
              >
                Tiếp tục mua sắm
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 py-3 rounded-lg bg-gray-100 text-gray-800 font-bold hover:bg-gray-200 transition"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#fff9f0] pb-12">
        <header className="sticky top-0 z-40 border-b border-[#e9e2d4] bg-[#fff9f0]/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
            <button type="button" onClick={() => navigate(-1)} className="md:hidden text-[#8a4f41]">
              <FaArrowLeft />
            </button>
            <Link to="/" className="text-3xl font-extrabold tracking-tight text-[#8a4f41] md:text-2xl">Lộc Sang</Link>
            <nav className="hidden items-center gap-8 text-sm font-medium text-[#635f54] md:flex">
              <Link to="/products" className="hover:text-[#8a4f41]">Sản phẩm</Link>
              <Link to="/contact" className="hover:text-[#8a4f41]">Về Lộc Sang</Link>
              <Link to="/tips" className="hover:text-[#8a4f41]">Blog</Link>
              <span className="font-bold text-[#8a4f41]">Thanh toán</span>
            </nav>
            <button type="button" className="hidden text-[#8a4f41] md:inline-flex"><FaShoppingBasket /></button>
            <span className="md:hidden w-4" />
          </div>
        </header>

        <div className="mx-auto flex min-h-[55vh] w-full max-w-3xl items-center justify-center px-4 pt-10">
          <div className="w-full rounded-[2rem] bg-white p-8 text-center shadow-md ring-1 ring-[#ece2d3] md:p-10">
            <h2 className="text-3xl font-extrabold text-[#8a4f41]">Giỏ hàng trống</h2>
            <p className="mt-3 text-[#635f54]">Bạn chưa có sản phẩm nào để thanh toán. Hãy quay lại cửa hàng để chọn thêm nhé.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/products"
                className="rounded-full bg-[#8a4f41] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#7b473a]"
              >
                Mua sắm ngay
              </Link>
              <Link
                to="/"
                className="rounded-full bg-[#f4ede2] px-6 py-3 text-sm font-bold text-[#5d564a] transition hover:bg-[#e8decd]"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>

        <footer className="mt-12 bg-[#f9f3e9] py-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-[#635f54] md:flex-row">
            <div>
              <div className="text-lg font-bold text-[#8a4f41]">Lộc Sang</div>
              <p className="mt-1">© 2024 Lộc Sang. Mua sắm tiện lợi, giao nhanh toàn quốc.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5">
              <a href="#" className="hover:text-[#8a4f41]">Chính sách đổi trả</a>
              <a href="#" className="hover:text-[#8a4f41]">Bảo mật thông tin</a>
              <a href="#" className="hover:text-[#8a4f41]">Hỗ trợ 24/7</a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff9f0] pb-12">
      <header className="sticky top-0 z-40 border-b border-[#e9e2d4] bg-[#fff9f0]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <button type="button" onClick={() => navigate(-1)} className="md:hidden text-[#8a4f41]">
            <FaArrowLeft />
          </button>
          <Link to="/" className="text-3xl font-extrabold tracking-tight text-[#8a4f41] md:text-2xl">Lộc Sang</Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#635f54] md:flex">
            <Link to="/products" className="hover:text-[#8a4f41]">Sản phẩm</Link>
            <Link to="/contact" className="hover:text-[#8a4f41]">Về Lộc Sang</Link>
            <Link to="/tips" className="hover:text-[#8a4f41]">Blog</Link>
            <span className="font-bold text-[#8a4f41]">Thanh toán</span>
          </nav>
          <button type="button" className="hidden text-[#8a4f41] md:inline-flex"><FaShoppingBasket /></button>
          <span className="md:hidden w-4" />
        </div>
      </header>

      {isAddressLoading && (
        <div className="fixed inset-0 z-[1200] bg-black/35 backdrop-blur-[1px] flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-200 p-5 text-center">
            <div className="mx-auto mb-3 h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            <div className="text-base font-semibold text-gray-900">Đang tải thông tin địa chỉ</div>
            <div className="mt-1 text-sm text-gray-600">Vui lòng chờ trong giây lát...</div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-md px-4 pt-8 sm:px-5 md:max-w-7xl md:px-6 md:pt-10">
        <header className="mb-8 md:mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#2e2a22] md:text-5xl">Hoàn tất đơn hàng</h1>
          <p className="mt-2 text-sm font-medium text-[#6f6a5f] md:text-base">Gần xong rồi! Hãy điền thông tin để Lộc Sang gửi quà cho bé nhé.</p>
        </header>

        {submitError && (
          <div className="mb-6 rounded-2xl bg-[#fde9eb] px-4 py-3 text-sm font-medium text-[#8f343f]">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-8 lg:col-span-7">
            <section className="rounded-[2rem] bg-[#f9f3e9] p-5 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fdb19f]/55 text-[#633024]">
                  <FaTruck />
                </div>
                <h2 className="text-2xl font-bold text-[#2e2a22]">Thông tin giao hàng</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="px-1 text-sm font-semibold text-[#4f4a41]" htmlFor="name">Họ và tên</label>
                  <div className="relative">
                    <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b857a]" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Nhập họ tên của bạn"
                      className={`w-full rounded-full bg-[#e9e2d4] py-3 pl-11 pr-4 text-[#353229] outline-none ring-1 ring-transparent placeholder:text-[#9a9387] focus:ring-[#fdb19f]/70 ${errors.name ? '!ring-[#f76a80]/70' : ''}`}
                    />
                  </div>
                  {errors.name && <div className="px-1 text-xs text-[#ac3149]">{errors.name}</div>}
                </div>

                <div className="space-y-2">
                  <label className="px-1 text-sm font-semibold text-[#4f4a41]" htmlFor="phone">Số điện thoại</label>
                  <div className="relative">
                    <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b857a]" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Nhập số điện thoại"
                      pattern="(?:\+?84|0)[0-9]{9,10}"
                      inputMode="numeric"
                      className={`w-full rounded-full bg-[#e9e2d4] py-3 pl-11 pr-4 text-[#353229] outline-none ring-1 ring-transparent placeholder:text-[#9a9387] focus:ring-[#fdb19f]/70 ${errors.phone ? '!ring-[#f76a80]/70' : ''}`}
                    />
                  </div>
                  {errors.phone && <div className="px-1 text-xs text-[#ac3149]">{errors.phone}</div>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="px-1 text-sm font-semibold text-[#4f4a41]" htmlFor="addressDetail">Địa chỉ nhận hàng</label>
                  <div className="relative">
                    <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b857a]" />
                    <input
                      id="addressDetail"
                      name="addressDetail"
                      type="text"
                      autoComplete="street-address"
                      value={form.addressDetail}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Số nhà, tên đường..."
                      className={`w-full rounded-full bg-[#e9e2d4] py-3 pl-11 pr-4 text-[#353229] outline-none ring-1 ring-transparent placeholder:text-[#9a9387] focus:ring-[#fdb19f]/70 ${errors.addressDetail ? '!ring-[#f76a80]/70' : ''}`}
                    />
                  </div>
                  {errors.addressDetail && <div className="px-1 text-xs text-[#ac3149]">{errors.addressDetail}</div>}
                </div>

                <div className="space-y-2">
                  <label className="px-1 text-sm font-semibold text-[#4f4a41]" htmlFor="province">Tỉnh/Thành phố</label>
                  <select
                    id="province"
                    name="province"
                    value={form.province}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={loadingAddressOptions}
                    className={`w-full rounded-full bg-[#e9e2d4] py-3 px-4 text-[#353229] outline-none ring-1 ring-transparent focus:ring-[#fdb19f]/70 ${errors.province ? '!ring-[#f76a80]/70' : ''}`}
                  >
                    <option value="">{loadingAddressOptions ? 'Đang tải tỉnh/thành...' : 'Chọn tỉnh thành'}</option>
                    {provinces.map((province) => (
                      <option key={getOptionId(province)} value={getOptionId(province)}>
                        {getOptionName(province)}
                      </option>
                    ))}
                  </select>
                  {errors.province && <div className="px-1 text-xs text-[#ac3149]">{errors.province}</div>}
                </div>

                <div className="space-y-2">
                  <label className="px-1 text-sm font-semibold text-[#4f4a41]" htmlFor="district">Quận/Huyện</label>
                  <select
                    id="district"
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!form.province || loadingDistricts}
                    className={`w-full rounded-full bg-[#e9e2d4] py-3 px-4 text-[#353229] outline-none ring-1 ring-transparent focus:ring-[#fdb19f]/70 ${errors.district ? '!ring-[#f76a80]/70' : ''}`}
                  >
                    <option value="">{loadingDistricts ? 'Đang tải quận/huyện...' : 'Chọn quận/huyện'}</option>
                    {districts.map((district) => (
                      <option key={getOptionId(district)} value={getOptionId(district)}>
                        {getOptionName(district)}
                      </option>
                    ))}
                  </select>
                  {errors.district && <div className="px-1 text-xs text-[#ac3149]">{errors.district}</div>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="px-1 text-sm font-semibold text-[#4f4a41]" htmlFor="ward">Phường/Xã</label>
                  <select
                    id="ward"
                    name="ward"
                    value={form.ward}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={!form.district || loadingWards}
                    className={`w-full rounded-full bg-[#e9e2d4] py-3 px-4 text-[#353229] outline-none ring-1 ring-transparent focus:ring-[#fdb19f]/70 ${errors.ward ? '!ring-[#f76a80]/70' : ''}`}
                  >
                    <option value="">{loadingWards ? 'Đang tải phường/xã...' : 'Chọn phường/xã'}</option>
                    {wards.map((ward) => (
                      <option key={getOptionId(ward)} value={getOptionId(ward)}>
                        {getOptionName(ward)}
                      </option>
                    ))}
                  </select>
                  {errors.ward && <div className="px-1 text-xs text-[#ac3149]">{errors.ward}</div>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="px-1 text-sm font-semibold text-[#4f4a41]" htmlFor="note">Ghi chú thêm</label>
                  <div className="relative">
                    <FaStickyNote className="absolute left-4 top-4 text-[#8b857a]" />
                    <textarea
                      id="note"
                      name="note"
                      rows={3}
                      value={form.note}
                      onChange={handleChange}
                      placeholder="Lời nhắn cho shipper..."
                      className="w-full rounded-3xl bg-[#e9e2d4] py-3 pl-11 pr-4 text-[#353229] outline-none ring-1 ring-transparent placeholder:text-[#9a9387] focus:ring-[#fdb19f]/70"
                    />
                  </div>
                </div>
              </div>

              {fullAddress && (
                <div className="mt-4 rounded-2xl bg-[#fff9f0] px-4 py-3 text-sm text-[#5f594d]">
                  Địa chỉ giao hàng: <span className="font-semibold">{fullAddress}</span>
                </div>
              )}
            </section>

            <section className="rounded-[2rem] bg-[#f9f3e9] p-5 md:p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c7fce9] text-[#316354]">
                  <FaShieldAlt />
                </div>
                <h2 className="text-2xl font-bold text-[#2e2a22]">Phương thức thanh toán</h2>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-2xl bg-[#f7f3eb] p-4 ring-1 ring-[#e7dece] opacity-70 cursor-not-allowed">
                  <input type="radio" name="paymentMethod" className="hidden" checked={false} disabled />
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#c7fce9] text-[#316354]"><FaUniversity /></div>
                  <div className="flex-1">
                    <div className="font-bold text-[#2f2b24]">Chuyển khoản ngân hàng</div>
                    <div className="text-xs text-[#706b60]">Coming soon</div>
                  </div>
                  <span className="rounded-full bg-[#efe6d9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7a7468]">Coming soon</span>
                </label>

                <label className="flex items-center gap-3 rounded-2xl bg-[#f7f3eb] p-4 ring-1 ring-[#e7dece] opacity-70 cursor-not-allowed">
                  <input type="radio" name="paymentMethod" className="hidden" checked={false} disabled />
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ff9ea4] text-[#691724]"><FaWallet /></div>
                  <div className="flex-1">
                    <div className="font-bold text-[#2f2b24]">Ví điện tử MoMo</div>
                    <div className="text-xs text-[#706b60]">Coming soon</div>
                  </div>
                  <span className="rounded-full bg-[#efe6d9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7a7468]">Coming soon</span>
                </label>

                <label className={`flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-4 transition ${paymentMethod === 'cod' ? 'ring-2 ring-[#8a4f41]' : 'ring-1 ring-[#ebe1d2]'}`}>
                  <input type="radio" name="paymentMethod" className="hidden" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fdb19f]/50 text-[#8a4f41]"><FaMoneyBillWave /></div>
                  <div className="flex-1">
                    <div className="font-bold text-[#2f2b24]">Thanh toán khi nhận hàng (COD)</div>
                    <div className="text-xs text-[#706b60]">Kiểm tra hàng trước khi thanh toán</div>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 ${paymentMethod === 'cod' ? 'border-[#8a4f41] bg-[#8a4f41]' : 'border-[#b7b1a4]'}`}>
                    <div className={`mx-auto mt-[3px] h-2 w-2 rounded-full bg-white ${paymentMethod === 'cod' ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                </label>
              </div>
            </section>

            {false && recentProfiles.length > 0 && (
              <section className="rounded-[2rem] bg-[#f9f3e9] p-5 md:p-6">
                <div className="text-sm font-bold text-[#2f2b24]">Dùng lại thông tin gần đây</div>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  {recentProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => applyRecentProfile(profile)}
                      className="rounded-2xl bg-[#fff9f0] px-3 py-3 text-left hover:bg-white"
                    >
                      <div className="text-sm font-semibold text-[#2f2b24]">{profile.name || 'Người nhận'}</div>
                      <div className="mt-1 text-xs text-[#746f64]">{profile.phone || '-'} • {profile.addressDetail || '-'}</div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="lg:col-span-5">
            <div className="rounded-[2rem] bg-[#f9f3e9] p-5 shadow-[0_20px_50px_rgba(53,50,41,0.06)] ring-1 ring-[#ece2d3] md:bg-white md:p-8 lg:sticky lg:top-24">
              <h3 className="mb-5 text-3xl font-extrabold tracking-tight text-[#2f2b24]">Tóm tắt đơn hàng</h3>

              <div className="space-y-4">
                {cart.map((item, idx) => (
                  <div key={item.item_key || idx} className="flex items-center gap-3">
                    <div className="relative">
                      <img src={item.image} alt={item.title} className="h-16 w-16 rounded-2xl object-cover" />
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#8a4f41] text-[10px] font-bold text-white">{item.quantity}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-[#2f2b24]">{item.title}</div>
                      <div className="text-xs text-[#746f64]">{item.variant_label ? `Phân loại: ${item.variant_label}` : 'Sản phẩm tiêu chuẩn'}</div>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#efe6d9] px-2 py-1">
                        <button
                          type="button"
                          onClick={() => updateCartItemQuantity(item.item_key, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[#6f6a5f]"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#4a463d]">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartItemQuantity(item.item_key, item.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-[#6f6a5f]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-right font-bold text-[#2f2b24]">{formatVnd(Number(item.price || 0) * item.quantity)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-2">
                <input
                  type="text"
                  placeholder="Mã giảm giá"
                  className="min-w-0 flex-1 rounded-full bg-[#f4ede2] px-4 py-2.5 text-sm text-[#2f2b24] outline-none placeholder:text-[#9a9387]"
                />
                <button type="button" className="rounded-full bg-[#8a4f41] px-5 py-2.5 text-sm font-bold text-white">Áp dụng</button>
              </div>

              <div className="mt-6 space-y-3 border-t border-[#e9e2d4] pt-5 text-sm">
                <div className="flex items-center justify-between text-[#6f6a5f]"><span>Tạm tính</span><span>{formatVnd(total)}</span></div>
                <div className="flex items-center justify-between text-[#6f6a5f]"><span>Phí vận chuyển</span><span>{shippingFee > 0 ? formatVnd(shippingFee) : 'Miễn phí'}</span></div>
                <div className="flex items-center justify-between text-[#6f6a5f]"><span>Giảm giá</span><span className="text-[#9e404a]">-{formatVnd(discountAmount)}</span></div>
                <div className="flex items-end justify-between border-t border-[#e9e2d4] pt-4">
                  <span className="text-2xl font-extrabold text-[#2f2b24]">Tổng cộng</span>
                  <div className="text-right">
                    <div className="text-4xl font-black text-[#8a4f41]">{formatVnd(grandTotal)}</div>
                    <div className="text-[11px] text-[#8d877b]">(Đã bao gồm VAT)</div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || loadingAddressOptions}
                className="mt-8 hidden w-full items-center justify-center gap-3 rounded-full bg-[#8a4f41] py-4 text-xl font-extrabold uppercase text-[#fff7f6] shadow-lg shadow-[#8a4f41]/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 md:flex"
              >
                {submitting && <span className="inline-block h-5 w-5 rounded-full border-2 border-white/50 border-t-white animate-spin" />}
                {submitting ? 'Đang xử lý...' : (loadingAddressOptions ? 'Đang tải địa chỉ...' : 'Thanh toán ngay')}
              </button>

              <p className="mt-4 hidden items-center justify-center gap-2 text-xs text-[#8f887a] md:flex">
                <FaShieldAlt className="text-[11px]" /> Thanh toán an toàn & bảo mật
              </p>
            </div>
          </aside>

          <div className="lg:col-span-12 md:hidden">
            <button
              type="submit"
              disabled={submitting || loadingAddressOptions}
              className="mt-1 flex w-full items-center justify-center gap-3 rounded-full bg-[#8a4f41] py-4 text-2xl font-extrabold uppercase text-[#fff7f6] shadow-lg shadow-[#8a4f41]/20 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <span className="inline-block h-5 w-5 rounded-full border-2 border-white/50 border-t-white animate-spin" />}
              {submitting ? 'Đang xử lý...' : (loadingAddressOptions ? 'Đang tải địa chỉ...' : 'Thanh toán ngay')}
            </button>
            <p className="mt-4 text-center text-[10px] uppercase tracking-[0.22em] text-[#8f887a]">
              Secure SSL Encryption Enabled
            </p>
          </div>
        </form>
      </div>

      <footer className="mt-12 bg-[#f9f3e9] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-[#635f54] md:flex-row">
          <div>
            <div className="text-lg font-bold text-[#8a4f41]">Lộc Sang</div>
            <p className="mt-1">© 2024 Lộc Sang. Mua sắm tiện lợi, giao nhanh toàn quốc.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <a href="#" className="hover:text-[#8a4f41]">Chính sách đổi trả</a>
            <a href="#" className="hover:text-[#8a4f41]">Bảo mật thông tin</a>
            <a href="#" className="hover:text-[#8a4f41]">Hỗ trợ 24/7</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Checkout;
