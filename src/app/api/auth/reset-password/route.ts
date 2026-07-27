import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { consumeRateLimit, getClientIp, isSameOrigin } from "@/lib/request-security";
import { parseJsonBody, readJsonRequest, resetPasswordSchema } from "@/lib/validation";
import { revokeAllUserSessions } from "@/lib/session";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Permintaan tidak diizinkan." }, { status: 403, headers: NO_STORE_HEADERS });
    }
    const input = parseJsonBody(resetPasswordSchema, await readJsonRequest(request));
    if (!input) return NextResponse.json({ error: "Tautan atau password tidak valid." }, { status: 400, headers: NO_STORE_HEADERS });
    const passwordError = validatePasswordStrength(input.password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400, headers: NO_STORE_HEADERS });
    const limit = await consumeRateLimit({
      scope: "reset-password",
      identifier: getClientIp(request),
      limit: 5,
      windowSeconds: 60 * 60,
    });
    if (!limit.allowed) return NextResponse.json({ error: "Terlalu banyak percobaan." }, {
      status: 429,
      headers: { ...NO_STORE_HEADERS, "Retry-After": String(limit.retryAfterSeconds) },
    });

    const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
    const passwordHash = await hashPassword(input.password);
    const rows = await sql`
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE token_hash = ${tokenHash}
        AND used_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      RETURNING user_id AS "userId"
    `;
    const tokenRecord = rows[0];
    if (!tokenRecord) {
      return NextResponse.json({ error: "Tautan reset tidak valid atau telah kedaluwarsa." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    await sql`UPDATE users SET password = ${passwordHash} WHERE id = ${tokenRecord.userId}`;
    await revokeAllUserSessions(String(tokenRecord.userId));
    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Reset password error:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Gagal mengatur ulang password." }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
