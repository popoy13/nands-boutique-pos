const TAG_RE = /<\/?[^>]+>/gi;
const SCRIPT_RE = /(javascript|vbscript):/gi;
const CTRL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const sanitizeText = (value: unknown, maxLength = 500): string => {
  const raw = String(value ?? "").trim();
  return raw
    .replace(TAG_RE, "")
    .replace(SCRIPT_RE, "blocked:")
    .replace(CTRL_RE, "")
    .slice(0, maxLength);
};

export const escapeHtml = (value: unknown): string => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};