"use server";

import { sql } from "@/lib/db";
import { requireInstructorSession } from "./auth";
import { calculateAttendancePercentage } from "@/lib/classical-training";

export interface CourseAnalyticsData {
  course: {
    id: string;
    title: string;
    trainingType: string;
    targetOpd: string | null;
    attendanceThreshold: number;
    totalClassJp: number;
    jp: number;
    passingScore: number;
    startDate: string | null;
    endDate: string | null;
    instructorName: string | null;
    category: string | null;
    deliveryMode: string;
    status: string;
  };
  summary: {
    totalEnrolled: number;
    totalPending: number;
    totalCompleted: number;
    completionRate: number;
    avgAttendancePct: number;
    avgQuizScore: number;
    evalCompletionRate: number;
  };
  funnel: Array<{
    stage: string;
    label: string;
    count: number;
    percent: number;
    dropOff: number;
  }>;
  sessionAttendance: Array<{
    lessonId: string;
    title: string;
    moduleTitle: string;
    order: number;
    jp: number;
    attendedCount: number;
    attendanceRatePct: number;
  }>;
  gradeDistribution: {
    buckets: Array<{ label: string; range: string; count: number; color: string }>;
    highestScore: number;
    lowestScore: number;
    avgScore: number;
    totalAttempts: number;
  };
  kirkpatrickEvaluations: {
    narasumber: { avgScore: number; index100: number; responses: number };
    organizer: { avgScore: number; index100: number; responses: number };
    understanding: { avgScore: number; index100: number; responses: number };
    skm: { avgScore: number; index100: number; responses: number };
    overallIndex: number;
    totalEvaluations: number;
  };
  atRiskParticipants: Array<{
    enrollmentId: string;
    userId: string;
    name: string;
    nip: string;
    instansiAsal: string;
    attendancePercentage: number;
    attendedJp: number;
    evalsDoneCount: number;
    allEvaluationsCompleted: boolean;
    status: string;
  }>;
  opdBreakdown: Array<{
    name: string;
    participantCount: number;
    completedCount: number;
    completionRatePct: number;
  }>;
}

export async function getCourseAnalytics(courseId: string): Promise<{ success: boolean; data?: CourseAnalyticsData; error?: string }> {
  try {
    const session = await requireInstructorSession();
    if (!/^[A-Za-z0-9_-]{1,255}$/.test(courseId)) {
      return { success: false, error: "ID Kursus tidak valid." };
    }

    // 1. Ambil Data Kursus
    const courseRows = await sql`
      SELECT c.id, c.title, c.training_type AS "trainingType",
             c.target_opd AS "targetOpd",
             COALESCE(c.attendance_threshold, 80) AS "attendanceThreshold",
             COALESCE(c.passing_score, 60) AS "passingScore",
             COALESCE(c.jp, 0) AS "jp",
             TO_CHAR(c.start_date::date, 'YYYY-MM-DD') AS "startDate",
             TO_CHAR(c.end_date::date, 'YYYY-MM-DD') AS "endDate",
             COALESCE(c.delivery_mode, 'daring') AS "deliveryMode",
             c.status, c.category, c.instructor_id AS "instructorId",
             u.name AS "instructorName"
      FROM courses c
      LEFT JOIN users u ON u.id = c.instructor_id
      WHERE c.id = ${courseId}
      LIMIT 1
    `;
    const course = courseRows[0];
    if (!course) {
      return { success: false, error: "Kursus tidak ditemukan." };
    }

    // Otorisasi instruktur (admin boleh melihat semua, instruktur hanya kursus miliknya)
    if (session.user.role === "instructor" && String(course.instructorId) !== session.user.id) {
      return { success: false, error: "Anda tidak memiliki wewenang mengakses analitik kursus ini." };
    }

    // 2. Ambil Sesi / Materi dengan JP
    const sessionRows = await sql`
      SELECT l.id, l.title, l.jp, l.has_attendance AS "hasAttendance",
             l."order" AS "lessonOrder", m.title AS "moduleTitle", m."order" AS "moduleOrder"
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE m.course_id = ${courseId}
      ORDER BY m."order" ASC, l."order" ASC
    `;

    const attendanceSessions = sessionRows.filter((s) => s.hasAttendance !== false && Number(s.jp || 0) > 0);
    const totalClassJp = sessionRows.reduce((acc, s) => acc + Math.max(0, Number(s.jp || 0)), 0);

    // 3. Ambil Seluruh Peserta Terdaftar
    const participantRows = await sql`
      SELECT e.id AS "enrollmentId", e.user_id AS "userId", e.status, e.progress,
             e.attended_jp AS "attendedJp", e.attendance_percentage AS "attendancePercentage",
             e.all_evaluations_completed AS "allEvaluationsCompleted",
             e.eval_narasumber_completed AS "evalNarasumberCompleted",
             e.eval_organizer_completed AS "evalOrganizerCompleted",
             e.eval_understanding_completed AS "evalUnderstandingCompleted",
             e.eval_skm_completed AS "evalSkmCompleted",
             u.name, COALESCE(u.nip, '') AS nip, COALESCE(u.instansi_asal, 'Lainnya / Umum') AS "instansiAsal"
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      WHERE e.course_id = ${courseId}
    `;

    const activeParticipants = participantRows.filter((p) => p.status === "active" || p.status === "completed");
    const totalEnrolled = activeParticipants.length;
    const totalPending = participantRows.filter((p) => p.status === "pending_approval").length;
    const totalCompleted = activeParticipants.filter((p) => p.status === "completed").length;
    const threshold = Number(course.attendanceThreshold || 80);

    // Hitung rata-rata kehadiran
    const totalAttPctSum = activeParticipants.reduce((sum, p) => sum + Number(p.attendancePercentage || 0), 0);
    const avgAttendancePct = totalEnrolled > 0 ? Math.round(totalAttPctSum / totalEnrolled) : 0;

    // 4. Hitung Funnel Kelulusan
    const attendedSufficientCount = activeParticipants.filter((p) => Number(p.attendancePercentage || 0) >= threshold).length;
    const evalsCompletedCount = activeParticipants.filter((p) => Boolean(p.allEvaluationsCompleted)).length;

    // Ambil data kelulusan kuis
    const lessonIds = sessionRows.map((s) => String(s.id));
    let quizAttempts: Array<{ userId: string; score: number; passed: boolean; lessonId: string }> = [];
    if (lessonIds.length > 0) {
      const attempts = await sql`
        SELECT user_id AS "userId", score, passed, lesson_id AS "lessonId"
        FROM quiz_attempts
        WHERE lesson_id = ANY(${lessonIds})
      `;
      quizAttempts = attempts.map((a) => ({
        userId: String(a.userId),
        score: Number(a.score || 0),
        passed: Boolean(a.passed),
        lessonId: String(a.lessonId),
      }));
    }

    const quizPassedUsers = new Set(quizAttempts.filter((a) => a.passed).map((a) => a.userId));
    const quizPassedCount = course.trainingType === "classical_facilitation"
      ? attendedSufficientCount // pada klasikal, kelulusan materi berbasis presensi
      : activeParticipants.filter((p) => quizPassedUsers.has(String(p.userId)) || (p.progress || 0) >= 100).length;

    // Data Sertifikat Terbit
    const issuedCertificates = await sql`
      SELECT enrollment_id AS "enrollmentId"
      FROM issued_course_certificates
      WHERE course_id = ${courseId} AND revoked_at IS NULL
    `;
    const certifiedEnrollmentIds = new Set(issuedCertificates.map((c) => String(c.enrollmentId)));
    const certifiedCount = activeParticipants.filter((p) => certifiedEnrollmentIds.has(String(p.enrollmentId)) || p.status === "completed").length;

    const funnel = [
      {
        stage: "enrolled",
        label: "Pendaftaran Aktif",
        count: totalEnrolled,
        percent: 100,
        dropOff: 0,
      },
      {
        stage: "attendance",
        label: course.trainingType === "classical_facilitation" ? `Kehadiran Sesi (≥${threshold}%)` : "Aktivitas Belajar",
        count: attendedSufficientCount,
        percent: totalEnrolled > 0 ? Math.round((attendedSufficientCount / totalEnrolled) * 100) : 0,
        dropOff: totalEnrolled > 0 ? Math.max(0, totalEnrolled - attendedSufficientCount) : 0,
      },
      {
        stage: "quiz",
        label: "Kelulusan Materi / Kuis",
        count: quizPassedCount,
        percent: totalEnrolled > 0 ? Math.round((quizPassedCount / totalEnrolled) * 100) : 0,
        dropOff: attendedSufficientCount > 0 ? Math.max(0, attendedSufficientCount - quizPassedCount) : 0,
      },
      {
        stage: "evaluation",
        label: "Evaluasi 4 Tahap Lengkap",
        count: evalsCompletedCount,
        percent: totalEnrolled > 0 ? Math.round((evalsCompletedCount / totalEnrolled) * 100) : 0,
        dropOff: quizPassedCount > 0 ? Math.max(0, quizPassedCount - evalsCompletedCount) : 0,
      },
      {
        stage: "certified",
        label: "Sertifikat Diterbitkan",
        count: certifiedCount,
        percent: totalEnrolled > 0 ? Math.round((certifiedCount / totalEnrolled) * 100) : 0,
        dropOff: evalsCompletedCount > 0 ? Math.max(0, evalsCompletedCount - certifiedCount) : 0,
      },
    ];

    // 5. Presensi Per Sesi Pembelajaran
    let sessionAttendanceLogs: Array<{ lessonId: string; userCount: number }> = [];
    if (attendanceSessions.length > 0) {
      const logs = await sql`
        SELECT lesson_id AS "lessonId", COUNT(DISTINCT user_id)::INTEGER AS "userCount"
        FROM material_attendances
        WHERE course_id = ${courseId}
        GROUP BY lesson_id
      `;
      sessionAttendanceLogs = logs.map((l) => ({
        lessonId: String(l.lessonId),
        userCount: Number(l.userCount || 0),
      }));
    }

    const sessionAttendanceMap = new Map<string, number>();
    for (const log of sessionAttendanceLogs) {
      sessionAttendanceMap.set(log.lessonId, log.userCount);
    }

    const sessionAttendance = attendanceSessions.map((s, index) => {
      const attended = sessionAttendanceMap.get(String(s.id)) || 0;
      return {
        lessonId: String(s.id),
        title: String(s.title || `Sesi ${index + 1}`),
        moduleTitle: String(s.moduleTitle || "Modul"),
        order: Number(s.lessonOrder || index + 1),
        jp: Number(s.jp || 0),
        attendedCount: attended,
        attendanceRatePct: totalEnrolled > 0 ? Math.round((attended / totalEnrolled) * 100) : 0,
      };
    });

    // 6. Histogram Distribusi Nilai Kuis
    const scores = quizAttempts.map((a) => a.score);
    const avgQuizScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    const bucketGagal = scores.filter((s) => s < 60).length;
    const bucketCukup = scores.filter((s) => s >= 60 && s < 75).length;
    const bucketBaik = scores.filter((s) => s >= 75 && s < 90).length;
    const bucketSangatBaik = scores.filter((s) => s >= 90).length;

    const gradeDistribution = {
      buckets: [
        { label: "Kurang (<60)", range: "< 60", count: bucketGagal, color: "#ef4444" },
        { label: "Cukup (60-74)", range: "60 - 74", count: bucketCukup, color: "#f59e0b" },
        { label: "Baik (75-89)", range: "75 - 89", count: bucketBaik, color: "#3b82f6" },
        { label: "Sangat Baik (90-100)", range: "90 - 100", count: bucketSangatBaik, color: "#10b981" },
      ],
      highestScore,
      lowestScore,
      avgScore: avgQuizScore,
      totalAttempts: scores.length,
    };

    // 7. Kirkpatrick L1 Evaluation Score Aggregation
    const evaluationRecords = await sql`
      SELECT stage, score
      FROM training_evaluations
      WHERE enrollment_id IN (
        SELECT id FROM enrollments WHERE course_id = ${courseId}
      ) AND score IS NOT NULL
    `;

    const evalScoresByStage = {
      narasumber: [] as number[],
      organizer: [] as number[],
      understanding: [] as number[],
      skm: [] as number[],
    };

    for (const record of evaluationRecords) {
      const stage = String(record.stage) as keyof typeof evalScoresByStage;
      if (evalScoresByStage[stage]) {
        evalScoresByStage[stage].push(Number(record.score));
      }
    }

    const calcEvalStats = (scoresList: number[]) => {
      if (scoresList.length === 0) return { avgScore: 0, index100: 0, responses: 0 };
      const avg = scoresList.reduce((a, b) => a + b, 0) / scoresList.length;
      // Konversi skala 1-4 ke indeks 0-100: ((avg - 1) / 3) * 100
      const index100 = Math.min(100, Math.max(0, Math.round(((avg - 1) / 3) * 100)));
      return {
        avgScore: Number(avg.toFixed(2)),
        index100: index100 > 0 ? index100 : Math.round((avg / 4) * 100),
        responses: scoresList.length,
      };
    };

    const narasumberStats = calcEvalStats(evalScoresByStage.narasumber);
    const organizerStats = calcEvalStats(evalScoresByStage.organizer);
    const understandingStats = calcEvalStats(evalScoresByStage.understanding);
    const skmStats = calcEvalStats(evalScoresByStage.skm);

    const validIndices = [narasumberStats.index100, organizerStats.index100, understandingStats.index100, skmStats.index100].filter((idx) => idx > 0);
    const overallIndex = validIndices.length > 0 ? Math.round(validIndices.reduce((a, b) => a + b, 0) / validIndices.length) : 0;

    const kirkpatrickEvaluations = {
      narasumber: narasumberStats,
      organizer: organizerStats,
      understanding: understandingStats,
      skm: skmStats,
      overallIndex,
      totalEvaluations: evaluationRecords.length,
    };

    // 8. Peserta At-Risk (Perlu Perhatian)
    const atRiskParticipants = activeParticipants
      .filter((p) => {
        const attInsufficient = Number(p.attendancePercentage || 0) < threshold;
        const evalsIncomplete = !p.allEvaluationsCompleted;
        return attInsufficient || evalsIncomplete;
      })
      .slice(0, 30)
      .map((p) => {
        const evalsDone = [
          p.evalNarasumberCompleted,
          p.evalOrganizerCompleted,
          p.evalUnderstandingCompleted,
          p.evalSkmCompleted,
        ].filter(Boolean).length;

        return {
          enrollmentId: String(p.enrollmentId),
          userId: String(p.userId),
          name: String(p.name || "Peserta"),
          nip: String(p.nip || "-"),
          instansiAsal: String(p.instansiAsal || "-"),
          attendancePercentage: Number(p.attendancePercentage || 0),
          attendedJp: Number(p.attendedJp || 0),
          evalsDoneCount: evalsDone,
          allEvaluationsCompleted: Boolean(p.allEvaluationsCompleted),
          status: String(p.status),
        };
      });

    // 9. Sebaran OPD
    const opdMap = new Map<string, { count: number; completed: number }>();
    for (const p of activeParticipants) {
      const opd = String(p.instansiAsal || "Lainnya / Umum");
      const current = opdMap.get(opd) || { count: 0, completed: 0 };
      current.count += 1;
      if (p.status === "completed" || certifiedEnrollmentIds.has(String(p.enrollmentId))) {
        current.completed += 1;
      }
      opdMap.set(opd, current);
    }

    const opdBreakdown = Array.from(opdMap.entries())
      .map(([name, data]) => ({
        name,
        participantCount: data.count,
        completedCount: data.completed,
        completionRatePct: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0,
      }))
      .sort((a, b) => b.participantCount - a.participantCount)
      .slice(0, 10);

    return {
      success: true,
      data: {
        course: {
          id: String(course.id),
          title: String(course.title),
          trainingType: String(course.trainingType || "elearning"),
          targetOpd: course.targetOpd ? String(course.targetOpd) : null,
          attendanceThreshold: threshold,
          totalClassJp,
          jp: Number(course.jp || 0),
          passingScore: Number(course.passingScore || 60),
          startDate: course.startDate ? String(course.startDate) : null,
          endDate: course.endDate ? String(course.endDate) : null,
          instructorName: course.instructorName ? String(course.instructorName) : null,
          category: course.category ? String(course.category) : null,
          deliveryMode: String(course.deliveryMode || "daring"),
          status: String(course.status),
        },
        summary: {
          totalEnrolled,
          totalPending,
          totalCompleted: certifiedCount,
          completionRate: totalEnrolled > 0 ? Math.round((certifiedCount / totalEnrolled) * 100) : 0,
          avgAttendancePct,
          avgQuizScore,
          evalCompletionRate: totalEnrolled > 0 ? Math.round((evalsCompletedCount / totalEnrolled) * 100) : 0,
        },
        funnel,
        sessionAttendance,
        gradeDistribution,
        kirkpatrickEvaluations,
        atRiskParticipants,
        opdBreakdown,
      },
    };
  } catch (err: unknown) {
    console.error("getCourseAnalytics error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memuat analitik kursus.",
    };
  }
}
