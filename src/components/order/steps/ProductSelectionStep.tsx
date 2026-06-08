// // 📁 src/components/order/steps/ProductSelectionStep.tsx
// import React, { useState, useEffect } from 'react';
// import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
// import { Product } from '../../../types/order';
// import { getProducts } from '../../../services/productService';

// type Props = {
//   selectedProducts: Product[];
//   onNext: (selected: Product[]) => void;
//   onPrev: () => void;
// };

// const ProductSelectionStep: React.FC<Props> = ({ selectedProducts: initial, onNext, onPrev }) => {
//   const [selectedProducts, setSelectedProducts] = useState<Product[]>(initial);
//   const [productList, setProductList] = useState<Product[]>([]);
//   const [search, setSearch] = useState('');
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     setSelectedProducts(initial);
//   }, [initial]);

//   useEffect(() => {
//     fetchProducts();
//   }, [search]);

//   const fetchProducts = async () => {
//     setLoading(true);
//     try {
//       const res = await getProducts({ search, status: true });
//     //   const list = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
//     const list = Array.isArray(res?.data) ? res.data : [];

//       setProductList(list);
//     } catch (err) {
//       console.error('Lỗi lấy danh sách sản phẩm:', err);
//       setProductList([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const addProduct = (product: Product) => {
//     const exists = selectedProducts.find(p => p.id === product.id);
//     if (exists) {
//       setSelectedProducts(prev =>
//         prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p)
//       );
//     } else {
//       setSelectedProducts(prev => [...prev, { ...product, quantity: 1 }]);
//     }
//   };

//   const removeProduct = (id: string) => setSelectedProducts(prev => prev.filter(p => p.id !== id));
//   const updateQuantity = (id: string, quantity: number) =>
//     setSelectedProducts(prev => prev.map(p => p.id === id ? { ...p, quantity } : p));

//   return (
//     <div className="bg-white p-6 rounded-lg shadow mb-6">
//       <h2 className="text-lg font-semibold mb-4">2. Chọn sản phẩm</h2>

//       <input
//         type="text"
//         placeholder="Tìm kiếm sản phẩm..."
//         value={search}
//         onChange={(e) => setSearch(e.target.value)}
//         className="w-full border px-3 py-2 rounded mb-4"
//       />

//       {loading ? (
//         <p>Đang tải sản phẩm...</p>
//       ) : (
//         <div className="grid gap-2 mb-4">
//           {productList.map(product => (
//             <div key={product.id} className="flex justify-between items-center border rounded px-3 py-2">
//               <div>
//                 <div className="font-medium">{product.name}</div>
//                 <div className="text-sm text-gray-600">{product.price?.toLocaleString()}đ</div>
//               </div>
//               <button onClick={() => addProduct(product)} className="bg-gray-100 p-2 rounded hover:bg-gray-200">
//                 <Plus className="h-4 w-4" />
//               </button>
//             </div>
//           ))}
//         </div>
//       )}

//       {selectedProducts.length > 0 && (
//         <div className="mb-4 border rounded">
//           <table className="w-full text-sm">
//             <thead className="bg-gray-50">
//               <tr>
//                 <th className="p-2 text-left">Tên</th>
//                 <th className="p-2 text-right">Đơn giá</th>
//                 <th className="p-2 text-center">SL</th>
//                 <th className="p-2 text-right">Thành tiền</th>
//                 <th className="p-2"></th>
//               </tr>
//             </thead>
//             <tbody>
//               {selectedProducts.map(p => (
//                 <tr key={p.id}>
//                   <td className="p-2">{p.name}</td>
//                   <td className="p-2 text-right">{p.price?.toLocaleString()}đ</td>
//                   <td className="p-2 text-center">
//                     <input
//                       type="number"
//                       value={p.quantity}
//                       min={1}
//                       onChange={e => updateQuantity(p.id, parseInt(e.target.value))}
//                       className="w-16 text-center border rounded"
//                     />
//                   </td>
//                   <td className="p-2 text-right">{(p.price * p.quantity).toLocaleString()}đ</td>
//                   <td className="p-2 text-center">
//                     <button onClick={() => removeProduct(p.id)} className="text-red-600 hover:text-red-800">
//                       <X className="h-4 w-4" />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       <div className="mt-6 flex justify-between">
//         <button onClick={onPrev} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">
//           <ChevronLeft className="h-4 w-4" /> Quay lại
//         </button>
//         <button
//           onClick={() => onNext(selectedProducts)}
//           disabled={selectedProducts.length === 0}
//           className={`px-4 py-2 rounded ${
//             selectedProducts.length > 0
//               ? 'bg-emerald-600 text-white hover:bg-emerald-700'
//               : 'bg-gray-300 text-gray-500 cursor-not-allowed'
//           }`}
//         >
//           Tiếp theo <ChevronRight className="h-4 w-4" />
//         </button>
//       </div>
//     </div>
//   );
// };

// export default ProductSelectionStep;

// 📁 src/components/order/steps/ProductSelectionStep.tsx
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Product } from '../../../types/order';
import { getProducts } from '../../../services/productService';

type Props = {
  selectedProducts: Product[];
  onNext: (selected: Product[]) => void;
  onPrev: () => void;
};

const ProductSelectionStep: React.FC<Props> = ({ selectedProducts: initial, onNext, onPrev }) => {
  const [selectedProducts, setSelectedProducts] = useState<Product[]>(initial);
  const [productList, setProductList] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 2;

  useEffect(() => {
    setSelectedProducts(initial);
  }, [initial]);

  useEffect(() => {
    fetchProducts();
  }, [search, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await getProducts({ search, status: true, page, limit });
      const list = Array.isArray(res?.data) ? res.data : [];
      setProductList(list);
      setTotal(res?.total || 0);
    } catch (err) {
      console.error('Lỗi lấy danh sách sản phẩm:', err);
      setProductList([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const addProduct = (product: Product) => {
    const exists = selectedProducts.find(p => p.id === product.id);
    if (exists) {
      setSelectedProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p)
      );
    } else {
      setSelectedProducts(prev => [...prev, { ...product, quantity: 1 }]);
    }
  };

  const removeProduct = (id: string) => setSelectedProducts(prev => prev.filter(p => p.id !== id));
  const updateQuantity = (id: string, quantity: number) =>
    setSelectedProducts(prev => prev.map(p => p.id === id ? { ...p, quantity } : p));

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-lg font-semibold mb-4">2. Chọn sản phẩm</h2>

      <input
        type="text"
        placeholder="Tìm kiếm sản phẩm..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="w-full border px-3 py-2 rounded mb-4"
      />

      {loading ? (
        <p>Đang tải sản phẩm...</p>
      ) : (
        <div className="grid gap-2 mb-4">
          {productList.map(product => (
            <div key={product.id} className="flex justify-between items-center border rounded px-3 py-2">
              <div>
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-gray-600">{product.price?.toLocaleString()}đ</div>
              </div>
              <button onClick={() => addProduct(product)} className="bg-gray-100 p-2 rounded hover:bg-gray-200">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Trang trước
              </button>
              <span className="px-2 py-1">Trang {page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Trang sau
              </button>
            </div>
          )}
        </div>
      )}

      {selectedProducts.length > 0 && (
        <div className="mb-4 border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Tên</th>
                <th className="p-2 text-right">Đơn giá</th>
                <th className="p-2 text-center">SL</th>
                <th className="p-2 text-right">Thành tiền</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {selectedProducts.map(p => (
                <tr key={p.id}>
                  <td className="p-2">{p.name}</td>
                  <td className="p-2 text-right">{p.price?.toLocaleString()}đ</td>
                  <td className="p-2 text-center">
                    <input
                      type="number"
                      value={p.quantity}
                      min={1}
                      onChange={e => updateQuantity(p.id, parseInt(e.target.value))}
                      className="w-16 text-center border rounded"
                    />
                  </td>
                  <td className="p-2 text-right">{(p.price * p.quantity).toLocaleString()}đ</td>
                  <td className="p-2 text-center">
                    <button onClick={() => removeProduct(p.id)} className="text-red-600 hover:text-red-800">
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button onClick={onPrev} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">
          <ChevronLeft className="h-4 w-4" /> Quay lại
        </button>
        <button
          onClick={() => onNext(selectedProducts)}
          disabled={selectedProducts.length === 0}
          className={`px-4 py-2 rounded ${
            selectedProducts.length > 0
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Tiếp theo <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ProductSelectionStep;
