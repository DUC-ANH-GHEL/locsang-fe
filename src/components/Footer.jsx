import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { homeContentService } from '../services/homeContentService';
import { logo_url } from '../config/api';

const DEFAULT_FOOTER_CONTENT = {
  footer_brand_name: 'Lộc Sang',
  footer_mobile_description: 'Phụ tùng và nhớt Yanmar chính hãng.',
  footer_desktop_caption: 'Phụ tùng và nhớt Yanmar chính hãng, tư vấn trực tiếp bởi Lộc Sang.',
  footer_contact_hotline: '0985763838',
  footer_copyright_text: '© Lộc Sang',
};

const normalizeHotline = (value) => {
  const raw = String(value || DEFAULT_FOOTER_CONTENT.footer_contact_hotline).trim();
  return raw.replace(/^Hotline:\s*/i, '').trim() || DEFAULT_FOOTER_CONTENT.footer_contact_hotline;
};

function Footer() {
  const [footerContent, setFooterContent] = useState(DEFAULT_FOOTER_CONTENT);

  useEffect(() => {
    let cancelled = false;

    const loadFooterContent = async () => {
      try {
        const res = await homeContentService.getPublicHomeContent();
        const content = res?.content || {};
        if (cancelled) return;
        setFooterContent({
          footer_brand_name: String(content.footer_brand_name || DEFAULT_FOOTER_CONTENT.footer_brand_name),
          footer_mobile_description: String(content.footer_mobile_description || DEFAULT_FOOTER_CONTENT.footer_mobile_description),
          footer_desktop_caption: String(content.footer_desktop_caption || DEFAULT_FOOTER_CONTENT.footer_desktop_caption),
          footer_contact_hotline: normalizeHotline(content.footer_contact_hotline),
          footer_copyright_text: String(content.footer_copyright_text || DEFAULT_FOOTER_CONTENT.footer_copyright_text),
        });
      } catch {
        if (!cancelled) setFooterContent(DEFAULT_FOOTER_CONTENT);
      }
    };

    loadFooterContent();
    return () => {
      cancelled = true;
    };
  }, []);

  const hotline = normalizeHotline(footerContent.footer_contact_hotline);

  return (
    <footer className="border-t border-[#eeeeee] bg-white text-[#1f1f1f]">
      <div className="mx-auto flex w-full max-w-[944px] flex-col gap-5 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+6.4rem)] pt-6 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-8 md:pb-8 md:pt-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <img src={`${logo_url}?v=footer-yanmar`} alt="Yanmar Lộc Sang" className="h-9 w-12 shrink-0 object-contain" />
            <div>
              <div className="text-lg font-black text-[#e30613]">{footerContent.footer_brand_name}</div>
              <p className="mt-0.5 max-w-sm text-sm font-medium leading-snug text-[#5f6673] md:hidden">
                {footerContent.footer_mobile_description}
              </p>
              <p className="mt-0.5 hidden max-w-md text-sm font-medium leading-snug text-[#5f6673] md:block">
                {footerContent.footer_desktop_caption}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:justify-end">
          <a
            href={`tel:${hotline.replace(/\s/g, '')}`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#e30613] px-5 text-base font-black text-white shadow-[0_8px_20px_rgba(227,6,19,0.18)] active:scale-[0.98]"
          >
            <Phone size={19} strokeWidth={2.5} />
            Gọi {hotline}
          </a>

          <nav className="flex items-center justify-center gap-4 text-sm font-black text-[#5f6673] sm:justify-start">
            <Link to="/" className="hover:text-[#e30613]">Trang chủ</Link>
            <Link to="/products" className="hover:text-[#e30613]">Sản phẩm</Link>
            <Link to="/checkout" className="hover:text-[#e30613]">Giỏ hàng</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
