"use server";

import crypto from "crypto";
import { sql } from "@/lib/db";
import { requireUserSession } from "./auth";
import { calculateSkmScore } from "@/lib/skm-constants";
import { issueCourseCertificate } from "@/lib/course-certificates";
import { revalidatePath } from "next/cache";

export type EvaluationStage = "narasumber" | "organizer" | "understanding" | "skm";

interface SubmitEvaluationPayload {
  courseId: string;
  stage: EvaluationStage;
  sessionId?: string; // lesson_id for narasumber evaluation
  answers: Record<string, unknown> | Array<{ questionId: number; score: number }>;
  score?: number;
}

/**
 * Mengambil status 4 tahap evaluasi untuk peserta pada suatu kelas
 */
export async function getTrainingEvaluations(courseId: string) {
  try {
    const session = await requireUserSession();
    const userId = session.user.id;

    // 1. Ambil pendaftaran kelas
    const enrollmentRows = await sql`
      SELECT id, eval_narasumber_completed, eval_organizer_completed,
             eval_understanding_completed, eval_skm_completed, all_evaluations_completed,
             attendance_percentage, attended_jp
      FROM enrollments
      WHERE (course_id = ${courseId} OR id = ${courseId}) AND user_id = ${userId}
      LIMIT 1
    `;
    const enrollment = enrollmentRows[0];
    if (!enrollment) {
      return { success: false, error: "Pendaftaran tidak ditemukan." };
    }

    // 2. Ambil sesi-sesi materi yang memiliki narasumber
    const narasumberLessons = await sql`
      SELECT lesson.id, lesson.title, lesson.narasumber_name AS "narasumberName",
             lesson.jp
      FROM lessons lesson
      JOIN modules module ON module.id = lesson.module_id
      WHERE module.course_id = ${courseId}
        AND (lesson.narasumber_name IS NOT NULL AND TRIM(lesson.narasumber_name) != '')
      ORDER BY module."order", lesson."order"
    `;

    // 3. Ambil evaluasi yang sudah diisi
    const evaluations = await sql`
      SELECT id, stage, session_id AS "sessionId", answers, score, created_at AS "createdAt"
      FROM training_evaluations
      WHERE enrollment_id = ${enrollment.id}
      ORDER BY created_at ASC
    `;

    const evaluatedSessions = new Set(
      evaluations.filter((e) => e.stage === "narasumber").map((e) => String(e.sessionId))
    );

    const narasumberStatus = narasumberLessons.map((l) => ({
      lessonId: String(l.id),
      title: String(l.title),
      narasumberName: String(l.narasumberName),
      evaluated: evaluatedSessions.has(String(l.id)),
    }));

    // Tentukan tahap yang aktif saat ini
    let currentStage: EvaluationStage | "completed" = "narasumber";
    if (!enrollment.eval_narasumber_completed) {
      currentStage = "narasumber";
    } else if (!enrollment.eval_organizer_completed) {
      currentStage = "organizer";
    } else if (!enrollment.eval_understanding_completed) {
      currentStage = "understanding";
    } else if (!enrollment.eval_skm_completed) {
      currentStage = "skm";
    } else {
      currentStage = "completed";
    }

    return {
      success: true,
      enrollmentId: String(enrollment.id),
      currentStage,
      stages: {
        narasumber: {
          completed: Boolean(enrollment.eval_narasumber_completed),
          sessions: narasumberStatus,
        },
        organizer: {
          completed: Boolean(enrollment.eval_organizer_completed),
          evaluation: evaluations.find((e) => e.stage === "organizer") || null,
        },
        understanding: {
          completed: Boolean(enrollment.eval_understanding_completed),
          evaluation: evaluations.find((e) => e.stage === "understanding") || null,
        },
        skm: {
          completed: Boolean(enrollment.eval_skm_completed),
          evaluation: evaluations.find((e) => e.stage === "skm") || null,
        },
      },
      allCompleted: Boolean(enrollment.all_evaluations_completed),
      attendancePercentage: Number(enrollment.attendance_percentage || 0),
    };
  } catch (err: unknown) {
    console.error("getTrainingEvaluations error:", err);
    return { success: false, error: "Gagal memuat status evaluasi." };
  }
}

/**
 * Menyimpan evaluasi secara bertahap dengan server-side sequential stage gating
 */
export async function submitTrainingEvaluation(payload: SubmitEvaluationPayload) {
  try {
    const session = await requireUserSession();
    const userId = session.user.id;
    const { courseId, stage, sessionId, answers } = payload;

    if (!courseId || !stage || !answers) {
      return { success: false, error: "Data evaluasi tidak lengkap." };
    }

    // 1. Ambil enrollment
    const enrollmentRows = await sql`
      SELECT id, eval_narasumber_completed, eval_organizer_completed,
             eval_understanding_completed, eval_skm_completed, all_evaluations_completed,
             attendance_percentage, progress, status
      FROM enrollments
      WHERE (course_id = ${courseId} OR id = ${courseId}) AND user_id = ${userId}
      LIMIT 1
    `;
    const enrollment = enrollmentRows[0];
    if (!enrollment) {
      return { success: false, error: "Pendaftaran tidak ditemukan." };
    }

    // 2. Sequential Stage Gating Check
    if (stage === "organizer" && !enrollment.eval_narasumber_completed) {
      return {
        success: false,
        error: "Tahap 1 belum selesai: Harap lengkapi evaluasi narasumber terlebih dahulu.",
      };
    }
    if (stage === "understanding" && !enrollment.eval_organizer_completed) {
      return {
        success: false,
        error: "Tahap 2 belum selesai: Harap lengkapi evaluasi kualitas penyelenggaraan terlebih dahulu.",
      };
    }
    if (stage === "skm" && !enrollment.eval_understanding_completed) {
      return {
        success: false,
        error: "Tahap 3 belum selesai: Harap lengkapi evaluasi pemahaman materi terlebih dahulu.",
      };
    }

    // 3. Hitung score evaluasi berdasarkan input
    let calculatedScore: number | null = null;
    if (typeof payload.score === "number") {
      calculatedScore = payload.score;
    } else if (Array.isArray(answers)) {
      calculatedScore = calculateSkmScore(answers).score;
    } else if (answers && typeof answers === "object") {
      const ratings = (answers as Record<string, unknown>).ratings;
      if (Array.isArray(ratings)) {
        calculatedScore = calculateSkmScore(ratings as Array<{ score: number }>).score;
      }
    }

    // 4. Simpan ke training_evaluations
    const evalId = `eval_${crypto.randomUUID()}`;
    const sessId = sessionId || stage;

    await sql`
      INSERT INTO training_evaluations (
        id, enrollment_id, user_id, course_id, stage, session_id, answers, score, created_at
      ) VALUES (
        ${evalId}, ${enrollment.id}, ${userId}, ${courseId}, ${stage}, ${sessId},
        ${JSON.stringify(answers)}, ${calculatedScore}, CURRENT_TIMESTAMP
      )
      ON CONFLICT (enrollment_id, stage, session_id)
      DO UPDATE SET
        answers = EXCLUDED.answers,
        score = EXCLUDED.score,
        created_at = CURRENT_TIMESTAMP
    `;

    // 5. Update status enrollment per tahap
    let nextStage: EvaluationStage | "completed" = "narasumber";

    if (stage === "narasumber") {
      // Periksa apakah semua sesi narasumber sudah dievaluasi
      const narasumberLessons = await sql`
        SELECT lesson.id
        FROM lessons lesson
        JOIN modules module ON module.id = lesson.module_id
        WHERE module.course_id = ${courseId}
          AND (lesson.narasumber_name IS NOT NULL AND TRIM(lesson.narasumber_name) != '')
      `;

      const completedEvals = await sql`
        SELECT session_id
        FROM training_evaluations
        WHERE enrollment_id = ${enrollment.id} AND stage = 'narasumber'
      `;
      const completedSet = new Set(completedEvals.map((e) => String(e.session_id)));
      const allNarasumberDone = narasumberLessons.every((l) => completedSet.has(String(l.id)));

      // Wajib menyelesaikan seluruh sesi narasumber jika kursus memiliki narasumber
      const requiresNarasumberEval = narasumberLessons.length > 0;
      const narasumberStageComplete = requiresNarasumberEval ? allNarasumberDone : true;

      if (narasumberStageComplete) {
        await sql`
          UPDATE enrollments
          SET eval_narasumber_completed = TRUE
          WHERE id = ${enrollment.id}
        `;
        nextStage = "organizer";
      } else {
        nextStage = "narasumber";
      }
    } else if (stage === "organizer") {
      await sql`
        UPDATE enrollments
        SET eval_organizer_completed = TRUE
        WHERE id = ${enrollment.id}
      `;
      nextStage = "understanding";
    } else if (stage === "understanding") {
      await sql`
        UPDATE enrollments
        SET eval_understanding_completed = TRUE
        WHERE id = ${enrollment.id}
      `;
      nextStage = "skm";
    } else if (stage === "skm") {
      const attPct = Number(enrollment.attendance_percentage || 0);
      const isEligible = attPct >= 80;

      await sql`
        UPDATE enrollments
        SET eval_skm_completed = TRUE,
            all_evaluations_completed = TRUE,
            status = CASE WHEN ${isEligible} THEN 'completed' ELSE status END,
            completed_at = CASE WHEN ${isEligible} THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE completed_at END
        WHERE id = ${enrollment.id}
      `;
      nextStage = "completed";

      // Cek apakah memenuhi syarat otomatisasi penerbitan sertifikat
      if (isEligible) {
        try {
          await issueCourseCertificate(userId, courseId);
        } catch (certErr) {
          console.warn("Auto-issue certificate on SKM completion skipped:", certErr);
        }
      }
    }

    revalidatePath(`/learn/${courseId}`);
    revalidatePath(`/dashboard/courses/${courseId}/progress`);

    return {
      success: true,
      message: `Evaluasi ${stage} berhasil disimpan!`,
      stage,
      nextStage,
      score: calculatedScore,
      allEvaluationsCompleted: nextStage === "completed",
    };
  } catch (err: unknown) {
    console.error("submitTrainingEvaluation error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan evaluasi.",
    };
  }
}
