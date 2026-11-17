"use client";

import { useState, useMemo } from "react";
import { Edit, Trash2, Layers, Award, Radio, QrCode, ScanLine, UserCheck } from "lucide-react";
import { deleteCourse } from "@/app/actions/courses";
import { useRouter } from "next/navigation";
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
    const router = useRouter();

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
            case "active": return "bg-emerald-100 text-emerald-800";
            case "draft": return "bg-amber-100 text-amber-800";
            case "archived": return "bg-oxford-100 dark:bg-[#161B2A] text-oxford-600 dark:text-oxford-300";
            default: return "bg-oxford-100 dark:bg-[#161B2A] text-oxford-800 dark:text-oxford-100";
        }
    };

    return (
        <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden flex-1">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-oxford-50 dark:bg-oxford-950 text-sm font-bold text-oxford-600 dark:text-oxford-300 uppercase tracking-wider border-b border-oxford-200 dark:border-oxford-700">
                            <th className="p-5 pl-6">Detail Kursus</th>
                            <th className="p-5">Instruktur / Kategori</th>
                            <th className="p-5">Statistik</th>
                            <th className="p-5">Status</th>
                            <th className="p-5 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-oxford-100 dark:divide-oxford-800">
                        {filteredCourses.map(course => (
                            <tr key={course.id} className="hover:bg-oxford-50 dark:hover:bg-oxford-950/50 transition-colors group">
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
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-sm hover:bg-amber-500/30 transition-all border border-amber-500/40 w-fit shadow-sm"
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
                                                className="px-3 py-1.5 bg-crimson-600 text-white text-sm font-bold rounded-lg hover:bg-crimson-700 disabled:opacity-50 transition-colors"
                                            >
                                                {deletingId === course.id ? "..." : "Hapus"}
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="px-3 py-1.5 bg-oxford-100 dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 text-sm font-bold rounded-lg hover:bg-oxford-200 dark:hover:bg-oxford-800 transition-colors"
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={`flex items-center justify-center gap-2 transition-opacity ${(course.pendingCount || 0) > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                            <button
                                                type="button"
                                                onClick={() => setQrCourse({ id: course.id, title: course.title })}
                                                className={`p-2 rounded-lg transition-colors relative ${
                                                    (course.pendingCount || 0) > 0
                                                        ? "text-amber-700 dark:text-amber-300 bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 !opacity-100 ring-2 ring-amber-500/30"
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
                                                className="p-2 text-oxford-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-oxford-800 rounded-lg transition-colors"
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
                                            <Link href={`${basePath}/courses/${course.id}/edit`} className="p-2 text-oxford-500 hover:text-gold-600 hover:bg-gold-50 dark:hover:bg-oxford-800 rounded-lg transition-colors" title="Edit Metadata Kursus">
                                                <Edit size={18} />
                                            </Link>
                                            <Link href={`/admin/courses/${course.id}/certificates`} className="p-2 text-oxford-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-oxford-800 rounded-lg transition-colors" title="Kelola Sertifikat">
                                                <Award size={18} />
                                            </Link>
                                            <button
                                                onClick={() => setConfirmDeleteId(course.id)}
                                                className="p-2 text-oxford-500 hover:text-crimson-600 hover:bg-crimson-50 dark:hover:bg-oxford-800 rounded-lg transition-colors"
                                                title="Hapus Kursus"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
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

            {/* Pagination */}
            <div className="p-4 border-t border-oxford-200 dark:border-oxford-700 flex items-center justify-between text-sm text-oxford-600 dark:text-oxford-300 bg-oxford-50 dark:bg-oxford-950/50">
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
