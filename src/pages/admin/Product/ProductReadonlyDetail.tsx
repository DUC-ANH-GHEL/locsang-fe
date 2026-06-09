import { ArrowLeft, Edit, Image as ImageIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../../components/layout/Breadcrumb';
import { useToast } from '../../../components/Toast';
import { productService } from '../../../services/productService';

const fallbackImage = '/locsang-assets/brand-logo.svg';

const formatCurrency = (value: unknown) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

const getText = (value: unknown, fallback = '-') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const getImageList = (product: any) => {
  const list: string[] = [];
  const push = (value: unknown) => {
    const text = String(value ?? '').trim();
    if (text && !list.includes(text)) list.push(text);
  };

  push(product?.thumbnail);
  if (Array.isArray(product?.images)) {
    product.images.forEach((item: any) => {
      if (typeof item === 'string') push(item);
      else push(item?.url || item?.image_url);
    });
  }
  if (Array.isArray(product?.variants)) {
    product.variants.forEach((variant: any) => push(variant?.image_url || variant?.image));
  }
  return list.length ? list : [fallbackImage];
};

const Field = ({ label, value }: { label: string; value: unknown }) => (
  <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
    <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{getText(value)}</div>
  </div>
);

const ProductReadonlyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await productService.getProductById(id);
        if (mounted) setProduct(data?.data ?? data);
      } catch {
        showToast('Không tải được chi tiết sản phẩm', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, showToast]);

  const images = useMemo(() => getImageList(product), [product]);
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const specs = Array.isArray(product?.specs) ? product.specs : [];

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Đang tải sản phẩm...</div>;
  }

  if (!product) {
    return <div className="p-6 text-sm text-gray-500">Không tìm thấy sản phẩm.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumb items={[{ name: 'Trang chủ', path: '/admin' }, { name: 'Sản phẩm', path: '/admin/products' }, { name: getText(product.name, 'Chi tiết') }]} />

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{getText(product.name)}</h1>
          <p className="mt-1 text-sm text-gray-500">SKU: {getText(product.sku)} | Slug: {getText(product.slug)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate('/admin/products')} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-700">
            <ArrowLeft size={16} /> Quay lại
          </button>
          <button type="button" onClick={() => navigate(`/admin/product/update/${product.id}`)} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
            <Edit size={16} /> Sửa sản phẩm
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Thông tin cơ bản</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Tên sản phẩm" value={product.name} />
              <Field label="Danh mục" value={product.category?.name || product.category_name || product.category} />
              <Field label="Thương hiệu" value={product.brand} />
              <Field label="Trạng thái" value={product.status || (product.is_active ? 'active' : 'inactive')} />
              <Field label="Giá bán" value={formatCurrency(product.sale_price || product.price)} />
              <Field label="Giá gốc" value={formatCurrency(product.original_price || product.compare_price)} />
              <Field label="Tồn kho" value={product.stock} />
              <Field label="Nổi bật" value={product.featured ? 'Có' : 'Không'} />
            </div>
            {product.description && <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-200">{product.description}</div>}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Biến thể và tồn kho</h2>
            {variants.length === 0 ? (
              <div className="text-sm text-gray-500">Sản phẩm chưa có biến thể.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-4">SKU</th>
                      <th className="py-2 pr-4">Tên</th>
                      <th className="py-2 pr-4">Giá</th>
                      <th className="py-2 pr-4">Tồn</th>
                      <th className="py-2 pr-4">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {variants.map((variant: any) => (
                      <tr key={variant.id || variant.sku}>
                        <td className="py-2 pr-4 font-semibold">{getText(variant.sku)}</td>
                        <td className="py-2 pr-4">{getText(variant.variant_name || variant.name || variant.title)}</td>
                        <td className="py-2 pr-4">{formatCurrency(variant.sale_price || variant.price)}</td>
                        <td className="py-2 pr-4">{getText(variant.stock)}</td>
                        <td className="py-2 pr-4">{getText(variant.status || (variant.is_active ? 'active' : 'inactive'))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Thông số và SEO</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Chất liệu" value={product.material} />
              <Field label="Kích thước" value={product.size} />
              <Field label="Màu sắc" value={product.color} />
              <Field label="Cân nặng" value={product.weight} />
              <Field label="Meta title" value={product.meta_title || product.metaTitle} />
              <Field label="Meta description" value={product.meta_description || product.metaDescription} />
            </div>
            {specs.length > 0 && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {specs.map((spec: any, index: number) => (
                  <Field key={`${spec.key || spec.name || index}`} label={getText(spec.key || spec.name, 'Thông số')} value={spec.value} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
            <ImageIcon size={18} /> Media
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {images.map((src) => (
              <div key={src} className="aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                <img src={src} alt={product.name} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ProductReadonlyDetail;
