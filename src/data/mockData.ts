// Sample data for dashboard
export const revenueData = [
    { name: '8/4', sales: 8500000 },
    { name: '9/4', sales: 7200000 },
    { name: '10/4', sales: 9800000 },
    { name: '11/4', sales: 10500000 },
    { name: '12/4', sales: 11200000 },
    { name: '13/4', sales: 10800000 },
    { name: '14/4', sales: 12500000 },
  ];

  export const topProducts = [
    { id: 1, name: 'Ty giữa 28', image: '/api/placeholder/50/50', sales: 120, growth: 15 },
    { id: 2, name: 'Keo dán sắt', image: '/api/placeholder/50/50', sales: 95, growth: 8 },
    { id: 3, name: 'Ống nhựa PVC', image: '/api/placeholder/50/50', sales: 80, growth: -5 },
    { id: 4, name: 'Bóng đèn LED', image: '/api/placeholder/50/50', sales: 65, growth: 12 },
  ];

  export const topCustomers = [
    { id: 1, name: 'Nguyễn Văn A', avatar: '/api/placeholder/40/40', orders: 28, spent: 18500000 },
    { id: 2, name: 'Trần Thị B', avatar: '/api/placeholder/40/40', orders: 22, spent: 14200000 },
    { id: 3, name: 'Lê Minh C', avatar: '/api/placeholder/40/40', orders: 19, spent: 12700000 },
    { id: 4, name: 'Phạm Hoàng D', avatar: '/api/placeholder/40/40', orders: 16, spent: 9800000 },
  ];

  export const recentOrders = [
    { id: 'DH-2045', customer: 'Nguyễn Văn A', mainProduct: 'Ty giữa 28', total: 1250000, status: 'processed' },
    { id: 'DH-2044', customer: 'Trần Thị B', mainProduct: 'Keo dán sắt', total: 880000, status: 'processed' },
    { id: 'DH-2043', customer: 'Phan Văn C', mainProduct: 'Bóng đèn LED', total: 650000, status: 'cancelled' },
    { id: 'DH-2042', customer: 'Lê Xuân D', mainProduct: 'Ống nhựa PVC', total: 1380000, status: 'processed' },
    { id: 'DH-2041', customer: 'Vũ Thị E', mainProduct: 'Ty giữa 28', total: 1250000, status: 'processed' },
  ];

  // Helper function to format currency
  export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };
