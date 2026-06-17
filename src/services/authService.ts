import { apiClient } from './apiClient';

export type AdminCurrentUser = {
  id: number;
  email: string;
  full_name: string;
  phone?: string | null;
  is_active?: boolean;
  role_id?: number;
};

export const loginWithApi = async (email: string, password: string) => {
  try {
    const response = await apiClient.post(`/users/login`, {
      email,
      password,
    });
    const token = response.data?.access_token;
    if (!token) throw new Error('Không nhận được token');
    return { success: true, token };
  } catch (error: any) {
    return {
      success: false,
      message: error?.response?.data?.detail || error?.response?.data?.message || 'Đăng nhập không thành công',
    };
  }
};

export const getCurrentAdminUser = async (): Promise<AdminCurrentUser | null> => {
  try {
    const response = await apiClient.get('/users/me', {
      skipGlobalLoading: true,
    } as any);
    return response.data || null;
  } catch {
    return null;
  }
};


export const logout = () => {
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken');
  };

  export const getToken = () =>
    localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
