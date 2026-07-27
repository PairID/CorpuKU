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

async function run() {
  console.log("🚀 Menambahkan kolom batch upload ke tabel external_bangkom...");
  try {
    await sql`ALTER TABLE external_bangkom ADD COLUMN IF NOT EXISTS certificate_no VARCHAR(255)`;
    await sql`ALTER TABLE external_bangkom ADD COLUMN IF NOT EXISTS date_started DATE`;
    console.log("✅ Kolom berhasil ditambahkan.");
  } catch (error) {
    console.error("❌ Terjadi kesalahan:", error);
  }
}

run();
