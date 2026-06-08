import React from "react";
import { ProductFormData } from "../../../types/product";

type Props = {
    product? : ProductFormData
}
const ProductSpec: React.FC<Props> = ({product}) => {
    return (
        <div className="py-2 px-2 bg-white">
            <label className="font-bold">Thông số kỹ thuật</label>
            <table className="min-w-full table-auto border-collapse border border-gray-200 rounded-md">
                <thead>
                <tr>
                    <td className="border text-slate-600">Thông số</td>
                    <td className="border text-slate-600">Giá trị</td>
                </tr>
                </thead>
                <tbody className="text-sm text-gray-800">
                    <tr>
                        <td className="border font-md">Cân nặng</td>
                        <td className="border">{product?.weight} g</td>
                    </tr>
                    <tr>
                        <td className="border font-md">Chiều cao</td>
                        <td className="border">{product?.height} cm</td>
                    </tr>
                    <tr>
                        <td className="border font-md">Chiều rộng</td>
                        <td className="border">{product?.width} cm</td>
                    </tr>
                    <tr>
                        <td className="border font-md">Chiều dài</td>
                        <td className="border">{product?.length} cm</td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

export default ProductSpec;
