import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const typeClassMap: Record<ToastType, string> = {
  success: 'bg-[#4caf50]',
  error: 'bg-[#f44336]',
  warning: 'bg-[#ff9800]',
  info: 'bg-[#2196f3]',
};

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      const toast = document.querySelector('.toast-container');
      if (toast) {
        toast.classList.add('closing');
        setTimeout(onClose, 300);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`toast-container fixed right-5 top-5 z-[1000] flex min-w-[18rem] max-w-[25rem] items-center justify-between rounded-lg px-6 py-4 text-white shadow-md ${typeClassMap[type] || typeClassMap.info}`}
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-4 border-0 bg-transparent p-0 text-xl leading-none text-white/70 transition hover:text-white"
        aria-label="Đóng thông báo"
      >
        &times;
      </button>
    </div>
  );
};

export default Toast;
