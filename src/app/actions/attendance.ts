"use server";

import crypto from "crypto";
import { sql } from "@/lib/db";
import { requireUserSession, requireInstructorSession, getAuthSession } from "./auth";
import { revalidatePath } from "next/cache";
import { calculateAttendancePercentage, sanitizeParticipantNip } from "@/lib/classical-training";
import { issueCourseCertificate } from "@/lib/course-certificates";
import { hashPassword } from "@/lib/password";

interface SubmitAttendancePayload {
  courseId: string;
  lessonId?: string;
  attendanceCode: string;
  autoAcceptStatement?: boolean;
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
    let { courseId, attendanceCode, autoAcceptStatement } = payload;

    if (!attendanceCode?.trim()) {
      return { success: false, error: "Data presensi tidak lengkap." };
    }

    // Parse URL QR payload if present (e.g. https://domain.com/attendance/scan?courseId=...&lessonId=...&code=...)
    let rawInputCode = attendanceCode.trim();
    let targetLessonId = (payload.lessonId || "").trim();
    let targetCourseId = (courseId || "").trim();

    if (rawInputCode.includes("/attendance/scan") || rawInputCode.startsWith("http://") || rawInputCode.startsWith("https://")) {
      try {
        const urlObj = new URL(rawInputCode);
        const qCode = urlObj.searchParams.get("code");
        const qLessonId = urlObj.searchParams.get("lessonId");
        const qCourseId = urlObj.searchParams.get("courseId");
        if (qCode) rawInputCode = qCode.trim();
        if (qLessonId && !targetLessonId) targetLessonId = qLessonId.trim();
        if (qCourseId && !targetCourseId) targetCourseId = qCourseId.trim();
      } catch {
        const codeMatch = rawInputCode.match(/[?&]code=([^&]+)/);
        const lessonMatch = rawInputCode.match(/[?&]lessonId=([^&]+)/);
        const courseMatch = rawInputCode.match(/[?&]courseId=([^&]+)/);
        if (codeMatch) rawInputCode = decodeURIComponent(codeMatch[1]).trim();
        if (lessonMatch && !targetLessonId) targetLessonId = decodeURIComponent(lessonMatch[1]).trim();
        if (courseMatch && !targetCourseId) targetCourseId = decodeURIComponent(courseMatch[1]).trim();
      }
    }

    // Parse JSON QR payload if present
    if (rawInputCode.startsWith("{") && rawInputCode.endsWith("}")) {
      try {
        const parsed = JSON.parse(rawInputCode);
        if (parsed.code) rawInputCode = String(parsed.code).trim();
        if (parsed.lessonId && !targetLessonId) targetLessonId = String(parsed.lessonId).trim();
        if (parsed.courseId && !targetCourseId) targetCourseId = String(parsed.courseId).trim();
      } catch {
        // use raw string
      }
    }

    if (!targetCourseId) {
      return { success: false, error: "ID Pelatihan tidak ditemukan." };
    }
    courseId = targetCourseId;

    // 1. Cek pendaftaran kursus
    const enrollmentRows = await sql`
      SELECT id, user_id, course_id, statement_accepted, attended_jp, attendance_percentage, completed_lessons, all_evaluations_completed
      FROM enrollments
      WHERE (course_id = ${courseId} OR id = ${courseId}) AND user_id = ${userId}
      LIMIT 1
    `;
    let enrollment = enrollmentRows[0];

    // Jika peserta belum terdaftar di kelas (misal ASN langsung scan QR di ruangan), daftarkan otomatis (zero friction)
    if (!enrollment) {
      const courseCheck = await sql`
        SELECT id, title, category, jp, status
        FROM courses
        WHERE id = ${courseId}
           OR id = ${'course_' + courseId}
           OR id = ${courseId.replace(/^course_/, '')}
        LIMIT 1
      `;
      if (!courseCheck[0]) {
        return { success: false, error: "Kelas pelatihan tidak ditemukan." };
      }
      const actualCourse = courseCheck[0];
      const actualCourseId = String(actualCourse.id);
      const newEnrId = `enr_${crypto.randomUUID()}`;
      await sql`
        INSERT INTO enrollments (id, user_id, course_id, title, category, jp, status, enrolled_at, statement_accepted, statement_accepted_at)
        VALUES (
          ${newEnrId},
          ${userId},
          ${actualCourseId},
          ${actualCourse.title},
          ${actualCourse.category || 'Pelatihan'},
          ${Number(actualCourse.jp || 0)},
          'active',
          CURRENT_TIMESTAMP,
          TRUE,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, course_id) DO UPDATE SET status = 'active'
      `;
      const reloaded = await sql`
        SELECT id, user_id, course_id, statement_accepted, attended_jp, attendance_percentage, completed_lessons, all_evaluations_completed
        FROM enrollments
        WHERE (course_id = ${actualCourseId} OR id = ${actualCourseId}) AND user_id = ${userId}
        LIMIT 1
      `;
      enrollment = reloaded[0];
      courseId = actualCourseId;
    }

    if (!enrollment) {
      return { success: false, error: "Gagal memverifikasi pendaftaran pada kelas ini." };
    }

    if (!enrollment.statement_accepted) {
      if (autoAcceptStatement) {
        await sql`
          UPDATE enrollments
          SET statement_accepted = TRUE,
              statement_accepted_at = CURRENT_TIMESTAMP
          WHERE id = ${enrollment.id}
        `;
        enrollment.statement_accepted = true;
      } else {
        return {
          success: false,
          error: "Harap lakukan verifikasi data profil dan checklist pernyataan sebelum presensi.",
          requireStatement: true,
        };
      }
    }

    // 2. Ambil data sesi materi — utamakan pencocokan kode QR di kelas ini agar otomatis mengarah ke modul/sesi terkait
    const lessonByCodeRows = await sql`
      SELECT lesson.id, lesson.jp, lesson.has_attendance, lesson.attendance_qr_code, lesson.title,
             module.course_id AS "courseId"
      FROM lessons lesson
      JOIN modules module ON module.id = lesson.module_id
      WHERE module.course_id = ${courseId}
        AND UPPER(TRIM(COALESCE(lesson.attendance_qr_code, ''))) = ${rawInputCode.toUpperCase()}
      LIMIT 1
    `;
    let lesson = lessonByCodeRows[0];

    if (!lesson && targetLessonId) {
      const lessonRows = await sql`
        SELECT lesson.id, lesson.jp, lesson.has_attendance, lesson.attendance_qr_code, lesson.title,
               module.course_id AS "courseId"
        FROM lessons lesson
        JOIN modules module ON module.id = lesson.module_id
        WHERE lesson.id = ${targetLessonId} AND module.course_id = ${courseId}
        LIMIT 1
      `;
      lesson = lessonRows[0];
    }

    if (!lesson) {
      return { success: false, error: "Kode QR / token presensi tidak ditemukan pada kelas ini." };
    }

    const lessonId = String(lesson.id);

    if (lesson.has_attendance === false) {
      return { success: false, error: "Materi ini tidak memerlukan presensi kehadiran." };
    }

    // 3. Verifikasi kode presensi
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

    const courseQuizRows = await sql`
      SELECT DISTINCT l.id
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      LEFT JOIN quiz_questions qq ON qq.lesson_id = l.id
      WHERE (m.course_id = ${courseId} OR m.course_id = ${courseId.replace(/^course_/, '')} OR m.course_id = ${'course_' + courseId})
        AND (l.type = 'quiz' OR qq.id IS NOT NULL)
    `;
    let allQuizzesPassed = true;
    if (courseQuizRows.length > 0) {
      const qIds = courseQuizRows.map((q) => String(q.id));
      const passedAttempts = await sql`
        SELECT DISTINCT lesson_id FROM quiz_attempts
        WHERE user_id = ${userId} AND passed = TRUE AND lesson_id = ANY(${qIds})
      `;
      allQuizzesPassed = passedAttempts.length === courseQuizRows.length;
    }

    const isAttendanceSufficient = attendancePercentage >= 80;
    const canCompleteEnrollment = isAttendanceSufficient && Boolean(enrollment.all_evaluations_completed) && allQuizzesPassed;

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
      message: existingAtt[0]
        ? `Anda sudah tercatat hadir pada materi ini (${lesson.title}).`
        : `Presensi berhasil dicatat! (+${lessonJp} JP) - ${lesson.title}`,
      lessonId,
      lessonTitle: String(lesson.title),
      attendedJp,
      totalClassJp,
      attendancePercentage,
      alreadyAttended: Boolean(existingAtt[0]),
      attendedAt: existingAtt[0]?.attended_at ? new Date(existingAtt[0].attended_at).toISOString() : new Date().toISOString(),
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
  * Memverifikasi data sesi materi dan status peserta untuk halaman scan presensi web
  */
export async function getAttendanceScanContext(params: {
  courseId: string;
  lessonId?: string;
  code?: string;
}) {
  try {
    const session = await getAuthSession();
    const userId = session?.user?.id;
    const { courseId, lessonId, code } = params;

    if (!courseId) {
      return { success: false, error: "ID Pelatihan tidak valid." };
    }

    // 1. Ambil data Course
    const courseRows = await sql`
      SELECT id, title, training_type, delivery_mode, jp, thumbnail_url, instructor_id
      FROM courses
      WHERE id = ${courseId}
         OR id = ${'course_' + courseId}
         OR id = ${courseId.replace(/^course_/, '')}
      LIMIT 1
    `;
    const course = courseRows[0];
    if (!course) {
      return { success: false, error: "Pelatihan tidak ditemukan." };
    }
    const resolvedCourseId = String(course.id);

    // 2. Ambil data Lesson
    let lesson: any = null;
    if (code) {
      const cleanCode = code.trim().toUpperCase();
      const lessonByCode = await sql`
        SELECT l.id, l.title, l.jp, l.has_attendance, l.attendance_qr_code, l.narasumber_name,
               m.id AS module_id, m.title AS module_title
        FROM lessons l
        JOIN modules m ON m.id = l.module_id
        WHERE m.course_id = ${resolvedCourseId}
          AND UPPER(TRIM(COALESCE(l.attendance_qr_code, ''))) = ${cleanCode}
        LIMIT 1
      `;
      lesson = lessonByCode[0];
    }

    if (!lesson && lessonId) {
      const cleanLessonId = lessonId.trim();
      const lessonById = await sql`
        SELECT l.id, l.title, l.jp, l.has_attendance, l.attendance_qr_code, l.narasumber_name,
               m.id AS module_id, m.title AS module_title
        FROM lessons l
        JOIN modules m ON m.id = l.module_id
        WHERE (l.id = ${cleanLessonId} OR l.id = ${'less_' + cleanLessonId})
          AND m.course_id = ${resolvedCourseId}
        LIMIT 1
      `;
      lesson = lessonById[0];
    }

    // Fallback: jika kode presensi materi belum dicocokkan, ambil sesi materi pertama yang wajib presensi di kelas ini
    if (!lesson) {
      const fallbackRows = await sql`
        SELECT l.id, l.title, l.jp, l.has_attendance, l.attendance_qr_code, l.narasumber_name,
               m.id AS module_id, m.title AS module_title
        FROM lessons l
        JOIN modules m ON m.id = l.module_id
        WHERE m.course_id = ${resolvedCourseId} AND l.has_attendance = TRUE
        ORDER BY m.id ASC, l.order ASC, l.id ASC
        LIMIT 1
      `;
      lesson = fallbackRows[0];
    }

    if (!lesson) {
      return { success: false, error: "Sesi materi tidak ditemukan pada pelatihan ini." };
    }

    // 3. User & Enrollment state if logged in
    let userState = null;
    if (userId) {
      const userRows = await sql`
        SELECT id, name, nip, email, instansi_asal, jabatan, pangkat, image
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `;
      const userData = userRows[0];

      const enrollmentRows = await sql`
        SELECT id, status, statement_accepted, attended_jp, attendance_percentage
        FROM enrollments
        WHERE (course_id = ${resolvedCourseId} OR id = ${resolvedCourseId}) AND user_id = ${userId}
        LIMIT 1
      `;
      const enr = enrollmentRows[0];

      const attRows = await sql`
        SELECT id, jp, attended_at
        FROM material_attendances
        WHERE user_id = ${userId} AND lesson_id = ${lesson.id}
        LIMIT 1
      `;
      const att = attRows[0];

      userState = {
        isLoggedIn: true,
        user: userData ? {
          id: String(userData.id),
          name: String(userData.name),
          nip: String(userData.nip || ""),
          instansiAsal: String(userData.instansi_asal || ""),
          jabatan: String(userData.jabatan || ""),
        } : null,
        isEnrolled: Boolean(enr),
        statementAccepted: Boolean(enr?.statement_accepted),
        alreadyAttended: Boolean(att),
        attendedAt: att?.attended_at ? new Date(att.attended_at).toISOString() : null,
        attendedJp: Number(enr?.attended_jp || 0),
        attendancePercentage: Number(enr?.attendance_percentage || 0),
      };
    }

    return {
      success: true,
      course: {
        id: resolvedCourseId,
        title: String(course.title),
        type: String(course.training_type || course.delivery_mode || "classical"),
        totalJp: Number(course.jp || 0),
        image: course.thumbnail_url ? String(course.thumbnail_url) : null,
      },
      lesson: {
        id: String(lesson.id),
        title: String(lesson.title),
        jp: Number(lesson.jp || 2),
        moduleTitle: String(lesson.module_title || ""),
        narasumberName: lesson.narasumber_name ? String(lesson.narasumber_name) : null,
        attendanceCode: String(lesson.attendance_qr_code || code || ""),
      },
      userState,
    };
  } catch (err: unknown) {
    console.error("getAttendanceScanContext error:", err);
    return { success: false, error: "Gagal memverifikasi data sesi presensi." };
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

export interface SessionAttendanceParticipant {
  userId: string;
  name: string;
  nip: string;
  instansiAsal: string;
  attendedAt?: string;
}

export interface SessionAttendanceSummary {
  success: boolean;
  error?: string;
  totalEnrolled: number;
  attendedCount: number;
  notAttendedCount: number;
  attendancePercentage: number;
  attended: SessionAttendanceParticipant[];
  notAttended: SessionAttendanceParticipant[];
}

/**
 * Mengambil ringkasan dan daftar peserta yang sudah & belum presensi pada sesi tertentu
 */
export async function getSessionAttendanceSummary(
  courseId: string,
  lessonId: string
): Promise<SessionAttendanceSummary> {
  try {
    await requireInstructorSession();

    if (!courseId || !lessonId) {
      return {
        success: false,
        error: "Parameter courseId dan lessonId wajib disertakan.",
        totalEnrolled: 0,
        attendedCount: 0,
        notAttendedCount: 0,
        attendancePercentage: 0,
        attended: [],
        notAttended: [],
      };
    }

    const rows = await sql`
      SELECT 
        e.user_id AS "userId",
        u.name,
        u.nip,
        u.instansi_asal AS "instansiAsal",
        ma.attended_at AS "attendedAt"
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN material_attendances ma 
        ON ma.user_id = e.user_id 
       AND (ma.lesson_id = ${lessonId} OR ma.lesson_id = ${'less_' + lessonId} OR ma.lesson_id = ${lessonId.replace(/^less_/, '')})
      WHERE (e.course_id = ${courseId} OR e.course_id = ${'course_' + courseId} OR e.course_id = ${courseId.replace(/^course_/, '')} OR e.id = ${courseId})
      ORDER BY ma.attended_at DESC NULLS LAST, u.name ASC
    `;

    const attended: SessionAttendanceParticipant[] = [];
    const notAttended: SessionAttendanceParticipant[] = [];

    for (const r of rows) {
      const p: SessionAttendanceParticipant = {
        userId: String(r.userId),
        name: String(r.name || "Peserta"),
        nip: String(r.nip || "-"),
        instansiAsal: String(r.instansiAsal || "-"),
        attendedAt: r.attendedAt ? new Date(String(r.attendedAt)).toISOString() : undefined,
      };
      if (r.attendedAt) {
        attended.push(p);
      } else {
        notAttended.push(p);
      }
    }

    const totalEnrolled = rows.length;
    const attendedCount = attended.length;
    const notAttendedCount = notAttended.length;
    const attendancePercentage = totalEnrolled > 0
      ? Math.round((attendedCount / totalEnrolled) * 1000) / 10
      : 0;

    return {
      success: true,
      totalEnrolled,
      attendedCount,
      notAttendedCount,
      attendancePercentage,
      attended,
      notAttended,
    };
  } catch (err: unknown) {
    console.error("getSessionAttendanceSummary error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memuat rekap presensi sesi.",
      totalEnrolled: 0,
      attendedCount: 0,
      notAttendedCount: 0,
      attendancePercentage: 0,
      attended: [],
      notAttended: [],
    };
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
      FROM courses 
      WHERE id = ${courseId} OR id = ${courseId.replace(/^course_/, '')} OR id = ${'course_' + courseId}
      LIMIT 1
    `;
    const course = courseRows[0];
    if (!course) return { success: false, error: "Kelas tidak ditemukan." };
    if (!isAdmin && String(course.instructorId || "") !== session.user.id) {
      return { success: false, error: "Anda tidak memiliki akses ke kelas ini." };
    }

    const effectiveCourseId = String(course.id);

    const lessonRows = await sql`
      SELECT l.id, l.jp
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      WHERE (l.id = ${lessonId} OR l.id = ${lessonId.replace(/^less_/, '')} OR l.id = ${'less_' + lessonId})
        AND (m.course_id = ${effectiveCourseId} OR m.course_id = ${courseId} OR m.course_id = ${courseId.replace(/^course_/, '')} OR m.course_id = ${'course_' + courseId})
      LIMIT 1
    `;
    const lesson = lessonRows[0];
    if (!lesson) return { success: false, error: "Sesi materi tidak ditemukan pada kelas ini." };

    const effectiveLessonId = String(lesson.id);

    // Dapatkan data enrollment peserta sebelum insert/delete
    const enrollmentRows = await sql`
      SELECT id, completed_lessons, all_evaluations_completed
      FROM enrollments
      WHERE user_id = ${userId}
        AND (course_id = ${effectiveCourseId} OR course_id = ${courseId} OR course_id = ${courseId.replace(/^course_/, '')} OR course_id = ${'course_' + courseId})
      LIMIT 1
    `;

    let enrollmentId = enrollmentRows[0]?.id;
    if (!enrollmentId) {
      enrollmentId = `enr_${crypto.randomUUID()}`;
      await sql`
        INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at)
        VALUES (${enrollmentId}, ${userId}, ${effectiveCourseId}, 'enrolled', CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING
      `;
    }

    await ensureAttendanceOverrideColumns();
    const actorLabel = session.user.name || session.user.email || session.user.id;
    const lessonJp = Number(lesson.jp || 2);

    if (markPresent) {
      const attId = `att_${crypto.randomUUID()}`;
      await sql`
        INSERT INTO material_attendances (id, enrollment_id, user_id, course_id, lesson_id, jp, attended_at, override_note, override_by)
        VALUES (${attId}, ${enrollmentId}, ${userId}, ${effectiveCourseId}, ${effectiveLessonId}, ${lessonJp}, CURRENT_TIMESTAMP, ${cleanNote}, ${actorLabel})
        ON CONFLICT (user_id, lesson_id)
        DO UPDATE SET
          enrollment_id = EXCLUDED.enrollment_id,
          course_id = EXCLUDED.course_id,
          jp = EXCLUDED.jp,
          attended_at = CURRENT_TIMESTAMP,
          override_note = EXCLUDED.override_note,
          override_by = EXCLUDED.override_by
      `;
    } else {
      await sql`
        DELETE FROM material_attendances
        WHERE user_id = ${userId} 
          AND (lesson_id = ${effectiveLessonId} OR lesson_id = ${lessonId} OR lesson_id = ${'less_' + lessonId} OR lesson_id = ${lessonId.replace(/^less_/, '')})
          AND (course_id = ${effectiveCourseId} OR course_id = ${courseId} OR course_id = ${courseId.replace(/^course_/, '')} OR course_id = ${'course_' + courseId})
      `;
    }

    // Recalculate total attended JP & percentage on enrollment
    const [attSumRows, totalJpRows] = await Promise.all([
      sql`
        SELECT COALESCE(SUM(jp), 0) AS total_jp
        FROM material_attendances
        WHERE user_id = ${userId} 
          AND (course_id = ${effectiveCourseId} OR course_id = ${courseId} OR course_id = ${courseId.replace(/^course_/, '')} OR course_id = ${'course_' + courseId})
      `,
      sql`
        SELECT COALESCE(SUM(l.jp), 0) AS total_class_jp
        FROM lessons l
        JOIN modules m ON m.id = l.module_id
        WHERE (m.course_id = ${effectiveCourseId} OR m.course_id = ${courseId} OR m.course_id = ${courseId.replace(/^course_/, '')} OR m.course_id = ${'course_' + courseId}) 
          AND l.has_attendance = TRUE
      `,
    ]);

    const attendedJp = Number(attSumRows[0]?.total_jp || 0);
    const computedClassJp = Number(totalJpRows[0]?.total_class_jp || 0);
    const totalClassJp = computedClassJp > 0 ? computedClassJp : Number(course.jp || 0);
    const attendancePercentage = calculateAttendancePercentage(attendedJp, totalClassJp);

    const enrollment = enrollmentRows[0] || { id: enrollmentId, completed_lessons: "[]", all_evaluations_completed: false };
    let existingCompleted: string[] = [];
    try {
      existingCompleted = Array.isArray(enrollment.completed_lessons)
        ? enrollment.completed_lessons
        : JSON.parse(String(enrollment.completed_lessons || "[]"));
    } catch {
      existingCompleted = [];
    }

    const updatedSet = new Set(existingCompleted.map(String));
    if (markPresent) {
      updatedSet.add(effectiveLessonId);
      updatedSet.add(lessonId);
    } else {
      updatedSet.delete(effectiveLessonId);
      updatedSet.delete(lessonId);
    }

    const courseQuizRows = await sql`
      SELECT DISTINCT l.id
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      LEFT JOIN quiz_questions qq ON qq.lesson_id = l.id
      WHERE (m.course_id = ${effectiveCourseId} OR m.course_id = ${courseId} OR m.course_id = ${courseId.replace(/^course_/, '')} OR m.course_id = ${'course_' + courseId})
        AND (l.type = 'quiz' OR qq.id IS NOT NULL)
    `;
    let allQuizzesPassed = true;
    if (courseQuizRows.length > 0) {
      const qIds = courseQuizRows.map((q) => String(q.id));
      const passedAttempts = await sql`
        SELECT DISTINCT lesson_id FROM quiz_attempts
        WHERE user_id = ${userId} AND passed = TRUE AND lesson_id = ANY(${qIds})
      `;
      allQuizzesPassed = passedAttempts.length === courseQuizRows.length;
    }

    const threshold = Number(course.attendanceThreshold ?? 80);
    const canComplete = attendancePercentage >= threshold && Boolean(enrollment.all_evaluations_completed) && allQuizzesPassed;

    await sql`
      UPDATE enrollments
      SET attended_jp = ${attendedJp},
          attendance_percentage = ${attendancePercentage},
          completed_lessons = ${JSON.stringify(Array.from(updatedSet))},
          status = CASE WHEN ${canComplete} THEN 'completed' ELSE status END
      WHERE id = ${enrollment.id}
    `;

    revalidatePath(`/admin/courses/${courseId}/attendance`);
    revalidatePath(`/learn/${courseId}`);
    return {
      success: true,
      message: markPresent
        ? "Presensi peserta berhasil ditandai Hadir (Manual Override)."
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

export interface LiveEnrolledParticipant {
  enrollmentId: string;
  userId: string;
  name: string;
  email: string;
  nip: string;
  instansiAsal: string;
  jabatan: string;
  pangkat: string;
  phone: string;
  status: string;
  statementAccepted: boolean;
  enrolledAt: string;
}

/**
 * Mengambil daftar peserta terdaftar secara live untuk modal QR pendaftaran kelas
 */
export async function getCourseEnrollmentsLive(courseId: string) {
  try {
    const session = await requireInstructorSession();
    const isAdmin = session.user.role === "admin";

    const courseRows = await sql`
      SELECT id, instructor_id AS "instructorId"
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

    const rows = await sql`
      SELECT e.id AS "enrollmentId", e.user_id AS "userId",
             COALESCE(e.status, 'active') AS "status",
             e.statement_accepted AS "statementAccepted", e.enrolled_at AS "enrolledAt",
             u.name, u.email, u.nip, u.instansi_asal AS "instansiAsal",
             u.jabatan, u.pangkat, u.phone
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      WHERE e.course_id = ${courseId}
      ORDER BY e.enrolled_at DESC
    `;

    const participants: LiveEnrolledParticipant[] = rows.map((r) => ({
      enrollmentId: String(r.enrollmentId),
      userId: String(r.userId),
      name: String(r.name || ""),
      email: String(r.email || ""),
      nip: r.nip ? String(r.nip) : "",
      instansiAsal: r.instansiAsal ? String(r.instansiAsal) : "",
      jabatan: r.jabatan ? String(r.jabatan) : "",
      pangkat: r.pangkat ? String(r.pangkat) : "",
      phone: r.phone ? String(r.phone) : "",
      status: String(r.status || "active"),
      statementAccepted: Boolean(r.statementAccepted),
      enrolledAt: r.enrolledAt ? new Date(String(r.enrolledAt)).toISOString() : new Date().toISOString(),
    }));

    return {
      success: true,
      fetchedAt: new Date().toISOString(),
      participants,
    };
  } catch (err: unknown) {
    console.error("getCourseEnrollmentsLive error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memuat daftar peserta live.",
    };
  }
}

/**
 * Update status persetujuan pendaftaran peserta (active / rejected)
 */
export async function adminUpdateEnrollmentApproval(payload: {
  courseId: string;
  enrollmentId: string;
  status: "active" | "rejected";
}) {
  try {
    const session = await requireInstructorSession();
    const isAdmin = session.user.role === "admin";
    const { courseId, enrollmentId, status } = payload;

    const courseRows = await sql`
      SELECT id, instructor_id AS "instructorId", title
      FROM courses
      WHERE id = ${courseId}
      LIMIT 1
    `;
    const course = courseRows[0];
    if (!course) return { success: false, error: "Kelas tidak ditemukan." };
    if (!isAdmin && String(course.instructorId || "") !== session.user.id) {
      return { success: false, error: "Anda tidak memiliki akses ke kelas ini." };
    }

    const updated = await sql`
      UPDATE enrollments
      SET status = ${status}
      WHERE id = ${enrollmentId} AND course_id = ${courseId}
      RETURNING user_id AS "userId"
    `;

    if (!updated[0]) {
      return { success: false, error: "Pendaftaran peserta tidak ditemukan." };
    }

    revalidatePath(`/courses/${courseId}`);
    revalidatePath(`/admin/courses/${courseId}`);

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui status pendaftaran.",
    };
  }
}

/**
 * Setujui semua pendaftaran berstatus pending_approval sekaligus
 */
export async function adminApproveAllPendingEnrollments(courseId: string) {
  try {
    const session = await requireInstructorSession();
    const isAdmin = session.user.role === "admin";

    const courseRows = await sql`
      SELECT id, instructor_id AS "instructorId"
      FROM courses
      WHERE id = ${courseId}
      LIMIT 1
    `;
    const course = courseRows[0];
    if (!course) return { success: false, error: "Kelas tidak ditemukan." };
    if (!isAdmin && String(course.instructorId || "") !== session.user.id) {
      return { success: false, error: "Anda tidak memiliki akses ke kelas ini." };
    }

    const updated = await sql`
      UPDATE enrollments
      SET status = 'active'
      WHERE course_id = ${courseId} AND status = 'pending_approval'
      RETURNING id
    `;

    revalidatePath(`/courses/${courseId}`);
    revalidatePath(`/admin/courses/${courseId}`);

    return { success: true, count: updated.length };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyetujui semua pendaftaran.",
    };
  }
}

/**
 * Menghapus/mengeluarkan peserta yang sudah terdaftar dari kelas
 */
export async function adminRemoveCourseParticipant(payload: {
  courseId: string;
  enrollmentId: string;
}) {
  try {
    const { courseId, enrollmentId } = payload;
    const session = await requireInstructorSession();
    const isAdmin = session.user.role === "admin";

    const courseRows = await sql`
      SELECT id, instructor_id AS "instructorId"
      FROM courses
      WHERE id = ${courseId}
      LIMIT 1
    `;
    const course = courseRows[0];
    if (!course) return { success: false, error: "Kelas tidak ditemukan." };
    if (!isAdmin && String(course.instructorId || "") !== session.user.id) {
      return { success: false, error: "Anda tidak memiliki akses ke kelas ini." };
    }

    const enrollmentRows = await sql`
      SELECT id, user_id AS "userId"
      FROM enrollments
      WHERE id = ${enrollmentId} AND course_id = ${courseId}
      LIMIT 1
    `;
    const enrollment = enrollmentRows[0];
    if (!enrollment) {
      return { success: false, error: "Data pendaftaran peserta tidak ditemukan." };
    }

    // 1. Bersihkan riwayat presensi materi kelas ini
    await sql`
      DELETE FROM material_attendances
      WHERE enrollment_id = ${enrollmentId} OR (course_id = ${courseId} AND user_id = ${enrollment.userId})
    `;

    // 2. Bersihkan evaluasi kelas jika ada
    await sql`
      DELETE FROM training_evaluations
      WHERE enrollment_id = ${enrollmentId} OR (course_id = ${courseId} AND user_id = ${enrollment.userId})
    `;

    // 3. Bersihkan sertifikat kursus yang terbit jika ada
    await sql`
      DELETE FROM issued_course_certificates
      WHERE enrollment_id = ${enrollmentId} OR (course_id = ${courseId} AND user_id = ${enrollment.userId})
    `;

    // 4. Hapus data enrollment peserta dari kelas
    await sql`
      DELETE FROM enrollments
      WHERE id = ${enrollmentId} AND course_id = ${courseId}
    `;

    revalidatePath(`/courses/${courseId}`);
    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/admin/courses`);

    return { success: true };
  } catch (err: unknown) {
    console.error("adminRemoveCourseParticipant error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menghapus peserta dari kelas.",
    };
  }
}

/**
 * Admin/Instruktur mengedit data registrasi/profil peserta langsung ke database
 */
export async function adminUpdateParticipantRegistration(payload: {
  courseId: string;
  userId: string;
  name: string;
  nip?: string;
  instansiAsal?: string;
  jabatan?: string;
  pangkat?: string;
  phone?: string;
}) {
  try {
    const session = await requireInstructorSession();
    const isAdmin = session.user.role === "admin";
    const { courseId, userId, name, nip, instansiAsal, jabatan, pangkat, phone } = payload;

    const courseRows = await sql`
      SELECT id, instructor_id AS "instructorId"
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

    const enrollmentRows = await sql`
      SELECT id FROM enrollments
      WHERE course_id = ${courseId} AND user_id = ${userId}
      LIMIT 1
    `;
    if (!enrollmentRows[0]) {
      return { success: false, error: "Peserta tidak terdaftar pada kelas ini." };
    }

    const cleanName = (name || "").trim();
    if (!cleanName) {
      return { success: false, error: "Nama lengkap peserta wajib diisi." };
    }

    const cleanNip = nip && nip.trim() ? sanitizeParticipantNip(nip) : null;
    if (cleanNip && cleanNip.length < 16) {
      return { success: false, error: "NIP/NIK minimal 16 digit jika diisi." };
    }

    const cleanPhone = phone ? phone.replace(/[^\d+]/g, "") : null;
    const cleanInstansi = instansiAsal?.trim() || null;
    const cleanJabatan = jabatan?.trim() || null;
    const cleanPangkat = pangkat?.trim() || null;

    await sql`
      UPDATE users
      SET name = ${cleanName},
          nip = ${cleanNip},
          instansi_asal = ${cleanInstansi},
          jabatan = ${cleanJabatan},
          pangkat = ${cleanPangkat},
          phone = ${cleanPhone || null}
      WHERE id = ${userId}
    `;

    // Sinkronkan ke sertifikat terbit apabila sudah ada untuk kelas ini
    await sql`
      UPDATE issued_course_certificates
      SET participant_name = ${cleanName},
          participant_nip = ${cleanNip},
          participant_rank = ${cleanPangkat},
          participant_position = ${cleanJabatan},
          participant_institution = ${cleanInstansi}
      WHERE course_id = ${courseId}
        AND user_id = ${userId}
        AND revoked_at IS NULL
    `;

    revalidatePath(`/admin/courses/${courseId}/attendance`);
    revalidatePath(`/admin/courses/${courseId}/certificates`);

    return { success: true, message: "Data registrasi peserta berhasil diperbarui." };
  } catch (err: unknown) {
    console.error("adminUpdateParticipantRegistration error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui data peserta.",
    };
  }
}

/**
 * Mencari calon peserta dari database pengguna terdaftar untuk dimasukkan ke kelas
 */
export async function adminSearchCandidateUsers(courseId: string, query: string) {
  try {
    const session = await requireInstructorSession();
    const isAdmin = session.user.role === "admin";

    const courseRows = await sql`
      SELECT id, instructor_id AS "instructorId"
      FROM courses
      WHERE id = ${courseId}
      LIMIT 1
    `;
    const course = courseRows[0];
    if (!course) return { success: false, error: "Kelas tidak ditemukan.", users: [] };
    if (!isAdmin && String(course.instructorId || "") !== session.user.id) {
      return { success: false, error: "Akses ditolak.", users: [] };
    }

    const q = (query || "").trim();
    if (!q || q.length < 2) {
      return { success: true, users: [] };
    }

    const searchPattern = `%${q}%`;
    const rows = await sql`
      SELECT 
        u.id, 
        u.name, 
        u.nip, 
        u.email, 
        u.instansi_asal AS "instansiAsal", 
        u.jabatan, 
        u.pangkat,
        CASE WHEN e.id IS NOT NULL THEN TRUE ELSE FALSE END AS "isAlreadyEnrolled"
      FROM users u
      LEFT JOIN enrollments e ON e.user_id = u.id AND e.course_id = ${courseId}
      WHERE u.role <> 'admin'
        AND (u.name ILIKE ${searchPattern} OR u.nip ILIKE ${searchPattern} OR u.email ILIKE ${searchPattern})
      ORDER BY "isAlreadyEnrolled" ASC, u.name ASC
      LIMIT 15
    `;

    return {
      success: true,
      users: rows.map((r) => ({
        id: String(r.id),
        name: String(r.name || ""),
        nip: String(r.nip || ""),
        email: String(r.email || ""),
        instansiAsal: String(r.instansiAsal || ""),
        jabatan: String(r.jabatan || ""),
        pangkat: String(r.pangkat || ""),
        isAlreadyEnrolled: Boolean(r.isAlreadyEnrolled),
      })),
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mencari pengguna.",
      users: [],
    };
  }
}

/**
 * Menambahkan pengguna yang sudah ada di sistem ke dalam kelas secara manual
 */
export async function adminEnrollExistingUser(payload: {
  courseId: string;
  userId: string;
}) {
  try {
    const { courseId, userId } = payload;
    const session = await requireInstructorSession();
    const isAdmin = session.user.role === "admin";

    const courseRows = await sql`
      SELECT id, title, category, jp, instructor_id AS "instructorId"
      FROM courses
      WHERE id = ${courseId}
      LIMIT 1
    `;
    const course = courseRows[0];
    if (!course) return { success: false, error: "Kelas tidak ditemukan." };
    if (!isAdmin && String(course.instructorId || "") !== session.user.id) {
      return { success: false, error: "Anda tidak memiliki akses ke kelas ini." };
    }

    const userRows = await sql`
      SELECT id, name, nip, instansi_asal AS "instansiAsal"
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;
    const user = userRows[0];
    if (!user) return { success: false, error: "Data pengguna tidak ditemukan." };

    const enrollmentId = `enroll_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    await sql`
      INSERT INTO enrollments (id, user_id, course_id, title, category, progress, status, jp, enrolled_at)
      VALUES (${enrollmentId}, ${userId}, ${courseId}, ${course.title}, ${course.category || "Umum"}, 0, 'active', ${course.jp || 0}, ${now})
      ON CONFLICT (user_id, course_id) DO UPDATE SET
        status = 'active'
    `;

    revalidatePath(`/courses/${courseId}`);
    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/admin/courses`);

    return { success: true, name: String(user.name) };
  } catch (err: unknown) {
    console.error("adminEnrollExistingUser error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menambahkan peserta ke kelas.",
    };
  }
}

/**
 * Mendaftarkan peserta baru langsung (bila belum ada akun) sekaligus mengaktifkan di kelas
 */
export async function adminCreateAndEnrollUser(payload: {
  courseId: string;
  name: string;
  nip: string;
  instansiAsal?: string;
  jabatan?: string;
  pangkat?: string;
  email?: string;
  phone?: string;
}) {
  try {
    const { courseId, name, instansiAsal, jabatan, pangkat, phone } = payload;
    const cleanNip = sanitizeParticipantNip(payload.nip || "");
    const cleanName = (name || "").trim();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: "Nama peserta wajib diisi." };
    }
    if (!cleanNip || cleanNip.length < 5) {
      return { success: false, error: "NIP/NIK peserta valid wajib diisi minimal 5 digit." };
    }

    const session = await requireInstructorSession();
    const isAdmin = session.user.role === "admin";

    const courseRows = await sql`
      SELECT id, title, category, jp, instructor_id AS "instructorId"
      FROM courses
      WHERE id = ${courseId}
      LIMIT 1
    `;
    const course = courseRows[0];
    if (!course) return { success: false, error: "Kelas tidak ditemukan." };
    if (!isAdmin && String(course.instructorId || "") !== session.user.id) {
      return { success: false, error: "Anda tidak memiliki akses ke kelas ini." };
    }

    const cleanEmail = (payload.email || "").trim().toLowerCase() || `${cleanNip}@kaltaraprov.go.id`;
    const now = new Date().toISOString();

    // Cek apakah user sudah ada berdasarkan NIP atau Email
    const existingUserRows = await sql`
      SELECT id, name, nip, email
      FROM users
      WHERE nip = ${cleanNip} OR email = ${cleanEmail}
      LIMIT 1
    `;

    let targetUserId = "";
    if (existingUserRows[0]) {
      targetUserId = String(existingUserRows[0].id);
      await sql`
        UPDATE users
        SET name = ${cleanName},
            instansi_asal = COALESCE(${instansiAsal?.trim() || null}, instansi_asal),
            jabatan = COALESCE(${jabatan?.trim() || null}, jabatan),
            pangkat = COALESCE(${pangkat?.trim() || null}, pangkat),
            phone = COALESCE(${phone?.trim() || null}, phone)
        WHERE id = ${targetUserId}
      `;
    } else {
      targetUserId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const defaultPassword = cleanNip;
      const pwdHash = await hashPassword(defaultPassword);

      await sql`
        INSERT INTO users (id, name, nip, username, email, password, role, instansi_asal, pangkat, jabatan, phone, created_at, joined_at)
        VALUES (
          ${targetUserId},
          ${cleanName},
          ${cleanNip},
          ${cleanNip},
          ${cleanEmail},
          ${pwdHash},
          'student',
          ${instansiAsal?.trim() || "BPSDM Kaltara"},
          ${pangkat?.trim() || null},
          ${jabatan?.trim() || null},
          ${phone?.trim() || null},
          ${now},
          ${now}
        )
      `;
    }

    // Enroll ke kursus dengan status = 'active'
    const enrollmentId = `enroll_${crypto.randomUUID()}`;
    await sql`
      INSERT INTO enrollments (id, user_id, course_id, title, category, progress, status, jp, enrolled_at)
      VALUES (${enrollmentId}, ${targetUserId}, ${courseId}, ${course.title}, ${course.category || "Umum"}, 0, 'active', ${course.jp || 0}, ${now})
      ON CONFLICT (user_id, course_id) DO UPDATE SET
        status = 'active'
    `;

    revalidatePath(`/courses/${courseId}`);
    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/admin/courses`);

    return { success: true, name: cleanName, nip: cleanNip };
  } catch (err: unknown) {
    console.error("adminCreateAndEnrollUser error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menambahkan peserta baru ke kelas.",
    };
  }
}
