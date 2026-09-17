const BASE_URL = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");

export function assetUrl(src?: string): string {
  if (!src) return src ?? "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(src)) return `${BASE_URL}${src.replace(/^\/+/, "")}`;
  return src;
}