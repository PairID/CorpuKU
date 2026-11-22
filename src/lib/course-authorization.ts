import { sql } from "@/lib/db";
import { getAuthSession } from "@/app/actions/auth";

export async function requireCourseEditor(courseId: string) {
  const session = await getAuthSession();
  if (!session?.user) {
    throw new Error("Unauthorized: Login required");
  }

  if (session.user.role === "admin") return session;

  const effectiveCourseId = String(courseId);

  // 1. Cek apakah instruktur kursus
  const rows = await sql`
    SELECT instructor_id AS "instructorId" 
    FROM courses 
    WHERE id = ${effectiveCourseId} 
       OR id = ${effectiveCourseId.replace(/^course_/, "")} 
       OR id = ${"course_" + effectiveCourseId}
    LIMIT 1
  `;
  if (rows[0] && String(rows[0].instructorId || "") === session.user.id) {
    return session;
  }

  // 2. Cek apakah ditugaskan sebagai Manejer Kelas atau Pengurus Kelas
  const assignments = await sql`
    SELECT role FROM course_staff_assignments
    WHERE (course_id = ${effectiveCourseId} 
        OR course_id = ${effectiveCourseId.replace(/^course_/, "")} 
        OR course_id = ${"course_" + effectiveCourseId})
      AND user_id = ${session.user.id}
    LIMIT 1
  `;

  if (assignments.length > 0) {
    return session;
  }

  throw new Error("Anda tidak memiliki akses untuk mengelola kursus ini.");
}

export async function requireModuleEditor(moduleId: string) {
  const rows = await sql`SELECT course_id AS "courseId" FROM modules WHERE id = ${moduleId}`;
  if (!rows[0]) throw new Error("Modul tidak ditemukan.");
  return requireCourseEditor(String(rows[0].courseId));
}

export async function requireLessonEditor(lessonId: string) {
  const rows = await sql`
    SELECT module.course_id AS "courseId"
    FROM lessons lesson JOIN modules module ON module.id = lesson.module_id
    WHERE lesson.id = ${lessonId}
  `;
  if (!rows[0]) throw new Error("Materi tidak ditemukan.");
  return requireCourseEditor(String(rows[0].courseId));
}

export async function requireQuestionEditor(questionId: string) {
  const rows = await sql`
    SELECT module.course_id AS "courseId"
    FROM quiz_questions question
    JOIN lessons lesson ON lesson.id = question.lesson_id
    JOIN modules module ON module.id = lesson.module_id
    WHERE question.id = ${questionId}
  `;
  if (!rows[0]) throw new Error("Pertanyaan tidak ditemukan.");
  return requireCourseEditor(String(rows[0].courseId));
}
