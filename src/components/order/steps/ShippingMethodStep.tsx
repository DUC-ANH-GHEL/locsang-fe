import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, ShippingMethod } from '../../../types/order';

type ShippingService = ShippingMethod;

type ShippingTemplate = {
  SERVICE_CODE: string;
  SERVICE_NAME: string;
  baseFee: number;
  estimatedDays: number;
};

type Props = {
  value: ShippingMethod;
  onChange: (value: ShippingMethod) => void;
  onNext: () => void;
  onPrev: () => void;
  address: {
    province: number;
    district: number;
  };
   products: Product[];
};

const AVAILABLE_SERVICES: ShippingTemplate[] = [
  { SERVICE_CODE: 'STANDARD', SERVICE_NAME: 'Giao hàng tiêu chuẩn', baseFee: 25000, estimatedDays: 3 },
  { SERVICE_CODE: 'FAST', SERVICE_NAME: 'Giao hàng nhanh', baseFee: 35000, estimatedDays: 2 },
  { SERVICE_CODE: 'EXPRESS', SERVICE_NAME: 'Giao hàng hoả tốc', baseFee: 50000, estimatedDays: 1 },
];

const ShippingMethodStep: React.FC<Props> = ({ value, onChange, onNext, onPrev, address, products }) => {
  const [selected, setSelected] = useState<string>(value.SERVICE_CODE);
  const [methods, setMethods] = useState<ShippingService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setSelected(value.SERVICE_CODE);
  }, [value]);

  useEffect(() => {
    setLoading(true);

    const totalWeight = products.reduce((sum, p) => {
      const weight = Number((p as any).weight || 0);
      const quantity = Number(p.quantity || 0);
      return sum + weight * quantity;
    }, 0);

    const weightSurcharge = Math.ceil(Math.max(0, totalWeight) / 1000) * 2000;
    const districtSurcharge = address.district ? 3000 : 0;

    const calculatedMethods = AVAILABLE_SERVICES.map((service) => {
      const moneyTotal = service.baseFee + weightSurcharge + districtSurcharge;
      return {
        SERVICE_CODE: service.SERVICE_CODE,
        SERVICE_NAME: service.SERVICE_NAME,
        TOTAL_FEE: moneyTotal,
        MONEY_COLLECTION_FEE: 0,
        MONEY_FEE: moneyTotal,
        KPI_HT: service.estimatedDays * 24,
        MONEY_OTHER_FEE: 0,
        MONEY_TOTAL: moneyTotal,
        MONEY_TOTAL_FEE: moneyTotal,
        MONEY_TOTAL_OLD: moneyTotal,
        MONEY_VAS: 0,
        MONEY_VAT: 0,
      } as ShippingService;
    });

    setMethods(calculatedMethods);
    setLoading(false);
  }, [address.district, products]);

  useEffect(() => {
    if (!selected && methods.length > 0) {
      handleSelect(methods[0]);
    }
  }, [methods]);

//   const handleSelect = (method: string) => {
//     setSelected(method);
//     onChange(method);
//   };

const handleSelect = (method: ShippingMethod) => {
        setSelected(method.SERVICE_CODE);
        onChange(method);
      };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-lg font-semibold flex items-center gap-3 mb-4">
        <span className="rounded-full bg-emerald-600 text-white w-6 h-6 flex items-center justify-center text-sm">4</span>
        Phương thức giao hàng
      </h2>

      {loading ? (
        <p className="text-sm text-gray-500 italic">Đang tải danh sách dịch vụ...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {methods.map(method => (
            <div
              key={method.SERVICE_CODE}
              onClick={() => handleSelect(method)}
              className={`border rounded p-4 cursor-pointer transition ${
                selected === method.SERVICE_CODE ? 'border-emerald-600 bg-emerald-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="font-semibold text-emerald-700 mb-1">
                {method.SERVICE_NAME}
              </div>
              <div className="text-sm text-gray-600">
                Time: {Math.round(method.KPI_HT / 24)} ngày
                <br/>
                Phí: {method.MONEY_TOTAL.toLocaleString()} đ
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button
          onClick={onPrev}
          className="flex items-center gap-2 px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
        >
          <ChevronLeft className="h-4 w-4" /> Quay lại
        </button>
        <button
          onClick={onNext}
          disabled={!selected}
          className={`flex items-center gap-2 px-4 py-2 rounded ${
            selected ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Tiếp theo <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ShippingMethodStep;
