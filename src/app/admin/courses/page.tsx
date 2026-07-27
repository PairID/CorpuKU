"use client";

import { Menu, Activity } from "lucide-react";
import { useState, useEffect } from "react";
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
            <main className="flex-1 flex flex-col min-h-screen relative">
                {/* Mobile sidebar toggle button (floating) */}
                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gold-500 text-oxford-950 rounded-full shadow-2xl hover:bg-gold-400 transition-all active:scale-95"
                >
                    <Menu size={24} />
                </button>

                {/* Content */}
                <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
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
