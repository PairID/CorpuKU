import Link from "next/link";
import { BookOpen, ChevronLeft, LayoutDashboard } from "lucide-react";
import { getCourseById } from "@/app/actions/courses";
import { getCourseContentForBuilder } from "@/app/actions/builder";
import { notFound } from "next/navigation";
import ContentBuilder, { type CourseContentModule } from "@/app/admin/courses/[id]/content/content-builder";

export default async function InstructorCourseContentPage({ params }: { params: Promise<{ id: string }> }) {
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
                    <Link href="/instructor" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gold-500 text-oxford-900 dark:text-white rounded-lg flex items-center justify-center">
                            <BookOpen size={20} />
                        </div>
                        <span className="font-serif text-xl font-bold tracking-tight">
                            CorpuKU <span className="font-sans text-gold-500 font-medium text-lg">Instruktur</span>
                        </span>
                    </Link>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/instructor" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <LayoutDashboard size={20} /> Dashboard
                    </Link>
                    <Link href="/instructor/courses" className="flex items-center gap-3 px-4 py-3 bg-gold-500/10 text-gold-400 rounded-xl font-bold border border-gold-500/20">
                        <BookOpen size={20} /> Kursus Saya
                    </Link>
                </nav>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen max-w-5xl">
                <header className="h-20 bg-white dark:bg-[#161B2A] border-b border-oxford-200 dark:border-oxford-700 flex items-center px-6 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <Link href="/instructor" className="text-oxford-500 dark:text-oxford-400 hover:text-oxford-900 dark:hover:text-white transition-colors">
                            <ChevronLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="font-bold text-xl text-oxford-900 dark:text-white leading-tight">Kelola Konten & Materi</h1>
                            <p className="text-xs text-oxford-500 dark:text-oxford-400 font-medium">Kursus: {courseData.title}</p>
                        </div>
                    </div>
                </header>

                <div className="p-6 md:p-8 w-full">
                    <ContentBuilder courseId={id} initialData={contentTree as unknown as CourseContentModule[]} />
                </div>
            </main>
        </div>
    );
}
