"use server";

import { sql } from "@/lib/db";
import { requireUserSession, requireAdminSession, getAuthSession } from "./auth";
import { revalidatePath } from "next/cache";

export type CourseStaffRole = "course_manager" | "class_officer";

export interface CourseStaffMember {
  id: string; // assignment id
  userId: string;
  name: string;
  nip: string | null;
  email: string;
  role: CourseStaffRole;
  image: string | null;
  jabatan: string | null;
  instansiAsal: string | null;
  assignedAt: string;
}

/**
 * Mengambil daftar Manejer Kelas dan Pengurus Kelas yang ditugaskan pada suatu pelatihan
 */
export async function getCourseStaff(courseId: string): Promise<{
  success: boolean;
  managers: CourseStaffMember[];
  officers: CourseStaffMember[];
  error?: string;
}> {
  try {
    await requireUserSession();

    const rows = await sql`
      SELECT 
        csa.id,
        csa.user_id AS "userId",
        csa.role,
        csa.created_at AS "assignedAt",
        u.name,
        u.nip,
        u.email,
        u.image,
        u.jabatan,
        u.instansi_asal AS "instansiAsal"
      FROM course_staff_assignments csa
      JOIN users u ON u.id = csa.user_id
      WHERE csa.course_id = ${courseId}
      ORDER BY csa.created_at ASC
    `;

    const managers: CourseStaffMember[] = [];
    const officers: CourseStaffMember[] = [];

    for (const r of rows) {
      const member: CourseStaffMember = {
        id: String(r.id),
        userId: String(r.userId),
        name: String(r.name),
        nip: r.nip ? String(r.nip) : null,
        email: String(r.email),
        role: r.role as CourseStaffRole,
        image: r.image ? String(r.image) : null,
        jabatan: r.jabatan ? String(r.jabatan) : null,
        instansiAsal: r.instansiAsal ? String(r.instansiAsal) : null,
        assignedAt: new Date(r.assignedAt).toISOString(),
      };

      if (r.role === "course_manager") {
        managers.push(member);
      } else if (r.role === "class_officer") {
        officers.push(member);
      }
    }

    return { success: true, managers, officers };
  } catch (err: unknown) {
    console.error("getCourseStaff error:", err);
    return { success: false, managers: [], officers: [], error: "Gagal memuat tim pengelola kelas." };
  }
}

/**
 * Menugaskan seorang pegawai/user sebagai Manejer Kelas atau Pengurus Kelas
 */
export async function assignCourseStaff(payload: {
  courseId: string;
  userId: string;
  role: CourseStaffRole;
}) {
  try {
    const session = await requireUserSession();
    const { courseId, userId, role } = payload;

    // Hanya Admin atau Manejer Kelas yang dapat menugaskan staf
    if (session.user.role !== "admin") {
      const isManager = await sql`
        SELECT 1 FROM course_staff_assignments
        WHERE course_id = ${courseId} AND user_id = ${session.user.id} AND role = 'course_manager'
        LIMIT 1
      `;
      if (!isManager[0]) {
        return { success: false, error: "Hanya Admin atau Manejer Kelas yang dapat menugaskan tim." };
      }
    }

    if (!["course_manager", "class_officer"].includes(role)) {
      return { success: false, error: "Peran staf tidak valid." };
    }

    const assignmentId = `csa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await sql`
      INSERT INTO course_staff_assignments (id, course_id, user_id, role, created_at)
      VALUES (${assignmentId}, ${courseId}, ${userId}, ${role}, CURRENT_TIMESTAMP)
      ON CONFLICT (course_id, user_id, role) DO NOTHING
    `;

    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/admin/courses/${courseId}/edit`);
    return { success: true };
  } catch (err: unknown) {
    console.error("assignCourseStaff error:", err);
    return { success: false, error: "Gagal menugaskan tim pengelola." };
  }
}

/**
 * Mencabut penugasan staf kelas
 */
export async function removeCourseStaff(payload: {
  courseId: string;
  userId: string;
  role: CourseStaffRole;
}) {
  try {
    const session = await requireUserSession();
    const { courseId, userId, role } = payload;

    if (session.user.role !== "admin") {
      const isManager = await sql`
        SELECT 1 FROM course_staff_assignments
        WHERE course_id = ${courseId} AND user_id = ${session.user.id} AND role = 'course_manager'
        LIMIT 1
      `;
      if (!isManager[0]) {
        return { success: false, error: "Unauthorized: Hak akses tidak memadai." };
      }
    }

    await sql`
      DELETE FROM course_staff_assignments
      WHERE course_id = ${courseId} AND user_id = ${userId} AND role = ${role}
    `;

    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/admin/courses/${courseId}/edit`);
    return { success: true };
  } catch (err: unknown) {
    console.error("removeCourseStaff error:", err);
    return { success: false, error: "Gagal mencabut penugasan tim." };
  }
}

/**
 * Mengambil daftar kursus yang dikelola oleh user tertentu sebagai Manejer atau Pengurus Kelas
 */
export async function getStaffManagedCourses(userId?: string) {
  try {
    const session = await getAuthSession();
    const targetUserId = userId || session?.user?.id;
    if (!targetUserId) return [];

    const rows = await sql`
      SELECT 
        c.id,
        c.title,
        c.category,
        c.thumbnail_url AS "thumbnailUrl",
        c.start_date AS "startDate",
        c.end_date AS "endDate",
        c.training_type AS "trainingType",
        c.delivery_mode AS "deliveryMode",
        csa.role AS "staffRole",
        csa.created_at AS "assignedAt"
      FROM course_staff_assignments csa
      JOIN courses c ON c.id = csa.course_id
      WHERE csa.user_id = ${targetUserId}
      ORDER BY c.created_at DESC
    `;

    return rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      category: String(r.category || ""),
      thumbnailUrl: r.thumbnailUrl ? String(r.thumbnailUrl) : null,
      startDate: r.startDate ? new Date(r.startDate).toISOString() : null,
      endDate: r.endDate ? new Date(r.endDate).toISOString() : null,
      trainingType: String(r.trainingType || "classical_facilitation"),
      deliveryMode: String(r.deliveryMode || "daring"),
      staffRole: r.staffRole as CourseStaffRole,
      assignedAt: new Date(r.assignedAt).toISOString(),
    }));
  } catch (err) {
    console.error("getStaffManagedCourses error:", err);
    return [];
  }
}

/**
 * Memeriksa hak akses user terhadap kursus tertentu
 */
export async function checkUserCourseStaffPermission(courseId: string, userId?: string) {
  try {
    const session = await getAuthSession();
    const targetUserId = userId || session?.user?.id;
    if (!targetUserId) {
      return { isSuperAdmin: false, isManager: false, isOfficer: false, canManage: false };
    }

    if (session?.user?.role === "admin") {
      return { isSuperAdmin: true, isManager: true, isOfficer: true, canManage: true };
    }

    const assignments = await sql`
      SELECT role FROM course_staff_assignments
      WHERE course_id = ${courseId} AND user_id = ${targetUserId}
    `;

    const roles = assignments.map((a) => String(a.role));
    const isManager = roles.includes("course_manager");
    const isOfficer = roles.includes("class_officer");

    return {
      isSuperAdmin: false,
      isManager,
      isOfficer,
      canManage: isManager || isOfficer,
    };
  } catch (err) {
    console.error("checkUserCourseStaffPermission error:", err);
    return { isSuperAdmin: false, isManager: false, isOfficer: false, canManage: false };
  }
}

/**
 * Mencari pengguna (staf/pegawai/instruktur) untuk ditugaskan ke dalam tim kelas
 */
export async function searchPotentialStaffUsers(query: string = "") {
  try {
    await requireUserSession();
    const q = query.trim();

    if (!q) {
      const rows = await sql`
        SELECT id, name, nip, email, role, jabatan, instansi_asal AS "instansiAsal", image
        FROM users
        ORDER BY 
          CASE WHEN role = 'admin' THEN 1 WHEN role = 'instructor' THEN 2 ELSE 3 END,
          name ASC
        LIMIT 30
      `;
      return rows;
    }

    const searchPattern = `%${q}%`;
    const rows = await sql`
      SELECT id, name, nip, email, role, jabatan, instansi_asal AS "instansiAsal", image
      FROM users
      WHERE name ILIKE ${searchPattern} 
         OR nip ILIKE ${searchPattern} 
         OR email ILIKE ${searchPattern}
         OR COALESCE(jabatan, '') ILIKE ${searchPattern}
      ORDER BY name ASC
      LIMIT 20
    `;
    return rows;
  } catch (err) {
    console.error("searchPotentialStaffUsers error:", err);
    return [];
  }
}
