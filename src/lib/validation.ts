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
