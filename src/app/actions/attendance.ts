"use server";

import crypto from "crypto";
import { sql } from "@/lib/db";
import { requireUserSession, requireInstructorSession } from "./auth";
import { revalidatePath } from "next/cache";
import { calculateAttendancePercentage, sanitizeParticipantNip } from "@/lib/classical-training";
import { issueCourseCertificate } from "@/lib/course-certificates";

interface SubmitAttendancePayload {
  courseId: string;
  lessonId: string;
  attendanceCode: string;
}

interface ConfirmParticipantDataPayload {
  courseId: string;
  profile: {
    name: string;
    nip: string;
    instansiAsal: string;
    jabatan: string;
    pangkat: string;
    phone: string;
  };
  statementAccepted: boolean;
}

/**
 * Mencatat presensi peserta per materi melalui scan QR code atau input token
 */
export async function submitMaterialAttendance(payload: SubmitAttendancePayload) {
  try {
    const session = await requireUserSession();
    const userId = session.user.id;
    const { courseId, lessonId, attendanceCode } = payload;

    if (!courseId || !lessonId || !attendanceCode) {
      return { success: false, error: "Data presensi tidak lengkap." };
    }

    // 1. Cek pendaftaran kursus
    const enrollmentRows = await sql`
      SELECT id, user_id, course_id, statement_accepted, attended_jp, attendance_percentage, completed_lessons, all_evaluations_completed
      FROM enrollments
      WHERE (course_id = ${courseId} OR id = ${courseId}) AND user_id = ${userId}
      LIMIT 1
    `;
    const enrollment = enrollmentRows[0];
    if (!enrollment) {
      return { success: false, error: "Anda belum terdaftar pada kelas ini." };
    }

    if (!enrollment.statement_accepted) {
      return {
        success: false,
        error: "Harap lakukan verifikasi data profil dan checklist pernyataan sebelum presensi.",
        requireStatement: true,
      };
    }

    // 2. Ambil data sesi materi
    const lessonRows = await sql`
      SELECT lesson.id, lesson.jp, lesson.has_attendance, lesson.attendance_qr_code, lesson.title,
             module.course_id AS "courseId"
      FROM lessons lesson
      JOIN modules module ON module.id = lesson.module_id
      WHERE lesson.id = ${lessonId} AND module.course_id = ${courseId}
      LIMIT 1
    `;
    const lesson = lessonRows[0];
    if (!lesson) {
      return { success: false, error: "Materi tidak ditemukan pada kelas ini." };
    }

    if (lesson.has_attendance === false) {
      return { success: false, error: "Materi ini tidak memerlukan presensi kehadiran." };
    }

    // 3. Verifikasi kode presensi
    // Support either raw code string or JSON encoded payload: { type: "material_attendance", code: "..." }
    let rawInputCode = attendanceCode.trim();
    if (rawInputCode.startsWith("{") && rawInputCode.endsWith("}")) {
      try {
        const parsed = JSON.parse(rawInputCode);
        if (parsed.code) {
          rawInputCode = String(parsed.code).trim();
        }
      } catch {
        // use raw string
      }
    }

    const expectedCode = String(lesson.attendance_qr_code || "").trim();
    if (!expectedCode || rawInputCode.toUpperCase() !== expectedCode.toUpperCase()) {
      return { success: false, error: "Kode QR presensi tidak sesuai dengan sesi ini." };
    }

    // 4. Periksa apakah sudah pernah presensi
    const existingAtt = await sql`
      SELECT id, jp, attended_at FROM material_attendances
      WHERE user_id = ${userId} AND lesson_id = ${lessonId}
      LIMIT 1
    `;
    const lessonJp = Math.max(0, Number(lesson.jp || 0));

    if (!existingAtt[0]) {
      const attId = `att_${crypto.randomUUID()}`;
      await sql`
        INSERT INTO material_attendances (id, enrollment_id, user_id, course_id, lesson_id, jp, attended_at)
        VALUES (${attId}, ${enrollment.id}, ${userId}, ${courseId}, ${lessonId}, ${lessonJp}, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, lesson_id) DO NOTHING
      `;
    }

    // 5. Hitung ulang total akumulasi JP yang dihadiri
    const attendedJpRows = await sql`
      SELECT COALESCE(SUM(jp), 0)::INTEGER AS "attendedJp"
      FROM material_attendances
      WHERE user_id = ${userId} AND course_id = ${courseId}
    `;
    const attendedJp = Number(attendedJpRows[0]?.attendedJp || 0);

    // Hitung total JP kelas dari materi yang mewajibkan presensi
    const totalJpRows = await sql`
      SELECT COALESCE(SUM(lesson.jp), 0)::INTEGER AS "totalJp"
      FROM lessons lesson
      JOIN modules module ON module.id = lesson.module_id
      WHERE module.course_id = ${courseId} AND lesson.has_attendance = TRUE
    `;
    let totalClassJp = Number(totalJpRows[0]?.totalJp || 0);
    if (totalClassJp === 0) {
      const courseRows = await sql`SELECT jp FROM courses WHERE id = ${courseId} LIMIT 1`;
      totalClassJp = Number(courseRows[0]?.jp || 0);
    }

    // Hitung persentase kehadiran: (attended JP / total class JP) * 100% (presisi 2 desimal, 0 JP aman)
    const attendancePercentage = calculateAttendancePercentage(attendedJp, totalClassJp);

    // Perbarui completed_lessons agar materi juga tercatat selesai
    let completedLessons: string[] = [];
    if (enrollment.completed_lessons) {
      try {
        const parsed = typeof enrollment.completed_lessons === "string"
          ? JSON.parse(enrollment.completed_lessons)
          : enrollment.completed_lessons;
        completedLessons = Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        completedLessons = [];
      }
    }
    if (!completedLessons.includes(lessonId)) {
      completedLessons.push(lessonId);
    }

    const isAttendanceSufficient = attendancePercentage >= 80;
    const canCompleteEnrollment = isAttendanceSufficient && Boolean(enrollment.all_evaluations_completed);

    await sql`
      UPDATE enrollments
      SET attended_jp = ${attendedJp},
          attendance_percentage = ${attendancePercentage},
          completed_lessons = ${JSON.stringify(completedLessons)},
          status = CASE WHEN ${canCompleteEnrollment} THEN 'completed' ELSE status END,
          completed_at = CASE WHEN ${canCompleteEnrollment} THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE completed_at END
      WHERE id = ${enrollment.id}
    `;

    if (canCompleteEnrollment) {
      try {
        await issueCourseCertificate(userId, courseId);
      } catch (certErr) {
        console.warn("Auto-issue certificate on attendance threshold met skipped:", certErr);
      }
    }

    revalidatePath(`/learn/${courseId}`);
    revalidatePath(`/dashboard/courses/${courseId}/progress`);

    return {
      success: true,
      message: `Presensi berhasil dicatat! (+${lessonJp} JP)`,
      attendedJp,
      totalClassJp,
      attendancePercentage,
      alreadyAttended: Boolean(existingAtt[0]),
    };
  } catch (err: unknown) {
    console.error("submitMaterialAttendance error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat mencatat presensi.",
    };
  }
}

/**
 * Mengambil daftar sesi materi yang sudah dihadiri oleh peserta
 */
export async function getMaterialAttendances(courseId: string) {
  try {
    const session = await requireUserSession();
    const userId = session.user.id;

    const rows = await sql`
      SELECT lesson_id AS "lessonId", jp, attended_at AS "attendedAt"
      FROM material_attendances
      WHERE user_id = ${userId} AND course_id = ${courseId}
      ORDER BY attended_at ASC
    `;

    const attendedLessonIds = rows.map((r) => String(r.lessonId));
    const totalAttendedJp = rows.reduce((sum, r) => sum + Number(r.jp || 0), 0);

    return {
      success: true,
      attendances: rows,
      attendedLessonIds,
      totalAttendedJp,
    };
  } catch (err: unknown) {
    console.error("getMaterialAttendances error:", err);
    return { success: false, attendances: [], attendedLessonIds: [], totalAttendedJp: 0 };
  }
}

/**
 * Konfirmasi kebenaran data profil peserta sebelum masuk kelas pelatihan klasikal
 */
export async function confirmParticipantData(payload: ConfirmParticipantDataPayload) {
  try {
    const session = await requireUserSession();
    const userId = session.user.id;
    const { courseId, profile, statementAccepted } = payload;

    if (!statementAccepted) {
      return {
        success: false,
        error: "Anda wajib mencentang checklist pernyataan kebenaran data.",
      };
    }

    if (!profile.name?.trim() || !profile.nip?.trim() || !profile.instansiAsal?.trim()) {
      return {
        success: false,
        error: "Nama lengkap, NIP/NIK, dan Instansi/OPD wajib diisi.",
      };
    }

    const cleanNip = sanitizeParticipantNip(profile.nip);
    if (cleanNip.length < 16) {
      return {
        success: false,
        error: "NIP/NIK minimal 16 digit.",
      };
    }

    const cleanPhone = (profile.phone || "").replace(/[^\d+]/g, "");

    // 1. Update data pada tabel users
    await sql`
      UPDATE users
      SET name = ${profile.name.trim()},
          nip = ${cleanNip},
          instansi_asal = ${profile.instansiAsal.trim()},
          jabatan = ${profile.jabatan?.trim() || null},
          pangkat = ${profile.pangkat?.trim() || null},
          phone = ${cleanPhone || null},
          profile_verified_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `;

    // 2. Update status checklist pernyataan pada pendaftaran kelas
    await sql`
      UPDATE enrollments
      SET statement_accepted = TRUE,
          statement_accepted_at = CURRENT_TIMESTAMP
      WHERE (course_id = ${courseId} OR id = ${courseId}) AND user_id = ${userId}
    `;

    revalidatePath(`/learn/${courseId}`);
    revalidatePath(`/dashboard/courses/${courseId}/progress`);

    return { success: true, message: "Data profil berhasil diverifikasi dan dikonfirmasi." };
  } catch (err: unknown) {
    console.error("confirmParticipantData error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengonfirmasi data profil.",
    };
  }
}

/**
 * Mengambil daftar nama instansi/OPD unik dari database untuk pilihan standar peserta
 */
export async function getDistinctInstansiList(): Promise<string[]> {
  try {
    const rows = await sql`
      SELECT DISTINCT TRIM(instansi_asal) AS name
      FROM users
      WHERE instansi_asal IS NOT NULL
        AND TRIM(instansi_asal) != ''
        AND LENGTH(TRIM(instansi_asal)) >= 3
      ORDER BY name ASC
      LIMIT 300
    `;
    return rows.map((r) => String(r.name));
  } catch (err) {
    console.error("getDistinctInstansiList error:", err);
    return [];
  }
}

let ensuredOverrideCols = false;
async function ensureAttendanceOverrideColumns() {
  if (ensuredOverrideCols) return;
  await sql`ALTER TABLE material_attendances ADD COLUMN IF NOT EXISTS override_note TEXT`;
  await sql`ALTER TABLE material_attendances ADD COLUMN IF NOT EXISTS override_by TEXT`;
  ensuredOverrideCols = true;
}

/**
 * Manual override presensi peserta oleh Admin / Instruktur dengan catatan wajib
 */
export async function adminOverrideAttendance(payload: {
  courseId: string;
  userId: string;
  lessonId: string;
  markPresent: boolean;
  note: string;
}) {
  try {
    const session = await requireInstructorSession();
    const isAdmin = session.user.role === "admin";
    const { courseId, userId, lessonId, markPresent, note } = payload;

    const cleanNote = (note || "").trim();
    if (cleanNote.length < 3) {
      return { success: false, error: "Catatan override wajib diisi (minimal 3 karakter)." };
    }

    const courseRows = await sql`
      SELECT id, instructor_id AS "instructorId", jp, attendance_threshold AS "attendanceThreshold"
      FROM courses WHERE id = ${courseId} LIMIT 1
    `;
    const course = courseRows[0];
    if (!course) return { success: false, error: "Kelas tidak ditemukan." };
    if (!isAdmin && String(course.instructorId || "") !== session.user.id) {
      return { success: false, error: "Anda tidak memiliki akses ke kelas ini." };
    }

    const lessonRows = await sql`
      SELECT l.id, l.jp
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE l.id = ${lessonId} AND m.course_id = ${courseId}
      LIMIT 1
    `;
    const lesson = lessonRows[0];
    if (!lesson) return { success: false, error: "Sesi materi tidak ditemukan pada kelas ini." };

    await ensureAttendanceOverrideColumns();
    const actorLabel = session.user.name || session.user.email || session.user.id;
    const lessonJp = Number(lesson.jp || 2);

    if (markPresent) {
      const attId = `att_${crypto.randomUUID()}`;
      await sql`
        INSERT INTO material_attendances (id, user_id, course_id, lesson_id, jp, qr_code_used, attended_at, override_note, override_by)
        VALUES (${attId}, ${userId}, ${courseId}, ${lessonId}, ${lessonJp}, 'ADMIN_OVERRIDE', CURRENT_TIMESTAMP, ${cleanNote}, ${actorLabel})
        ON CONFLICT (user_id, lesson_id)
        DO UPDATE SET
          jp = EXCLUDED.jp,
          qr_code_used = 'ADMIN_OVERRIDE',
          attended_at = CURRENT_TIMESTAMP,
          override_note = EXCLUDED.override_note,
          override_by = EXCLUDED.override_by
      `;
    } else {
      await sql`
        DELETE FROM material_attendances
        WHERE user_id = ${userId} AND lesson_id = ${lessonId} AND course_id = ${courseId}
      `;
    }

    // Recalculate total attended JP & percentage on enrollment
    const [attSumRows, totalJpRows, enrollmentRows] = await Promise.all([
      sql`
        SELECT COALESCE(SUM(jp), 0) AS total_jp
        FROM material_attendances
        WHERE user_id = ${userId} AND course_id = ${courseId}
      `,
      sql`
        SELECT COALESCE(SUM(l.jp), 0) AS total_class_jp
        FROM lessons l
        JOIN modules m ON m.id = l.module_id
        WHERE m.course_id = ${courseId} AND l.has_attendance = TRUE
      `,
      sql`
        SELECT id, completed_lessons, all_evaluations_completed
        FROM enrollments
        WHERE user_id = ${userId} AND course_id = ${courseId}
        LIMIT 1
      `,
    ]);

    const attendedJp = Number(attSumRows[0]?.total_jp || 0);
    const computedClassJp = Number(totalJpRows[0]?.total_class_jp || 0);
    const totalClassJp = computedClassJp > 0 ? computedClassJp : Number(course.jp || 0);
    const attendancePercentage = calculateAttendancePercentage(attendedJp, totalClassJp);

    const enrollment = enrollmentRows[0];
    if (enrollment) {
      let existingCompleted: string[] = [];
      try {
        existingCompleted = Array.isArray(enrollment.completed_lessons)
          ? enrollment.completed_lessons
          : JSON.parse(String(enrollment.completed_lessons || "[]"));
      } catch {
        existingCompleted = [];
      }

      const updatedSet = new Set(existingCompleted.map(String));
      if (markPresent) updatedSet.add(lessonId);
      else updatedSet.delete(lessonId);

      const threshold = Number(course.attendanceThreshold ?? 80);
      const canComplete = attendancePercentage >= threshold && Boolean(enrollment.all_evaluations_completed);

      await sql`
        UPDATE enrollments
        SET attended_jp = ${attendedJp},
            attendance_percentage = ${attendancePercentage},
            completed_lessons = ${JSON.stringify(Array.from(updatedSet))},
            status = CASE WHEN ${canComplete} THEN 'completed' ELSE status END
        WHERE id = ${enrollment.id}
      `;
    }

    revalidatePath(`/admin/courses/${courseId}/attendance`);
    revalidatePath(`/learn/${courseId}`);
    return {
      success: true,
      message: markPresent
        ? "Presensi peserta berhasil ditandai hadir (Manual Override)."
        : "Status kehadiran peserta berhasil dibatalkan.",
    };
  } catch (err: unknown) {
    console.error("adminOverrideAttendance error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal melakukan override presensi.",
    };
  }
}

/**
 * Mengambil data monitoring presensi live untuk menu Admin / Penyelenggara
 */
export async function getCourseAttendanceLive(courseId: string) {
  try {
    const session = await requireInstructorSession();
    const isAdmin = session.user.role === "admin";
    await ensureAttendanceOverrideColumns();

    const courseRows = await sql`
      SELECT id, title, instructor_id AS "instructorId", training_type AS "trainingType",
             target_opd AS "targetOpd", attendance_threshold AS "attendanceThreshold", jp
      FROM courses
      WHERE id = ${courseId}
      LIMIT 1
    `;
    const course = courseRows[0];
    if (!course) {
      return { success: false, error: "Kelas tidak ditemukan." };
    }
    if (!isAdmin && String(course.instructorId || "") !== session.user.id) {
      return { success: false, error: "Anda tidak memiliki akses ke kelas ini." };
    }

    const [lessonRows, participantRows, attendanceRows, evaluationRows] = await Promise.all([
      sql`
        SELECT l.id, l.title, l.jp, l.has_attendance AS "hasAttendance",
               l.attendance_qr_code AS "attendanceQrCode", l.narasumber_name AS "speakerName",
               m.title AS "moduleTitle"
        FROM lessons l
        JOIN modules m ON m.id = l.module_id
        WHERE m.course_id = ${courseId}
        ORDER BY m."order" ASC, l."order" ASC
      `,
      sql`
        SELECT e.id AS "enrollmentId", e.user_id AS "userId", e.attended_jp AS "attendedJp",
               e.attendance_percentage AS "attendancePercentage",
               e.statement_accepted AS "statementAccepted",
               e.all_evaluations_completed AS "allEvaluationsCompleted",
               e.status, e.enrolled_at AS "enrolledAt",
               u.name, u.nip, u.instansi_asal AS "instansiAsal"
        FROM enrollments e
        JOIN users u ON u.id = e.user_id
        WHERE e.course_id = ${courseId}
        ORDER BY u.name ASC
      `,
      sql`
        SELECT user_id AS "userId", lesson_id AS "lessonId", jp, attended_at AS "attendedAt",
               override_note AS "overrideNote", override_by AS "overrideBy"
        FROM material_attendances
        WHERE course_id = ${courseId}
        ORDER BY attended_at DESC
      `,
      sql`
        SELECT user_id AS "userId", stage, session_id AS "sessionId", score, answers, created_at AS "createdAt"
        FROM training_evaluations
        WHERE course_id = ${courseId}
        ORDER BY created_at ASC
      `,
    ]);

    const attendanceLessons = lessonRows.filter((l) => l.hasAttendance !== false);
    const computedJp = attendanceLessons.reduce((acc, l) => acc + Math.max(0, Number(l.jp || 0)), 0);
    const totalClassJp = computedJp > 0 ? computedJp : Number(course.jp || 0);

    return {
      success: true,
      fetchedAt: new Date().toISOString(),
      course: {
        id: String(course.id),
        title: String(course.title || ""),
        trainingType: String(course.trainingType || "elearning"),
        targetOpd: course.targetOpd ? String(course.targetOpd) : null,
        attendanceThreshold: Number(course.attendanceThreshold ?? 80),
        totalClassJp,
      },
      sessions: attendanceLessons.map((l) => ({
        id: String(l.id),
        title: String(l.title || ""),
        moduleTitle: String(l.moduleTitle || ""),
        jp: Number(l.jp || 0),
        qrCode: l.attendanceQrCode ? String(l.attendanceQrCode) : null,
        speakerName: l.speakerName ? String(l.speakerName) : null,
      })),
      participants: participantRows.map((p) => {
        const userAtts = attendanceRows.filter((a) => String(a.userId) === String(p.userId));
        const attendedJp = userAtts.reduce((sum, a) => sum + Number(a.jp || 0), 0);
        const attendancePercentage = calculateAttendancePercentage(attendedJp, totalClassJp);
        return {
          enrollmentId: String(p.enrollmentId),
          userId: String(p.userId),
          name: String(p.name || ""),
          nip: p.nip ? String(p.nip) : "-",
          instansiAsal: p.instansiAsal ? String(p.instansiAsal) : "-",
          attendedJp,
          attendancePercentage,
          statementAccepted: Boolean(p.statementAccepted),
          allEvaluationsCompleted: Boolean(p.allEvaluationsCompleted),
          status: String(p.status || "in_progress"),
          attendances: userAtts.map((a) => ({
            lessonId: String(a.lessonId),
            jp: Number(a.jp || 0),
            attendedAt: new Date(String(a.attendedAt)).toISOString(),
            overrideNote: a.overrideNote ? String(a.overrideNote) : null,
            overrideBy: a.overrideBy ? String(a.overrideBy) : null,
          })),
          evaluations: evaluationRows
            .filter((ev) => String(ev.userId) === String(p.userId))
            .map((ev) => {
              const ansObj = (ev.answers && typeof ev.answers === "object" ? ev.answers : {}) as Record<string, unknown>;
              return {
                stage: String(ev.stage || ""),
                sessionId: ev.sessionId ? String(ev.sessionId) : null,
                score: ev.score != null ? Number(ev.score) : null,
                notes: typeof ansObj.notes === "string" ? ansObj.notes : null,
                createdAt: new Date(String(ev.createdAt)).toISOString(),
              };
            }),
        };
      }),
    };
  } catch (err: unknown) {
    console.error("getCourseAttendanceLive error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memuat data presensi live.",
    };
  }
}
