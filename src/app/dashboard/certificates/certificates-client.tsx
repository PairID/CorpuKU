"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, Menu, BookOpen, Trophy, Settings, LogOut, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface CertificateSummary {
    id: string;
    title: string;
    provider: string;
    thumbnailUrl: string | null;
    completedAt: string;
    certificateNumber: string;
    href: string;
    status: string;
}

export default function CertificatesClient({ certificates }: { certificates: CertificateSummary[] }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
    };

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex">
            {/* SIDEBAR (Desktop) */}
            <aside className={`fixed lg:sticky top-20 left-0 z-50 lg:z-40 w-64 h-[calc(100vh-5rem)] bg-oxford-950 text-white transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="p-6 border-b border-oxford-800 flex items-center justify-between lg:hidden">
                    <span className="font-bold text-sm uppercase tracking-widest text-oxford-400">Menu</span>
                    <button className="lg:hidden text-white" onClick={() => setIsSidebarOpen(false)}>
                        <Menu size={24} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 font-sans">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <BookOpen size={20} /> Kelas Saya
                    </Link>
                    <Link href="/dashboard/certificates" className="flex items-center gap-3 px-4 py-3 bg-gold-500/10 text-gold-400 rounded-xl font-bold border border-gold-500/20">
                        <Trophy size={20} /> Sertifikat
                    </Link>
                    <Link href="/search" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <Search size={20} /> Cari Kelas
                    </Link>
                </nav>

                <div className="p-4 border-t border-oxford-800 font-sans space-y-2">
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <Settings size={20} /> Pengaturan
                    </Link>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-crimson-400 hover:bg-crimson-900/30 hover:text-crimson-300 rounded-xl font-medium transition-colors">
                        <LogOut size={20} /> Keluar
                    </button>
                </div>
            </aside>

            {/* Overly for mobile sidebar */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-[65] lg:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen relative">
                {/* Mobile sidebar toggle button (floating) */}
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gold-500 text-oxford-950 rounded-full shadow-2xl hover:bg-gold-400 transition-all active:scale-95"
                >
                    <Menu size={24} />
                </button>

                {/* Dashboard Content */}
                <div className="p-6 md:p-8 lg:p-12 max-w-7xl mx-auto w-full">
                    {certificates.length > 0 ? (
                        <>
                            <div className="mb-10">
                                <h2 className="text-3xl font-sans font-bold text-oxford-900 dark:text-white mb-2">Koleksi Sertifikat Anda</h2>
                                <p className="text-oxford-600 dark:text-oxford-300 font-sans">Berikut adalah seluruh sertifikat yang telah Anda dapatkan dari penyelesaian kursus.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {certificates.map((cert) => (
                                    <div key={cert.id} className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6 hover:shadow-md hover:border-gold-400 transition-all flex flex-col">
                                        <div className="w-full aspect-[4/3] bg-oxford-100 dark:bg-[#161B2A] rounded-xl mb-6 relative overflow-hidden group border border-oxford-100 dark:border-oxford-800">
                                            {cert.thumbnailUrl ? (
                                                <Image fill unoptimized src={cert.thumbnailUrl} alt={cert.title} className="object-contain group-hover:scale-105 transition-transform duration-500 p-2" />
                                            ) : (
                                                <div className="absolute inset-0 bg-mesh opacity-30 group-hover:scale-105 transition-transform duration-500" />
                                            )}
                                            <div className="absolute top-3 left-3 bg-green-500 text-white text-[10px] uppercase font-bold px-2.5 py-1 rounded-full z-10 flex items-center gap-1 shadow-md">
                                                <CheckCircle size={10} /> Lulus
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col">
                                            <p className="text-xs font-bold text-oxford-500 dark:text-oxford-400 uppercase tracking-widest mb-2">{cert.provider}</p>
                                            <h4 className="text-lg font-bold text-oxford-900 dark:text-white mb-4 leading-tight">{cert.title}</h4>
                                            
                                            <div className="text-sm border-t border-oxford-100 dark:border-oxford-800 pt-4 mt-auto">
                                                <div className="flex justify-between text-oxford-600 dark:text-oxford-300 mb-6">
                                                    <span>Dianugerahkan pada:</span>
                                                    <span className="font-medium text-oxford-900 dark:text-white">{new Date(cert.completedAt).toLocaleDateString('id-ID')}</span>
                                                </div>
                                                
                                                <Link href={cert.href} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gold-50 text-gold-700 hover:bg-gold-500 hover:text-white font-sans font-bold rounded-lg transition-colors">
                                                    <Trophy size={16} /> Lihat Sertifikat Penuh
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="mb-10 text-center flex flex-col items-center justify-center py-20 bg-white dark:bg-[#161B2A] rounded-3xl border border-oxford-200 dark:border-oxford-700 border-dashed shadow-sm">
                            <div className="w-24 h-24 bg-oxford-50 dark:bg-oxford-950 rounded-full flex items-center justify-center text-oxford-300 mb-6">
                                <Trophy size={48} />
                            </div>
                            <h2 className="text-2xl font-sans font-bold text-oxford-900 dark:text-white mb-2">Belum Ada Sertifikat</h2>
                            <p className="text-oxford-500 dark:text-oxford-400 font-sans max-w-sm mb-8">Selesaikan kelas Anda untuk mendapatkan sertifikat kelulusan yang dapat diverifikasi.</p>
                            <Link href="/search" className="px-8 py-3 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold font-sans rounded-full transition-colors shadow-sm inline-block">
                                Cari Kelas Baru
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
