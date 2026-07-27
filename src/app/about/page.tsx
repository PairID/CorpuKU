import Image from "next/image";
import { Users, Target, BookOpen, MapPin, Globe, CheckCircle2 } from "lucide-react";
import { getAboutUsData } from "@/app/actions/about";

export const metadata = {
  title: "About Us | Badan Pengembangan Sumber Daya Manusia Provinsi Kalimantan Utara",
  description: "Struktur Organisasi dan Visi Misi BPSDM Kaltara.",
};

export default async function AboutUsPage() {
  const data = await getAboutUsData();

  return (
    <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 font-sans">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-oxford-950 text-white pt-24 pb-32">
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-mesh mix-blend-overlay opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-oxford-950 to-transparent opacity-90" />
        </div>

        <div className="container relative z-10 mx-auto px-4 max-w-6xl text-center">
            <div className="inline-flex justify-center items-center gap-4 mb-8">
                {data.taglines.map((tag, idx) => (
                    <span key={idx} className={`px-4 py-1.5 rounded-full font-bold text-sm tracking-widest uppercase border ${idx === 0 ? 'bg-gold-500/20 text-gold-400 border-gold-500/30' : 'bg-white dark:bg-[#161B2A]/10 text-white border-white/20'}`}>
                        {tag}
                    </span>
                ))}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6 leading-tight whitespace-pre-wrap">
                {data.title.replace('Provinsi', '\nProvinsi')}
            </h1>

            <p className="text-oxford-300 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
                {data.subtitle}
            </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 bg-white dark:bg-[#161B2A] relative z-20 -mt-10 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-oxford-100 dark:border-oxford-800">
        <div className="container mx-auto px-4 max-w-6xl">
            
            {/* Intro Stats/Values */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
                <div className="bg-oxford-50 dark:bg-oxford-950 rounded-2xl p-8 border border-oxford-100 dark:border-oxford-800 flex flex-col items-center text-center group hover:bg-gold-50 hover:border-gold-200 transition-colors">
                    <div className="w-16 h-16 bg-white dark:bg-[#161B2A] rounded-xl shadow-sm flex items-center justify-center text-gold-500 mb-6 group-hover:scale-110 transition-transform">
                        <Target size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-oxford-900 dark:text-white mb-3">Visi Strategis</h3>
                    <p className="text-oxford-600 dark:text-oxford-300">{data.vision}</p>
                </div>
                <div className="bg-oxford-50 dark:bg-oxford-950 rounded-2xl p-8 border border-oxford-100 dark:border-oxford-800 flex flex-col items-center text-center group hover:bg-gold-50 hover:border-gold-200 transition-colors">
                    <div className="w-16 h-16 bg-white dark:bg-[#161B2A] rounded-xl shadow-sm flex items-center justify-center text-gold-500 mb-6 group-hover:scale-110 transition-transform">
                        <BookOpen size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-oxford-900 dark:text-white mb-3">Misi Kompetensi</h3>
                    <p className="text-oxford-600 dark:text-oxford-300">{data.mission}</p>
                </div>
                <div className="bg-oxford-50 dark:bg-oxford-950 rounded-2xl p-8 border border-oxford-100 dark:border-oxford-800 flex flex-col items-center text-center group hover:bg-gold-50 hover:border-gold-200 transition-colors">
                    <div className="w-16 h-16 bg-white dark:bg-[#161B2A] rounded-xl shadow-sm flex items-center justify-center text-gold-500 mb-6 group-hover:scale-110 transition-transform">
                        <Users size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-oxford-900 dark:text-white mb-3">Pelayanan Prima</h3>
                    <p className="text-oxford-600 dark:text-oxford-300">{data.values}</p>
                </div>
            </div>

            {/* Organizational Structure Title */}
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-oxford-900 dark:text-white mb-4">Struktur Organisasi</h2>
                <div className="w-24 h-1.5 bg-gold-500 mx-auto rounded-full"></div>
            </div>

            {/* Top Leadership (Kepala & Sekretaris) */}
            <div className="flex flex-col md:flex-row justify-center gap-8 mb-12">
                {data.leaders.map((leader, index) => (
                    <div key={index} className={`bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden w-full md:w-80 group hover:shadow-xl hover:border-gold-300 transition-all ${index === 0 ? 'ring-2 ring-gold-500 ring-offset-2' : ''}`}>
                        <div className={`h-2 ${index === 0 ? 'bg-gold-500' : 'bg-oxford-900'}`}></div>
                        <div className="p-8 text-center relative">
                            <div className="w-24 h-24 mx-auto bg-oxford-100 dark:bg-[#161B2A] rounded-full mb-6 border-4 border-white shadow-md flex items-center justify-center text-oxford-400 overflow-hidden">
                                {leader.image ? (
                                    <Image src={leader.image} alt={leader.name} width={96} height={96} unoptimized className="w-full h-full object-cover" />
                                ) : (
                                    <Users size={40} />
                                )}
                            </div>
                            <h3 className="font-bold text-xl text-oxford-900 dark:text-white mb-1">{leader.name}</h3>
                            <p className="text-gold-600 font-bold text-sm uppercase tracking-wide mb-4">{leader.role}</p>
                            <div className="space-y-1">
                                <p className="text-xs text-oxford-500 dark:text-oxford-400"><span className="font-semibold text-oxford-700 dark:text-oxford-200">Pangkat:</span> {leader.rank}</p>
                                <p className="text-xs text-oxford-500 dark:text-oxford-400"><span className="font-semibold text-oxford-700 dark:text-oxford-200">NIP:</span> {leader.nip}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Kepala Bidang */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
                {data.kabids.map((kabid, index) => (
                    <div key={index} className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden group hover:shadow-xl hover:border-gold-300 transition-all flex items-center p-6 gap-6">
                        <div className="w-20 h-20 bg-oxford-50 dark:bg-oxford-950 rounded-full border border-oxford-200 dark:border-oxford-700 shadow-inner flex flex-shrink-0 items-center justify-center text-oxford-300 overflow-hidden">
                            {kabid.image ? (
                                <Image src={kabid.image} alt={kabid.name} width={80} height={80} unoptimized className="w-full h-full object-cover" />
                            ) : (
                                <Users size={32} />
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-oxford-900 dark:text-white mb-1 leading-tight">{kabid.name}</h3>
                            <p className="text-oxford-600 dark:text-oxford-300 font-bold text-xs uppercase tracking-wide mb-3 leading-snug">{kabid.role}</p>
                            <p className="text-xs text-oxford-400 font-mono">NIP: {kabid.nip}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Kasubbag & Kasubbid */}
            <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-oxford-900 dark:text-white mb-8 font-serif">Unsur Pelaksana Teknis & Administrasi</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20 max-w-5xl mx-auto">
                {data.kasubbags.map((bag, index) => (
                    <div key={index} className="bg-oxford-50 dark:bg-oxford-950 rounded-xl p-5 border border-oxford-100 dark:border-oxford-800 hover:bg-white dark:hover:bg-[#161B2A] hover:shadow-md transition-all">
                        <h4 className="font-bold text-oxford-900 dark:text-white text-sm mb-1">{bag.name}</h4>
                        <p className="text-gold-600 text-xs font-bold mb-2">{bag.role}</p>
                        <p className="text-[10px] text-oxford-400">NIP: {bag.nip}</p>
                    </div>
                ))}
            </div>

            {/* Widyaiswara & Arsiparis Section */}
            <div className="bg-oxford-900 rounded-3xl p-8 md:p-12 relative overflow-hidden text-white shadow-2xl">
                <div className="absolute inset-0 bg-mesh mix-blend-overlay opacity-10" />
                <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
                    <div className="md:w-1/3 text-center md:text-left">
                        <h3 className="text-3xl font-serif font-bold text-white mb-4 leading-tight">Tenaga Fungsional & Pendidik</h3>
                        <p className="text-oxford-300 mb-6 text-sm leading-relaxed">
                            Pilar utama transformasi tata kelola pemerintahan yang didukung oleh Widyaiswara kompeten dan Arsiparis handal dalam menyusun pembelajaran berkelanjutan.
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500/20 text-gold-400 rounded-full text-xs font-bold font-mono">
                            <CheckCircle2 size={16} /> Total: {data.functionals.length} Personel
                        </div>
                    </div>

                    <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {data.functionals.map((func, idx) => (
                            <div key={idx} className="bg-white dark:bg-[#161B2A]/10 border border-white/20 backdrop-blur-sm rounded-xl p-4 hover:bg-white dark:hover:bg-[#161B2A]/20 transition-colors">
                                <h4 className="font-bold text-white text-sm leading-tight mb-1">{func.name}</h4>
                                <p className="text-gold-400 text-[10px] uppercase font-bold tracking-wider">{func.role}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
      </section>

      {/* Footer Contact Info */}
      <section className="bg-oxford-50 dark:bg-oxford-950 py-16 border-t border-oxford-200 dark:border-oxford-700 mt-auto">
        <div className="container mx-auto px-4 max-w-4xl text-center flex flex-col items-center">
            <h3 className="text-2xl font-bold font-serif text-oxford-900 dark:text-white mb-8">Hubungi Kami</h3>
            
            <div className="flex flex-col md:flex-row gap-8 w-full justify-center text-oxford-600 dark:text-oxford-300">
                <div className="flex items-center gap-3 bg-white dark:bg-[#161B2A] px-6 py-4 rounded-xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex-1 max-w-[300px]">
                    <div className="w-10 h-10 bg-oxford-100 dark:bg-[#161B2A] text-oxford-900 dark:text-white rounded-full flex items-center justify-center">
                        <Globe size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-bold text-oxford-400 uppercase tracking-wider">Website Portal</p>
                        <p className="font-medium text-sm">bpsdm.kaltaraprov.go.id</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white dark:bg-[#161B2A] px-6 py-4 rounded-xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex-1 max-w-[300px]">
                    <div className="w-10 h-10 bg-gold-100 text-gold-600 rounded-full flex items-center justify-center">
                        <MapPin size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-bold text-oxford-400 uppercase tracking-wider">Instagram Resmi</p>
                        <p className="font-medium text-sm">@bpsdm.kaltara</p>
                    </div>
                </div>
            </div>
            
        </div>
      </section>

    </div>
  );
}
