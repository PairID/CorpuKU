import Link from "next/link";
import { BookOpen, LayoutDashboard, Sparkles, Settings, Database } from "lucide-react";
import RegulationRegistryManager from "@/components/regulations/RegulationRegistryManager";

export const metadata = {
    title: "Bank Data Regulasi & SOP • CorpuKU Bangkom ASN",
    description: "Repositori naskah hukum resmi JDIH BPK dan SOP kedinasan untuk grounding modul pelatihan ASN."
};

export default function InstructorRegulationsPage() {
    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            {/* SIDEBAR */}
            <aside className="hidden lg:flex flex-col w-64 bg-oxford-950 text-white min-h-screen border-r border-oxford-800 sticky top-0">
                <div className="p-6 border-b border-oxford-800">
                    <Link href="/instructor" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gold-500 text-oxford-900 rounded-lg flex items-center justify-center">
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
                    <Link href="/instructor/courses" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <BookOpen size={20} /> Kursus Saya
                    </Link>
                    <Link href="/instructor/courses/creator" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <Sparkles size={20} className="text-gold-400" /> Course Creator (AI)
                    </Link>
                    <Link href="/instructor/regulations" className="flex items-center gap-3 px-4 py-3 bg-gold-500/10 text-gold-400 rounded-xl font-bold border border-gold-500/20">
                        <Database size={20} className="text-cyan-400" /> Bank Data Regulasi
                    </Link>
                </nav>

                <div className="p-4 border-t border-oxford-800 space-y-2">
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <Settings size={20} /> Pengaturan
                    </Link>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen">
                <div className="p-6 md:p-8 lg:p-10 max-w-6xl mx-auto w-full">
                    <RegulationRegistryManager basePath="/instructor" />
                </div>
            </main>
        </div>
    );
}
