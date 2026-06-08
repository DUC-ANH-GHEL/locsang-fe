import React from 'react';
import { formatCurrency } from '../../data/mockData';

interface Customer {
  id: number;
  name: string;
  avatar: string;
  orders: number;
  spent: number;
}

interface CustomerCardProps {
  customer: Customer;
}

const CustomerCard: React.FC<CustomerCardProps> = ({ customer }) => {
  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center">
        <img
          src={customer.avatar}
          alt={customer.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="ml-3">
          <h3 className="font-medium text-gray-900 dark:text-white">{customer.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{customer.orders} đơn đã mua</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(customer.spent)}</p>
        <button className="mt-1 text-xs px-2 py-1 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200 rounded hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">
          Nhắn Zalo
        </button>
      </div>
    </div>
  );
};

export default CustomerCard;
