import { Link } from 'react-router-dom';
import { FaInstagram, FaPinterestP, FaFacebookF } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { homeContentService } from '../services/homeContentService';

const DEFAULT_FOOTER_CONTENT = {
  footer_brand_name: 'Lộc Sang',
  footer_desktop_caption: 'Phụ tùng và nhớt Yanmar chính hãng, quản lý trực tiếp bởi Lộc Sang.',
  footer_mobile_description: 'Phụ tùng, lọc nhớt, lọc gió và dầu nhớt Yanmar chính hãng.',
  footer_products_title: 'sản phẩm',
  footer_products_item_1: 'Sản Phẩm Mới',
  footer_products_item_2: 'Ưu Đãi Nổi Bật',
  footer_products_item_3: 'Lọc gió & lọc nhớt',
  footer_products_item_4: 'Dây curoa',
  footer_info_title: 'thông tin',
  footer_info_item_1: 'Thông tin giao hàng',
  footer_info_item_2: 'Chính sách đổi trả',
  footer_info_item_3: 'Hướng dẫn chọn phụ tùng',
  footer_info_item_4: 'Liên hệ Lộc Sang',
  footer_social_title: 'mạng xã hội',
  footer_social_item_1: 'Instagram',
  footer_social_item_2: 'Pinterest',
  footer_social_item_3: 'Facebook',
  footer_social_item_4: 'TikTok',
  footer_social_instagram_url: '#',
  footer_social_pinterest_url: '#',
  footer_social_facebook_url: '#',
  footer_social_tiktok_url: '#',
  footer_policy_title: 'Chính sách',
  footer_policy_item_1: 'Đổi trả 7 ngày',
  footer_policy_item_2: 'Bảo hành 6 tháng',
  footer_policy_item_3: 'Vận chuyển',
  footer_contact_title: 'Liên hệ',
  footer_contact_hotline: 'Hotline: 0966 201 140',
  footer_contact_email: 'Email: locsang@cgnn.vn',
  footer_copyright_text: '© 2024 Lộc Sang. All rights reserved.',
};

const toHref = (value) => {
  const normalized = String(value || '').trim();
  return normalized || '#';
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
          footer_desktop_caption: String(content.footer_desktop_caption || DEFAULT_FOOTER_CONTENT.footer_desktop_caption),
          footer_mobile_description: String(content.footer_mobile_description || DEFAULT_FOOTER_CONTENT.footer_mobile_description),
          footer_products_title: String(content.footer_products_title || DEFAULT_FOOTER_CONTENT.footer_products_title),
          footer_products_item_1: String(content.footer_products_item_1 || DEFAULT_FOOTER_CONTENT.footer_products_item_1),
          footer_products_item_2: String(content.footer_products_item_2 || DEFAULT_FOOTER_CONTENT.footer_products_item_2),
          footer_products_item_3: String(content.footer_products_item_3 || DEFAULT_FOOTER_CONTENT.footer_products_item_3),
          footer_products_item_4: String(content.footer_products_item_4 || DEFAULT_FOOTER_CONTENT.footer_products_item_4),
          footer_info_title: String(content.footer_info_title || DEFAULT_FOOTER_CONTENT.footer_info_title),
          footer_info_item_1: String(content.footer_info_item_1 || DEFAULT_FOOTER_CONTENT.footer_info_item_1),
          footer_info_item_2: String(content.footer_info_item_2 || DEFAULT_FOOTER_CONTENT.footer_info_item_2),
          footer_info_item_3: String(content.footer_info_item_3 || DEFAULT_FOOTER_CONTENT.footer_info_item_3),
          footer_info_item_4: String(content.footer_info_item_4 || DEFAULT_FOOTER_CONTENT.footer_info_item_4),
          footer_social_title: String(content.footer_social_title || DEFAULT_FOOTER_CONTENT.footer_social_title),
          footer_social_item_1: String(content.footer_social_item_1 || DEFAULT_FOOTER_CONTENT.footer_social_item_1),
          footer_social_item_2: String(content.footer_social_item_2 || DEFAULT_FOOTER_CONTENT.footer_social_item_2),
          footer_social_item_3: String(content.footer_social_item_3 || DEFAULT_FOOTER_CONTENT.footer_social_item_3),
          footer_social_item_4: String(content.footer_social_item_4 || DEFAULT_FOOTER_CONTENT.footer_social_item_4),
          footer_social_instagram_url: String(content.footer_social_instagram_url || DEFAULT_FOOTER_CONTENT.footer_social_instagram_url),
          footer_social_pinterest_url: String(content.footer_social_pinterest_url || DEFAULT_FOOTER_CONTENT.footer_social_pinterest_url),
          footer_social_facebook_url: String(content.footer_social_facebook_url || DEFAULT_FOOTER_CONTENT.footer_social_facebook_url),
          footer_social_tiktok_url: String(content.footer_social_tiktok_url || DEFAULT_FOOTER_CONTENT.footer_social_tiktok_url),
          footer_policy_title: String(content.footer_policy_title || DEFAULT_FOOTER_CONTENT.footer_policy_title),
          footer_policy_item_1: String(content.footer_policy_item_1 || DEFAULT_FOOTER_CONTENT.footer_policy_item_1),
          footer_policy_item_2: String(content.footer_policy_item_2 || DEFAULT_FOOTER_CONTENT.footer_policy_item_2),
          footer_policy_item_3: String(content.footer_policy_item_3 || DEFAULT_FOOTER_CONTENT.footer_policy_item_3),
          footer_contact_title: String(content.footer_contact_title || DEFAULT_FOOTER_CONTENT.footer_contact_title),
          footer_contact_hotline: String(content.footer_contact_hotline || DEFAULT_FOOTER_CONTENT.footer_contact_hotline),
          footer_contact_email: String(content.footer_contact_email || DEFAULT_FOOTER_CONTENT.footer_contact_email),
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

  return (
    <footer className="mt-16 bg-[#efe7db] text-[#4a443b]">
      <div className="mx-auto hidden max-w-7xl px-8 py-14 md:block">
        <div className="grid grid-cols-[1.3fr_2fr] gap-10">
          <div>
            <div className="text-xl font-extrabold text-[#8a4f41]">{footerContent.footer_brand_name}</div>
            <p className="mt-3 max-w-sm text-[10px] text-[#7a756a]">{footerContent.footer_desktop_caption}</p>
            <div className="mt-5 flex items-center gap-2 text-[#8a4f41]">
              <a href={toHref(footerContent.footer_social_instagram_url)} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#8a4f41]/10 hover:bg-[#8a4f41] hover:text-white transition" aria-label="Instagram">
                <FaInstagram size={13} />
              </a>
              <a href={toHref(footerContent.footer_social_pinterest_url)} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#8a4f41]/10 hover:bg-[#8a4f41] hover:text-white transition" aria-label="Pinterest">
                <FaPinterestP size={13} />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="mb-3 text-sm font-semibold lowercase">{footerContent.footer_products_title}</div>
              <ul className="space-y-2 text-[12px] text-[#7a756a]">
                <li><Link to="/products">{footerContent.footer_products_item_1}</Link></li>
                <li><Link to="/products">{footerContent.footer_products_item_2}</Link></li>
                <li><Link to="/products">{footerContent.footer_products_item_3}</Link></li>
                <li><Link to="/products">{footerContent.footer_products_item_4}</Link></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold lowercase">{footerContent.footer_info_title}</div>
              <ul className="space-y-2 text-[12px] text-[#7a756a]">
                <li><a href="#">{footerContent.footer_info_item_1}</a></li>
                <li><a href="#">{footerContent.footer_info_item_2}</a></li>
                <li><a href="#">{footerContent.footer_info_item_3}</a></li>
                <li><span>{footerContent.footer_info_item_4}</span></li>
              </ul>
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold lowercase">{footerContent.footer_social_title}</div>
              <ul className="space-y-2 text-[12px] text-[#7a756a]">
                <li><a href={toHref(footerContent.footer_social_instagram_url)} target="_blank" rel="noreferrer">{footerContent.footer_social_item_1}</a></li>
                <li><a href={toHref(footerContent.footer_social_pinterest_url)} target="_blank" rel="noreferrer">{footerContent.footer_social_item_2}</a></li>
                <li><a href={toHref(footerContent.footer_social_facebook_url)} target="_blank" rel="noreferrer">{footerContent.footer_social_item_3}</a></li>
                <li><a href={toHref(footerContent.footer_social_tiktok_url)} target="_blank" rel="noreferrer">{footerContent.footer_social_item_4}</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl rounded-t-[2rem] px-4 pb-24 pt-7 md:hidden">
        <div className="text-xl font-extrabold text-[#8a4f41]">{footerContent.footer_brand_name}</div>
        <p className="mt-3 text-sm text-[#7a756a]">{footerContent.footer_mobile_description}</p>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <div className="mb-2 font-bold">{footerContent.footer_policy_title}</div>
            <ul className="space-y-1.5 text-sm text-[#7a756a]">
              <li>{footerContent.footer_policy_item_1}</li>
              <li>{footerContent.footer_policy_item_2}</li>
              <li>{footerContent.footer_policy_item_3}</li>
            </ul>
          </div>
          <div>
            <div className="mb-2 font-bold">{footerContent.footer_contact_title}</div>
            <ul className="space-y-1.5 text-sm text-[#7a756a]">
              <li>{footerContent.footer_contact_hotline}</li>
              <li>{footerContent.footer_contact_email}</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 text-[#8a4f41]">
          <a href={toHref(footerContent.footer_social_instagram_url)} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white" aria-label="Instagram">
            <FaInstagram size={12} />
          </a>
          <a href={toHref(footerContent.footer_social_facebook_url)} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white" aria-label="Facebook">
            <FaFacebookF size={12} />
          </a>
          <a href={`mailto:${String(footerContent.footer_contact_email || '').replace(/^Email:\s*/i, '')}`} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white" aria-label="Mail">
            <span className="text-[11px] font-bold">@</span>
          </a>
        </div>

        <div className="mt-6 text-center text-[10px] text-[#9c968b]">{footerContent.footer_copyright_text}</div>
      </div>
    </footer>
  );
}

export default Footer;
