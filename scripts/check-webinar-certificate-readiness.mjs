import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) throw new Error('DATABASE_URL atau POSTGRES_URL tidak tersedia.');
if (!process.env.NEON_AUTH_COOKIE_SECRET || process.env.NEON_AUTH_COOKIE_SECRET.length < 32) {
  throw new Error('NEON_AUTH_COOKIE_SECRET minimal 32 karakter belum dikonfigurasi.');
}

const sql = neon(connectionString);
const requiredColumns = [
  'id', 'registration_id', 'user_id', 'webinar_id', 'certificate_number',
  'verification_token', 'participant_name', 'webinar_title', 'issued_at',
  'revoked_at', 'last_downloaded_at', 'download_count', 'certificate_jp', 'template_settings',
];

const columns = await sql`
  SELECT column_name, is_nullable FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'issued_webinar_certificates'
`;
const present = new Set(columns.map(row => row.column_name));
const missing = requiredColumns.filter(column => !present.has(column));
if (missing.length) throw new Error(`Kolom sertifikat belum lengkap: ${missing.join(', ')}`);
const requiredNotNull = [
  'registration_id', 'user_id', 'webinar_id', 'certificate_number', 'verification_token',
  'certificate_jp', 'template_settings', 'download_count',
];
const nullable = new Set(columns.filter(row => row.is_nullable !== 'NO').map(row => row.column_name));
const nullableRequired = requiredNotNull.filter(column => nullable.has(column));
if (nullableRequired.length) {
  throw new Error(`Kolom sertifikat wajib masih nullable: ${nullableRequired.join(', ')}`);
}

async function requireUniqueKey(tableName, requiredColumns) {
  const rows = await sql`
    SELECT STRING_AGG(attribute.attname, ',' ORDER BY key_column.ordinality) AS columns
    FROM pg_class table_relation
    JOIN pg_namespace namespace ON namespace.oid = table_relation.relnamespace
    JOIN pg_index index_metadata ON index_metadata.indrelid = table_relation.oid
    CROSS JOIN LATERAL UNNEST(index_metadata.indkey::smallint[]) WITH ORDINALITY AS key_column(attnum, ordinality)
    JOIN pg_attribute attribute ON attribute.attrelid = table_relation.oid AND attribute.attnum = key_column.attnum
    WHERE namespace.nspname = 'public' AND table_relation.relname = ${tableName}
      AND index_metadata.indisunique = TRUE AND index_metadata.indpred IS NULL
      AND key_column.ordinality <= index_metadata.indnkeyatts
    GROUP BY index_metadata.indexrelid
  `;
  const expected = requiredColumns.join(',');
  if (!rows.some(row => String(row.columns || '') === expected)) {
    throw new Error(`Unique key ${tableName}(${requiredColumns.join(', ')}) belum tersedia.`);
  }
}
await requireUniqueKey('issued_webinar_certificates', ['registration_id']);
await requireUniqueKey('issued_webinar_certificates', ['certificate_number']);
await requireUniqueKey('issued_webinar_certificates', ['verification_token']);
await requireUniqueKey('webinar_registrations', ['user_id', 'webinar_id']);
await requireUniqueKey('webinar_attendance_attempts', ['user_id', 'webinar_id']);

async function requireConstraint(tableName, constraintName, type) {
  const rows = await sql`
    SELECT constraint_record.contype, constraint_record.convalidated
    FROM pg_constraint constraint_record
    JOIN pg_class table_relation ON table_relation.oid = constraint_record.conrelid
    JOIN pg_namespace namespace ON namespace.oid = table_relation.relnamespace
    WHERE namespace.nspname = 'public' AND table_relation.relname = ${tableName}
      AND constraint_record.conname = ${constraintName}
    LIMIT 1
  `;
  if (!rows[0] || String(rows[0].contype) !== type || rows[0].convalidated !== true) {
    throw new Error(`Constraint ${tableName}.${constraintName} belum tersedia atau belum tervalidasi.`);
  }
}

await requireConstraint('issued_webinar_certificates', 'issued_webinar_certificates_registration_identity_fk', 'f');
await requireConstraint('issued_webinar_certificates', 'issued_webinar_certificates_jp_check', 'c');
await requireConstraint('issued_webinar_certificates', 'issued_webinar_certificates_template_check', 'c');
await requireConstraint('issued_webinar_certificates', 'issued_webinar_certificates_download_count_check', 'c');
await requireConstraint('issued_webinar_certificates', 'issued_webinar_certificates_revocation_check', 'c');
await requireConstraint('issued_webinar_certificates', 'issued_webinar_certificates_token_format_check', 'c');
await requireConstraint('issued_webinar_certificates', 'issued_webinar_certificates_template_settings_check', 'c');
await requireConstraint('webinar_registrations', 'webinar_registrations_evaluation_score_check', 'c');
await requireConstraint('webinar_registrations', 'webinar_registrations_evaluation_state_check', 'c');
await requireConstraint('webinar_registrations', 'webinar_registrations_attendance_state_check', 'c');
await requireConstraint('webinar_registrations', 'webinar_registrations_certificate_state_check', 'c');

const webinarConfigColumns = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'webinars'
    AND column_name IN ('certificate_enabled', 'certificate_auto_issue', 'certificate_template_type', 'certificate_number_prefix', 'certificate_jp')
`;
if (webinarConfigColumns.length !== 5) {
  throw new Error('Konfigurasi configure-once per webinar belum lengkap.');
}

const invalidIssued = await sql`
  SELECT COUNT(*)::int AS count
  FROM issued_webinar_certificates certificate
  LEFT JOIN webinar_registrations registration ON registration.id = certificate.registration_id
  WHERE registration.id IS NULL
    OR registration.user_id <> certificate.user_id
    OR registration.webinar_id <> certificate.webinar_id
    OR registration.attended IS NOT TRUE
    OR registration.attended_at IS NULL
    OR registration.evaluation_completed IS NOT TRUE
    OR registration.evaluation_score IS NULL
    OR registration.evaluation_completed_at IS NULL
    OR certificate.template_settings IS NULL
    OR jsonb_typeof(certificate.template_settings) <> 'object'
`;
if ((invalidIssued[0]?.count || 0) > 0) {
  throw new Error('Terdapat sertifikat terbit tanpa bukti kehadiran dan evaluasi server-side.');
}

const migration = await sql`
  SELECT 1 FROM schema_migrations WHERE version = '2026-07-23-webinar-certificates-v2-integrity' LIMIT 1
`;
if (migration.length !== 1) throw new Error('Migrasi integritas sertifikat webinar v2 belum diterapkan.');

console.log('Readiness check sertifikat webinar lulus.');
