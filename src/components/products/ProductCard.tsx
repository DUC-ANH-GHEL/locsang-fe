import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../../types/product';
import { toProductDetailPath } from '../../utils/productUrl';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const imageUrl = product.images?.[0] || '/favicon.svg';

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="locsang-card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={toProductDetailPath(product)}>
        <div className="relative pb-[100%]">
          <img
            src={imageUrl}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-x-3 bottom-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#6b3f0e] backdrop-blur">
            Bestseller tại Lộc Sang
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-slate-600 text-sm mb-4 line-clamp-2">
            {product.description}
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#b93a2e] font-extrabold">
              {formatPrice(product.price)}
            </span>
            <span className="rounded-full bg-[#f7eee7] px-3 py-1 text-xs font-semibold text-[#8b5a2b]">Mua nhanh</span>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
