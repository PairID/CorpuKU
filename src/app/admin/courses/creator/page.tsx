import Link from "next/link";
import { BookOpen, LayoutDashboard, Sparkles, Users, Activity, Database } from "lucide-react";
import CourseCreatorWizard from "@/components/course-creator/CourseCreatorWizard";

export const metadata = {
    title: "AI Course Creator (Admin) • CorpuKU Bangkom ASN",
    description: "Penyusunan modul pelatihan ASN berbasis masalah nyata dan regulasi otentik dengan Jam Pelajaran dinamis."
};

export default function AdminCourseCreatorPage() {
    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            {/* SIDEBAR */}
            <aside className="hidden lg:flex flex-col w-64 bg-oxford-950 text-white min-h-screen border-r border-oxford-800 sticky top-0">
                <div className="p-6 border-b border-oxford-800">
                    <Link href="/admin" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gold-500 text-oxford-900 rounded-lg flex items-center justify-center">
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
                    <Link href="/admin/courses" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <BookOpen size={20} /> Kursus
                    </Link>
                    <Link href="/admin/courses/creator" className="flex items-center gap-3 px-4 py-3 bg-gold-500/10 text-gold-400 rounded-xl font-bold border border-gold-500/20">
                        <Sparkles size={20} className="text-gold-400" /> Course Creator (AI)
                    </Link>
                    <Link href="/admin/regulations" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <Database size={20} className="text-cyan-400" /> Bank Data Regulasi
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
                <div className="p-6 md:p-8 lg:p-10 max-w-6xl mx-auto w-full">
                    <CourseCreatorWizard basePath="/admin" />
                </div>
            </main>
        </div>
    );
}
