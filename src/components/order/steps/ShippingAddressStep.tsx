// 📁 src/components/order/steps/ShippingAddressStep.tsx
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Address, Customer } from '../../../types/order';
import { AddressOption, checkoutService } from '../../../services/checkoutService';



type Props = {
  address: Address;
  customer: Customer;
  onChange: (value: Address) => void;
  onNext: () => void;
  onPrev: () => void;
};

const ShippingAddressStep: React.FC<Props> = ({ address, customer, onChange, onNext, onPrev }) => {
  const [state, setState] = useState<Address>({
    ...address,
    receiverPhone: address.receiverPhone || customer.phone
  });
  const [provinces, setProvinces] = useState<AddressOption[]>([]);
  const [districts, setDistricts] = useState<AddressOption[]>([]);
  const [wards, setWards] = useState<AddressOption[]>([]);


  // useEffect(() => {
  //   setState(address);
  // }, [address]);

  useEffect(() => {
    checkoutService.getPancakeProvinces()
      .then((list) => {
        setProvinces(Array.isArray(list) ? list : []);
      })
      .catch((err) => console.error('Lỗi lấy tỉnh/thành:', err));
  }, []);

  useEffect(() => {
    if (state.province) {
      checkoutService.getPancakeDistricts(Number(state.province))
        .then((list) => {
          setDistricts(Array.isArray(list) ? list : []);
        })
        .catch((err) => console.error('Lỗi lấy quận/huyện:', err));
    } else {
      setDistricts([]);
    }
  }, [state.province]);

  useEffect(() => {
    if (state.district && !isNaN(Number(state.district))) {
      checkoutService.getPancakeCommunes(Number(state.district))
        .then((list) => {
          setWards(Array.isArray(list) ? list : []);
        })
        .catch((err) => console.error('Lỗi lấy phường/xã:', err));
    } else {
      setWards([]);
    }
  }, [state.district]);

  const handleChange = (field: keyof Address, value: string | number) => {
    const updated: Address = { ...state, [field]: value };
    if (field === 'province') {
      updated.district = 0 as any;
      updated.ward = 0 as any;
    }
    if (field === 'district') {
      updated.ward = 0 as any;
    }
    setState(updated);
    onChange(updated);
  };

  const isValid = state.province && state.district && state.ward && state.detail && state.receiverPhone;

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-lg font-semibold flex items-center gap-3 mb-4">
        <span className="rounded-full bg-emerald-600 text-white w-6 h-6 flex items-center justify-center text-sm">3</span>
        Địa chỉ giao hàng
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành phố</label>
          <select
            value={state.province || ""}
            onChange={(e) => handleChange('province', Number(e.target.value))}
            className="w-full border px-3 py-2 rounded focus:ring-teal-500"
          >
            <option value="">Chọn Tỉnh/Thành phố</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quận/Huyện</label>
          <select
            value={state.district || ""}
            onChange={(e) => handleChange('district', Number(e.target.value))}
            disabled={!state.province}
            className="w-full border px-3 py-2 rounded focus:ring-teal-500"
          >
            <option value="">Chọn Quận/Huyện</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phường/Xã</label>
          <select
            value={state.ward || ""}
            onChange={(e) => handleChange('ward', Number(e.target.value))}
            disabled={!state.district}
            className="w-full border px-3 py-2 rounded focus:ring-teal-500"
          >
            <option value="">Chọn Phường/Xã</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ chi tiết</label>
        <input
          type="text"
          value={state.detail}
          onChange={(e) => handleChange('detail', e.target.value)}
          className="w-full border px-3 py-2 rounded focus:ring-teal-500"
          placeholder="Số nhà, tên đường..."
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">SĐT người nhận</label>
        <input
          type="text"
          value={state.receiverPhone}
          onChange={(e) => handleChange('receiverPhone', e.target.value)}
          className="w-full border px-3 py-2 rounded focus:ring-teal-500"
          placeholder="Số điện thoại người nhận hàng"
        />
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={onPrev}
          className="flex items-center gap-2 px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
        >
          <ChevronLeft className="h-4 w-4" /> Quay lại
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`flex items-center gap-2 px-4 py-2 rounded ${
            isValid ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Tiếp theo <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ShippingAddressStep;
