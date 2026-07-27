export const metadata = { title: "Kebijakan Privasi | CorpuKU Academy" };

export default function PrivacyPage() {
  const sections = [
    ["Data yang diproses", "Platform memproses data profil kedinasan, aktivitas pembelajaran, nilai, kehadiran, sertifikat, preferensi notifikasi, dan log keamanan yang diperlukan untuk menyelenggarakan layanan."],
    ["Tujuan pemrosesan", "Data digunakan untuk autentikasi, penyampaian materi, pelacakan kompetensi, penerbitan kredensial, pelaporan organisasi, pencegahan penyalahgunaan, dan peningkatan kualitas layanan."],
    ["Akses dan pembagian", "Data hanya dapat diakses sesuai peran. Informasi verifikasi sertifikat yang ditampilkan kepada publik dibatasi pada data yang diperlukan dan NIP ditutupi sebagian."],
    ["Keamanan dan retensi", "Password disimpan dalam bentuk hash, sesi dapat dicabut, dan perubahan sensitif diaudit. Data disimpan selama dibutuhkan oleh kebijakan organisasi dan kewajiban pengembangan kompetensi."],
    ["Hak pengguna", "Pengguna dapat meminta koreksi profil, penjelasan penggunaan data, atau penanganan masalah privasi melalui administrator organisasi."],
  ];
  return <main className="min-h-screen bg-oxford-50 px-5 py-14 dark:bg-oxford-950"><article className="mx-auto max-w-3xl rounded-3xl border border-oxford-200 bg-white p-8 shadow-sm dark:border-oxford-800 dark:bg-[#161B2A] md:p-12"><p className="text-sm font-bold uppercase tracking-widest text-gold-600">Kebijakan CorpuKU</p><h1 className="mt-3 text-4xl font-bold text-oxford-950 dark:text-white">Kebijakan Privasi</h1><p className="mt-2 text-sm text-oxford-500">Pembaruan terakhir: 23 Juli 2026</p><div className="mt-10 space-y-8">{sections.map(([heading, content]) => <section key={heading}><h2 className="text-xl font-bold text-oxford-900 dark:text-white">{heading}</h2><p className="mt-3 leading-7 text-oxford-600 dark:text-oxford-300">{content}</p></section>)}</div></article></main>;
}
