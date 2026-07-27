import crypto from 'crypto';
import { sql } from '@/lib/db';
import type { IssuedWebinarCertificate } from '@/lib/types';

type CertificateRow = Record<string, unknown>;

function mapCertificate(row: CertificateRow): IssuedWebinarCertificate {
  return {
    id: String(row.id),
    certificateNumber: String(row.certificate_number),
    verificationToken: String(row.verification_token),
    userId: String(row.user_id),
    webinarId: String(row.webinar_id),
    participantName: String(row.participant_name),
    participantNip: row.participant_nip ? String(row.participant_nip) : null,
    participantRank: row.participant_rank ? String(row.participant_rank) : null,
    participantPosition: row.participant_position ? String(row.participant_position) : null,
    participantInstitution: row.participant_institution ? String(row.participant_institution) : null,
    webinarTitle: String(row.webinar_title),
    webinarScheduledAt: new Date(String(row.webinar_scheduled_at)).toISOString(),
    certificateJp: Number(row.certificate_jp || 2),
    templateType: String(row.template_version || 'sertifikat'),
    templateSettings: row.template_settings || undefined,
    issuedAt: new Date(String(row.issued_at)).toISOString(),
    revokedAt: row.revoked_at ? new Date(String(row.revoked_at)).toISOString() : null,
    revocationReason: row.revocation_reason ? String(row.revocation_reason) : null,
  };
}

export async function issueWebinarCertificate(userId: string, webinarId: string) {
  const certificateId = crypto.randomUUID();
  const verificationToken = crypto.randomUUID();

  const rows = await sql`
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
    ), inserted AS (
      INSERT INTO issued_webinar_certificates (
        id, registration_id, user_id, webinar_id, certificate_number,
        verification_token, participant_name, participant_nip,
        participant_rank, participant_position, participant_institution,
        webinar_title, webinar_scheduled_at, template_version,
        certificate_jp, template_settings
      )
      SELECT ${certificateId}, registration_id, user_id, webinar_id,
             certificate_number_prefix || '/' || EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER || '/' ||
               LPAD(nextval('webinar_certificate_number_seq')::TEXT, 6, '0'),
             ${verificationToken}, name, nip, pangkat, jabatan, instansi_asal,
             title, scheduled_at, certificate_template_type,
             certificate_jp, template_settings
      FROM eligible
      ON CONFLICT (registration_id) DO NOTHING
      RETURNING *, TRUE AS _newly_issued
    )
    SELECT * FROM inserted
    UNION ALL
    SELECT certificate.*, FALSE AS _newly_issued
    FROM issued_webinar_certificates certificate
    JOIN eligible ON eligible.registration_id = certificate.registration_id
    WHERE NOT EXISTS (SELECT 1 FROM inserted)
    LIMIT 1
  `;

  let row = rows[0];
  if (!row) {
    const existing = await sql`
      SELECT certificate.*
      FROM issued_webinar_certificates certificate
      JOIN webinar_registrations registration ON registration.id = certificate.registration_id
      WHERE registration.user_id = ${userId} AND registration.webinar_id = ${webinarId}
        AND registration.attended = TRUE AND registration.evaluation_completed = TRUE
        AND registration.evaluation_score IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM webinars webinar
          WHERE webinar.id = registration.webinar_id AND webinar.certificate_enabled = TRUE
        )
      LIMIT 1
    `;
    row = existing[0];
  }
  if (!row) return null;
  const newlyIssued = row._newly_issued === true;
  const certificate = mapCertificate(row);
  if (certificate.revokedAt) return null;
  await sql`
    UPDATE webinar_registrations
    SET certificate_generated = TRUE,
        certificate_generated_at = COALESCE(certificate_generated_at, CURRENT_TIMESTAMP)
    WHERE user_id = ${userId} AND webinar_id = ${webinarId}
  `;
  if (newlyIssued) {
    try {
      await sql`
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
        VALUES (
          ${`notification_${crypto.randomUUID()}`}, ${userId}, 'Sertifikat webinar diterbitkan',
          ${`Sertifikat untuk webinar "${certificate.webinarTitle}" telah tersedia.`},
          'success', FALSE, ${`/dashboard/webinars/${webinarId}`}, CURRENT_TIMESTAMP
        )
      `;
    } catch (error) {
      console.error('Failed to create certificate notification:', error);
    }
  }
  return certificate;
}

export async function issueEligibleWebinarCertificates(webinarId: string) {
  const rows = await sql`
    SELECT registration.user_id
    FROM webinar_registrations registration
    JOIN webinars webinar ON webinar.id = registration.webinar_id
    LEFT JOIN issued_webinar_certificates certificate ON certificate.registration_id = registration.id
    WHERE registration.webinar_id = ${webinarId}
      AND registration.attended = TRUE
      AND registration.evaluation_completed = TRUE
      AND registration.evaluation_score IS NOT NULL
      AND webinar.certificate_enabled = TRUE
      AND certificate.id IS NULL
    ORDER BY registration.registered_at
    LIMIT 1000
  `;

  let issued = 0;
  const userIds = rows.map(row => String(row.user_id));
  for (let index = 0; index < userIds.length; index += 10) {
    const batch = userIds.slice(index, index + 10);
    const results = await Promise.all(batch.map(userId => issueWebinarCertificate(userId, webinarId)));
    issued += results.filter(Boolean).length;
  }
  return { eligible: userIds.length, issued };
}

export async function getWebinarCertificateForDownload(userId: string, webinarId: string) {
  const webinar = await sql`
    SELECT certificate_enabled, certificate_auto_issue FROM webinars WHERE id = ${webinarId}
  `;
  if (!webinar[0]?.certificate_enabled) return null;
  if (webinar[0].certificate_auto_issue) return issueWebinarCertificate(userId, webinarId);

  const rows = await sql`
    SELECT certificate.*
    FROM issued_webinar_certificates certificate
    WHERE certificate.user_id = ${userId} AND certificate.webinar_id = ${webinarId}
      AND certificate.revoked_at IS NULL
    LIMIT 1
  `;
  return rows[0] ? mapCertificate(rows[0]) : null;
}

/** Atomic throttle: at most one expensive PDF render per certificate per 10 seconds. */
export async function reserveCertificateDownload(certificateId: string): Promise<boolean> {
  const rows = await sql`
    UPDATE issued_webinar_certificates
    SET last_downloaded_at = CURRENT_TIMESTAMP,
        download_count = download_count + 1
    WHERE id = ${certificateId}
      AND revoked_at IS NULL
      AND (last_downloaded_at IS NULL OR last_downloaded_at < CURRENT_TIMESTAMP - INTERVAL '10 seconds')
    RETURNING id
  `;
  return rows.length === 1;
}

export async function getCertificateByVerificationToken(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const rows = await sql`
    SELECT * FROM issued_webinar_certificates WHERE verification_token = ${token} LIMIT 1
  `;
  return rows[0] ? mapCertificate(rows[0]) : null;
}

export async function getUserWebinarCertificates(userId: string) {
  const rows = await sql`
    SELECT * FROM issued_webinar_certificates
    WHERE user_id = ${userId}
    ORDER BY issued_at DESC LIMIT 500
  `;
  return rows.map(mapCertificate);
}
