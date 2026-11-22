"use client";

import Link from "next/link";
import { Menu, Users, BookOpen, FileText, PlusCircle, Activity, ArrowUpRight } from "lucide-react";
import { useState, useEffect } from "react";
import { getCoursesWithStats } from "@/app/actions/courses";
import { getAdminUserStats } from "@/app/actions/users";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

interface DashboardStats {
    totalUsers: number;
    totalStudents: number;
    totalCourses: number;
}

interface RecentCourse {
    id: string;
    title: string;
    instructorName?: string | null;
    studentCount: number | string;
    status: string;
}

export default function AdminDashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const [courses, userStats] = await Promise.all([
                    getCoursesWithStats() as unknown as Promise<RecentCourse[]>,
                    getAdminUserStats(),
                ]);

                setStats({
                    totalUsers: userStats.totalUsers,
                    totalStudents: userStats.totalStudents,
                    totalCourses: courses.length
                });
                setRecentCourses(courses.slice(0, 5));
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        }
        fetchData();
    }, []);

    const QUICK_STATS = stats ? [
        { label: "Total Pengguna", value: stats.totalUsers.toLocaleString(), trend: "Real-time", icon: <Users size={20} className="text-gold-600" />, bg: "bg-gold-50 dark:bg-gold-500/10" },
        { label: "Total Siswa", value: stats.totalStudents.toLocaleString(), trend: "Real-time", icon: <Activity size={20} className="text-crimson-600" />, bg: "bg-crimson-50 dark:bg-crimson-500/10" },
        { label: "Total Kursus", value: stats.totalCourses.toLocaleString(), trend: "Real-time", icon: <BookOpen size={20} className="text-oxford-600 dark:text-oxford-300" />, bg: "bg-oxford-50 dark:bg-oxford-950" },
        { label: "Sertifikat Terbit", value: "0", trend: "Coming Soon", icon: <FileText size={20} className="text-emerald-600" />, bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    ] : [];

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            {/* SIDEBAR */}
            <AdminSidebar activePage="dashboard" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden relative">
                {/* Mobile Header Bar */}
                <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-[#161B2A]/90 backdrop-blur-md border-b border-oxford-200 dark:border-oxford-800 shadow-xs">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 -ml-1 text-oxford-700 dark:text-oxford-200 hover:bg-oxford-100 dark:hover:bg-oxford-800 rounded-xl transition-colors cursor-pointer"
                            aria-label="Buka Menu Sidebar"
                        >
                            <Menu size={22} />
                        </button>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600 block">CorpuKU Admin</span>
                            <h1 className="text-sm sm:text-base font-bold text-oxford-900 dark:text-white leading-tight">Dashboard Overview</h1>
                        </div>
                    </div>
                    <Link
                        href="/admin/courses/new"
                        className="p-2 bg-gold-500 text-oxford-950 font-bold rounded-lg hover:bg-gold-400 transition-colors shadow-xs"
                        title="Buat Kursus Baru"
                    >
                        <PlusCircle size={18} />
                    </Link>
                </header>

                {/* Dashboard Content */}
                <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Activity className="animate-spin text-gold-500" size={32} />
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-10">
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-oxford-900 dark:text-white mb-1 sm:mb-2">Platform Overview</h2>
                                    <p className="text-xs sm:text-sm md:text-base text-oxford-600 dark:text-oxford-300">Ringkasan aktivitas CorpuKU Academy hari ini.</p>
                                </div>
                                <Link
                                    href="/admin/courses/new"
                                    className="flex items-center justify-center gap-2 px-5 py-3 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-xl transition-all shadow-sm hover:shadow-md w-full sm:w-auto text-sm font-sans"
                                >
                                    <PlusCircle size={18} /> Buat Kursus Baru
                                </Link>
                            </div>

                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6 mb-6 sm:mb-10">
                                {QUICK_STATS.map((stat, idx) => (
                                    <div key={idx} className="bg-white dark:bg-[#161B2A] p-5 sm:p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-xs flex flex-col">
                                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                                            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                                                {stat.icon}
                                            </div>
                                            <span className="text-[11px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md">{stat.trend}</span>
                                        </div>
                                        <h3 className="text-oxford-500 dark:text-oxford-400 text-xs sm:text-sm font-medium mb-1">{stat.label}</h3>
                                        <p className="text-2xl sm:text-3xl font-bold text-oxford-900 dark:text-white">{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                                {/* Recent Courses List */}
                                <div className="lg:col-span-2 bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden">
                                    <div className="p-4 sm:p-6 border-b border-oxford-200 dark:border-oxford-700 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-base sm:text-lg text-oxford-900 dark:text-white">Kursus Terkini</h3>
                                            <p className="text-xs text-oxford-500 dark:text-oxford-400 hidden sm:block">Klik judul kursus untuk langsung menuju baris kursus tersebut.</p>
                                        </div>
                                        <Link href="/admin/courses" className="text-xs sm:text-sm font-bold text-gold-600 hover:text-gold-500">
                                            Lihat Semua
                                        </Link>
                                    </div>

                                    {/* Mobile Cards (Screens < sm) */}
                                    <div className="block sm:hidden divide-y divide-oxford-100 dark:divide-oxford-800">
                                        {recentCourses.map(course => (
                                            <Link
                                                key={course.id}
                                                href={`/admin/courses?highlight=${course.id}#course-${course.id}`}
                                                className="p-4 flex flex-col gap-2 hover:bg-gold-50/40 dark:hover:bg-oxford-900/40 transition-colors block group"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-bold text-sm text-oxford-900 dark:text-white group-hover:text-gold-600 transition-colors flex items-center gap-1">
                                                        <span>{course.title}</span>
                                                        <ArrowUpRight size={14} className="text-gold-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                                                    </h4>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                                        course.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                                        course.status === 'archived' ? 'bg-oxford-100 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-300' : 'bg-gold-100 text-gold-800 dark:bg-gold-500/20 dark:text-gold-300'
                                                    }`}>
                                                        {course.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-oxford-500 dark:text-oxford-400">
                                                    <span>{course.instructorName || "Instruktur Belum Ditentukan"}</span>
                                                    <span className="font-semibold text-oxford-700 dark:text-oxford-300">{Number(course.studentCount).toLocaleString()} Siswa</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>

                                    {/* Desktop Table (Screens >= sm) */}
                                    <div className="hidden sm:block overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-oxford-50 dark:bg-oxford-950 text-xs font-semibold text-oxford-500 dark:text-oxford-400 uppercase tracking-wider border-b border-oxford-200 dark:border-oxford-800">
                                                    <th className="p-4 pl-6">Nama Kursus</th>
                                                    <th className="p-4">Instruktur</th>
                                                    <th className="p-4">Siswa</th>
                                                    <th className="p-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-oxford-100 dark:divide-oxford-800">
                                                {recentCourses.map(course => (
                                                    <tr key={course.id} className="hover:bg-oxford-50 dark:hover:bg-oxford-950/50 transition-colors group">
                                                        <td className="p-4 pl-6 font-bold text-oxford-900 dark:text-white">
                                                            <Link
                                                                href={`/admin/courses?highlight=${course.id}#course-${course.id}`}
                                                                className="inline-flex items-center gap-1.5 hover:text-gold-600 dark:hover:text-gold-400 transition-colors group/title"
                                                                title="Buka dan sorot kursus ini di daftar kursus"
                                                            >
                                                                <span>{course.title}</span>
                                                                <ArrowUpRight size={15} className="text-gold-500 opacity-60 group-hover/title:opacity-100 group-hover/title:translate-x-0.5 group-hover/title:-translate-y-0.5 transition-all shrink-0" />
                                                            </Link>
                                                        </td>
                                                        <td className="p-4 text-sm text-oxford-600 dark:text-oxford-300">{course.instructorName || "-"}</td>
                                                        <td className="p-4 text-sm text-oxford-600 dark:text-oxford-300">{Number(course.studentCount).toLocaleString()}</td>
                                                        <td className="p-4">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${
                                                                course.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                                                course.status === 'archived' ? 'bg-oxford-100 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-300' : 'bg-gold-100 text-gold-800 dark:bg-gold-500/20 dark:text-gold-300'
                                                            }`}>
                                                                {course.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {recentCourses.length === 0 && (
                                        <p className="p-8 text-center text-oxford-500 dark:text-oxford-400 italic">Belum ada kursus yang dibuat.</p>
                                    )}
                                </div>

                                {/* Quick Actions / Notices */}
                                <div className="lg:col-span-1 bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-5 sm:p-6">
                                    <h3 className="font-bold text-base sm:text-lg text-oxford-900 dark:text-white mb-4 sm:mb-6">Aktivitas Sistem</h3>
                                    <div className="space-y-5 sm:space-y-6">
                                        <div className="flex gap-3 sm:gap-4">
                                            <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <div>
                                                <p className="text-sm font-bold text-oxford-900 dark:text-white">{stats?.totalUsers || 0} Pengguna Terdaftar</p>
                                                <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-0.5">Sistem berjalan dengan stabil secara real-time.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 sm:gap-4">
                                            <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-gold-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                            <div>
                                                <p className="text-sm font-bold text-oxford-900 dark:text-white">{stats?.totalCourses || 0} Kursus Tersedia</p>
                                                <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-0.5">Dapat dikelola langsung melalui menu Kursus.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
