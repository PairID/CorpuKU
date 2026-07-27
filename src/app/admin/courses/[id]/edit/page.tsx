import Link from "next/link";
import { Menu, Users, BookOpen, LayoutDashboard, Activity } from "lucide-react";
import CourseForm, { type CourseFormData, type CourseInstructor } from "../../course-form";
import { getInstructors } from "@/app/actions/users";
import { getCourseById } from "@/app/actions/courses";
import { notFound } from "next/navigation";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const courseData = await getCourseById(id);

    if (!courseData) {
        notFound();
    }

    const instructors = await getInstructors();

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            {/* SIDEBAR */}
            <aside className="hidden lg:flex flex-col w-64 bg-oxford-950 text-white min-h-screen border-r border-oxford-800 sticky top-0">
                <div className="p-6 border-b border-oxford-800">
                    <Link href="/admin" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gold-500 text-oxford-900 dark:text-white rounded-lg flex items-center justify-center">
                            <BookOpen size={20} />
                        </div>
                        <span className="font-serif text-xl font-bold tracking-tight">
                            CorpuKU <span className="font-sans text-gold-500 font-medium text-lg">Admin</span>
                        </span>
                    </Link>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <LayoutDashboard size={20} /> Dashboard
                    </Link>
                    <Link href="/admin/courses" className="flex items-center justify-between px-4 py-3 bg-gold-500/10 text-gold-400 rounded-xl font-bold border border-gold-500/20 group">
                        <div className="flex items-center gap-3"><BookOpen size={20} /> Kursus</div>
                    </Link>
                    <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <Users size={20} /> Pengguna
                    </Link>
                    <Link href="/admin/analytics" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <Activity size={20} /> Analitik
                    </Link>
                </nav>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="h-20 bg-white dark:bg-[#161B2A] border-b border-oxford-200 dark:border-oxford-700 flex items-center justify-between px-6 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button className="lg:hidden text-oxford-600 dark:text-oxford-300 hover:text-oxford-900 dark:hover:text-white">
                            <Menu size={24} />
                        </button>
                        <h1 className="font-bold text-xl text-oxford-900 dark:text-white w-auto hidden sm:block">Edit Kursus</h1>
                    </div>
                </header>

                {/* Content */}
                <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
                    <CourseForm
                        mode="edit"
                        initialData={courseData as unknown as CourseFormData}
                        instructors={instructors as unknown as CourseInstructor[]}
                    />
                </div>
            </main>
        </div>
    );
}
