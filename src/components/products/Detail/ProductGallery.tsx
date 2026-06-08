import React, {useState, useRef, useEffect} from "react";
import { ProductFormData, ProductImage } from "../../../types/product";
import { getProductImageByProductId, getProductById } from "../../../services/productService";

type Props = {
    productId: number | null,
    product?: ProductFormData
}
const ProductGallery : React.FC<Props> = ({productId, product}) => {
    const [images, setImages] = useState<ProductImage[]>([]);
    const [active, setActive] = useState(images[0]);

    const thumbsRef = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const index = images.findIndex(x => x.id == active.id);
        thumbsRef.current[index]?.scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
            block: 'nearest'
        })
    }, [active]);

    useEffect(() => {
        const fetchMethods = async()=> {
            try {
                const images = await getProductImageByProductId(productId);
                setImages(images)
                setActive(images[0])
                console.log(images)
            } catch (error) {
                console.log("Lỗi lấy image", error)
            }
        }

        fetchMethods()
    }, [productId])
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-2 gap-4">
            <div className="w-full max-w-md mx-auto">
                {/* ảnh chính */}
                <div className="relative aspect-square overflow-hidden mb-4 rounded-mb border">
                    <img src={active?.image_url} alt="preview" className="w-full h-full object-container" />
                    {/* {active.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    )} */}
                </div>
                {/* thumbnail */}
                <div className="flex gap-2 overflow-hidden">
                    {images.map((item, i) => (
                        <div
                        key={i}
                        ref={(el) => {
                            (thumbsRef.current[i] = el)} // Arrow function => mặc định sẽ trả về giá trị nếu không có { } block.
                        }
                        onClick={() => setActive(item)}>
                            <img src={item?.image_url} alt="thumbnal" className="min-w-[64px] rounded h-16" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="space-y-4">
                <div className="bg-white rounded py-2 px-2">
                    <label className="text-sm font-medium text-slate-600">Giá bán</label>
                    <p className="font-bold text-lg">{product?.price.toLocaleString()} đ</p>
                </div>
                <div className="bg-white rouned object-cover py-2 px-2">
                    <label className="text-sm font-medium text-slate-600">Danh mục</label>
                    <p className="font-bold text-lg">Ty xy lanh</p>
                </div>
                <div className="bg-white py-2 px-2">
                    <label className="font-medium text-sm text-slate-600">Affiliate</label>
                    <p className="font-bold">{product?.affiliate} %</p>
                </div>
            </div>
        </div>
    )
}

export default ProductGallery;
