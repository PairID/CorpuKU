"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireInstructorSession, requireUserSession, getAuthSession } from "@/app/actions/auth";
import { writeAuditLog } from "@/lib/audit";
import { sanitizePlainText } from "@/lib/content-security";
import { sql } from "@/lib/db";
import { enrollUserInLearningPathCourses } from "@/lib/learning-paths";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

function field(formData: FormData, name: string, maxLength: number) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function slugify(value: string) {
  const base = value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${base || "learning-path"}-${crypto.randomBytes(3).toString("hex")}`;
}

async function requirePathEditor(pathId: string) {
  if (!UUID_PATTERN.test(pathId)) throw new Error("ID learning path tidak valid.");
  const session = await requireInstructorSession();
  const rows = await sql`SELECT id, created_by, status FROM learning_paths WHERE id = ${pathId} LIMIT 1`;
  const path = rows[0];
  if (!path || (session.user.role !== "admin" && String(path.created_by) !== session.user.id)) {
    throw new Error("Learning path tidak ditemukan atau tidak dapat Anda kelola.");
  }
  return { session, path };
}

export async function getPublishedLearningPaths() {
  return sql`
    SELECT path.id, path.slug, path.title, path.description,
           path.thumbnail_url AS "thumbnailUrl", user_account.name AS "creatorName",
           COUNT(item.id)::int AS "courseCount", COALESCE(SUM(course.jp), 0)::int AS "totalJp"
    FROM learning_paths path
    JOIN users user_account ON user_account.id = path.created_by
    LEFT JOIN learning_path_items item ON item.path_id = path.id
    LEFT JOIN courses course ON course.id = item.course_id AND course.status = 'active'
    WHERE path.status = 'published' AND path.visibility = 'public'
    GROUP BY path.id, user_account.name
    ORDER BY path.updated_at DESC
    LIMIT 100
  `;
}

export async function getLearningPathBySlug(slug: string) {
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) return null;
  const auth = await getAuthSession();
  const userId = auth?.user.id || null;
  const rows = await sql`
    SELECT path.id, path.slug, path.title, path.description, path.thumbnail_url AS "thumbnailUrl",
           path.visibility, path.status, path.created_by AS "createdBy", creator.name AS "creatorName",
           assignment.id AS "assignmentId", assignment.due_at AS "dueAt",
           assignment.completed_at AS "completedAt"
    FROM learning_paths path
    JOIN users creator ON creator.id = path.created_by
    LEFT JOIN learning_path_assignments assignment
      ON assignment.path_id = path.id AND assignment.user_id = ${userId}
    WHERE path.slug = ${slug}
      AND (
        (path.status = 'published' AND path.visibility = 'public')
        OR path.created_by = ${userId}
        OR assignment.id IS NOT NULL
        OR ${auth?.user.role === "admin"}
      )
    LIMIT 1
  `;
  if (!rows[0]) return null;
  const row = rows[0];
  const items = await sql`
    SELECT item.id, item.order_index AS "orderIndex", item.is_required AS "isRequired",
           course.id AS "courseId", course.title, course.description, course.category,
           course.level::text AS level, course.thumbnail_url AS "thumbnailUrl", course.jp,
           COALESCE(enrollment.progress, 0)::int AS progress,
           enrollment.status AS "enrollmentStatus"
    FROM learning_path_items item
    JOIN courses course ON course.id = item.course_id
    LEFT JOIN enrollments enrollment ON enrollment.course_id = course.id AND enrollment.user_id = ${userId}
    WHERE item.path_id = ${String(row.id)}
    ORDER BY item.order_index
  `;
  return {
    id: String(row.id), slug: String(row.slug), title: String(row.title),
    description: String(row.description || ""), thumbnailUrl: row.thumbnailUrl ? String(row.thumbnailUrl) : null,
    visibility: String(row.visibility), status: String(row.status), createdBy: String(row.createdBy),
    creatorName: String(row.creatorName), assignmentId: row.assignmentId ? String(row.assignmentId) : null,
    dueAt: row.dueAt ? new Date(String(row.dueAt)).toISOString() : null,
    completedAt: row.completedAt ? new Date(String(row.completedAt)).toISOString() : null,
    items, isAuthenticated: Boolean(auth),
  };
}

export async function getMyLearningPaths() {
  const session = await requireUserSession();
  return sql`
    SELECT path.id, path.slug, path.title, path.description, path.thumbnail_url AS "thumbnailUrl",
           assignment.assignment_type AS "assignmentType", assignment.due_at AS "dueAt",
           assignment.assigned_at AS "assignedAt", assignment.completed_at AS "completedAt",
           COUNT(item.id)::int AS "courseCount",
           COALESCE(ROUND(AVG(COALESCE(enrollment.progress, 0))), 0)::int AS progress
    FROM learning_path_assignments assignment
    JOIN learning_paths path ON path.id = assignment.path_id
    LEFT JOIN learning_path_items item ON item.path_id = path.id
    LEFT JOIN enrollments enrollment ON enrollment.course_id = item.course_id AND enrollment.user_id = assignment.user_id
    WHERE assignment.user_id = ${session.user.id} AND path.status <> 'archived'
    GROUP BY path.id, assignment.id
    ORDER BY assignment.completed_at NULLS FIRST, assignment.assigned_at DESC
  `;
}

export async function getManageableLearningPaths() {
  const session = await requireInstructorSession();
  return sql`
    SELECT path.id, path.slug, path.title, path.description, path.visibility, path.status,
           path.updated_at AS "updatedAt", creator.name AS "creatorName",
           COUNT(DISTINCT item.id)::int AS "courseCount",
           COUNT(DISTINCT assignment.id)::int AS "assignmentCount"
    FROM learning_paths path
    JOIN users creator ON creator.id = path.created_by
    LEFT JOIN learning_path_items item ON item.path_id = path.id
    LEFT JOIN learning_path_assignments assignment ON assignment.path_id = path.id
    WHERE ${session.user.role === "admin"} OR path.created_by = ${session.user.id}
    GROUP BY path.id, creator.name
    ORDER BY path.updated_at DESC
  `;
}

export async function getManageableLearningPath(pathId: string) {
  const { session } = await requirePathEditor(pathId);
  const [pathRows, items, courses, users, assignments] = await Promise.all([
    sql`SELECT id, slug, title, description, thumbnail_url AS "thumbnailUrl", visibility, status FROM learning_paths WHERE id = ${pathId}`,
    sql`
      SELECT item.id, item.order_index AS "orderIndex", item.is_required AS "isRequired",
             course.id AS "courseId", course.title, course.jp, course.status
      FROM learning_path_items item JOIN courses course ON course.id = item.course_id
      WHERE item.path_id = ${pathId} ORDER BY item.order_index
    `,
    sql`
      SELECT course.id, course.title, course.category, course.jp
      FROM courses course
      WHERE course.status = 'active'
        AND (${session.user.role === "admin"} OR course.instructor_id = ${session.user.id})
      ORDER BY course.title LIMIT 500
    `,
    sql`SELECT id, name, nip, email FROM users WHERE role IN ('student', 'instructor') ORDER BY name LIMIT 1000`,
    sql`
      SELECT assignment.id, assignment.user_id AS "userId", user_account.name,
             user_account.nip, assignment.due_at AS "dueAt", assignment.completed_at AS "completedAt",
             COALESCE(ROUND(AVG(COALESCE(enrollment.progress, 0))), 0)::int AS progress
      FROM learning_path_assignments assignment
      JOIN users user_account ON user_account.id = assignment.user_id
      LEFT JOIN learning_path_items item ON item.path_id = assignment.path_id
      LEFT JOIN enrollments enrollment ON enrollment.course_id = item.course_id AND enrollment.user_id = assignment.user_id
      WHERE assignment.path_id = ${pathId}
      GROUP BY assignment.id, user_account.name, user_account.nip
      ORDER BY assignment.completed_at NULLS FIRST, user_account.name
      LIMIT 2000
    `,
  ]);
  return { path: pathRows[0], items, courses, users, assignments };
}

export async function createLearningPath(formData: FormData) {
  const session = await requireInstructorSession();
  const title = sanitizePlainText(field(formData, "title", 200));
  const description = sanitizePlainText(field(formData, "description", 4000));
  const visibility = field(formData, "visibility", 20);
  if (title.length < 5) throw new Error("Judul minimal 5 karakter.");
  if (!["public", "private"].includes(visibility)) throw new Error("Visibilitas tidak valid.");
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO learning_paths (id, slug, title, description, visibility, created_by)
    VALUES (${id}, ${slugify(title)}, ${title}, ${description}, ${visibility}, ${session.user.id})
  `;
  await writeAuditLog({ actorUserId: session.user.id, action: "learning_path.created", entityType: "learning_path", entityId: id });
  revalidatePath("/admin/learning-paths");
}

export async function updateLearningPath(formData: FormData) {
  const pathId = field(formData, "pathId", 36);
  const { session } = await requirePathEditor(pathId);
  const title = sanitizePlainText(field(formData, "title", 200));
  const description = sanitizePlainText(field(formData, "description", 4000));
  const visibility = field(formData, "visibility", 20);
  if (title.length < 5 || !["public", "private"].includes(visibility)) throw new Error("Konfigurasi learning path tidak valid.");
  await sql`
    UPDATE learning_paths SET title = ${title}, description = ${description},
      visibility = ${visibility}, updated_at = CURRENT_TIMESTAMP WHERE id = ${pathId}
  `;
  await writeAuditLog({ actorUserId: session.user.id, action: "learning_path.updated", entityType: "learning_path", entityId: pathId });
  revalidatePath(`/admin/learning-paths/${pathId}`);
  revalidatePath("/paths");
}

export async function addCourseToLearningPath(formData: FormData) {
  const pathId = field(formData, "pathId", 36);
  const courseId = field(formData, "courseId", 255);
  await requirePathEditor(pathId);
  if (!/^[A-Za-z0-9_-]{1,255}$/.test(courseId)) throw new Error("Kursus tidak valid.");
  await sql`
    INSERT INTO learning_path_items (id, path_id, course_id, order_index, is_required)
    SELECT ${crypto.randomUUID()}, ${pathId}, course.id,
           COALESCE((SELECT MAX(order_index) + 1 FROM learning_path_items WHERE path_id = ${pathId}), 0), TRUE
    FROM courses course WHERE course.id = ${courseId} AND course.status = 'active'
    ON CONFLICT (path_id, course_id) DO NOTHING
  `;
  await sql`
    INSERT INTO enrollments (id, user_id, course_id, title, category, progress, status, jp, enrolled_at)
    SELECT 'enroll_path_' || assignment.id::text || '_' || md5(course.id), assignment.user_id,
           course.id, course.title, course.category, 0, 'active', COALESCE(course.jp, 0), CURRENT_TIMESTAMP
    FROM learning_path_assignments assignment
    JOIN learning_path_items item ON item.path_id = assignment.path_id AND item.course_id = ${courseId}
    JOIN courses course ON course.id = item.course_id AND course.status = 'active'
    WHERE assignment.path_id = ${pathId}
    ON CONFLICT (user_id, course_id) DO NOTHING
  `;
  await sql`UPDATE learning_paths SET updated_at = CURRENT_TIMESTAMP WHERE id = ${pathId}`;
  revalidatePath(`/admin/learning-paths/${pathId}`);
}

export async function removeCourseFromLearningPath(formData: FormData) {
  const pathId = field(formData, "pathId", 36);
  const itemId = field(formData, "itemId", 36);
  await requirePathEditor(pathId);
  if (!UUID_PATTERN.test(itemId)) throw new Error("Item tidak valid.");
  await sql`DELETE FROM learning_path_items WHERE id = ${itemId} AND path_id = ${pathId}`;
  await sql`
    WITH reordered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY order_index) - 1 AS new_order
      FROM learning_path_items WHERE path_id = ${pathId}
    )
    UPDATE learning_path_items item SET order_index = reordered.new_order
    FROM reordered WHERE item.id = reordered.id
  `;
  revalidatePath(`/admin/learning-paths/${pathId}`);
}

export async function publishLearningPath(formData: FormData) {
  const pathId = field(formData, "pathId", 36);
  const { session } = await requirePathEditor(pathId);
  const itemCount = await sql`SELECT COUNT(*)::int AS count FROM learning_path_items WHERE path_id = ${pathId}`;
  if (Number(itemCount[0]?.count || 0) < 1) throw new Error("Tambahkan minimal satu kursus sebelum menerbitkan learning path.");
  await sql`UPDATE learning_paths SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ${pathId}`;
  await writeAuditLog({ actorUserId: session.user.id, action: "learning_path.published", entityType: "learning_path", entityId: pathId });
  revalidatePath(`/admin/learning-paths/${pathId}`);
  revalidatePath("/paths");
}

export async function assignLearningPath(formData: FormData) {
  const pathId = field(formData, "pathId", 36);
  const userId = field(formData, "userId", 255);
  const dueAtValue = field(formData, "dueAt", 40);
  const { session, path } = await requirePathEditor(pathId);
  if (!/^[A-Za-z0-9_-]{1,255}$/.test(userId) || String(path.status) !== "published") {
    throw new Error("Learning path harus terbit dan peserta harus valid.");
  }
  const dueAt = dueAtValue ? new Date(dueAtValue) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) throw new Error("Tenggat tidak valid.");
  const userRows = await sql`SELECT id FROM users WHERE id = ${userId} AND role IN ('student', 'instructor') LIMIT 1`;
  if (!userRows[0]) throw new Error("Peserta tidak ditemukan.");
  await sql`
    INSERT INTO learning_path_assignments (id, path_id, user_id, assigned_by, assignment_type, due_at)
    VALUES (${crypto.randomUUID()}, ${pathId}, ${userId}, ${session.user.id}, 'assigned', ${dueAt?.toISOString() || null})
    ON CONFLICT (path_id, user_id) DO UPDATE SET
      assigned_by = EXCLUDED.assigned_by, assignment_type = 'assigned', due_at = EXCLUDED.due_at
  `;
  const courseCount = await enrollUserInLearningPathCourses(userId, pathId);
  await sql`
    INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
    SELECT ${`notification_${crypto.randomUUID()}`}, ${userId}, 'Learning path baru',
           ${`Anda mendapat learning path baru dengan ${courseCount} kursus.`}, 'info', FALSE,
           path_link.path, CURRENT_TIMESTAMP
    FROM (SELECT '/paths/' || slug AS path FROM learning_paths WHERE id = ${pathId}) path_link
  `;
  await writeAuditLog({ actorUserId: session.user.id, action: "learning_path.assigned", entityType: "learning_path", entityId: pathId, metadata: { userId, courseCount } });
  revalidatePath(`/admin/learning-paths/${pathId}`);
}

export async function enrollInLearningPath(formData: FormData) {
  const session = await requireUserSession();
  const pathId = field(formData, "pathId", 36);
  if (!UUID_PATTERN.test(pathId)) throw new Error("Learning path tidak valid.");
  const paths = await sql`SELECT id, slug FROM learning_paths WHERE id = ${pathId} AND status = 'published' AND visibility = 'public'`;
  if (!paths[0]) throw new Error("Learning path tidak tersedia untuk pendaftaran mandiri.");
  await sql`
    INSERT INTO learning_path_assignments (id, path_id, user_id, assignment_type)
    VALUES (${crypto.randomUUID()}, ${pathId}, ${session.user.id}, 'self')
    ON CONFLICT (path_id, user_id) DO NOTHING
  `;
  await enrollUserInLearningPathCourses(session.user.id, pathId);
  revalidatePath(`/paths/${String(paths[0].slug)}`);
  revalidatePath("/dashboard/learning-paths");
}
