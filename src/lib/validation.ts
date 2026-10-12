import { z } from "zod";

const normalizedText = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

export const loginSchema = z.object({
  username: normalizedText(1, 254),
  password: z.string().min(1).max(128),
}).strict();

export const registerSchema = z.object({
  name: normalizedText(2, 150),
  email: z.string().trim().toLowerCase().email().max(254),
  nip: z.string().trim().max(50).optional().default(""),
  password: z.string().min(10).max(128),
  instansiAsal: z.string().trim().max(255).optional().default("Umum"),
}).strict();

export const forgotPasswordSchema = z.object({
  username: normalizedText(1, 254),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{40,200}$/),
  password: z.string().min(10).max(128),
}).strict();

export function parseJsonBody<T>(schema: z.ZodType<T>, value: unknown): T | null {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export interface NipNikValidationResult {
  valid: boolean;
  type: "NIP" | "NIK" | null;
  clean: string;
  formatted: string;
  error?: string;
  metadata?: {
    birthDate?: string;
    gender?: "Pria" | "Wanita";
    appointmentDate?: string;
  };
}

export function validateNipOrNik(rawInput: string): NipNikValidationResult {
  const clean = String(rawInput || "").replace(/\D/g, "");

  if (!clean) {
    return {
      valid: false,
      type: null,
      clean: "",
      formatted: "",
      error: "NIP atau NIK wajib diisi.",
    };
  }

  // 16 Digit: NIK Kependudukan
  if (clean.length === 16) {
    const formatted = `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)} ${clean.slice(12, 16)}`;
    return {
      valid: true,
      type: "NIK",
      clean,
      formatted,
    };
  }

  // 18 Digit: NIP ASN (PNS / PPPK Standar BKN)
  // Format: YYYYMMDD (lahir) + YYYYMM (pengangkatan) + G (jenis kelamin: 1 pria, 2 wanita) + NNN (nomor urut)
  if (clean.length === 18) {
    const birthYear = parseInt(clean.slice(0, 4), 10);
    const birthMonth = parseInt(clean.slice(4, 6), 10);
    const birthDay = parseInt(clean.slice(6, 8), 10);

    const currentYear = new Date().getFullYear();
    const isBirthDatePlausible =
      birthYear >= 1945 &&
      birthYear <= currentYear - 17 &&
      birthMonth >= 1 &&
      birthMonth <= 12 &&
      birthDay >= 1 &&
      birthDay <= 31;

    const genderCode = clean.slice(14, 15);
    const gender = genderCode === "1" ? "Pria" : genderCode === "2" ? "Wanita" : undefined;

    if (!isBirthDatePlausible) {
      return {
        valid: false,
        type: "NIP",
        clean,
        formatted: clean,
        error: "Struktur tanggal lahir pada 8 digit pertama NIP tidak valid.",
      };
    }

    const formatted = `${clean.slice(0, 8)} ${clean.slice(8, 14)} ${clean.slice(14, 15)} ${clean.slice(15, 18)}`;
    return {
      valid: true,
      type: "NIP",
      clean,
      formatted,
      metadata: {
        birthDate: `${birthDay.toString().padStart(2, "0")}/${birthMonth.toString().padStart(2, "0")}/${birthYear}`,
        gender,
        appointmentDate: `${clean.slice(12, 14)}/${clean.slice(8, 12)}`,
      },
    };
  }

  // Jika panjang digit belum atau bukan 16/18
  return {
    valid: false,
    type: null,
    clean,
    formatted: clean,
    error: `Jumlah digit tidak sesuai (${clean.length} digit). NIK wajib 16 digit, atau NIP ASN wajib 18 digit.`,
  };
}

export async function readJsonRequest(request: Request, maxBytes = 32 * 1024): Promise<unknown | null> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return null;

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return null;

  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

