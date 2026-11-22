"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/app/actions/auth";
import { writeAuditLog } from "@/lib/audit";
import { sql } from "@/lib/db";
import { requireCourseEditor } from "@/lib/course-authorization";
import { issueCourseCertificate, checkCourseCertificateEligibility } from "@/lib/course-certificates";
import { requireUserSession } from "@/app/actions/auth";

export async function getIssuedCourseCertificates() {
  await requireAdminSession();
  return sql`
    SELECT id, certificate_number AS "certificateNumber",
           verification_token AS "verificationToken",
           participant_name AS "participantName",
           participant_nip AS "participantNip",
           course_title AS "courseTitle", issued_at AS "issuedAt",
           revoked_at AS "revokedAt", revocation_reason AS "revocationReason",
           download_count AS "downloadCount"
    FROM issued_course_certificates
    ORDER BY issued_at DESC
    LIMIT 500
  `;
}

export async function revokeCourseCertificate(formData: FormData) {
  const session = await requireAdminSession();
  const id = formData.get("id");
  const reason = formData.get("reason");
  if (
    typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) ||
    typeof reason !== "string" || reason.trim().length < 5 || reason.length > 500
  ) {
    throw new Error("Data pencabutan tidak valid.");
  }

  const rows = await sql`
    UPDATE issued_course_certificates
    SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP),
        revocation_reason = ${reason.trim()}
    WHERE id = ${id} AND revoked_at IS NULL
    RETURNING certificate_number
  `;
  if (rows[0]) {
    await writeAuditLog({
      actorUserId: session.user.id,
      action: "certificate.revoked",
      entityType: "course_certificate",
      entityId: id,
      metadata: { certificateNumber: String(rows[0].certificate_number), reason: reason.trim() },
    });
  }
  revalidatePath("/admin/certificates/issued");
}

export async function getCourseCertificateDashboard(courseId: string) {
  await requireCourseEditor(courseId);
  return sql`
    SELECT enrollment.id AS "enrollmentId", enrollment.user_id AS "userId",
           user_account.name AS "participantName", user_account.nip AS "participantNip",
           enrollment.progress, enrollment.status, enrollment.completed_at AS "completedAt",
           certificate.id AS "certificateId", certificate.certificate_number AS "certificateNumber",
           certificate.verification_token AS "verificationToken", certificate.issued_at AS "issuedAt",
           certificate.revoked_at AS "revokedAt"
    FROM enrollments enrollment
    JOIN users user_account ON user_account.id = enrollment.user_id
    LEFT JOIN issued_course_certificates certificate ON certificate.enrollment_id = enrollment.id
    WHERE enrollment.course_id = ${courseId}
    ORDER BY enrollment.completed_at DESC NULLS LAST, user_account.name
    LIMIT 2000
  `;
}

export async function issueCourseCertificateManualAction(courseId: string, userId: string) {
  try {
    if (
      typeof courseId !== "string" || !/^[A-Za-z0-9_-]{1,255}$/.test(courseId) ||
      typeof userId !== "string" || !/^[A-Za-z0-9_-]{1,255}$/.test(userId)
    ) {
      return { success: false, error: "Data kursus atau peserta tidak valid." };
    }

    const session = await requireCourseEditor(courseId);

    const eligible = await sql`
      SELECT enrollment.id, enrollment.status, enrollment.progress, enrollment.completed_at,
             course.training_type
      FROM enrollments enrollment
      JOIN courses course ON course.id = enrollment.course_id
      WHERE enrollment.user_id = ${userId} AND enrollment.course_id = ${courseId}
        AND enrollment.status = 'completed' AND enrollment.progress = 100 AND enrollment.completed_at IS NOT NULL
      LIMIT 1
    `;

    if (!eligible[0]) {
      return { success: false, error: "Peserta belum menyelesaikan seluruh modul pembelajaran kursus (progress belum 100%)." };
    }

    // Force manual issuance by administrator
    const certificate = await issueCourseCertificate(userId, courseId, { forceManualIssue: true });
    if (!certificate) {
      return {
        success: false,
        error: "Gagal menerbitkan sertifikat: pastikan fitur penerbitan sertifikat telah diaktifkan pada pengaturan kursus.",
      };
    }

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "certificate.manually_issued",
      entityType: "course_certificate",
      entityId: certificate.id,
      metadata: { courseId, userId, certificateNumber: certificate.certificateNumber },
    });

    revalidatePath(`/admin/courses/${courseId}/certificates`);
    revalidatePath("/admin/certificates/issued");

    return {
      success: true,
      message: `Sertifikat ${certificate.certificateNumber} berhasil diterbitkan resmi!`,
      certificateNumber: certificate.certificateNumber,
    };
  } catch (err: any) {
    console.error("[issueCourseCertificateManualAction] error:", err);
    return {
      success: false,
      error: err.message || "Terjadi kendala saat memproses penerbitan sertifikat.",
    };
  }
}

export async function issueSingleCourseCertificate(formData: FormData) {
  const courseId = formData.get("courseId");
  const userId = formData.get("userId");
  if (
    typeof courseId !== "string" || !/^[A-Za-z0-9_-]{1,255}$/.test(courseId) ||
    typeof userId !== "string" || !/^[A-Za-z0-9_-]{1,255}$/.test(userId)
  ) throw new Error("Data peserta tidak valid.");
  const session = await requireCourseEditor(courseId);
  const eligible = await sql`
    SELECT enrollment.id, enrollment.status, enrollment.progress, enrollment.completed_at,
           course.training_type
    FROM enrollments enrollment
    JOIN courses course ON course.id = enrollment.course_id
    WHERE enrollment.user_id = ${userId} AND enrollment.course_id = ${courseId}
      AND enrollment.status = 'completed' AND enrollment.progress = 100 AND enrollment.completed_at IS NOT NULL
    LIMIT 1
  `;
  if (!eligible[0]) throw new Error("Peserta belum memenuhi persyaratan kelulusan.");

  const certificate = await issueCourseCertificate(userId, courseId, { forceManualIssue: true });
  if (!certificate) throw new Error("Penerbitan sertifikat dinonaktifkan atau sertifikat telah dicabut.");
  await writeAuditLog({
    actorUserId: session.user.id, action: "certificate.manually_issued",
    entityType: "course_certificate", entityId: certificate.id,
    metadata: { courseId, userId, certificateNumber: certificate.certificateNumber },
  });
  revalidatePath(`/admin/courses/${courseId}/certificates`);
  revalidatePath("/admin/certificates/issued");
}

export async function checkUserCertificateEligibility(courseId: string) {
  const session = await requireUserSession();
  return checkCourseCertificateEligibility(session.user.id, courseId);
}
