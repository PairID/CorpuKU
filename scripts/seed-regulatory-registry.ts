import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { seedDocumentRegistryToDb } from '../src/lib/regulatory-registry';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("🌱 Menjalankan Seeding Document Registry ke Neon...");
  await seedDocumentRegistryToDb(sql);
  console.log("✅ Seeding selesai! Memeriksa isi tabel...");

  const docs = await sql`SELECT id, doc_number, doc_year, status, amended_by, superseded_by FROM document_registry ORDER BY doc_year DESC;`;
  console.log("Documents in Registry:", docs);

  const arts = await sql`SELECT id, document_id, article_number FROM legal_articles ORDER BY document_id, article_number;`;
  console.log("Articles in Registry:", arts);
}

main().catch(err => {
  console.error("❌ Seeding gagal:", err);
  process.exit(1);
});
