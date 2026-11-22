import { redirect } from "next/navigation";
import { getAuthSession } from "@/app/actions/auth";
import { sql } from "@/lib/db";

export async function requireAdmin() {
    const session = await getAuthSession();
    const authUser = session?.user;

    if (!session || !authUser) {
        redirect("/login");
    }

    if (authUser.role !== "admin") {
        redirect("/dashboard");
    }

    return { session, user: authUser };
}

export async function requireInstructor() {
    const session = await getAuthSession();
    const authUser = session?.user;

    if (!session || !authUser) {
        redirect("/login");
    }

    if (!["admin", "instructor"].includes(authUser.role)) {
        redirect("/dashboard");
    }

    return { session, user: authUser };
}

/**
 * Memastikan pengguna memiliki akses ke area manajemen kelas admin:
 * - Admin global: lolos
 * - Instruktur: lolos
 * - Staf Kelas (Pengurus Kelas / Manejer Kelas): lolos jika memiliki minimal 1 penugasan
 */
export async function requireAdminOrStaff() {
    const session = await getAuthSession();
    const authUser = session?.user;

    if (!session || !authUser) {
        redirect("/login");
    }

    if (authUser.role === "admin" || authUser.role === "instructor") {
        return { session, user: authUser, isSuperAdmin: authUser.role === "admin" };
    }

    try {
        const staffAssignments = await sql`
            SELECT 1 FROM course_staff_assignments
            WHERE user_id = ${authUser.id}
            LIMIT 1
        `;

        if (staffAssignments.length > 0) {
            return { session, user: authUser, isSuperAdmin: false };
        }
    } catch (err) {
        console.error("requireAdminOrStaff error:", err);
    }

    redirect("/dashboard");
}

/**
 * Memeriksa hak akses terhadap kursus tertentu
 */
export async function verifyCourseStaffAccess(
    courseId: string,
    allowedRoles?: Array<"course_manager" | "class_officer">
) {
    const session = await getAuthSession();
    if (!session?.user) {
        return { authorized: false, session: null, user: null, role: null };
    }

    const authUser = session.user;

    if (authUser.role === "admin") {
        return { authorized: true, session, user: authUser, role: "admin" as const };
    }

    try {
        // Cek apakah instruktur kursus
        const courseRows = await sql`
            SELECT instructor_id AS "instructorId"
            FROM courses
            WHERE id = ${courseId} OR id = ${courseId.replace(/^course_/, "")} OR id = ${"course_" + courseId}
            LIMIT 1
        `;
        if (courseRows[0] && String(courseRows[0].instructorId || "") === authUser.id) {
            return { authorized: true, session, user: authUser, role: "instructor" as const };
        }

        // Cek penugasan di course_staff_assignments
        const assignments = await sql`
            SELECT role FROM course_staff_assignments
            WHERE (course_id = ${courseId} OR course_id = ${courseId.replace(/^course_/, "")} OR course_id = ${"course_" + courseId})
              AND user_id = ${authUser.id}
        `;

        const userRoles = assignments.map((a) => String(a.role) as "course_manager" | "class_officer");
        if (userRoles.length === 0) {
            return { authorized: false, session, user: authUser, role: null };
        }

        if (allowedRoles && allowedRoles.length > 0) {
            const hasAllowedRole = userRoles.some((r) => allowedRoles.includes(r));
            return {
                authorized: hasAllowedRole,
                session,
                user: authUser,
                role: userRoles[0],
            };
        }

        return {
            authorized: true,
            session,
            user: authUser,
            role: userRoles[0],
        };
    } catch (err) {
        console.error("verifyCourseStaffAccess error:", err);
        return { authorized: false, session, user: authUser, role: null };
    }
}
