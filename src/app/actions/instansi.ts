"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAdminSession } from "@/app/actions/auth";
import { writeAuditLog } from "@/lib/audit";
import { DAFTAR_INSTANSI_KALTARA } from "@/lib/constants";

export interface MasterInstansiItem {
  id: string;
  name: string;
  userCount: number;
  certCount: number;
}

let ensuredInstitutions = false;

export async function ensureInstitutionsTable() {
  if (ensuredInstitutions) return;

  await sql`
    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Seed standar Kaltara + instansi yang sudah terlanjur diinput user (idempoten)
  const existingCountRows = await sql`SELECT COUNT(*)::INTEGER AS cnt FROM institutions`;
  if (Number(existingCountRows[0]?.cnt || 0) === 0) {
    for (const name of DAFTAR_INSTANSI_KALTARA) {
      await sql`
        INSERT INTO institutions (id, name)
        VALUES (${`inst_${crypto.randomUUID()}`}, ${name.trim()})
        ON CONFLICT (name) DO NOTHING
      `;
    }
  }

  await sql`
    INSERT INTO institutions (id, name)
    SELECT 'inst_' || md5(TRIM(instansi_asal)), TRIM(instansi_asal)
    FROM users
    WHERE instansi_asal IS NOT NULL
      AND LENGTH(TRIM(instansi_asal)) >= 3
    ON CONFLICT (name) DO NOTHING
  `;

  ensuredInstitutions = true;
}

export async function getMasterInstansiList(): Promise<MasterInstansiItem[]> {
  await requireAdminSession();
  await ensureInstitutionsTable();

  const rows = await sql`
    WITH user_counts AS (
      SELECT TRIM(instansi_asal) AS name, COUNT(*)::INTEGER AS cnt
      FROM users
      WHERE instansi_asal IS NOT NULL AND TRIM(instansi_asal) != ''
      GROUP BY TRIM(instansi_asal)
    ),
    cert_counts AS (
      SELECT TRIM(participant_institution) AS name, COUNT(*)::INTEGER AS cnt
      FROM issued_course_certificates
      WHERE participant_institution IS NOT NULL AND TRIM(participant_institution) != ''
      GROUP BY TRIM(participant_institution)
    )
    SELECT i.id,
           i.name,
           COALESCE(uc.cnt, 0)::INTEGER AS "userCount",
           COALESCE(cc.cnt, 0)::INTEGER AS "certCount"
    FROM institutions i
    LEFT JOIN user_counts uc ON uc.name = i.name
    LEFT JOIN cert_counts cc ON cc.name = i.name
    ORDER BY i.name ASC
  `;

  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    userCount: Number(r.userCount || 0),
    certCount: Number(r.certCount || 0),
  }));
}

export async function addMasterInstansi(rawName: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const session = await requireAdminSession();
    await ensureInstitutionsTable();

    const name = rawName.trim();
    if (name.length < 3 || name.length > 255) {
      return { success: false, message: "Nama instansi harus 3 hingga 255 karakter." };
    }

    const existing = await sql`
      SELECT id FROM institutions WHERE LOWER(name) = LOWER(${name}) LIMIT 1
    `;
    if (existing[0]) {
      return { success: false, message: `Instansi "${name}" sudah ada di daftar.` };
    }

    const id = `inst_${crypto.randomUUID()}`;
    await sql`INSERT INTO institutions (id, name) VALUES (${id}, ${name})`;

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "institution.created",
      entityType: "institution",
      entityId: id,
      metadata: { name },
    });

    revalidatePath("/admin/instansi");
    revalidatePath("/settings");
    revalidatePath("/register");

    return { success: true, message: `Instansi "${name}" berhasil ditambahkan.` };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal menambahkan instansi.",
    };
  }
}

export async function renameMasterInstansi(
  rawOldName: string,
  rawNewName: string,
  syncCertificates = true
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const session = await requireAdminSession();
    await ensureInstitutionsTable();

    const oldName = rawOldName.trim();
    const newName = rawNewName.trim();

    if (newName.length < 3 || newName.length > 255) {
      return { success: false, message: "Nama instansi baru harus 3 hingga 255 karakter." };
    }
    if (oldName === newName) {
      return { success: false, message: "Nama instansi baru sama dengan nama sebelumnya." };
    }

    const targetExists = await sql`
      SELECT id, name FROM institutions WHERE LOWER(name) = LOWER(${newName}) LIMIT 1
    `;

    if (targetExists[0] && String(targetExists[0].name).toLowerCase() !== oldName.toLowerCase()) {
      // Merge ke instansi yang sudah ada jika target sudah terdaftar
      await sql`DELETE FROM institutions WHERE name = ${oldName}`;
    } else {
      await sql`
        UPDATE institutions
        SET name = ${newName}, updated_at = CURRENT_TIMESTAMP
        WHERE name = ${oldName}
      `;
    }

    const updatedUsers = await sql`
      UPDATE users
      SET instansi_asal = ${newName}
      WHERE TRIM(instansi_asal) = ${oldName}
      RETURNING id
    `;

    let updatedCertCount = 0;
    if (syncCertificates) {
      const updatedCerts = await sql`
        UPDATE issued_course_certificates
        SET participant_institution = ${newName}
        WHERE TRIM(participant_institution) = ${oldName}
        RETURNING id
      `;
      updatedCertCount = updatedCerts.length;
    }

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "institution.renamed",
      entityType: "institution",
      entityId: oldName,
      metadata: {
        oldName,
        newName,
        updatedUsers: updatedUsers.length,
        updatedCertificates: updatedCertCount,
      },
    });

    revalidatePath("/admin/instansi");
    revalidatePath("/admin/users");
    revalidatePath("/admin/certificates/issued");
    revalidatePath("/settings");
    revalidatePath("/register");

    return {
      success: true,
      message: `Instansi diperbarui ke "${newName}" (${updatedUsers.length} pengguna${
        syncCertificates ? `, ${updatedCertCount} sertifikat` : ""
      } ikut diperbarui).`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal memperbarui nama instansi.",
    };
  }
}

export async function deleteMasterInstansi(rawName: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const session = await requireAdminSession();
    await ensureInstitutionsTable();

    const name = rawName.trim();
    await sql`DELETE FROM institutions WHERE name = ${name}`;

    await writeAuditLog({
      actorUserId: session.user.id,
      action: "institution.deleted",
      entityType: "institution",
      entityId: name,
      metadata: { name },
    });

    revalidatePath("/admin/instansi");
    revalidatePath("/settings");

    return { success: true, message: `Instansi "${name}" dihapus dari master daftar.` };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Gagal menghapus instansi.",
    };
  }
}
