import React from "react";
import { FaShoppingCart } from 'react-icons/fa';
import './HydraulicBladeProducts.css';

function HydraulicBladeProducts() {
  const products = [
    { stt: 62, name: "Trang Trượt van 4 tay KTM 4 xylanh Lắp trên xới", code: "KTM-62", price: "21,200,000" },
    { stt: 63, name: "Trang Gập Van tay KTM 4 xylanh Lắp trên xới", code: "KTM-63", price: "23,200,000" },
    { stt: 64, name: "Trang Gập Van 4 tay KTM 2 xylanh nâng lắp trên xới", code: "KTM-64", price: "16,500,000" },
    { stt: 65, name: "Trang Trượt Van 4 tay KTM + bừa lăn KTM", code: "KTM-65", price: "24,200,000" },
    { stt: 66, name: "Trang Trượt Van 4 tay KTM + bừa lăn KTM", code: "KTM-66", price: "26,200,000" },
    { stt: 67, name: "Trang Trượt Van 4 tay KTM + bừa đinh KTM", code: "KTM-67", price: "22,700,000" },
    { stt: 68, name: "Trang Gập Van 4 tay KTM + bừa đinh KTM", code: "KTM-68", price: "24,700,000" },
    { stt: 69, name: "Trang Trượt Van 4 tay KTM + Khung độc lập", code: "KTM-69", price: "21,500,000" },
    { stt: 70, name: "Trang Gập KTM Van 4 tay + Khung độc lập", code: "KTM-70", price: "23,500,000" },
    { stt: 71, name: "Bộ trang KTM Van 4 tay thêm xy lanh nghiêng (giữa)", code: "KTM-71", price: "2,000,000" },
    { stt: 72, name: "Bộ trang KTM van 4 tay chuyển thêm 5 tay + 500k", code: "KTM-72", price: "500,000" },
    { stt: 73, name: "Bộ trang KTM van 4 tay chuyển thêm 6 tay + 1.000.000", code: "KTM-73", price: "1,000,000" },
  ];

  const [searchTerm, setSearchTerm] = React.useState("");

  // Hàm bỏ dấu tiếng Việt
  const removeAccents = (str) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filteredProducts = products.filter((prod) => {
    const keywords = searchTerm.split(/[\s,]+/).map(k => removeAccents(k.trim())).filter(k => k !== "");
    if (keywords.length === 0) return true;
    const searchable = [prod.name, prod.code, prod.stt.toString()].map(removeAccents).join(" ");
    return keywords.every(keyword => searchable.includes(keyword));
  });

  return (
    <section className="hydraulic-blade-section py-5">
      <div className="hydraulic-blade-centerwrap">
        <h2 className="fw-bold text-center mb-4 hydraulic-blade-title">TRANG GẠT THỦY LỰC KTM</h2>
        <div className="hydraulic-blade-flexbox">
          {/* Cột bên trái: ảnh */}
          <div className="hydraulic-blade-imgcol">
            <div className="hydraulic-blade-imgbox">
              <img
                src="https://res.cloudinary.com/diwxfpt92/image/upload/v1749135668/trang_g%E1%BA%A1t_wleewb.jpg"
                alt="Trang Gạt Thủy Lực KTM"
                className="hydraulic-blade-img"
              />
              <div className="hydraulic-blade-caption">Hình ảnh thực tế các mẫu trang gạt lắp trên máy</div>
            </div>
          </div>
          {/* Cột bên phải: bảng sản phẩm */}
          <div className="hydraulic-blade-tablecol">
            <div className="hydraulic-blade-table-searchbox">
              <input
                type="text"
                className="form-control hydraulic-blade-search"
                placeholder="Tìm kiếm sản phẩm hoặc mã số..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="hydraulic-blade-table-wrap">
              <table className="table hydraulic-blade-table">
                <thead className="table-blade-header">
                  <tr>
                    <th scope="col" className="text-center stt-col">STT</th>
                    <th scope="col">Tên sản phẩm</th>
                    <th scope="col" className="text-end price-col">Giá bán</th>
                    <th scope="col" className="text-center">Đặt hàng</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((prod, idx) => (
                      <tr key={idx} className="hydraulic-blade-row-item">
                        <td className="text-center fw-bold stt-col">{prod.stt}</td>
                        <td>{prod.name}</td>
                        <td className="text-end text-warning fw-bold hydraulic-blade-price price-col">{prod.price} đ</td>
                        <td className="text-center">
                          <a
                            href={`https://zalo.me/0966201140?message=${encodeURIComponent("Tôi muốn mua: " + prod.name + " - " + prod.price + "đ")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn hydraulic-blade-buybtn-gradient"
                          >
                            <FaShoppingCart className="me-2 mb-1" style={{ fontSize: 17 }} />
                            Chọn mua
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-3">
                        Không tìm thấy sản phẩm phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HydraulicBladeProducts;
