import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("Gagal: DATABASE_URL tidak ditemukan di .env.local");
  process.exit(1);
}

const sql = neon(connectionString);

async function main() {
  console.log("🚀 Membuat tabel staging untuk Batch Upload...");

  try {
    // 1. Create bangkom_batch_jobs
    await sql`
      CREATE TABLE IF NOT EXISTS bangkom_batch_jobs (
        id VARCHAR(255) PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        total_rows INTEGER NOT NULL,
        processed_rows INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log("✅ Tabel bangkom_batch_jobs berhasil dibuat.");

    // 2. Create bangkom_batch_items
    await sql`
      CREATE TABLE IF NOT EXISTS bangkom_batch_items (
        id VARCHAR(255) PRIMARY KEY,
        job_id VARCHAR(255) NOT NULL,
        nip VARCHAR(100) NOT NULL,
        raw_data JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        action_taken VARCHAR(50),
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES bangkom_batch_jobs(id) ON DELETE CASCADE
      )
    `;
    console.log("✅ Tabel bangkom_batch_items berhasil dibuat.");

    console.log("✨ Migrasi tabel staging batch upload selesai!");
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat migrasi:", error);
  }
}

main();
