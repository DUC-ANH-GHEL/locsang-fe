import ProductForm from "../../../components/products/ProductForm";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../../components/Toast";

type CreateProductProps = {
  readOnly?: boolean;
};

const CreateProduct = ({ readOnly = false }: CreateProductProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isUpdate = Boolean(id);

  const handleSuccess = () => {
    if (readOnly) {
      navigate('/admin/products');
      return;
    }
    showToast(isUpdate ? 'Cập nhật sản phẩm thành công!' : 'Tạo sản phẩm thành công!', 'success');
    navigate('/admin/products');
  };

  const handleCancel = () => {
    showToast('Đã hủy thao tác.', 'info');
    navigate('/admin/products');
  };

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="sr-only">
        {readOnly ? 'Chi tiết sản phẩm' : isUpdate ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm mới'}
      </h1>
      <ProductForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        id={id ? Number(id) : null}
        readOnly={readOnly}
      />
    </div>
  );
};

export default CreateProduct;
