import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("Gagal: DATABASE_URL tidak ditemukan di .env.local");
  process.exit(1);
}

const sql = neon(connectionString);

async function createTables() {
  console.log("🚀 Membuat tabel webinars & webinar_registrations...");

  try {
    // Create webinars table
    await sql.query(`
      CREATE TABLE IF NOT EXISTS webinars (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        thumbnail_url TEXT,
        meeting_link TEXT,
        material_url TEXT,
        virtual_background_url TEXT,
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
        attendance_code VARCHAR(50),
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Tabel webinars berhasil dibuat/diverifikasi.");

    // Create webinar_registrations table
    await sql.query(`
      CREATE TABLE IF NOT EXISTS webinar_registrations (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        webinar_id VARCHAR(255) NOT NULL,
        registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        attended BOOLEAN DEFAULT false,
        evaluation_completed BOOLEAN DEFAULT false,
        certificate_generated BOOLEAN DEFAULT false,
        UNIQUE(user_id, webinar_id),
        FOREIGN KEY (webinar_id) REFERENCES webinars(id) ON DELETE CASCADE
        -- Asumsikan users table sudah ada
      )
    `);
    console.log("✅ Tabel webinar_registrations berhasil dibuat/diverifikasi.");

  } catch (error) {
    console.error("❌ Terjadi kesalahan:", error);
  }
}

createTables();
