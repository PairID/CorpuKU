import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { crawlBpkRegulation, syncScrapedRegulationToRegistry } from '../src/lib/regulatory-crawler';

dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);

async function run() {
  console.log("🕷️ Menjalankan Autonomous JDIH BPK Bot Crawler...");

  // 1. Perpres 46/2025 (ID 318647)
  console.log("\n[1/2] Menelusuri Perpres No. 46 Tahun 2025 (ID: 318647)...");
  const perpres46 = await crawlBpkRegulation(318647);
  console.log("Hasil Scrape Perpres 46/2025:", {
    title: perpres46.title,
    status: perpres46.inferredStatus,
    amending: perpres46.amendingTargetTitles,
    pdf: perpres46.pdfUrl
  });

  const synced1 = await syncScrapedRegulationToRegistry(perpres46, sql);
  console.log("✅ Berhasil disinkronkan ke Document Registry:", synced1.id);

  // 2. Perka LKPP 4/2024 (ID 314291)
  console.log("\n[2/2] Menelusuri Peraturan LKPP No. 4 Tahun 2024 (ID: 314291)...");
  const lkpp4 = await crawlBpkRegulation(314291);
  console.log("Hasil Scrape LKPP 4/2024:", {
    title: lkpp4.title,
    status: lkpp4.inferredStatus,
    amending: lkpp4.amendingTargetTitles,
    pdf: lkpp4.pdfUrl
  });

  const synced2 = await syncScrapedRegulationToRegistry(lkpp4, sql);
  console.log("✅ Berhasil disinkronkan ke Document Registry:", synced2.id);

  console.log("\n🎉 Crawler & Ingestion selesai 100%!");
}

run().catch(err => {
  console.error("Crawler Error:", err);
  process.exit(1);
});
