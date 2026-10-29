import crypto from "crypto";
import { sql } from "./db";
import { reserveOfficialCertificateNumber } from "./passport-certificate-service";

type CertificateRow = Record<string, unknown>;

export interface IssuedCourseCertificate {
  id: string;
  enrollmentId: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  verificationToken: string;
  participantName: string;
  participantNip: string | null;
  participantRank: string | null;
  participantPosition: string | null;
  participantInstitution: string | null;
  courseTitle: string;
  completedAt: string;
  certificateJp: number;
  templateType: string;
  templateSettings: unknown;
  issuedAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
}

function mapCourseCertificate(row: CertificateRow): IssuedCourseCertificate {
  return {
    id: String(row.id),
    enrollmentId: String(row.enrollment_id),
    userId: String(row.user_id),
    courseId: String(row.course_id),
    certificateNumber: String(row.certificate_number),
    verificationToken: String(row.verification_token),
    participantName: String(row.participant_name),
    participantNip: row.participant_nip ? String(row.participant_nip) : null,
    participantRank: row.participant_rank ? String(row.participant_rank) : null,
    participantPosition: row.participant_position ? String(row.participant_position) : null,
    participantInstitution: row.participant_institution ? String(row.participant_institution) : null,
    courseTitle: String(row.course_title),
    completedAt: new Date(String(row.completed_at)).toISOString(),
    certificateJp: Number(row.certificate_jp || 0),
    templateType: String(row.template_version || "sertifikat"),
    templateSettings: row.template_settings || {},
    issuedAt: new Date(String(row.issued_at)).toISOString(),
    revokedAt: row.revoked_at ? new Date(String(row.revoked_at)).toISOString() : null,
    revocationReason: row.revocation_reason ? String(row.revocation_reason) : null,
  };
}

export async function issueCourseCertificate(userId: string, courseId: string, options?: { forceManualIssue?: boolean }) {
  const courseConfig = await sql`
    SELECT certificate_enabled, certificate_auto_issue FROM courses WHERE id = ${courseId} LIMIT 1
  `;
  if (!courseConfig[0]?.certificate_enabled) return null;
  if (!courseConfig[0].certificate_auto_issue && !options?.forceManualIssue) {
    const existing = await sql`
      SELECT * FROM issued_course_certificates
      WHERE user_id = ${userId} AND course_id = ${courseId} AND revoked_at IS NULL LIMIT 1
    `;
    return existing[0] ? mapCourseCertificate(existing[0]) : null;
  }

  // 1. Cek apakah sertifikat sudah pernah terbit dan masih aktif
  const existingCert = await sql`
    SELECT * FROM issued_course_certificates
    WHERE user_id = ${userId} AND course_id = ${courseId} AND revoked_at IS NULL LIMIT 1
  `;
  if (existingCert[0]) {
    return mapCourseCertificate(existingCert[0]);
  }

  // 2. Ambil data eligibilitas dan detail peserta
  const eligibleRows = await sql`
    SELECT enrollment.id AS enrollment_id, enrollment.user_id, enrollment.course_id,
           enrollment.completed_at, user_account.name, user_account.nip,
           user_account.pangkat, user_account.jabatan, user_account.instansi_asal,
           user_account.phone, user_account.email,
           course.title, course.jp, course.certificate_type,
           course.certificate_number_prefix, course.certificate_start_number,
           COALESCE(NULLIF(settings.settings -> course.certificate_type, 'null'::jsonb),
                    NULLIF(settings.settings -> 'sertifikat', 'null'::jsonb),
                    NULLIF(settings.settings, 'null'::jsonb), '{}'::jsonb) AS template_settings
    FROM enrollments enrollment
    JOIN users user_account ON user_account.id = enrollment.user_id
    JOIN courses course ON course.id = enrollment.course_id
    LEFT JOIN certificate_settings settings ON settings.type = 'sertifikat'
    WHERE enrollment.user_id = ${userId} AND enrollment.course_id = ${courseId}
      AND enrollment.status = 'completed' AND enrollment.progress = 100
      AND enrollment.completed_at IS NOT NULL AND course.certificate_enabled = TRUE
    LIMIT 1
  `;

  const el = eligibleRows[0];
  if (!el) return null;

  // 3. Pesan nomor resmi standar BPSDM Kaltara (Master Register Passport atau Fallback Local Counter)
  let officialCertNumber = '';
  if (el.certificate_start_number != null) {
    const countRes = await sql`SELECT COUNT(*)::INTEGER AS cnt FROM issued_course_certificates WHERE course_id = ${courseId}`;
    const seq = Number(el.certificate_start_number) + Number(countRes[0]?.cnt || 0);
    const yr = new Date(String(el.completed_at || Date.now())).getFullYear();
    officialCertNumber = `${el.certificate_number_prefix || 'CRS'}/${yr}/${String(seq).padStart(6, '0')}`;
  } else {
    const reserved = await reserveOfficialCertificateNumber({
      trainingName: String(el.title),
      batchCode: String(el.certificate_number_prefix || 'CRS'),
      category: 'Teknis',
      trainingType: 'E-Learning',
      jp: Number(el.jp || 0),
      activityDate: el.completed_at ? new Date(String(el.completed_at)) : new Date(),
      participant: {
        name: String(el.name),
        nip: el.nip ? String(el.nip) : null,
        rank: el.pangkat ? String(el.pangkat) : null,
        position: el.jabatan ? String(el.jabatan) : null,
        institution: el.instansi_asal ? String(el.instansi_asal) : null,
        phone: el.phone ? String(el.phone) : null,
        email: el.email ? String(el.email) : null,
      },
    });
    officialCertNumber = reserved.certificateNumber;
  }

  const certificateId = crypto.randomUUID();
  const verificationToken = crypto.randomUUID();

  // 4. Simpan ke issued_course_certificates
  const rows = await sql`
    INSERT INTO issued_course_certificates (
      id, enrollment_id, user_id, course_id, certificate_number, verification_token,
      participant_name, participant_nip, participant_rank, participant_position,
      participant_institution, course_title, completed_at, certificate_jp,
      template_version, template_settings
    )
    VALUES (
      ${certificateId}, ${el.enrollment_id}, ${userId}, ${courseId}, ${officialCertNumber},
      ${verificationToken}, ${el.name}, ${el.nip},
      ${el.pangkat}, ${el.jabatan}, ${el.instansi_asal},
      ${el.title}, ${el.completed_at}, ${COALESCE_JP(el.jp)},
      ${el.certificate_type || 'sertifikat'}, ${el.template_settings}
    )
    ON CONFLICT (enrollment_id) DO UPDATE
      SET certificate_number = EXCLUDED.certificate_number
    RETURNING *, TRUE AS _newly_issued
  `;

  const row = rows[0];
  if (!row) return null;
  const certificate = mapCourseCertificate(row);
  if (certificate.revokedAt) return null;

  try {
    await sql`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
      VALUES (${`notification_${crypto.randomUUID()}`}, ${userId}, 'Sertifikat kursus diterbitkan',
              ${`Sertifikat untuk kursus "${certificate.courseTitle}" telah tersedia.`},
              'success', FALSE, '/dashboard/certificates', CURRENT_TIMESTAMP)
    `;
  } catch (notifyErr) {
    console.warn('Gagal membuat notifikasi kursus:', notifyErr);
  }

  return certificate;
}

function COALESCE_JP(val: unknown): number {
  const n = Number(val);
  return Number.isNaN(n) ? 0 : n;
}

export async function getCourseCertificateForDownload(userId: string, courseId: string) {
  const course = await sql`SELECT certificate_enabled, certificate_auto_issue FROM courses WHERE id = ${courseId}`;
  if (!course[0]?.certificate_enabled) return null;
  if (course[0].certificate_auto_issue) return issueCourseCertificate(userId, courseId);
  const rows = await sql`
    SELECT * FROM issued_course_certificates
    WHERE user_id = ${userId} AND course_id = ${courseId} AND revoked_at IS NULL LIMIT 1
  `;
  return rows[0] ? mapCourseCertificate(rows[0]) : null;
}

export async function reserveCourseCertificateDownload(certificateId: string) {
  const rows = await sql`
    UPDATE issued_course_certificates
    SET last_downloaded_at = CURRENT_TIMESTAMP, download_count = download_count + 1
    WHERE id = ${certificateId} AND revoked_at IS NULL
      AND (last_downloaded_at IS NULL OR last_downloaded_at < CURRENT_TIMESTAMP - INTERVAL '10 seconds')
    RETURNING id
  `;
  return rows.length === 1;
}

export async function getCourseCertificateByVerificationToken(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const rows = await sql`SELECT * FROM issued_course_certificates WHERE verification_token = ${token} LIMIT 1`;
  return rows[0] ? mapCourseCertificate(rows[0]) : null;
}

export async function getUserCourseCertificates(userId: string) {
  const rows = await sql`
    SELECT * FROM issued_course_certificates WHERE user_id = ${userId}
    ORDER BY issued_at DESC LIMIT 500
  `;
  return rows.map(mapCourseCertificate);
}
