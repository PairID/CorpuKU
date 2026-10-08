import puppeteer from 'puppeteer';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

const artifactDir = 'C:\\Users\\Bpsdm\\.gemini\\antigravity\\brain\\0cc80cfa-af0d-4a1e-b960-46c9bbbae1de';

async function simulateRealBrowserFlow() {
  // 1. Buat webinar baru yang SEDANG LIVE dan PRESENSI TERBUKA
  const webinarId = 'webinar-live-sim-' + Date.now();
  const scheduledTime = new Date();
  const webinarTitle = "Webinar AKU KEJAR Seri 26: Transformasi Pembelajaran Digital ASN Kaltara";
  
  console.log('Menyiapkan webinar live di DB...');
  await sql`
    INSERT INTO webinars (
      id, title, description, thumbnail_url, meeting_link, youtube_url,
      is_attendance_open, scheduled_at, attendance_code, status, join_window_minutes,
      certificate_enabled, certificate_auto_issue, certificate_template_type,
      certificate_number_prefix, certificate_jp
    ) VALUES (
      ${webinarId}, ${webinarTitle}, 'Deskripsi webinar',
      'https://res.cloudinary.com/dvf6m2v7w/image/upload/v1715764000/webinar_poster.png',
      'https://zoom.us/j/8899776655', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      TRUE, ${scheduledTime.toISOString()}, 'AKJ26-BPSDM', 'published', 30,
      TRUE, TRUE, 'sertifikat', 'AKJ-26', 2
    )
  `;

  // Bersihkan pendaftaran lama jika ada untuk NIP simulasi browser
  const testNip = '198507122010011005';
  await sql`DELETE FROM issued_webinar_certificates WHERE participant_nip = ${testNip}`;
  await sql`DELETE FROM webinar_registrations WHERE user_id = ${'guest_' + testNip}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  // 2. Buka portal webinar
  const targetUrl = `http://localhost:3001/webinars/${webinarId}`;
  console.log(`Membuka portal: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });

  // Screenshot 1: Form kosong sebelum diisi (Momen Live Streaming)
  const ss1 = path.join(artifactDir, 'screenshot_1_form_kosong.png');
  await page.screenshot({ path: ss1, fullPage: true });
  console.log(`Saved screenshot 1 (form kosong): ${ss1}`);

  // 3. Ketik data satu-per-satu di input form (simulasi interaksi manusia nyata)
  console.log('Mengetik data identitas di browser...');
  const nipInput = await page.waitForSelector('input[placeholder*="18 digit NIP"]');
  await nipInput.type(testNip, { delay: 20 });

  const nameInput = await page.waitForSelector('input[placeholder*="Nama lengkap"]');
  await nameInput.type('A.S. Fitriannur Azim, S.Sos.', { delay: 20 });

  const agencyInput = await page.waitForSelector('input[placeholder*="BPSDM Provinsi"]');
  await agencyInput.type('Pemerintah Provinsi Kalimantan Utara', { delay: 20 });

  const positionInput = await page.waitForSelector('input[placeholder*="Analis Kebijakan"]');
  await positionInput.type('Analis Sumber Daya Manusia Aparatur', { delay: 20 });

  const phoneInput = await page.waitForSelector('input[placeholder="08123456789"]');
  await phoneInput.type('081255667788', { delay: 20 });

  // Ketik saran di form SKM
  const feedbackInput = await page.waitForSelector('textarea[placeholder*="Berikan masukan"]');
  await feedbackInput.type('Materi narasumber sangat komprehensif, relevan, dan paparan interaktif.', { delay: 10 });

  // Screenshot 2: Form sedang diisi lengkap
  const ss2 = path.join(artifactDir, 'screenshot_2_form_terisi_lengkap.png');
  await page.screenshot({ path: ss2, fullPage: true });
  console.log(`Saved screenshot 2 (form terisi lengkap): ${ss2}`);

  // 4. Klik tombol Submit (Kirim Presensi & Evaluasi Sekarang)
  console.log('Mengklik tombol Kirim Presensi & Evaluasi Sekarang...');
  const submitBtn = await page.waitForSelector('button[type="submit"]');
  await submitBtn.click();

  // Tunggu transisi UI selesai (muncul notifikasi sukses / status kehadiran tersimpan)
  await new Promise(r => setTimeout(r, 4000));

  // Screenshot 3: Tampilan sukses setelah submit presensi
  const ss3 = path.join(artifactDir, 'screenshot_3_presensi_berhasil_disimpan.png');
  await page.screenshot({ path: ss3, fullPage: true });
  console.log(`Saved screenshot 3 (presensi tersimpan): ${ss3}`);

  await browser.close();
  console.log('Simulasi proses interaksi browser 100% selesai.');
}

simulateRealBrowserFlow().catch(console.error);
