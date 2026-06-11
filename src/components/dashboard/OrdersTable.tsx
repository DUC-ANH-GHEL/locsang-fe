import React from 'react';
import { Search } from 'lucide-react';
import { formatCurrency } from '../../data/mockData';

interface Order {
  id: string;
  customer: string;
  mainProduct: string;
  total: number;
  status: 'pending' | 'processing' | 'cancelled';
}

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
}

const normalizeOrderStatus = (status: string) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'processing') return 'processing';
  if (normalized === 'cancelled') return 'cancelled';
  return 'pending';
};

const OrdersTable: React.FC<OrdersTableProps> = ({ orders, loading }) => {
  const getStatusBadgeClass = (status: string) => {
    switch (normalizeOrderStatus(status)) {
      case 'processing':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (normalizeOrderStatus(status)) {
      case 'processing':
        return 'Đã xử lý';
      case 'cancelled':
        return 'Hủy đơn';
      default:
        return 'Mới';
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Đơn hàng gần đây</h2>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm đơn hàng..."
            className="rounded-xl border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Mã đơn', 'Khách hàng', 'Sản phẩm chính', 'Tổng tiền', 'Trạng thái', 'Thao tác'].map((label, index) => (
                <th
                  key={label}
                  scope="col"
                  className={`px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 ${index === 5 ? 'text-right' : 'text-left'}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="whitespace-nowrap px-6 py-4">
                      <div className="h-4 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{order.id}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{order.customer}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{order.mainProduct}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(order.total)}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <a href="#" className="text-rose-600 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200">
                      Chi tiết
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersTable;
