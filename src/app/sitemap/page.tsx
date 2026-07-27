import Link from "next/link";

export const metadata = { title: "Peta Situs | CorpuKU Academy" };

const groups = [
  ["Belajar", [["Kursus", "/search"], ["Webinar", "/webinars"], ["Learning Paths", "/paths"], ["Program", "/programs"], ["Pusat Pengetahuan", "/knowledge"]]],
  ["Informasi", [["Tentang Kami", "/about"], ["Mitra", "/partners"], ["Berita", "/news"]]],
  ["Akun", [["Masuk", "/login"], ["Daftar", "/register"], ["Dashboard", "/dashboard"], ["Pengaturan", "/settings"]]],
  ["Kebijakan", [["Syarat dan Ketentuan", "/terms"], ["Privasi", "/privacy"], ["Aksesibilitas", "/accessibility"]]],
] as const;

export default function SitemapPage() {
  return <main className="min-h-screen bg-oxford-50 px-5 py-14 dark:bg-oxford-950"><div className="mx-auto max-w-5xl"><h1 className="text-4xl font-bold text-oxford-950 dark:text-white">Peta Situs</h1><div className="mt-10 grid gap-6 md:grid-cols-2">{groups.map(([title, links]) => <section key={title} className="rounded-2xl border border-oxford-200 bg-white p-6 dark:border-oxford-800 dark:bg-[#161B2A]"><h2 className="text-xl font-bold">{title}</h2><ul className="mt-4 space-y-3">{links.map(([label, href]) => <li key={href}><Link href={href} className="font-medium text-blue-700 hover:underline dark:text-blue-300">{label}</Link></li>)}</ul></section>)}</div></div></main>;
}
