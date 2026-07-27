import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL atau POSTGRES_URL tidak tersedia. Readiness check dihentikan.');
}

const sql = neon(connectionString);
const checks = [];

function pass(label, details) {
  checks.push({ label, details });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checkEnvironment() {
  assert((process.env.NEON_AUTH_COOKIE_SECRET || '').length >= 32, 'NEON_AUTH_COOKIE_SECRET minimal 32 karakter belum dikonfigurasi.');
  const hasCloudinary = Boolean(process.env.CLOUDINARY_URL) || ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].every(key => Boolean(process.env[key]));
  assert(hasCloudinary, 'Kredensial Cloudinary belum lengkap.');
  assert(['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'].every(key => Boolean(process.env[key])), 'Konfigurasi SMTP belum lengkap.');
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
    assert(['http:', 'https:'].includes(appUrl.protocol), 'NEXT_PUBLIC_APP_URL harus menggunakan HTTP/HTTPS.');
  }
  pass('Environment produksi', 'Secret keamanan, Cloudinary, dan SMTP tersedia');
}

async function requireColumns(tableName, requiredColumns) {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tableName}
  `;
  const present = new Set(rows.map((row) => String(row.column_name)));
  const missing = requiredColumns.filter((column) => !present.has(column));
  assert(missing.length === 0, `Tabel ${tableName} belum lengkap: ${missing.join(', ')}`);
  pass(`Skema ${tableName}`, `${requiredColumns.length} kolom wajib tersedia`);
}

async function requireNotNullColumns(tableName, requiredColumns) {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tableName}
      AND is_nullable = 'NO'
  `;
  const notNull = new Set(rows.map((row) => String(row.column_name)));
  const nullable = requiredColumns.filter((column) => !notNull.has(column));
  assert(nullable.length === 0, `Kolom wajib ${tableName} masih nullable: ${nullable.join(', ')}`);
  pass(`Nullability ${tableName}`, `${requiredColumns.length} kolom wajib NOT NULL`);
}

async function requireUniqueKey(tableName, requiredColumns, options = {}) {
  const rows = await sql`
    SELECT index_relation.relname AS index_name,
           STRING_AGG(attribute.attname, ',' ORDER BY key_column.ordinality) AS columns,
           (index_metadata.indpred IS NOT NULL) AS is_partial
    FROM pg_class table_relation
    JOIN pg_namespace namespace ON namespace.oid = table_relation.relnamespace
    JOIN pg_index index_metadata ON index_metadata.indrelid = table_relation.oid
    JOIN pg_class index_relation ON index_relation.oid = index_metadata.indexrelid
    CROSS JOIN LATERAL UNNEST(index_metadata.indkey::smallint[]) WITH ORDINALITY AS key_column(attnum, ordinality)
    JOIN pg_attribute attribute ON attribute.attrelid = table_relation.oid AND attribute.attnum = key_column.attnum
    WHERE namespace.nspname = 'public' AND table_relation.relname = ${tableName}
      AND index_metadata.indisunique = TRUE
      AND key_column.ordinality <= index_metadata.indnkeyatts
    GROUP BY index_relation.relname, index_metadata.indpred
  `;
  const expected = requiredColumns.join(',');
  const found = rows.some((row) => {
    const actual = String(row.columns || '');
    return actual === expected && (options.partial === undefined || Boolean(row.is_partial) === options.partial);
  });
  assert(found, `Unique key ${tableName}(${requiredColumns.join(', ')}) belum tersedia.`);
  pass(`Unique key ${tableName}`, requiredColumns.join(', '));
}

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
  const constraint = rows[0];
  assert(constraint && String(constraint.contype) === type && constraint.convalidated === true,
    `Constraint ${tableName}.${constraintName} belum tersedia atau belum tervalidasi.`);
  pass(`Constraint ${constraintName}`, tableName);
}

async function requireIndex(indexName) {
  const rows = await sql`
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = ${indexName} LIMIT 1
  `;
  assert(rows.length === 1, `Index ${indexName} belum tersedia.`);
  pass(`Index ${indexName}`, 'tersedia');
}

async function checkAuthentication() {
  await requireColumns('auth_sessions', [
    'id', 'token_hash', 'user_id', 'expires_at', 'created_at', 'revoked_at', 'ip_hash', 'user_agent',
  ]);
  await requireColumns('password_reset_tokens', [
    'token_hash', 'user_id', 'expires_at', 'created_at', 'used_at',
  ]);
  await requireColumns('auth_rate_limits', [
    'rate_key', 'window_started_at', 'attempt_count', 'blocked_until',
  ]);
  await requireConstraint('auth_sessions', 'auth_sessions_expiry_after_creation_check', 'c');
  await requireConstraint('password_reset_tokens', 'password_reset_expiry_after_creation_check', 'c');
  await requireUniqueKey('password_reset_tokens', ['user_id'], { partial: true });
  await requireIndex('idx_auth_rate_limits_window');

  const passwordRows = await sql`
    SELECT
      COUNT(*) FILTER (
        WHERE password IS NULL OR password = '' OR password NOT LIKE 'scrypt$%'
      )::int AS plaintext_count,
      COUNT(*) FILTER (
        WHERE password LIKE 'scrypt$%' AND (
          array_length(string_to_array(password, '$'), 1) <> 6
          OR split_part(password, '$', 2) <> '16384'
          OR split_part(password, '$', 3) <> '8'
          OR split_part(password, '$', 4) <> '1'
          OR length(split_part(password, '$', 5)) < 20
          OR length(split_part(password, '$', 6)) < 80
        )
      )::int AS malformed_count,
      COUNT(*)::int AS total_count
    FROM users
  `;
  const passwordState = passwordRows[0] || {};
  const plaintextCount = Number(passwordState.plaintext_count || 0);
  const malformedCount = Number(passwordState.malformed_count || 0);
  assert(plaintextCount === 0, `${plaintextCount} akun masih memiliki password plaintext/kosong.`);
  assert(malformedCount === 0, `${malformedCount} akun memiliki hash password yang tidak sesuai parameter produksi.`);
  pass('Credential pengguna', `${Number(passwordState.total_count || 0)} password ter-hash; plaintext 0`);

  const duplicateActiveTokens = await sql`
    SELECT COUNT(*)::int AS count FROM (
      SELECT user_id FROM password_reset_tokens WHERE used_at IS NULL
      GROUP BY user_id HAVING COUNT(*) > 1
    ) duplicate_tokens
  `;
  assert(Number(duplicateActiveTokens[0]?.count || 0) === 0, 'Terdapat pengguna dengan lebih dari satu token reset aktif.');
  pass('Token reset password', 'Maksimal satu token belum-terpakai per pengguna');
}

async function checkCourseCertificates() {
  await requireColumns('issued_course_certificates', [
    'id', 'enrollment_id', 'user_id', 'course_id', 'certificate_number', 'verification_token',
    'participant_name', 'course_title', 'completed_at', 'certificate_jp', 'template_version',
    'template_settings', 'issued_at', 'revoked_at', 'revocation_reason', 'last_downloaded_at',
    'download_count',
  ]);
  await requireColumns('courses', [
    'certificate_enabled', 'certificate_auto_issue', 'certificate_type', 'certificate_number_prefix',
    'passing_score', 'pacing_type', 'start_date', 'end_date',
  ]);
  await requireNotNullColumns('courses', [
    'certificate_enabled', 'certificate_auto_issue', 'certificate_type',
    'certificate_number_prefix', 'passing_score', 'pacing_type',
  ]);
  await requireUniqueKey('issued_course_certificates', ['enrollment_id']);
  await requireUniqueKey('issued_course_certificates', ['certificate_number']);
  await requireUniqueKey('issued_course_certificates', ['verification_token']);
  await requireConstraint('issued_course_certificates', 'issued_course_certificates_enrollment_identity_fk', 'f');
  await requireConstraint('issued_course_certificates', 'issued_course_certificates_jp_check', 'c');
  await requireConstraint('issued_course_certificates', 'issued_course_certificates_revocation_check', 'c');
  await requireConstraint('issued_course_certificates', 'issued_course_certificates_download_count_check', 'c');
  await requireConstraint('issued_course_certificates', 'issued_course_certificates_template_check', 'c');
  await requireConstraint('issued_course_certificates', 'issued_course_certificates_template_settings_check', 'c');
  await requireConstraint('courses', 'courses_passing_score_check', 'c');
  await requireConstraint('courses', 'courses_certificate_prefix_check', 'c');
  await requireConstraint('courses', 'courses_certificate_type_check', 'c');
  await requireConstraint('courses', 'courses_pacing_type_check', 'c');
  await requireConstraint('courses', 'courses_instructor_pacing_schedule_check', 'c');
  await requireConstraint('courses', 'courses_schedule_order_check', 'c');

  const invalidRows = await sql`
    SELECT COUNT(*)::int AS count
    FROM issued_course_certificates certificate
    LEFT JOIN enrollments enrollment ON enrollment.id = certificate.enrollment_id
    WHERE enrollment.id IS NULL
      OR enrollment.user_id <> certificate.user_id
      OR enrollment.course_id <> certificate.course_id
      OR enrollment.status <> 'completed'
      OR enrollment.progress <> 100
      OR enrollment.completed_at IS NULL
      OR certificate.template_settings IS NULL
      OR jsonb_typeof(certificate.template_settings) <> 'object'
  `;
  const invalidCount = Number(invalidRows[0]?.count || 0);
  assert(invalidCount === 0, `${invalidCount} sertifikat kursus terbit tanpa kelulusan/snapshot valid.`);
  pass('Integritas sertifikat kursus', 'Semua penerbitan memiliki bukti kelulusan server-side');

  const invalidCourseConfig = await sql`
    SELECT COUNT(*)::int AS count FROM courses
    WHERE passing_score NOT BETWEEN 0 AND 100
      OR certificate_number_prefix !~ '^[A-Z0-9-]{2,20}$'
      OR certificate_type NOT IN ('sertifikat', 'surat_keterangan', 'sttp')
      OR pacing_type NOT IN ('self_paced', 'instructor_paced')
      OR (pacing_type = 'instructor_paced' AND start_date IS NULL)
      OR (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date < start_date)
  `;
  assert(Number(invalidCourseConfig[0]?.count || 0) === 0, 'Konfigurasi sertifikat/pacing kursus melanggar invariant produksi.');
  pass('Konfigurasi kursus', 'Sertifikat, pacing, dan urutan jadwal valid');
}

async function checkWebinarCertificates() {
  await requireColumns('issued_webinar_certificates', [
    'id', 'registration_id', 'user_id', 'webinar_id', 'certificate_number', 'verification_token',
    'participant_name', 'webinar_title', 'webinar_scheduled_at', 'certificate_jp', 'template_version',
    'template_settings', 'issued_at', 'revoked_at', 'revocation_reason', 'last_downloaded_at',
    'download_count',
  ]);
  await requireColumns('webinars', [
    'certificate_enabled', 'certificate_auto_issue', 'certificate_template_type',
    'certificate_number_prefix', 'certificate_jp',
  ]);
  await requireColumns('webinar_registrations', [
    'attended_at', 'evaluation_score', 'evaluation_answers', 'evaluation_completed_at',
    'certificate_generated_at',
  ]);
  await requireNotNullColumns('issued_webinar_certificates', [
    'registration_id', 'user_id', 'webinar_id', 'certificate_number', 'verification_token',
    'certificate_jp', 'template_settings', 'download_count',
  ]);
  await requireNotNullColumns('webinar_registrations', [
    'user_id', 'webinar_id', 'registered_at', 'attended', 'evaluation_completed', 'certificate_generated',
  ]);
  await requireColumns('webinar_attendance_attempts', [
    'user_id', 'webinar_id', 'window_started_at', 'attempt_count',
  ]);
  await requireUniqueKey('issued_webinar_certificates', ['registration_id']);
  await requireUniqueKey('issued_webinar_certificates', ['certificate_number']);
  await requireUniqueKey('issued_webinar_certificates', ['verification_token']);
  await requireUniqueKey('webinar_registrations', ['user_id', 'webinar_id']);
  await requireUniqueKey('webinar_attendance_attempts', ['user_id', 'webinar_id']);
  await requireConstraint('issued_webinar_certificates', 'issued_webinar_certificates_registration_identity_fk', 'f');
  await requireConstraint('issued_webinar_certificates', 'issued_webinar_certificates_jp_check', 'c');
  await requireConstraint('issued_webinar_certificates', 'issued_webinar_certificates_template_check', 'c');
  await requireConstraint('issued_webinar_certificates', 'issued_webinar_certificates_download_count_check', 'c');
  await requireConstraint('issued_webinar_certificates', 'issued_webinar_certificates_revocation_check', 'c');
  await requireConstraint('issued_webinar_certificates', 'issued_webinar_certificates_token_format_check', 'c');
  await requireConstraint('issued_webinar_certificates', 'issued_webinar_certificates_template_settings_check', 'c');
  await requireConstraint('webinar_registrations', 'webinar_registrations_user_fk', 'f');
  await requireConstraint('webinar_registrations', 'webinar_registrations_webinar_fk', 'f');
  await requireConstraint('webinar_registrations', 'webinar_registrations_evaluation_score_check', 'c');
  await requireConstraint('webinar_registrations', 'webinar_registrations_evaluation_state_check', 'c');
  await requireConstraint('webinar_registrations', 'webinar_registrations_attendance_state_check', 'c');
  await requireConstraint('webinar_registrations', 'webinar_registrations_certificate_state_check', 'c');
  await requireConstraint('webinar_attendance_attempts', 'webinar_attendance_attempts_user_fk', 'f');
  await requireConstraint('webinar_attendance_attempts', 'webinar_attendance_attempts_webinar_fk', 'f');
  await requireConstraint('webinar_attendance_attempts', 'webinar_attendance_attempts_count_check', 'c');

  const invalidRows = await sql`
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
  const invalidCount = Number(invalidRows[0]?.count || 0);
  assert(invalidCount === 0, `${invalidCount} sertifikat webinar terbit tanpa kehadiran/evaluasi valid.`);
  pass('Integritas sertifikat webinar', 'Semua penerbitan memiliki bukti kehadiran dan evaluasi');

  const invalidEvaluations = await sql`
    SELECT COUNT(*)::int AS count FROM webinar_registrations
    WHERE (evaluation_score IS NOT NULL AND evaluation_score NOT BETWEEN 0 AND 100)
       OR (evaluation_completed IS TRUE AND (
         attended IS NOT TRUE OR evaluation_score IS NULL OR evaluation_completed_at IS NULL
       ))
  `;
  assert(Number(invalidEvaluations[0]?.count || 0) === 0, 'Status evaluasi webinar tidak konsisten.');
  pass('Evaluasi webinar', 'Nilai dan status kelulusan konsisten');
}

async function checkLearningPaths() {
  await requireColumns('learning_paths', [
    'id', 'slug', 'title', 'description', 'visibility', 'status', 'created_by', 'created_at', 'updated_at',
  ]);
  await requireColumns('learning_path_items', [
    'id', 'path_id', 'course_id', 'order_index', 'is_required', 'created_at',
  ]);
  await requireColumns('learning_path_assignments', [
    'id', 'path_id', 'user_id', 'assigned_by', 'assignment_type', 'due_at', 'assigned_at', 'completed_at',
  ]);
  await requireUniqueKey('learning_paths', ['slug']);
  await requireUniqueKey('learning_path_items', ['path_id', 'course_id']);
  await requireUniqueKey('learning_path_items', ['path_id', 'order_index']);
  await requireUniqueKey('learning_path_assignments', ['path_id', 'user_id']);
  await requireUniqueKey('enrollments', ['user_id', 'course_id']);
  await requireConstraint('learning_paths', 'learning_paths_slug_format_check', 'c');
  await requireConstraint('learning_paths', 'learning_paths_title_check', 'c');
  await requireConstraint('learning_path_assignments', 'learning_path_assignments_completion_time_check', 'c');
  await requireIndex('idx_learning_paths_creator');
  await requireIndex('idx_learning_path_items_course');
  await requireIndex('idx_learning_path_assignments_due');

  const invalidRows = await sql`
    SELECT
      (SELECT COUNT(*) FROM learning_paths WHERE visibility NOT IN ('public', 'private') OR status NOT IN ('draft', 'published', 'archived'))::int
        AS invalid_paths,
      (SELECT COUNT(*) FROM learning_path_items WHERE order_index < 0)::int AS invalid_items,
      (SELECT COUNT(*) FROM learning_path_assignments WHERE assignment_type NOT IN ('assigned', 'self'))::int
        AS invalid_assignments
  `;
  const state = invalidRows[0] || {};
  const invalidCount = Number(state.invalid_paths || 0) + Number(state.invalid_items || 0) + Number(state.invalid_assignments || 0);
  assert(invalidCount === 0, `${invalidCount} data learning path melanggar invariant.`);
  pass('Integritas learning paths', 'Status, visibilitas, urutan, dan tipe penugasan valid');
}

async function checkOperationalTables() {
  await requireColumns('media_assets', ['id', 'hash', 'url', 'filename', 'mimetype', 'size', 'user_id', 'public_id', 'resource_type', 'created_at']);
  await requireColumns('audit_logs', ['id', 'actor_user_id', 'action', 'entity_type', 'entity_id', 'metadata', 'created_at']);
  await requireConstraint('media_assets', 'media_assets_user_fk', 'f');
  await requireConstraint('media_assets', 'media_assets_size_check', 'c');
  await requireConstraint('media_assets', 'media_assets_metadata_check', 'c');
  await requireConstraint('audit_logs', 'audit_logs_actor_fk', 'f');
  await requireNotNullColumns('media_assets', ['id', 'hash', 'url', 'filename', 'mimetype', 'size', 'created_at']);

  const invalidMedia = await sql`
    SELECT COUNT(*)::int AS count FROM media_assets
    WHERE size <= 0 OR NULLIF(BTRIM(hash), '') IS NULL OR NULLIF(BTRIM(url), '') IS NULL
      OR NULLIF(BTRIM(filename), '') IS NULL OR NULLIF(BTRIM(mimetype), '') IS NULL
  `;
  assert(Number(invalidMedia[0]?.count || 0) === 0, 'Media asset memiliki metadata kosong/tidak valid.');
  pass('Integritas media asset', 'Metadata wajib lengkap dan ukuran positif');
}

async function checkMigrationVersions() {
  const requiredVersions = [
    '2026-07-23-auth-security-v2-integrity',
    '2026-07-23-production-upgrade-v2-integrity',
    '2026-07-23-webinar-certificates-v2-integrity',
    '2026-07-23-learning-paths-v2-integrity',
    '2026-07-23-course-pacing-v2-integrity',
  ];
  const rows = await sql`SELECT version FROM schema_migrations WHERE version = ANY(${requiredVersions}::varchar[])`;
  const present = new Set(rows.map((row) => String(row.version)));
  const missing = requiredVersions.filter((version) => !present.has(version));
  assert(missing.length === 0, `Migrasi integritas belum diterapkan: ${missing.join(', ')}`);
  pass('Versi migrasi', `${requiredVersions.length} migrasi integritas diterapkan`);
}

try {
  checkEnvironment();
  await checkAuthentication();
  await checkCourseCertificates();
  await checkWebinarCertificates();
  await checkLearningPaths();
  await checkOperationalTables();
  await checkMigrationVersions();

  console.log('\nProduction readiness check LULUS');
  for (const check of checks) console.log(`  [OK] ${check.label}: ${check.details}`);
} catch (error) {
  console.error('\nProduction readiness check GAGAL');
  console.error(`  [FAIL] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
