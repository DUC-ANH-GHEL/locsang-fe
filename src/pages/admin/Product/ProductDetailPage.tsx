import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductGallery from "../../../components/products/Detail/ProductGallery";
import { ProductFormData } from "../../../types/product";
import { getProductById } from "../../../services/productService";
import { BadgeCheck, Tag, DollarSign, Layers, ArrowLeft, Info, Ruler, Weight, Maximize2, Link2, FileText, Type, Copy } from 'lucide-react';
import { motion } from 'framer-motion';

const slugify = (value?: string | null) => {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return 'san-pham';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'san-pham';
};

const truncateText = (value: string, maxLength: number) => {
    const text = String(value || '').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1).trim()}...`;
};

const ProductDetail = () => {
    const [product, setProduct] = useState<ProductFormData & Record<string, any>>();
    const {id} = useParams();
    const navigate = useNavigate();

    const goBack = () => {
        navigate('/admin/products');
    }

    useEffect(() => {
        const fetchMethods = async() => {
            try {
                const response = await getProductById(id);
                setProduct(response)
            } catch (error) {
                console.log("Lỗi lấy sản phẩm", error)
            }
        }

        fetchMethods()

    }, [id])

    const seoSlug = useMemo(() => {
        return String(product?.seoSlug || product?.slug || slugify(product?.name)).trim();
    }, [product?.seoSlug, product?.slug, product?.name]);

    const seoTitle = useMemo(() => {
        const manual = String(product?.metaTitle || '').trim();
        if (manual) return manual;
        return truncateText(`${product?.name || 'Sản phẩm'} | Lộc Sang`, 60);
    }, [product?.metaTitle, product?.name]);

    const seoDescription = useMemo(() => {
        const manual = String(product?.metaDescription || '').trim();
        if (manual) return manual;
        const candidate = String(product?.short_description || product?.description || '').replace(/\s+/g, ' ').trim();
        if (!candidate) {
            return 'Khám phá sản phẩm chọn lọc tại Lộc Sang, đặt hàng nhanh và giao hàng toàn quốc.';
        }
        return truncateText(candidate, 155);
    }, [product?.metaDescription, product?.short_description, product?.description]);

    const seoUrl = useMemo(() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://locsang.shop';
        const pid = String(id || '').trim() || '0';
        return `${origin}/products/${pid}/${seoSlug}`;
    }, [id, seoSlug]);

    const copyText = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            alert(`Da copy ${label}`);
        } catch {
            alert(`Khong the copy ${label}`);
        }
    };

    return (
        <div className="mx-auto max-w-6xl">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6 flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                    <Layers size={24} className="text-rose-700 dark:text-rose-200" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{product?.name}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">SKU: {product?.sku}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${product?.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                            <BadgeCheck size={14} className={product?.is_active ? 'text-green-600 dark:text-green-300' : 'text-gray-400'} />
                            {product?.is_active ? 'Đang bán' : 'Ẩn'}
                        </span>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                        <ProductGallery
                            productId={id ? parseInt(id) : null}
                            product={product}
                        />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                                    <DollarSign size={20} className="text-rose-700 dark:text-rose-200" />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Giá bán</div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{product?.price?.toLocaleString()} đ</div>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                                    <Tag size={20} className="text-rose-700 dark:text-rose-200" />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Affiliate</div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{product?.affiliate} %</div>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center gap-3 sm:col-span-2">
                                <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                                    <Layers size={20} className="text-rose-700 dark:text-rose-200" />
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Danh mục</div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{product?.category_id}</div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                            <div className="flex items-start gap-2 text-gray-700 dark:text-gray-200">
                                <Info size={18} className="text-rose-600 dark:text-rose-300 mt-0.5" />
                                <div>
                                    <div className="text-sm font-semibold">Mô tả</div>
                                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{product?.description}</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="mt-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Ruler size={20} className="text-rose-600 dark:text-rose-300" /> Thông số kỹ thuật
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                        <Weight size={18} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-300">Cân nặng</span>
                        <span className="ml-auto font-semibold text-gray-900 dark:text-gray-100">{product?.weight} g</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                        <Maximize2 size={18} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-300">Chiều cao</span>
                        <span className="ml-auto font-semibold text-gray-900 dark:text-gray-100">{product?.height} cm</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                        <Maximize2 size={18} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-300">Chiều rộng</span>
                        <span className="ml-auto font-semibold text-gray-900 dark:text-gray-100">{product?.width} cm</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                        <Maximize2 size={18} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-300">Chiều dài</span>
                        <span className="ml-auto font-semibold text-gray-900 dark:text-gray-100">{product?.length} cm</span>
                    </div>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="mt-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <FileText size={20} className="text-rose-600 dark:text-rose-300" /> SEO Preview
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Link2 size={14} /> SEO Slug</div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 break-all">{seoSlug}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Type size={14} /> Meta Title</div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{seoTitle.length} ky tu</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileText size={14} /> Meta Description</div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{seoDescription.length} ky tu</div>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-950">
                    <div className="text-sm text-emerald-700 dark:text-emerald-300 break-all">{seoUrl}</div>
                    <div className="mt-1 text-lg font-semibold text-blue-700 dark:text-blue-300">{seoTitle}</div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{seoDescription}</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => copyText(seoUrl, 'URL')}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-semibold"
                    >
                        <Copy size={16} /> Copy URL
                    </button>
                    <button
                        type="button"
                        onClick={() => copyText(seoTitle, 'Meta Title')}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-semibold"
                    >
                        <Copy size={16} /> Copy Meta Title
                    </button>
                    <button
                        type="button"
                        onClick={() => copyText(seoDescription, 'Meta Description')}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-semibold"
                    >
                        <Copy size={16} /> Copy Meta Description
                    </button>
                </div>
            </motion.div>

            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                <button onClick={goBack} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <ArrowLeft size={18} /> Trở lại
                </button>
            </div>
        </div>
    );
};
export default ProductDetail;
