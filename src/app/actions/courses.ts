"use server";

import crypto from "crypto";
import { sql } from "@/lib/db";
import { createNotification } from "./notifications";
import { deleteAsset } from "@/lib/cloudinary";
import { awardPoints } from "@/lib/gamification";
import { getAuthSession, requireAdminSession, requireInstructorSession, requireUserSession } from "./auth";
import { requireCourseEditor } from "@/lib/course-authorization";
import { sanitizePlainText, sanitizeRichText } from "@/lib/content-security";
import { issueCourseCertificate } from "@/lib/course-certificates";
import { syncLearningPathCompletions } from "@/lib/learning-paths";
import { z } from "zod";

const courseMutationSchema = z.object({
    title: z.string().trim().min(5).max(200),
    description: z.string().max(10_000).default(""),
    category: z.string().trim().min(2).max(100),
    level: z.enum(["Beginner", "Intermediate", "Advanced"]).default("Beginner"),
    thumbnailUrl: z.union([z.string().url().max(2048), z.literal("")]).default(""),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    pacingType: z.enum(["self_paced", "instructor_paced"]).default("self_paced"),
    instructorId: z.string().regex(/^[A-Za-z0-9_-]{1,255}$/).optional(),
    startDate: z.union([z.string().date(), z.literal("")]).optional(),
    endDate: z.union([z.string().date(), z.literal("")]).optional(),
    jp: z.number().int().min(0).max(10_000).default(0),
    certificateType: z.enum(["sertifikat", "surat_keterangan", "sttp"]).default("sertifikat"),
    certificateEnabled: z.boolean().default(true),
    certificateAutoIssue: z.boolean().default(true),
    certificateNumberPrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,20}$/).default("CRS"),
    passingScore: z.number().int().min(0).max(100).default(60),
}).superRefine((course, context) => {
    if (course.pacingType === "instructor_paced" && !course.startDate) {
        context.addIssue({ code: "custom", path: ["startDate"], message: "Tanggal mulai wajib untuk instructor-paced." });
    }
    if (course.startDate && course.endDate && course.endDate < course.startDate) {
        context.addIssue({ code: "custom", path: ["endDate"], message: "Tanggal selesai harus setelah tanggal mulai." });
    }
});

const templateUrlSchema = z.union([
    z.string().url().max(2048),
    z.string().regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).max(2_800_000),
    z.literal("{{foto}}"),
    z.literal(""),
    z.null(),
]);
const certificateElementSchema = z.object({
    id: z.string().min(1).max(100),
    type: z.enum(["text", "image"]).optional().default("text"),
    text: z.string().max(5000).optional().default(""),
    imageUrl: templateUrlSchema.optional(),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    fontSize: z.number().min(6).max(200).optional().default(12),
    fontFamily: z.string().max(100).optional().default("bookman"),
    fontWeight: z.string().max(50).optional().default("normal"),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#000000"),
    textAlign: z.enum(["left", "center", "right", "justify"]).optional().default("center"),
    width: z.number().min(1).max(100),
    height: z.number().min(1).max(100).optional(),
});
const certificateTypeConfigSchema: z.ZodTypeAny = z.object({
    templateUrl: templateUrlSchema.optional(),
    orientation: z.enum(["landscape", "portrait"]).optional().default("landscape"),
    elements: z.array(certificateElementSchema).max(100).default([]),
    page2: z.object({
        enabled: z.boolean().default(false),
        templateUrl: templateUrlSchema.optional(),
        elements: z.array(certificateElementSchema).max(100).default([]),
    }).optional(),
});
const certificateSettingsSchema = z.object({
    sertifikat: certificateTypeConfigSchema.optional(),
    surat_keterangan: certificateTypeConfigSchema.optional(),
    sttp: certificateTypeConfigSchema.optional(),
}).passthrough();

interface CourseRecord {
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    thumbnailUrl: string | null;
    status: "draft" | "active" | "archived";
    instructorId: string;
    instructorName?: string | null;
    jp: number;
    certificateType: string;
    certificateEnabled: boolean;
    certificateAutoIssue: boolean;
    certificateNumberPrefix: string;
    passingScore: number;
    pacingType?: "self_paced" | "instructor_paced";
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    updatedAt: string;
}

interface EnrollmentRecord {
    id: string;
    userId: string;
    courseId: string;
    status: string;
    progress: number;
    enrolledAt: string;
    completedAt: string | null;
    completedLessons: string[];
    title: string;
    category: string;
    description: string | null;
    thumbnailUrl: string | null;
}

interface CourseContentLesson {
    id: string;
    moduleId: string;
    title: string;
    content: string | null;
    videoUrl: string | null;
    type: string;
    order: string;
}

interface CourseContentModule {
    id: string;
    courseId: string;
    title: string;
    order: string;
    lessons: CourseContentLesson[];
}

interface CourseOutlineLesson {
    id: string;
    title: string;
    type: string;
    order: string;
}

interface CourseOutlineModule {
    id: string;
    title: string;
    order: string;
    lessons: CourseOutlineLesson[];
}

interface QuizAttemptRecord {
    id: string;
    score: number;
    passed: boolean;
    answers: unknown;
    createdAt: string;
}

async function requireCourseAccess(courseId: string) {
    const session = await requireUserSession();
    if (["admin", "instructor"].includes(session.user.role)) {
        if (session.user.role === "admin") return session;
        const course = await sql`SELECT instructor_id AS "instructorId" FROM courses WHERE id = ${courseId}`;
        if (String(course[0]?.instructorId || "") === session.user.id) return session;
    }
    const enrollment = await sql`
        SELECT id FROM enrollments
        WHERE course_id = ${courseId} AND user_id = ${session.user.id}
        LIMIT 1
    `;
    if (!enrollment[0]) throw new Error("Anda belum terdaftar pada kursus ini.");
    const schedule = await sql`SELECT pacing_type, start_date FROM courses WHERE id = ${courseId} LIMIT 1`;
    if (schedule[0]?.pacing_type === "instructor_paced" && schedule[0].start_date && new Date(String(schedule[0].start_date)).getTime() > Date.now()) {
        throw new Error("Materi kursus akan terbuka pada tanggal mulai yang ditetapkan instruktur.");
    }
    return session;
}

async function canViewCourse(courseId: string, status: unknown, instructorId: unknown) {
    if (String(status) === "active") return true;
    const auth = await getAuthSession();
    if (!auth) return false;
    if (auth.user.role === "admin" || (auth.user.role === "instructor" && String(instructorId || "") === auth.user.id)) return true;
    const enrollment = await sql`SELECT id FROM enrollments WHERE course_id = ${courseId} AND user_id = ${auth.user.id} LIMIT 1`;
    return Boolean(enrollment[0]);
}

function normalizeQuizOptions(questionId: string, value: unknown) {
    const source = Array.isArray(value) ? value : [];
    return source.slice(0, 20).map((option, index) => {
        if (typeof option === "string") {
            return { id: String(index), questionId, optionText: option };
        }
        if (option && typeof option === "object") {
            const item = option as Record<string, unknown>;
            return {
                id: String(item.id ?? index),
                questionId,
                optionText: String(item.optionText ?? item.text ?? ""),
            };
        }
        return { id: String(index), questionId, optionText: "" };
    });
}

interface QuizAnswer {
    questionId: string;
    selectedOptionId: string;
}

function isQuizAnswer(value: unknown): value is QuizAnswer {
    if (!value || typeof value !== "object") return false;
    const answer = value as Record<string, unknown>;
    return typeof answer.questionId === "string" && answer.questionId.length <= 255
        && typeof answer.selectedOptionId === "string" && answer.selectedOptionId.length <= 255;
}

export async function getAllCourses() {
    try {
        const data = await sql`
            SELECT id, title, description, category, level, 
                   thumbnail_url as "thumbnailUrl", status, 
                   instructor_id as "instructorId", jp, 
                   certificate_type as "certificateType", certificate_enabled as "certificateEnabled",
                   certificate_auto_issue as "certificateAutoIssue", certificate_number_prefix as "certificateNumberPrefix",
                   passing_score as "passingScore", pacing_type as "pacingType", start_date as "startDate", end_date as "endDate",
                   created_at as "createdAt", 
                   updated_at as "updatedAt"
            FROM courses
            WHERE status = 'active'
            ORDER BY created_at DESC
        `;
        return data;
    } catch (err) {
        console.error("Failed to get all courses:", err);
        return [];
    }
}

export async function getCourseById(id: string): Promise<CourseRecord | null> {
    try {
        const data = await sql`
            SELECT id, title, description, category, level, 
                   thumbnail_url as "thumbnailUrl", status, 
                   instructor_id as "instructorId", jp, 
                   certificate_type as "certificateType", certificate_enabled as "certificateEnabled",
                   certificate_auto_issue as "certificateAutoIssue", certificate_number_prefix as "certificateNumberPrefix",
                   passing_score as "passingScore", pacing_type as "pacingType", start_date as "startDate", end_date as "endDate",
                   created_at as "createdAt", 
                   updated_at as "updatedAt"
            FROM courses
            WHERE id = ${id}
        `;
        const course = data[0];
        if (!course || !(await canViewCourse(id, course.status, course.instructorId))) return null;
        return course as unknown as CourseRecord;
    } catch (err) {
        console.error(`Failed to get course ${id}:`, err);
        return null;
    }
}

export async function enrollInCourse(courseId: string) {
    try {
        const session = await requireUserSession();
        const user = session.user;
        if (!/^[A-Za-z0-9_-]{1,255}$/.test(courseId)) return { success: false, error: "Kursus tidak valid." };

        const courseRes = await sql`
            SELECT id, title, category, jp FROM courses
            WHERE id = ${courseId} AND status = 'active'
              AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        `;
        const course = courseRes[0];
        if (!course) return { success: false, error: "Kursus tidak tersedia untuk pendaftaran." };

        const id = `enroll_${crypto.randomUUID()}`;
        const now = new Date().toISOString();

        const inserted = await sql`
            INSERT INTO enrollments (id, user_id, course_id, title, category, progress, status, jp, enrolled_at)
            VALUES (${id}, ${user.id}, ${courseId}, ${course.title}, ${course.category}, 0, 'active', ${course.jp || 0}, ${now})
            ON CONFLICT (user_id, course_id) DO NOTHING
            RETURNING id
        `;
        if (!inserted[0]) return { success: false, error: "Anda sudah terdaftar di kursus ini." };

        // Send Notification
        await createNotification({
            userId: user.id,
            title: "Pendaftaran Sukses",
            message: `Anda telah berhasil terdaftar di kelas "${course.title}".`,
            type: "info",
            link: `/dashboard/courses/${courseId}`
        });

        return { success: true };
    } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : "Gagal mendaftar kelas." };
    }
}

export async function checkEnrollment(courseId: string) {
    try {
        const session = await requireUserSession();
        const user = session.user;
        
        const data = await sql`SELECT id FROM enrollments WHERE (course_id = ${courseId} OR id = ${courseId}) AND user_id = ${user.id}`;
        return data.length > 0;
    } catch {
        return false;
    }
}

export async function getEnrollment(courseId: string): Promise<EnrollmentRecord | null> {
    try {
        const session = await requireUserSession();
        const user = session.user;
        
        const data = await sql`
            SELECT enrollment.id, enrollment.user_id as "userId", enrollment.course_id as "courseId",
                   enrollment.status, enrollment.progress, enrollment.enrolled_at as "enrolledAt",
                   enrollment.completed_at as "completedAt", enrollment.completed_lessons as "completedLessons",
                   COALESCE(course.title, enrollment.title) AS title,
                   COALESCE(course.category, enrollment.category) AS category,
                   course.description, course.thumbnail_url AS "thumbnailUrl"
            FROM enrollments enrollment
            LEFT JOIN courses course ON course.id = enrollment.course_id
            WHERE (enrollment.course_id = ${courseId} OR enrollment.id = ${courseId})
            AND enrollment.user_id = ${user.id}
        `;
        return data[0] ? data[0] as unknown as EnrollmentRecord : null;
    } catch { return null; }
}

export async function updateLessonProgress(courseId: string, lessonId: string, completed: boolean) {
    try {
        const session = await requireUserSession();
        const user = session.user;

        if (!/^[A-Za-z0-9_-]{1,255}$/.test(courseId) || !/^[A-Za-z0-9_-]{1,255}$/.test(lessonId)) {
            return { success: false, error: "Data materi tidak valid." };
        }

        const enrRes = await sql`
            SELECT id, user_id as "userId", course_id as "courseId", 
                   status, progress, enrolled_at as "enrolledAt", 
                   completed_at as "completedAt", completed_lessons as "completedLessons", title
            FROM enrollments 
            WHERE (course_id = ${courseId} OR id = ${courseId}) 
            AND user_id = ${user.id}
            LIMIT 1
        `;
        
        const enrollment = enrRes[0];
        if (!enrollment) return { success: false, error: "Pendaftaran kursus tidak ditemukan." };

        const lessonRows = await sql`
            SELECT lesson.id, lesson.type
            FROM lessons lesson
            JOIN modules module ON module.id = lesson.module_id
            WHERE module.course_id = ${enrollment.courseId}
            ORDER BY module."order", lesson."order"
        `;
        const lesson = lessonRows.find((row) => String(row.id) === lessonId);
        if (!lesson) return { success: false, error: "Materi tidak termasuk dalam kursus ini." };

        if (completed && lesson.type === "quiz") {
            const passedAttempt = await sql`
                SELECT id FROM quiz_attempts
                WHERE user_id = ${user.id} AND lesson_id = ${lessonId} AND passed = TRUE
                LIMIT 1
            `;
            if (!passedAttempt[0]) {
                return { success: false, error: "Kuis harus lulus sebelum dapat ditandai selesai." };
            }
        }

        let completedLessons: string[] = [];
        if (enrollment.completedLessons) {
            try {
                const parsed = typeof enrollment.completedLessons === "string"
                    ? JSON.parse(enrollment.completedLessons)
                    : enrollment.completedLessons;
                completedLessons = Array.isArray(parsed) ? parsed.map(String) : [];
            } catch {
                completedLessons = [];
            }
        }

        const validLessonIds = new Set(lessonRows.map((row) => String(row.id)));
        completedLessons = [...new Set(completedLessons.filter((id) => validLessonIds.has(id)))];

        if (completed) {
            if (!completedLessons.includes(lessonId)) {
                completedLessons.push(lessonId);
            }
        } else {
            completedLessons = completedLessons.filter(id => id !== lessonId);
        }

        const totalLessons = lessonRows.length;
        const progressPercent = totalLessons > 0
            ? Math.min(100, Math.round((completedLessons.length / totalLessons) * 100))
            : 0;

        const isCompleted = totalLessons > 0 && completedLessons.length === totalLessons;
        const status = isCompleted ? "completed" : "active";
        const completedAt = isCompleted ? new Date().toISOString() : null;

        const updateRows = await sql`
            WITH previous AS (
                SELECT id, status FROM enrollments
                WHERE id = ${enrollment.id} AND user_id = ${user.id}
                FOR UPDATE
            ), updated AS (
                UPDATE enrollments target
                SET progress = ${progressPercent}, status = ${status},
                    completed_lessons = ${JSON.stringify(completedLessons)}, completed_at = ${completedAt}
                FROM previous
                WHERE target.id = previous.id
                RETURNING previous.status AS "previousStatus"
            )
            SELECT "previousStatus" FROM updated
        `;

        if (isCompleted && String(updateRows[0]?.previousStatus || "") !== "completed") {
            await awardPoints(user.id, 10);
            const issuedCertificate = await issueCourseCertificate(user.id, String(enrollment.courseId));
            await createNotification({
                userId: user.id,
                title: "Kelas Selesai! 🎉",
                message: issuedCertificate
                    ? `Selamat! Anda telah menyelesaikan kelas "${enrollment.title || 'Kursus'}". Sertifikat Anda sudah siap diunduh.`
                    : `Selamat! Anda telah menyelesaikan kelas "${enrollment.title || 'Kursus'}".`,
                type: "success",
                link: issuedCertificate ? "/dashboard/certificates" : `/dashboard/courses/${enrollment.id}/progress`,
            });
        }
        await syncLearningPathCompletions(user.id, String(enrollment.courseId));

        return { success: true, progress: progressPercent, status };
    } catch (err) {
        console.error("Failed to update progress:", err);
        return { success: false, error: "Gagal menyimpan progres materi." };
    }
}

export async function getUserEnrollments(): Promise<EnrollmentRecord[]> {
    try {
        const session = await requireUserSession();
        const user = session.user;
        
        const enrollments = await sql`
            SELECT e.id, e.user_id as "userId", e.course_id as "courseId", 
                   e.status, e.progress, e.enrolled_at as "enrolledAt", 
                   e.completed_at as "completedAt",
                   COALESCE(c.title, e.title) AS title, COALESCE(c.category, e.category) AS category,
                   c.description, c.thumbnail_url as "thumbnailUrl"
            FROM enrollments e
            LEFT JOIN courses c ON e.course_id = c.id
            WHERE e.user_id = ${user.id}
            ORDER BY e.enrolled_at DESC
        `;
        return enrollments as unknown as EnrollmentRecord[];
    } catch {
        return [];
    }
}

export async function getCourseOutline(courseId: string): Promise<CourseOutlineModule[]> {
    try {
        const courseRows = await sql`SELECT status, instructor_id AS "instructorId" FROM courses WHERE id = ${courseId} LIMIT 1`;
        if (!courseRows[0] || !(await canViewCourse(courseId, courseRows[0].status, courseRows[0].instructorId))) return [];
        const modules = await sql`
            SELECT id, title, "order" FROM modules
            WHERE course_id = ${courseId} ORDER BY "order" ASC
        `;
        return await Promise.all(modules.map(async (module) => ({
            id: String(module.id),
            title: String(module.title),
            order: String(module.order),
            lessons: (await sql`
                SELECT id, title, type, "order" FROM lessons
                WHERE module_id = ${module.id} ORDER BY "order" ASC
            `).map((lesson) => ({
                id: String(lesson.id), title: String(lesson.title),
                type: String(lesson.type), order: String(lesson.order),
            })),
        })));
    } catch {
        return [];
    }
}

export async function getCourseContent(courseId: string): Promise<CourseContentModule[]> {
    try {
        await requireCourseAccess(courseId);
        const modules = await sql`
            SELECT id, title, "order" 
            FROM modules 
            WHERE course_id = ${courseId} 
            ORDER BY "order" ASC
        `;

        return await Promise.all(modules.map(async (mod) => {
            const lessons = await sql`
                SELECT id, title, type, video_url as "videoUrl", content, "order"
                FROM lessons 
                WHERE module_id = ${mod.id} 
                ORDER BY "order" ASC
            `;
            return {
                id: String(mod.id),
                courseId,
                title: String(mod.title),
                order: String(mod.order),
                lessons: lessons.map((lesson) => ({
                    id: String(lesson.id),
                    moduleId: String(mod.id),
                    title: String(lesson.title),
                    videoUrl: lesson.videoUrl ? String(lesson.videoUrl) : null,
                    type: String(lesson.type),
                    order: String(lesson.order),
                    content: lesson.content ? sanitizeRichText(String(lesson.content)) : null,
                }))
            };
        }));
    } catch (err) {
        console.error("Failed to get course content:", err);
        return [];
    }
}

export async function getLessonData(lessonId: string) {
    try {
        const course = await sql`
            SELECT module.course_id AS "courseId"
            FROM lessons lesson JOIN modules module ON module.id = lesson.module_id
            WHERE lesson.id = ${lessonId}
        `;
        if (!course[0]) return null;
        await requireCourseAccess(String(course[0].courseId));
        const data = await sql`
            SELECT id, module_id AS "moduleId", title, content,
                   video_url AS "videoUrl", type, "order"
            FROM lessons WHERE id = ${lessonId}
        `;
        return data[0] || null;
    } catch {
        return null;
    }
}

export async function getQuizQuestions(lessonId: string) {
    try {
        const course = await sql`
            SELECT module.course_id AS "courseId"
            FROM lessons lesson JOIN modules module ON module.id = lesson.module_id
            WHERE lesson.id = ${lessonId} AND lesson.type = 'quiz'
        `;
        if (!course[0]) return [];
        await requireCourseAccess(String(course[0].courseId));
        const data = await sql`
            SELECT id, lesson_id AS "lessonId", question AS "questionText", options, "order"
            FROM quiz_questions WHERE lesson_id = ${lessonId} ORDER BY "order" ASC, id ASC
        `;
        return data.map((question) => ({
            id: String(question.id),
            lessonId: String(question.lessonId),
            questionText: String(question.questionText),
            order: String(question.order ?? 0),
            options: normalizeQuizOptions(String(question.id), question.options),
        }));
    } catch {
        return [];
    }
}

export async function submitQuizAttempt(lessonId: string, answers: unknown) {
    try {
        const session = await requireUserSession();
        const user = session.user;

        if (!Array.isArray(answers) || answers.length > 100 || answers.some((answer) => !isQuizAnswer(answer))) {
            return { success: false, error: "Jawaban kuis tidak valid." };
        }
        const validatedAnswers = answers as QuizAnswer[];
        const courseRows = await sql`
            SELECT module.course_id AS "courseId", course.passing_score AS "passingScore"
            FROM lessons lesson JOIN modules module ON module.id = lesson.module_id
            JOIN courses course ON course.id = module.course_id
            WHERE lesson.id = ${lessonId} AND lesson.type = 'quiz'
        `;
        if (!courseRows[0]) return { success: false, error: "Kuis tidak ditemukan." };
        await requireCourseAccess(String(courseRows[0].courseId));
        const recentAttempts = await sql`
            SELECT COUNT(*)::int AS count FROM quiz_attempts
            WHERE user_id = ${user.id} AND lesson_id = ${lessonId}
              AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute'
        `;
        if (Number(recentAttempts[0]?.count || 0) >= 5) {
            return { success: false, error: "Terlalu banyak percobaan. Tunggu satu menit sebelum mencoba lagi." };
        }
        const rawQuestions = await sql`
            SELECT id, question AS "questionText", options,
                   correct_option_index AS "correctOptionIndex"
            FROM quiz_questions WHERE lesson_id = ${lessonId}
            ORDER BY "order" ASC, id ASC
        `;
        const questions = rawQuestions.map((question) => ({
            id: String(question.id),
            questionText: String(question.questionText),
            correctOptionIndex: Number(question.correctOptionIndex),
            options: normalizeQuizOptions(String(question.id), question.options),
        }));
        if (questions.length === 0) return { success: false, error: "Kuis tidak ditemukan." };

        let correctCount = 0;
        const review = questions.map((q) => {
            const answerObj = validatedAnswers.find((answer) => answer.questionId === q.id);
            
            const selectedOptionId = answerObj?.selectedOptionId || null;
            const isCorrect = selectedOptionId !== null && String(selectedOptionId) === String(q.correctOptionIndex);
            
            if (isCorrect) correctCount++;
            
            const selectedOpt = q.options.find((option) => option.id === selectedOptionId);
            const correctOpt = q.options.find((option) => option.id === String(q.correctOptionIndex));

            return {
                questionId: q.id,
                questionText: q.questionText,
                explanation: null,
                isCorrect,
                selectedOptionId,
                selectedOptionText: selectedOpt?.optionText || null,
                selectedOptionExplanation: null,
                correctOptionId: String(q.correctOptionIndex),
                correctOptionText: correctOpt?.optionText || null,
                options: q.options.map((option) => ({
                    ...option,
                    isCorrect: option.id === String(q.correctOptionIndex),
                    explanation: null
                }))
            };
        });

        const scorePercent = Math.round((correctCount / questions.length) * 100);
        const passingScore = Number(courseRows[0].passingScore ?? 60);
        const passed = scorePercent >= passingScore;
        const attemptId = `att_${crypto.randomUUID()}`;

        await sql`
            INSERT INTO quiz_attempts (id, user_id, lesson_id, score, passed, answers)
            VALUES (${attemptId}, ${user.id}, ${lessonId}, ${scorePercent}, ${passed}, ${JSON.stringify(validatedAnswers)})
        `;

        if (passed) {
            await updateLessonProgress(String(courseRows[0].courseId), lessonId, true);
        }

        return { 
            success: true, 
            attemptId, 
            score: scorePercent, 
            totalQuestions: questions.length, 
            passed, 
            passingScore,
            scorePercent,
            review 
        };
    } catch (err) {
        console.error("Quiz submission error:", err);
        return { success: false, error: "Gagal mengirim jawaban kuis." };
    }
}

export async function getQuizAttempt(lessonId: string): Promise<QuizAttemptRecord | null> {
    try {
        const session = await requireUserSession();
        const user = session.user;

        const data = await sql`
            SELECT id, score, passed, answers, created_at as "createdAt"
            FROM quiz_attempts
            WHERE user_id = ${user.id} AND lesson_id = ${lessonId}
            ORDER BY created_at DESC
            LIMIT 1
        `;
        return data[0] ? data[0] as unknown as QuizAttemptRecord : null;
    } catch { return null; }
}

export async function getCoursesWithStats(): Promise<Array<CourseRecord & { instructorName: string; studentCount: number }>> {
    try {
        const session = await requireInstructorSession();

        const courses = session.user.role === "admin"
            ? await sql`
                SELECT id, title, description, category, level,
                       thumbnail_url as "thumbnailUrl", status,
                       instructor_id as "instructorId", jp,
                       certificate_type as "certificateType", certificate_enabled as "certificateEnabled",
                       certificate_auto_issue as "certificateAutoIssue", certificate_number_prefix as "certificateNumberPrefix",
                       passing_score as "passingScore", pacing_type as "pacingType", start_date as "startDate", end_date as "endDate",
                       created_at as "createdAt", updated_at as "updatedAt"
                FROM courses ORDER BY created_at DESC
              `
            : await sql`
                SELECT id, title, description, category, level,
                       thumbnail_url as "thumbnailUrl", status,
                       instructor_id as "instructorId", jp,
                       certificate_type as "certificateType", certificate_enabled as "certificateEnabled",
                       certificate_auto_issue as "certificateAutoIssue", certificate_number_prefix as "certificateNumberPrefix",
                       passing_score as "passingScore", pacing_type as "pacingType", start_date as "startDate", end_date as "endDate",
                       created_at as "createdAt", updated_at as "updatedAt"
                FROM courses WHERE instructor_id = ${session.user.id}
                ORDER BY created_at DESC
              `;
        
        return await Promise.all(courses.map(async (course) => {
            const enrollRes = await sql`SELECT count(*)::int as count FROM enrollments WHERE course_id = ${course.id}`;
            const studentCount = enrollRes[0].count;
            
            let instructorName = "Internal Team";
            if (course.instructorId) {
                const instrRes = await sql`SELECT name FROM users WHERE id = ${course.instructorId}`;
                if (instrRes[0]) instructorName = String(instrRes[0].name);
            }

            return {
                ...(course as unknown as CourseRecord),
                instructorName,
                studentCount: Number(studentCount)
            };
        }));
    } catch (err) {
        console.error("Failed to get courses with stats:", err);
        return [];
    }
}

export async function deleteCourse(id: string) {
    try {
        await requireCourseEditor(id);

        // Find course thumbnail before deleting
        const course = await sql`SELECT thumbnail_url as "thumbnailUrl" FROM courses WHERE id = ${id}`;
        if (course[0]?.thumbnailUrl) {
            await deleteAsset(course[0].thumbnailUrl);
        }
        
        await sql`DELETE FROM courses WHERE id = ${id}`;
        return { success: true };
    } catch (err) {
        console.error("Failed to delete course:", err);
        return { success: false, error: "Gagal menghapus kursus." };
    }
}

export async function updateCourseStatus(id: string, status: string) {
    try {
        await requireCourseEditor(id);
        if (!["draft", "active", "archived"].includes(status)) {
            return { success: false, error: "Status kursus tidak valid." };
        }

        await sql`UPDATE courses SET status = ${status} WHERE id = ${id}`;
        return { success: true };
    } catch {
        return { success: false, error: "Gagal memperbarui status." };
    }
}

export async function createCourse(input: unknown) {
    try {
        const session = await requireInstructorSession();
        const parsed = courseMutationSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: "Data kursus tidak valid." };
        const data = parsed.data;

        const id = `course_${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const instructorId = session.user.role === "admin" && data.instructorId
            ? String(data.instructorId)
            : session.user.id;
        
        await sql`
            INSERT INTO courses (
                id, title, description, category, level, thumbnail_url, status, instructor_id, pacing_type,
                start_date, end_date, jp, certificate_type, certificate_enabled, certificate_auto_issue,
                certificate_number_prefix, passing_score, created_at, updated_at
            ) VALUES (
                ${id}, ${sanitizePlainText(data.title)}, ${sanitizePlainText(data.description)}, ${sanitizePlainText(data.category)},
                ${data.level}, ${data.thumbnailUrl || null}, 'draft', ${instructorId}, ${data.pacingType}, ${data.startDate || null},
                ${data.endDate || null}, ${data.jp}, ${data.certificateType}, ${data.certificateEnabled},
                ${data.certificateEnabled && data.certificateAutoIssue}, ${data.certificateNumberPrefix}, ${data.passingScore}, ${now}, ${now}
            )
        `;
        
        return { success: true, courseId: id };
    } catch (err) {
        console.error("Failed to create course:", err);
        return { success: false, error: "Gagal membuat kursus." };
    }
}

export async function updateCourseDetails(id: string, input: unknown) {
    try {
        const session = await requireCourseEditor(id);
        const parsed = courseMutationSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: "Data kursus tidak valid." };
        const data = parsed.data;

        const now = new Date().toISOString();
        await sql`
            UPDATE courses 
            SET title = ${sanitizePlainText(data.title)},
                description = ${sanitizePlainText(data.description)},
                category = ${sanitizePlainText(data.category)},
                level = ${data.level}, 
                thumbnail_url = ${data.thumbnailUrl || null},
                instructor_id = ${session.user.role === "admin" && data.instructorId ? data.instructorId : session.user.id},
                pacing_type = ${data.pacingType},
                start_date = ${data.startDate || null}, end_date = ${data.endDate || null}, jp = ${data.jp},
                certificate_type = ${data.certificateType}, certificate_enabled = ${data.certificateEnabled},
                certificate_auto_issue = ${data.certificateEnabled && data.certificateAutoIssue},
                certificate_number_prefix = ${data.certificateNumberPrefix}, passing_score = ${data.passingScore},
                status = ${data.status},
                updated_at = ${now}
            WHERE id = ${id}
        `;
        return { success: true };
    } catch (err) {
        console.error("Failed to update course:", err);
        return { success: false, error: "Gagal memperbarui kursus." };
    }
}

export async function getCertificateSettings() {
    try {
        const rows = await sql`SELECT type, settings FROM certificate_settings`;
        const result: Record<string, unknown> = {};

        for (const row of rows) {
            const rowSettings = (row.settings as Record<string, unknown>) || {};
            // If the row contains nested types like { sertifikat: { ... } }, merge them
            if (rowSettings.sertifikat || rowSettings.surat_keterangan || rowSettings.sttp) {
                Object.assign(result, rowSettings);
            } else if (row.type) {
                result[row.type as string] = rowSettings;
            }
        }
        return result;
    } catch {
        return {};
    }
}

export async function updateCertificateSettings(settings: unknown) {
    try {
        await requireAdminSession();
        const parsed = certificateSettingsSchema.safeParse(settings);
        if (!parsed.success) {
            console.error("Certificate settings validation failed:", parsed.error);
            return { success: false, error: "Konfigurasi template tidak valid." };
        }

        const data = parsed.data as Record<string, unknown>;

        // Save both to the aggregate 'sertifikat' row for legacy readers and to individual type rows
        await sql`
            INSERT INTO certificate_settings (type, settings)
            VALUES ('sertifikat', ${JSON.stringify(data)})
            ON CONFLICT (type) DO UPDATE SET settings = EXCLUDED.settings
        `;

        for (const type of ["sertifikat", "surat_keterangan", "sttp"]) {
            if (data[type]) {
                await sql`
                    INSERT INTO certificate_settings (type, settings)
                    VALUES (${type}, ${JSON.stringify(data[type])})
                    ON CONFLICT (type) DO UPDATE SET settings = EXCLUDED.settings
                `;
            }
        }

        return { success: true };
    } catch (err) {
        console.error("Failed to update certificate settings:", err);
        return { success: false, error: "Gagal memperbarui pengaturan." };
    }
}
