"use server";

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/app/actions/auth';
import { writeAuditLog } from '@/lib/audit';
import { sql } from '@/lib/db';
import { issueEligibleWebinarCertificates, issueWebinarCertificate } from '@/lib/webinar-certificates';

export async function getIssuedWebinarCertificates() {
  await requireAdminSession();
  return sql`
    SELECT id, certificate_number AS "certificateNumber",
           verification_token AS "verificationToken",
           participant_name AS "participantName",
           participant_nip AS "participantNip",
           webinar_title AS "webinarTitle",
           issued_at AS "issuedAt", revoked_at AS "revokedAt",
           revocation_reason AS "revocationReason", download_count AS "downloadCount"
    FROM issued_webinar_certificates
    ORDER BY issued_at DESC
    LIMIT 500
  `;
}

export async function revokeWebinarCertificate(formData: FormData) {
  const session = await requireAdminSession();
  const id = formData.get('id');
  const reason = formData.get('reason');
  if (typeof id !== 'string' || id.length > 255 || typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 500) {
    throw new Error('Data pencabutan tidak valid.');
  }
  const rows = await sql`
    UPDATE issued_webinar_certificates
    SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP),
        revocation_reason = ${reason.trim()}
    WHERE id = ${id} AND revoked_at IS NULL
    RETURNING certificate_number
  `;
  if (rows[0]) {
    await writeAuditLog({
      actorUserId: session.user.id,
      action: 'certificate.revoked',
      entityType: 'webinar_certificate',
      entityId: id,
      metadata: { certificateNumber: String(rows[0].certificate_number), reason: reason.trim() },
    });
  }
  revalidatePath('/admin/certificates/issued');
}

function validId(value: FormDataEntryValue | null): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,255}$/.test(value);
}

export async function getWebinarCertificateDashboard(webinarId: string) {
  await requireAdminSession();
  if (!/^[a-zA-Z0-9_-]{1,255}$/.test(webinarId)) throw new Error('ID webinar tidak valid.');
  return sql`
    SELECT registration.id AS "registrationId", registration.user_id AS "userId",
           user_account.name AS "participantName", user_account.nip AS "participantNip",
           registration.attended, registration.attended_at AS "attendedAt",
           registration.evaluation_completed AS "evaluationCompleted",
           registration.evaluation_score AS "evaluationScore",
           certificate.id AS "certificateId", certificate.certificate_number AS "certificateNumber",
           certificate.verification_token AS "verificationToken", certificate.issued_at AS "issuedAt",
           certificate.revoked_at AS "revokedAt"
    FROM webinar_registrations registration
    JOIN users user_account ON user_account.id = registration.user_id
    LEFT JOIN issued_webinar_certificates certificate ON certificate.registration_id = registration.id
    WHERE registration.webinar_id = ${webinarId}
    ORDER BY user_account.name ASC
    LIMIT 2000
  `;
}

export async function issueAllEligibleWebinarCertificates(formData: FormData) {
  await requireAdminSession();
  const webinarId = formData.get('webinarId');
  if (!validId(webinarId)) throw new Error('ID webinar tidak valid.');
  await issueEligibleWebinarCertificates(webinarId);
  revalidatePath(`/admin/webinars/${webinarId}/certificates`);
  revalidatePath(`/dashboard/webinars/${webinarId}`);
}

export async function issueSingleWebinarCertificate(formData: FormData) {
  await requireAdminSession();
  const webinarId = formData.get('webinarId');
  const userId = formData.get('userId');
  if (!validId(webinarId) || !validId(userId)) throw new Error('Data peserta tidak valid.');
  const registration = await sql`
    SELECT id FROM webinar_registrations WHERE webinar_id = ${webinarId} AND user_id = ${userId}
  `;
  if (!registration[0]) throw new Error('Registrasi peserta tidak ditemukan.');
  await issueWebinarCertificate(userId, webinarId);
  revalidatePath(`/admin/webinars/${webinarId}/certificates`);
  revalidatePath(`/dashboard/webinars/${webinarId}`);
}
