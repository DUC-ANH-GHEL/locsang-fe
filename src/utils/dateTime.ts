const TIMEZONE_RE = /(Z|[+-]\d{2}:\d{2})$/i;
export const VI_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const pad2 = (value: number): string => String(value).padStart(2, '0');

export const parseApiDateTime = (value?: string | null): Date | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const normalizedRaw = raw.includes(' ') ? raw.replace(' ', 'T') : raw;
  const normalized = TIMEZONE_RE.test(normalizedRaw) ? normalizedRaw : `${normalizedRaw}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const toDateTimeLocalInput = (value?: string | null): string => {
  const date = parseApiDateTime(value);
  if (!date) return '';

  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join('-') + `T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

export const fromDateTimeLocalInput = (value?: string | null): string | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export const formatViDate = (value?: string | null, options?: Intl.DateTimeFormatOptions): string => {
  const date = parseApiDateTime(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: VI_TIME_ZONE, ...(options || { dateStyle: 'medium' }) }).format(date);
};

export const formatViDateTime = (value?: string | null, options?: Intl.DateTimeFormatOptions): string => {
  const date = parseApiDateTime(value);
  if (!date) return '';
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VI_TIME_ZONE,
    ...(options || defaultOptions),
  }).format(date);
};
