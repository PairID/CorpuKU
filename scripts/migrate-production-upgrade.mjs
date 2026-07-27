import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) throw new Error('DATABASE_URL atau POSTGRES_URL tidak tersedia.');
const sql = neon(connectionString);

await sql`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY,
    hash TEXT UNIQUE NOT NULL,
    url TEXT NOT NULL,
    filename TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    size INTEGER NOT NULL CHECK (size > 0),
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )
`;
await sql`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS public_id TEXT`;
await sql`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50)`;
await sql`ALTER TABLE media_assets ALTER COLUMN user_id DROP NOT NULL`;
await sql`UPDATE media_assets SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL`;
await sql`
  ALTER TABLE media_assets
    ALTER COLUMN hash SET NOT NULL,
    ALTER COLUMN url SET NOT NULL,
    ALTER COLUMN filename SET NOT NULL,
    ALTER COLUMN mimetype SET NOT NULL,
    ALTER COLUMN size SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN created_at SET NOT NULL
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'media_assets'::regclass AND conname = 'media_assets_user_fk'
    ) THEN
      ALTER TABLE media_assets ADD CONSTRAINT media_assets_user_fk
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'media_assets'::regclass AND conname = 'media_assets_size_check'
    ) THEN
      ALTER TABLE media_assets ADD CONSTRAINT media_assets_size_check CHECK (size > 0) NOT VALID;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'media_assets'::regclass AND conname = 'media_assets_metadata_check'
    ) THEN
      ALTER TABLE media_assets ADD CONSTRAINT media_assets_metadata_check
      CHECK (
        NULLIF(BTRIM(hash), '') IS NOT NULL AND NULLIF(BTRIM(url), '') IS NOT NULL
        AND NULLIF(BTRIM(filename), '') IS NOT NULL AND NULLIF(BTRIM(mimetype), '') IS NOT NULL
      ) NOT VALID;
    END IF;
  END $$
`;
await sql`ALTER TABLE media_assets VALIDATE CONSTRAINT media_assets_user_fk`;
await sql`ALTER TABLE media_assets VALIDATE CONSTRAINT media_assets_size_check`;
await sql`ALTER TABLE media_assets VALIDATE CONSTRAINT media_assets_metadata_check`;
await sql`CREATE INDEX IF NOT EXISTS idx_media_assets_owner ON media_assets(user_id, created_at DESC)`;

await sql`CREATE SEQUENCE IF NOT EXISTS course_certificate_number_seq START 1`;
await sql`
  ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS certificate_auto_issue BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS certificate_number_prefix VARCHAR(30) NOT NULL DEFAULT 'CRS',
    ADD COLUMN IF NOT EXISTS passing_score INTEGER NOT NULL DEFAULT 60
`;
await sql`
  UPDATE courses SET
    certificate_enabled = COALESCE(certificate_enabled, TRUE),
    certificate_auto_issue = COALESCE(certificate_auto_issue, TRUE),
    certificate_type = COALESCE(certificate_type, 'sertifikat'),
    certificate_number_prefix = COALESCE(NULLIF(BTRIM(certificate_number_prefix), ''), 'CRS'),
    passing_score = COALESCE(passing_score, 60)
`;
await sql`
  ALTER TABLE courses
    ALTER COLUMN certificate_enabled SET DEFAULT TRUE,
    ALTER COLUMN certificate_enabled SET NOT NULL,
    ALTER COLUMN certificate_auto_issue SET DEFAULT TRUE,
    ALTER COLUMN certificate_auto_issue SET NOT NULL,
    ALTER COLUMN certificate_type SET DEFAULT 'sertifikat',
    ALTER COLUMN certificate_type SET NOT NULL,
    ALTER COLUMN certificate_number_prefix SET DEFAULT 'CRS',
    ALTER COLUMN certificate_number_prefix SET NOT NULL,
    ALTER COLUMN passing_score SET DEFAULT 60,
    ALTER COLUMN passing_score SET NOT NULL
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'courses'::regclass AND conname = 'courses_passing_score_check') THEN
      ALTER TABLE courses ADD CONSTRAINT courses_passing_score_check CHECK (passing_score BETWEEN 0 AND 100) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'courses'::regclass AND conname = 'courses_certificate_prefix_check') THEN
      ALTER TABLE courses ADD CONSTRAINT courses_certificate_prefix_check CHECK (certificate_number_prefix ~ '^[A-Z0-9-]{2,20}$') NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'courses'::regclass AND conname = 'courses_certificate_type_check') THEN
      ALTER TABLE courses ADD CONSTRAINT courses_certificate_type_check CHECK (certificate_type IN ('sertifikat', 'surat_keterangan', 'sttp')) NOT VALID;
    END IF;
  END $$
`;
await sql`ALTER TABLE courses VALIDATE CONSTRAINT courses_passing_score_check`;
await sql`ALTER TABLE courses VALIDATE CONSTRAINT courses_certificate_prefix_check`;
await sql`ALTER TABLE courses VALIDATE CONSTRAINT courses_certificate_type_check`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_certificate_identity ON enrollments(id, user_id, course_id)`;
await sql`
  CREATE TABLE IF NOT EXISTS issued_course_certificates (
    id UUID PRIMARY KEY,
    enrollment_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id VARCHAR(255) NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    certificate_number VARCHAR(100) NOT NULL UNIQUE,
    verification_token UUID NOT NULL UNIQUE,
    participant_name VARCHAR(255) NOT NULL,
    participant_nip VARCHAR(100),
    participant_rank VARCHAR(255),
    participant_position VARCHAR(255),
    participant_institution VARCHAR(255),
    course_title VARCHAR(500) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    certificate_jp INTEGER NOT NULL DEFAULT 0,
    template_version VARCHAR(100) NOT NULL DEFAULT 'sertifikat',
    template_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason TEXT,
    last_downloaded_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER NOT NULL DEFAULT 0 CHECK (download_count >= 0)
  )
`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_course_certificates_enrollment_unique ON issued_course_certificates(enrollment_id)`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_course_certificates_number_unique ON issued_course_certificates(certificate_number)`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_course_certificates_token_unique ON issued_course_certificates(verification_token)`;
await sql`
  UPDATE issued_course_certificates SET
    certificate_jp = COALESCE(certificate_jp, 0),
    template_version = COALESCE(NULLIF(BTRIM(template_version), ''), 'sertifikat'),
    template_settings = CASE
      WHEN template_settings IS NULL OR template_settings = 'null'::jsonb THEN '{}'::jsonb
      ELSE template_settings
    END,
    download_count = COALESCE(download_count, 0)
`;
await sql`
  ALTER TABLE issued_course_certificates
    ALTER COLUMN certificate_jp SET DEFAULT 0,
    ALTER COLUMN certificate_jp SET NOT NULL,
    ALTER COLUMN template_version SET DEFAULT 'sertifikat',
    ALTER COLUMN template_version SET NOT NULL,
    ALTER COLUMN template_settings SET DEFAULT '{}'::jsonb,
    ALTER COLUMN template_settings SET NOT NULL,
    ALTER COLUMN download_count SET DEFAULT 0,
    ALTER COLUMN download_count SET NOT NULL
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'issued_course_certificates'::regclass AND conname = 'issued_course_certificates_enrollment_identity_fk'
    ) THEN
      ALTER TABLE issued_course_certificates ADD CONSTRAINT issued_course_certificates_enrollment_identity_fk
      FOREIGN KEY (enrollment_id, user_id, course_id)
      REFERENCES enrollments(id, user_id, course_id) ON DELETE RESTRICT NOT VALID;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'issued_course_certificates'::regclass AND conname = 'issued_course_certificates_jp_check'
    ) THEN
      ALTER TABLE issued_course_certificates ADD CONSTRAINT issued_course_certificates_jp_check
      CHECK (certificate_jp >= 0) NOT VALID;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'issued_course_certificates'::regclass AND conname = 'issued_course_certificates_revocation_check'
    ) THEN
      ALTER TABLE issued_course_certificates ADD CONSTRAINT issued_course_certificates_revocation_check
      CHECK (revoked_at IS NULL OR NULLIF(BTRIM(revocation_reason), '') IS NOT NULL) NOT VALID;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'issued_course_certificates'::regclass AND conname = 'issued_course_certificates_template_check'
    ) THEN
      ALTER TABLE issued_course_certificates ADD CONSTRAINT issued_course_certificates_template_check
      CHECK (template_version IN ('sertifikat', 'surat_keterangan', 'sttp')) NOT VALID;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'issued_course_certificates'::regclass AND conname = 'issued_course_certificates_template_settings_check'
    ) THEN
      ALTER TABLE issued_course_certificates ADD CONSTRAINT issued_course_certificates_template_settings_check
      CHECK (jsonb_typeof(template_settings) = 'object') NOT VALID;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'issued_course_certificates'::regclass AND conname = 'issued_course_certificates_download_count_check'
    ) THEN
      ALTER TABLE issued_course_certificates ADD CONSTRAINT issued_course_certificates_download_count_check
      CHECK (download_count >= 0) NOT VALID;
    END IF;
  END $$
`;
await sql`ALTER TABLE issued_course_certificates VALIDATE CONSTRAINT issued_course_certificates_enrollment_identity_fk`;
await sql`ALTER TABLE issued_course_certificates VALIDATE CONSTRAINT issued_course_certificates_jp_check`;
await sql`ALTER TABLE issued_course_certificates VALIDATE CONSTRAINT issued_course_certificates_revocation_check`;
await sql`ALTER TABLE issued_course_certificates VALIDATE CONSTRAINT issued_course_certificates_template_check`;
await sql`ALTER TABLE issued_course_certificates VALIDATE CONSTRAINT issued_course_certificates_template_settings_check`;
await sql`ALTER TABLE issued_course_certificates VALIDATE CONSTRAINT issued_course_certificates_download_count_check`;
await sql`CREATE INDEX IF NOT EXISTS idx_course_certificates_user ON issued_course_certificates(user_id, issued_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS idx_course_certificates_course ON issued_course_certificates(course_id, issued_at DESC)`;

await sql`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    actor_user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'audit_logs'::regclass AND conname = 'audit_logs_actor_fk'
    ) THEN
      ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_actor_fk
      FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL NOT VALID;
    END IF;
  END $$
`;
await sql`ALTER TABLE audit_logs VALIDATE CONSTRAINT audit_logs_actor_fk`;
await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC)`;

await sql`
  INSERT INTO schema_migrations (version) VALUES ('2026-07-22-production-upgrade-v1')
  ON CONFLICT (version) DO NOTHING
`;
await sql`
  INSERT INTO schema_migrations (version) VALUES ('2026-07-23-production-upgrade-v2-integrity')
  ON CONFLICT (version) DO NOTHING
`;
console.log('Migrasi production upgrade v1 selesai.');
