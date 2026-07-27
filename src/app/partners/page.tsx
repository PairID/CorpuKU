import Link from "next/link";
import { ExternalLink, Building2, Landmark, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Affiliate & Partners | CorpuKU",
  description: "Jejaring mitra dan afiliasi pengembangan kompetensi CorpuKU.",
};

const partners = [
  {
    name: "Lembaga Administrasi Negara (LAN RI)",
    description: "Lembaga pemerintah nonkementerian yang bertugas melaksanakan tugas pemerintahan di bidang administrasi negara.",
    url: "https://lan.go.id/",
    type: "Utama"
  },
  {
    name: "BPSDM Kementerian Dalam Negeri",
    description: "Badan Pengembangan Sumber Daya Manusia Kementerian Dalam Negeri.",
    url: "https://bpsdm.kemendagri.go.id/",
    type: "Utama"
  },
  {
    name: "PPSDM Regional Bandung",
    description: "Pusat Pengembangan Sumber Daya Manusia Regional Bandung.",
    url: "https://ppsdmbandung.kemendagri.go.id/",
    type: "Regional"
  },
  {
    name: "Puslatbang KMP LAN Makassar",
    description: "Pusat Pelatihan dan Pengembangan dan Kajian Manajemen Pemerintahan LAN Makassar.",
    url: "https://puslatbangkmp.lan.go.id/",
    type: "Regional"
  },
  {
    name: "Puslatbang KDOD LAN Samarinda",
    description: "Pusat Pelatihan dan Pengembangan dan Kajian Desentralisasi dan Otonomi Daerah LAN Samarinda.",
    url: "https://puslatbangkdod.lan.go.id/",
    type: "Regional"
  },
  {
    name: "BPSDM Kementerian PUPR",
    description: "Badan Pengembangan Sumber Daya Manusia Pekerjaan Umum dan Perumahan Rakyat.",
    url: "https://bpsdm.pu.go.id/",
    type: "Kementerian"
  },
  {
    name: "BPSDM Hukum dan HAM",
    description: "Badan Pengembangan Sumber Daya Manusia Hukum dan Hak Asasi Manusia.",
    url: "https://bpsdm.kemenkumham.go.id/",
    type: "Kementerian"
  },
  {
    name: "BPPK Kemenkeu",
    description: "Badan Pendidikan dan Pelatihan Keuangan, Kementerian Keuangan RI.",
    url: "https://bppk.kemenkeu.go.id/",
    type: "Kementerian"
  },
  {
    name: "BPSDM Kementerian Perhubungan",
    description: "Badan Pengembangan Sumber Daya Manusia Perhubungan.",
    url: "https://bpsdm.dephub.go.id/",
    type: "Kementerian"
  },
  {
    name: "BPSDM ESDM",
    description: "Badan Pengembangan Sumber Daya Manusia Energi dan Sumber Daya Mineral.",
    url: "https://bpsdm.esdm.go.id/",
    type: "Kementerian"
  },
  {
    name: "BPPSDMP Kementerian Pertanian",
    description: "Badan Penyuluhan dan Pengembangan Sumber Daya Manusia Pertanian.",
    url: "https://bppsdmp.pertanian.go.id/",
    type: "Kementerian"
  },
  {
    name: "Pusdiklat Kementerian Luar Negeri",
    description: "Pusat Pendidikan dan Pelatihan Kementerian Luar Negeri RI.",
    url: "https://kemlu.go.id/",
    type: "Kementerian"
  },
  {
    name: "Pusdiklat BPK RI",
    description: "Badan Pendidikan dan Pelatihan Pemeriksaan Keuangan Negara BPK RI.",
    url: "https://badiklat.bpk.go.id/",
    type: "Lembaga Negara"
  },
  {
    name: "Pusdiklat BPS",
    description: "Pusat Pendidikan dan Pelatihan Badan Pusat Statistik.",
    url: "https://pusdiklat.bps.go.id/",
    type: "Lembaga Negara"
  },
  {
    name: "Pusdiklat Mahkamah Agung",
    description: "Badan Litbang Diklat Kumdil Mahkamah Agung Republik Indonesia.",
    url: "https://bldk.mahkamahagung.go.id/",
    type: "Lembaga Negara"
  }
];

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold-50 text-gold-700 font-bold uppercase tracking-wider text-xs rounded-full border border-gold-200 mb-6 relative group">
            <span className="relative z-10 flex items-center gap-2">
              <ShieldCheck size={14} /> Jaringan Ekosistem
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-oxford-900 dark:text-white mb-6 leading-tight">
            Afiliasi & Ekosistem <br /> <span className="text-gold-500">Kemitraan CorpuKU</span>
          </h1>
          <p className="text-oxford-600 dark:text-oxford-300 text-lg max-w-2xl mx-auto font-sans leading-relaxed">
            CorpuKU terintegrasi dengan lembaga pendidikan dan pelatihan pemerintah di tingkat pusat dan daerah, menciptakan ekosistem pembelajaran aparatur yang bersinergi dan berstandar nasional.
          </p>
        </div>

        {/* Partners Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((partner, index) => (
            <a 
              key={index} 
              href={partner.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex flex-col bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-gold-400 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden"
            >
              {/* Type Badge */}
              <div className="absolute top-0 right-0 bg-oxford-50 dark:bg-oxford-950 px-3 py-1 rounded-bl-xl text-[10px] font-bold text-oxford-500 dark:text-oxford-400 border-b border-l border-oxford-100 dark:border-oxford-800 group-hover:bg-gold-50 group-hover:text-gold-600 group-hover:border-gold-100 transition-colors">
                {partner.type}
              </div>

              <div className="mb-4 text-oxford-300 group-hover:text-gold-500 transition-colors">
                {partner.type === "Utama" || partner.type === "Lembaga Negara" ? (
                  <Landmark size={36} />
                ) : (
                  <Building2 size={36} />
                )}
              </div>
              
              <h3 className="font-serif font-bold text-lg text-oxford-900 dark:text-white mb-2 group-hover:text-gold-600 pr-8">
                {partner.name}
              </h3>
              
              <p className="text-oxford-500 dark:text-oxford-400 text-sm font-sans mb-6 flex-grow leading-relaxed">
                {partner.description}
              </p>
              
              <div className="mt-auto flex items-center pt-4 border-t border-oxford-100 dark:border-oxford-800 text-sm font-bold text-oxford-400 group-hover:text-gold-500 transition-colors">
                <span className="truncate mr-2 flex-1">{new URL(partner.url).hostname}</span>
                <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
              </div>
            </a>
          ))}
        </div>

        {/* Call to action */}
        <div className="mt-20 bg-oxford-900 rounded-3xl p-10 text-center relative overflow-hidden shadow-xl border border-oxford-800">
          <div className="absolute inset-0 bg-mesh mix-blend-overlay opacity-20" />
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-4">Ingin bergabung dalam ekosistem CorpuKU?</h2>
            <p className="text-oxford-300 mb-8 max-w-lg mx-auto font-sans">
              Kami membuka peluang kolaborasi dan integrasi API bagi instansi pemerintah yang ingin mengembangkan modul pelatihan terdesentralisasi.
            </p>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center justify-center px-8 py-3 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-xl transition-colors shadow-lg shadow-gold-500/20"
            >
              Hubungi Administrator
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
