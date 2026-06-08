import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithApi } from '../services/authService';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await loginWithApi(formData.email, formData.password);
      if (response?.token) {
        localStorage.setItem('token', response.token);
        navigate('/');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>Login Component</div>
  );
};

export default Login;
