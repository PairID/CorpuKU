import Link from "next/link";
import { BookOpen, ChevronLeft, LayoutDashboard, Users, Activity, Radio } from "lucide-react";
import { getCourseById } from "@/app/actions/courses";
import { getCourseContentForBuilder } from "@/app/actions/builder";
import { notFound } from "next/navigation";
import ContentBuilder, { type CourseContentModule } from "./content-builder";

export default async function CourseContentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const courseData = await getCourseById(id);
    if (!courseData) {
        notFound();
    }

    const contentTree = await getCourseContentForBuilder(id);

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
            <main className="flex-1 flex flex-col min-h-screen w-full min-w-0">
                <header className="h-20 bg-white dark:bg-[#161B2A] border-b border-oxford-200 dark:border-oxford-700 flex items-center justify-between gap-4 px-6 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <Link href={`/admin/courses`} className="text-oxford-500 dark:text-oxford-400 hover:text-oxford-900 dark:hover:text-white transition-colors">
                            <ChevronLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="font-bold text-xl text-oxford-900 dark:text-white leading-tight">Kelola Konten & Materi</h1>
                            <p className="text-xs text-oxford-500 dark:text-oxford-400 font-medium">Kursus: {courseData.title}</p>
                        </div>
                    </div>
                    <Link
                        href={`/admin/courses/${id}/attendance`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                    >
                        <Radio size={14} className="animate-pulse" /> Monitoring Presensi Live
                    </Link>
                </header>

                <div className="p-4 md:p-6 w-full flex-1 flex flex-col">
                    <ContentBuilder
                        courseId={id}
                        courseTitle={courseData.title}
                        trainingType={courseData.trainingType}
                        initialData={contentTree as unknown as CourseContentModule[]}
                        initialDocumentationUrl={courseData.documentationUrl || ""}
                    />
                </div>
            </main>
        </div>
    );
}
