import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log('Verifying or creating certificate_counters table...');
  await sql.query(`
    CREATE TABLE IF NOT EXISTS certificate_counters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      year INTEGER NOT NULL UNIQUE,
      last_number INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Pastikan tahun 2026 sudah terdaftar dengan sequence awal
  const currentYear = new Date().getFullYear();
  await sql.query(`
    INSERT INTO certificate_counters (year, last_number, updated_at)
    VALUES (${currentYear}, 49, CURRENT_TIMESTAMP)
    ON CONFLICT (year) DO NOTHING;
  `);

  const rows = await sql.query('SELECT * FROM certificate_counters');
  console.log('Current certificate_counters:', rows);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
