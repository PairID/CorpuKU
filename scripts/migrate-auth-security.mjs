import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) throw new Error('DATABASE_URL atau POSTGRES_URL tidak tersedia.');
const sql = neon(connectionString);

function isPasswordHash(value) {
  return typeof value === 'string' && value.startsWith('scrypt$');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const cost = 16_384;
  const blockSize = 8;
  const parallelization = 1;
  const key = crypto.scryptSync(password, salt, 64, { N: cost, r: blockSize, p: parallelization });
  return ['scrypt', cost, blockSize, parallelization, salt, key.toString('base64url')].join('$');
}

await sql`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY,
    token_hash CHAR(64) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    ip_hash CHAR(64),
    user_agent VARCHAR(500)
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active ON auth_sessions(user_id, expires_at DESC) WHERE revoked_at IS NULL`;
await sql`CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at)`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'auth_sessions'::regclass AND conname = 'auth_sessions_expiry_after_creation_check'
    ) THEN
      ALTER TABLE auth_sessions ADD CONSTRAINT auth_sessions_expiry_after_creation_check
      CHECK (expires_at > created_at) NOT VALID;
    END IF;
  END $$
`;
await sql`ALTER TABLE auth_sessions VALIDATE CONSTRAINT auth_sessions_expiry_after_creation_check`;

await sql`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash CHAR(64) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id, created_at DESC)`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'password_reset_tokens'::regclass AND conname = 'password_reset_expiry_after_creation_check'
    ) THEN
      ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_expiry_after_creation_check
      CHECK (expires_at > created_at) NOT VALID;
    END IF;
  END $$
`;
await sql`ALTER TABLE password_reset_tokens VALIDATE CONSTRAINT password_reset_expiry_after_creation_check`;
await sql`
  WITH ranked AS (
    SELECT token_hash, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, token_hash DESC) AS token_rank
    FROM password_reset_tokens
    WHERE used_at IS NULL
  )
  UPDATE password_reset_tokens token
  SET used_at = CURRENT_TIMESTAMP
  FROM ranked
  WHERE token.token_hash = ranked.token_hash AND ranked.token_rank > 1
`;
await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_one_unused_per_user
  ON password_reset_tokens(user_id) WHERE used_at IS NULL
`;

await sql`
  CREATE TABLE IF NOT EXISTS auth_rate_limits (
    rate_key CHAR(64) PRIMARY KEY,
    window_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    blocked_until TIMESTAMP WITH TIME ZONE
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window ON auth_rate_limits(window_started_at)`;

const users = await sql`
  SELECT id, password FROM users
  WHERE password IS NOT NULL AND password <> '' AND password NOT LIKE 'scrypt$%'
  ORDER BY id
`;
let migratedPasswords = 0;
const pendingUsers = users.filter((user) => !isPasswordHash(user.password));
for (let offset = 0; offset < pendingUsers.length; offset += 500) {
  const batch = pendingUsers.slice(offset, offset + 500);
  const updates = batch.map((user) => ({ id: String(user.id), password: hashPassword(user.password) }));
  await sql`
    UPDATE users AS user_account
    SET password = update_data.password
    FROM jsonb_to_recordset(${JSON.stringify(updates)}::jsonb) AS update_data(id TEXT, password TEXT)
    WHERE user_account.id = update_data.id
  `;
  migratedPasswords += updates.length;
}

await sql`
  INSERT INTO schema_migrations (version) VALUES ('2026-07-22-auth-security-v1')
  ON CONFLICT (version) DO NOTHING
`;
await sql`
  INSERT INTO schema_migrations (version) VALUES ('2026-07-23-auth-security-v2-integrity')
  ON CONFLICT (version) DO NOTHING
`;
await sql`DELETE FROM auth_sessions WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '7 days'`;
await sql`DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '1 day'`;
await sql`
  DELETE FROM auth_rate_limits
  WHERE window_started_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
    AND (blocked_until IS NULL OR blocked_until < CURRENT_TIMESTAMP)
`;

console.log(`Migrasi autentikasi selesai. ${migratedPasswords} password lama telah di-hash.`);
