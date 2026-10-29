"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireInstructorSession } from "./auth";
import { generateOnDemandCourse, OnDemandCoursePackage, QualityAuditReport } from "@/lib/on-demand-learning";
import { SEED_PBJ_DOCUMENTS } from "@/lib/regulatory-registry";

export interface GenerateOnDemandResult {
    success: boolean;
    course?: OnDemandCoursePackage;
    audit?: QualityAuditReport;
    error?: string;
}

export interface RegulationItem {
    id: string;
    docType: string;
    docNumber: string;
    docYear: number;
    title: string;
    issuer: string;
    status: string;
    effectiveDate?: string | null;
    officialUrl?: string | null;
    pdfUrl?: string | null;
    abstract?: string | null;
}

export interface PublishOnDemandPayload {
    course: OnDemandCoursePackage;
    category?: string;
    level?: "Beginner" | "Intermediate" | "Advanced";
    status?: "draft" | "active";
    thumbnailUrl?: string;
}

export interface PublishOnDemandResult {
    success: boolean;
    courseId?: string;
    redirectUrl?: string;
    error?: string;
}

/**
 * Server Action: Mengambil Daftar Regulasi Aktif dari Document Registry
 */
export async function getAvailableRegulationsAction(): Promise<{ success: boolean; data: RegulationItem[]; error?: string }> {
    try {
        await requireInstructorSession();

        const rows = await sql`
            SELECT id, doc_type as "docType", doc_number as "docNumber", doc_year as "docYear",
                   title, issuer, status, effective_date as "effectiveDate",
                   official_url as "officialUrl", pdf_url as "pdfUrl", abstract
            FROM document_registry
            WHERE status != 'REPEALED'
            ORDER BY doc_year DESC, doc_number DESC
        `;

        if (rows && rows.length > 0) {
            const formatted = rows.map((r: Record<string, unknown>) => ({
                id: String(r.id),
                docType: String(r.docType || ""),
                docNumber: String(r.docNumber || ""),
                docYear: Number(r.docYear || 0),
                title: String(r.title || ""),
                issuer: String(r.issuer || ""),
                status: String(r.status || "ACTIVE"),
                effectiveDate: r.effectiveDate
                    ? (r.effectiveDate instanceof Date
                        ? r.effectiveDate.toISOString().split("T")[0]
                        : String(r.effectiveDate))
                    : null,
                officialUrl: r.officialUrl ? String(r.officialUrl) : null,
                pdfUrl: r.pdfUrl ? String(r.pdfUrl) : null,
                abstract: r.abstract ? String(r.abstract) : null,
            }));

            return {
                success: true,
                data: formatted as RegulationItem[]
            };
        }

        // Fallback ke seed data PBJ terverifikasi jika registry belum di-seed
        const fallback = SEED_PBJ_DOCUMENTS
            .filter(d => d.status !== 'REPEALED')
            .map(d => ({
                id: d.id,
                docType: d.docType,
                docNumber: d.docNumber,
                docYear: d.docYear,
                title: d.title,
                issuer: d.issuer,
                status: d.status,
                effectiveDate: d.effectiveDate,
                officialUrl: d.officialUrl,
                pdfUrl: d.pdfUrl,
                abstract: d.abstract
            }));

        return {
            success: true,
            data: fallback
        };
    } catch {
        // Fallback aman untuk sesi instruktur tanpa akses db langsung
        const fallback = SEED_PBJ_DOCUMENTS
            .filter(d => d.status !== 'REPEALED')
            .map(d => ({
                id: d.id,
                docType: d.docType,
                docNumber: d.docNumber,
                docYear: d.docYear,
                title: d.title,
                issuer: d.issuer,
                status: d.status,
                effectiveDate: d.effectiveDate,
                officialUrl: d.officialUrl,
                pdfUrl: d.pdfUrl,
                abstract: d.abstract
            }));

        return {
            success: true,
            data: fallback
        };
    }
}

/**
 * Server Action: Menghasilkan Modul Pelatihan On-Demand AI
 * Hanya dapat diakses oleh Instruktur & Admin (Tahap 1).
 * Berdasarkan masalah tempat kerja riil ASN dengan RAG Grounding ke Document Registry.
 */
export async function generateOnDemandLearningAction(
    workplaceProblem: string
): Promise<GenerateOnDemandResult> {
    try {
        await requireInstructorSession();
    } catch (err: unknown) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Hanya Instruktur dan Admin yang dapat menghasilkan kursus AI."
        };
    }

    if (!workplaceProblem || typeof workplaceProblem !== "string" || workplaceProblem.trim().length < 20) {
        return {
            success: false,
            error: "Uraian masalah tempat kerja terlalu singkat. Mohon jelaskan konteks masalah Anda secara lebih spesifik (minimal 20 karakter)."
        };
    }

    try {
        const { course, audit } = await generateOnDemandCourse(workplaceProblem.trim());
        return {
            success: true,
            course,
            audit
        };
    } catch (err: unknown) {
        console.error("[generateOnDemandLearningAction Error]:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Terjadi kesalahan saat memproses kurikulum On-Demand."
        };
    }
}

/**
 * Server Action: Menerbitkan Kursus yang Dihasilkan AI ke Katalog Kursus & Database
 * Menyimpan struktur kursus, silabus dengan JP dinamis, modul, toolkits, dan SJT quiz.
 */
export async function publishOnDemandCourseAction(
    payload: PublishOnDemandPayload
): Promise<PublishOnDemandResult> {
    try {
        const session = await requireInstructorSession();
        const { course } = payload;

        if (!course || !course.curriculumMeta || !course.modules || course.modules.length === 0) {
            return {
                success: false,
                error: "Data kurikulum tidak lengkap untuk diterbitkan."
            };
        }

        const courseId = `course_${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const instructorId = session.user.id;
        const title = course.curriculumMeta.title.slice(0, 200);
        
        // Deskripsi terstruktur
        const groundingSummary = course.curriculumMeta.regulatoryGrounding
            .map(r => r.regulation)
            .join(", ");
        
        const description = [
            `Pelatihan berbasis masalah kerja nyata untuk ${course.curriculumMeta.targetAudience} dengan target kompetensi ${course.curriculumMeta.competencyLevel}.`,
            `Disusun menggunakan AI Course Creator dengan validasi regulasi otentik (Zero Fabrication) berlandaskan: ${groundingSummary}.`,
            `Dilengkapi ${course.modules.length} modul terapan, Checklist SOP Verifikasi Mandiri, Kertas Kerja HPS, serta Uji Situational Judgment Test (SJT).`,
            `Ekuivalensi Jam Pelajaran: ${course.curriculumMeta.equivalentJp} JP (${course.curriculumMeta.estimatedDurationMinutes} menit).`
        ].join("\n\n");

        const category = payload.category || "Pengadaan Barang/Jasa";
        const level = payload.level || "Intermediate";
        const status = payload.status || "active";
        const dynamicJp = course.curriculumMeta.equivalentJp || 2;
        const thumbnailUrl = payload.thumbnailUrl || null;

        // 1. Simpan ke tabel courses
        await sql`
            INSERT INTO courses (
                id, title, description, category, level, thumbnail_url, status, instructor_id,
                pacing_type, jp, certificate_type, certificate_enabled, certificate_auto_issue,
                certificate_number_prefix, passing_score, created_at, updated_at
            ) VALUES (
                ${courseId}, ${title}, ${description}, ${category}, ${level}, ${thumbnailUrl},
                ${status}, ${instructorId}, 'self_paced', ${dynamicJp}, 'sertifikat', true, true,
                'PBJ', 70, ${now}, ${now}
            )
        `;

        // 2. Simpan setiap modul pembelajaran & reading lessons
        for (const mod of course.modules) {
            const moduleId = `mod_${crypto.randomUUID()}`;
            await sql`
                INSERT INTO modules (id, course_id, title, "order")
                VALUES (${moduleId}, ${courseId}, ${mod.moduleTitle}, ${mod.moduleOrder})
            `;

            const lessonId = `less_${crypto.randomUUID()}`;
            const keyPointsHtml = mod.learningPoints.map(p => `<li>${p}</li>`).join("");
            const pitfallsHtml = mod.commonPitfalls.map(p => `<li>⚠️ ${p}</li>`).join("");

            const lessonContent = `
                <div class="prose max-w-none">
                    <h3>Uraian Materi Pembelajaran</h3>
                    <p>${mod.contentBody.replace(/\n\n/g, "</p><p>")}</p>
                    
                    <h4>Butir Kunci Pemahaman</h4>
                    <ul>${keyPointsHtml}</ul>

                    <h4>Titik Rawan Temuan Audit BPK / Pengawas</h4>
                    <ul class="text-amber-800">${pitfallsHtml}</ul>
                </div>
            `.trim();

            await sql`
                INSERT INTO lessons (id, module_id, title, content, video_url, type, "order")
                VALUES (${lessonId}, ${moduleId}, ${`Materi: ${mod.moduleTitle}`}, ${lessonContent}, '', 'reading', 1)
            `;
        }

        // 3. Simpan Modul Actionable Toolkits & SOP
        if (course.actionableToolkits) {
            const toolkitModId = `mod_${crypto.randomUUID()}`;
            const toolkitOrder = course.modules.length + 1;

            await sql`
                INSERT INTO modules (id, course_id, title, "order")
                VALUES (${toolkitModId}, ${courseId}, 'Actionable Toolkits & SOP Pengadaan', ${toolkitOrder})
            `;

            // Checklist SOP Lesson
            const checklistRows = course.actionableToolkits.selfVerificationChecklist
                .map((c, i) => `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">${i + 1}</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${c.checkpoint}</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; color: #1e3a8a;">${c.regulatoryBasis}</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">${c.verificationMethod}</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0; color: #b91c1c;">${c.riskIfNotCompliant}</td>
                    </tr>
                `).join("");

            const checklistHtml = `
                <div class="prose max-w-none">
                    <h3>Checklist Verifikasi Mandiri (SOP Sebelum Penetapan)</h3>
                    <p>Gunakan instrumen checklist ini untuk memverifikasi kepatuhan administratif dan yuridis dokumen pengadaan Anda:</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                        <thead>
                            <tr style="background-color: #f8fafc;">
                                <th style="padding: 8px; border: 1px solid #e2e8f0;">No</th>
                                <th style="padding: 8px; border: 1px solid #e2e8f0;">Item Verifikasi</th>
                                <th style="padding: 8px; border: 1px solid #e2e8f0;">Dasar Regulasi</th>
                                <th style="padding: 8px; border: 1px solid #e2e8f0;">Metode Pemeriksaan</th>
                                <th style="padding: 8px; border: 1px solid #e2e8f0;">Risiko Pelanggaran</th>
                            </tr>
                        </thead>
                        <tbody>${checklistRows}</tbody>
                    </table>
                </div>
            `.trim();

            const checklistLessonId = `less_${crypto.randomUUID()}`;
            await sql`
                INSERT INTO lessons (id, module_id, title, content, video_url, type, "order")
                VALUES (${checklistLessonId}, ${toolkitModId}, 'Checklist Verifikasi Mandiri (SOP)', ${checklistHtml}, '', 'reading', 1)
            `;

            // Worksheet Structure Lesson
            if (course.actionableToolkits.hpsWorksheetStructure) {
                const worksheet = course.actionableToolkits.hpsWorksheetStructure;
                const worksheetHtml = `
                    <div class="prose max-w-none">
                        <h3>Pedoman & Komponen Kertas Kerja HPS / Spesifikasi Teknis</h3>
                        <p>${worksheet.guidelines}</p>
                        <h4>Elemen Standar Kertas Kerja:</h4>
                        <ul>${worksheet.components.map(comp => `<li>${comp}</li>`).join("")}</ul>
                    </div>
                `.trim();

                const worksheetLessonId = `less_${crypto.randomUUID()}`;
                await sql`
                    INSERT INTO lessons (id, module_id, title, content, video_url, type, "order")
                    VALUES (${worksheetLessonId}, ${toolkitModId}, 'Format & Pedoman Kertas Kerja HPS', ${worksheetHtml}, '', 'reading', 2)
                `;
            }
        }

        // 4. Simpan Modul Evaluasi & Situational Judgment Test (SJT)
        if (course.situationalJudgmentQuiz && course.situationalJudgmentQuiz.length > 0) {
            const quizModId = `mod_${crypto.randomUUID()}`;
            const quizModOrder = course.modules.length + 2;

            await sql`
                INSERT INTO modules (id, course_id, title, "order")
                VALUES (${quizModId}, ${courseId}, 'Evaluasi & Situational Judgment Test (SJT)', ${quizModOrder})
            `;

            const quizLessonId = `less_${crypto.randomUUID()}`;
            await sql`
                INSERT INTO lessons (id, module_id, title, content, video_url, type, "order")
                VALUES (${quizLessonId}, ${quizModId}, 'Situational Judgment Test (SJT) - Uji Kasus Nyata', 'Silakan jawab skenario studi kasus berikut berlandaskan kepatuhan regulasi PBJ.', '', 'quiz', 1)
            `;

            for (const q of course.situationalJudgmentQuiz) {
                const qId = `q_${crypto.randomUUID()}`;
                const optionsFormatted = q.options.map(opt => ({
                    optionText: `${opt.key}. ${opt.text}`,
                    reasoning: opt.reasoning,
                    isCorrect: opt.isCorrect
                }));

                const correctIndex = Math.max(0, q.options.findIndex(opt => opt.isCorrect));
                const fullQuestionText = `${q.scenario}\n\n(Dasar Regulasi: ${q.regulatoryReference})`;

                await sql`
                    INSERT INTO quiz_questions (id, lesson_id, question, options, correct_option_index, type, "order", created_at)
                    VALUES (
                        ${qId}, ${quizLessonId}, ${fullQuestionText},
                        ${JSON.stringify(optionsFormatted)}, ${correctIndex}, 'single_choice',
                        ${q.questionNumber}, ${now}
                    )
                `;
            }
        }

        // Revalidasi jalur halaman yang memuat daftar kursus
        revalidatePath('/courses');
        revalidatePath('/search');
        revalidatePath('/instructor/courses');
        revalidatePath('/admin/courses');

        return {
            success: true,
            courseId,
            redirectUrl: `/courses/${courseId}`
        };
    } catch (err: unknown) {
        console.error("[publishOnDemandCourseAction Error]:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Gagal menerbitkan kursus ke katalog."
        };
    }
}
