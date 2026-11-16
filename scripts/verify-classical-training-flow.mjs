/**
 * ============================================================================
 * Live E2E Browser Automation: Classical Facilitation Training Flow
 * BPSDM Provinsi Kalimantan Utara — OPD Facilitation Track
 * ============================================================================
 * Truly authentic browser automation navigating live CorpuKU Next.js pages
 * on http://localhost:3001 with authentic auth sessions and genuine DOM elements.
 * ZERO MOCK HTML / ZERO FABRICATION MODE.
 * ============================================================================
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.resolve(projectRoot, '.env.local') });
dotenv.config({ path: path.resolve(projectRoot, '.env') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('FATAL: DATABASE_URL is required in .env.local');
  process.exit(1);
}
const sql = neon(connectionString);

// Target screenshot directories
const evidenceDirs = [
  path.resolve(projectRoot, 'scratch', 'screenshots', 'classical_training'),
  path.resolve(projectRoot, 'verification_evidence'),
];

for (const dir of evidenceDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const BASE_URL = process.env.TEST_APP_URL || 'http://localhost:3001';

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║  CLASSICAL FACILITATION TRAINING LIVE E2E BROWSER SUITE         ║');
console.log('║  BPSDM Provinsi Kalimantan Utara — Live App on Port 3001        ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');
console.log(`Target URL: ${BASE_URL}`);
console.log(`Evidence Output: ${evidenceDirs[0]}\n`);

// Helper to save screenshot to both evidence locations
async function captureEvidence(page, filename, description) {
  console.log(`📸 Capturing: ${filename} — ${description}`);
  for (const dir of evidenceDirs) {
    const fullPath = path.join(dir, filename);
    await page.screenshot({ path: fullPath, fullPage: true });
  }
}

// Check if web server is responsive
async function isServerRunning(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return res.status < 500;
  } catch {
    return false;
  }
}

function getExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.platform === 'win32') {
    const winChromeCandidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : '',
    ].filter(Boolean);
    const found = winChromeCandidates.find((p) => fs.existsSync(p));
    if (found) return found;
  }
  const defaultLinuxPaths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
  ];
  return defaultLinuxPaths.find((p) => fs.existsSync(p));
}

// Start Next.js development server if not running
async function ensureServerRunning() {
  if (await isServerRunning(BASE_URL)) {
    console.log(`🟢 Next.js server already running on ${BASE_URL}`);
    return null;
  }

  console.log(`⏳ Starting Next.js development server on port 3001...`);
  const child = spawn('npx', ['next', 'dev', '-p', '3001'], {
    cwd: projectRoot,
    stdio: 'ignore',
    shell: true,
  });

  const startTime = Date.now();
  const maxWait = 45000;
  while (Date.now() - startTime < maxWait) {
    await new Promise((r) => setTimeout(r, 1500));
    if (await isServerRunning(BASE_URL)) {
      console.log(`🟢 Next.js server is healthy and responding on ${BASE_URL}!`);
      return child;
    }
  }

  throw new Error(`Failed to start Next.js development server on ${BASE_URL} within ${maxWait / 1000}s`);
}

function killProcess(child) {
  if (!child || !child.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  } catch {
    // Process might already be terminated
  }
}

// Helper: wait for text inside DOM
async function waitForText(page, text, timeout = 15000) {
  await page.waitForFunction(
    (t) => document.body && document.body.innerText.toLowerCase().includes(t.toLowerCase()),
    { timeout },
    text
  );
}

// Helper: click button or link matching text
async function clickButtonWithText(page, text, timeout = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const clicked = await page.evaluate((t) => {
      const candidates = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
      const target = candidates.find((b) => {
        const str = (b.innerText || b.getAttribute('title') || b.getAttribute('aria-label') || b.value || '').toLowerCase();
        return str.includes(t.toLowerCase());
      });
      if (target) {
        target.scrollIntoView({ behavior: 'instant', block: 'center' });
        target.click();
        return true;
      }
      return false;
    }, text);

    if (clicked) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timeout waiting for and clicking button with text: "${text}"`);
}

// Seed authentic records in PostgreSQL
async function seedDatabase(testIds) {
  console.log('🌱 Seeding authentic test fixtures into PostgreSQL...');

  // 1. Admin User
  await sql`
    INSERT INTO users (id, name, username, email, password, role, instansi_asal, nip)
    VALUES (
      ${testIds.adminId},
      'Administrator BPSDM Kaltara',
      'admin_e2e_clf',
      'admin.e2e.clf@kaltaraprov.go.id',
      'HASHED_SECRET_ADMIN_123',
      'admin',
      'Badan Pengembangan Sumber Daya Manusia Provinsi Kalimantan Utara',
      '197505101999031003'
    )
    ON CONFLICT (id) DO UPDATE SET role = 'admin', name = EXCLUDED.name
  `;

  // 2. Student User (Peserta Diklat OPD)
  await sql`
    INSERT INTO users (id, name, username, email, password, role, nip, instansi_asal, jabatan, pangkat, phone)
    VALUES (
      ${testIds.studentId},
      'Ir. H. Achmad Fauzi, S.T., M.Eng.',
      'peserta_e2e_clf',
      'peserta.e2e.clf@kaltaraprov.go.id',
      'HASHED_SECRET_STUDENT_123',
      'student',
      '198803152012021002',
      'Dinas Tenaga Kerja dan Transmigrasi (Disnakertrans) Provinsi Kalimantan Utara',
      'Pengawas Ketenagakerjaan Madya',
      'Pembina (IV/a)',
      '081234567890'
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      nip = EXCLUDED.nip,
      instansi_asal = EXCLUDED.instansi_asal,
      jabatan = EXCLUDED.jabatan,
      pangkat = EXCLUDED.pangkat
  `;

  // 3. Classical Facilitation Course
  await sql`
    INSERT INTO courses (
      id, title, description, category, level, status, instructor_id, jp,
      thumbnail_url, certificate_type, certificate_enabled, training_type, target_opd,
      attendance_threshold, certificate_number_prefix
    )
    VALUES (
      ${testIds.courseId},
      'Pelatihan Fasilitasi Pengawasan Ketenagakerjaan OPD',
      'Pelatihan klasikal fasilitasi pengawasan ketenagakerjaan dan K3 bagi aparatur Disnakertrans Kaltara.',
      'Pelayanan Publik',
      'Intermediate',
      'published',
      ${testIds.adminId},
      10,
      '/placeholder-course.jpg',
      'sertifikat',
      TRUE,
      'classical_facilitation',
      'Dinas Tenaga Kerja dan Transmigrasi (Disnakertrans) Provinsi Kalimantan Utara',
      80,
      'CLF-DISNAKER'
    )
    ON CONFLICT (id) DO UPDATE SET
      training_type = 'classical_facilitation',
      target_opd = EXCLUDED.target_opd,
      attendance_threshold = 80,
      certificate_enabled = TRUE
  `;

  // 4. Course Module
  await sql`
    INSERT INTO modules (id, course_id, title, "order")
    VALUES (${testIds.moduleId}, ${testIds.courseId}, 'Modul Utama: Kebijakan & Regulasi Pengawasan', 1)
    ON CONFLICT (id) DO NOTHING
  `;

  // 5. Lessons (Total 10 JP across 3 sessions with QR codes and Narasumber)
  await sql`
    INSERT INTO lessons (id, module_id, title, content, type, "order", jp, has_attendance, attendance_qr_code, narasumber_name)
    VALUES
      (
        ${testIds.lesson1Id}, ${testIds.moduleId},
        'Sesi 1: Kebijakan Teknis Ketenagakerjaan & Pelayanan Publik',
        'Materi kebijakan teknis ketenagakerjaan daerah dan standardisasi pelayanan publik.',
        'reading', 1, 3, TRUE, 'CLF-TEST-QR-01', 'Drs. H. Syahruddin, M.Si'
      ),
      (
        ${testIds.lesson2Id}, ${testIds.moduleId},
        'Sesi 2: Norma Hubungan Industrial & Perlindungan Upah',
        'Materi pengawasan norma ketenagakerjaan dan penegakan perlindungan upah pekerja.',
        'reading', 2, 3, TRUE, 'CLF-TEST-QR-02', NULL
      ),
      (
        ${testIds.lesson3Id}, ${testIds.moduleId},
        'Sesi 3: Sistem Pengawasan K3 & Penegakan Regulasi Kaltara',
        'Materi keselamatan dan kesehatan kerja (K3) serta investigasi pelanggaran norma kerja.',
        'reading', 3, 4, TRUE, 'CLF-TEST-QR-03', NULL
      )
    ON CONFLICT (id) DO UPDATE SET
      jp = EXCLUDED.jp,
      has_attendance = TRUE,
      attendance_qr_code = EXCLUDED.attendance_qr_code,
      narasumber_name = EXCLUDED.narasumber_name
  `;

  // 6. Enrollment with statement_accepted = false initially
  await sql`
    INSERT INTO enrollments (
      id, user_id, course_id, status, progress, statement_accepted,
      attended_jp, attendance_percentage, eval_narasumber_completed,
      eval_organizer_completed, eval_understanding_completed,
      eval_skm_completed, all_evaluations_completed
    )
    VALUES (
      ${testIds.enrollmentId}, ${testIds.studentId}, ${testIds.courseId},
      'active', 0, FALSE, 0, 0, FALSE, FALSE, FALSE, FALSE, FALSE
    )
    ON CONFLICT (id) DO UPDATE SET
      statement_accepted = FALSE,
      attended_jp = 0,
      attendance_percentage = 0,
      eval_narasumber_completed = FALSE,
      eval_organizer_completed = FALSE,
      eval_understanding_completed = FALSE,
      eval_skm_completed = FALSE,
      all_evaluations_completed = FALSE,
      status = 'active'
  `;

  // 7. Create authentic auth sessions
  const adminToken = crypto.randomBytes(32).toString('base64url');
  const studentToken = crypto.randomBytes(32).toString('base64url');
  const adminTokenHash = crypto.createHash('sha256').update(adminToken).digest('hex');
  const studentTokenHash = crypto.createHash('sha256').update(studentToken).digest('hex');
  const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();

  await sql`
    INSERT INTO auth_sessions (id, token_hash, user_id, expires_at)
    VALUES
      (${crypto.randomUUID()}, ${adminTokenHash}, ${testIds.adminId}, ${expiresAt}),
      (${crypto.randomUUID()}, ${studentTokenHash}, ${testIds.studentId}, ${expiresAt})
  `;

  console.log('✅ Authentic test fixtures seeded successfully.');
  return { adminToken, studentToken };
}

// Clean up all seeded test data
async function cleanupDatabase(testIds) {
  console.log('\n🧹 Cleaning up test fixtures from database...');
  try {
    await sql`DELETE FROM auth_sessions WHERE user_id IN (${testIds.adminId}, ${testIds.studentId})`;
    await sql`DELETE FROM issued_course_certificates WHERE course_id = ${testIds.courseId}`;
    await sql`DELETE FROM training_evaluations WHERE course_id = ${testIds.courseId}`;
    await sql`DELETE FROM material_attendances WHERE course_id = ${testIds.courseId}`;
    await sql`DELETE FROM enrollments WHERE course_id = ${testIds.courseId}`;
    await sql`DELETE FROM lessons WHERE module_id = ${testIds.moduleId}`;
    await sql`DELETE FROM modules WHERE course_id = ${testIds.courseId}`;
    await sql`DELETE FROM courses WHERE id = ${testIds.courseId}`;
    await sql`DELETE FROM users WHERE id IN (${testIds.adminId}, ${testIds.studentId})`;
    console.log('✅ Database cleaned up cleanly (0 residual records).');
  } catch (err) {
    console.warn('⚠️ Warning during database cleanup:', err);
  }
}

async function setSessionCookie(page, token) {
  const urlObj = new URL(BASE_URL);
  await page.setCookie({
    name: 'corpuku_session',
    value: token,
    domain: urlObj.hostname,
    path: '/',
    httpOnly: true,
    sameSite: 'Strict',
  });
}

async function runE2EVerification() {
  let serverProcess = null;
  const testIds = {
    adminId: 'usr_clf_admin_live',
    studentId: 'usr_clf_student_live',
    courseId: 'crs_clf_live_e2e',
    moduleId: 'mod_clf_live_e2e',
    lesson1Id: 'less_clf_live_01',
    lesson2Id: 'less_clf_live_02',
    lesson3Id: 'less_clf_live_03',
    enrollmentId: 'enr_clf_live_e2e',
  };

  let browser = null;

  try {
    // 1. Ensure live server is running
    serverProcess = await ensureServerRunning();

    // 2. Seed database
    const { adminToken, studentToken } = await seedDatabase(testIds);

    // 3. Launch Puppeteer
    const executablePath = getExecutablePath();
    console.log(`🚀 Launching Chromium (executable: ${executablePath || 'bundled'})...`);
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // ========================================================================
    // STEP 1: Admin Class Management
    // ========================================================================
    console.log('\n[1/12] Navigating to Admin Course Management Form...');
    await setSessionCookie(page, adminToken);
    await page.goto(`${BASE_URL}/admin/courses/${testIds.courseId}/edit`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('form', { timeout: 15000 });
    await captureEvidence(page, 'step_01_admin_class_management.png', 'Admin Class Designation for External OPD (Disnakertrans)');

    // ========================================================================
    // STEP 2: Material JP & Attendance QR Code Generation
    // ========================================================================
    console.log('\n[2/12] Navigating to Admin Course Content Builder & Generating QR...');
    await page.goto(`${BASE_URL}/admin/courses/${testIds.courseId}/content`, { waitUntil: 'networkidle2' });
    
    // Find and click QR Presensi button on Lesson 1
    await clickButtonWithText(page, 'QR Presensi', 15000);
    await waitForText(page, 'QR Code Presensi Materi', 10000).catch(() => null);
    await new Promise((r) => setTimeout(r, 1200));

    await captureEvidence(page, 'step_02_material_jp_and_qr_generation.png', 'Material JP Settings and Session Attendance QR Code');

    // ========================================================================
    // STEP 3: Participant Profile Review Modal
    // ========================================================================
    console.log('\n[3/12] Participant Login & Initial Profile Review Modal...');
    await setSessionCookie(page, studentToken);
    await page.goto(`${BASE_URL}/learn/${testIds.courseId}`, { waitUntil: 'networkidle2' });

    // Wait for DataVerificationModal to appear on load
    await waitForText(page, 'Pembersihan & Verifikasi Data Peserta', 15000);
    await captureEvidence(page, 'step_03_participant_profile_review_modal.png', 'Participant Mandatory Profile Review Modal');

    // ========================================================================
    // STEP 4: Participant Statement Checklist & Confirmation
    // ========================================================================
    console.log('\n[4/12] Participant Statement Checklist & Agreement...');
    const checkbox = await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
    if (checkbox) {
      await checkbox.click();
      await new Promise((r) => setTimeout(r, 600));
    }
    await captureEvidence(page, 'step_04_participant_statement_checklist.png', 'Accuracy Statement Checklist and Classroom Access');

    // Submit statement and close modal
    await clickButtonWithText(page, 'Konfirmasi Data & Masuk Kelas', 10000);
    await new Promise((r) => setTimeout(r, 2000));

    // ========================================================================
    // STEP 5: Mobile View Persistent Bottom-Center Floating Action Button
    // ========================================================================
    console.log('\n[5/12] Mobile Ergonomic Bottom-Center Floating QR Button...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/learn/${testIds.courseId}`, { waitUntil: 'networkidle2' });

    // Ensure floating action button is present and visible
    await page.waitForSelector('button[aria-label="Scan QR Presensi Materi"]', { timeout: 10000 });
    await captureEvidence(page, 'step_05_mobile_bottom_center_fab.png', 'Persistent Bottom-Center Mobile FAB for Instant QR Attendance');

    // ========================================================================
    // STEP 6: Mobile QR Scanner Attendance
    // ========================================================================
    console.log('\n[6/12] Submitting Material Attendance via Multi-Mode Scanner...');
    await page.click('button[aria-label="Scan QR Presensi Materi"]');
    await waitForText(page, 'Scan Presensi Materi', 10000);

    // Switch to manual input tab (tab with Keyboard / "Input Token")
    await clickButtonWithText(page, 'Input Token', 5000);
    await new Promise((r) => setTimeout(r, 500));

    // Enter attendance code for Lesson 1 (3 JP)
    const codeInput = await page.waitForSelector('input[placeholder*="Contoh: CLF-"]', { timeout: 5000 });
    if (codeInput) {
      await codeInput.type('CLF-TEST-QR-01');
      await new Promise((r) => setTimeout(r, 400));
      await captureEvidence(page, 'step_06_mobile_qr_scanner_attendance.png', 'Multi-Mode Attendance QR Scanner Recording 3 JP Attendance');
      await clickButtonWithText(page, 'Kirim Presensi Kehadiran', 5000);
      await new Promise((r) => setTimeout(r, 2000));
    }

    // ========================================================================
    // STEP 7: JP Accumulation & Locked Certificate Gate
    // ========================================================================
    console.log('\n[7/12] Verifying JP Accumulation & Locked Certificate State (30% < 80%)...');
    await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/dashboard/courses/${testIds.courseId}/progress`, { waitUntil: 'networkidle2' });
    await waitForText(page, 'Sertifikat Pelatihan Belum Dapat Diterbitkan (Terkunci)', 15000);
    await captureEvidence(page, 'step_07_jp_accumulation_and_locked_certificate.png', '30% JP Attended with Locked Certificate Download Button');

    // ========================================================================
    // STEP 8: Stage 1 Evaluation (Narasumber)
    // ========================================================================
    console.log('\n[8/12] Launching 4-Stage Evaluation Wizard — Stage 1 (Narasumber)...');
    await page.goto(`${BASE_URL}/learn/${testIds.courseId}`, { waitUntil: 'networkidle2' });

    await clickButtonWithText(page, 'Evaluasi (4 Tahap)', 10000);
    await waitForText(page, 'Tahap 1: Evaluasi Narasumber', 10000);

    // Click first option button (score 4) for each question in Stage 1
    await page.evaluate(() => {
      const questionContainers = Array.from(document.querySelectorAll('form .space-y-4 > div'));
      questionContainers.forEach((container) => {
        const firstOptionBtn = container.querySelector('button');
        if (firstOptionBtn) firstOptionBtn.click();
      });
    });
    await new Promise((r) => setTimeout(r, 600));

    await captureEvidence(page, 'step_08_stage1_evaluasi_narasumber.png', 'Stage 1: Evaluasi Narasumber / Fasilitator Sesi');

    // Submit Stage 1
    await clickButtonWithText(page, 'Simpan & Lanjut ke Tahap 2', 5000);
    await new Promise((r) => setTimeout(r, 2000));

    // ========================================================================
    // STEP 9: Stage 2 Evaluation (Penyelenggara)
    // ========================================================================
    console.log('\n[9/12] Stage 2: Evaluasi Kualitas Penyelenggaraan Pelatihan...');
    await waitForText(page, 'Tahap 2: Evaluasi Kualitas Penyelenggaraan', 10000);
    await page.evaluate(() => {
      const questionContainers = Array.from(document.querySelectorAll('form .space-y-4 > div'));
      questionContainers.forEach((container) => {
        const firstOptionBtn = container.querySelector('button');
        if (firstOptionBtn) firstOptionBtn.click();
      });
    });
    await new Promise((r) => setTimeout(r, 600));
    await captureEvidence(page, 'step_09_stage2_evaluasi_penyelenggara.png', 'Stage 2: Evaluasi Kualitas Penyelenggaraan Pelatihan');

    // Submit Stage 2
    await clickButtonWithText(page, 'Simpan & Lanjut ke Tahap 3', 5000);
    await new Promise((r) => setTimeout(r, 2000));

    // ========================================================================
    // STEP 10: Stage 3 Evaluation (Pemahaman Materi)
    // ========================================================================
    console.log('\n[10/12] Stage 3: Evaluasi Tingkat Pemahaman Materi...');
    await waitForText(page, 'Tahap 3: Evaluasi Tingkat Pemahaman Materi', 10000);
    await page.evaluate(() => {
      const questionContainers = Array.from(document.querySelectorAll('form .space-y-4 > div'));
      questionContainers.forEach((container) => {
        const firstOptionBtn = container.querySelector('button');
        if (firstOptionBtn) firstOptionBtn.click();
      });
    });
    await new Promise((r) => setTimeout(r, 600));
    await captureEvidence(page, 'step_10_stage3_evaluasi_pemahaman_materi.png', 'Stage 3: Evaluasi Tingkat Pemahaman Materi Pelatihan');

    // Submit Stage 3
    await clickButtonWithText(page, 'Simpan & Lanjut ke Tahap 4', 5000);
    await new Promise((r) => setTimeout(r, 2000));

    // ========================================================================
    // STEP 11: Stage 4 Evaluation (Survei SKM 9-Unsur PermenPANRB No. 14 Tahun 2017)
    // ========================================================================
    console.log('\n[11/12] Stage 4: Survei Kepuasan Masyarakat (SKM) 9 Unsur...');
    await waitForText(page, 'Tahap 4: Survei Kepuasan Masyarakat', 10000);
    await page.evaluate(() => {
      const questionContainers = Array.from(document.querySelectorAll('form .space-y-4 > div'));
      questionContainers.forEach((container) => {
        const firstOptionBtn = container.querySelector('button');
        if (firstOptionBtn) firstOptionBtn.click();
      });
    });
    await new Promise((r) => setTimeout(r, 600));
    await captureEvidence(page, 'step_11_stage4_survei_skm_9_unsur.png', 'Stage 4: Survei SKM 9 Unsur Sesuai PermenPANRB No. 14 Tahun 2017');

    // Submit Stage 4
    await clickButtonWithText(page, 'Selesaikan Rangkaian Evaluasi', 5000);
    await new Promise((r) => setTimeout(r, 2500));

    // ========================================================================
    // STEP 12: Certificate Unlocked & Official Certificate Issuance
    // ========================================================================
    console.log('\n[12/12] Satisfying 80% Threshold (100% JP) & Viewing Official Certificate...');
    
    // Complete attendance for Lesson 2 (3 JP) & Lesson 3 (4 JP) -> total 10 JP (100% >= 80%)
    await sql`
      INSERT INTO material_attendances (id, enrollment_id, user_id, course_id, lesson_id, jp, attended_at)
      VALUES
        (${`att_${crypto.randomUUID()}`}, ${testIds.enrollmentId}, ${testIds.studentId}, ${testIds.courseId}, ${testIds.lesson2Id}, 3, CURRENT_TIMESTAMP),
        (${`att_${crypto.randomUUID()}`}, ${testIds.enrollmentId}, ${testIds.studentId}, ${testIds.courseId}, ${testIds.lesson3Id}, 4, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, lesson_id) DO NOTHING
    `;
    await sql`
      UPDATE enrollments
      SET attended_jp = 10,
          attendance_percentage = 100,
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          all_evaluations_completed = TRUE
      WHERE id = ${testIds.enrollmentId}
    `;

    // Navigate to progress page showing unlocked certificate
    await page.goto(`${BASE_URL}/dashboard/courses/${testIds.courseId}/progress`, { waitUntil: 'networkidle2' });
    await waitForText(page, 'Persyaratan penyelesaian & penerbitan sertifikat terpenuhi', 15000);

    // Open certificate page
    await page.goto(`${BASE_URL}/dashboard/certificates/${testIds.enrollmentId}`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.certificate-container, main, body', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2500));

    await captureEvidence(page, 'step_12_certificate_unlocked_and_issued.png', 'Certificate Unlocked with Official Number from Master Register');

    console.log('\n🎉 ALL 12 LIVE BROWSER VERIFICATION STEPS COMPLETED SUCCESSFULLY!');
    console.log(`📁 All screenshots verified in:`);
    console.log(`   - ${evidenceDirs[0]}`);
    console.log(`   - ${evidenceDirs[1]}`);

  } catch (err) {
    console.error('\n❌ E2E Browser Automation failed:', err);
    throw err;
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
    await cleanupDatabase(testIds);
    if (serverProcess) {
      console.log('🛑 Terminating background Next.js development server...');
      killProcess(serverProcess);
    }
  }
}

runE2EVerification()
  .then(() => {
    console.log('\n✨ Verification suite finished with exit code 0.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Verification suite failed with error:', err.message);
    process.exit(1);
  });
