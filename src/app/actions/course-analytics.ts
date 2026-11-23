"use server";

import { sql } from "@/lib/db";
import { requireInstructorSession } from "./auth";
import { calculateAttendancePercentage } from "@/lib/classical-training";
import { verifyCourseStaffAccess } from "@/lib/admin-guard";

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
  allOpdBreakdown: Array<{
    name: string;
    participantCount: number;
    completedCount: number;
    completionRatePct: number;
  }>;
  quizzes: Array<{
    lessonId: string;
    title: string;
    moduleTitle: string;
    order: number;
  }>;
  allSessions: Array<{
    lessonId: string;
    title: string;
    moduleTitle: string;
    type: string;
    order: number;
    jp: number;
    hasAttendance: boolean;
    narasumberName: string | null;
    sessionDate: string | null;
    attendedCount: number;
    attendanceRatePct: number;
  }>;
  participantsDetail: Array<{
    enrollmentId: string;
    userId: string;
    name: string;
    nip: string;
    pangkat: string;
    jabatan: string;
    instansiAsal: string;
    email: string;
    phone: string;
    status: string;
    enrolledAt: string | null;
    completedAt: string | null;
    progress: number;
    attendedJp: number;
    attendancePercentage: number;
    attendedSessionCount: number;
    totalAttendanceSessions: number;
    quizScores: Record<string, { bestScore: number; latestScore: number; attempts: number; passed: boolean }>;
    avgQuizScore: number | null;
    bestQuizScore: number | null;
    totalQuizAttempts: number;
    quizzesPassedCount: number;
    evalNarasumberCompleted: boolean;
    evalOrganizerCompleted: boolean;
    evalUnderstandingCompleted: boolean;
    evalSkmCompleted: boolean;
    evalsDoneCount: number;
    allEvaluationsCompleted: boolean;
    certificateNumber: string | null;
    certificateIssuedAt: string | null;
  }>;
  detailedQuizAttempts: Array<{
    attemptId: string;
    userId: string;
    participantName: string;
    nip: string;
    instansiAsal: string;
    lessonId: string;
    quizTitle: string;
    moduleTitle: string;
    score: number;
    passed: boolean;
    createdAt: string;
  }>;
  detailedAttendances: Array<{
    userId: string;
    lessonId: string;
    attendedAt: string | null;
    overrideNote: string | null;
    overrideBy: string | null;
  }>;
  detailedEvaluations: Array<{
    userId: string;
    participantName: string;
    nip: string;
    instansiAsal: string;
    stage: string;
    sessionId: string | null;
    sessionTitle: string | null;
    score: number | null;
    notes: string | null;
    createdAt: string | null;
  }>;
}

export async function getCourseAnalytics(courseId: string): Promise<{ success: boolean; data?: CourseAnalyticsData; error?: string }> {
  try {
    const auth = await verifyCourseStaffAccess(courseId);
    if (!auth.authorized) {
      return { success: false, error: "Anda tidak memiliki wewenang mengakses analitik kursus ini." };
    }
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

    // 2. Ambil Seluruh Sesi / Materi (termasuk Kuis, Narasumber, Tanggal Sesi)
    const sessionRows = await sql`
      SELECT l.id, l.title, l.type, l.jp, l.has_attendance AS "hasAttendance",
             l.narasumber_name AS "narasumberName",
             TO_CHAR(l.session_date::date, 'YYYY-MM-DD') AS "sessionDate",
             l."order" AS "lessonOrder", m.title AS "moduleTitle", m."order" AS "moduleOrder"
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE m.course_id = ${courseId}
      ORDER BY m."order" ASC, l."order" ASC
    `;

    const attendanceSessions = sessionRows.filter((s) => s.hasAttendance !== false && Number(s.jp || 0) > 0);
    const totalClassJp = sessionRows.reduce((acc, s) => acc + Math.max(0, Number(s.jp || 0)), 0);
    const quizLessons = sessionRows
      .filter((s) => String(s.type) === "quiz")
      .map((s, idx) => ({
        lessonId: String(s.id),
        title: String(s.title || `Kuis ${idx + 1}`),
        moduleTitle: String(s.moduleTitle || "Modul"),
        order: Number(s.lessonOrder || idx + 1),
      }));

    // 3. Ambil Seluruh Peserta Terdaftar beserta Detail Profil & Tanggal
    const participantRows = await sql`
      SELECT e.id AS "enrollmentId", e.user_id AS "userId", e.status, e.progress,
             e.enrolled_at AS "enrolledAt", e.completed_at AS "completedAt",
             e.attended_jp AS "attendedJp", e.attendance_percentage AS "attendancePercentage",
             e.all_evaluations_completed AS "allEvaluationsCompleted",
             e.eval_narasumber_completed AS "evalNarasumberCompleted",
             e.eval_organizer_completed AS "evalOrganizerCompleted",
             e.eval_understanding_completed AS "evalUnderstandingCompleted",
             e.eval_skm_completed AS "evalSkmCompleted",
             u.name, COALESCE(u.nip, '') AS nip,
             COALESCE(u.pangkat, '') AS pangkat,
             COALESCE(u.jabatan, '') AS jabatan,
             COALESCE(u.email, '') AS email,
             COALESCE(u.phone, '') AS phone,
             COALESCE(u.instansi_asal, 'Lainnya / Umum') AS "instansiAsal"
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      WHERE e.course_id = ${courseId}
      ORDER BY u.name ASC
    `;

    const activeParticipants = participantRows.filter((p) => p.status === "active" || p.status === "completed");
    const totalEnrolled = activeParticipants.length;
    const totalPending = participantRows.filter((p) => p.status === "pending_approval").length;
    const threshold = Number(course.attendanceThreshold || 80);

    // Hitung rata-rata kehadiran
    const totalAttPctSum = activeParticipants.reduce((sum, p) => sum + Number(p.attendancePercentage || 0), 0);
    const avgAttendancePct = totalEnrolled > 0 ? Math.round(totalAttPctSum / totalEnrolled) : 0;

    // 4. Hitung Funnel Kelulusan
    const attendedSufficientCount = activeParticipants.filter((p) => Number(p.attendancePercentage || 0) >= threshold).length;
    const evalsCompletedCount = activeParticipants.filter((p) => Boolean(p.allEvaluationsCompleted)).length;

    // Ambil data seluruh percobaan kuis beserta ID & waktu
    const lessonIds = sessionRows.map((s) => String(s.id));
    let quizAttempts: Array<{
      id: string;
      userId: string;
      score: number;
      passed: boolean;
      lessonId: string;
      createdAt: string;
    }> = [];
    if (lessonIds.length > 0) {
      const attempts = await sql`
        SELECT id, user_id AS "userId", score, passed, lesson_id AS "lessonId", created_at AS "createdAt"
        FROM quiz_attempts
        WHERE lesson_id = ANY(${lessonIds})
        ORDER BY created_at DESC
      `;
      quizAttempts = attempts.map((a) => ({
        id: String(a.id),
        userId: String(a.userId),
        score: Number(a.score || 0),
        passed: Boolean(a.passed),
        lessonId: String(a.lessonId),
        createdAt: a.createdAt ? new Date(String(a.createdAt)).toISOString() : "",
      }));
    }

    const quizPassedUsers = new Set(quizAttempts.filter((a) => a.passed).map((a) => a.userId));
    const quizPassedCount = course.trainingType === "classical_facilitation"
      ? attendedSufficientCount // pada klasikal, kelulusan materi berbasis presensi
      : activeParticipants.filter((p) => quizPassedUsers.has(String(p.userId)) || (p.progress || 0) >= 100).length;

    // Data Sertifikat Terbit (beserta nomor & tanggal terbit)
    const issuedCertificates = await sql`
      SELECT enrollment_id AS "enrollmentId", certificate_number AS "certificateNumber", issued_at AS "issuedAt"
      FROM issued_course_certificates
      WHERE course_id = ${courseId} AND revoked_at IS NULL
    `;
    const certMap = new Map<string, { certificateNumber: string; issuedAt: string | null }>();
    for (const c of issuedCertificates) {
      certMap.set(String(c.enrollmentId), {
        certificateNumber: String(c.certificateNumber),
        issuedAt: c.issuedAt ? new Date(String(c.issuedAt)).toISOString() : null,
      });
    }
    const certifiedEnrollmentIds = new Set(certMap.keys());
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

    // 7. Kirkpatrick L1 Evaluation Score Aggregation + Detail Evaluasi & Catatan
    const evaluationRecords = await sql`
      SELECT user_id AS "userId", stage, session_id AS "sessionId", answers, score, created_at AS "createdAt"
      FROM training_evaluations
      WHERE enrollment_id IN (
        SELECT id FROM enrollments WHERE course_id = ${courseId}
      )
      ORDER BY created_at DESC
    `;

    const evalScoresByStage = {
      narasumber: [] as number[],
      organizer: [] as number[],
      understanding: [] as number[],
      skm: [] as number[],
    };

    for (const record of evaluationRecords) {
      if (record.score == null) continue;
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
      totalEvaluations: evaluationRecords.filter((r) => r.score != null).length,
    };

    // 8. Peserta At-Risk (Perlu Perhatian)
    const atRiskParticipants = activeParticipants
      .filter((p) => {
        const attInsufficient = Number(p.attendancePercentage || 0) < threshold;
        const evalsIncomplete = !p.allEvaluationsCompleted;
        return attInsufficient || evalsIncomplete;
      })
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

    // 9. Sebaran OPD (lengkap untuk Excel, top 10 untuk grafik UI)
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

    const allOpdBreakdown = Array.from(opdMap.entries())
      .map(([name, data]) => ({
        name,
        participantCount: data.count,
        completedCount: data.completed,
        completionRatePct: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0,
      }))
      .sort((a, b) => b.participantCount - a.participantCount);
    const opdBreakdown = allOpdBreakdown.slice(0, 10);

    // 10. Detail Presensi Sesi, Nilai Kuis per Peserta, & Evaluasi Lengkap untuk UI & Ekspor Excel Super Detail
    const attendanceDetailRows = await sql`
      SELECT user_id AS "userId", lesson_id AS "lessonId",
             attended_at AS "attendedAt", override_note AS "overrideNote", override_by AS "overrideBy"
      FROM material_attendances
      WHERE course_id = ${courseId}
    `;
    const detailedAttendances = attendanceDetailRows.map((a) => ({
      userId: String(a.userId),
      lessonId: String(a.lessonId),
      attendedAt: a.attendedAt ? new Date(String(a.attendedAt)).toISOString() : null,
      overrideNote: a.overrideNote ? String(a.overrideNote) : null,
      overrideBy: a.overrideBy ? String(a.overrideBy) : null,
    }));

    const attendedSessionsByUser = new Map<string, Set<string>>();
    for (const a of detailedAttendances) {
      const set = attendedSessionsByUser.get(a.userId) || new Set<string>();
      set.add(a.lessonId);
      attendedSessionsByUser.set(a.userId, set);
    }

    const sessionById = new Map<string, { title: string; moduleTitle: string }>();
    for (const s of sessionRows) {
      sessionById.set(String(s.id), {
        title: String(s.title || "Sesi"),
        moduleTitle: String(s.moduleTitle || "Modul"),
      });
    }

    const userById = new Map<string, { name: string; nip: string; instansiAsal: string }>();
    for (const p of participantRows) {
      userById.set(String(p.userId), {
        name: String(p.name || "Peserta"),
        nip: String(p.nip || "-"),
        instansiAsal: String(p.instansiAsal || "-"),
      });
    }

    // Group quiz attempts by userId -> lessonId
    const quizAttemptsByUser = new Map<string, typeof quizAttempts>();
    for (const a of quizAttempts) {
      const list = quizAttemptsByUser.get(a.userId) || [];
      list.push(a);
      quizAttemptsByUser.set(a.userId, list);
    }

    const participantsDetail = activeParticipants.map((p) => {
      const userId = String(p.userId);
      const enrollmentId = String(p.enrollmentId);
      const userAttempts = quizAttemptsByUser.get(userId) || [];

      const quizScores: Record<string, { bestScore: number; latestScore: number; attempts: number; passed: boolean }> = {};
      for (const a of userAttempts) {
        const cur = quizScores[a.lessonId];
        if (!cur) {
          quizScores[a.lessonId] = {
            bestScore: a.score,
            latestScore: a.score, // ordered DESC
            attempts: 1,
            passed: a.passed,
          };
        } else {
          cur.bestScore = Math.max(cur.bestScore, a.score);
          cur.attempts += 1;
          cur.passed = cur.passed || a.passed;
        }
      }

      const quizValues = Object.values(quizScores);
      const avgUserQuiz = quizValues.length > 0
        ? Math.round(quizValues.reduce((sum, q) => sum + q.bestScore, 0) / quizValues.length)
        : null;
      const bestUserQuiz = quizValues.length > 0
        ? Math.max(...quizValues.map((q) => q.bestScore))
        : null;
      const quizzesPassedCount = quizValues.filter((q) => q.passed).length;

      const evalsDone = [
        p.evalNarasumberCompleted,
        p.evalOrganizerCompleted,
        p.evalUnderstandingCompleted,
        p.evalSkmCompleted,
      ].filter(Boolean).length;

      const cert = certMap.get(enrollmentId);
      const attendedSet = attendedSessionsByUser.get(userId);

      return {
        enrollmentId,
        userId,
        name: String(p.name || "Peserta"),
        nip: String(p.nip || "-"),
        pangkat: String(p.pangkat || "-"),
        jabatan: String(p.jabatan || "-"),
        instansiAsal: String(p.instansiAsal || "-"),
        email: String(p.email || "-"),
        phone: String(p.phone || "-"),
        status: String(p.status),
        enrolledAt: p.enrolledAt ? new Date(String(p.enrolledAt)).toISOString() : null,
        completedAt: p.completedAt ? new Date(String(p.completedAt)).toISOString() : null,
        progress: Number(p.progress || 0),
        attendedJp: Number(p.attendedJp || 0),
        attendancePercentage: Number(p.attendancePercentage || 0),
        attendedSessionCount: attendedSet ? attendedSet.size : 0,
        totalAttendanceSessions: attendanceSessions.length,
        quizScores,
        avgQuizScore: avgUserQuiz,
        bestQuizScore: bestUserQuiz,
        totalQuizAttempts: userAttempts.length,
        quizzesPassedCount,
        evalNarasumberCompleted: Boolean(p.evalNarasumberCompleted),
        evalOrganizerCompleted: Boolean(p.evalOrganizerCompleted),
        evalUnderstandingCompleted: Boolean(p.evalUnderstandingCompleted),
        evalSkmCompleted: Boolean(p.evalSkmCompleted),
        evalsDoneCount: evalsDone,
        allEvaluationsCompleted: Boolean(p.allEvaluationsCompleted),
        certificateNumber: cert?.certificateNumber || null,
        certificateIssuedAt: cert?.issuedAt || null,
      };
    });

    const detailedQuizAttempts = quizAttempts.map((a) => {
      const u = userById.get(a.userId);
      const q = sessionById.get(a.lessonId);
      return {
        attemptId: a.id,
        userId: a.userId,
        participantName: u?.name || "Peserta",
        nip: u?.nip || "-",
        instansiAsal: u?.instansiAsal || "-",
        lessonId: a.lessonId,
        quizTitle: q?.title || "Kuis",
        moduleTitle: q?.moduleTitle || "Modul",
        score: a.score,
        passed: a.passed,
        createdAt: a.createdAt,
      };
    });

    const allSessions = sessionRows.map((s, index) => {
      const attended = sessionAttendanceMap.get(String(s.id)) || 0;
      const hasAtt = s.hasAttendance !== false && Number(s.jp || 0) > 0;
      return {
        lessonId: String(s.id),
        title: String(s.title || `Materi ${index + 1}`),
        moduleTitle: String(s.moduleTitle || "Modul"),
        type: String(s.type || "reading"),
        order: Number(s.lessonOrder || index + 1),
        jp: Number(s.jp || 0),
        hasAttendance: hasAtt,
        narasumberName: s.narasumberName ? String(s.narasumberName) : null,
        sessionDate: s.sessionDate ? String(s.sessionDate) : null,
        attendedCount: hasAtt ? attended : 0,
        attendanceRatePct: hasAtt && totalEnrolled > 0 ? Math.round((attended / totalEnrolled) * 100) : 0,
      };
    });

    const extractEvalNotes = (rawAnswers: unknown): string | null => {
      if (!rawAnswers || typeof rawAnswers !== "object") return null;
      const ans = rawAnswers as Record<string, unknown>;
      const noteKeys = ["notes", "note", "comment", "comments", "feedback", "saran", "masukan", "catatan", "apresiasi"];
      const parts: string[] = [];
      for (const [k, v] of Object.entries(ans)) {
        if (typeof v === "string" && v.trim() && (noteKeys.some((nk) => k.toLowerCase().includes(nk)) || v.trim().length > 15)) {
          parts.push(v.trim());
        }
      }
      return parts.length > 0 ? parts.join(" | ") : null;
    };

    const detailedEvaluations = evaluationRecords.map((r) => {
      const u = userById.get(String(r.userId));
      const sid = r.sessionId ? String(r.sessionId) : null;
      const sess = sid ? sessionById.get(sid) : null;
      return {
        userId: String(r.userId),
        participantName: u?.name || "Peserta",
        nip: u?.nip || "-",
        instansiAsal: u?.instansiAsal || "-",
        stage: String(r.stage),
        sessionId: sid,
        sessionTitle: sess?.title || null,
        score: r.score != null ? Number(r.score) : null,
        notes: extractEvalNotes(r.answers),
        createdAt: r.createdAt ? new Date(String(r.createdAt)).toISOString() : null,
      };
    });

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
        allOpdBreakdown,
        quizzes: quizLessons,
        allSessions,
        participantsDetail,
        detailedQuizAttempts,
        detailedAttendances,
        detailedEvaluations,
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
