import Link from "next/link";
import { BookOpen, LayoutDashboard, Settings, PlusCircle, Activity, Layers } from "lucide-react";
import { getCoursesWithStats } from "@/app/actions/courses";
import { getAuthSession } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function InstructorDashboard() {
    const courses = await getCoursesWithStats();
    const session = await getAuthSession();
    const user = session?.user;

    // Instructors see all courses (in real app, filter by instructorId)
    const myCourses = courses;
    const activeCourses = myCourses.filter(c => c.status === "active");
    const draftCourses = myCourses.filter(c => c.status === "draft");

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            {/* SIDEBAR */}
            <aside className="hidden lg:flex flex-col w-64 bg-oxford-950 text-white h-[calc(100vh-5rem)] border-r border-oxford-800 sticky top-20">
                <nav className="flex-1 p-4 space-y-2 mt-4">
                    <Link href="/instructor" className="flex items-center gap-3 px-4 py-3 bg-gold-500/10 text-gold-400 rounded-xl font-bold border border-gold-500/20">
                        <LayoutDashboard size={20} /> Dashboard
                    </Link>
                    <Link href="/instructor/courses" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <BookOpen size={20} /> Kursus Saya
                    </Link>
                </nav>

                <div className="p-4 border-t border-oxford-800 space-y-2">
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <Settings size={20} /> Pengaturan
                    </Link>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen">

                <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
                    {/* Welcome */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-oxford-900 dark:text-white mb-2">
                                Selamat datang, {(user?.name || "Instruktur").split(" ")[0]}!
                            </h2>
                            <p className="text-sm sm:text-base text-oxford-600 dark:text-oxford-300">Kelola kursus dan materi pembelajaran Anda.</p>
                        </div>
                        <Link href="/instructor/courses/new" className="flex items-center justify-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-lg transition-colors shadow-sm w-full sm:w-auto">
                            <PlusCircle size={20} /> Buat Kursus Baru
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10">
                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-oxford-100 dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 rounded-full flex items-center justify-center">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-oxford-900 dark:text-white">{myCourses.length}</p>
                                <p className="text-sm text-oxford-500 dark:text-oxford-400">Total Kursus</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                                <Activity size={24} />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-oxford-900 dark:text-white">{activeCourses.length}</p>
                                <p className="text-sm text-oxford-500 dark:text-oxford-400">Kursus Aktif</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                                <Layers size={24} />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-oxford-900 dark:text-white">{draftCourses.length}</p>
                                <p className="text-sm text-oxford-500 dark:text-oxford-400">Kursus Draft</p>
                            </div>
                        </div>
                    </div>

                    {/* Course List */}
                    <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-oxford-200 dark:border-oxford-700 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-oxford-900 dark:text-white">Kursus Saya</h3>
                            <Link href="/instructor/courses" className="text-sm font-bold text-gold-600 hover:text-gold-500">Lihat Semua</Link>
                        </div>
                        <div className="divide-y divide-oxford-100">
                            {myCourses.slice(0, 5).map(course => (
                                <div key={course.id} className="p-5 flex items-center justify-between hover:bg-oxford-50 dark:hover:bg-oxford-950/50 transition-colors group">
                                    <div className="flex-1">
                                        <p className="font-bold text-oxford-900 dark:text-white mb-1">{course.title}</p>
                                        <div className="flex items-center gap-3 text-xs text-oxford-500 dark:text-oxford-400">
                                            <span className={`px-2 py-0.5 rounded font-bold uppercase ${course.status === "active" ? "bg-emerald-100 text-emerald-700" : course.status === "draft" ? "bg-amber-100 text-amber-700" : "bg-oxford-100 dark:bg-[#161B2A] text-oxford-600 dark:text-oxford-300"}`}>
                                                {course.status}
                                            </span>
                                            <span>{course.studentCount} siswa</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={`/instructor/courses/${course.id}/content`}
                                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                        >
                                            <Layers size={14} /> Kelola Materi
                                        </Link>
                                    </div>
                                </div>
                            ))}
                            {myCourses.length === 0 && (
                                <div className="p-10 text-center text-oxford-500 dark:text-oxford-400">
                                    <BookOpen size={40} className="mx-auto mb-3 text-oxford-200" />
                                    <p className="font-bold text-oxford-700 dark:text-oxford-200 mb-1">Belum ada kursus</p>
                                    <p className="text-sm">Mulai buat kursus pertama Anda.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
