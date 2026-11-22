"use client";

import Link from "next/link";
import Image from "next/image";
import { 
    BookOpen, Trophy, Clock, CheckCircle, CheckCircle2, 
    ArrowRight, Star, Crown, Zap, ShieldCheck, 
    FileText, Award, QrCode, Sparkles, ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { getUserGamification } from "@/app/actions/gamification";
import { UserSidebar } from "@/components/layout/UserSidebar";

interface EnrolledCourse {
    id: string;
    courseId?: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    enrolledAt: string;
    progress?: number;
    status?: 'in_progress' | 'completed';
    provider?: string;
    trainingType?: string;
    deliveryMode?: string;
    statementAccepted?: boolean;
    attendedJp?: number;
    attendancePercentage?: number;
    attendanceThreshold?: number;
    allEvaluationsCompleted?: boolean;
    evalNarasumberCompleted?: boolean;
    evalOrganizerCompleted?: boolean;
    evalUnderstandingCompleted?: boolean;
    evalSkmCompleted?: boolean;
    certificateEnabled?: boolean;
}

export interface UserSession {
    user: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
        role?: "student" | "instructor" | "admin";
        instansiAsal?: string;
        nip?: string;
        jabatan?: string;
        pangkat?: string;
        phone?: string;
    };
}

export default function DashboardClient({
    enrollments,
    session
}: {
    enrollments: EnrolledCourse[],
    session: UserSession
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    type Badge = { id: string; name: string; description: string; icon?: string };
    const [gamification, setGamification] = useState<{ points: number; badges: Badge[] }>({ points: 0, badges: [] });
    useEffect(() => {
        const fetchGamification = async (uid: string) => {
            const data = await getUserGamification(uid);
            setGamification(data);
        };
        if (session.user.id) fetchGamification(session.user.id);
    }, [session.user.id]);

    const filteredEnrollments = enrollments;
    const displayUser = session.user;

    // Tentukan pelatihan aktif utama untuk panduan langkah (Journey Stepper)
    const activeCourse = filteredEnrollments.find(e => e.status !== 'completed') || filteredEnrollments[0];

    // Hitung status journey untuk pelatihan aktif
    const getActiveCourseJourney = () => {
        if (!activeCourse) return null;

        const isClassical = activeCourse.trainingType === "classical_facilitation";
        const threshold = activeCourse.attendanceThreshold || 80;
        const attPct = activeCourse.attendancePercentage || 0;
        const isAttendanceSufficient = attPct >= threshold;
        const allEvals = Boolean(activeCourse.allEvaluationsCompleted);
        const statementAccepted = Boolean(activeCourse.statementAccepted);

        // Hitung berapa tahap evaluasi selesai (dari 4 tahap)
        const evalsDone = [
            activeCourse.evalNarasumberCompleted,
            activeCourse.evalOrganizerCompleted,
            activeCourse.evalUnderstandingCompleted,
            activeCourse.evalSkmCompleted
        ].filter(Boolean).length;

        const isFullyCompleted = activeCourse.status === "completed" || 
            (isClassical ? (isAttendanceSufficient && allEvals && statementAccepted) : ((activeCourse.progress || 0) === 100));

        let currentStepNum = 1;
        let nextAction = {
            badge: "Langkah 1: Akses Kelas",
            title: "Mulai Masuk ke Kelas Pelatihan",
            desc: "Buka materi dan sesi kelas Anda.",
            ctaText: "Buka Kelas Sekarang",
            ctaHref: `/learn/${activeCourse.courseId || activeCourse.id}`,
            ctaIcon: <ArrowRight size={18} />
        };

        if (isClassical) {
            if (!isAttendanceSufficient) {
                currentStepNum = 2;
                nextAction = {
                    badge: "Langkah Anda Saat Ini: Presensi Sesi",
                    title: "Lakukan Presensi Kehadiran Sesi Pelatihan",
                    desc: `Presensi kehadiran Anda saat ini ${attPct}% (Syarat minimal kelulusan ${threshold}% JP). Masuk ke kelas untuk scan QR Code presensi atau masukkan kode token dari panitia.`,
                    ctaText: "Buka Presensi Sesi Kelas",
                    ctaHref: `/learn/${activeCourse.courseId || activeCourse.id}`,
                    ctaIcon: <QrCode size={18} />
                };
            } else if (!allEvals) {
                currentStepNum = 3;
                nextAction = {
                    badge: "Langkah Anda Saat Ini: Evaluasi Pelatihan",
                    title: "Lengkapi Rangkaian Evaluasi 4 Tahap",
                    desc: `Presensi kehadiran Anda telah mencukupi (${attPct}%). Baru ${evalsDone} dari 4 tahap evaluasi tuntas. Lengkapi evaluasi narasumber, penyelenggara, dan SKM agar sertifikat dapat diterbitkan.`,
                    ctaText: "Isi Evaluasi Pelatihan Sekarang",
                    ctaHref: `/learn/${activeCourse.courseId || activeCourse.id}`,
                    ctaIcon: <FileText size={18} />
                };
            } else if (!statementAccepted) {
                currentStepNum = 3;
                nextAction = {
                    badge: "Langkah Anda Saat Ini: Verifikasi Data Profil",
                    title: "Konfirmasi Kebenaran Data Diri & NIP",
                    desc: "Evaluasi telah tuntas! Silakan lakukan konfirmasi kebenaran data profil dan surat pernyataan keabsahan agar nama & NIP di sertifikat Anda tercetak akurat.",
                    ctaText: "Konfirmasi Data Profil",
                    ctaHref: `/learn/${activeCourse.courseId || activeCourse.id}`,
                    ctaIcon: <ShieldCheck size={18} />
                };
            } else {
                currentStepNum = 4;
                nextAction = {
                    badge: "Pelatihan Selesai! 🎉",
                    title: "Selamat! Seluruh Rangkaian Pelatihan Telah Tuntas",
                    desc: "Semua syarat presensi, evaluasi 4 tahap, dan verifikasi data telah terpenuhi. Sertifikat resmi Anda telah diterbitkan dan dapat langsung diunduh.",
                    ctaText: "Lihat & Unduh Sertifikat Resmi",
                    ctaHref: `/dashboard/certificates/${activeCourse.id}`,
                    ctaIcon: <Award size={18} />
                };
            }
        } else {
            // E-Learning
            if ((activeCourse.progress || 0) < 100) {
                currentStepNum = 2;
                nextAction = {
                    badge: "Langkah Anda Saat Ini: Belajar Mandiri",
                    title: `Lanjutkan Pembelajaran Materi (${activeCourse.progress || 0}% Selesai)`,
                    desc: "Selesaikan seluruh modul, bacaan, video, dan kuis pembelajaran untuk memenuhi syarat kelulusan kursus ini.",
                    ctaText: "Lanjutkan Belajar Sekarang",
                    ctaHref: `/learn/${activeCourse.courseId || activeCourse.id}`,
                    ctaIcon: <ArrowRight size={18} />
                };
            } else {
                currentStepNum = 4;
                nextAction = {
                    badge: "Kelas Selesai! 🎉",
                    title: "Selamat! Modul E-Learning Selesai 100%",
                    desc: "Anda telah menuntaskan seluruh materi dan kuis. Sertifikat kelulusan Anda sudah siap untuk diunduh.",
                    ctaText: "Lihat / Unduh Sertifikat",
                    ctaHref: `/dashboard/certificates/${activeCourse.id}`,
                    ctaIcon: <Award size={18} />
                };
            }
        }

        return {
            isClassical,
            threshold,
            attPct,
            isAttendanceSufficient,
            allEvals,
            evalsDone,
            statementAccepted,
            isFullyCompleted,
            currentStepNum,
            nextAction
        };
    };

    const journey = getActiveCourseJourney();

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex">

            {/* SIDEBAR */}
            <UserSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen relative">

                {/* Dashboard Content */}
                <div className="p-6 md:p-8 lg:p-12 max-w-7xl mx-auto w-full">

                    <div className="mb-8">
                        <h2 className="text-3xl font-sans font-bold text-oxford-900 dark:text-white mb-2">
                            Selamat datang kembali, {(displayUser.name || 'User').split(' ')[0]}!
                        </h2>
                        <p className="text-oxford-600 dark:text-oxford-300 font-sans">
                            {filteredEnrollments.length > 0 
                                ? "Pantau progres, presensi, evaluasi, dan sertifikat pelatihan Anda di sini."
                                : "Akses katalog kursus atau scan barcode pendaftaran pelatihan kedinasan Anda."}
                        </p>
                    </div>

                    {/* HERO ACTION / JOURNEY STEPPER FOR ACTIVE COURSE */}
                    {activeCourse && journey && (
                        <div className="mb-10 bg-gradient-to-br from-oxford-950 via-oxford-900 to-[#121624] text-white rounded-3xl p-6 md:p-8 border border-oxford-800 shadow-2xl relative overflow-hidden">
                            {/* Decorative background glow */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                            <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative z-10">
                                {/* Top Badge & Course Title */}
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gold-500/20 text-gold-400 border border-gold-500/30">
                                            <Sparkles size={14} /> Pelatihan Aktif Anda
                                        </span>
                                        <span className="text-xs text-oxford-400 font-medium hidden sm:inline">
                                            {journey.isClassical ? "Pola Klasikal / Tatap Muka" : "Pola E-Learning Mandiri"}
                                        </span>
                                    </div>
                                    <Link 
                                        href={`/dashboard/courses/${activeCourse.id}/progress`}
                                        className="text-xs text-oxford-300 hover:text-gold-400 font-bold transition-colors inline-flex items-center gap-1"
                                    >
                                        Rincian Nilai &amp; Progress <ChevronRight size={14} />
                                    </Link>
                                </div>

                                <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
                                    {activeCourse.title}
                                </h3>

                                {/* Stepper Visual: 4 Langkah Pelatihan */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                                    {/* Step 1: Pendaftaran */}
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-bold text-oxford-400 uppercase tracking-wider">Tahap 1</span>
                                            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-white">Pendaftaran</p>
                                            <p className="text-xs text-emerald-400 font-medium">✓ Terdaftar Resmi</p>
                                        </div>
                                    </div>

                                    {/* Step 2: Presensi atau Materi */}
                                    <div className={`border rounded-2xl p-4 flex flex-col justify-between ${
                                        journey.isClassical
                                            ? journey.isAttendanceSufficient
                                                ? "bg-emerald-950/30 border-emerald-500/40"
                                                : "bg-gold-500/10 border-gold-500/40 ring-1 ring-gold-500/30"
                                            : (activeCourse.progress || 0) === 100
                                                ? "bg-emerald-950/30 border-emerald-500/40"
                                                : "bg-gold-500/10 border-gold-500/40 ring-1 ring-gold-500/30"
                                    }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-bold text-oxford-400 uppercase tracking-wider">Tahap 2</span>
                                            {journey.isClassical ? (
                                                journey.isAttendanceSufficient 
                                                    ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                                                    : <Clock size={18} className="text-gold-400 shrink-0 animate-pulse" />
                                            ) : (
                                                (activeCourse.progress || 0) === 100
                                                    ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                                                    : <Clock size={18} className="text-gold-400 shrink-0" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-white">
                                                {journey.isClassical ? "Presensi Kehadiran" : "Materi Pembelajaran"}
                                            </p>
                                            <p className={`text-xs font-medium ${
                                                journey.isClassical
                                                    ? journey.isAttendanceSufficient ? "text-emerald-400" : "text-gold-400"
                                                    : (activeCourse.progress || 0) === 100 ? "text-emerald-400" : "text-gold-400"
                                            }`}>
                                                {journey.isClassical 
                                                    ? `${journey.attPct}% (Syarat min. ${journey.threshold}%)`
                                                    : `${activeCourse.progress || 0}% Selesai`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Step 3: Evaluasi atau Kuis */}
                                    <div className={`border rounded-2xl p-4 flex flex-col justify-between ${
                                        journey.isClassical
                                            ? journey.allEvals
                                                ? "bg-emerald-950/30 border-emerald-500/40"
                                                : journey.currentStepNum === 3
                                                    ? "bg-gold-500/10 border-gold-500/40 ring-1 ring-gold-500/30"
                                                    : "bg-white/5 border-white/10 opacity-70"
                                            : (activeCourse.progress || 0) === 100
                                                ? "bg-emerald-950/30 border-emerald-500/40"
                                                : "bg-white/5 border-white/10 opacity-70"
                                    }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-bold text-oxford-400 uppercase tracking-wider">Tahap 3</span>
                                            {journey.isClassical ? (
                                                journey.allEvals 
                                                    ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                                                    : <FileText size={18} className="text-oxford-400 shrink-0" />
                                            ) : (
                                                (activeCourse.progress || 0) === 100
                                                    ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                                                    : <FileText size={18} className="text-oxford-400 shrink-0" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-white">
                                                {journey.isClassical ? "Evaluasi 4 Tahap" : "Kuis & Ujian"}
                                            </p>
                                            <p className="text-xs font-medium text-oxford-300">
                                                {journey.isClassical 
                                                    ? `${journey.evalsDone}/4 Tahap Selesai`
                                                    : "Wajib Lulus"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Step 4: Sertifikat Resmi */}
                                    <div className={`border rounded-2xl p-4 flex flex-col justify-between ${
                                        journey.isFullyCompleted
                                            ? "bg-gradient-to-br from-emerald-950/60 to-emerald-900/40 border-emerald-500/60 ring-2 ring-emerald-500/40"
                                            : "bg-white/5 border-white/10 opacity-70"
                                    }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-bold text-oxford-400 uppercase tracking-wider">Tahap 4</span>
                                            {journey.isFullyCompleted ? (
                                                <Award size={20} className="text-gold-400 shrink-0 animate-bounce" />
                                            ) : (
                                                <Award size={18} className="text-oxford-500 shrink-0" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-white">Sertifikat Resmi</p>
                                            <p className={`text-xs font-medium ${journey.isFullyCompleted ? "text-gold-400 font-bold" : "text-oxford-400"}`}>
                                                {journey.isFullyCompleted ? "🎉 Siap Diunduh!" : "Terkunci"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Call to Action Card yang Sangat Jelas */}
                                <div className="bg-oxford-900/90 border border-gold-500/30 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                                    <div className="space-y-1 max-w-2xl">
                                        <div className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gold-500 text-oxford-950 mb-1">
                                            {journey.nextAction.badge}
                                        </div>
                                        <h4 className="text-lg md:text-xl font-bold text-white">
                                            {journey.nextAction.title}
                                        </h4>
                                        <p className="text-sm text-oxford-300 leading-relaxed">
                                            {journey.nextAction.desc}
                                        </p>
                                    </div>
                                    <div className="shrink-0 w-full md:w-auto">
                                        <Link
                                            href={journey.nextAction.ctaHref}
                                            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gold-500 text-oxford-950 font-bold text-base hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/25 active:scale-95"
                                        >
                                            {journey.nextAction.ctaText} {journey.nextAction.ctaIcon}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-oxford-100 dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 rounded-full flex items-center justify-center">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <p className="text-3xl font-sans font-bold text-oxford-900 dark:text-white leading-tight">{filteredEnrollments.length}</p>
                                <p className="text-sm font-sans text-oxford-500 dark:text-oxford-400">Kelas Diikuti</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-gold-50 text-gold-600 rounded-full flex items-center justify-center">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <p className="text-3xl font-sans font-bold text-oxford-900 dark:text-white leading-tight">
                                    {filteredEnrollments.filter(e => e.status === 'completed').length}
                                </p>
                                <p className="text-sm font-sans text-oxford-500 dark:text-oxford-400">Kelas Selesai</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-crimson-50 text-crimson-600 rounded-full flex items-center justify-center">
                                <Trophy size={24} />
                            </div>
                            <div>
                                <p className="text-3xl font-sans font-bold text-oxford-900 dark:text-white leading-tight">
                                    {filteredEnrollments.filter(e => e.status === 'completed').length}
                                </p>
                                <p className="text-sm font-sans text-oxford-500 dark:text-oxford-400">Sertifikat</p>
                            </div>
                        </div>
                        <div className="bg-oxford-900 p-6 rounded-2xl border border-oxford-800 shadow-md flex items-center gap-4 group hover:bg-oxford-800 transition-colors">
                            <div className="w-12 h-12 bg-gold-500 text-oxford-900 dark:text-white rounded-full flex items-center justify-center shadow-lg shadow-gold-500/20">
                                <Star size={24} fill="currentColor" />
                            </div>
                            <div>
                                <p className="text-3xl font-sans font-bold text-gold-500 leading-tight">{gamification.points}</p>
                                <p className="text-sm font-sans text-oxford-400">Poin Belajar</p>
                            </div>
                        </div>
                    </div>

                    {/* Course List */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-sans font-bold text-oxford-900 dark:text-white">Semua Kelas Terdaftar</h3>
                        </div>

                        <div className="space-y-6">
                            {filteredEnrollments.length > 0 ? (
                                filteredEnrollments.map(course => {
                                    const isClassical = course.trainingType === "classical_facilitation";
                                    const isCompleted = course.status === 'completed';

                                    return (
                                        <div key={course.id} className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6 lg:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center hover:border-gold-400 hover:shadow-md transition-all group">
                                            
                                            {/* Left/Middle wrapped in Link */}
                                            <Link href={`/learn/${course.courseId || course.id}`} className="flex flex-col md:flex-row gap-8 flex-1 w-full">
                                                {/* Left: Thumbnail */}
                                                <div className="w-full md:w-64 aspect-video bg-oxford-100 dark:bg-[#161B2A] rounded-xl shrink-0 flex items-center justify-center relative overflow-hidden">
                                                    {course.thumbnailUrl ? (
                                                        <Image src={course.thumbnailUrl} alt={course.title} fill sizes="(min-width: 768px) 256px, 100vw" unoptimized className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="absolute inset-0 bg-mesh opacity-30 group-hover:scale-105 transition-transform duration-500" />
                                                    )}
                                                    {isCompleted && (
                                                        <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10 flex items-center gap-1 shadow-sm">
                                                            <CheckCircle size={12} /> Selesai
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Middle: Info */}
                                                <div className="flex-1 w-full font-sans">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold text-oxford-500 dark:text-oxford-400 uppercase tracking-widest">
                                                            {course.provider || "CorpuKU Academy"}
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-oxford-100 dark:bg-oxford-800 text-oxford-600 dark:text-oxford-300 font-medium">
                                                            {isClassical ? "Klasikal" : "E-Learning"}
                                                        </span>
                                                    </div>

                                                    <h4 className="text-xl font-bold text-oxford-900 dark:text-white mb-3 group-hover:text-gold-600 transition-colors">
                                                        {course.title}
                                                    </h4>

                                                    {/* Classical Specific Badges: Presensi & Evaluasi */}
                                                    {isClassical && (
                                                        <div className="flex flex-wrap items-center gap-2 mb-4">
                                                            <span className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 ${
                                                                (course.attendancePercentage || 0) >= (course.attendanceThreshold || 80)
                                                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                                                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                                            }`}>
                                                                <Clock size={13} /> Presensi: {course.attendancePercentage || 0}%
                                                            </span>
                                                            <span className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 ${
                                                                course.allEvaluationsCompleted
                                                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                                                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                                            }`}>
                                                                <FileText size={13} /> Evaluasi: {course.allEvaluationsCompleted ? "4/4 Lengkap" : "Belum Lengkap"}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-4 text-xs text-oxford-500 dark:text-oxford-400 mb-4">
                                                        <span className="flex items-center gap-1.5">
                                                            <Clock size={14} /> Terdaftar: {new Date(course.enrolledAt).toLocaleDateString('id-ID')}
                                                        </span>
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div className="w-full">
                                                        <div className="flex justify-between text-xs mb-1.5 font-medium">
                                                            <span className={(course.progress || 0) === 100 ? "text-green-600 font-bold" : "text-oxford-700 dark:text-oxford-200"}>
                                                                {isClassical 
                                                                    ? `${course.attendancePercentage || 0}% Kehadiran Sesi`
                                                                    : `${course.progress || 0}% Materi Selesai`}
                                                            </span>
                                                        </div>
                                                        <div className="h-2 w-full bg-oxford-100 dark:bg-[#161B2A] rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${
                                                                    isClassical
                                                                        ? (course.attendancePercentage || 0) >= (course.attendanceThreshold || 80) ? 'bg-green-500' : 'bg-gold-500'
                                                                        : (course.progress || 0) === 100 ? 'bg-green-500' : 'bg-gold-500'
                                                                }`}
                                                                style={{ width: `${Math.min(100, isClassical ? (course.attendancePercentage || 0) : (course.progress || 0))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>

                                            {/* Right: CTA Buttons */}
                                            <div className="w-full md:w-auto shrink-0 flex flex-col gap-3">
                                                {isCompleted ? (
                                                    <Link 
                                                        href={`/dashboard/certificates/${course.id}`} 
                                                        className="w-full md:w-44 py-3 px-6 bg-emerald-600 text-white text-center font-sans font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                                                    >
                                                        <Award size={18} /> Lihat Sertifikat
                                                    </Link>
                                                ) : (
                                                    <Link 
                                                        href={`/learn/${course.courseId || course.id}`} 
                                                        className="w-full md:w-44 py-3 px-6 bg-oxford-900 text-white text-center font-sans font-bold rounded-xl hover:bg-gold-500 hover:text-oxford-950 transition-colors shadow-md flex items-center justify-center gap-2"
                                                    >
                                                        {isClassical ? <QrCode size={18} /> : <ArrowRight size={18} />}
                                                        {isClassical ? "Masuk & Presensi" : "Lanjutkan Belajar"}
                                                    </Link>
                                                )}
                                                <Link 
                                                    href={`/dashboard/courses/${course.id}/progress`} 
                                                    className="w-full md:w-44 py-2.5 px-6 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-200 text-center font-sans font-bold text-xs rounded-xl hover:border-gold-400 hover:text-gold-600 transition-colors"
                                                >
                                                    Progress &amp; Nilai
                                                </Link>
                                            </div>

                                        </div>
                                    );
                                })
                            ) : (
                                <div className="bg-white dark:bg-[#161B2A] rounded-3xl border border-oxford-200 dark:border-oxford-700 border-dashed p-12 text-center">
                                    <BookOpen size={48} className="mx-auto text-oxford-300 dark:text-oxford-600 mb-4" />
                                    <h4 className="text-xl font-sans font-bold text-oxford-900 dark:text-white mb-2">
                                        Belum Terdaftar di Pelatihan Apapun
                                    </h4>
                                    <p className="text-oxford-600 dark:text-oxford-300 mb-6 max-w-md mx-auto text-sm leading-relaxed">
                                        Jika Anda adalah peserta pelatihan kedinasan, silakan scan <strong>QR Code Pendaftaran</strong> atau klik tautan pendaftaran kelas yang dibagikan oleh panitia BPSDM untuk langsung bergabung.
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-3">
                                        <Link href="/search" className="inline-block py-3 px-8 bg-gold-500 text-oxford-950 font-bold rounded-full hover:bg-gold-400 transition-all shadow-md">
                                            Jelajahi Katalog Pelatihan
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Badges Section */}
                        <div className="mt-16">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-sans font-bold text-oxford-900 dark:text-white">Achievement Badges</h3>
                                    <p className="text-sm text-oxford-500 dark:text-oxford-400 mt-1">Lencana yang Anda peroleh dari aktivitas belajar.</p>
                                </div>
                            </div>

                            {gamification.badges.length > 0 ? (
                                <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
                                    {gamification.badges.map((badge) => (
                                        <div key={badge.id} className="bg-white dark:bg-[#161B2A] p-6 rounded-3xl border border-oxford-100 dark:border-oxford-800 shadow-sm flex flex-col items-center text-center group hover:shadow-xl hover:shadow-oxford-200/50 hover:translate-y-[-4px] transition-all duration-300">
                                            <div className="w-16 h-16 bg-gradient-to-br from-gold-400 to-gold-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-gold-500/20 group-hover:scale-110 transition-transform">
                                                {badge.icon === 'Zap' && <Zap size={32} />}
                                                {badge.icon === 'Trophy' && <Trophy size={32} />}
                                                {badge.icon === 'Star' && <Star size={32} fill="currentColor" />}
                                                {badge.icon === 'Crown' && <Crown size={32} />}
                                            </div>
                                            <h4 className="font-bold text-oxford-900 dark:text-white text-sm mb-1">{badge.name}</h4>
                                            <p className="text-[10px] text-oxford-400 leading-tight">{badge.description}</p>
                                            <p className="mt-3 text-[9px] font-bold text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full uppercase tracking-wider italic">Unlocked</p>
                                        </div>
                                    ))}

                                    {/* Locked Badges Hint */}
                                    <div className="bg-oxford-50 dark:bg-oxford-950/50 p-6 rounded-3xl border border-dashed border-oxford-200 dark:border-oxford-700 flex flex-col items-center justify-center text-center opacity-70 grayscale">
                                        <div className="w-12 h-12 bg-oxford-200 dark:bg-oxford-800 text-oxford-400 rounded-full flex items-center justify-center mb-3">
                                            <Star size={24} />
                                        </div>
                                        <p className="text-[10px] font-medium text-oxford-400">Badge Berikutnya Menanti Anda...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 border-dashed p-12 text-center">
                                    <Trophy size={40} className="mx-auto text-oxford-200 mb-3" />
                                    <h4 className="text-lg font-sans font-medium text-oxford-500 dark:text-oxford-400">Belum Ada Lencana</h4>
                                    <p className="text-xs text-oxford-400">Selesaikan materi untuk mendapatkan lencana pertama Anda!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </main>

        </div>
    );
}
