import React from 'react';
import { Partner } from '../../types/partner';

interface PartnerLogoProps {
  partner: Partner;
}

const PartnerLogo: React.FC<PartnerLogoProps> = ({ partner }) => {
  return (
    <a
      href={partner.website}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative h-20">
        <img
          src={partner.logo}
          alt={partner.name}
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>
    </a>
  );
};

export default PartnerLogo;
