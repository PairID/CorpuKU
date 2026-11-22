"use client";

import { Menu, Activity, Sparkles, PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getCoursesWithStats } from "@/app/actions/courses";
import AdminCourseControls, { type AdminCourse } from "./admin-course-controls";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

type RawAdminCourse = Omit<AdminCourse, "createdAt" | "updatedAt"> & {
    createdAt: string | Date;
    updatedAt: string | Date;
};

export default function AdminCourses() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [courses, setCourses] = useState<AdminCourse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const c = await getCoursesWithStats();
                setCourses((c as unknown as RawAdminCourse[]).map(course => ({
                    ...course,
                    pendingCount: Number(course.pendingCount || 0),
                    accessMode: String(course.accessMode || "open"),
                    createdAt: new Date(course.createdAt).toISOString(),
                    updatedAt: new Date(course.updatedAt).toISOString(),
                })));
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        }
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            {/* SIDEBAR */}
            <AdminSidebar activePage="courses" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
                            <h1 className="text-sm sm:text-base font-bold text-oxford-900 dark:text-white leading-tight">Kelola Kursus</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Link
                            href="/admin/courses/creator"
                            className="p-2 bg-oxford-900 text-gold-400 border border-gold-500/30 rounded-lg hover:bg-oxford-800 text-xs font-bold transition-all shadow-xs"
                            title="AI Course Creator"
                        >
                            <Sparkles size={16} />
                        </Link>
                        <Link
                            href="/admin/courses/new"
                            className="p-2 bg-gold-500 text-oxford-950 rounded-lg hover:bg-gold-400 text-xs font-bold transition-colors shadow-xs"
                            title="Buat Kursus Baru"
                        >
                            <PlusCircle size={16} />
                        </Link>
                    </div>
                </header>

                {/* Content */}
                <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Activity className="animate-spin text-gold-500" size={32} />
                        </div>
                    ) : (
                        <AdminCourseControls courses={courses} />
                    )}
                </div>
            </main>
        </div>
    );
}
