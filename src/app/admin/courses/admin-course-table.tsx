"use client";

import { useState, useMemo } from "react";
import { Edit, Trash2, Layers, Award } from "lucide-react";
import { deleteCourse } from "@/app/actions/courses";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminCourse {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    status: string;
    instructorName: string | null;
    studentCount: number;
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
    const router = useRouter();

    // Client-side filter
    const filteredCourses = useMemo(() => {
        return courses.filter(c => {
            const matchesSearch = searchQuery === "" ||
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.instructorName || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "all" || c.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [courses, searchQuery, statusFilter]);

    const handleDelete = async (courseId: string) => {
        setDeletingId(courseId);
        const result = await deleteCourse(courseId);
        if (result.success) {
            setConfirmDeleteId(null);
            router.refresh();
        } else {
            alert(result.error || "Gagal menghapus kursus.");
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
                        <tr className="bg-oxford-50 dark:bg-oxford-950 text-xs font-semibold text-oxford-500 dark:text-oxford-400 uppercase tracking-wider border-b border-oxford-200 dark:border-oxford-700">
                            <th className="p-5 pl-6">Detail Kursus</th>
                            <th className="p-5">Instruktur / Kategori</th>
                            <th className="p-5">Statistik</th>
                            <th className="p-5">Status</th>
                            <th className="p-5 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-oxford-100">
                        {filteredCourses.map(course => (
                            <tr key={course.id} className="hover:bg-oxford-50 dark:hover:bg-oxford-950/50 transition-colors group">
                                <td className="p-5 pl-6">
                                    <p className="font-bold text-oxford-900 dark:text-white mb-1">{course.title}</p>
                                    <p className="text-xs text-oxford-500 dark:text-oxford-400">
                                        Diupdate {new Date(course.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </td>
                                <td className="p-5">
                                    <p className="font-medium text-oxford-900 dark:text-white text-sm mb-1">{course.instructorName || "Belum ditentukan"}</p>
                                    <span className="inline-block px-2 py-1 bg-oxford-100 dark:bg-[#161B2A] text-oxford-600 dark:text-oxford-300 rounded text-[10px] font-bold uppercase tracking-wider">
                                        {course.category || "Umum"}
                                    </span>
                                </td>
                                <td className="p-5">
                                    <p className="text-sm font-medium text-oxford-900 dark:text-white">{course.studentCount.toLocaleString()} <span className="text-oxford-500 dark:text-oxford-400 font-normal">Siswa</span></p>
                                </td>
                                <td className="p-5">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold capitalize ${statusColor(course.status)}`}>
                                        {course.status}
                                    </span>
                                </td>
                                <td className="p-5">
                                    {confirmDeleteId === course.id ? (
                                        <div className="flex items-center gap-2 justify-center">
                                            <span className="text-xs text-crimson-600 font-medium">Yakin?</span>
                                            <button
                                                onClick={() => handleDelete(course.id)}
                                                disabled={deletingId === course.id}
                                                className="px-3 py-1 bg-crimson-600 text-white text-xs font-bold rounded-lg hover:bg-crimson-700 disabled:opacity-50 transition-colors"
                                            >
                                                {deletingId === course.id ? "..." : "Hapus"}
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="px-3 py-1 bg-oxford-100 dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 text-xs font-bold rounded-lg hover:bg-oxford-200 dark:hover:bg-oxford-800 transition-colors"
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link href={`${basePath}/courses/${course.id}/content`} className="p-2 text-oxford-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Kelola Materi/Konten">
                                                <Layers size={16} />
                                            </Link>
                                            <Link href={`${basePath}/courses/${course.id}/edit`} className="p-2 text-oxford-400 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors" title="Edit Metadata Kursus">
                                                <Edit size={16} />
                                            </Link>
                                            <Link href={`/admin/courses/${course.id}/certificates`} className="p-2 text-oxford-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Kelola Sertifikat">
                                                <Award size={16} />
                                            </Link>
                                            <button
                                                onClick={() => setConfirmDeleteId(course.id)}
                                                className="p-2 text-oxford-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-lg transition-colors"
                                                title="Hapus Kursus"
                                            >
                                                <Trash2 size={16} />
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
        </div>
    );
}
