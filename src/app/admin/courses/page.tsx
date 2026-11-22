"use client";

import { Menu, Activity, PlusCircle } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
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
                <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-[#161B2A] border-b border-oxford-200 dark:border-oxford-800 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 text-oxford-700 dark:text-oxford-200 hover:bg-oxford-100 dark:hover:bg-oxford-800 rounded-lg transition-colors"
                            aria-label="Buka Menu Navigasi"
                        >
                            <Menu size={22} />
                        </button>
                        <span className="font-bold text-oxford-900 dark:text-white text-base">
                            Manajemen <span className="text-gold-500 font-medium text-xs">Kursus</span>
                        </span>
                    </div>
                    <Link
                        href="/admin/courses/new"
                        className="p-2 text-gold-600 hover:bg-gold-50 dark:hover:bg-oxford-800 rounded-lg transition-colors"
                        title="Buat Kursus Baru"
                    >
                        <PlusCircle size={20} />
                    </Link>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Activity className="animate-spin text-gold-500" size={32} />
                        </div>
                    ) : (
                        <Suspense fallback={
                            <div className="flex items-center justify-center h-64">
                                <Activity className="animate-spin text-gold-500" size={32} />
                            </div>
                        }>
                            <AdminCourseControls courses={courses} />
                        </Suspense>
                    )}
                </div>
            </main>

        </div>
    );
}
