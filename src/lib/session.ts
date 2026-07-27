import crypto from "crypto";
import { sql } from "@/lib/db";

export const SESSION_COOKIE_NAME = "corpuku_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  nip?: string;
  username?: string;
  role: "student" | "instructor" | "admin";
  image?: string;
  instansiAsal?: string;
  pangkat?: string;
  jabatan?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
}

export interface AuthSession {
  id: string;
  user: AuthUser;
  expiresAt: string;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  };
}

export async function createServerSession(
  userId: string,
  metadata?: { ipHash?: string | null; userAgent?: string | null },
): Promise<{ token: string; sessionId: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("base64url");
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await sql`
    DELETE FROM auth_sessions
    WHERE user_id = ${userId}
      AND (expires_at <= CURRENT_TIMESTAMP OR (revoked_at IS NOT NULL AND revoked_at < CURRENT_TIMESTAMP - INTERVAL '30 days'))
  `;

  await sql`
    INSERT INTO auth_sessions (
      id, token_hash, user_id, expires_at, ip_hash, user_agent
    ) VALUES (
      ${sessionId}, ${hashToken(token)}, ${userId}, ${expiresAt.toISOString()},
      ${metadata?.ipHash || null}, ${metadata?.userAgent?.slice(0, 500) || null}
    )
  `;

  await sql`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS session_rank
      FROM auth_sessions WHERE user_id = ${userId} AND revoked_at IS NULL
    )
    UPDATE auth_sessions session SET revoked_at = CURRENT_TIMESTAMP
    FROM ranked WHERE session.id = ranked.id AND ranked.session_rank > 10
  `;

  return { token, sessionId, expiresAt };
}

export async function getServerSession(token: string): Promise<AuthSession | null> {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return null;

  const rows = await sql`
    SELECT session.id AS "sessionId", session.expires_at AS "expiresAt",
           user_account.id, user_account.name, user_account.email,
           user_account.nip, user_account.username, user_account.role,
           user_account.image, user_account.instansi_asal AS "instansiAsal",
           user_account.pangkat, user_account.jabatan,
           user_account.tempat_lahir AS "tempatLahir",
           user_account.tanggal_lahir AS "tanggalLahir"
    FROM auth_sessions session
    JOIN users user_account ON user_account.id = session.user_id
    WHERE session.token_hash = ${hashToken(token)}
      AND session.revoked_at IS NULL
      AND session.expires_at > CURRENT_TIMESTAMP
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || !["student", "instructor", "admin"].includes(String(row.role))) return null;

  return {
    id: String(row.sessionId),
    expiresAt: new Date(row.expiresAt).toISOString(),
    user: {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      nip: row.nip ? String(row.nip) : undefined,
      username: row.username ? String(row.username) : undefined,
      role: row.role as AuthUser["role"],
      image: row.image ? String(row.image) : undefined,
      instansiAsal: row.instansiAsal ? String(row.instansiAsal) : undefined,
      pangkat: row.pangkat ? String(row.pangkat) : undefined,
      jabatan: row.jabatan ? String(row.jabatan) : undefined,
      tempatLahir: row.tempatLahir ? String(row.tempatLahir) : undefined,
      tanggalLahir: row.tanggalLahir ? String(row.tanggalLahir) : undefined,
    },
  };
}

export async function revokeServerSession(token: string): Promise<void> {
  if (!token) return;
  await sql`
    UPDATE auth_sessions
    SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
    WHERE token_hash = ${hashToken(token)}
  `;
}

export async function revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  if (exceptSessionId) {
    await sql`
      UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
      WHERE user_id = ${userId} AND id <> ${exceptSessionId} AND revoked_at IS NULL
    `;
    return;
  }
  await sql`
    UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
    WHERE user_id = ${userId} AND revoked_at IS NULL
  `;
}
