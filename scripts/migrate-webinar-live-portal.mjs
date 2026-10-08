import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) throw new Error('DATABASE_URL atau POSTGRES_URL tidak tersedia.');
const sql = neon(connectionString);

console.log('🚀 Menjalankan migrasi webinar live portal...');

await sql`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

// 1. Kolom tambahan pada tabel webinars
await sql`
  ALTER TABLE webinars
    ADD COLUMN IF NOT EXISTS is_attendance_open BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS youtube_url TEXT
`;
console.log('✅ Kolom webinars (is_attendance_open, youtube_url) berhasil dipastikan.');

// 2. Kolom tambahan pada tabel webinar_registrations
await sql`
  ALTER TABLE webinar_registrations
    ADD COLUMN IF NOT EXISTS agency_name TEXT,
    ADD COLUMN IF NOT EXISTS phone_number TEXT,
    ADD COLUMN IF NOT EXISTS position_title TEXT,
    ADD COLUMN IF NOT EXISTS skm_answers JSONB
`;
console.log('✅ Kolom webinar_registrations (agency_name, phone_number, position_title, skm_answers) berhasil dipastikan.');

// 3. Catat migrasi
await sql`
  INSERT INTO schema_migrations (version)
  VALUES ('20260923_webinar_live_portal')
  ON CONFLICT (version) DO NOTHING
`;

console.log('🎉 Migrasi webinar live portal selesai dengan sukses!');
