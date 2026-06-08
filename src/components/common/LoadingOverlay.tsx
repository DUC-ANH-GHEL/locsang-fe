import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, text = 'Đang xử lý...' }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-700 font-medium">{text}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
