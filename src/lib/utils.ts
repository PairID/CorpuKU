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
