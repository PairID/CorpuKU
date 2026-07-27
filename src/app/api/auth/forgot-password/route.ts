import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { sql } from "@/lib/db";
import { consumeRateLimit, getClientIp, isSameOrigin } from "@/lib/request-security";
import { forgotPasswordSchema, parseJsonBody, readJsonRequest } from "@/lib/validation";
import { sanitizePlainText } from "@/lib/content-security";

const GENERIC_RESPONSE = {
  success: true,
  message: "Jika akun terdaftar, tautan reset password akan dikirim ke email Anda.",
};
const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

function genericResponse() {
  return NextResponse.json(GENERIC_RESPONSE, { headers: NO_STORE_HEADERS });
}

function applicationOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) {
    if (process.env.NODE_ENV === "production") throw new Error("NEXT_PUBLIC_APP_URL belum dikonfigurasi.");
    return new URL(request.url).origin;
  }
  const url = new URL(configured);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("NEXT_PUBLIC_APP_URL tidak valid.");
  return url.origin;
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Permintaan tidak diizinkan." }, { status: 403, headers: NO_STORE_HEADERS });
    }
    const input = parseJsonBody(forgotPasswordSchema, await readJsonRequest(request));
    if (!input) return NextResponse.json({ error: "Data tidak valid." }, { status: 400, headers: NO_STORE_HEADERS });

    const limit = await consumeRateLimit({
      scope: "forgot-password",
      identifier: `${getClientIp(request)}:${input.username.toLowerCase()}`,
      limit: 3,
      windowSeconds: 60 * 60,
    });
    if (!limit.allowed) return genericResponse();

    const rows = await sql`
      SELECT id, name, email FROM users
      WHERE LOWER(username) = ${input.username.toLowerCase()}
         OR LOWER(nip) = ${input.username.toLowerCase()}
         OR LOWER(email) = ${input.username.toLowerCase()}
      LIMIT 1
    `;
    const user = rows[0];
    if (!user?.email) return genericResponse();

    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await sql`UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ${user.id} AND used_at IS NULL`;
    await sql`
      INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
      VALUES (${tokenHash}, ${user.id}, ${expiresAt.toISOString()})
    `;

    const appUrl = applicationOrigin(request);
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const smtpHost = process.env.SMTP_HOST;
    const smtpFrom = process.env.SMTP_FROM;
    if (!smtpHost || !smtpFrom) throw new Error("Konfigurasi SMTP belum lengkap.");
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    await transporter.sendMail({
      from: smtpFrom,
      to: String(user.email),
      subject: "Reset Password - CorpuKU Academy",
      text: `Halo ${sanitizePlainText(String(user.name))}, buka tautan berikut untuk mengatur ulang password Anda. Tautan berlaku 30 menit: ${resetUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b">
          <h1 style="color:#0c1c2c">CorpuKU Academy</h1>
          <p>Halo, ${sanitizePlainText(String(user.name))}.</p>
          <p>Kami menerima permintaan reset password. Tautan ini berlaku selama 30 menit dan hanya dapat digunakan sekali.</p>
          <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#0c1c2c;color:#fff;text-decoration:none;border-radius:8px">Atur Ulang Password</a></p>
          <p>Jika Anda tidak meminta reset, abaikan email ini.</p>
        </div>
      `,
    });
    return genericResponse();
  } catch (error) {
    console.error("Forgot password error:", error instanceof Error ? error.message : "unknown error");
    return genericResponse();
  }
}
