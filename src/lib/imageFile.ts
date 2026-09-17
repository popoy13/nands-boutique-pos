export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateImageFile(file: File | null | undefined, maxBytes = MAX_IMAGE_BYTES): string | null {
  if (!file) return "Tidak ada file yang dipilih";
  if (!ALLOWED_TYPES.includes(file.type)) return "Format gambar harus JPG, PNG, atau WEBP";
  if (file.size > maxBytes) return `Ukuran gambar maksimal ${Math.round(maxBytes / 1024 / 1024)} MB`;
  if (file.size === 0) return "File gambar kosong";
  return null;
}
