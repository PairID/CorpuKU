"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlayCircle,
    FileText,
    CheckCircle,
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    ClipboardCheck,
    ChevronRight,
    FileUp,
    Award,
    QrCode,
    Camera,
    ExternalLink,
    Lock,
    X,
    BookOpen,
    Sparkles,
    AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { UserSession } from "@/app/dashboard/dashboard-client";
import { updateLessonProgress } from "@/app/actions/courses";
import { getMaterialAttendances } from "@/app/actions/attendance";
import { toast } from "sonner";
import DataVerificationModal from "@/components/profile/DataVerificationModal";
import MobileAttendanceFAB from "@/components/attendance/MobileAttendanceFAB";
import FourStageEvaluationWizard from "@/components/evaluations/FourStageEvaluationWizard";
import DocumentViewer from "@/components/lessons/DocumentViewer";
import InlineQuizCard from "@/components/lessons/InlineQuizCard";
import InlineDiscussionPanel from "@/components/lessons/InlineDiscussionPanel";
import ThemeToggle from "@/components/ThemeToggle";
import { CourseEvaluationConfig } from "@/lib/skm-constants";

interface Lesson {
    id: string;
    moduleId: string;
    title: string;
    content: string | null;
    videoUrl: string | null;
    type: string;
    order: string;
    jp?: number;
    hasAttendance?: boolean;
    attendanceQrCode?: string | null;
    narasumberName?: string | null;
    sessionDate?: string | null;
}

interface Module {
    id: string;
    courseId: string;
    title: string;
    order: string;
    isLocked?: boolean;
    lockReason?: string | null;
    lessons: Lesson[];
}

interface Course {
    id: string;
    title: string;
    description: string | null;
    trainingType?: string;
    deliveryMode?: string;
    targetOpd?: string | null;
    attendanceThreshold?: number;
    documentationUrl?: string | null;
    certificateEnabled?: boolean;
    evaluationConfig?: CourseEvaluationConfig | null;
}

interface EnrollmentProps {
    id: string;
    status?: string;
    completedLessons?: string[];
    statementAccepted?: boolean;
    attendedJp?: number;
    attendancePercentage?: number;
    allEvaluationsCompleted?: boolean;
    evalNarasumberCompleted?: boolean;
    evalOrganizerCompleted?: boolean;
    evalUnderstandingCompleted?: boolean;
    evalSkmCompleted?: boolean;
    trainingType?: string;
    targetOpd?: string | null;
    attendanceThreshold?: number;
    certificateEnabled?: boolean;
}

interface LearnClientProps {
    course: Course;
    courseContent: Module[];
    session: UserSession;
    enrollment: EnrollmentProps | null;
}

export default function LearnClient({ course, courseContent, session, enrollment }: LearnClientProps) {
    const [activeLessonId, setActiveLessonId] = useState<string | null>(() => {
        const firstUnlocked = courseContent.find((m) => !m.isLocked && m.lessons.length > 0);
        return firstUnlocked?.lessons[0]?.id || courseContent[0]?.lessons[0]?.id || null;
    });
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(
        courseContent.reduce((acc, mod) => ({ ...acc, [mod.id]: true }), {})
    );
    const [completedLessons, setCompletedLessons] = useState<Record<string, boolean>>(() =>
        Object.fromEntries((enrollment?.completedLessons || []).map((lessonId) => [lessonId, true]))
    );
    const [attendedLessons, setAttendedLessons] = useState<Record<string, boolean>>({});
    const [statementAccepted, setStatementAccepted] = useState(Boolean(enrollment?.statementAccepted));
    const user = session.user;

    const isClassical =
        course.trainingType === "classical_facilitation" ||
        enrollment?.trainingType === "classical_facilitation";

    useEffect(() => {
        if (!isClassical) return;
        let active = true;
        getMaterialAttendances(course.id).then((res) => {
            if (active && res.success && Array.isArray(res.attendedLessonIds)) {
                setAttendedLessons(
                    Object.fromEntries(res.attendedLessonIds.map((id) => [id, true]))
                );
            }
        });
        return () => {
            active = false;
        };
    }, [course.id, isClassical]);

    // Gating Evaluasi: Hanya dapat diakses setelah seluruh materi pada modul terakhir dikerjakan/selesai
    const lastModule = courseContent.length > 0 ? courseContent[courseContent.length - 1] : null;
    const isLastModuleCompleted = Boolean(
        lastModule &&
            lastModule.lessons.length > 0 &&
            lastModule.lessons.every((lesson) => completedLessons[lesson.id])
    );
    const isEvaluationUnlocked =
        isLastModuleCompleted || session.user.role === "admin" || session.user.role === "instructor";

    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(
        Boolean(isClassical && !enrollment?.statementAccepted && session.user.role === "student")
    );
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);

    const [requestedEvalStage, setRequestedEvalStage] = useState<
        "narasumber" | "organizer" | "understanding" | "skm" | null
    >(null);
    const [attendanceStats, setAttendanceStats] = useState({
        attendedJp: Number(enrollment?.attendedJp || 0),
        attendancePercentage: Number(enrollment?.attendancePercentage || 0),
        allEvaluationsCompleted: Boolean(enrollment?.allEvaluationsCompleted),
    });

    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        setTouchStartX(touch.clientX);
        setTouchStartY(touch.clientY);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX === null || touchStartY === null) return;
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = Math.abs(touch.clientY - touchStartY);

        if (deltaY < 80) {
            if (deltaX > 40 && !mobileSidebarOpen) {
                setMobileSidebarOpen(true);
            } else if (deltaX < -45 && mobileSidebarOpen) {
                setMobileSidebarOpen(false);
            }
        }
        setTouchStartX(null);
        setTouchStartY(null);
    };

    const scrollToElement = (elementId: string) => {
        setMobileSidebarOpen(false);
        const el = document.getElementById(elementId);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    const toggleModule = (moduleId: string) => {
        setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
    };

    const handleLessonJump = (lesson: Lesson, modIsLocked?: boolean, lockReason?: string | null) => {
        if (modIsLocked) {
            toast.info(lockReason || "Modul ini belum diaktifkan oleh Admin.");
            return;
        }
        setActiveLessonId(lesson.id);
        scrollToElement(`lesson-${lesson.id}`);
    };

    const markLessonAsComplete = async (lessonId: string) => {
        setCompletedLessons((prev) => ({ ...prev, [lessonId]: true }));
        toast.success("Materi ditandai selesai!");
        await updateLessonProgress(course.id, lessonId, true);
    };

    const totalLessons = courseContent.reduce((sum, mod) => sum + mod.lessons.length, 0);
    const completedCount = Object.keys(completedLessons).filter((id) => completedLessons[id]).length;
    const progressPercent = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

    const allLessons = courseContent.flatMap((m) => m.lessons);
    const pendingAttendanceCount = isClassical
        ? allLessons.filter((l) => l.hasAttendance !== false && !attendedLessons[l.id]).length
        : 0;

    // Eligibility sertifikat real-time
    const quizLessons = allLessons.filter((l) => l.type === "quiz");
    const allQuizzesPassed =
        quizLessons.length === 0 ? true : quizLessons.every((l) => Boolean(completedLessons[l.id]));
    const attendanceThreshold = Number(
        enrollment?.attendanceThreshold ?? course.attendanceThreshold ?? 80
    );
    const isAttendanceSufficient = attendanceStats.attendancePercentage >= attendanceThreshold;
    const isCertificateFeatureEnabled =
        enrollment?.certificateEnabled ?? course.certificateEnabled ?? true;

    const isEligibleForCertificate =
        allQuizzesPassed &&
        (!isClassical
            ? progressPercent === 100
            : isAttendanceSufficient && attendanceStats.allEvaluationsCompleted && statementAccepted);

    const canOpenCertificate =
        Boolean(enrollment?.id) && Boolean(isCertificateFeatureEnabled) && isEligibleForCertificate;

    const getYoutubeEmbedUrl = (url: string | null) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
    };

    const cleanLessonTitle = (title: string, type: string) => {
        const lowerTitle = title.toLowerCase();
        if (type === "quiz" && (lowerTitle === "kuis" || lowerTitle === "quiz")) {
            return "Uji Pemahaman / Evaluasi";
        }
        if (type === "file" && lowerTitle.endsWith(".pdf")) {
            return title.slice(0, -4).replace(/_/g, " ");
        }
        return title.replace(/_/g, " ");
    };

    const getLessonTypeLabel = (type: string) => {
        switch (type) {
            case "video":
                return "Video";
            case "quiz":
                return "Quiz";
            case "file":
                return "Dokumen / File";
            default:
                return "Bacaan";
        }
    };

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="h-screen overflow-hidden bg-oxford-50 dark:bg-oxford-950 flex flex-col"
        >
            {/* Top Bar */}
            <div className="bg-oxford-950 text-white h-14 px-3 md:px-6 flex items-center justify-between border-b border-oxford-800 sticky top-0 z-40 gap-2">
                <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                    className="md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-oxford-800 hover:bg-oxford-700 text-gold-400 text-xs font-bold shrink-0 border border-gold-500/30 active:scale-95 transition-all"
                    aria-label="Buka Menu Kurikulum & Evaluasi"
                >
                    {mobileSidebarOpen ? <X size={15} /> : <ChevronRight size={15} className="animate-pulse" />}
                    <span>Menu</span>
                </button>
                <Link
                    href={`/courses/${course.id}`}
                    className="flex items-center text-oxford-300 hover:text-white transition-colors mr-1 md:mr-4 shrink-0"
                >
                    <ChevronLeft size={20} className="mr-0.5 md:mr-1" />
                    <span className="hidden sm:inline text-sm font-sans font-medium">Kembali ke Kursus</span>
                </Link>
                <div className="w-px h-6 bg-oxford-800 mx-2 hidden sm:block" />
                <h1 className="text-sm md:text-base font-serif font-bold truncate flex-1">
                    {course.title}
                </h1>

                {isClassical && (
                    <button
                        type="button"
                        onClick={() => setIsAttendanceModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gold-500 hover:bg-gold-400 text-oxford-950 transition-colors shadow-xs shrink-0 active:scale-95"
                        title="Isi presensi materi (Kode Presensi / Scan QR)"
                    >
                        <QrCode size={14} className="stroke-[2.5]" />
                        <span className="hidden sm:inline">Presensi</span>
                        {pendingAttendanceCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-crimson-600 text-white text-[10px] font-extrabold">
                                {pendingAttendanceCount}
                            </span>
                        )}
                    </button>
                )}

                {enrollment?.id && (
                    <button
                        type="button"
                        onClick={() => scrollToElement("section-sertifikat")}
                        className="hidden sm:inline-flex items-center gap-2 rounded-full border border-oxford-700 px-3 py-1.5 text-xs font-bold text-oxford-200 transition-colors hover:border-gold-500 hover:text-gold-400 shrink-0"
                    >
                        <Award size={15} /> Sertifikat
                    </button>
                )}

                <div className="flex items-center ml-2 md:ml-4 gap-3 shrink-0">
                    <div className="text-right mr-1 hidden md:block">
                        <div className="text-[11px] text-oxford-400 font-sans">Progress</div>
                        <div className="text-sm font-bold font-sans">{progressPercent}%</div>
                    </div>
                    <div className="w-20 md:w-24 h-2 bg-oxford-800 rounded-full overflow-hidden hidden sm:block">
                        <motion.div
                            className="h-full bg-gold-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <div className="shrink-0">
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden relative">
                {mobileSidebarOpen && (
                    <div
                        onClick={() => setMobileSidebarOpen(false)}
                        className="fixed inset-0 top-14 bg-black/50 z-30 md:hidden"
                    />
                )}

                {/* Sidebar - Daftar Lompat Materi, Evaluasi & Sertifikat */}
                <div
                    className={`w-80 max-w-[85vw] md:w-80 lg:w-96 bg-white dark:bg-[#161B2A] border-r border-oxford-200 dark:border-oxford-700 flex-shrink-0 flex flex-col md:static fixed inset-y-0 top-14 md:top-0 left-0 z-40 md:z-0 transform transition-transform duration-300 md:translate-x-0 ${
                        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <div className="p-4 border-b border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-950 flex items-center justify-between">
                        <div>
                            <h2 className="font-sans font-bold text-oxford-900 dark:text-white text-sm">
                                Daftar Isi Pembelajaran
                            </h2>
                            <p className="text-[11px] text-oxford-500 dark:text-oxford-400 mt-0.5">
                                {completedCount}/{totalLessons} materi selesai
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMobileSidebarOpen(false)}
                            className="md:hidden p-1 text-oxford-500 hover:text-oxford-800 dark:hover:text-white"
                            aria-label="Tutup Menu"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {courseContent.map((module) => {
                            const isExpanded = !!expandedModules[module.id];
                            const modCompletedCount = module.lessons.filter((l) => completedLessons[l.id]).length;
                            const isModAllDone =
                                module.lessons.length > 0 && modCompletedCount === module.lessons.length;

                            return (
                                <div
                                    key={module.id}
                                    className="border-b border-oxford-100 dark:border-oxford-800 last:border-0"
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleModule(module.id)}
                                        className={`w-full text-left px-5 py-3.5 flex items-center justify-between transition-all ${
                                            isModAllDone
                                                ? "bg-emerald-50/60 dark:bg-emerald-950/20"
                                                : "hover:bg-oxford-50 dark:hover:bg-oxford-900"
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0 pr-2">
                                            <h3 className="font-sans font-bold text-sm truncate text-oxford-900 dark:text-white">
                                                {module.title}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span
                                                    className={`text-[10px] font-sans font-bold px-1.5 py-0.5 rounded ${
                                                        isModAllDone
                                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                                                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                                    }`}
                                                >
                                                    {modCompletedCount}/{module.lessons.length} Selesai
                                                </span>
                                                {module.isLocked && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                                                        <Lock size={10} /> Terkunci
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronUp size={16} className="text-oxford-400" />
                                        ) : (
                                            <ChevronDown size={16} className="text-oxford-400" />
                                        )}
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <ul className="pb-2 px-2 space-y-1">
                                                    {module.lessons.map((lesson) => {
                                                        const isActive = activeLessonId === lesson.id;
                                                        const isCompleted = Boolean(completedLessons[lesson.id]);
                                                    const isAttended = Boolean(attendedLessons[lesson.id]);

                                                        return (
                                                            <li key={lesson.id}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleLessonJump(
                                                                            lesson,
                                                                            module.isLocked,
                                                                            module.lockReason
                                                                        )
                                                                    }
                                                                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start transition-all border ${
                                                                        module.isLocked
                                                                            ? "opacity-60 cursor-not-allowed bg-oxford-50/40 dark:bg-oxford-950/40 border-transparent"
                                                                            : isCompleted
                                                                            ? "bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50"
                                                                            : isActive
                                                                            ? "bg-amber-50 dark:bg-amber-950/25 border-amber-300 dark:border-amber-700"
                                                                            : "bg-white dark:bg-[#161B2A] border-oxford-100 dark:border-oxford-800 hover:border-amber-300 hover:bg-amber-50/40 dark:hover:bg-oxford-900"
                                                                    }`}
                                                                >
                                                                    <div
                                                                        className={`mt-0.5 mr-2.5 flex-shrink-0 ${
                                                                            module.isLocked
                                                                                ? "text-rose-500"
                                                                                : isCompleted
                                                                                ? "text-emerald-600 dark:text-emerald-400"
                                                                                : "text-amber-600 dark:text-amber-400"
                                                                        }`}
                                                                    >
                                                                        {module.isLocked ? (
                                                                            <Lock size={15} />
                                                                        ) : isCompleted ? (
                                                                            <CheckCircle2 size={15} />
                                                                        ) : lesson.type === "video" ? (
                                                                            <PlayCircle size={15} />
                                                                        ) : lesson.type === "quiz" ? (
                                                                            <ClipboardCheck size={15} />
                                                                        ) : lesson.type === "file" ? (
                                                                            <FileUp size={15} />
                                                                        ) : (
                                                                            <FileText size={15} />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div
                                                                            className={`text-xs font-sans truncate font-semibold ${
                                                                                isCompleted
                                                                                    ? "text-emerald-950 dark:text-emerald-100"
                                                                                    : "text-oxford-900 dark:text-white"
                                                                            }`}
                                                                        >
                                                                            {cleanLessonTitle(lesson.title, lesson.type)}
                                                                        </div>
                                                                        <div className="text-[10px] mt-1 flex flex-wrap items-center gap-1.5">
                                                                            <span className="text-oxford-500 dark:text-oxford-400">
                                                                                {getLessonTypeLabel(lesson.type)}
                                                                            </span>
                                                                            <span
                                                                                className={`px-1.5 py-0.5 rounded font-bold ${
                                                                                    isCompleted
                                                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                                                                                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                                                                                }`}
                                                                            >
                                                                                {isCompleted ? "Selesai" : "Belum"}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}

                        {/* Sidebar Evaluasi, Dokumentasi & Sertifikat */}
                        <div className="border-t border-oxford-200 dark:border-oxford-800 bg-oxford-50/50 dark:bg-oxford-950/40">
                            {isClassical && (
                                <>
                                    <div className="px-5 py-2.5 bg-oxford-100/60 dark:bg-oxford-900/60 flex items-center justify-between border-b border-oxford-200 dark:border-oxford-800">
                                        <span className="text-xs font-bold text-oxford-600 dark:text-oxford-400 uppercase tracking-wider">
                                            Evaluasi Pelatihan
                                        </span>
                                        {!isEvaluationUnlocked && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                                <Lock size={10} /> Terkunci
                                            </span>
                                        )}
                                    </div>
                                    <div className="divide-y divide-oxford-100 dark:divide-oxford-800/80">
                                        {[
                                            {
                                                key: "narasumber" as const,
                                                label: "Evaluasi Narasumber",
                                                done:
                                                    Boolean(enrollment?.evalNarasumberCompleted) ||
                                                    attendanceStats.allEvaluationsCompleted,
                                            },
                                            {
                                                key: "organizer" as const,
                                                label: "Evaluasi Penyelenggara",
                                                done:
                                                    Boolean(enrollment?.evalOrganizerCompleted) ||
                                                    attendanceStats.allEvaluationsCompleted,
                                            },
                                            ...(course.evaluationConfig?.enableUnderstanding
                                                ? [
                                                      {
                                                          key: "understanding" as const,
                                                          label: "Evaluasi Pembelajaran",
                                                          done:
                                                              Boolean(enrollment?.evalUnderstandingCompleted) ||
                                                              attendanceStats.allEvaluationsCompleted,
                                                      },
                                                  ]
                                                : []),
                                            {
                                                key: "skm" as const,
                                                label: "SKM",
                                                done:
                                                    Boolean(enrollment?.evalSkmCompleted) ||
                                                    attendanceStats.allEvaluationsCompleted,
                                            },
                                        ].map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => {
                                                    setRequestedEvalStage(item.key);
                                                    scrollToElement("section-evaluasi");
                                                    if (!isEvaluationUnlocked) {
                                                        toast.info(
                                                            `Selesaikan seluruh materi pada modul terakhir (${
                                                                lastModule?.title || "modul penutup"
                                                            }) untuk membuka Evaluasi.`
                                                        );
                                                    }
                                                }}
                                                className={`w-full text-left px-5 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                                                    item.done
                                                        ? "bg-emerald-50/70 dark:bg-emerald-950/20"
                                                        : "hover:bg-white dark:hover:bg-[#161B2A]"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {!isEvaluationUnlocked ? (
                                                        <Lock size={14} className="text-oxford-400 shrink-0" />
                                                    ) : (
                                                        <ClipboardCheck
                                                            size={14}
                                                            className={
                                                                item.done
                                                                    ? "text-emerald-600 shrink-0"
                                                                    : "text-amber-600 shrink-0"
                                                            }
                                                        />
                                                    )}
                                                    <span className="text-xs font-bold truncate text-oxford-900 dark:text-white">
                                                        {item.label}
                                                    </span>
                                                </div>
                                                {item.done ? (
                                                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                                ) : (
                                                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                                        {isEvaluationUnlocked ? "Belum" : "Terkunci"}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            {course.documentationUrl && /^https?:\/\//i.test(course.documentationUrl.trim()) && (
                                <a
                                    href={course.documentationUrl.trim()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full px-5 py-3 border-t border-oxford-100 dark:border-oxford-800/80 flex items-center justify-between gap-2 hover:bg-white dark:hover:bg-[#161B2A] transition-colors"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Camera size={15} className="text-gold-500 shrink-0" />
                                        <span className="text-xs font-bold text-oxford-900 dark:text-white truncate">
                                            Dokumentasi
                                        </span>
                                    </div>
                                    <ExternalLink size={14} className="text-oxford-400 shrink-0" />
                                </a>
                            )}

                            {enrollment?.id && (
                                <button
                                    type="button"
                                    onClick={() => scrollToElement("section-sertifikat")}
                                    className={`w-full px-5 py-3 border-t border-oxford-100 dark:border-oxford-800/80 flex items-center justify-between gap-2 transition-colors ${
                                        canOpenCertificate
                                            ? "bg-emerald-50/80 dark:bg-emerald-950/30 hover:bg-emerald-100/70"
                                            : "hover:bg-white dark:hover:bg-[#161B2A]"
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Award
                                            size={15}
                                            className={canOpenCertificate ? "text-emerald-600 shrink-0" : "text-gold-500 shrink-0"}
                                        />
                                        <span className="text-xs font-bold text-oxford-900 dark:text-white truncate">
                                            Sertifikat Pelatihan
                                        </span>
                                    </div>
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            canOpenCertificate
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-amber-100 text-amber-800"
                                        }`}
                                    >
                                        {canOpenCertificate ? "Siap" : "Terkunci"}
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Area — ONE PAGE (Materi per Modul -> Evaluasi -> Sertifikat) */}
                <div className="flex-1 overflow-y-auto bg-oxford-50/70 dark:bg-oxford-950 scroll-smooth">
                    <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-8 pb-24">
                        {/* Header Ringkasan & Quick-Jump One Page */}
                        <section className="rounded-2xl bg-gradient-to-br from-oxford-950 via-oxford-900 to-oxford-950 text-white p-6 md:p-7 shadow-lg border border-oxford-800">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gold-400 mb-2">
                                        <Sparkles size={13} /> Halaman Belajar Terpadu (Single Page)
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-serif font-bold leading-snug">
                                        {course.title}
                                    </h2>
                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                            Hijau: Sudah Dibaca / Selesai ({completedCount}/{totalLessons})
                                        </span>
                                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                                            Kuning: Belum Dikerjakan ({Math.max(0, totalLessons - completedCount)})
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => scrollToElement("section-materi")}
                                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    >
                                        <BookOpen size={14} className="text-gold-400" /> Materi
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => scrollToElement("section-evaluasi")}
                                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    >
                                        <ClipboardCheck size={14} className="text-gold-400" /> Evaluasi
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => scrollToElement("section-sertifikat")}
                                        className="px-3.5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-oxford-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    >
                                        <Award size={14} /> Sertifikat
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* BAGIAN 1: SELURUH MATERI PER MODUL */}
                        <section id="section-materi" className="space-y-6 scroll-mt-6">
                            {courseContent.map((module, modIndex) => {
                                const modDoneCount = module.lessons.filter((l) => completedLessons[l.id]).length;
                                const isModAllDone =
                                    module.lessons.length > 0 && modDoneCount === module.lessons.length;
                                const modAttendanceLessons = isClassical
                                    ? module.lessons.filter((l) => l.hasAttendance !== false)
                                    : [];
                                const modPendingAttCount = modAttendanceLessons.filter(
                                    (l) => !attendedLessons[l.id]
                                ).length;

                                return (
                                    <div
                                        key={module.id}
                                        className={`rounded-2xl border p-4 md:p-6 shadow-xs space-y-5 transition-colors ${
                                            isModAllDone
                                                ? "border-emerald-200/90 dark:border-emerald-800/70 bg-emerald-50/20 dark:bg-emerald-950/10"
                                                : "border-oxford-200/90 dark:border-oxford-800 bg-white/80 dark:bg-[#141926]/80"
                                        }`}
                                    >
                                        {/* Header Modul */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-oxford-100 dark:border-oxford-800">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span
                                                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                                                        isModAllDone
                                                            ? "bg-emerald-600 text-white"
                                                            : "bg-oxford-900 text-gold-400"
                                                    }`}
                                                >
                                                    {modIndex + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="text-[11px] font-bold uppercase tracking-wider text-oxford-400">
                                                        Modul {modIndex + 1}
                                                    </div>
                                                    <h3 className="text-base md:text-lg font-serif font-bold text-oxford-950 dark:text-white truncate">
                                                        {module.title}
                                                    </h3>
                                                </div>
                                            </div>
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                                                    isModAllDone
                                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                                                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                                                }`}
                                            >
                                                {modDoneCount}/{module.lessons.length} Selesai
                                            </span>
                                        </div>

                                        {/* Kolom Wajib Presensi per Modul */}
                                        {!module.isLocked && modAttendanceLessons.length > 0 && (
                                            <div
                                                className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                                    modPendingAttCount === 0
                                                        ? "bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                                                        : "bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/70 text-amber-950 dark:text-amber-100"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`p-2 rounded-lg shrink-0 ${
                                                            modPendingAttCount === 0
                                                                ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300"
                                                                : "bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300"
                                                        }`}
                                                    >
                                                        <QrCode size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold uppercase tracking-wider">
                                                            {modPendingAttCount === 0
                                                                ? `Presensi Modul Lengkap (${modAttendanceLessons.length}/${modAttendanceLessons.length} Sesi)`
                                                                : `Modul Wajib Presensi (${modPendingAttCount} Sesi Belum Presensi)`}
                                                        </div>
                                                        <p className="text-[11px] text-oxford-600 dark:text-oxford-300 mt-0.5">
                                                            {modPendingAttCount === 0
                                                                ? "Seluruh kehadiran pada modul ini telah tercatat."
                                                                : "Klik tombol di samping untuk mengisi presensi via kode, kamera, atau upload QR."}
                                                        </p>
                                                    </div>
                                                </div>

                                                {modPendingAttCount > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAttendanceModalOpen(true)}
                                                        className="w-full sm:w-auto px-4 py-2 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shrink-0 shadow-md shadow-gold-500/30 animate-[pulse_2.2s_ease-in-out_infinite] active:scale-95 transition-transform"
                                                    >
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-oxford-950/70 opacity-75" />
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-oxford-950" />
                                                        </span>
                                                        <QrCode size={14} />
                                                        <span>Isi Presensi</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Isi Modul */}
                                        {module.isLocked ? (
                                            <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 p-6 text-center">
                                                <Lock className="mx-auto mb-2 text-rose-500" size={26} />
                                                <h4 className="font-serif font-bold text-base text-oxford-950 dark:text-white">
                                                    Modul Belum Diaktifkan
                                                </h4>
                                                <p className="text-xs text-oxford-600 dark:text-oxford-300 mt-1">
                                                    {module.lockReason || "Materi pada modul ini belum dibuka oleh Admin."}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-5">
                                                {module.lessons.map((lesson) => {
                                                    const isCompleted = Boolean(completedLessons[lesson.id]);
                                                    const isAttended = Boolean(attendedLessons[lesson.id]);

                                                    return (
                                                        <article
                                                            key={lesson.id}
                                                            id={`lesson-${lesson.id}`}
                                                            onClick={() => setActiveLessonId(lesson.id)}
                                                            className={`rounded-2xl border-2 overflow-hidden transition-all scroll-mt-20 ${
                                                                isCompleted
                                                                    ? "border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/30 dark:bg-emerald-950/15 shadow-xs"
                                                                    : "border-amber-300/90 dark:border-amber-700/60 bg-white dark:bg-[#161B2A] shadow-sm"
                                                            }`}
                                                        >
                                                            {/* Header Kartu Materi */}
                                                            <div
                                                                className={`px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
                                                                    isCompleted
                                                                        ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70"
                                                                        : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/50"
                                                                }`}
                                                            >
                                                                <div className="min-w-0 flex-1">
                                                                    <h4 className="text-base md:text-lg font-serif font-bold text-oxford-950 dark:text-white">
                                                                        {cleanLessonTitle(lesson.title, lesson.type)}
                                                                    </h4>
                                                                </div>

                                                                <span
                                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                                                                        isCompleted
                                                                            ? "bg-emerald-600 text-white"
                                                                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                                                                    }`}
                                                                >
                                                                    {isCompleted ? (
                                                                        <>
                                                                            <CheckCircle2 size={14} /> Sudah Selesai
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <AlertCircle size={14} /> Belum Selesai
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </div>

                                                            {/* Body Materi */}
                                                            <div className="p-5 space-y-5">
                                                                {/* Konten Video */}
                                                                {lesson.type === "video" && lesson.videoUrl && (
                                                                    <div className="rounded-xl overflow-hidden shadow-md bg-black aspect-video relative">
                                                                        {getYoutubeEmbedUrl(lesson.videoUrl) ? (
                                                                            <iframe
                                                                                src={getYoutubeEmbedUrl(lesson.videoUrl)!}
                                                                                title={lesson.title}
                                                                                className="absolute inset-0 w-full h-full"
                                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                                allowFullScreen
                                                                            />
                                                                        ) : (
                                                                            <video
                                                                                src={lesson.videoUrl}
                                                                                controls
                                                                                className="absolute inset-0 w-full h-full object-contain"
                                                                            >
                                                                                Peramban Anda tidak mendukung pemutar video.
                                                                            </video>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Konten Bacaan */}
                                                                {lesson.type === "reading" && lesson.content && (
                                                                    <div className="rounded-xl p-4 md:p-5 bg-white dark:bg-[#1B2236] border border-oxford-100 dark:border-oxford-800 font-sans">
                                                                        <div
                                                                            className="prose prose-oxford max-w-none text-oxford-800 dark:text-oxford-100 leading-relaxed"
                                                                            dangerouslySetInnerHTML={{
                                                                                __html: lesson.content.replace(/\n/g, "<br/>"),
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Konten File / Dokumen */}
                                                                {lesson.type === "file" && (
                                                                    <DocumentViewer
                                                                        url={lesson.content || ""}
                                                                        title={cleanLessonTitle(lesson.title, lesson.type)}
                                                                    />
                                                                )}

                                                                {/* Konten Quiz */}
                                                                {lesson.type === "quiz" && (
                                                                    <InlineQuizCard
                                                                        lessonId={lesson.id}
                                                                        lessonTitle={cleanLessonTitle(lesson.title, lesson.type)}
                                                                        lessonContent={lesson.content}
                                                                        isCompleted={isCompleted}
                                                                        onPassed={() => void markLessonAsComplete(lesson.id)}
                                                                    />
                                                                )}

                                                                {/* Tombol Tandai Selesai (hanya tampil jika belum selesai) */}
                                                                {lesson.type !== "quiz" && !isCompleted && (
                                                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                                                                        <p className="text-xs text-oxford-500 dark:text-oxford-400">
                                                                            Sudah selesai membaca/menyimak materi ini?
                                                                        </p>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => void markLessonAsComplete(lesson.id)}
                                                                            className="px-6 py-2.5 rounded-full font-sans text-xs font-bold transition-all flex items-center gap-2 shrink-0 bg-gold-500 text-oxford-950 hover:bg-gold-400 shadow-md shadow-gold-500/20 active:scale-95"
                                                                        >
                                                                            <CheckCircle size={16} />
                                                                            Tandai Selesai
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* Diskusi Pelajaran (Collapsible) */}
                                                                <InlineDiscussionPanel
                                                                    lessonId={lesson.id}
                                                                    currentUserId={user.id}
                                                                    currentUserRole={user.role || "student"}
                                                                />
                                                            </div>
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </section>

                        {/* BAGIAN 2: EVALUASI PELATIHAN (INLINE LANGSUNG DI HALAMAN) */}
                        <section
                            id="section-evaluasi"
                            className={`rounded-2xl border p-4 md:p-6 shadow-xs scroll-mt-20 transition-colors ${
                                attendanceStats.allEvaluationsCompleted
                                    ? "border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/30 dark:bg-emerald-950/15"
                                    : "border-oxford-200 dark:border-oxford-800 bg-white dark:bg-[#141926]"
                            }`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-oxford-100 dark:border-oxford-800">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                            attendanceStats.allEvaluationsCompleted
                                                ? "bg-emerald-600 text-white"
                                                : "bg-oxford-900 text-gold-400"
                                        }`}
                                    >
                                        <ClipboardCheck size={18} />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-oxford-400">
                                            Tahap Evaluasi Pelatihan
                                        </div>
                                        <h3 className="text-lg font-serif font-bold text-oxford-950 dark:text-white">
                                            Evaluasi Narasumber, Penyelenggara &amp; Survei SKM
                                        </h3>
                                    </div>
                                </div>
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        attendanceStats.allEvaluationsCompleted
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                                            : isEvaluationUnlocked
                                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                                            : "bg-oxford-100 text-oxford-600 dark:bg-oxford-800 dark:text-oxford-300"
                                    }`}
                                >
                                    {attendanceStats.allEvaluationsCompleted
                                        ? "Evaluasi Tuntas"
                                        : isEvaluationUnlocked
                                        ? "Siap Diisi"
                                        : "Terkunci"}
                                </span>
                            </div>

                            {!isEvaluationUnlocked ? (
                                <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 p-6 text-center">
                                    <Lock className="mx-auto mb-2 text-amber-600" size={26} />
                                    <h4 className="font-serif font-bold text-base text-oxford-950 dark:text-white">
                                        Evaluasi Belum Terbuka
                                    </h4>
                                    <p className="text-xs text-oxford-600 dark:text-oxford-300 mt-1 max-w-lg mx-auto">
                                        Silakan selesaikan seluruh materi pada modul terakhir (
                                        <strong>{lastModule?.title || "modul penutup"}</strong>) di atas terlebih dahulu
                                        untuk membuka formulir evaluasi pelatihan.
                                    </p>
                                </div>
                            ) : (
                                <FourStageEvaluationWizard
                                    courseId={course.id}
                                    courseTitle={course.title}
                                    evaluationConfig={course.evaluationConfig}
                                    deliveryMode={course.deliveryMode || "daring"}
                                    requestedStage={requestedEvalStage}
                                    sessions={allLessons.map((l) => ({
                                        id: l.id,
                                        title: l.title,
                                        narasumberName: l.narasumberName,
                                        jp: l.jp,
                                    }))}
                                    onEvaluationsComplete={() => {
                                        setAttendanceStats((prev) => ({
                                            ...prev,
                                            allEvaluationsCompleted: true,
                                        }));
                                        toast.success("Rangkaian evaluasi 4 tahap tuntas!");
                                    }}
                                />
                            )}
                        </section>

                        {/* BAGIAN 3: SERTIFIKAT PELATIHAN (PALING BAWAH) */}
                        <section
                            id="section-sertifikat"
                            className={`rounded-2xl border-2 p-5 md:p-7 shadow-sm scroll-mt-20 transition-colors ${
                                canOpenCertificate
                                    ? "border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-green-50/60 dark:from-emerald-950/40 dark:to-green-950/20"
                                    : "border-amber-300/80 dark:border-amber-700/60 bg-white dark:bg-[#141926]"
                            }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                                <div className="flex items-start gap-4">
                                    <div
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                            canOpenCertificate
                                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                        }`}
                                    >
                                        <Award size={24} />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-oxford-400">
                                            Tahap Akhir · Sertifikat Resmi
                                        </div>
                                        <h3 className="text-lg md:text-xl font-serif font-bold text-oxford-950 dark:text-white">
                                            {canOpenCertificate
                                                ? "Selamat! Sertifikat Pelatihan Siap Diunduh"
                                                : "Sertifikat Pelatihan Belum Terbuka"}
                                        </h3>
                                        <p className="text-xs md:text-sm text-oxford-600 dark:text-oxford-300 mt-1">
                                            {canOpenCertificate
                                                ? "Seluruh persyaratan materi, kuis, dan evaluasi telah terpenuhi."
                                                : "Lengkapi seluruh checklist persyaratan di bawah ini untuk mengunduh sertifikat Anda."}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 shrink-0">
                                    {canOpenCertificate && enrollment?.id ? (
                                        <Link
                                            href={`/dashboard/certificates/${enrollment.id}`}
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                                        >
                                            <Award size={18} />
                                            Lihat / Unduh Sertifikat
                                            <ExternalLink size={15} />
                                        </Link>
                                    ) : isClassical && !statementAccepted ? (
                                        <button
                                            type="button"
                                            onClick={() => setIsVerificationModalOpen(true)}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold-500 hover:bg-gold-400 text-oxford-950 text-xs font-bold shadow-md"
                                        >
                                            Verifikasi Data Profil
                                        </button>
                                    ) : null}

                                    {enrollment?.id && (
                                        <Link
                                            href={`/dashboard/courses/${enrollment.id}/progress`}
                                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-oxford-200 dark:border-oxford-700 text-xs font-bold text-oxford-700 dark:text-oxford-200 hover:bg-oxford-50 dark:hover:bg-oxford-900"
                                        >
                                            <ClipboardCheck size={14} /> Detail Progres
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {/* Checklist Syarat Sertifikat */}
                            <div className="mt-5 pt-5 border-t border-oxford-200/70 dark:border-oxford-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div
                                    className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                                        progressPercent === 100
                                            ? "bg-emerald-100/70 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                                            : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200"
                                    }`}
                                >
                                    {progressPercent === 100 ? (
                                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                    ) : (
                                        <AlertCircle size={16} className="text-amber-600 shrink-0" />
                                    )}
                                    <span>
                                        Materi: <strong>{progressPercent}%</strong>
                                    </span>
                                </div>

                                <div
                                    className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                                        allQuizzesPassed
                                            ? "bg-emerald-100/70 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                                            : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200"
                                    }`}
                                >
                                    {allQuizzesPassed ? (
                                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                    ) : (
                                        <AlertCircle size={16} className="text-amber-600 shrink-0" />
                                    )}
                                    <span>
                                        Kuis: <strong>{allQuizzesPassed ? "Lulus" : "Belum Lulus"}</strong>
                                    </span>
                                </div>

                                {isClassical && (
                                    <>
                                        <div
                                            className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                                                isAttendanceSufficient
                                                    ? "bg-emerald-100/70 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                                                    : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200"
                                            }`}
                                        >
                                            {isAttendanceSufficient ? (
                                                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                            ) : (
                                                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                                            )}
                                            <span>
                                                Presensi:{" "}
                                                <strong>
                                                    {attendanceStats.attendancePercentage}%/{attendanceThreshold}%
                                                </strong>
                                            </span>
                                        </div>

                                        <div
                                            className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                                                attendanceStats.allEvaluationsCompleted && statementAccepted
                                                    ? "bg-emerald-100/70 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                                                    : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200"
                                            }`}
                                        >
                                            {attendanceStats.allEvaluationsCompleted && statementAccepted ? (
                                                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                            ) : (
                                                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                                            )}
                                            <span>
                                                Evaluasi &amp; Data:{" "}
                                                <strong>
                                                    {attendanceStats.allEvaluationsCompleted && statementAccepted
                                                        ? "Lengkap"
                                                        : "Belum Lengkap"}
                                                </strong>
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* Modal Verifikasi Data Profil & Checklist Pernyataan Peserta */}
            <DataVerificationModal
                isOpen={isVerificationModalOpen}
                onClose={() => setIsVerificationModalOpen(false)}
                onSuccess={() => {
                    setIsVerificationModalOpen(false);
                    setStatementAccepted(true);
                    toast.success("Verifikasi data profil tuntas!");
                }}
                courseId={course.id}
                courseTitle={course.title}
                initialProfile={{
                    name: user.name,
                    nip: ((user as Record<string, unknown>).nip as string) || "",
                    instansiAsal: user.instansiAsal || "",
                    jabatan: ((user as Record<string, unknown>).jabatan as string) || "",
                    pangkat: ((user as Record<string, unknown>).pangkat as string) || "",
                    phone: ((user as Record<string, unknown>).phone as string) || "",
                }}
            />

            {/* Persistent Action Widget untuk Presensi QR / Token (Mobile & Laptop) */}
            {isClassical && !isVerificationModalOpen && (
                <MobileAttendanceFAB
                    courseId={course.id}
                    courseTitle={course.title}
                    lessons={allLessons}
                    attendedLessonIds={Object.keys(attendedLessons).filter((k) => attendedLessons[k])}
                    isOpen={isAttendanceModalOpen}
                    onOpenChange={setIsAttendanceModalOpen}
                    onAttendanceSuccess={(att) => {
                        setAttendanceStats((prev) => ({
                            ...prev,
                            attendedJp: att.attendedJp,
                            attendancePercentage: att.attendancePercentage,
                        }));
                        setAttendedLessons((prev) => ({ ...prev, [att.lessonId]: true }));
                        setCompletedLessons((prev) => ({ ...prev, [att.lessonId]: true }));
                    }}
                />
            )}
        </div>
    );
}
