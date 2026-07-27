import crypto from "crypto";
import { sql } from "@/lib/db";

export async function enrollUserInLearningPathCourses(userId: string, pathId: string) {
  const courses = await sql`
    SELECT course.id, course.title, course.category, course.jp
    FROM learning_path_items item
    JOIN courses course ON course.id = item.course_id
    WHERE item.path_id = ${pathId} AND course.status = 'active'
    ORDER BY item.order_index
  `;
  for (const course of courses) {
    await sql`
      INSERT INTO enrollments (id, user_id, course_id, title, category, progress, status, jp, enrolled_at)
      VALUES (
        ${`enroll_${crypto.randomUUID()}`}, ${userId}, ${String(course.id)}, ${String(course.title)},
        ${course.category ? String(course.category) : null}, 0, 'active', ${Number(course.jp || 0)}, CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id, course_id) DO NOTHING
    `;
  }
  return courses.length;
}

export async function syncLearningPathCompletions(userId: string, courseId: string) {
  await sql`
    UPDATE learning_path_assignments assignment
    SET completed_at = CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM learning_path_items item
        LEFT JOIN enrollments enrollment
          ON enrollment.course_id = item.course_id AND enrollment.user_id = assignment.user_id
        WHERE item.path_id = assignment.path_id
          AND item.is_required = TRUE
          AND COALESCE(enrollment.status, '') <> 'completed'
      ) THEN COALESCE(assignment.completed_at, CURRENT_TIMESTAMP)
      ELSE NULL
    END
    WHERE assignment.user_id = ${userId}
      AND EXISTS (
        SELECT 1 FROM learning_path_items changed_item
        WHERE changed_item.path_id = assignment.path_id AND changed_item.course_id = ${courseId}
      )
  `;
}
