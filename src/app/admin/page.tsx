"use client";

import Link from "next/link";
import { Menu, Users, BookOpen, FileText, PlusCircle, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { getCoursesWithStats } from "@/app/actions/courses";
import { getAllUsers } from "@/app/actions/users";
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

interface UserRoleRecord {
    role: string;
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
                const courses = await getCoursesWithStats() as unknown as RecentCourse[];
                const allUsers = await getAllUsers() as unknown as UserRoleRecord[];
                
                setStats({
                    totalUsers: allUsers.length,
                    totalStudents: allUsers.filter(u => u.role === "student").length,
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
        { label: "Total Pengguna", value: stats.totalUsers.toLocaleString(), trend: "Real-time", icon: <Users size={20} className="text-gold-600" />, bg: "bg-gold-50" },
        { label: "Total Siswa", value: stats.totalStudents.toLocaleString(), trend: "Real-time", icon: <Activity size={20} className="text-crimson-600" />, bg: "bg-crimson-50" },
        { label: "Total Kursus", value: stats.totalCourses.toLocaleString(), trend: "Real-time", icon: <BookOpen size={20} className="text-oxford-600 dark:text-oxford-300" />, bg: "bg-oxford-50 dark:bg-oxford-950" },
        { label: "Sertifikat Terbit", value: "0", trend: "Coming Soon", icon: <FileText size={20} className="text-emerald-600" />, bg: "bg-emerald-50" },
    ] : [];

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            {/* SIDEBAR */}
            <AdminSidebar activePage="dashboard" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden relative">
                {/* Mobile sidebar toggle button (floating) */}
                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gold-500 text-oxford-950 rounded-full shadow-2xl hover:bg-gold-400 transition-all active:scale-95"
                >
                    <Menu size={24} />
                </button>

                {/* Dashboard Content */}
                <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Activity className="animate-spin text-gold-500" size={32} />
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-10">
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-oxford-900 dark:text-white mb-2">Platform Overview</h2>
                                    <p className="text-sm sm:text-base text-oxford-600 dark:text-oxford-300">Ringkasan aktivitas CorpuKU Academy hari ini.</p>
                                </div>
                                <Link href="/admin/courses/new" className="flex items-center justify-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-lg transition-colors shadow-sm w-full sm:w-auto">
                                    <PlusCircle size={20} /> Buat Kursus Baru
                                </Link>
                            </div>

                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
                                {QUICK_STATS.map((stat, idx) => (
                                    <div key={idx} className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                                                {stat.icon}
                                            </div>
                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{stat.trend}</span>
                                        </div>
                                        <h3 className="text-oxford-500 dark:text-oxford-400 text-sm font-medium mb-1">{stat.label}</h3>
                                        <p className="text-3xl font-bold text-oxford-900 dark:text-white">{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Recent Courses List */}
                                <div className="lg:col-span-2 bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-oxford-200 dark:border-oxford-700 flex items-center justify-between">
                                        <h3 className="font-bold text-lg text-oxford-900 dark:text-white">Kursus Terkini</h3>
                                        <Link href="/admin/courses" className="text-sm font-bold text-gold-600 hover:text-gold-500">Lihat Semua</Link>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-oxford-50 dark:bg-oxford-950 text-xs font-semibold text-oxford-500 dark:text-oxford-400 uppercase tracking-wider">
                                                    <th className="p-4 pl-6">Nama Kursus</th>
                                                    <th className="p-4">Instruktur</th>
                                                    <th className="p-4">Siswa</th>
                                                    <th className="p-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-oxford-100">
                                                {recentCourses.map(course => (
                                                    <tr key={course.id} className="hover:bg-oxford-50 dark:hover:bg-oxford-950/50 transition-colors">
                                                        <td className="p-4 pl-6 font-bold text-oxford-900 dark:text-white">{course.title}</td>
                                                        <td className="p-4 text-sm text-oxford-600 dark:text-oxford-300">{course.instructorName || "-"}</td>
                                                        <td className="p-4 text-sm text-oxford-600 dark:text-oxford-300">{Number(course.studentCount).toLocaleString()}</td>
                                                        <td className="p-4">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${course.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                                                                course.status === 'archived' ? 'bg-oxford-100 dark:bg-[#161B2A] text-oxford-800 dark:text-oxford-100' : 'bg-gold-100 text-gold-800'
                                                                }`}>
                                                                {course.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {recentCourses.length === 0 && (
                                            <p className="p-8 text-center text-oxford-500 dark:text-oxford-400 italic">Belum ada kursus yang dibuat.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Actions / Notices */}
                                <div className="lg:col-span-1 bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6">
                                    <h3 className="font-bold text-lg text-oxford-900 dark:text-white mb-6">Aktivitas Sistem</h3>
                                    <div className="space-y-6">
                                        <div className="flex gap-4">
                                            <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500 shrink-0" />
                                            <div>
                                                <p className="text-sm font-bold text-oxford-900 dark:text-white">{stats?.totalUsers || 0} Pengguna Terdaftar</p>
                                                <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-1">Sistem berjalan dengan stabil secara real-time.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="w-2 h-2 mt-2 rounded-full bg-gold-500 shrink-0" />
                                            <div>
                                                <p className="text-sm font-bold text-oxford-900 dark:text-white">{stats?.totalCourses || 0} Kursus Tersedia</p>
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
