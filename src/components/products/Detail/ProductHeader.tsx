import React, {useEffect, useState} from "react";
import { getProductById } from "../../../services/productService";
import { ProductFormData } from "../../../types/product";

type Props = {
    productId: number | null,
    product?: ProductFormData
}
const ProductHeader: React.FC<Props> = ({productId, product}) => {

    return (
        <div className="flex justify-between item-start">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Chi tiết sản phẩm - {product?.name} </h1>
                <p className="text-sm text-slate-500">Mã SKU: {product?.sku}</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded h-fit">
                {product?.is_active == true? "Đang bán" : "Ẩn"}
            </span>
        </div>
    )
};

export default ProductHeader;
