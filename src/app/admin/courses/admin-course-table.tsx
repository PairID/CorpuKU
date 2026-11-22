"use client";

import { useState, useMemo, useEffect } from "react";
import { 
    Edit, Trash2, Layers, Award, Radio, QrCode, ScanLine, 
    UserCheck, BarChart3, Eye, Lock, Shield, Clock, Users, BookOpen
} from "lucide-react";
import Image from "next/image";
import { deleteCourse } from "@/app/actions/courses";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { showToast } from "@/lib/toast";
import CourseEnrollQrModal from "@/components/courses/CourseEnrollQrModal";
import CourseAttendanceQrManagerModal from "@/components/courses/CourseAttendanceQrManagerModal";
import type { AdminCourse } from "./admin-course-controls";

interface AdminCourseTableProps {
    courses: AdminCourse[];
    searchQuery: string;
    statusFilter: string;
    basePath?: string;
    viewMode?: "cards" | "table";
}

export default function AdminCourseTable({ 
    courses, 
    searchQuery, 
    statusFilter, 
    basePath = "/admin",
    viewMode = "cards"
}: AdminCourseTableProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deletedIds, setDeletedIds] = useState<string[]>([]);
    const [qrCourse, setQrCourse] = useState<{ id: string; title: string } | null>(null);
    const [attendanceQrCourse, setAttendanceQrCourse] = useState<{ id: string; title: string } | null>(null);
    
    const router = useRouter();
    const searchParams = useSearchParams();
    const highlightParam = searchParams.get("highlight");
    const [highlightedId, setHighlightedId] = useState<string | null>(highlightParam);

    // Auto-scroll and highlight target course
    useEffect(() => {
        if (highlightParam) {
            setHighlightedId(highlightParam);
            const timer = setTimeout(() => {
                const el = document.getElementById(`course-${highlightParam}`);
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }, 250);

            const clearTimer = setTimeout(() => {
                setHighlightedId(null);
            }, 6000);

            return () => {
                clearTimeout(timer);
                clearTimeout(clearTimer);
            };
        }
    }, [highlightParam]);

    // Client-side filter
    const filteredCourses = useMemo(() => {
        return courses.filter(c => {
            if (deletedIds.includes(c.id)) return false;
            const matchesSearch = searchQuery === "" ||
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.instructorName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.category || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "all" || c.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [courses, deletedIds, searchQuery, statusFilter]);

    const handleDelete = async (courseId: string) => {
        setDeletingId(courseId);
        const result = await deleteCourse(courseId);
        if (result.success) {
            setDeletedIds(prev => [...prev, courseId]);
            setConfirmDeleteId(null);
            showToast.success("Kursus Berhasil Dihapus", "Data kursus telah dihapus dari sistem.");
            router.refresh();
        } else {
            showToast.error("Gagal Menghapus Kursus", result.error || "Gagal menghapus kursus.");
        }
        setDeletingId(null);
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case "active":
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">Aktif (Live)</span>;
            case "draft":
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">Draft</span>;
            case "archived":
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-oxford-100 text-oxford-700 dark:bg-oxford-800 dark:text-oxford-300">Arsip</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-oxford-100 text-oxford-800 dark:bg-oxford-800 dark:text-oxford-200">{status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* ========================================================================= */}
            {/* VIEW MODE 1: KARTU PRATINJAU SISWA (PERSIS YANG DILIHAT PESERTA DI LMS) */}
            {/* ========================================================================= */}
            {viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map(course => {
                        const isHighlighted = highlightedId === course.id;

                        return (
                            <div
                                key={course.id}
                                id={`course-${course.id}`}
                                className={`rounded-2xl border bg-white dark:bg-[#161B2A] overflow-hidden flex flex-col shadow-sm hover:shadow-lg transition-all duration-300 group relative ${
                                    isHighlighted
                                        ? "ring-4 ring-gold-500 border-gold-500 scale-[1.01] shadow-xl shadow-gold-500/20"
                                        : "border-oxford-200 dark:border-oxford-800 hover:border-gold-400"
                                }`}
                            >
                                {/* Thumbnail / Cover (16:9) */}
                                <div className="h-48 bg-oxford-900 relative overflow-hidden shrink-0">
                                    {course.thumbnailUrl ? (
                                        <Image
                                            src={course.thumbnailUrl}
                                            alt={course.title}
                                            fill
                                            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                                            unoptimized
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-oxford-900 via-oxford-800 to-oxford-950 flex flex-col items-center justify-center p-4 text-center">
                                            <BookOpen size={40} className="text-gold-500/40 mb-2" />
                                            <span className="text-xs font-bold text-gold-400/80 uppercase tracking-widest">
                                                {course.category || "CorpuKU Academy"}
                                            </span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-oxford-950/80 via-transparent to-black/30" />

                                    {/* Top Badges */}
                                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                                        <div className="flex items-center gap-1.5">
                                            {statusBadge(course.status)}
                                            {course.accessMode === "passcode" && (
                                                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-oxford-950 font-black text-[10px] flex items-center gap-1 shadow">
                                                    <Lock size={10} /> PIN
                                                </span>
                                            )}
                                            {course.accessMode === "approval" && (
                                                <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-bold text-[10px] flex items-center gap-1 shadow">
                                                    <Shield size={10} /> Persetujuan
                                                </span>
                                            )}
                                        </div>

                                        {/* View as Student Button */}
                                        <Link
                                            href={`/courses/${course.id}`}
                                            target="_blank"
                                            className="p-1.5 rounded-lg bg-black/60 hover:bg-gold-500 hover:text-oxford-950 text-white backdrop-blur-sm text-xs font-bold transition-all flex items-center gap-1 shadow"
                                            title="Buka Halaman Kursus (Tampilan Siswa)"
                                        >
                                            <Eye size={13} />
                                            <span className="text-[11px] hidden sm:inline">Pratinjau</span>
                                        </Link>
                                    </div>

                                    {/* Bottom Overlay on Image: Category & JP */}
                                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white z-10">
                                        <span className="font-semibold bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px]">
                                            {course.category || "Umum"}
                                        </span>
                                        {course.jp && (
                                            <span className="font-bold text-gold-400 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md text-[11px] flex items-center gap-1">
                                                <Clock size={11} /> {course.jp} JP
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Body Information */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="font-bold text-lg text-oxford-900 dark:text-white mb-2 line-clamp-2 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                                        {course.title}
                                    </h3>

                                    <p className="text-xs text-oxford-500 dark:text-oxford-400 line-clamp-2 mb-4 leading-relaxed">
                                        {course.description || "Tidak ada deskripsi kursus yang ditambahkan."}
                                    </p>

                                    {/* Instructor & Student Count */}
                                    <div className="mt-auto pt-3 border-t border-oxford-100 dark:border-oxford-800 flex items-center justify-between text-xs text-oxford-600 dark:text-oxford-300">
                                        <div className="flex items-center gap-1.5 truncate max-w-[55%]">
                                            <span className="text-oxford-400">Oleh:</span>
                                            <span className="font-bold truncate text-oxford-800 dark:text-oxford-200">
                                                {course.instructorName || "Internal BPSDM"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 font-bold text-oxford-900 dark:text-white shrink-0">
                                            <Users size={14} className="text-gold-500" />
                                            <span>{course.studentCount.toLocaleString()} Siswa</span>
                                        </div>
                                    </div>

                                    {/* Pending Approval Alert Button */}
                                    {(course.pendingCount || 0) > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setQrCourse({ id: course.id, title: course.title })}
                                            className="mt-3 w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/50 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                                        >
                                            <UserCheck size={14} className="text-amber-600 dark:text-amber-400 animate-pulse" />
                                            <span>{course.pendingCount} Pendaftaran Menunggu Persetujuan</span>
                                        </button>
                                    )}
                                </div>

                                {/* Management Actions Panel (SELALU TAMPIL) */}
                                <div className="p-3.5 bg-oxford-50 dark:bg-oxford-950/60 border-t border-oxford-200 dark:border-oxford-800">
                                    <div className="text-[11px] font-bold text-oxford-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                                        <span>Aksi Kelola:</span>
                                        <span className="text-[10px] text-oxford-400 font-normal">
                                            ID: {course.id.slice(0, 8)}...
                                        </span>
                                    </div>

                                    {confirmDeleteId === course.id ? (
                                        <div className="flex items-center justify-between gap-2 p-1 bg-crimson-50 dark:bg-crimson-950/40 rounded-xl border border-crimson-200 dark:border-crimson-800">
                                            <span className="text-xs font-bold text-crimson-700 dark:text-crimson-300 pl-2">
                                                Hapus kursus ini?
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handleDelete(course.id)}
                                                    disabled={deletingId === course.id}
                                                    className="px-3 py-1 bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {deletingId === course.id ? "..." : "Ya, Hapus"}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="px-2.5 py-1 bg-oxford-200 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-300 text-xs font-bold rounded-lg hover:bg-oxford-300 transition-colors"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                                            {/* 1. QR Enroll */}
                                            <button
                                                type="button"
                                                onClick={() => setQrCourse({ id: course.id, title: course.title })}
                                                className={`p-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1 relative ${
                                                    (course.pendingCount || 0) > 0
                                                        ? "bg-amber-500 text-oxford-950 ring-2 ring-amber-400 font-black shadow"
                                                        : "bg-white dark:bg-oxford-900 text-oxford-700 dark:text-oxford-200 hover:bg-gold-50 dark:hover:bg-oxford-800 hover:text-gold-600 border border-oxford-200 dark:border-oxford-700"
                                                }`}
                                                title="Pendaftaran Peserta & QR Approval"
                                            >
                                                <QrCode size={16} />
                                                <span className="text-[9px] font-bold">QR Masuk</span>
                                                {(course.pendingCount || 0) > 0 && (
                                                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-crimson-600 text-white text-[9px] font-black flex items-center justify-center">
                                                        {course.pendingCount}
                                                    </span>
                                                )}
                                            </button>

                                            {/* 2. QR Attendance */}
                                            <button
                                                type="button"
                                                onClick={() => setAttendanceQrCourse({ id: course.id, title: course.title })}
                                                className="p-2 rounded-lg bg-white dark:bg-oxford-900 text-oxford-700 dark:text-oxford-200 hover:bg-emerald-50 dark:hover:bg-oxford-800 hover:text-emerald-600 border border-oxford-200 dark:border-oxford-700 transition-all flex flex-col items-center justify-center gap-1"
                                                title="QR Presensi Sesi & Modul"
                                            >
                                                <ScanLine size={16} />
                                                <span className="text-[9px] font-bold">Presensi</span>
                                            </button>

                                            {/* 3. Manage Content */}
                                            <Link
                                                href={`${basePath}/courses/${course.id}/content`}
                                                className="p-2 rounded-lg bg-white dark:bg-oxford-900 text-oxford-700 dark:text-oxford-200 hover:bg-indigo-50 dark:hover:bg-oxford-800 hover:text-indigo-600 border border-oxford-200 dark:border-oxford-700 transition-all flex flex-col items-center justify-center gap-1"
                                                title="Kelola Materi & Kurikulum"
                                            >
                                                <Layers size={16} />
                                                <span className="text-[9px] font-bold">Materi</span>
                                            </Link>

                                            {/* 4. Live Attendance Monitoring */}
                                            <Link
                                                href={`/admin/courses/${course.id}/attendance`}
                                                className="p-2 rounded-lg bg-white dark:bg-oxford-900 text-oxford-700 dark:text-oxford-200 hover:bg-rose-50 dark:hover:bg-oxford-800 hover:text-rose-600 border border-oxford-200 dark:border-oxford-700 transition-all flex flex-col items-center justify-center gap-1"
                                                title="Monitoring Kehadiran Live Peserta"
                                            >
                                                <Radio size={16} />
                                                <span className="text-[9px] font-bold">Monitor</span>
                                            </Link>

                                            {/* 5. Analytics */}
                                            <Link
                                                href={`/admin/courses/${course.id}/analytics`}
                                                className="p-2 rounded-lg bg-white dark:bg-oxford-900 text-oxford-700 dark:text-oxford-200 hover:bg-blue-50 dark:hover:bg-oxford-800 hover:text-blue-600 border border-oxford-200 dark:border-oxford-700 transition-all flex flex-col items-center justify-center gap-1"
                                                title="Grafik Analitik & Retensi"
                                            >
                                                <BarChart3 size={16} />
                                                <span className="text-[9px] font-bold">Analitik</span>
                                            </Link>

                                            {/* 6. Edit Metadata */}
                                            <Link
                                                href={`${basePath}/courses/${course.id}/edit`}
                                                className="p-2 rounded-lg bg-white dark:bg-oxford-900 text-oxford-700 dark:text-oxford-200 hover:bg-gold-50 dark:hover:bg-oxford-800 hover:text-gold-600 border border-oxford-200 dark:border-oxford-700 transition-all flex flex-col items-center justify-center gap-1"
                                                title="Edit Metadata & Pengaturan"
                                            >
                                                <Edit size={16} />
                                                <span className="text-[9px] font-bold">Edit</span>
                                            </Link>

                                            {/* 7. Certificates */}
                                            <Link
                                                href={`/admin/courses/${course.id}/certificates`}
                                                className="p-2 rounded-lg bg-white dark:bg-oxford-900 text-oxford-700 dark:text-oxford-200 hover:bg-emerald-50 dark:hover:bg-oxford-800 hover:text-emerald-600 border border-oxford-200 dark:border-oxford-700 transition-all flex flex-col items-center justify-center gap-1"
                                                title="Penerbitan Sertifikat Resmi"
                                            >
                                                <Award size={16} />
                                                <span className="text-[9px] font-bold">Sertifikat</span>
                                            </Link>

                                            {/* 8. Delete */}
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDeleteId(course.id)}
                                                className="p-2 rounded-lg bg-white dark:bg-oxford-900 text-oxford-700 dark:text-oxford-200 hover:bg-crimson-50 dark:hover:bg-oxford-800 hover:text-crimson-600 border border-oxford-200 dark:border-oxford-700 transition-all flex flex-col items-center justify-center gap-1"
                                                title="Hapus Kursus"
                                            >
                                                <Trash2 size={16} />
                                                <span className="text-[9px] font-bold">Hapus</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filteredCourses.length === 0 && (
                        <div className="col-span-full py-16 text-center bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-800 p-8">
                            <BookOpen size={48} className="mx-auto text-oxford-300 dark:text-oxford-600 mb-3" />
                            <h3 className="text-lg font-bold text-oxford-900 dark:text-white mb-1">
                                Tidak ada kursus ditemukan
                            </h3>
                            <p className="text-sm text-oxford-500 dark:text-oxford-400">
                                {searchQuery || statusFilter !== "all"
                                    ? "Coba ubah kata kunci pencarian atau reset filter status."
                                    : "Belum ada kursus yang terdaftar dalam sistem."}
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                /* ========================================================================= */
                /* VIEW MODE 2: TABEL DATA MANAJEMEN (DENGAN TOMBOL AKSI SELALU TERLIHAT)   */
                /* ========================================================================= */
                <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden flex-1">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-oxford-50 dark:bg-oxford-950 text-xs font-bold text-oxford-600 dark:text-oxford-300 uppercase tracking-wider border-b border-oxford-200 dark:border-oxford-700">
                                    <th className="p-4 pl-6">Detail Kursus</th>
                                    <th className="p-4">Instruktur / Kategori</th>
                                    <th className="p-4">Statistik</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-center">Aksi Manajemen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-oxford-100 dark:divide-oxford-800">
                                {filteredCourses.map(course => {
                                    const isHighlighted = highlightedId === course.id;

                                    return (
                                        <tr 
                                            key={course.id}
                                            id={`course-${course.id}`}
                                            className={`transition-colors ${
                                                isHighlighted
                                                    ? "bg-amber-100/70 dark:bg-amber-950/40 ring-2 ring-gold-500"
                                                    : "hover:bg-oxford-50 dark:hover:bg-oxford-950/50"
                                            }`}
                                        >
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    {course.thumbnailUrl && (
                                                        <div className="w-12 h-8 rounded-lg overflow-hidden relative shrink-0 border border-oxford-200 dark:border-oxford-700 hidden sm:block">
                                                            <Image src={course.thumbnailUrl} alt={course.title} fill sizes="48px" unoptimized className="object-cover" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-sm text-oxford-900 dark:text-white mb-0.5">
                                                            {course.title}
                                                        </p>
                                                        <p className="text-xs text-oxford-500 dark:text-oxford-400">
                                                            Diupdate {new Date(course.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-semibold text-oxford-900 dark:text-white text-sm mb-1">{course.instructorName || "Internal"}</p>
                                                <span className="inline-block px-2 py-0.5 bg-oxford-100 dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-300 rounded text-xs font-semibold uppercase">
                                                    {course.category || "Umum"}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm font-semibold text-oxford-900 dark:text-white">
                                                    {course.studentCount.toLocaleString()}{" "}
                                                    <span className="text-oxford-500 dark:text-oxford-400 font-normal text-xs">Siswa</span>
                                                </p>
                                                {(course.pendingCount || 0) > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setQrCourse({ id: course.id, title: course.title })}
                                                        className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-xs hover:bg-amber-500/30 border border-amber-500/40"
                                                    >
                                                        <UserCheck size={12} />
                                                        <span>{course.pendingCount} Pending</span>
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {statusBadge(course.status)}
                                            </td>
                                            <td className="p-4">
                                                {confirmDeleteId === course.id ? (
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <span className="text-xs text-crimson-600 font-bold">Hapus?</span>
                                                        <button
                                                            onClick={() => handleDelete(course.id)}
                                                            disabled={deletingId === course.id}
                                                            className="px-2.5 py-1 bg-crimson-600 text-white text-xs font-bold rounded-lg hover:bg-crimson-700 disabled:opacity-50 transition-colors"
                                                        >
                                                            {deletingId === course.id ? "..." : "Ya"}
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="px-2 py-1 bg-oxford-100 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-200 text-xs font-bold rounded-lg hover:bg-oxford-200 transition-colors"
                                                        >
                                                            Batal
                                                        </button>
                                                    </div>
                                                ) : (
                                                    /* TOMBOL AKSI SELALU TERLIHAT (TIDAK PERLU HOVER) */
                                                    <div className="flex flex-wrap items-center justify-center gap-1.5 opacity-100">
                                                        <Link
                                                            href={`/courses/${course.id}`}
                                                            target="_blank"
                                                            className="p-1.5 text-oxford-500 hover:text-gold-600 hover:bg-gold-50 dark:hover:bg-oxford-800 rounded-lg transition-colors"
                                                            title="Pratinjau Tampilan Siswa"
                                                        >
                                                            <Eye size={16} />
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={() => setQrCourse({ id: course.id, title: course.title })}
                                                            className={`p-1.5 rounded-lg transition-colors relative ${
                                                                (course.pendingCount || 0) > 0
                                                                    ? "text-amber-800 bg-amber-500/20 border border-amber-500/50"
                                                                    : "text-oxford-500 hover:text-gold-600 hover:bg-gold-50 dark:hover:bg-oxford-800"
                                                            }`}
                                                            title="Persetujuan Peserta & QR Masuk"
                                                        >
                                                            <QrCode size={16} />
                                                            {(course.pendingCount || 0) > 0 && (
                                                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-oxford-950 text-[9px] font-black flex items-center justify-center">
                                                                    {course.pendingCount}
                                                                </span>
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAttendanceQrCourse({ id: course.id, title: course.title })}
                                                            className="p-1.5 text-oxford-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-oxford-800 rounded-lg transition-colors"
                                                            title="QR Presensi Sesi"
                                                        >
                                                            <ScanLine size={16} />
                                                        </button>
                                                        <Link
                                                            href={`${basePath}/courses/${course.id}/content`}
                                                            className="p-1.5 text-oxford-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-oxford-800 rounded-lg transition-colors"
                                                            title="Kelola Konten"
                                                        >
                                                            <Layers size={16} />
                                                        </Link>
                                                        <Link
                                                            href={`/admin/courses/${course.id}/attendance`}
                                                            className="p-1.5 text-oxford-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-oxford-800 rounded-lg transition-colors"
                                                            title="Presensi Live"
                                                        >
                                                            <Radio size={16} />
                                                        </Link>
                                                        <Link
                                                            href={`/admin/courses/${course.id}/analytics`}
                                                            className="p-1.5 text-oxford-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-oxford-800 rounded-lg transition-colors"
                                                            title="Analitik"
                                                        >
                                                            <BarChart3 size={16} />
                                                        </Link>
                                                        <Link
                                                            href={`${basePath}/courses/${course.id}/edit`}
                                                            className="p-1.5 text-oxford-500 hover:text-gold-600 hover:bg-gold-50 dark:hover:bg-oxford-800 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </Link>
                                                        <Link
                                                            href={`/admin/courses/${course.id}/certificates`}
                                                            className="p-1.5 text-oxford-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-oxford-800 rounded-lg transition-colors"
                                                            title="Sertifikat"
                                                        >
                                                            <Award size={16} />
                                                        </Link>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(course.id)}
                                                            className="p-1.5 text-oxford-500 hover:text-crimson-600 hover:bg-crimson-50 dark:hover:bg-oxford-800 rounded-lg transition-colors"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredCourses.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-oxford-500 dark:text-oxford-400 italic">
                                            {searchQuery || statusFilter !== "all"
                                                ? "Tidak ada kursus yang cocok dengan filter."
                                                : "Belum ada kursus yang terdaftar."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination / Summary Bar */}
            <div className="p-4 rounded-xl border border-oxford-200 dark:border-oxford-800 flex items-center justify-between text-xs text-oxford-600 dark:text-oxford-400 bg-white dark:bg-[#161B2A] shadow-sm">
                <p>Menampilkan <span className="font-bold text-oxford-900 dark:text-white">{filteredCourses.length}</span> dari <span className="font-bold text-oxford-900 dark:text-white">{courses.length}</span> kursus total</p>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Sinkronisasi Real-time</span>
                </div>
            </div>

            {/* QR Modals */}
            {qrCourse && (
                <CourseEnrollQrModal
                    courseId={qrCourse.id}
                    courseTitle={qrCourse.title}
                    onClose={() => setQrCourse(null)}
                />
            )}

            {attendanceQrCourse && (
                <CourseAttendanceQrManagerModal
                    courseId={attendanceQrCourse.id}
                    courseTitle={attendanceQrCourse.title}
                    onClose={() => setAttendanceQrCourse(null)}
                />
            )}
        </div>
    );
}
