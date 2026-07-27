import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, GitBranch } from "lucide-react";
import { getPublishedLearningPaths } from "@/app/actions/learning-paths";

export const metadata = { title: "Learning Paths | CorpuKU Academy", description: "Program belajar terstruktur berbasis kompetensi." };

export default async function LearningPathsPage() {
  const paths = await getPublishedLearningPaths();
  return (
    <main className="min-h-screen bg-oxford-50 dark:bg-oxford-950">
      <section className="border-b border-oxford-200 bg-oxford-950 px-5 py-16 text-white dark:border-oxford-800 md:py-20">
        <div className="mx-auto max-w-7xl"><p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-gold-400">Program terstruktur</p><h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">Learning path untuk kompetensi yang utuh</h1><p className="mt-5 max-w-2xl text-lg text-oxford-300">Ikuti rangkaian kursus dalam urutan yang jelas, pantau progres lintas kelas, dan selesaikan target pengembangan Anda.</p></div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="mb-7 flex items-end justify-between"><div><h2 className="text-2xl font-bold text-oxford-950 dark:text-white">Jalur tersedia</h2><p className="mt-1 text-oxford-600 dark:text-oxford-300">Pilih jalur publik dan mulai belajar mandiri.</p></div><Link href="/dashboard/learning-paths" className="hidden text-sm font-bold text-blue-700 md:block dark:text-blue-300">Learning path saya</Link></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paths.map(path => <article key={String(path.id)} className="group overflow-hidden rounded-2xl border border-oxford-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-oxford-800 dark:bg-[#161B2A]"><div className="flex h-36 items-center justify-center bg-gradient-to-br from-oxford-950 via-blue-950 to-gold-700"><GitBranch size={48} className="text-gold-300" /></div><div className="p-6"><p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Oleh {String(path.creatorName)}</p><h2 className="mt-2 text-xl font-bold text-oxford-950 group-hover:text-blue-700 dark:text-white">{String(path.title)}</h2><p className="mt-3 line-clamp-3 min-h-16 text-sm leading-relaxed text-oxford-600 dark:text-oxford-300">{String(path.description || "Program pembelajaran terstruktur.")}</p><div className="mt-5 flex gap-4 border-t border-oxford-100 pt-4 text-sm text-oxford-600 dark:border-oxford-800 dark:text-oxford-300"><span className="inline-flex items-center gap-1.5"><BookOpen size={16} /> {Number(path.courseCount)} kursus</span><span className="inline-flex items-center gap-1.5"><Clock3 size={16} /> {Number(path.totalJp)} JP</span></div><Link href={`/paths/${String(path.slug)}`} className="mt-5 inline-flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300">Lihat jalur <ArrowRight size={17} /></Link></div></article>)}
          {paths.length === 0 && <div className="rounded-2xl border border-dashed border-oxford-300 p-12 text-center text-oxford-500 md:col-span-2 lg:col-span-3">Belum ada learning path publik.</div>}
        </div>
      </section>
    </main>
  );
}
