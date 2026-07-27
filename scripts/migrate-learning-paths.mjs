import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
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
  CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID PRIMARY KEY,
    slug VARCHAR(160) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT,
    visibility VARCHAR(20) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_learning_paths_catalog ON learning_paths(status, visibility, updated_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS idx_learning_paths_creator ON learning_paths(created_by, updated_at DESC)`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'learning_paths'::regclass AND conname = 'learning_paths_slug_format_check') THEN
      ALTER TABLE learning_paths ADD CONSTRAINT learning_paths_slug_format_check
      CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*-[a-f0-9]{6}$') NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'learning_paths'::regclass AND conname = 'learning_paths_title_check') THEN
      ALTER TABLE learning_paths ADD CONSTRAINT learning_paths_title_check CHECK (CHAR_LENGTH(BTRIM(title)) >= 5) NOT VALID;
    END IF;
  END $$
`;
await sql`ALTER TABLE learning_paths VALIDATE CONSTRAINT learning_paths_slug_format_check`;
await sql`ALTER TABLE learning_paths VALIDATE CONSTRAINT learning_paths_title_check`;
await sql`
  CREATE TABLE IF NOT EXISTS learning_path_items (
    id UUID PRIMARY KEY,
    path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    order_index INTEGER NOT NULL CHECK (order_index >= 0),
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(path_id, course_id),
    UNIQUE(path_id, order_index)
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_learning_path_items_path ON learning_path_items(path_id, order_index)`;
await sql`CREATE INDEX IF NOT EXISTS idx_learning_path_items_course ON learning_path_items(course_id)`;
await sql`
  CREATE TABLE IF NOT EXISTS learning_path_assignments (
    id UUID PRIMARY KEY,
    path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    assignment_type VARCHAR(20) NOT NULL DEFAULT 'assigned' CHECK (assignment_type IN ('assigned', 'self')),
    due_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(path_id, user_id)
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_learning_path_assignments_user ON learning_path_assignments(user_id, assigned_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS idx_learning_path_assignments_due ON learning_path_assignments(due_at) WHERE completed_at IS NULL AND due_at IS NOT NULL`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'learning_path_assignments'::regclass AND conname = 'learning_path_assignments_completion_time_check') THEN
      ALTER TABLE learning_path_assignments ADD CONSTRAINT learning_path_assignments_completion_time_check
      CHECK (completed_at IS NULL OR completed_at >= assigned_at) NOT VALID;
    END IF;
  END $$
`;
await sql`ALTER TABLE learning_path_assignments VALIDATE CONSTRAINT learning_path_assignments_completion_time_check`;
await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_user_course_unique
  ON enrollments(user_id, course_id)
`;
await sql`
  INSERT INTO schema_migrations (version) VALUES ('2026-07-22-learning-paths-v1')
  ON CONFLICT (version) DO NOTHING
`;
await sql`
  INSERT INTO schema_migrations (version) VALUES ('2026-07-23-learning-paths-v2-integrity')
  ON CONFLICT (version) DO NOTHING
`;

console.log('Migrasi learning paths selesai.');
