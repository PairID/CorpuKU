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

async function setupBangkom() {
  console.log("🚀 Menyiapkan tabel & kolom untuk sistem Bangkom...");

  try {
    // 1. Tambah kolom ke tabel users jika belum ada
    // Kita tambahkan satu per satu agar tidak error jika sudah ada
    console.log("Updating users table metadata...");
    
    try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS target_jp_tahunan INTEGER DEFAULT 20`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS kategori_pegawai VARCHAR(100)`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS nama_instansi VARCHAR(255)`;
        console.log("✅ Kolom metadata users berhasil diperbarui.");
    } catch {
        console.log("ℹ️ Info: Beberapa kolom mungkin sudah ada di tabel users.");
    }

    // 2. Buat tabel external_bangkom
    console.log("Creating external_bangkom table...");
    await sql`
      CREATE TABLE IF NOT EXISTS external_bangkom (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        provider VARCHAR(255) NOT NULL,
        date_completed DATE NOT NULL,
        jp INTEGER NOT NULL,
        certificate_url TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    console.log("✅ Tabel external_bangkom berhasil dibuat.");

    console.log("✨ Migrasi selesai!");
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat migrasi:", error);
  }
}

setupBangkom();
