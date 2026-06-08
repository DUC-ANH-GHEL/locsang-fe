type PriceInput = number | string | null | undefined;

type ProductPriceShape = {
  price?: PriceInput;
  sale_price?: PriceInput;
  original_price?: PriceInput;
};

export type ProductPricing = {
  currentPrice: number;
  originalPrice: number | null;
  hasDiscount: boolean;
};

const toPositiveNumber = (value: PriceInput): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const getProductPricing = (product?: ProductPriceShape | null): ProductPricing => {
  const price = toPositiveNumber(product?.price);
  const salePrice = toPositiveNumber(product?.sale_price);
  const originalPrice = toPositiveNumber(product?.original_price);

  let currentPrice = salePrice ?? price ?? originalPrice ?? 0;
  let basePrice = originalPrice ?? price ?? salePrice ?? currentPrice;

  if (price != null && salePrice != null) {
    if (salePrice < price) {
      currentPrice = salePrice;
      basePrice = originalPrice ?? price;
    } else {
      currentPrice = price;
      basePrice = originalPrice ?? price;
    }
  } else if (salePrice != null) {
    currentPrice = salePrice;
    basePrice = originalPrice ?? salePrice;
  } else if (price != null) {
    currentPrice = price;
    basePrice = originalPrice ?? price;
  } else if (originalPrice != null) {
    currentPrice = originalPrice;
    basePrice = originalPrice;
  }

  if (originalPrice != null) {
    basePrice = Math.max(basePrice, originalPrice);
  }

  const hasDiscount = basePrice > currentPrice;

  return {
    currentPrice,
    originalPrice: hasDiscount ? basePrice : null,
    hasDiscount,
  };
};
