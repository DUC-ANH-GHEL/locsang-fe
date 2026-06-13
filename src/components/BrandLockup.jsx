import { logo_url } from '../config/api';

const BRAND_MARK = `${logo_url}?v=yanmar-wordmark-4`;

const BrandLockup = ({ compact = false, className = '' }) => (
  <div
    className={`flex items-center justify-center ${
      compact ? 'gap-[0.58rem]' : 'gap-[0.72rem]'
    } ${className}`}
    aria-label="Yanmar Lộc Sang"
  >
    <img
      src={BRAND_MARK}
      alt=""
      aria-hidden="true"
      className={`${compact ? 'h-[2rem] w-[3.45rem]' : 'h-[2.55rem] w-[4.45rem]'} shrink-0 object-contain`}
    />
    <div className="flex flex-col items-start text-[#d50918]">
      <span
        className={`font-black italic uppercase leading-[0.9] tracking-[-0.02em] ${
          compact ? 'text-[1.42rem] max-[390px]:text-[1.26rem]' : 'text-[2rem]'
        }`}
        style={{ fontFamily: 'Arial Black, Arial, sans-serif' }}
      >
        YANMAR
      </span>
      <span
        className={`mt-[0.08rem] font-black italic uppercase leading-[0.9] tracking-[-0.02em] ${
          compact ? 'text-[1.42rem] max-[390px]:text-[1.26rem]' : 'text-[2rem]'
        }`}
        style={{
          fontFamily: 'Arial Black, Arial, sans-serif',
          WebkitTextStroke: compact ? '0.18px currentColor' : '0.24px currentColor',
          textShadow: '0 0 0 currentColor',
        }}
      >
        LỘC SANG
      </span>
    </div>
  </div>
);

export default BrandLockup;
