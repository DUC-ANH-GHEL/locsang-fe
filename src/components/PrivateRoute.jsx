// src/components/PrivateRoute.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const PrivateRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      if (!token) {
        setValid(false);
        setLoading(false);
        return;
      }

      try {
        await axios.get(`${String(API_BASE_URL || '').replace(/\/+$/, '')}/users/verify-token`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setValid(true);
      } catch {
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminToken');
        setValid(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) return <div>Đang kiểm tra đăng nhập...</div>;
  return valid ? children : <Navigate to="/admin/login" />;
};

export default PrivateRoute;
