type FieldErrors = Record<string, string>;

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseApiError = (error: any): { message: string; fieldErrors?: FieldErrors; status?: number } => {
  const status = error?.response?.status;
  const data = error?.response?.data;

  // FastAPI style: { detail: [ { loc: [...], msg, type } ] }
  if (isPlainObject(data) && Array.isArray((data as any).detail)) {
    const details = (data as any).detail as any[];
    const fieldErrors: FieldErrors = {};
    const parts: string[] = [];

    for (const d of details) {
      const loc = Array.isArray(d?.loc) ? d.loc : [];
      const last = loc.length ? loc[loc.length - 1] : undefined;
      const field = typeof last === 'string' ? last : undefined;
      const msg = typeof d?.msg === 'string' ? d.msg : 'Dữ liệu không hợp lệ';

      if (field) {
        fieldErrors[field] = msg;
        parts.push(`${field}: ${msg}`);
      } else {
        parts.push(msg);
      }
    }

    return {
      status,
      message: parts.filter(Boolean).join(' | ') || 'Dữ liệu không hợp lệ',
      fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
    };
  }

  // Common patterns
  if (typeof data === 'string') {
    return { status, message: data };
  }

  if (isPlainObject(data)) {
    const message =
      (typeof (data as any).message === 'string' && (data as any).message) ||
      (typeof (data as any).detail === 'string' && (data as any).detail) ||
      (typeof (data as any).error === 'string' && (data as any).error) ||
      undefined;

    // { errors: { field: [..] } }
    const errorsObj = (data as any).errors;
    if (isPlainObject(errorsObj)) {
      const fieldErrors: FieldErrors = {};
      const parts: string[] = [];
      for (const [k, v] of Object.entries(errorsObj)) {
        const msg = Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '');
        if (msg) {
          fieldErrors[k] = msg;
          parts.push(`${k}: ${msg}`);
        }
      }
      return {
        status,
        message: parts.join(' | ') || message || 'Dữ liệu không hợp lệ',
        fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
      };
    }

    if (message) return { status, message };
  }

  return {
    status,
    message: typeof error?.message === 'string' ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.',
  };
};
