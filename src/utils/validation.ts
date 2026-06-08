export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  email?: boolean;
  phone?: boolean;
  custom?: (value: any) => boolean;
  message?: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface ValidationErrors {
  [key: string]: string;
}

export const validateField = (value: any, rules: ValidationRule): string | null => {
  if (rules.required && (!value || value.toString().trim() === '')) {
    return rules.message || 'Trường này là bắt buộc';
  }

  if (value) {
    if (rules.minLength && value.length < rules.minLength) {
      return rules.message || `Tối thiểu ${rules.minLength} ký tự`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return rules.message || `Tối đa ${rules.maxLength} ký tự`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.message || 'Giá trị không hợp lệ';
    }

    if (rules.min !== undefined && Number(value) < rules.min) {
      return rules.message || `Giá trị tối thiểu là ${rules.min}`;
    }

    if (rules.max !== undefined && Number(value) > rules.max) {
      return rules.message || `Giá trị tối đa là ${rules.max}`;
    }

    if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return rules.message || 'Email không hợp lệ';
    }

    if (rules.phone && !/^[0-9]{10,11}$/.test(value.replace(/[^0-9]/g, ''))) {
      return rules.message || 'Số điện thoại không hợp lệ';
    }

    if (rules.custom && !rules.custom(value)) {
      return rules.message || 'Giá trị không hợp lệ';
    }
  }

  return null;
};

export const validateForm = (data: any, rules: ValidationRules): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(rules).forEach((field) => {
    const value = data[field];
    const fieldRules = rules[field];
    const error = validateField(value, fieldRules);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
};

// Common validation rules
export const commonRules = {
  required: { required: true },
  email: { email: true },
  phone: { phone: true },
  password: {
    required: true,
    minLength: 6,
    message: 'Mật khẩu phải có ít nhất 6 ký tự'
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    message: 'Tên phải từ 2-100 ký tự'
  },
  price: {
    required: true,
    min: 0,
    message: 'Giá phải lớn hơn 0'
  },
  quantity: {
    required: true,
    min: 0,
    message: 'Số lượng phải lớn hơn hoặc bằng 0'
  },
  sku: {
    required: true,
    pattern: /^[A-Z0-9-]+$/,
    message: 'SKU chỉ được chứa chữ hoa, số và dấu gạch ngang'
  },
  url: {
    pattern: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
    message: 'URL không hợp lệ'
  }
};
