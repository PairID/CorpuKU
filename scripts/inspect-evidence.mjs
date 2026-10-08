import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = neon(connectionString);

async function inspectDb() {
  console.log("=== BUKTI 1: DATA WEBINAR DI DATABASE ===");
  const webinars = await sql`
    SELECT id, title, scheduled_at, is_attendance_open, status, certificate_number_prefix, certificate_jp
    FROM webinars
    WHERE certificate_number_prefix = 'AKJ-26'
    ORDER BY scheduled_at DESC
  `;
  console.table(webinars);

  console.log("\n=== BUKTI 2: DATA PRESENSI & EVALUASI SKM PESERTA ===");
  const registrations = await sql`
    SELECT wr.id, u.name, u.nip, wr.agency_name, wr.position_title, 
           wr.attended, wr.evaluation_completed, wr.evaluation_score,
           wr.skm_answers
    FROM webinar_registrations wr
    JOIN users u ON u.id = wr.user_id
    WHERE u.nip = '198507122010011005'
  `;
  console.table(registrations.map(r => ({
    name: r.name,
    nip: r.nip,
    instansi: r.agency_name,
    jabatan: r.position_title,
    hadir: r.attended,
    skm_selesai: r.evaluation_completed,
    skor_skm: r.evaluation_score
  })));
  if (registrations[0]?.skm_answers) {
    console.log("Detail Jawaban SKM (9 Unsur):", JSON.stringify(registrations[0].skm_answers));
  }

  console.log("\n=== BUKTI 3: RECORD SERTIFIKAT DI DATABASE (issued_webinar_certificates) ===");
  const certificates = await sql`
    SELECT certificate_number, participant_name, participant_nip, 
           certificate_jp, verification_token, issued_at
    FROM issued_webinar_certificates
    WHERE participant_nip = '198507122010011005'
  `;
  console.table(certificates);
}

inspectDb().catch(console.error);
