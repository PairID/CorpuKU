import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkEndpoints() {
  console.log("=== BUKTI 4: HTTP CHECK ENDPOINTS ===");

  // 1. Landing Page HTML check
  const landingRes = await fetch("http://localhost:3001");
  const landingHtml = await landingRes.text();
  const hasWebinarTitle = landingHtml.includes("Webinar AKU KEJAR Seri 26");
  console.log(`1. Landing Page (http://localhost:3001): Status ${landingRes.status}`);
  console.log(`   - Menampilkan judul 'Webinar AKU KEJAR Seri 26': ${hasWebinarTitle ? 'YA (Ditemukan di HTML)' : 'TIDAK'}`);

  // 2. Public Verification Page
  const token = "5fc29f9b-bf28-44e3-b2eb-8b698d45454f";
  const verifyRes = await fetch(`http://localhost:3001/verify/certificates/${token}`);
  const verifyHtml = await verifyRes.text();
  console.log(`\n2. Halaman Verifikasi Publik (/verify/certificates/${token}): Status ${verifyRes.status}`);
  console.log(`   - Memuat Nomor Sertifikat '800.2.5_12327_BPSDM_AKJ-26_X_2026': ${verifyHtml.includes("800.2.5_12327_BPSDM_AKJ-26_X_2026") ? 'YA' : 'TIDAK'}`);
  console.log(`   - Memuat Nama Peserta 'A.S. Fitriannur Azim': ${verifyHtml.includes("Fitriannur") ? 'YA' : 'TIDAK'}`);

  // 3. Webinar Portal Detail
  const webinarId = "f3846fe7-07ff-4bfe-8164-5e300a0a7469";
  const detailRes = await fetch(`http://localhost:3001/webinars/${webinarId}`);
  console.log(`\n3. Portal Publik Webinar (/webinars/${webinarId}): Status ${detailRes.status}`);
}

checkEndpoints().catch(console.error);
