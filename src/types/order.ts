export type Customer = {
  id: string;
  phone: string;
  name: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type Address = {
  province: number;
  district: number;
  ward: number;
  detail: string;
  receiverPhone: string;
};

// export type ShippingMethod = 'standard' | 'economy' | 'express';
export type ShippingMethod = {
  // method: string;
  // fee: number;
  // estimatedDelivery: string;
  SERVICE_CODE: string,
  SERVICE_NAME: string,
  MONEY_TOTAL_OLD: Number;
  MONEY_TOTAL: Number;
  MONEY_TOTAL_FEE: Number;
  MONEY_FEE: Number;
  MONEY_COLLECTION_FEE: Number;
  MONEY_OTHER_FEE: Number;
  MONEY_VAS: Number;
  MONEY_VAT: Number;
  KPI_HT: Number;
  TOTAL_FEE: number
};

export type OrderState = {
  step: number;
  customer: Customer | null;
  products: Product[];
  address: Address;
  // shipping: {
  //   method: string;
  //   fee: number;
  //   estimatedDelivery: string;
  // };
  shipping: ShippingMethod;
  note: string;
};

export type ShippingServiceInput = {
  PRODUCT_WEIGHT: number;
  PRODUCT_PRICE: number;
  MONEY_COLLECTION: number;
  ORDER_SERVICE_ADD: string;
  ORDER_SERVICE: string;
  SENDER_PROVINCE: string;
  SENDER_DISTRICT: string;
  RECEIVER_PROVINCE: string;
  RECEIVER_DISTRICT: string;
  PRODUCT_TYPE: string;
  NATIONAL_TYPE: number;
};


export type OrderPayload = {
  items: {
    product_id: string;
    quantity: number;
  }[];
  payment_method: string;
  note: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_province_id: number;
  receiver_district_id: number;
  receiver_ward_id: number;
};
