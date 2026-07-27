import Link from "next/link";
import { Bell, Menu, BookOpen, Settings, LogOut, LayoutDashboard } from "lucide-react";
import { getCoursesWithStats } from "@/app/actions/courses";
import AdminCourseControls from "@/app/admin/courses/admin-course-controls";

export const dynamic = "force-dynamic";

export default async function InstructorCourses() {
    const courses = await getCoursesWithStats();
    
    // In a real app, we would filter by instructorId here
    // For now we'll just show all courses or mock it
    const myCourses = courses;

    const serializedCourses = myCourses.map(c => ({
        ...c,
        createdAt: new Date(c.createdAt).toISOString(),
        updatedAt: new Date(c.updatedAt).toISOString(),
    }));

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            {/* SIDEBAR */}
            <aside className="hidden lg:flex flex-col w-64 bg-oxford-950 text-white h-[calc(100vh-5rem)] border-r border-oxford-800 sticky top-20">
                <nav className="flex-1 p-4 space-y-2 mt-4">
                    <Link href="/instructor" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <LayoutDashboard size={20} /> Dashboard
                    </Link>
                    <Link href="/instructor/courses" className="flex items-center justify-between px-4 py-3 bg-gold-500/10 text-gold-400 rounded-xl font-bold border border-gold-500/20 group">
                        <div className="flex items-center gap-3"><BookOpen size={20} /> Kursus Saya</div>
                    </Link>
                </nav>

                <div className="p-4 border-t border-oxford-800 space-y-2">
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <Settings size={20} /> Pengaturan
                    </Link>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-crimson-400 hover:bg-crimson-900/30 hover:text-crimson-300 rounded-xl font-medium transition-colors">
                        <LogOut size={20} /> Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="h-20 bg-white dark:bg-[#161B2A] border-b border-oxford-200 dark:border-oxford-700 flex items-center justify-between px-6 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button className="lg:hidden text-oxford-600 dark:text-oxford-300 hover:text-oxford-900 dark:hover:text-white">
                            <Menu size={24} />
                        </button>
                        <h1 className="font-bold text-xl text-oxford-900 dark:text-white w-auto hidden sm:block">Kelola Kursus Saya</h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="relative text-oxford-500 dark:text-oxford-400 hover:text-gold-600 transition-colors">
                            <Bell size={20} />
                        </button>
                        <div className="w-10 h-10 bg-oxford-900 rounded-full flex items-center justify-center text-gold-500 border-2 border-oxford-200 dark:border-oxford-700 shadow-sm cursor-pointer">
                            <Settings size={20} />
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
                    {/* Reusing AdminCourseControls which handles the list, search, and add actions. 
                        Note: The 'Buat Kursus' button in AdminCourseControls links to /admin/courses/new. 
                        We might need to adjust it or create an InstructorCourseControls later,
                        but for now it provides the listing functionality. */}
                    <AdminCourseControls courses={serializedCourses} basePath="/instructor" />
                </div>
            </main>
        </div>
    );
}
