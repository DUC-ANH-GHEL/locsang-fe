import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const ToastContainer = styled.div<{ type: ToastType }>`
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px 24px;
  border-radius: 8px;
  background-color: ${({ type }) => {
    switch (type) {
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      case 'info':
        return '#2196f3';
      default:
        return '#2196f3';
    }
  }};
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  animation: ${slideIn} 0.3s ease-in-out;
  min-width: 300px;
  max-width: 400px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &.closing {
    animation: ${slideOut} 0.3s ease-in-out forwards;
  }
`;

const Message = styled.span`
  font-size: 14px;
  font-weight: 500;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
  margin-left: 16px;
  font-size: 20px;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

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
    <ToastContainer className="toast-container" type={type}>
      <Message>{message}</Message>
      <CloseButton onClick={onClose}>&times;</CloseButton>
    </ToastContainer>
  );
};

export default Toast;
