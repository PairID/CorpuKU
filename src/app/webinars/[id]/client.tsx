"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerForWebinar } from "@/app/actions/webinars";
import { Webinar } from "@/lib/types";
import { Calendar, Clock, Video, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";

type WebinarUser = { name: string; nip?: string | null; instansiAsal?: string | null; jabatan?: string | null };

export default function WebinarDetailClient({ webinar, user }: { webinar: Webinar, user: WebinarUser | null }) {
    const router = useRouter();
    const [isRegistering, setIsRegistering] = useState(false);

    const handleRegister = async () => {
        if (!user) {
            router.push('/login?callbackUrl=/webinars/' + webinar.id);
            return;
        }

        setIsRegistering(true);
        try {
            const res = await registerForWebinar(webinar.id);
            if (res.success) {
                // Redirect directly to dashboard (Single Hub)
                router.push(`/dashboard/webinars/${webinar.id}`);
            } else {
                toast.error("Gagal mendaftar: " + res.error);
                setIsRegistering(false);
            }
        } catch (error) {
            console.error(error);
            setIsRegistering(false);
        }
    };

    return (
        <div className="bg-oxford-50 dark:bg-oxford-950 min-h-screen pb-24">
            {/* HERO SECTION */}
            <div className="bg-oxford-950 text-white pt-12 pb-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-mesh opacity-20" />
                <div className="container mx-auto px-4 relative z-10">
                    <Link href="/webinars" className="inline-flex items-center gap-2 text-gold-500 hover:text-gold-400 font-medium mb-8 transition-colors">
                        <ArrowLeft size={16} /> Kembali ke Katalog
                    </Link>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2">
                            <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6 leading-tight">
                                {webinar.title}
                            </h1>
                            <p className="text-oxford-300 text-lg mb-8 leading-relaxed">
                                {webinar.description}
                            </p>
                            
                            <div className="flex flex-wrap gap-6 mb-8">
                                <div className="flex items-center gap-3 bg-white dark:bg-[#161B2A]/10 px-4 py-3 rounded-xl border border-white/10 backdrop-blur-sm">
                                    <div className="w-10 h-10 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center shrink-0">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-oxford-400 uppercase tracking-wider font-semibold">Tanggal</p>
                                        <p className="font-medium">{new Date(webinar.scheduledAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white dark:bg-[#161B2A]/10 px-4 py-3 rounded-xl border border-white/10 backdrop-blur-sm">
                                    <div className="w-10 h-10 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center shrink-0">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-oxford-400 uppercase tracking-wider font-semibold">Waktu</p>
                                        <p className="font-medium">{new Date(webinar.scheduledAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-20 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* THUMBNAIL */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-xl shadow-oxford-900/5 overflow-hidden border border-oxford-100 dark:border-oxford-800 p-2">
                            {webinar.thumbnailUrl ? (
                                <div className="relative h-[500px] w-full overflow-hidden rounded-xl">
                                    <Image src={webinar.thumbnailUrl} alt={webinar.title} fill sizes="(min-width: 1024px) 66vw, 100vw" unoptimized className="object-cover" />
                                </div>
                            ) : (
                                <div className="w-full h-[400px] bg-oxford-900 rounded-xl flex items-center justify-center flex-col text-oxford-400">
                                    <Video size={64} className="mb-4 opacity-50" />
                                    <p className="font-serif">Tidak ada poster tersedia</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* REGISTRATION CARD */}
                    <div className="lg:col-span-1">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-xl shadow-oxford-900/10 border border-oxford-100 dark:border-oxford-800 p-6 sticky top-24"
                        >
                            <h3 className="text-2xl font-serif text-oxford-900 dark:text-white font-bold mb-6">Pendaftaran Webinar</h3>

                            {!user ? (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-oxford-50 dark:bg-oxford-950 rounded-full flex items-center justify-center mx-auto mb-4 text-oxford-400">
                                        <AlertCircle size={32} />
                                    </div>
                                    <p className="text-oxford-600 dark:text-oxford-300 mb-6">Anda harus masuk ke akun CorpuKU terlebih dahulu untuk dapat mendaftar webinar ini.</p>
                                    <button onClick={handleRegister} className="w-full bg-oxford-900 hover:bg-oxford-800 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-oxford-900/20">
                                        Masuk / Daftar Akun
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="bg-gold-50/50 border border-gold-200 rounded-xl p-4 mb-6">
                                        <h4 className="font-semibold text-oxford-900 dark:text-white flex items-center gap-2 mb-3">
                                            <CheckCircle size={18} className="text-gold-600" />
                                            Konfirmasi Biodata
                                        </h4>
                                        <p className="text-xs text-oxford-600 dark:text-oxford-300 mb-4">Pastikan data di bawah ini sesuai. Data ini akan dicetak pada Sertifikat Anda.</p>
                                        
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-xs text-oxford-500 dark:text-oxford-400 uppercase font-semibold">Nama Lengkap & Gelar</p>
                                                <p className="font-medium text-oxford-900 dark:text-white">{user.name}</p>
                                            </div>
                                            {user.nip && (
                                                <div>
                                                    <p className="text-xs text-oxford-500 dark:text-oxford-400 uppercase font-semibold">NIP</p>
                                                    <p className="font-medium text-oxford-900 dark:text-white">{user.nip}</p>
                                                </div>
                                            )}
                                            {user.instansiAsal && (
                                                <div>
                                                    <p className="text-xs text-oxford-500 dark:text-oxford-400 uppercase font-semibold">Instansi</p>
                                                    <p className="font-medium text-oxford-900 dark:text-white">{user.instansiAsal}</p>
                                                </div>
                                            )}
                                            {user.jabatan && (
                                                <div>
                                                    <p className="text-xs text-oxford-500 dark:text-oxford-400 uppercase font-semibold">Jabatan</p>
                                                    <p className="font-medium text-oxford-900 dark:text-white">{user.jabatan}</p>
                                                </div>
                                            )}
                                        </div>

                                        <Link href="/profile" className="text-gold-600 text-sm font-medium mt-4 block hover:underline">
                                            Edit Biodata di Profil
                                        </Link>
                                    </div>

                                    <button 
                                        onClick={handleRegister} 
                                        disabled={isRegistering}
                                        className="w-full bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold py-4 rounded-xl transition-all shadow-lg shadow-gold-500/30 flex justify-center items-center gap-2 disabled:opacity-50"
                                    >
                                        {isRegistering ? "Mendaftarkan..." : "Daftar Webinar Sekarang"}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>

                </div>
            </div>
        </div>
    );
}
