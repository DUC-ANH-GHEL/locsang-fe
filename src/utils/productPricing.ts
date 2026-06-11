type PriceInput = number | string | null | undefined;

type ProductPriceShape = {
  price?: PriceInput;
  sale_price?: PriceInput;
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

  let currentPrice = salePrice ?? price ?? 0;
  let basePrice = price ?? salePrice ?? currentPrice;

  if (price != null && salePrice != null) {
    if (salePrice < price) {
      currentPrice = salePrice;
      basePrice = price;
    } else {
      currentPrice = price;
      basePrice = price;
    }
  } else if (salePrice != null) {
    currentPrice = salePrice;
    basePrice = salePrice;
  } else if (price != null) {
    currentPrice = price;
    basePrice = price;
  }

  const hasDiscount = basePrice > currentPrice;

  return {
    currentPrice,
    originalPrice: hasDiscount ? basePrice : null,
    hasDiscount,
  };
};
