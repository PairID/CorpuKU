import crypto from "crypto";
import { sql } from "@/lib/db";

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
  const certificateId = crypto.randomUUID();
  const verificationToken = crypto.randomUUID();
  const rows = await sql`
    WITH eligible AS (
      SELECT enrollment.id AS enrollment_id, enrollment.user_id, enrollment.course_id,
             enrollment.completed_at, user_account.name, user_account.nip,
             user_account.pangkat, user_account.jabatan, user_account.instansi_asal,
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
    ), inserted AS (
      INSERT INTO issued_course_certificates (
        id, enrollment_id, user_id, course_id, certificate_number, verification_token,
        participant_name, participant_nip, participant_rank, participant_position,
        participant_institution, course_title, completed_at, certificate_jp,
        template_version, template_settings
      )
      SELECT ${certificateId}, enrollment_id, user_id, course_id,
             CASE
               WHEN certificate_start_number IS NOT NULL THEN
                 certificate_number_prefix || '/' || EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER || '/' ||
                   LPAD((certificate_start_number + (
                     SELECT COUNT(*)::INTEGER FROM issued_course_certificates existing WHERE existing.course_id = eligible.course_id
                   ))::TEXT, 6, '0')
               ELSE
                 certificate_number_prefix || '/' || EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER || '/' ||
                   LPAD(nextval('course_certificate_number_seq')::TEXT, 6, '0')
             END,
             ${verificationToken}, name, nip, pangkat, jabatan, instansi_asal,
             title, completed_at, COALESCE(jp, 0), COALESCE(certificate_type, 'sertifikat'),
             template_settings
      FROM eligible
      ON CONFLICT (enrollment_id) DO NOTHING
      RETURNING *, TRUE AS _newly_issued
    )
    SELECT * FROM inserted
    UNION ALL
    SELECT certificate.*, FALSE AS _newly_issued
    FROM issued_course_certificates certificate
    JOIN eligible ON eligible.enrollment_id = certificate.enrollment_id
    WHERE NOT EXISTS (SELECT 1 FROM inserted)
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const certificate = mapCourseCertificate(row);
  if (certificate.revokedAt) return null;
  if (row._newly_issued === true) {
    await sql`
      INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
      VALUES (${`notification_${crypto.randomUUID()}`}, ${userId}, 'Sertifikat kursus diterbitkan',
              ${`Sertifikat untuk kursus "${certificate.courseTitle}" telah tersedia.`},
              'success', FALSE, '/dashboard/certificates', CURRENT_TIMESTAMP)
    `;
  }
  return certificate;
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
