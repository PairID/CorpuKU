"use server";

import crypto from "crypto";
import QRCode from "qrcode";
import { sql } from "@/lib/db";
import { getCourseContent, ensureModuleAccessColumns } from "./courses";
import { requireCourseEditor, requireLessonEditor, requireModuleEditor, requireQuestionEditor } from "@/lib/course-authorization";
import { sanitizeRichText } from "@/lib/content-security";
import type { ModuleAccessConfig } from "@/lib/module-access";

interface ModuleInput {
    courseId: string;
    title: string;
    order?: number;
}

interface LessonInput {
    moduleId: string;
    title: string;
    content?: string;
    videoUrl?: string;
    type?: string;
    order?: number;
}

interface QuizQuestionInput {
    lessonId: string;
    question: string;
    options: unknown[];
    correctOptionIndex: number;
    type?: string;
    order?: number;
}

interface BuilderQuizOption {
    optionText?: string;
    isCorrect?: boolean;
}

interface BuilderQuizQuestion {
    id?: string;
    questionText?: string;
    options?: BuilderQuizOption[];
}

interface BuilderLesson {
    id?: string;
    title?: string;
    content?: string;
    videoUrl?: string;
    type?: string;
    jp?: number;
    hasAttendance?: boolean;
    attendanceQrCode?: string | null;
    narasumberName?: string | null;
    sessionDate?: string | null;
    questions?: BuilderQuizQuestion[];
}

interface BuilderModule {
    id?: string;
    title?: string;
    isActive?: boolean;
    accessMode?: "manual" | "scheduled";
    activeFrom?: string | null;
    activeUntil?: string | null;
    lessons?: BuilderLesson[];
}

interface BuilderDeletions {
    modules?: string[];
    lessons?: string[];
    questions?: string[];
}

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

export async function addModule(data: ModuleInput) {
    try {
        await requireCourseEditor(String(data.courseId));

        const id = `mod_${Date.now()}`;
        await sql`
            INSERT INTO modules (id, course_id, title, "order")
            VALUES (${id}, ${data.courseId}, ${data.title}, ${data.order || 0})
        `;
        return { success: true, error: null, module: { id, ...data } };
    } catch (err: unknown) {
        return { success: false, error: errorMessage(err, "Gagal menambah modul.") };
    }
}

export async function addLesson(data: LessonInput) {
    try {
        await requireModuleEditor(String(data.moduleId));

        const id = `less_${Date.now()}`;
        await sql`
            INSERT INTO lessons (id, module_id, title, content, video_url, type, "order")
            VALUES (${id}, ${data.moduleId}, ${data.title}, ${sanitizeRichText(data.content || "")}, ${data.videoUrl || ""}, ${data.type || "video"}, ${data.order || 0})
        `;
        return { success: true, error: null, lesson: { id, ...data } };
    } catch (err: unknown) {
        return { success: false, error: errorMessage(err, "Gagal menambah materi.") };
    }
}

export async function updateModule(id: string, updates: Pick<ModuleInput, "title">) {
    try {
        await requireModuleEditor(id);

        await sql`UPDATE modules SET title = ${updates.title} WHERE id = ${id}`;
        return { success: true, error: null };
    } catch (err: unknown) {
        return { success: false, error: errorMessage(err, "Gagal update modul.") };
    }
}

export async function deleteModule(id: string) {
    try {
        await requireModuleEditor(id);

        await sql`DELETE FROM modules WHERE id = ${id}`;
        return { success: true, error: null };
    } catch (err: unknown) {
        return { success: false, error: errorMessage(err, "Gagal menghapus modul.") };
    }
}

export async function updateLesson(id: string, updates: Omit<LessonInput, "moduleId" | "order">) {
    try {
        await requireLessonEditor(id);

        await sql`
            UPDATE lessons SET 
                title = ${updates.title}, 
                content = ${sanitizeRichText(updates.content || "")},
                video_url = ${updates.videoUrl}, 
                type = ${updates.type} 
            WHERE id = ${id}
        `;
        return { success: true, error: null };
    } catch (err: unknown) {
        return { success: false, error: errorMessage(err, "Gagal update materi.") };
    }
}

export async function deleteLesson(id: string) {
    try {
        await requireLessonEditor(id);

        await sql`DELETE FROM lessons WHERE id = ${id}`;
        return { success: true, error: null };
    } catch (err: unknown) {
        return { success: false, error: errorMessage(err, "Gagal menghapus materi.") };
    }
}

export async function addQuizQuestion(data: QuizQuestionInput) {
    try {
        await requireLessonEditor(String(data.lessonId));

        const id = `q_${Date.now()}`;
        await sql`
            INSERT INTO quiz_questions (id, lesson_id, question, options, correct_option_index, type, "order")
            VALUES (${id}, ${data.lessonId}, ${data.question}, ${JSON.stringify(data.options)}, ${data.correctOptionIndex}, ${data.type || 'multiple_choice'}, ${data.order || 0})
        `;
        return { success: true, error: null, question: { id, ...data } };
    } catch (err: unknown) {
        return { success: false, error: errorMessage(err, "Gagal menambah pertanyaan kuis.") };
    }
}

export async function deleteQuizQuestion(id: string) {
    try {
        await requireQuestionEditor(id);

        await sql`DELETE FROM quiz_questions WHERE id = ${id}`;
        return { success: true, error: null };
    } catch (err: unknown) {
        return { success: false, error: errorMessage(err, "Gagal menghapus pertanyaan.") };
    }
}

export async function getCourseContentForBuilder(courseId: string) {
    try {
        await requireCourseEditor(courseId);
        return getCourseContent(courseId, { includeLockedContent: true });
    } catch {
        return [];
    }
}

export async function updateModuleAccess(
    courseId: string,
    moduleId: string,
    config: ModuleAccessConfig
) {
    try {
        await requireCourseEditor(courseId);
        await ensureModuleAccessColumns();
        const isActive = config.isActive !== false;
        const accessMode = config.accessMode === "scheduled" ? "scheduled" : "manual";
        const activeFrom = config.activeFrom ? new Date(config.activeFrom).toISOString() : null;
        const activeUntil = config.activeUntil ? new Date(config.activeUntil).toISOString() : null;

        await sql`
            UPDATE modules
            SET is_active = ${isActive},
                access_mode = ${accessMode},
                active_from = ${activeFrom}::timestamptz,
                active_until = ${activeUntil}::timestamptz
            WHERE id = ${moduleId} AND course_id = ${courseId}
        `;
        return { success: true };
    } catch (err: unknown) {
        console.error("updateModuleAccess error:", err);
        return { success: false, error: errorMessage(err, "Gagal memperbarui akses modul.") };
    }
}

export async function saveCourseContent(courseId: string, modulesData: BuilderModule[], deletions: BuilderDeletions) {
    try {
        await requireCourseEditor(courseId);
        await ensureModuleAccessColumns();

        // Handle Deletions
        const deletedModules = deletions.modules || [];
        const deletedLessons = deletions.lessons || [];
        const deletedQuestions = deletions.questions || [];
        if (deletedModules.length > 0) {
            await sql`DELETE FROM modules WHERE course_id = ${courseId} AND id = ANY(${deletedModules})`;
        }
        if (deletedLessons.length > 0) {
            await sql`
                DELETE FROM lessons lesson USING modules module
                WHERE lesson.module_id = module.id AND module.course_id = ${courseId}
                  AND lesson.id = ANY(${deletedLessons})
            `;
        }
        if (deletedQuestions.length > 0) {
            await sql`
                DELETE FROM quiz_questions question USING lessons lesson, modules module
                WHERE question.lesson_id = lesson.id AND lesson.module_id = module.id
                  AND module.course_id = ${courseId} AND question.id = ANY(${deletedQuestions})
            `;
        }

        // Handle Upserts (Modules & Lessons)
        for (let mIdx = 0; mIdx < modulesData.length; mIdx++) {
            const mod = modulesData[mIdx];
            let moduleId = mod.id;
            const isActive = mod.isActive !== false;
            const accessMode = mod.accessMode === "scheduled" ? "scheduled" : "manual";
            const activeFrom = mod.activeFrom ? new Date(mod.activeFrom).toISOString() : null;
            const activeUntil = mod.activeUntil ? new Date(mod.activeUntil).toISOString() : null;

            if (!moduleId || moduleId.startsWith('temp_')) {
                moduleId = `mod_${Date.now()}_${mIdx}`;
                await sql`
                    INSERT INTO modules (id, course_id, title, "order", is_active, access_mode, active_from, active_until)
                    VALUES (${moduleId}, ${courseId}, ${mod.title}, ${mIdx}, ${isActive}, ${accessMode}, ${activeFrom}::timestamptz, ${activeUntil}::timestamptz)
                `;
            } else {
                await sql`
                    UPDATE modules
                    SET title = ${mod.title},
                        "order" = ${mIdx},
                        is_active = ${isActive},
                        access_mode = ${accessMode},
                        active_from = ${activeFrom}::timestamptz,
                        active_until = ${activeUntil}::timestamptz
                    WHERE id = ${moduleId} AND course_id = ${courseId}
                `;
            }

            // Sync Lessons
            if (mod.lessons) {
                for (let lIdx = 0; lIdx < mod.lessons.length; lIdx++) {
                    const less = mod.lessons[lIdx];
                    let lessonId = less.id;

                    if (!lessonId || lessonId.startsWith('temp_')) {
                        lessonId = `less_${Date.now()}_${mIdx}_${lIdx}`;
                        await sql`
                            INSERT INTO lessons (
                                id, module_id, title, content, video_url, type, "order",
                                jp, has_attendance, attendance_qr_code, narasumber_name, session_date
                            )
                            VALUES (
                                ${lessonId}, ${moduleId}, ${less.title}, ${sanitizeRichText(less.content || "")},
                                ${less.videoUrl || ""}, ${less.type || "video"}, ${lIdx},
                                ${Number(less.jp || 0)}, ${less.hasAttendance !== false},
                                ${less.attendanceQrCode || null}, ${less.narasumberName || null},
                                ${less.sessionDate || null}
                            )
                        `;
                    } else {
                        await sql`
                            UPDATE lessons SET 
                                title = ${less.title}, 
                                content = ${sanitizeRichText(less.content || "")},
                                video_url = ${less.videoUrl || ""}, 
                                type = ${less.type || "video"},
                                "order" = ${lIdx},
                                jp = ${Number(less.jp || 0)},
                                has_attendance = ${less.hasAttendance !== false},
                                attendance_qr_code = COALESCE(${less.attendanceQrCode || null}, attendance_qr_code),
                                narasumber_name = ${less.narasumberName || null},
                                session_date = ${less.sessionDate || null}
                            WHERE id = ${lessonId} AND module_id = ${moduleId}
                        `;
                    }

                    // Sync Quiz Questions (Any lesson type can have attached quiz questions)
                    if (less.questions && less.questions.length > 0) {
                        for (let qIdx = 0; qIdx < less.questions.length; qIdx++) {
                            const q = less.questions[qIdx];
                            let qId = q.id;
                            
                            // Map UI question structure to DB
                            const options = q.options?.map((o) => o.optionText || "") || [];
                            const correctIdx = q.options?.findIndex((o) => o.isCorrect) ?? 0;

                            if (!qId || qId.startsWith('temp_')) {
                                qId = `q_${Date.now()}_${mIdx}_${lIdx}_${qIdx}`;
                                await sql`
                                    INSERT INTO quiz_questions (id, lesson_id, question, options, correct_option_index, type, "order")
                                    VALUES (${qId}, ${lessonId}, ${q.questionText}, ${JSON.stringify(options)}, ${correctIdx}, 'multiple_choice', ${qIdx})
                                    ON CONFLICT (id) DO NOTHING
                                `;
                            } else {
                                await sql`
                                    UPDATE quiz_questions SET
                                        question = ${q.questionText},
                                        options = ${JSON.stringify(options)},
                                        correct_option_index = ${correctIdx},
                                        "order" = ${qIdx}
                                    WHERE id = ${qId}
                                `;
                            }
                        }
                    }
                }
            }
        }

        return { success: true };
    } catch (err: unknown) {
        console.error("Save course structure error:", err);
        return { success: false, error: errorMessage(err, "Gagal menyimpan struktur kursus.") };
    }
}

/**
 * Men-generate kode dan QR code presensi unik untuk sesi materi
 */
export async function generateMaterialAttendanceQr(courseId: string, lessonId: string) {
    try {
        await requireCourseEditor(courseId);

        const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
        const code = `CLF-${lessonId.replace(/^less_/, "").slice(0, 10)}-${suffix}`;

        await sql`
            UPDATE lessons
            SET attendance_qr_code = ${code}
            WHERE id = ${lessonId}
        `;

        const qrPayload = JSON.stringify({
            type: "material_attendance",
            courseId,
            lessonId,
            code,
        });

        const qrDataUrl = await QRCode.toDataURL(qrPayload, {
            width: 320,
            margin: 2,
            color: { dark: "#0f172a", light: "#ffffff" },
        });

        return { success: true, code, qrDataUrl };
    } catch (err: unknown) {
        console.error("generateMaterialAttendanceQr error:", err);
        return { success: false, error: errorMessage(err, "Gagal men-generate QR presensi.") };
    }
}

/**
 * Mengambil kode QR presensi yang sudah tersimpan untuk sesi materi
 */
export async function getMaterialAttendanceQr(courseId: string, lessonId: string) {
    try {
        await requireCourseEditor(courseId);

        const rows = await sql`
            SELECT attendance_qr_code, title FROM lessons WHERE id = ${lessonId} LIMIT 1
        `;
        if (!rows[0]) return { success: false, error: "Materi tidak ditemukan." };

        let code = rows[0].attendance_qr_code ? String(rows[0].attendance_qr_code) : "";
        if (!code) {
            const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
            code = `CLF-${lessonId.replace(/^less_/, "").slice(0, 10)}-${suffix}`;
            await sql`
                UPDATE lessons
                SET attendance_qr_code = ${code}
                WHERE id = ${lessonId}
            `;
        }

        const qrPayload = JSON.stringify({
            type: "material_attendance",
            courseId,
            lessonId,
            code,
        });

        const qrDataUrl = await QRCode.toDataURL(qrPayload, {
            width: 320,
            margin: 2,
            color: { dark: "#0f172a", light: "#ffffff" },
        });

        return { success: true, code, qrDataUrl, title: String(rows[0].title) };
    } catch (err: unknown) {
        console.error("getMaterialAttendanceQr error:", err);
        return { success: false, error: errorMessage(err, "Gagal memuat QR presensi.") };
    }
}
