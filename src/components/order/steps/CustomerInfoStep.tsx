// import React from 'react';
// import { Search, ChevronRight } from 'lucide-react';
// import { Customer } from '../../../types/order';

// type Props = {
//   searchPhone: string;
//   onSearchPhoneChange: (value: string) => void;
//   onSearch: () => void;
//   customer: Customer | null;
//   onCreateNewClick: () => void;
//   onNext: () => void;
// };

// const CustomerInfoStep: React.FC<Props> = ({
//   searchPhone,
//   onSearchPhoneChange,
//   onSearch,
//   customer,
//   onCreateNewClick,
//   onNext,
// }) => (
//   <div className="bg-white p-6 rounded-lg shadow mb-6">
//     <h2 className="text-lg font-semibold flex items-center gap-3 mb-4">
//       <span className="rounded-full bg-emerald-600 text-white w-6 h-6 flex items-center justify-center text-sm">1</span>
//       Thông tin khách hàng
//     </h2>
//     <div className="mb-4">
//       <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
//       <div className="flex gap-2">
//         <input
//           type="text"
//           value={searchPhone}
//           onChange={e => onSearchPhoneChange(e.target.value)}
//           className="w-full border px-3 py-2 rounded focus:ring-teal-500"
//           placeholder="Nhập số điện thoại khách hàng"
//         />
//         <button
//           onClick={onSearch}
//           className="bg-teal-600 text-white px-4 rounded hover:bg-teal-700"
//         >
//           <Search className="h-5 w-5" />
//         </button>
//       </div>
//     </div>
//     {customer && (
//       <div className="p-4 border rounded bg-gray-50">
//         <h3 className="font-medium mb-2">Thông tin khách hàng</h3>
//         <p><span className="text-gray-600">Họ tên:</span> {customer.name}</p>
//         <p><span className="text-gray-600">SĐT:</span> {customer.phone}</p>
//       </div>
//     )}
//     {!customer && (
//       <p className="text-sm text-gray-500 italic">
//         Nhập số điện thoại để tìm khách hàng hoặc{' '}
//         <button
//           onClick={onCreateNewClick}
//           className="text-teal-600 hover:underline"
//         >
//           tạo mới
//         </button>
//       </p>
//     )}
//     <div className="mt-6 flex justify-between">
//       <div></div>
//       <button
//         onClick={onNext}
//         disabled={!customer}
//         className={`flex items-center gap-2 px-4 py-2 rounded \${customer ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
//       >
//         Tiếp theo <ChevronRight className="h-4 w-4" />
//       </button>
//     </div>
//   </div>
// );

// export default CustomerInfoStep;


import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Customer } from '../../../types/order';

// type Props = {
//   customer: Customer;
//   onCustomerChange: (field: keyof Customer, value: string) => void;
//   onNext: () => void;
// };

type EditableCustomerField = 'phone' | 'name';

type Props = {
  customer: Customer;
  onCustomerChange: (field: EditableCustomerField, value: string) => void;
  onNext: () => void;
};


const CustomerInfoStep: React.FC<Props> = ({
  customer,
  onCustomerChange,
  onNext,
}) => (
  <div className="bg-white p-6 rounded-lg shadow mb-6">
    <h2 className="text-lg font-semibold flex items-center gap-3 mb-4">
      <span className="rounded-full bg-emerald-600 text-white w-6 h-6 flex items-center justify-center text-sm">1</span>
      Thông tin khách hàng
    </h2>

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
      <input
        type="text"
        value={customer.phone}
        onChange={e => onCustomerChange('phone', e.target.value)}
        className="w-full border px-3 py-2 rounded focus:ring-teal-500"
        placeholder="Nhập số điện thoại khách hàng"
      />
    </div>

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên khách hàng</label>
      <input
        type="text"
        value={customer.name}
        onChange={e => onCustomerChange('name', e.target.value)}
        className="w-full border px-3 py-2 rounded focus:ring-teal-500"
        placeholder="Nhập họ tên khách hàng"
      />
    </div>

    <div className="mt-6 flex justify-end">
      <button
        onClick={onNext}
        disabled={!customer.phone || !customer.name}
        className={`flex items-center gap-2 px-4 py-2 rounded ${
          customer.phone && customer.name
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        Tiếp theo <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export default CustomerInfoStep;
