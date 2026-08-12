import DOMPurify from 'dompurify';

export const sanitizeInput = (value: string): string => {
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
};

export const sanitizeHtml = (value: string): string => {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  });
};

export const sanitizeFormData = <T extends Record<string, unknown>>(data: T): T => {
  const sanitized = {} as T;

  for (const key in data) {
    const value = data[key];

    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value) as T[Extract<keyof T, string>];
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item: unknown) =>
        typeof item === 'string' ? sanitizeInput(item) : item,
      ) as T[Extract<keyof T, string>];
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};
