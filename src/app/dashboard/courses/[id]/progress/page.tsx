import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
    Award,
    BookOpen,
    CheckCircle2,
    ChevronLeft,
    Circle,
    ClipboardCheck,
    ExternalLink,
    ShieldCheck,
} from "lucide-react";
import { getAuthSession } from "@/app/actions/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

type ProgressPageProps = {
    params: Promise<{ id: string }>;
};

type Attempt = {
    id: string;
    lessonId: string;
    score: number;
    passed: boolean;
    createdAt: string;
};

type LessonProgress = {
    id: string;
    moduleId: string;
    title: string;
    type: string;
    order: number;
    completed: boolean;
    attempts: Attempt[];
};

function parseCompletedLessons(value: unknown) {
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch {
        return new Set<string>();
    }
}

function formatDate(value: string | Date | null | undefined) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Makassar",
    }).format(date);
}

function lessonTypeLabel(type: string) {
    if (type === "quiz") return "Kuis";
    if (type === "video") return "Video";
    if (type === "reading") return "Bacaan";
    if (type === "file") return "Berkas";
    return "Materi";
}

export default async function CourseProgressPage({ params }: ProgressPageProps) {
    const session = await getAuthSession();
    if (!session) redirect("/login");

    const { id } = await params;
    if (!/^[A-Za-z0-9_-]{1,255}$/.test(id)) notFound();

    // ID enrollment digunakan sebagai identitas utama. Course ID tetap didukung
    // untuk peserta dan selalu diikat ke user yang sedang login.
    const enrollmentRows = await sql`
        SELECT enrollment.id, enrollment.user_id AS "userId",
               enrollment.course_id AS "courseId", enrollment.status,
               enrollment.progress AS "storedProgress",
               enrollment.completed_lessons AS "completedLessons",
               enrollment.enrolled_at AS "enrolledAt",
               enrollment.completed_at AS "completedAt",
               course.title AS "courseTitle", course.instructor_id AS "instructorId",
               COALESCE(course.passing_score, 60) AS "passingScore",
               COALESCE(course.certificate_enabled, TRUE) AS "certificateEnabled",
               participant.name AS "participantName"
        FROM enrollments enrollment
        JOIN courses course ON course.id = enrollment.course_id
        JOIN users participant ON participant.id = enrollment.user_id
        WHERE enrollment.id = ${id}
           OR (enrollment.course_id = ${id} AND enrollment.user_id = ${session.user.id})
        ORDER BY CASE WHEN enrollment.id = ${id} THEN 0 ELSE 1 END
        LIMIT 1
    `;
    const enrollment = enrollmentRows[0];
    if (!enrollment) notFound();

    const isParticipant = String(enrollment.userId) === session.user.id;
    const isAdmin = session.user.role === "admin";
    const isCourseOwner = session.user.role === "instructor"
        && String(enrollment.instructorId || "") === session.user.id;
    if (!isParticipant && !isAdmin && !isCourseOwner) notFound();

    const courseId = String(enrollment.courseId);
    const participantId = String(enrollment.userId);
    const lessonRows = await sql`
        SELECT module.id AS "moduleId", module.title AS "moduleTitle",
               module."order" AS "moduleOrder", lesson.id, lesson.title,
               lesson.type, lesson."order" AS "lessonOrder"
        FROM modules module
        JOIN lessons lesson ON lesson.module_id = module.id
        WHERE module.course_id = ${courseId}
        ORDER BY module."order" ASC, lesson."order" ASC, lesson.id ASC
    `;
    const attemptRows = await sql`
        SELECT attempt.id, attempt.lesson_id AS "lessonId", attempt.score,
               attempt.passed, attempt.created_at AS "createdAt"
        FROM quiz_attempts attempt
        JOIN lessons lesson ON lesson.id = attempt.lesson_id
        JOIN modules module ON module.id = lesson.module_id
        WHERE attempt.user_id = ${participantId} AND module.course_id = ${courseId}
        ORDER BY attempt.created_at DESC
        LIMIT 1000
    `;
    const certificateRows = await sql`
        SELECT verification_token AS "verificationToken", revoked_at AS "revokedAt"
        FROM issued_course_certificates
        WHERE enrollment_id = ${String(enrollment.id)}
        ORDER BY issued_at DESC
        LIMIT 1
    `;

    const attemptsByLesson = new Map<string, Attempt[]>();
    for (const row of attemptRows) {
        const lessonId = String(row.lessonId);
        const attempts = attemptsByLesson.get(lessonId) || [];
        attempts.push({
            id: String(row.id),
            lessonId,
            score: Number(row.score || 0),
            passed: row.passed === true,
            createdAt: new Date(String(row.createdAt)).toISOString(),
        });
        attemptsByLesson.set(lessonId, attempts);
    }

    const persistedCompletion = parseCompletedLessons(enrollment.completedLessons);
    const lessons: LessonProgress[] = lessonRows.map((row) => {
        const lessonId = String(row.id);
        const type = String(row.type || "reading");
        const attempts = attemptsByLesson.get(lessonId) || [];
        return {
            id: lessonId,
            moduleId: String(row.moduleId),
            title: String(row.title || "Materi"),
            type,
            order: Number(row.lessonOrder || 0),
            // Kelulusan kuis bersumber dari attempt server, bukan flag dari client.
            completed: type === "quiz"
                ? attempts.some((attempt) => attempt.passed)
                : persistedCompletion.has(lessonId),
            attempts,
        };
    });

    const moduleRows = lessonRows.reduce<Array<{ id: string; title: string; order: number }>>((items, row) => {
        const moduleId = String(row.moduleId);
        if (!items.some((item) => item.id === moduleId)) {
            items.push({
                id: moduleId,
                title: String(row.moduleTitle || "Modul"),
                order: Number(row.moduleOrder || 0),
            });
        }
        return items;
    }, []);
    const completedCount = lessons.filter((lesson) => lesson.completed).length;
    const authoritativeProgress = lessons.length > 0
        ? Math.round((completedCount / lessons.length) * 100)
        : 0;
    const quizLessons = lessons.filter((lesson) => lesson.type === "quiz");
    const quizGrade = quizLessons.length > 0
        ? Math.round(quizLessons.reduce((total, lesson) => {
            const bestScore = lesson.attempts.reduce((best, attempt) => Math.max(best, attempt.score), 0);
            return total + bestScore;
        }, 0) / quizLessons.length)
        : null;
    const allQuizzesPassed = quizLessons.length === 0
        ? null
        : quizLessons.every((lesson) => lesson.attempts.some((attempt) => attempt.passed));
    const certificate = certificateRows[0];
    const certificateRevoked = Boolean(certificate?.revokedAt);
    const canOpenCertificate = Boolean(enrollment.certificateEnabled)
        && authoritativeProgress === 100
        && String(enrollment.status) === "completed";
    const certificateHref = isParticipant
        ? `/dashboard/certificates/${String(enrollment.id)}`
        : certificate?.verificationToken
            ? `/verify/certificates/${String(certificate.verificationToken)}`
            : null;

    return (
        <main className="min-h-screen bg-oxford-50 px-4 py-8 dark:bg-oxford-950 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <Link
                        href={isParticipant ? "/dashboard" : session.user.role === "admin" ? "/admin/courses" : "/instructor/courses"}
                        className="inline-flex items-center gap-2 text-sm font-bold text-oxford-600 transition-colors hover:text-oxford-900 dark:text-oxford-300 dark:hover:text-white"
                    >
                        <ChevronLeft size={18} /> Kembali
                    </Link>
                    {isParticipant && (
                        <Link
                            href={`/learn/${String(enrollment.id)}`}
                            className="inline-flex items-center gap-2 rounded-full bg-oxford-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gold-500 hover:text-oxford-950"
                        >
                            Lanjut belajar <ExternalLink size={16} />
                        </Link>
                    )}
                </div>

                <section className="mb-6 overflow-hidden rounded-3xl bg-oxford-950 p-7 text-white shadow-xl sm:p-9">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-gold-400">
                        <ShieldCheck size={16} /> Progress &amp; nilai terverifikasi server
                    </div>
                    <h1 className="max-w-4xl text-2xl font-bold sm:text-3xl">{String(enrollment.courseTitle)}</h1>
                    {!isParticipant && (
                        <p className="mt-2 text-sm text-oxford-300">
                            Peserta: <span className="font-bold text-white">{String(enrollment.participantName)}</span>
                        </p>
                    )}
                    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <SummaryCard label="Kemajuan" value={`${authoritativeProgress}%`} detail={`${completedCount} dari ${lessons.length} materi`} />
                        <SummaryCard
                            label="Nilai kuis"
                            value={quizGrade === null ? "-" : `${quizGrade}%`}
                            detail={quizLessons.length === 0 ? "Tidak ada kuis" : `Nilai minimum ${Number(enrollment.passingScore)}%`}
                        />
                        <SummaryCard
                            label="Status kuis"
                            value={allQuizzesPassed === null ? "N/A" : allQuizzesPassed ? "Lulus" : "Belum lulus"}
                            detail={`${quizLessons.filter((lesson) => lesson.completed).length} dari ${quizLessons.length} kuis lulus`}
                        />
                        <SummaryCard
                            label="Status kursus"
                            value={authoritativeProgress === 100 ? "Selesai" : "Berjalan"}
                            detail={authoritativeProgress === 100 ? formatDate(enrollment.completedAt) : `Terdaftar ${formatDate(enrollment.enrolledAt)}`}
                        />
                    </div>
                </section>

                {authoritativeProgress === 100 && (
                    <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-green-200 bg-green-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-green-900 dark:bg-green-950/30">
                        <div className="flex items-start gap-3">
                            <Award className="mt-0.5 shrink-0 text-green-700 dark:text-green-400" size={24} />
                            <div>
                                <h2 className="font-bold text-green-950 dark:text-green-100">Persyaratan penyelesaian terpenuhi</h2>
                                <p className="mt-1 text-sm text-green-800 dark:text-green-300">
                                    {certificateRevoked
                                        ? "Sertifikat pernah diterbitkan, tetapi telah dicabut oleh administrator."
                                        : canOpenCertificate
                                            ? "Sertifikat tersedia sesuai konfigurasi kursus."
                                            : "Penerbitan sertifikat belum tersedia atau status enrollment masih menunggu sinkronisasi."}
                                </p>
                            </div>
                        </div>
                        {canOpenCertificate && certificateHref && !certificateRevoked && (
                            <Link
                                href={certificateHref}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-green-700 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-green-800"
                            >
                                {isParticipant ? "Lihat sertifikat" : "Verifikasi sertifikat"} <ExternalLink size={16} />
                            </Link>
                        )}
                    </section>
                )}

                <div className="space-y-5">
                    {moduleRows.length > 0 ? moduleRows.map((module, moduleIndex) => {
                        const moduleLessons = lessons.filter((lesson) => lesson.moduleId === module.id);
                        const moduleCompleted = moduleLessons.filter((lesson) => lesson.completed).length;
                        return (
                            <section key={module.id} className="overflow-hidden rounded-2xl border border-oxford-200 bg-white shadow-sm dark:border-oxford-800 dark:bg-[#161B2A]">
                                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-oxford-100 bg-oxford-50 px-5 py-4 dark:border-oxford-800 dark:bg-oxford-950/50">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-oxford-900 text-sm font-bold text-gold-400">
                                            {moduleIndex + 1}
                                        </span>
                                        <div>
                                            <h2 className="font-bold text-oxford-900 dark:text-white">{module.title}</h2>
                                            <p className="text-xs text-oxford-500 dark:text-oxford-400">{moduleCompleted}/{moduleLessons.length} materi selesai</p>
                                        </div>
                                    </div>
                                </header>
                                <div className="divide-y divide-oxford-100 dark:divide-oxford-800">
                                    {moduleLessons.map((lesson) => {
                                        const latestAttempt = lesson.attempts[0];
                                        const bestScore = lesson.attempts.reduce((best, attempt) => Math.max(best, attempt.score), 0);
                                        return (
                                            <article key={lesson.id} className="p-5">
                                                <div className="flex items-start gap-3">
                                                    {lesson.completed
                                                        ? <CheckCircle2 className="mt-0.5 shrink-0 text-green-600" size={21} />
                                                        : <Circle className="mt-0.5 shrink-0 text-oxford-300" size={21} />}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                                            <div>
                                                                <p className="text-[11px] font-bold uppercase tracking-wider text-oxford-400">{lessonTypeLabel(lesson.type)}</p>
                                                                <h3 className="font-semibold text-oxford-900 dark:text-white">{lesson.title}</h3>
                                                            </div>
                                                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${lesson.completed ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-oxford-100 text-oxford-600 dark:bg-oxford-900 dark:text-oxford-300"}`}>
                                                                {lesson.completed ? "Selesai" : "Belum selesai"}
                                                            </span>
                                                        </div>

                                                        {lesson.type === "quiz" && (
                                                            <div className="mt-4 rounded-xl border border-oxford-100 bg-oxford-50 p-4 dark:border-oxford-800 dark:bg-oxford-950/60">
                                                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                                                    <span className="inline-flex items-center gap-2 text-oxford-700 dark:text-oxford-200">
                                                                        <ClipboardCheck size={16} /> Percobaan: <strong>{lesson.attempts.length}</strong>
                                                                    </span>
                                                                    <span className="text-oxford-700 dark:text-oxford-200">Nilai terbaik: <strong>{lesson.attempts.length ? `${bestScore}%` : "-"}</strong></span>
                                                                    <span className="text-oxford-700 dark:text-oxford-200">Terakhir: <strong>{latestAttempt ? `${latestAttempt.score}%` : "-"}</strong></span>
                                                                </div>
                                                                {lesson.attempts.length > 0 && (
                                                                    <div className="mt-3 space-y-2">
                                                                        {lesson.attempts.slice(0, 3).map((attempt, index) => (
                                                                            <div key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-oxford-500 dark:text-oxford-400">
                                                                                <span>Percobaan {lesson.attempts.length - index} · {formatDate(attempt.createdAt)}</span>
                                                                                <span className={attempt.passed ? "font-bold text-green-600" : "font-bold text-red-600"}>
                                                                                    {attempt.score}% · {attempt.passed ? "Lulus" : "Belum lulus"}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    }) : (
                        <section className="rounded-2xl border border-dashed border-oxford-300 bg-white p-12 text-center dark:border-oxford-700 dark:bg-[#161B2A]">
                            <BookOpen className="mx-auto mb-3 text-oxford-300" size={42} />
                            <h2 className="font-bold text-oxford-900 dark:text-white">Belum ada materi kursus</h2>
                            <p className="mt-1 text-sm text-oxford-500 dark:text-oxford-400">Kemajuan akan muncul setelah materi diterbitkan.</p>
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-oxford-400">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
            <p className="mt-1 text-xs text-oxford-300">{detail}</p>
        </div>
    );
}
