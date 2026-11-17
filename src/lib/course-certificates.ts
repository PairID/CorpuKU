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
           enrollment.completed_at, enrollment.attendance_percentage, enrollment.all_evaluations_completed,
           enrollment.statement_accepted,
           user_account.name, user_account.nip,
           user_account.pangkat, user_account.jabatan, user_account.instansi_asal,
           user_account.phone, user_account.email,
           course.title, course.jp, course.certificate_type,
           course.training_type, course.attendance_threshold,
           course.certificate_number_prefix, course.certificate_start_number,
           course.start_date, course.end_date,
           COALESCE(NULLIF(settings.settings -> course.certificate_type, 'null'::jsonb),
                    NULLIF(settings.settings -> 'sertifikat', 'null'::jsonb),
                    NULLIF(settings.settings, 'null'::jsonb), '{}'::jsonb) AS template_settings
    FROM enrollments enrollment
    JOIN users user_account ON user_account.id = enrollment.user_id
    JOIN courses course ON course.id = enrollment.course_id
    LEFT JOIN certificate_settings settings ON settings.type = 'sertifikat'
    WHERE enrollment.user_id = ${userId} AND enrollment.course_id = ${courseId}
      AND course.certificate_enabled = TRUE
      AND (
        course.training_type = 'classical_facilitation'
        OR (enrollment.status = 'completed' AND enrollment.progress = 100 AND enrollment.completed_at IS NOT NULL)
      )
    LIMIT 1
  `;

  const el = eligibleRows[0];
  if (!el) return null;

  // Persyaratan khusus Classical Facilitation Training:
  if (el.training_type === 'classical_facilitation') {
    const requiredThreshold = Number(el.attendance_threshold || 80);
    const actualAttendance = Number(el.attendance_percentage || 0);

    if (actualAttendance < requiredThreshold) {
      console.warn(`[Certificate] Kehadiran ${actualAttendance}% < ${requiredThreshold}% untuk kursus ${courseId}`);
      return null;
    }
    if (!el.all_evaluations_completed) {
      console.warn(`[Certificate] 4 tahap evaluasi belum lengkap untuk kursus ${courseId}`);
      return null;
    }
    if (!el.statement_accepted) {
      console.warn(`[Certificate] Checklist pernyataan belum disetujui untuk kursus ${courseId}`);
      return null;
    }
  }

  // 3. Tanggal terbit otomatis disetel ke tanggal hari terakhir kelas (end_date)
  const effectiveIssueDate = el.end_date
    ? new Date(String(el.end_date))
    : el.completed_at
    ? new Date(String(el.completed_at))
    : new Date();

  // Pesan nomor resmi standar BPSDM Kaltara (Master Register Passport atau Fallback Local Counter)
  let officialCertNumber = '';
  let reserved: { certificateNumber: string; sequenceNumber: number; registrationId?: string } | null = null;
  if (el.certificate_start_number != null) {
    const countRes = await sql`SELECT COUNT(*)::INTEGER AS cnt FROM issued_course_certificates WHERE course_id = ${courseId}`;
    const seq = Number(el.certificate_start_number) + Number(countRes[0]?.cnt || 0);
    const yr = effectiveIssueDate.getFullYear();
    officialCertNumber = `${el.certificate_number_prefix || 'CRS'}/${yr}/${String(seq).padStart(6, '0')}`;
  } else {
    reserved = await reserveOfficialCertificateNumber({
      trainingName: String(el.title),
      batchCode: String(el.certificate_number_prefix || 'CRS'),
      category: 'Teknis',
      trainingType: el.training_type === 'classical_facilitation' ? 'Klasikal' : 'E-Learning',
      jp: Number(el.jp || 0),
      activityDate: effectiveIssueDate,
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
  const mergedTemplateSettings = {
    ...(typeof el.template_settings === 'object' && el.template_settings !== null ? el.template_settings : {}),
    ...(reserved?.registrationId ? { passportRegistrationId: reserved.registrationId } : {}),
  };

  // 4. Simpan ke issued_course_certificates dengan tanggal terbit hari terakhir kelas
  const rows = await sql`
    INSERT INTO issued_course_certificates (
      id, enrollment_id, user_id, course_id, certificate_number, verification_token,
      participant_name, participant_nip, participant_rank, participant_position,
      participant_institution, course_title, completed_at, issued_at, certificate_jp,
      template_version, template_settings
    )
    VALUES (
      ${certificateId}, ${el.enrollment_id}, ${userId}, ${courseId}, ${officialCertNumber},
      ${verificationToken}, ${el.name}, ${el.nip},
      ${el.pangkat}, ${el.jabatan}, ${el.instansi_asal},
      ${el.title}, ${effectiveIssueDate}, ${effectiveIssueDate}, ${COALESCE_JP(el.jp)},
      ${el.certificate_type || 'sertifikat'}, ${JSON.stringify(mergedTemplateSettings)}
    )
    ON CONFLICT (enrollment_id) DO UPDATE
      SET certificate_number = EXCLUDED.certificate_number,
          completed_at = EXCLUDED.completed_at,
          issued_at = EXCLUDED.issued_at,
          template_settings = EXCLUDED.template_settings
    RETURNING *, TRUE AS _newly_issued
  `;

  // Pastikan status enrollment peserta ditandai selesai
  await sql`
    UPDATE enrollments
    SET status = 'completed',
        completed_at = COALESCE(completed_at, ${effectiveIssueDate}, CURRENT_TIMESTAMP)
    WHERE user_id = ${userId} AND course_id = ${courseId}
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

export async function checkCourseCertificateEligibility(userId: string, courseId: string): Promise<{
  eligible: boolean;
  reason?: string;
  attendancePercentage?: number;
  attendanceThreshold?: number;
  allEvaluationsCompleted?: boolean;
  statementAccepted?: boolean;
  trainingType?: string;
}> {
  const rows = await sql`
    SELECT enrollment.id, enrollment.status, enrollment.progress, enrollment.completed_at,
           enrollment.attendance_percentage, enrollment.all_evaluations_completed,
           enrollment.statement_accepted,
           course.training_type, course.attendance_threshold, course.certificate_enabled
    FROM enrollments enrollment
    JOIN courses course ON course.id = enrollment.course_id
    WHERE enrollment.user_id = ${userId} AND enrollment.course_id = ${courseId}
    LIMIT 1
  `;
  const enr = rows[0];
  if (!enr) {
    return { eligible: false, reason: "Pendaftaran tidak ditemukan." };
  }
  if (!enr.certificate_enabled) {
    return { eligible: false, reason: "Sertifikat tidak diaktifkan untuk kelas ini." };
  }

  const isClassical = enr.training_type === 'classical_facilitation';
  const attendancePercentage = Number(enr.attendance_percentage || 0);
  const attendanceThreshold = Number(enr.attendance_threshold || 80);
  const allEvaluationsCompleted = Boolean(enr.all_evaluations_completed);
  const statementAccepted = Boolean(enr.statement_accepted);

  if (isClassical) {
    if (!statementAccepted) {
      return {
        eligible: false,
        reason: "Harap selesaikan verifikasi profil dan checklist pernyataan kebenaran data.",
        attendancePercentage,
        attendanceThreshold,
        allEvaluationsCompleted,
        statementAccepted,
        trainingType: String(enr.training_type),
      };
    }
    if (attendancePercentage < attendanceThreshold) {
      return {
        eligible: false,
        reason: `Presensi kehadiran Anda (${attendancePercentage}%) belum memenuhi batas minimal ${attendanceThreshold}% total JP.`,
        attendancePercentage,
        attendanceThreshold,
        allEvaluationsCompleted,
        statementAccepted,
        trainingType: String(enr.training_type),
      };
    }
    if (!allEvaluationsCompleted) {
      return {
        eligible: false,
        reason: "Anda belum menyelesaikan seluruh 4 tahapan evaluasi wajib.",
        attendancePercentage,
        attendanceThreshold,
        allEvaluationsCompleted,
        statementAccepted,
        trainingType: String(enr.training_type),
      };
    }
    return {
      eligible: true,
      attendancePercentage,
      attendanceThreshold,
      allEvaluationsCompleted,
      statementAccepted,
      trainingType: String(enr.training_type),
    };
  }

  if (Number(enr.progress) < 100 || enr.status !== 'completed') {
    return { eligible: false, reason: "Materi pembelajaran belum selesai 100%." };
  }

  return {
    eligible: true,
    attendancePercentage,
    attendanceThreshold,
    allEvaluationsCompleted,
    statementAccepted,
    trainingType: String(enr.training_type),
  };
}
