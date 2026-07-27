import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

async function main() {
  console.log('🔍 Mengecek dan menambah kolom yang diperlukan di tabel users...\n');

  const alterStatements = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS pangkat TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS jabatan TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS golongan TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS instansi_asal TEXT',
  ];

  for (const stmt of alterStatements) {
    try {
      await sql.query(stmt);
      const col = stmt.match(/ADD COLUMN IF NOT EXISTS (\w+)/)[1];
      console.log(`✅ Kolom "${col}" sudah ada / berhasil ditambahkan.`);
    } catch (err) {
      console.error(`❌ Gagal:`, err.message);
    }
  }

  // Verifikasi: tampilkan kolom yang ada
  console.log('\n📋 Kolom tabel users saat ini:');
  const result = await sql.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position
  `);
  result.rows.forEach(r => console.log(`   - ${r.column_name} (${r.data_type})`));
  console.log('\n✅ Selesai!');
}

main().catch(console.error);
