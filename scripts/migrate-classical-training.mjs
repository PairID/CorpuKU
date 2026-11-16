import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) throw new Error('DATABASE_URL atau POSTGRES_URL tidak tersedia.');
const sql = neon(connectionString);

console.log('🚀 Menjalankan migrasi Classical Facilitation Training for External OPDs...');

await sql`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

// 1. Extend courses table
await sql`
  ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS training_type VARCHAR(50) NOT NULL DEFAULT 'elearning',
    ADD COLUMN IF NOT EXISTS target_opd VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attendance_threshold INTEGER NOT NULL DEFAULT 80
`;
console.log('✅ Kolom courses (training_type, target_opd, attendance_threshold) berhasil dipastikan.');

// 2. Extend lessons table
await sql`
  ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS jp INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS has_attendance BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS attendance_qr_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS narasumber_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS session_date TIMESTAMP WITH TIME ZONE
`;
await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_lessons_attendance_qr ON lessons(attendance_qr_code) WHERE attendance_qr_code IS NOT NULL
`;
console.log('✅ Kolom lessons (jp, has_attendance, attendance_qr_code, narasumber_name, session_date) berhasil dipastikan.');

// 3. Extend users table
await sql`
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS profile_verified_at TIMESTAMP WITH TIME ZONE
`;
console.log('✅ Kolom users (phone, profile_verified_at) berhasil dipastikan.');

// 4. Extend enrollments table
await sql`
  ALTER TABLE enrollments
    ADD COLUMN IF NOT EXISTS statement_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS statement_accepted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS attended_jp INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS attendance_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS eval_narasumber_completed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS eval_organizer_completed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS eval_understanding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS eval_skm_completed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS all_evaluations_completed BOOLEAN NOT NULL DEFAULT FALSE
`;
console.log('✅ Kolom enrollments (statement_accepted, attended_jp, evaluations status) berhasil dipastikan.');

// 5. Create material_attendances table
await sql`
  CREATE TABLE IF NOT EXISTS material_attendances (
    id VARCHAR(255) PRIMARY KEY,
    enrollment_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    course_id VARCHAR(255) NOT NULL,
    lesson_id VARCHAR(255) NOT NULL,
    jp INTEGER NOT NULL DEFAULT 0,
    attended_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_material_attendances_user_lesson UNIQUE (user_id, lesson_id),
    CONSTRAINT fk_material_attendances_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_material_attendances_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_material_attendances_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
  )
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_material_attendances_course_user ON material_attendances(course_id, user_id)
`;
console.log('✅ Tabel material_attendances berhasil dipastikan.');

// 6. Create training_evaluations table
await sql`
  CREATE TABLE IF NOT EXISTS training_evaluations (
    id VARCHAR(255) PRIMARY KEY,
    enrollment_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    course_id VARCHAR(255) NOT NULL,
    stage VARCHAR(50) NOT NULL,
    session_id VARCHAR(255),
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_training_evaluations_stage UNIQUE (enrollment_id, stage, session_id),
    CONSTRAINT fk_training_evaluations_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
    CONSTRAINT fk_training_evaluations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_training_evaluations_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_training_evaluations_enrollment ON training_evaluations(enrollment_id, stage)
`;
console.log('✅ Tabel training_evaluations berhasil dipastikan.');

// 7. Catat migrasi
await sql`
  INSERT INTO schema_migrations (version)
  VALUES ('2026-11-16-classical-facilitation-training-v1')
  ON CONFLICT (version) DO NOTHING
`;

console.log('🎉 Migrasi Classical Facilitation Training selesai dengan sukses!');
