"use client";

import { useState, useMemo, useEffect } from "react";
import { Edit, Trash2, Layers, Award, Radio, QrCode, ScanLine, UserCheck, BarChart3 } from "lucide-react";
import { deleteCourse } from "@/app/actions/courses";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { showToast } from "@/lib/toast";
import CourseEnrollQrModal from "@/components/courses/CourseEnrollQrModal";
import CourseAttendanceQrManagerModal from "@/components/courses/CourseAttendanceQrManagerModal";

interface AdminCourse {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    status: string;
    instructorName: string | null;
    studentCount: number;
    pendingCount?: number;
    accessMode?: string;
    createdAt: string;
    updatedAt: string;
}

interface AdminCourseTableProps {
    courses: AdminCourse[];
    searchQuery: string;
    statusFilter: string;
    basePath?: string;
}

export default function AdminCourseTable({ courses, searchQuery, statusFilter, basePath = "/admin" }: AdminCourseTableProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deletedIds, setDeletedIds] = useState<string[]>([]);
    const [qrCourse, setQrCourse] = useState<{ id: string; title: string } | null>(null);
    const [attendanceQrCourse, setAttendanceQrCourse] = useState<{ id: string; title: string } | null>(null);
    const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Client-side filter
    const filteredCourses = useMemo(() => {
        return courses.filter(c => {
            if (deletedIds.includes(c.id)) return false;
            const matchesSearch = searchQuery === "" ||
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.instructorName || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "all" || c.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [courses, deletedIds, searchQuery, statusFilter]);

    // Handle deep link row highlight & scroll
    useEffect(() => {
        const paramId = searchParams.get("highlight");
        const hashId = typeof window !== "undefined" ? window.location.hash.replace("#course-", "") : "";
        const targetId = paramId || hashId;

        if (targetId) {
            setActiveHighlight(targetId);

            // Wait a tick for rendering, then scroll into view smoothly
            const timer = setTimeout(() => {
                const isMobile = window.innerWidth < 1024;
                const elementId = isMobile ? `course-${targetId}-mobile` : `course-${targetId}`;
                const el = document.getElementById(elementId) || document.getElementById(`course-${targetId}`);
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }, 250);

            // Fade highlight after 5 seconds
            const fadeTimer = setTimeout(() => {
                setActiveHighlight(null);
            }, 5000);

            return () => {
                clearTimeout(timer);
                clearTimeout(fadeTimer);
            };
        }
    }, [searchParams]);

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

    const statusColor = (status: string) => {
        switch (status) {
            case "active": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
            case "draft": return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
            case "archived": return "bg-oxford-100 dark:bg-[#161B2A] text-oxford-600 dark:text-oxford-300";
            default: return "bg-oxford-100 dark:bg-[#161B2A] text-oxford-800 dark:text-oxford-100";
        }
    };

    return (
        <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden flex-1">
            {/* MOBILE CARDS VIEW (Visible on screens < lg) */}
            <div className="block lg:hidden divide-y divide-oxford-100 dark:divide-oxford-800">
                {filteredCourses.map(course => {
                    const isHighlighted = activeHighlight === course.id;
                    return (
                        <div
                            key={course.id}
                            id={`course-${course.id}-mobile`}
                            className={`p-4 sm:p-5 flex flex-col gap-3 transition-all duration-500 ${
                                isHighlighted
                                    ? "ring-2 ring-gold-500 bg-gold-50/90 dark:bg-gold-500/15 shadow-md"
                                    : "bg-white dark:bg-[#161B2A] hover:bg-oxford-50/50 dark:hover:bg-oxford-950/40"
                            }`}
                        >
                            {/* Card Header: Title & Status */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-base text-oxford-900 dark:text-white leading-snug mb-1">
                                        {course.title}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-oxford-500 dark:text-oxford-400">
                                        <span className="font-medium text-oxford-700 dark:text-oxford-300">
                                            {course.instructorName || "Instruktur Belum Ditentukan"}
                                        </span>
                                        <span>•</span>
                                        <span className="px-2 py-0.5 rounded bg-oxford-100 dark:bg-oxford-800 font-semibold uppercase text-[10px]">
                                            {course.category || "Umum"}
                                        </span>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize shrink-0 ${statusColor(course.status)}`}>
                                    {course.status}
                                </span>
                            </div>

                            {/* Stats Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 bg-oxford-50 dark:bg-oxford-950/60 rounded-xl text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-oxford-900 dark:text-white">{course.studentCount.toLocaleString()}</span>
                                    <span className="text-oxford-500 dark:text-oxford-400">Siswa Terdaftar</span>
                                </div>
                                {(course.pendingCount || 0) > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setQrCourse({ id: course.id, title: course.title })}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition-all border border-amber-500/40 shadow-xs cursor-pointer"
                                    >
                                        <UserCheck size={14} className="text-amber-600 dark:text-amber-400" />
                                        <span>{course.pendingCount} Menunggu</span>
                                    </button>
                                )}
                            </div>

                            {/* Always-Visible Action Bar */}
                            <div className="flex items-center justify-between pt-2 border-t border-oxford-100 dark:border-oxford-800/80">
                                <span className="text-[11px] font-bold text-oxford-400 uppercase tracking-wider">Aksi:</span>
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                    {confirmDeleteId === course.id ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-crimson-600 font-bold">Hapus kursus?</span>
                                            <button
                                                onClick={() => handleDelete(course.id)}
                                                disabled={deletingId === course.id}
                                                className="px-2.5 py-1 bg-crimson-600 text-white text-xs font-bold rounded-lg hover:bg-crimson-700 disabled:opacity-50 cursor-pointer"
                                            >
                                                {deletingId === course.id ? "..." : "Ya"}
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="px-2.5 py-1 bg-oxford-100 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-300 text-xs font-bold rounded-lg cursor-pointer"
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setQrCourse({ id: course.id, title: course.title })}
                                                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                                    (course.pendingCount || 0) > 0
                                                        ? "text-amber-700 dark:text-amber-300 bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30"
                                                        : "bg-oxford-100 dark:bg-oxford-800/80 text-oxford-600 dark:text-oxford-300 hover:text-gold-600 hover:bg-gold-50"
                                                }`}
                                                title="Pendaftaran Peserta & QR Live"
                                            >
                                                {(course.pendingCount || 0) > 0 ? <UserCheck size={16} className="text-amber-600" /> : <QrCode size={16} />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAttendanceQrCourse({ id: course.id, title: course.title })}
                                                className="p-2 rounded-lg bg-oxford-100 dark:bg-oxford-800/80 text-oxford-600 dark:text-oxford-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                                title="Manajemen QR Presensi Modul"
                                            >
                                                <ScanLine size={16} />
                                            </button>
                                            <Link
                                                href={`${basePath}/courses/${course.id}/content`}
                                                className="p-2 rounded-lg bg-oxford-100 dark:bg-oxford-800/80 text-oxford-600 dark:text-oxford-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                title="Kelola Konten/Materi"
                                            >
                                                <Layers size={16} />
                                            </Link>
                                            <Link
                                                href={`/admin/courses/${course.id}/attendance`}
                                                className="p-2 rounded-lg bg-oxford-100 dark:bg-oxford-800/80 text-oxford-600 dark:text-oxford-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                title="Monitoring Presensi"
                                            >
                                                <Radio size={16} />
                                            </Link>
                                            <Link
                                                href={`/admin/courses/${course.id}/analytics`}
                                                className="p-2 rounded-lg bg-oxford-100 dark:bg-oxford-800/80 text-oxford-600 dark:text-oxford-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                title="Grafik Analitik"
                                            >
                                                <BarChart3 size={16} />
                                            </Link>
                                            <Link
                                                href={`${basePath}/courses/${course.id}/edit`}
                                                className="p-2 rounded-lg bg-oxford-100 dark:bg-oxford-800/80 text-oxford-600 dark:text-oxford-300 hover:text-gold-600 hover:bg-gold-50 transition-colors"
                                                title="Edit Metadata"
                                            >
                                                <Edit size={16} />
                                            </Link>
                                            <Link
                                                href={`/admin/courses/${course.id}/certificates`}
                                                className="p-2 rounded-lg bg-oxford-100 dark:bg-oxford-800/80 text-oxford-600 dark:text-oxford-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                title="Kelola Sertifikat"
                                            >
                                                <Award size={16} />
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDeleteId(course.id)}
                                                className="p-2 rounded-lg bg-oxford-100 dark:bg-oxford-800/80 text-oxford-600 dark:text-oxford-300 hover:text-crimson-600 hover:bg-crimson-50 transition-colors cursor-pointer"
                                                title="Hapus Kursus"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredCourses.length === 0 && (
                    <div className="p-8 text-center text-oxford-500 dark:text-oxford-400 italic text-sm">
                        {searchQuery || statusFilter !== "all"
                            ? "Tidak ada kursus yang cocok dengan filter."
                            : "Belum ada kursus yang terdaftar."}
                    </div>
                )}
            </div>

            {/* DESKTOP TABLE VIEW (Visible on screens >= lg) */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-oxford-50 dark:bg-oxford-950 text-sm font-bold text-oxford-600 dark:text-oxford-300 uppercase tracking-wider border-b border-oxford-200 dark:border-oxford-700">
                            <th className="p-5 pl-6">Detail Kursus</th>
                            <th className="p-5">Instruktur / Kategori</th>
                            <th className="p-5">Statistik</th>
                            <th className="p-5">Status</th>
                            <th className="p-5 text-center min-w-[280px]">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-oxford-100 dark:divide-oxford-800">
                        {filteredCourses.map(course => {
                            const isHighlighted = activeHighlight === course.id;
                            return (
                                <tr
                                    key={course.id}
                                    id={`course-${course.id}`}
                                    className={`transition-all duration-500 ${
                                        isHighlighted
                                            ? "ring-2 ring-gold-500 bg-gold-50/90 dark:bg-gold-500/15 shadow-md"
                                            : "hover:bg-oxford-50 dark:hover:bg-oxford-950/50"
                                    }`}
                                >
                                    <td className="p-5 pl-6">
                                        <p className="font-bold text-base text-oxford-900 dark:text-white mb-1">{course.title}</p>
                                        <p className="text-sm text-oxford-500 dark:text-oxford-400">
                                            Diupdate {new Date(course.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </td>
                                    <td className="p-5">
                                        <p className="font-semibold text-oxford-900 dark:text-white text-base mb-1">{course.instructorName || "Belum ditentukan"}</p>
                                        <span className="inline-block px-2.5 py-1 bg-oxford-100 dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-300 rounded-md text-sm font-semibold uppercase tracking-wider">
                                            {course.category || "Umum"}
                                        </span>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex flex-col gap-1.5">
                                            <p className="text-base font-semibold text-oxford-900 dark:text-white">
                                                {course.studentCount.toLocaleString()}{" "}
                                                <span className="text-oxford-500 dark:text-oxford-400 font-normal text-sm">Siswa Terdaftar</span>
                                            </p>
                                            {(course.pendingCount || 0) > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setQrCourse({ id: course.id, title: course.title })}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-sm hover:bg-amber-500/30 transition-all border border-amber-500/40 w-fit shadow-sm cursor-pointer"
                                                    title="Klik untuk membuka persetujuan pendaftaran peserta"
                                                >
                                                    <UserCheck size={16} className="text-amber-600 dark:text-amber-400" />
                                                    <span>{course.pendingCount} Menunggu Persetujuan</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-bold capitalize ${statusColor(course.status)}`}>
                                            {course.status}
                                        </span>
                                    </td>
                                    <td className="p-5">
                                        {confirmDeleteId === course.id ? (
                                            <div className="flex items-center gap-2 justify-center">
                                                <span className="text-sm text-crimson-600 font-medium">Yakin?</span>
                                                <button
                                                    onClick={() => handleDelete(course.id)}
                                                    disabled={deletingId === course.id}
                                                    className="px-3 py-1.5 bg-crimson-600 text-white text-sm font-bold rounded-lg hover:bg-crimson-700 disabled:opacity-50 transition-colors cursor-pointer"
                                                >
                                                    {deletingId === course.id ? "..." : "Hapus"}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="px-3 py-1.5 bg-oxford-100 dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 text-sm font-bold rounded-lg hover:bg-oxford-200 dark:hover:bg-oxford-800 transition-colors cursor-pointer"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-1.5 opacity-100">
                                                <button
                                                    type="button"
                                                    onClick={() => setQrCourse({ id: course.id, title: course.title })}
                                                    className={`p-2 rounded-lg transition-colors relative cursor-pointer ${
                                                        (course.pendingCount || 0) > 0
                                                            ? "text-amber-700 dark:text-amber-300 bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 ring-2 ring-amber-500/30"
                                                            : "text-oxford-500 hover:text-gold-600 hover:bg-gold-50 dark:hover:bg-oxford-800"
                                                    }`}
                                                    title={(course.pendingCount || 0) > 0 ? `${course.pendingCount} Pendaftaran Menunggu Persetujuan (Klik untuk Menyetujui)` : "Pendaftaran & Persetujuan Peserta (QR Live)"}
                                                >
                                                    {(course.pendingCount || 0) > 0 ? <UserCheck size={18} /> : <QrCode size={18} />}
                                                    {(course.pendingCount || 0) > 0 && (
                                                        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-amber-500 text-oxford-950 text-xs font-black flex items-center justify-center shadow">
                                                            {course.pendingCount}
                                                        </span>
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAttendanceQrCourse({ id: course.id, title: course.title })}
                                                    className="p-2 text-oxford-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-oxford-800 rounded-lg transition-colors cursor-pointer"
                                                    title="Manajemen QR Presensi Per Modul & Layar Penuh"
                                                >
                                                    <ScanLine size={18} />
                                                </button>
                                                <Link href={`${basePath}/courses/${course.id}/content`} className="p-2 text-oxford-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-oxford-800 rounded-lg transition-colors" title="Kelola Materi/Konten">
                                                    <Layers size={18} />
                                                </Link>
                                                <Link href={`/admin/courses/${course.id}/attendance`} className="p-2 text-oxford-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-oxford-800 rounded-lg transition-colors" title="Monitoring Presensi Live">
                                                    <Radio size={18} />
                                                </Link>
                                                <Link href={`/admin/courses/${course.id}/analytics`} className="p-2 text-oxford-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-oxford-800 rounded-lg transition-colors" title="Grafik Analitik & Retensi Kursus">
                                                    <BarChart3 size={18} />
                                                </Link>
                                                <Link href={`${basePath}/courses/${course.id}/edit`} className="p-2 text-oxford-500 hover:text-gold-600 hover:bg-gold-50 dark:hover:bg-oxford-800 rounded-lg transition-colors" title="Edit Metadata Kursus">
                                                    <Edit size={18} />
                                                </Link>
                                                <Link href={`/admin/courses/${course.id}/certificates`} className="p-2 text-oxford-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-oxford-800 rounded-lg transition-colors" title="Kelola Sertifikat">
                                                    <Award size={18} />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteId(course.id)}
                                                    className="p-2 text-oxford-500 hover:text-crimson-600 hover:bg-crimson-50 dark:hover:bg-oxford-800 rounded-lg transition-colors cursor-pointer"
                                                    title="Hapus Kursus"
                                                >
                                                    <Trash2 size={18} />
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

            {/* Pagination / Count Summary */}
            <div className="p-4 border-t border-oxford-200 dark:border-oxford-700 flex items-center justify-between text-xs sm:text-sm text-oxford-600 dark:text-oxford-300 bg-oxford-50 dark:bg-oxford-950/50">
                <p>Menampilkan {filteredCourses.length} dari {courses.length} kursus</p>
            </div>

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
