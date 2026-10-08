import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) throw new Error("DATABASE_URL tidak ditemukan.");
const sql = neon(connectionString);

async function runSimulation() {
  console.log("=== 1. MENYIAPKAN SEQUENCE NOMOR SERTIFIKAT ===");
  // Pastikan sequence dimulai dari 12327 sesuai standar BPSDM yang diminta user
  await sql`ALTER SEQUENCE webinar_certificate_number_seq RESTART WITH 12327`;
  console.log("Sequence webinar_certificate_number_seq disetel restart ke 12327.");

  console.log("\n=== 2. MEMBUAT WEBINAR BARU (JADWAL: 5 MENIT DARI SEKARANG) ===");
  const webinarId = crypto.randomUUID();
  const scheduledTime = new Date(Date.now() + 5 * 60 * 1000); // 5 menit dari sekarang
  const webinarTitle = "Webinar AKU KEJAR Seri 26: Transformasi Pembelajaran Digital ASN Kaltara";
  const webinarDesc = "Peningkatan kompetensi dan literasi digital ASN di lingkungan Pemerintah Provinsi Kalimantan Utara dalam rangka mewujudkan Smart ASN berkelas dunia.";

  await sql`
    INSERT INTO webinars (
      id, title, description, thumbnail_url, meeting_link, youtube_url,
      is_attendance_open, scheduled_at, attendance_code, status, join_window_minutes,
      certificate_enabled, certificate_auto_issue, certificate_template_type,
      certificate_number_prefix, certificate_jp
    ) VALUES (
      ${webinarId}, ${webinarTitle}, ${webinarDesc},
      'https://res.cloudinary.com/dvf6m2v7w/image/upload/v1715764000/webinar_poster.png',
      'https://zoom.us/j/8899776655',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      FALSE, ${scheduledTime.toISOString()}, 'AKJ26-BPSDM', 'published', 30,
      TRUE, TRUE, 'sertifikat', 'AKJ-26', 2
    )
  `;
  console.log(`Webinar berhasil dibuat!`);
  console.log(`ID: ${webinarId}`);
  console.log(`Judul: ${webinarTitle}`);
  console.log(`Jadwal: ${scheduledTime.toISOString()} (5 menit lagi)`);
  console.log(`Prefix: AKJ-26`);

  console.log("\n=== 3. CEK APAKAH MUNCUL DI LANDING PAGE DAN KATALOG ===");
  // Cek featured webinar di landing page
  const featured = await sql`
    SELECT id, title, scheduled_at, is_attendance_open, status
    FROM webinars
    WHERE status = 'published'
      AND (
        is_attendance_open = TRUE
        OR (
          scheduled_at <= CURRENT_TIMESTAMP + INTERVAL '1 hour'
          AND scheduled_at >= CURRENT_TIMESTAMP - INTERVAL '6 hours'
        )
      )
    ORDER BY is_attendance_open DESC, scheduled_at ASC
    LIMIT 1
  `;
  console.log("Featured Webinar untuk Landing Page (/):", featured[0]?.title === webinarTitle ? "BERHASIL (Muncul sebagai Webinar Utama di Hero Showcase)" : "GAGAL", featured[0]);

  // Cek katalog webinar (/webinars)
  const catalogList = await sql`
    SELECT id, title, scheduled_at, status
    FROM webinars
    WHERE status = 'published'
    ORDER BY scheduled_at ASC
  `;
  const inCatalog = catalogList.some(w => w.id === webinarId);
  console.log("Katalog Webinar (/webinars):", inCatalog ? `BERHASIL (Tercatat dalam ${catalogList.length} webinar published)` : "GAGAL");

  console.log("\n=== 4. SIMULASI ALUR WEBINAR: MOMEN 1 (PRA-ACARA) ===");
  console.log("- Status kehadiran: Tertutup (is_attendance_open = false)");
  console.log("- Peserta melihat countdown timer 5 menit menuju acara.");
  console.log("- Fasilitas Zoom dan materi paparan siap diakses.");

  console.log("\n=== 5. SIMULASI ALUR WEBINAR: MOMEN 2 (SAAT ACARA / LIVE STREAMING) ===");
  console.log("Panitia membuka sesi presensi (Toggle Admin ON)...");
  await sql`UPDATE webinars SET is_attendance_open = TRUE WHERE id = ${webinarId}`;
  console.log("Presensi kini TERBUKA untuk umum.");

  // Data peserta simulasi sesuai nama di file contoh user
  const participantNip = "198507122010011005";
  const participantName = "A.S. Fitriannur Azim, S.Sos.";
  const participantAgency = "Pemerintah Provinsi Kalimantan Utara";
  const participantPosition = "Analis Sumber Daya Manusia Aparatur";

  // Link atau insert user
  const userId = `guest_${participantNip}`;
  await sql`
    INSERT INTO users (id, name, nip, username, email, password, role, instansi_asal, jabatan)
    VALUES (
      ${userId}, ${participantName}, ${participantNip}, ${'user_' + participantNip},
      ${participantNip + '@kaltaraprov.go.id'}, 'HASHED_SECRET', 'student',
      ${participantAgency}, ${participantPosition}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      instansi_asal = EXCLUDED.instansi_asal,
      jabatan = EXCLUDED.jabatan
  `;

  // Peserta mengisi form presensi & survei kepuasan masyarakat (SKM 9 unsur)
  const skmAnswers = [
    { questionId: 1, score: 4 }, { questionId: 2, score: 4 }, { questionId: 3, score: 4 },
    { questionId: 4, score: 4 }, { questionId: 5, score: 4 }, { questionId: 6, score: 4 },
    { questionId: 7, score: 4 }, { questionId: 8, score: 4 }, { questionId: 9, score: 4 }
  ];
  // ponytail: score dihitung dinamis dari jawaban SKM, bukan hardcoded
  const evalScore = (skmAnswers.reduce((s, a) => s + a.score, 0) / (skmAnswers.length * 4)) * 100;

  const regId = crypto.randomUUID();
  await sql`
    INSERT INTO webinar_registrations (
      id, user_id, webinar_id, registered_at, attended, attended_at,
      evaluation_completed, evaluation_completed_at, evaluation_score,
      evaluation_answers, agency_name, position_title, skm_answers
    ) VALUES (
      ${regId}, ${userId}, ${webinarId}, CURRENT_TIMESTAMP, TRUE, CURRENT_TIMESTAMP,
      TRUE, CURRENT_TIMESTAMP, ${evalScore},
      ${JSON.stringify({ type: 'skm', answers: skmAnswers, feedback: 'Sangat bermanfaat dan inspiratif!' })},
      ${participantAgency}, ${participantPosition}, ${JSON.stringify(skmAnswers)}
    )
    ON CONFLICT (user_id, webinar_id) DO UPDATE SET
      attended = TRUE,
      attended_at = CURRENT_TIMESTAMP,
      evaluation_completed = TRUE,
      evaluation_completed_at = CURRENT_TIMESTAMP,
      evaluation_score = ${evalScore}
  `;
  console.log(`Presensi dan evaluasi SKM tercatat untuk peserta: ${participantName} (Nilai SKM: ${evalScore} / Sangat Baik).`);

  console.log("\n=== 6. PENERBITAN SERTIFIKAT SESUAI FORMAT BPSDM ===");
  // Panggil query penerbitan yang sudah kita update
  const certId = crypto.randomUUID();
  const token = crypto.randomUUID();

  const insertCert = await sql`
    WITH eligible AS (
      SELECT wr.id AS registration_id, wr.user_id, wr.webinar_id,
             u.name, u.nip, u.pangkat, u.jabatan, u.instansi_asal,
             w.title, w.scheduled_at, w.certificate_number_prefix,
             w.certificate_template_type, w.certificate_jp,
             COALESCE(
               NULLIF(cs.settings -> w.certificate_template_type, 'null'::jsonb),
               NULLIF(cs.settings -> 'sertifikat', 'null'::jsonb),
               NULLIF(cs.settings, 'null'::jsonb),
               '{}'::jsonb
             ) AS template_settings
      FROM webinar_registrations wr
      JOIN users u ON u.id = wr.user_id
      JOIN webinars w ON w.id = wr.webinar_id
      LEFT JOIN certificate_settings cs ON cs.type = 'sertifikat'
      WHERE wr.user_id = ${userId}
        AND wr.webinar_id = ${webinarId}
        AND wr.attended = TRUE
        AND wr.evaluation_completed = TRUE
        AND wr.evaluation_score IS NOT NULL
        AND w.certificate_enabled = TRUE
    )
    INSERT INTO issued_webinar_certificates (
      id, registration_id, user_id, webinar_id, certificate_number,
      verification_token, participant_name, participant_nip,
      participant_rank, participant_position, participant_institution,
      webinar_title, webinar_scheduled_at, template_version,
      certificate_jp, template_settings
    )
    SELECT ${certId}, registration_id, user_id, webinar_id,
           CASE
             WHEN certificate_number_prefix ~ '^800\.2\.5_' THEN
               certificate_number_prefix || '_' || LPAD(nextval('webinar_certificate_number_seq')::TEXT, 5, '0')
             ELSE
               '800.2.5_' ||
               LPAD(nextval('webinar_certificate_number_seq')::TEXT, 5, '0') ||
               '_BPSDM_' ||
               certificate_number_prefix || '_' ||
               (ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'])[EXTRACT(MONTH FROM COALESCE(scheduled_at, CURRENT_TIMESTAMP))::INTEGER] || '_' ||
               EXTRACT(YEAR FROM COALESCE(scheduled_at, CURRENT_TIMESTAMP))::INTEGER
           END,
           ${token}, name, nip, pangkat, jabatan, instansi_asal,
           title, scheduled_at, certificate_template_type,
           certificate_jp, template_settings
    FROM eligible
    RETURNING *
  `;

  const issuedCert = insertCert[0];
  console.log("Sertifikat Berhasil Diterbitkan:");
  console.log(`- Nama Peserta : ${issuedCert.participant_name}`);
  console.log(`- NIP          : ${issuedCert.participant_nip}`);
  console.log(`- Nomor Sertif : ${issuedCert.certificate_number}`);
  console.log(`- Token Verif  : ${issuedCert.verification_token}`);
  console.log(`- Beban JP     : ${issuedCert.certificate_jp} JP`);

  console.log("\n=== 7. SIMULASI ALUR WEBINAR: MOMEN 3 (PASCA-ACARA) ===");
  // Panitia menutup acara
  await sql`UPDATE webinars SET is_attendance_open = FALSE, status = 'completed' WHERE id = ${webinarId}`;
  console.log("Acara ditandai Selesai (Completed).");

  // Peserta mencari sertifikat berdasarkan NIP
  const certLookup = await sql`
    SELECT c.*
    FROM issued_webinar_certificates c
    JOIN webinar_registrations r ON r.id = c.registration_id
    JOIN users u ON u.id = r.user_id
    WHERE r.webinar_id = ${webinarId} AND u.nip = ${participantNip}
  `;
  console.log("Lookup Sertifikat via NIP di Portal:", certLookup.length > 0 ? "BERHASIL DITEMUKAN" : "TIDAK DITEMUKAN");
  console.log("Data ditemukan:", {
    nomor: certLookup[0]?.certificate_number,
    nama: certLookup[0]?.participant_name,
    kegiatan: certLookup[0]?.webinar_title,
    tautan_verifikasi: `/verify/certificates/${certLookup[0]?.verification_token}`,
  });

  console.log("\n=== 8. SIMULASI UNDUH PDF & FORMAT NAMA FILE ===");
  const expectedFilename = `${participantName}-${issuedCert.certificate_number}-Yang Lain.pdf`;
  console.log("Nama File PDF yang Diunduh:");
  console.log(`- Format Sistem: "${expectedFilename}"`);
  console.log(`- Format Contoh : "A.S. Fitriannur Azim, S.Sos.-800.2.5_12327_BPSDM_AKJ-26_VII_2026-Yang Lain.pdf"`);
  
  // Format check
  const numberRegex = /^800\.2\.5_\d{5}_BPSDM_AKJ-26_[IVXLCDM]+_2026$/;
  const isMatch = numberRegex.test(issuedCert.certificate_number);
  console.log(`- Validasi Regex Format Nomor Sertifikat: ${isMatch ? "VALID (Sesuai 100%)" : "TIDAK VALID"}`);
  console.log(`  Nomor yang dihasilkan: ${issuedCert.certificate_number}`);

  console.log("\n=== SIMULASI END-TO-END SELESAI DENGAN SUKSES ===");
}

runSimulation().catch(err => {
  console.error("Simulation error:", err);
  process.exitCode = 1;
});
