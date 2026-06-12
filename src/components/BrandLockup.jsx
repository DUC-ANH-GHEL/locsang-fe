import { logo_url } from '../config/api';

const BRAND_MARK = `${logo_url}?v=yanmar-wordmark-4`;

const BrandLockup = ({ compact = false, className = '' }) => (
  <div
    className={`flex items-center justify-center ${
      compact ? 'gap-[0.62rem]' : 'gap-[0.78rem]'
    } ${className}`}
    aria-label="Yanmar Lộc Sang"
  >
    <img
      src={BRAND_MARK}
      alt=""
      aria-hidden="true"
      className={`${compact ? 'h-[1.9rem] w-[3.3rem]' : 'h-[2.45rem] w-[4.35rem]'} shrink-0 object-contain`}
    />
    <div className="flex flex-col items-start text-[#d50918]">
      <span
        className={`font-black italic uppercase leading-[0.9] tracking-[-0.02em] ${
          compact ? 'text-[1.48rem] max-[390px]:text-[1.3rem]' : 'text-[2.08rem]'
        }`}
        style={{ fontFamily: 'Arial Black, Arial, sans-serif' }}
      >
        YANMAR
      </span>
      <span
        className={`mt-[0.18rem] font-black uppercase leading-none tracking-[0.015em] ${
          compact ? 'text-[1.05rem] max-[390px]:text-[0.92rem]' : 'text-[1.5rem]'
        }`}
        style={{ fontFamily: 'Arial Black, Arial, sans-serif' }}
      >
        LỘC SANG
      </span>
    </div>
  </div>
);

export default BrandLockup;
