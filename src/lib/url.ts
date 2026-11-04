const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const BASE = base;
export const url = (path: string): string => `${base}${path}`;
