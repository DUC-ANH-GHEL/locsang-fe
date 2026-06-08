import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './ProductShowcaseTabs.css';
import { FaShoppingCart } from 'react-icons/fa';
import { useCart } from '../../contexts/CartContext';

const IMAGE_DEFAULT_URL = 'https://res.cloudinary.com/diwxfpt92/image/upload/v1770981822/logo_d2wmlf.png';

function ProductShowcaseTabs() {
  const [modalImage, setModalImage] = useState(null);
  const { addToCart } = useCart();
  const cartIconRef = useRef(null);
  const imgRefs = useRef([]);
  const [hoveredIdx, setHoveredIdx] = useState<number|null>(null);

  const products = [
    {
      title: "Xy lanh giữa",
      image: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538306/2_sxq2wa.jpg",
      price: "1.950.000đ",
      aos: "fade-left",
      bg: '#0a2261'
    },
    {
      title: "Xy lanh nghiêng",
      image: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538307/3_nxbqyo.jpg",
      price: "1.950.000đ",
      aos: "fade-down",
      bg: '#0a2261'
    },
    {
      title: "Xy lanh ủi",
      image: "https://res.cloudinary.com/diwxfpt92/image/upload/f_auto,q_auto/v1747538307/4_rj8cv2.jpg",
      price: "2.200.000đ",
      aos: "fade-right",
      bg: '#ffe04b'
    }
  ];

  React.useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true
    });
  }, []);

  // Modal overlay dùng React Portal
  const modal = modalImage ? ReactDOM.createPortal(
    <div className="modal-overlay" onClick={() => setModalImage(null)}>
      <img src={modalImage} alt="Enlarged" className="img-fluid rounded" />
    </div>,
    document.body
  ) : null;

  // Hiệu ứng bay vào giỏ hàng
  const flyToCart = (imgIdx) => {
    const img = imgRefs.current[imgIdx];
    const cartIcon = document.querySelector('.cart-fly-target');
    if (!img || !cartIcon) return;
    const imgRect = img.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();
    const clone = img.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.left = imgRect.left + 'px';
    clone.style.top = imgRect.top + 'px';
    clone.style.width = imgRect.width + 'px';
    clone.style.height = imgRect.height + 'px';
    clone.style.zIndex = 9999;
    clone.style.transition = 'all 0.8s cubic-bezier(.6,-0.28,.74,.05)';
    document.body.appendChild(clone);
    setTimeout(() => {
      clone.style.left = cartRect.left + cartRect.width/2 - imgRect.width/4 + 'px';
      clone.style.top = cartRect.top + cartRect.height/2 - imgRect.height/4 + 'px';
      clone.style.width = imgRect.width/2 + 'px';
      clone.style.height = imgRect.height/2 + 'px';
      clone.style.opacity = 0.5;
    }, 10);
    setTimeout(() => {
      document.body.removeChild(clone);
    }, 850);
  };

  // Thêm vào giỏ hàng
  const handleAddToCart = (prod, e, idx) => {
    e.stopPropagation();
    addToCart({ title: prod.title, image: prod.image, price: prod.price });
    flyToCart(idx);
  };

  return (
    <>
      <section className="product-showcase-section">
        <div className="product-showcase-title">Chi tiết các dòng xy lanh</div>
        <div className="product-showcase-list">
          {products.map((prod, idx) => (
            <div
              className="product-showcase-card"
              key={idx}
              onClick={() => setModalImage(prod.image)}
              data-aos={prod.aos}
              data-aos-delay={idx * 1000}
            >
              <div
                className="product-showcase-imgwrap"
                style={{ background: prod.bg }}
              >
                <img
                  src={prod.image}
                  alt={prod.title}
                  className="product-showcase-img"
                  ref={el => imgRefs.current[idx] = el}
                />
              </div>
              <div className="product-showcase-info">
                <div className="product-showcase-title2">{prod.title}</div>
                <div className="product-showcase-price">{prod.price}</div>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    className="product-showcase-addcart product-showcase-addcart-custom"
                    onClick={(e) => handleAddToCart(prod, e, idx)}
                    aria-label="Mua"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onFocus={() => setHoveredIdx(idx)}
                    onBlur={() => setHoveredIdx(null)}
                  >
                    <FaShoppingCart style={{ fontSize: 18, margin: 0, display: 'block' }} />
                  </button>
                  {hoveredIdx === idx && (
                    <div className="product-tooltip">Mua hàng</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      {modal}
    </>
  );
}

export default ProductShowcaseTabs;
