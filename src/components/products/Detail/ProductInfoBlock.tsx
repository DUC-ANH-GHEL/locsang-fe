import React from "react";
import { ProductFormData } from "../../../types/product";

type Props = {
    product? : ProductFormData
}
const ProductInfoBlock: React.FC<Props> = ({product}) => {
    return (
        <div className="space-y-4 bg-white rounded py-2 px-2">
            <label className=" font-bold">Mô tả</label>
            <p className="text-slate-600">{product?.description}</p>

        </div>
    );
};

export default ProductInfoBlock;
