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
  ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS pacing_type VARCHAR(20) NOT NULL DEFAULT 'self_paced'
`;
await sql`UPDATE courses SET pacing_type = 'self_paced' WHERE pacing_type IS NULL`;
await sql`ALTER TABLE courses ALTER COLUMN pacing_type SET DEFAULT 'self_paced'`;
await sql`ALTER TABLE courses ALTER COLUMN pacing_type SET NOT NULL`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'courses'::regclass AND conname = 'courses_pacing_type_check') THEN
      ALTER TABLE courses ADD CONSTRAINT courses_pacing_type_check
      CHECK (pacing_type IN ('self_paced', 'instructor_paced')) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'courses'::regclass AND conname = 'courses_instructor_pacing_schedule_check') THEN
      ALTER TABLE courses ADD CONSTRAINT courses_instructor_pacing_schedule_check
      CHECK (pacing_type <> 'instructor_paced' OR start_date IS NOT NULL) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'courses'::regclass AND conname = 'courses_schedule_order_check') THEN
      ALTER TABLE courses ADD CONSTRAINT courses_schedule_order_check
      CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date) NOT VALID;
    END IF;
  END $$
`;
await sql`ALTER TABLE courses VALIDATE CONSTRAINT courses_pacing_type_check`;
await sql`ALTER TABLE courses VALIDATE CONSTRAINT courses_instructor_pacing_schedule_check`;
await sql`ALTER TABLE courses VALIDATE CONSTRAINT courses_schedule_order_check`;
await sql`
  INSERT INTO schema_migrations (version) VALUES ('2026-07-23-course-pacing-v1')
  ON CONFLICT (version) DO NOTHING
`;
await sql`
  INSERT INTO schema_migrations (version) VALUES ('2026-07-23-course-pacing-v2-integrity')
  ON CONFLICT (version) DO NOTHING
`;
console.log('Migrasi course pacing selesai.');
