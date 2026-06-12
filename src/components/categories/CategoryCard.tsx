import React from 'react';
import { Link } from 'react-router-dom';
import { Category } from '../../types/category';
import { CategoryIconPreview, isCategoryImageUrl } from '../../utils/categoryIcons';

interface CategoryCardProps {
  category: Category;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  const hasPhoto = isCategoryImageUrl(category.image);

  return (
    <Link to={`/categories/${category.slug}`}>
      <div className="relative rounded-lg overflow-hidden group">
        <div className="relative pb-[75%]">
          {hasPhoto ? (
            <img
              src={category.image || ''}
              alt={category.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-rose-50">
              <CategoryIconPreview
                name={category.name}
                value={category.image}
                size={58}
                iconClassName="text-rose-600"
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h3 className="text-xl font-semibold mb-2">{category.name}</h3>
            <p className="text-sm text-gray-200 line-clamp-2">
              {category.description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;
