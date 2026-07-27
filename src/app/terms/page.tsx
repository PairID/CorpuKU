export const metadata = { title: "Syarat dan Ketentuan | CorpuKU Academy" };

export default function TermsPage() {
  return <PolicyPage title="Syarat dan Ketentuan" updated="23 Juli 2026" sections={[
    ["Penggunaan layanan", "CorpuKU digunakan untuk kegiatan pembelajaran dan pengembangan kompetensi yang sah. Pengguna wajib menjaga kerahasiaan akun dan tidak menyalahgunakan materi, penilaian, presensi, atau sertifikat."],
    ["Integritas pembelajaran", "Jawaban kuis, kehadiran webinar, progres, dan bukti kelulusan harus mewakili aktivitas pengguna yang sebenarnya. Manipulasi data dapat menyebabkan pembatalan hasil belajar atau pencabutan sertifikat."],
    ["Konten dan hak penggunaan", "Materi tetap tunduk pada hak organisasi atau pembuatnya. Pengguna hanya boleh mengunduh, membagikan, atau menggunakan ulang konten sesuai izin yang tercantum."],
    ["Perubahan layanan", "Pengelola dapat memperbarui fitur, kebijakan, dan persyaratan operasional untuk menjaga keamanan serta kualitas layanan. Perubahan material akan diumumkan melalui kanal resmi platform."],
  ]} />;
}

function PolicyPage({ title, updated, sections }: { title: string; updated: string; sections: Array<[string, string]> }) {
  return <main className="min-h-screen bg-oxford-50 px-5 py-14 dark:bg-oxford-950"><article className="mx-auto max-w-3xl rounded-3xl border border-oxford-200 bg-white p-8 shadow-sm dark:border-oxford-800 dark:bg-[#161B2A] md:p-12"><p className="text-sm font-bold uppercase tracking-widest text-gold-600">Kebijakan CorpuKU</p><h1 className="mt-3 text-4xl font-bold text-oxford-950 dark:text-white">{title}</h1><p className="mt-2 text-sm text-oxford-500">Pembaruan terakhir: {updated}</p><div className="mt-10 space-y-8">{sections.map(([heading, content]) => <section key={heading}><h2 className="text-xl font-bold text-oxford-900 dark:text-white">{heading}</h2><p className="mt-3 leading-7 text-oxford-600 dark:text-oxford-300">{content}</p></section>)}</div><p className="mt-10 rounded-xl bg-oxford-50 p-4 text-sm text-oxford-600 dark:bg-oxford-950 dark:text-oxford-300">Pertanyaan mengenai kebijakan dapat disampaikan kepada administrator CorpuKU di organisasi Anda.</p></article></main>;
}
