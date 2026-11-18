import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Cloudinary image optimizations
 */
export function optimizeImage(url: string | null | undefined, width: number = 800) {
  if (!url) return "";
  if (!url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${width},c_fill,q_auto,f_auto/`);
}

/**
 * Cloudinary avatar optimizations (focus on face)
 */
export function optimizeAvatar(url: string | null | undefined, size: number = 200) {
  if (!url) return "";
  if (!url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/w_${size},h_${size},c_fill,g_face,q_auto,f_auto/`);
}

/**
 * Convert Indonesian date string (e.g. "04 Juni 1996") or ISO date string to YYYY-MM-DD
 */
export function toIsoDate(val: string | null | undefined): string {
  if (!val) return "";
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const MONTHS: Record<string, string> = {
    januari: "01", februari: "02", maret: "03", april: "04", mei: "05", juni: "06",
    juli: "07", agustus: "08", september: "09", oktober: "10", november: "11", desember: "12"
  };
  const parts = trimmed.split(/[\s-]+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const monthKey = parts[1].toLowerCase();
    const month = MONTHS[monthKey] || (parts[1].length <= 2 ? parts[1].padStart(2, "0") : null);
    const year = parts[2];
    if (month && year.length === 4) return `${year}-${month}-${day}`;
  }
  return "";
}

/**
 * Convert YYYY-MM-DD to standard Indonesian date string (e.g. "4 Juni 1996")
 */
export function toIndonesianDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const trimmed = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-");
    const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const monthIdx = parseInt(m, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${parseInt(d, 10)} ${MONTH_NAMES[monthIdx]} ${y}`;
    }
  }
  return trimmed;
}
