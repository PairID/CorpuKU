import Link from "next/link";
import { BookOpen, Eye, GitBranch, Plus, Users } from "lucide-react";
import { createLearningPath, getManageableLearningPaths } from "@/app/actions/learning-paths";

export const dynamic = "force-dynamic";

export default async function AdminLearningPathsPage() {
  const paths = await getManageableLearningPaths();
  return (
    <main className="min-h-screen bg-oxford-50 px-5 py-10 dark:bg-oxford-950 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gold-600">Learning paths</p>
            <h1 className="text-3xl font-bold text-oxford-950 dark:text-white">Susun program belajar sekali</h1>
            <p className="mt-2 max-w-2xl text-oxford-600 dark:text-oxford-300">Gabungkan beberapa kursus, terbitkan, lalu tugaskan. Peserta otomatis terdaftar ke seluruh kursus di jalur tersebut.</p>
          </div>
          <Link href="/admin" className="text-sm font-bold text-oxford-600 hover:text-gold-600 dark:text-oxford-300">Kembali ke dashboard</Link>
        </div>

        <section className="mb-10 rounded-2xl border border-oxford-200 bg-white p-6 shadow-sm dark:border-oxford-800 dark:bg-[#161B2A]">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-oxford-900 dark:text-white"><Plus size={20} /> Buat learning path</h2>
          <form action={createLearningPath} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-oxford-700 dark:text-oxford-200">Judul
              <input name="title" required minLength={5} maxLength={200} placeholder="Contoh: Jalur Kepemimpinan ASN" className="mt-2 w-full rounded-xl border border-oxford-200 bg-transparent px-4 py-3 font-normal dark:border-oxford-700" />
            </label>
            <label className="text-sm font-semibold text-oxford-700 dark:text-oxford-200">Visibilitas
              <select name="visibility" defaultValue="public" className="mt-2 w-full rounded-xl border border-oxford-200 bg-white px-4 py-3 font-normal dark:border-oxford-700 dark:bg-oxford-950"><option value="public">Publik — bisa diikuti mandiri</option><option value="private">Privat — hanya penugasan</option></select>
            </label>
            <label className="text-sm font-semibold text-oxford-700 dark:text-oxford-200 md:col-span-2">Deskripsi
              <textarea name="description" maxLength={4000} rows={3} placeholder="Tujuan, kompetensi, dan sasaran peserta" className="mt-2 w-full rounded-xl border border-oxford-200 bg-transparent px-4 py-3 font-normal dark:border-oxford-700" />
            </label>
            <button className="inline-flex w-fit items-center gap-2 rounded-xl bg-gold-500 px-5 py-3 font-bold text-oxford-950 hover:bg-gold-400"><Plus size={18} /> Buat jalur</button>
          </form>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {paths.map(path => (
            <article key={String(path.id)} className="rounded-2xl border border-oxford-200 bg-white p-6 dark:border-oxford-800 dark:bg-[#161B2A]">
              <div className="mb-4 flex items-center justify-between gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${path.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{String(path.status) === "published" ? "Terbit" : "Draf"}</span><span className="inline-flex items-center gap-1 text-xs text-oxford-500"><Eye size={14} /> {String(path.visibility) === "public" ? "Publik" : "Privat"}</span></div>
              <h2 className="text-xl font-bold text-oxford-950 dark:text-white">{String(path.title)}</h2>
              <p className="mt-2 line-clamp-2 min-h-10 text-sm text-oxford-600 dark:text-oxford-300">{String(path.description || "Belum ada deskripsi.")}</p>
              <div className="mt-5 flex items-center gap-5 border-t border-oxford-100 pt-4 text-sm text-oxford-600 dark:border-oxford-800 dark:text-oxford-300"><span className="inline-flex items-center gap-1.5"><BookOpen size={16} /> {Number(path.courseCount)} kursus</span><span className="inline-flex items-center gap-1.5"><Users size={16} /> {Number(path.assignmentCount)} peserta</span></div>
              <Link href={`/admin/learning-paths/${String(path.id)}`} className="mt-5 inline-flex items-center gap-2 font-bold text-blue-700 hover:text-blue-600 dark:text-blue-300"><GitBranch size={17} /> Kelola jalur</Link>
            </article>
          ))}
          {paths.length === 0 && <div className="rounded-2xl border border-dashed border-oxford-300 p-10 text-center text-oxford-500 md:col-span-2 xl:col-span-3">Belum ada learning path. Buat jalur pertama di atas.</div>}
        </section>
      </div>
    </main>
  );
}
