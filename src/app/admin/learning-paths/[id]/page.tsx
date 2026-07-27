import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, Plus, Send, Trash2 } from "lucide-react";
import { addCourseToLearningPath, assignLearningPath, getManageableLearningPath, publishLearningPath, removeCourseFromLearningPath, updateLearningPath } from "@/app/actions/learning-paths";

export const dynamic = "force-dynamic";

export default async function ManageLearningPathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getManageableLearningPath(id);
  const path = data.path;
  return (
    <main className="min-h-screen bg-oxford-50 px-5 py-10 dark:bg-oxford-950 md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin/learning-paths" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-oxford-600 dark:text-oxford-300"><ArrowLeft size={16} /> Semua learning path</Link>
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div><p className="text-sm font-bold uppercase tracking-widest text-gold-600">Builder</p><h1 className="mt-2 text-3xl font-bold text-oxford-950 dark:text-white">{String(path.title)}</h1></div>
          {String(path.status) !== "published" ? <form action={publishLearningPath}><input type="hidden" name="pathId" value={id} /><button className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white"><CheckCircle2 size={18} /> Terbitkan</button></form> : <Link target="_blank" href={`/paths/${String(path.slug)}`} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Lihat halaman publik</Link>}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-oxford-200 bg-white p-6 dark:border-oxford-800 dark:bg-[#161B2A]">
              <h2 className="mb-5 text-lg font-bold text-oxford-900 dark:text-white">Konfigurasi dasar</h2>
              <form action={updateLearningPath} className="space-y-4">
                <input type="hidden" name="pathId" value={id} />
                <label className="block text-sm font-semibold">Judul<input name="title" defaultValue={String(path.title)} minLength={5} maxLength={200} required className="mt-2 w-full rounded-xl border border-oxford-200 bg-transparent px-4 py-3 dark:border-oxford-700" /></label>
                <label className="block text-sm font-semibold">Deskripsi<textarea name="description" defaultValue={String(path.description || "")} maxLength={4000} rows={4} className="mt-2 w-full rounded-xl border border-oxford-200 bg-transparent px-4 py-3 dark:border-oxford-700" /></label>
                <label className="block text-sm font-semibold">Visibilitas<select name="visibility" defaultValue={String(path.visibility)} className="mt-2 w-full rounded-xl border border-oxford-200 bg-white px-4 py-3 dark:border-oxford-700 dark:bg-oxford-950"><option value="public">Publik</option><option value="private">Privat</option></select></label>
                <button className="rounded-xl bg-oxford-900 px-5 py-3 font-bold text-white dark:bg-white dark:text-oxford-950">Simpan konfigurasi</button>
              </form>
            </section>

            <section className="rounded-2xl border border-oxford-200 bg-white p-6 dark:border-oxford-800 dark:bg-[#161B2A]">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-bold"><BookOpen size={20} /> Urutan kursus</h2>
              <div className="space-y-3">
                {data.items.map((item, index) => <div key={String(item.id)} className="flex items-center gap-4 rounded-xl border border-oxford-100 p-4 dark:border-oxford-800"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-100 font-bold text-gold-800">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate font-bold">{String(item.title)}</p><p className="text-xs text-oxford-500">{Number(item.jp || 0)} JP · wajib</p></div><form action={removeCourseFromLearningPath}><input type="hidden" name="pathId" value={id} /><input type="hidden" name="itemId" value={String(item.id)} /><button aria-label={`Hapus ${String(item.title)}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={18} /></button></form></div>)}
                {data.items.length === 0 && <p className="rounded-xl border border-dashed border-oxford-300 p-6 text-center text-sm text-oxford-500">Belum ada kursus.</p>}
              </div>
              <form action={addCourseToLearningPath} className="mt-5 flex gap-3"><input type="hidden" name="pathId" value={id} /><select name="courseId" required className="min-w-0 flex-1 rounded-xl border border-oxford-200 bg-white px-4 py-3 dark:border-oxford-700 dark:bg-oxford-950"><option value="">Pilih kursus aktif</option>{data.courses.map(course => <option key={String(course.id)} value={String(course.id)}>{String(course.title)} ({Number(course.jp || 0)} JP)</option>)}</select><button className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-3 font-bold text-oxford-950"><Plus size={18} /> Tambah</button></form>
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-oxford-200 bg-white p-6 dark:border-oxford-800 dark:bg-[#161B2A]">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Send size={19} /> Tugaskan peserta</h2>
            <p className="mb-5 text-sm text-oxford-600 dark:text-oxford-300">Saat ditugaskan, seluruh kursus aktif otomatis masuk ke dashboard peserta.</p>
            {String(path.status) === "published" ? <form action={assignLearningPath} className="space-y-4"><input type="hidden" name="pathId" value={id} /><label className="block text-sm font-semibold">Peserta<select name="userId" required className="mt-2 w-full rounded-xl border border-oxford-200 bg-white px-4 py-3 font-normal dark:border-oxford-700 dark:bg-oxford-950"><option value="">Pilih peserta</option>{data.users.map(user => <option key={String(user.id)} value={String(user.id)}>{String(user.name)} — {String(user.nip || user.email)}</option>)}</select></label><label className="block text-sm font-semibold">Tenggat (opsional)<input type="datetime-local" name="dueAt" className="mt-2 w-full rounded-xl border border-oxford-200 bg-transparent px-4 py-3 font-normal dark:border-oxford-700" /></label><button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white">Tugaskan & daftarkan otomatis</button></form> : <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Terbitkan jalur setelah susunan kursus selesai untuk membuka penugasan.</p>}
            <div className="mt-7 border-t border-oxford-100 pt-5 dark:border-oxford-800"><h3 className="mb-3 text-sm font-bold">Peserta ditugaskan ({data.assignments.length})</h3><div className="max-h-72 space-y-3 overflow-y-auto">{data.assignments.map(assignment => <div key={String(assignment.id)} className="rounded-xl bg-oxford-50 p-3 dark:bg-oxford-950"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold">{String(assignment.name)}</p><p className="text-xs text-oxford-500">{String(assignment.nip || "Tanpa NIP")}</p></div><span className="text-sm font-bold text-blue-700 dark:text-blue-300">{Number(assignment.progress)}%</span></div>{assignment.dueAt && <p className="mt-2 text-xs text-oxford-500">Tenggat {new Date(String(assignment.dueAt)).toLocaleString("id-ID")}</p>}</div>)}{data.assignments.length === 0 && <p className="text-sm text-oxford-500">Belum ada peserta.</p>}</div></div>
          </aside>
        </div>
      </div>
    </main>
  );
}
