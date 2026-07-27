"use client";

import { useState } from "react";
import { 
    BookOpen, Trophy, Clock, Plus, ExternalLink, 
    CheckCircle, Calendar, Building2,
    X, Send, Menu
} from "lucide-react";
import { UserSidebar } from "@/components/layout/UserSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { submitExternalBangkom, getExternalBangkomByUser } from "@/app/actions/bangkom";
import { ExternalBangkom } from "@/lib/types";
import { toast } from "sonner";

export default function UserBangkomClient({ 
    userId, 
    initialSummary, 
    initialExternal 
}: { 
    userId: string, 
    initialSummary: { totalJp: number; internalJp: number; externalJp: number },
    initialExternal: ExternalBangkom[] 
}) {
    const [summary] = useState(initialSummary);
    const [externalList, setExternalList] = useState(initialExternal);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        provider: "",
        dateCompleted: "",
        jp: 0,
        certificateUrl: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const res = await submitExternalBangkom(userId, {
                title: formData.title,
                provider: formData.provider,
                dateCompleted: formData.dateCompleted,
                jp: Number(formData.jp),
                certificateUrl: formData.certificateUrl
            });

            if (res.success) {
                toast.success("Pengajuan Bangkom eksternal berhasil dikirim!");
                setIsModalOpen(false);
                setFormData({ title: "", provider: "", dateCompleted: "", jp: 0, certificateUrl: "" });
                
                // Refresh list
                const newList = await getExternalBangkomByUser(userId);
                setExternalList(newList);
            } else {
                toast.error("Gagal mengirimkan pengajuan.");
            }
        } catch {
            toast.error("Terjadi kesalahan sistem.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const targetJp = 20; // Default target
    const progressPercent = Math.min((summary.totalJp / targetJp) * 100, 100);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex">
            {/* SIDEBAR */}
            <UserSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen relative">
                {/* Mobile sidebar toggle button (floating) */}
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gold-500 text-oxford-950 rounded-full shadow-2xl hover:bg-gold-400 transition-all active:scale-95"
                >
                    <Menu size={24} />
                </button>

                <div className="p-8 max-w-6xl mx-auto w-full">
                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-oxford-900 dark:text-white tracking-tight">Progres Bangkom</h1>
                            <p className="text-oxford-500 mt-2">Lacak pemenuhan Jam Pelajaran (JP) Anda tahun ini.</p>
                        </div>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-gold-500 text-oxford-950 rounded-2xl font-bold hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 active:scale-95"
                        >
                            <Plus size={18} /> Tambah Bangkom Luar
                        </button>
                    </div>

                    {/* Progress Overview Card */}
                    <div className="bg-white dark:bg-[#161B2A] rounded-3xl border border-oxford-100 dark:border-oxford-800 p-8 shadow-xl shadow-oxford-100/20 dark:shadow-none overflow-hidden relative mb-10">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-oxford-400 uppercase tracking-widest text-xs">Total Capaian JP</h3>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${progressPercent === 100 ? 'bg-green-100 text-green-600' : 'bg-gold-50 text-gold-600'}`}>
                                {progressPercent === 100 ? 'Target Terpenuhi' : 'Dalam Proses'}
                            </span>
                        </div>
                        
                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-6xl font-serif font-bold text-oxford-900 dark:text-white">{summary.totalJp}</span>
                            <span className="text-xl text-oxford-400 font-medium">/ {targetJp} JP</span>
                        </div>

                        <div className="w-full h-4 bg-oxford-50 dark:bg-oxford-900 rounded-full overflow-hidden mb-4">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`h-full rounded-full ${progressPercent === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-gold-500 to-gold-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'}`}
                            />
                        </div>
                        <p className="text-sm text-oxford-500">Sisa pemenuhan: <span className="font-bold text-oxford-900 dark:text-white">{Math.max(0, targetJp - summary.totalJp)} JP lagi</span> untuk mencapai target minimal tahunan.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-oxford-50 dark:bg-oxford-900/40 p-6 rounded-2xl border border-oxford-100 dark:border-oxford-800">
                            <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mb-4">
                                <BookOpen size={20} />
                            </div>
                            <p className="text-2xl font-bold text-oxford-900 dark:text-white">{summary.internalJp}</p>
                            <p className="text-xs text-oxford-400 font-bold uppercase tracking-tighter mt-1">Sistem CorpuKU</p>
                        </div>
                        <div className="bg-oxford-50 dark:bg-oxford-900/40 p-6 rounded-2xl border border-oxford-100 dark:border-oxford-800">
                            <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center mb-4">
                                <Plus size={20} />
                            </div>
                            <p className="text-2xl font-bold text-oxford-900 dark:text-white">{summary.externalJp}</p>
                            <p className="text-xs text-oxford-400 font-bold uppercase tracking-tighter mt-1">Bangkom Eksternal</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* List & Actions */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-serif font-bold text-oxford-900 dark:text-white">Riwayat Pengembangan Kompetensi</h3>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-oxford-950 rounded-xl font-bold hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 active:scale-95"
                    >
                        <Plus size={18} /> Tambah Bangkom Luar
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {externalList.length > 0 ? (
                        externalList.map((item) => (
                            <div key={item.id} className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-100 dark:border-oxford-800 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-lg hover:shadow-oxford-100/50 dark:hover:shadow-none transition-all group">
                                <div className="flex items-center gap-5">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.status === 'approved' ? 'bg-green-500/10 text-green-500' : item.status === 'rejected' ? 'bg-crimson-500/10 text-crimson-500' : 'bg-gold-500/10 text-gold-500'}`}>
                                        <Trophy size={28} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-oxford-900 dark:text-white text-lg">{item.title}</h4>
                                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1">
                                            <div className="flex items-center gap-1.5 text-xs text-oxford-400">
                                                <Building2 size={14} /> {item.provider}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-oxford-400">
                                                <Calendar size={14} /> {new Date(item.dateCompleted).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-gold-500">
                                                <Clock size={14} /> {item.jp} JP
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-oxford-50 dark:border-oxford-800">
                                    <div className="flex flex-col items-end">
                                        <div className={`flex items-center gap-1.5 font-bold text-xs uppercase tracking-widest ${item.status === 'approved' ? 'text-green-500' : item.status === 'rejected' ? 'text-crimson-500' : 'text-gold-500'}`}>
                                            {item.status === 'approved' ? <CheckCircle size={14} /> : item.status === 'rejected' ? <X size={14} /> : <Clock size={14} />}
                                            {item.status === 'approved' ? 'Disetujui' : item.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                                        </div>
                                    </div>
                                    {item.certificateUrl && (
                                        <a href={item.certificateUrl} target="_blank" className="p-3 bg-oxford-50 dark:bg-oxford-900 text-oxford-400 hover:text-gold-500 rounded-xl transition-all">
                                            <ExternalLink size={20} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-100 dark:border-oxford-800 border-dashed p-12 text-center">
                            <div className="w-16 h-16 bg-oxford-50 dark:bg-oxford-900 rounded-full flex items-center justify-center mx-auto mb-4 text-oxford-200">
                                <Plus size={32} />
                            </div>
                            <h4 className="font-bold text-oxford-900 dark:text-white">Belum Ada Bangkom Eksternal</h4>
                            <p className="text-sm text-oxford-400 mt-2 mb-6">Jika Anda mengikuti pelatihan di luar sistem CorpuKU, silakan laporkan di sini.</p>
                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="px-6 py-2.5 bg-oxford-900 text-white rounded-xl font-bold hover:bg-gold-500 hover:text-oxford-950 transition-all"
                            >
                                Mulai Laporkan
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </main>

            {/* Modal Form */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="fixed inset-0 bg-oxford-950/80 backdrop-blur-md z-[70]"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white dark:bg-[#0F172A] z-[80] rounded-[2rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 border-b border-oxford-50 dark:border-oxford-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-serif font-bold text-oxford-900 dark:text-white">Input Bangkom Eksternal</h3>
                                    <p className="text-sm text-oxford-400 mt-1">Silakan isi detail pengembangan kompetensi Anda.</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-oxford-400 hover:text-white hover:bg-oxford-900 rounded-xl transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-oxford-400 uppercase tracking-widest mb-2" htmlFor="title">Judul Pelatihan / Kegiatan</label>
                                        <input 
                                            required
                                            type="text" 
                                            id="title"
                                            name="title"
                                            className="w-full px-4 py-3 bg-oxford-50 dark:bg-oxford-900/50 border border-oxford-100 dark:border-oxford-800 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none transition-all text-oxford-900 dark:text-white"
                                            placeholder="Contoh: Diklat Teknis IT Strategy"
                                            value={formData.title}
                                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-oxford-400 uppercase tracking-widest mb-2" htmlFor="provider">Penyelenggara</label>
                                            <input 
                                                required
                                                type="text" 
                                                id="provider"
                                                name="provider"
                                                className="w-full px-4 py-3 bg-oxford-50 dark:bg-oxford-900/50 border border-oxford-100 dark:border-oxford-800 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none transition-all text-oxford-900 dark:text-white"
                                                placeholder="Nama Instansi/Lembaga"
                                                value={formData.provider}
                                                onChange={(e) => setFormData({...formData, provider: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-oxford-400 uppercase tracking-widest mb-2" htmlFor="jp">Jumlah JP</label>
                                            <input 
                                                required
                                                type="number" 
                                                id="jp"
                                                name="jp"
                                                min="1"
                                                className="w-full px-4 py-3 bg-oxford-50 dark:bg-oxford-900/50 border border-oxford-100 dark:border-oxford-800 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none transition-all text-oxford-900 dark:text-white"
                                                placeholder="0"
                                                value={formData.jp || ""}
                                                onChange={(e) => setFormData({...formData, jp: parseInt(e.target.value) || 0})}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-oxford-400 uppercase tracking-widest mb-2" htmlFor="dateCompleted">Tanggal Selesai</label>
                                            <input 
                                                required
                                                type="date" 
                                                id="dateCompleted"
                                                name="dateCompleted"
                                                className="w-full px-4 py-3 bg-oxford-50 dark:bg-oxford-900/50 border border-oxford-100 dark:border-oxford-800 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none transition-all text-oxford-900 dark:text-white"
                                                value={formData.dateCompleted}
                                                onChange={(e) => setFormData({...formData, dateCompleted: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-oxford-400 uppercase tracking-widest mb-2" htmlFor="certificateUrl">URL Sertifikat (GDrive/Cloud)</label>
                                            <input 
                                                type="url" 
                                                id="certificateUrl"
                                                name="certificateUrl"
                                                className="w-full px-4 py-3 bg-oxford-50 dark:bg-oxford-900/50 border border-oxford-100 dark:border-oxford-800 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none transition-all text-oxford-900 dark:text-white"
                                                placeholder="https://..."
                                                value={formData.certificateUrl}
                                                onChange={(e) => setFormData({...formData, certificateUrl: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-4 bg-oxford-50 dark:bg-oxford-900 text-oxford-600 dark:text-oxford-400 font-bold rounded-2xl hover:bg-oxford-100 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-[2] py-4 bg-gold-500 text-oxford-950 font-bold rounded-2xl hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? "Mengirim..." : <><Send size={18} /> Kirim Pengajuan</>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
