import { sql } from "@/lib/db";
import { requireInstructorSession } from "@/app/actions/auth";

export async function requireCourseEditor(courseId: string) {
  const session = await requireInstructorSession();
  if (session.user.role === "admin") return session;
  const rows = await sql`SELECT instructor_id AS "instructorId" FROM courses WHERE id = ${courseId}`;
  if (!rows[0] || String(rows[0].instructorId || "") !== session.user.id) {
    throw new Error("Anda tidak memiliki akses untuk mengubah kursus ini.");
  }
  return session;
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
