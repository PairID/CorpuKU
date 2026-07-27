import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL atau POSTGRES_URL tidak tersedia.');
}

const sql = neon(connectionString);

async function migrate() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(100) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await sql.query(`CREATE SEQUENCE IF NOT EXISTS webinar_certificate_number_seq START 1`);
  await sql.query(`
    ALTER TABLE webinars
      ADD COLUMN IF NOT EXISTS certificate_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS certificate_auto_issue BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS certificate_template_type VARCHAR(50) NOT NULL DEFAULT 'sertifikat',
      ADD COLUMN IF NOT EXISTS certificate_number_prefix VARCHAR(30) NOT NULL DEFAULT 'WEB',
      ADD COLUMN IF NOT EXISTS certificate_jp INTEGER NOT NULL DEFAULT 2
  `);
  await sql.query(`
    UPDATE webinars SET
      certificate_enabled = COALESCE(certificate_enabled, TRUE),
      certificate_auto_issue = COALESCE(certificate_auto_issue, TRUE),
      certificate_template_type = COALESCE(certificate_template_type, 'sertifikat'),
      certificate_number_prefix = COALESCE(NULLIF(BTRIM(certificate_number_prefix), ''), 'WEB'),
      certificate_jp = COALESCE(certificate_jp, 2)
  `);
  await sql.query(`
    ALTER TABLE webinars
      ALTER COLUMN certificate_enabled SET DEFAULT TRUE,
      ALTER COLUMN certificate_enabled SET NOT NULL,
      ALTER COLUMN certificate_auto_issue SET DEFAULT TRUE,
      ALTER COLUMN certificate_auto_issue SET NOT NULL,
      ALTER COLUMN certificate_template_type SET DEFAULT 'sertifikat',
      ALTER COLUMN certificate_template_type SET NOT NULL,
      ALTER COLUMN certificate_number_prefix SET DEFAULT 'WEB',
      ALTER COLUMN certificate_number_prefix SET NOT NULL,
      ALTER COLUMN certificate_jp SET DEFAULT 2,
      ALTER COLUMN certificate_jp SET NOT NULL
  `);
  await sql.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'webinars'::regclass AND conname = 'webinars_certificate_template_check') THEN
        ALTER TABLE webinars ADD CONSTRAINT webinars_certificate_template_check
        CHECK (certificate_template_type IN ('sertifikat', 'surat_keterangan', 'sttp')) NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'webinars'::regclass AND conname = 'webinars_certificate_prefix_check') THEN
        ALTER TABLE webinars ADD CONSTRAINT webinars_certificate_prefix_check
        CHECK (certificate_number_prefix ~ '^[A-Z0-9_-]{2,20}$') NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'webinars'::regclass AND conname = 'webinars_certificate_jp_check') THEN
        ALTER TABLE webinars ADD CONSTRAINT webinars_certificate_jp_check CHECK (certificate_jp BETWEEN 1 AND 999) NOT VALID;
      END IF;
    END $$
  `);
  await sql.query(`ALTER TABLE webinars VALIDATE CONSTRAINT webinars_certificate_template_check`);
  await sql.query(`ALTER TABLE webinars VALIDATE CONSTRAINT webinars_certificate_prefix_check`);
  await sql.query(`ALTER TABLE webinars VALIDATE CONSTRAINT webinars_certificate_jp_check`);
  await sql.query(`
    ALTER TABLE webinar_registrations
      ADD COLUMN IF NOT EXISTS attended_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS evaluation_score INTEGER,
      ADD COLUMN IF NOT EXISTS evaluation_answers JSONB,
      ADD COLUMN IF NOT EXISTS evaluation_completed_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS certificate_generated_at TIMESTAMP WITH TIME ZONE
  `);
  await sql.query(`
    UPDATE webinar_registrations
    SET attended = FALSE,
        attended_at = NULL,
        evaluation_completed = FALSE,
        evaluation_answers = NULL,
        evaluation_completed_at = NULL,
        certificate_generated = FALSE,
        certificate_generated_at = NULL
    WHERE attended IS TRUE AND attended_at IS NULL
  `);
  await sql.query(`
    UPDATE webinar_registrations
    SET evaluation_completed = FALSE,
        evaluation_answers = NULL,
        evaluation_completed_at = NULL,
        certificate_generated = FALSE,
        certificate_generated_at = NULL
    WHERE evaluation_completed IS TRUE
      AND (
        attended IS NOT TRUE OR attended_at IS NULL OR evaluation_score IS NULL
        OR evaluation_score < 0 OR evaluation_score > 100 OR evaluation_completed_at IS NULL
      )
  `);
  await sql.query(`
    UPDATE webinar_registrations
    SET certificate_generated = FALSE, certificate_generated_at = NULL
    WHERE certificate_generated IS TRUE AND certificate_generated_at IS NULL
  `);
  await sql.query(`
    UPDATE webinar_registrations SET
      attended = COALESCE(attended, FALSE),
      evaluation_completed = COALESCE(evaluation_completed, FALSE),
      certificate_generated = COALESCE(certificate_generated, FALSE),
      registered_at = COALESCE(registered_at, CURRENT_TIMESTAMP)
  `);
  await sql.query(`
    ALTER TABLE webinar_registrations
      ALTER COLUMN attended SET DEFAULT FALSE,
      ALTER COLUMN attended SET NOT NULL,
      ALTER COLUMN evaluation_completed SET DEFAULT FALSE,
      ALTER COLUMN evaluation_completed SET NOT NULL,
      ALTER COLUMN certificate_generated SET DEFAULT FALSE,
      ALTER COLUMN certificate_generated SET NOT NULL,
      ALTER COLUMN registered_at SET DEFAULT CURRENT_TIMESTAMP,
      ALTER COLUMN registered_at SET NOT NULL
  `);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_webinar_registrations_certificate_identity ON webinar_registrations(id, user_id, webinar_id)`);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_webinar_registrations_user_webinar_unique ON webinar_registrations(user_id, webinar_id)`);
  await sql.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'webinar_registrations'::regclass AND conname = 'webinar_registrations_user_fk') THEN
        ALTER TABLE webinar_registrations ADD CONSTRAINT webinar_registrations_user_fk
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'webinar_registrations'::regclass AND conname = 'webinar_registrations_webinar_fk') THEN
        ALTER TABLE webinar_registrations ADD CONSTRAINT webinar_registrations_webinar_fk
        FOREIGN KEY (webinar_id) REFERENCES webinars(id) ON DELETE CASCADE NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'webinar_registrations'::regclass AND conname = 'webinar_registrations_evaluation_score_check') THEN
        ALTER TABLE webinar_registrations ADD CONSTRAINT webinar_registrations_evaluation_score_check
        CHECK (evaluation_score IS NULL OR evaluation_score BETWEEN 0 AND 100) NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'webinar_registrations'::regclass AND conname = 'webinar_registrations_evaluation_state_check') THEN
        ALTER TABLE webinar_registrations ADD CONSTRAINT webinar_registrations_evaluation_state_check
        CHECK (evaluation_completed IS NOT TRUE OR (attended IS TRUE AND attended_at IS NOT NULL AND evaluation_score IS NOT NULL AND evaluation_completed_at IS NOT NULL)) NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'webinar_registrations'::regclass AND conname = 'webinar_registrations_attendance_state_check') THEN
        ALTER TABLE webinar_registrations ADD CONSTRAINT webinar_registrations_attendance_state_check
        CHECK (attended IS NOT TRUE OR attended_at IS NOT NULL) NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'webinar_registrations'::regclass AND conname = 'webinar_registrations_certificate_state_check') THEN
        ALTER TABLE webinar_registrations ADD CONSTRAINT webinar_registrations_certificate_state_check
        CHECK (certificate_generated IS NOT TRUE OR certificate_generated_at IS NOT NULL) NOT VALID;
      END IF;
    END $$
  `);
  await sql.query(`ALTER TABLE webinar_registrations VALIDATE CONSTRAINT webinar_registrations_user_fk`);
  await sql.query(`ALTER TABLE webinar_registrations VALIDATE CONSTRAINT webinar_registrations_webinar_fk`);
  await sql.query(`ALTER TABLE webinar_registrations VALIDATE CONSTRAINT webinar_registrations_evaluation_score_check`);
  await sql.query(`ALTER TABLE webinar_registrations VALIDATE CONSTRAINT webinar_registrations_evaluation_state_check`);
  await sql.query(`ALTER TABLE webinar_registrations VALIDATE CONSTRAINT webinar_registrations_attendance_state_check`);
  await sql.query(`ALTER TABLE webinar_registrations VALIDATE CONSTRAINT webinar_registrations_certificate_state_check`);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS issued_webinar_certificates (
      id VARCHAR(255) PRIMARY KEY,
      registration_id VARCHAR(255) NOT NULL UNIQUE,
      user_id VARCHAR(255) NOT NULL,
      webinar_id VARCHAR(255) NOT NULL,
      certificate_number VARCHAR(100) NOT NULL UNIQUE,
      verification_token VARCHAR(255) NOT NULL UNIQUE,
      participant_name VARCHAR(255) NOT NULL,
      participant_nip VARCHAR(100),
      participant_rank VARCHAR(255),
      participant_position VARCHAR(255),
      participant_institution VARCHAR(255),
      webinar_title VARCHAR(255) NOT NULL,
      webinar_scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
      template_version VARCHAR(100) NOT NULL DEFAULT 'sertifikat',
      issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revoked_at TIMESTAMP WITH TIME ZONE,
      revocation_reason TEXT,
      last_downloaded_at TIMESTAMP WITH TIME ZONE,
      download_count INTEGER NOT NULL DEFAULT 0
    )
  `);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_issued_webinar_certificates_user ON issued_webinar_certificates(user_id, issued_at DESC)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_issued_webinar_certificates_webinar ON issued_webinar_certificates(webinar_id, issued_at DESC)`);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_webinar_certificates_registration_unique ON issued_webinar_certificates(registration_id)`);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_webinar_certificates_number_unique ON issued_webinar_certificates(certificate_number)`);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_webinar_certificates_token_unique ON issued_webinar_certificates(verification_token)`);
  await sql.query(`
    ALTER TABLE issued_webinar_certificates
      ADD COLUMN IF NOT EXISTS certificate_jp INTEGER NOT NULL DEFAULT 2,
      ADD COLUMN IF NOT EXISTS template_settings JSONB DEFAULT '{}'::jsonb
  `);
  await sql.query(`
    UPDATE issued_webinar_certificates certificate
    SET certificate_jp = COALESCE(webinar.certificate_jp, certificate.certificate_jp),
        template_settings = COALESCE(
          NULLIF(certificate.template_settings, 'null'::jsonb),
          NULLIF(settings.settings -> certificate.template_version, 'null'::jsonb),
          NULLIF(settings.settings -> 'sertifikat', 'null'::jsonb),
          NULLIF(settings.settings, 'null'::jsonb),
          '{}'::jsonb
        )
    FROM webinars webinar
    LEFT JOIN certificate_settings settings ON settings.type = 'sertifikat'
    WHERE webinar.id = certificate.webinar_id
      AND certificate.template_settings IS NULL
  `);
  await sql.query(`UPDATE issued_webinar_certificates SET template_settings = '{}'::jsonb WHERE template_settings IS NULL OR template_settings = 'null'::jsonb`);
  await sql.query(`UPDATE issued_webinar_certificates SET certificate_jp = 2 WHERE certificate_jp IS NULL`);
  await sql.query(`UPDATE issued_webinar_certificates SET download_count = 0 WHERE download_count IS NULL`);
  await sql.query(`
    ALTER TABLE issued_webinar_certificates
      ALTER COLUMN template_settings SET DEFAULT '{}'::jsonb,
      ALTER COLUMN template_settings SET NOT NULL,
      ALTER COLUMN certificate_jp SET DEFAULT 2,
      ALTER COLUMN certificate_jp SET NOT NULL,
      ALTER COLUMN download_count SET DEFAULT 0,
      ALTER COLUMN download_count SET NOT NULL
  `);
  await sql.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'issued_webinar_certificates'::regclass AND conname = 'issued_webinar_certificates_registration_identity_fk') THEN
        ALTER TABLE issued_webinar_certificates ADD CONSTRAINT issued_webinar_certificates_registration_identity_fk
        FOREIGN KEY (registration_id, user_id, webinar_id)
        REFERENCES webinar_registrations(id, user_id, webinar_id) ON DELETE CASCADE NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'issued_webinar_certificates'::regclass AND conname = 'issued_webinar_certificates_jp_check') THEN
        ALTER TABLE issued_webinar_certificates ADD CONSTRAINT issued_webinar_certificates_jp_check CHECK (certificate_jp BETWEEN 1 AND 999) NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'issued_webinar_certificates'::regclass AND conname = 'issued_webinar_certificates_template_check') THEN
        ALTER TABLE issued_webinar_certificates ADD CONSTRAINT issued_webinar_certificates_template_check
        CHECK (template_version IN ('sertifikat', 'surat_keterangan', 'sttp')) NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'issued_webinar_certificates'::regclass AND conname = 'issued_webinar_certificates_download_count_check') THEN
        ALTER TABLE issued_webinar_certificates ADD CONSTRAINT issued_webinar_certificates_download_count_check CHECK (download_count >= 0) NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'issued_webinar_certificates'::regclass AND conname = 'issued_webinar_certificates_revocation_check') THEN
        ALTER TABLE issued_webinar_certificates ADD CONSTRAINT issued_webinar_certificates_revocation_check
        CHECK (revoked_at IS NULL OR NULLIF(BTRIM(revocation_reason), '') IS NOT NULL) NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'issued_webinar_certificates'::regclass AND conname = 'issued_webinar_certificates_token_format_check') THEN
        ALTER TABLE issued_webinar_certificates ADD CONSTRAINT issued_webinar_certificates_token_format_check
        CHECK (verification_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'issued_webinar_certificates'::regclass AND conname = 'issued_webinar_certificates_template_settings_check') THEN
        ALTER TABLE issued_webinar_certificates ADD CONSTRAINT issued_webinar_certificates_template_settings_check
        CHECK (jsonb_typeof(template_settings) = 'object') NOT VALID;
      END IF;
    END $$
  `);
  await sql.query(`ALTER TABLE issued_webinar_certificates VALIDATE CONSTRAINT issued_webinar_certificates_registration_identity_fk`);
  await sql.query(`ALTER TABLE issued_webinar_certificates VALIDATE CONSTRAINT issued_webinar_certificates_jp_check`);
  await sql.query(`ALTER TABLE issued_webinar_certificates VALIDATE CONSTRAINT issued_webinar_certificates_template_check`);
  await sql.query(`ALTER TABLE issued_webinar_certificates VALIDATE CONSTRAINT issued_webinar_certificates_download_count_check`);
  await sql.query(`ALTER TABLE issued_webinar_certificates VALIDATE CONSTRAINT issued_webinar_certificates_revocation_check`);
  await sql.query(`ALTER TABLE issued_webinar_certificates VALIDATE CONSTRAINT issued_webinar_certificates_token_format_check`);
  await sql.query(`ALTER TABLE issued_webinar_certificates VALIDATE CONSTRAINT issued_webinar_certificates_template_settings_check`);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS webinar_attendance_attempts (
      user_id VARCHAR(255) NOT NULL,
      webinar_id VARCHAR(255) NOT NULL,
      window_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      attempt_count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (user_id, webinar_id)
    )
  `);
  await sql.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_webinar_attendance_attempts_identity ON webinar_attendance_attempts(user_id, webinar_id)`);
  await sql.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'webinar_attendance_attempts'::regclass AND conname = 'webinar_attendance_attempts_user_fk') THEN
        ALTER TABLE webinar_attendance_attempts ADD CONSTRAINT webinar_attendance_attempts_user_fk
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'webinar_attendance_attempts'::regclass AND conname = 'webinar_attendance_attempts_webinar_fk') THEN
        ALTER TABLE webinar_attendance_attempts ADD CONSTRAINT webinar_attendance_attempts_webinar_fk
        FOREIGN KEY (webinar_id) REFERENCES webinars(id) ON DELETE CASCADE NOT VALID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'webinar_attendance_attempts'::regclass AND conname = 'webinar_attendance_attempts_count_check') THEN
        ALTER TABLE webinar_attendance_attempts ADD CONSTRAINT webinar_attendance_attempts_count_check CHECK (attempt_count >= 1) NOT VALID;
      END IF;
    END $$
  `);
  await sql.query(`ALTER TABLE webinar_attendance_attempts VALIDATE CONSTRAINT webinar_attendance_attempts_user_fk`);
  await sql.query(`ALTER TABLE webinar_attendance_attempts VALIDATE CONSTRAINT webinar_attendance_attempts_webinar_fk`);
  await sql.query(`ALTER TABLE webinar_attendance_attempts VALIDATE CONSTRAINT webinar_attendance_attempts_count_check`);
  await sql.query(`
    INSERT INTO schema_migrations (version) VALUES
      ('2026-07-22-webinar-certificates-v1'),
      ('2026-07-23-webinar-certificates-v2-integrity')
    ON CONFLICT (version) DO NOTHING
  `);

  console.log('Migrasi sertifikat webinar selesai.');
}

migrate().catch((error) => {
  console.error('Migrasi sertifikat webinar gagal:', error);
  process.exitCode = 1;
});
