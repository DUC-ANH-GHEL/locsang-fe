import React from 'react';

interface Product {
  id: number;
  name: string;
  image: string;
  sales: number;
  growth: number;
}

interface TopProductCardProps {
  product: Product;
  rank: number;
}

const TopProductCard: React.FC<TopProductCardProps> = ({ product, rank }) => {
  return (
    <div className="flex items-center p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-12 h-12 rounded object-cover"
        />
        {rank === 0 && (
          <span className="absolute -top-1 -right-1 text-lg">🔥</span>
        )}
      </div>
      <div className="ml-4 flex-1">
        <h3 className="font-medium text-gray-900 dark:text-white">{product.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{product.sales} đã bán</p>
      </div>
      <div className={`text-sm font-medium ${
        product.growth >= 0
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400'
      }`}>
        {product.growth > 0 ? `+${product.growth}%` : `${product.growth}%`}
      </div>
    </div>
  );
};

export default TopProductCard;
