import crypto from "crypto";
import { sql } from "@/lib/db";

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (origin) {
    try {
      const originUrl = new URL(origin);
      const reqUrl = new URL(request.url);
      if (originUrl.origin === reqUrl.origin) return true;
      if (host && (originUrl.host === host || originUrl.host === host.split(':')[0])) return true;

      // Check configured APP URL
      if (process.env.NEXT_PUBLIC_APP_URL) {
        try {
          const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
          if (originUrl.origin === appUrl.origin) return true;
        } catch { /* ignore */ }
      }

      // Allow LAN IPs and localhost dev variants
      const isLocalHost = (hostname: string) =>
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.');

      if (isLocalHost(originUrl.hostname) && (isLocalHost(reqUrl.hostname) || host)) {
        return true;
      }
    } catch {
      return false;
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function privacyHash(value: string): string {
  const pepper = process.env.NEON_AUTH_COOKIE_SECRET;
  if (process.env.NODE_ENV === "production" && (!pepper || pepper.length < 32)) {
    throw new Error("NEON_AUTH_COOKIE_SECRET minimal 32 karakter wajib dikonfigurasi.");
  }
  return crypto
    .createHash("sha256")
    .update(`${pepper || "development-only-rate-limit-pepper"}:${value}`)
    .digest("hex");
}

export async function consumeRateLimit(options: {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
  blockSeconds?: number;
}): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const rateKey = privacyHash(`${options.scope}:${options.identifier}`);
  const rows = await sql`
    INSERT INTO auth_rate_limits (rate_key, window_started_at, attempt_count, blocked_until)
    VALUES (${rateKey}, CURRENT_TIMESTAMP, 1, NULL)
    ON CONFLICT (rate_key) DO UPDATE SET
      window_started_at = CASE
        WHEN auth_rate_limits.window_started_at < CURRENT_TIMESTAMP - (${options.windowSeconds} * INTERVAL '1 second')
          THEN CURRENT_TIMESTAMP
        ELSE auth_rate_limits.window_started_at
      END,
      attempt_count = CASE
        WHEN auth_rate_limits.window_started_at < CURRENT_TIMESTAMP - (${options.windowSeconds} * INTERVAL '1 second')
          THEN 1
        ELSE auth_rate_limits.attempt_count + 1
      END,
      blocked_until = CASE
        WHEN auth_rate_limits.blocked_until > CURRENT_TIMESTAMP THEN auth_rate_limits.blocked_until
        WHEN auth_rate_limits.window_started_at >= CURRENT_TIMESTAMP - (${options.windowSeconds} * INTERVAL '1 second')
          AND auth_rate_limits.attempt_count + 1 > ${options.limit}
          THEN CURRENT_TIMESTAMP + (${options.blockSeconds || options.windowSeconds} * INTERVAL '1 second')
        ELSE NULL
      END
    RETURNING attempt_count AS "attemptCount", blocked_until AS "blockedUntil"
  `;
  const blockedUntil = rows[0]?.blockedUntil ? new Date(rows[0].blockedUntil) : null;
  const allowed = !blockedUntil || blockedUntil.getTime() <= Date.now();
  return {
    allowed,
    retryAfterSeconds: blockedUntil
      ? Math.max(1, Math.ceil((blockedUntil.getTime() - Date.now()) / 1000))
      : 0,
  };
}

export async function clearRateLimit(scope: string, identifier: string): Promise<void> {
  await sql`DELETE FROM auth_rate_limits WHERE rate_key = ${privacyHash(`${scope}:${identifier}`)}`;
}
