import React from 'react';
import { Link } from 'react-router-dom';
import { News } from '../../types/news';

interface NewsCardProps {
  news: News;
}

const NewsCard: React.FC<NewsCardProps> = ({ news }) => {
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={`/news/${news.slug}`}>
        <div className="relative pb-[60%]">
          <img
            src={news.image}
            alt={news.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <div className="p-6">
          <div className="text-sm text-gray-500 mb-2">
            {formatDate(news.created_at)}
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-3 line-clamp-2">
            {news.title}
          </h3>
          <p className="text-gray-600 line-clamp-3">
            {news.content}
          </p>
        </div>
      </Link>
    </div>
  );
};

export default NewsCard;
