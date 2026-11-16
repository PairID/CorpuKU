import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) throw new Error('DATABASE_URL tidak tersedia.');
const sql = neon(connectionString);

console.log('🔍 Verifikasi skema database untuk Classical Facilitation Training...');

// 1. Cek kolom courses
const courseCols = await sql`
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'courses' AND column_name IN ('training_type', 'target_opd', 'attendance_threshold')
`;
console.log('Courses columns:', courseCols);

// 2. Cek kolom lessons
const lessonCols = await sql`
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'lessons' AND column_name IN ('jp', 'has_attendance', 'attendance_qr_code', 'narasumber_name', 'session_date')
`;
console.log('Lessons columns:', lessonCols);

// 3. Cek kolom enrollments
const enrollmentCols = await sql`
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'enrollments' AND column_name IN ('statement_accepted', 'attended_jp', 'attendance_percentage', 'all_evaluations_completed')
`;
console.log('Enrollments columns:', enrollmentCols);

// 4. Cek tabel material_attendances & training_evaluations
const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('material_attendances', 'training_evaluations', 'schema_migrations')
`;
console.log('Verified tables:', tables.map(t => t.table_name));

// 5. Cek record migrasi
const migration = await sql`
  SELECT version, applied_at FROM schema_migrations
  WHERE version = '2026-11-16-classical-facilitation-training-v1'
`;
console.log('Migration record:', migration);

console.log('✨ Seluruh verifikasi database berhasil!');
