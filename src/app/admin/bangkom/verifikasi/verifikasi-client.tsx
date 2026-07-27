"use client";

import { useState } from "react";
import { Check, X, FileText, Calendar, Building2, Clock, Search } from "lucide-react";
import { ExternalBangkom } from "@/lib/types";
import { updateExternalBangkomStatus } from "@/app/actions/bangkom";
import { toast } from "sonner";

export default function VerifikasiClient({ pendingList }: { pendingList: ExternalBangkom[] }) {
    const [list, setList] = useState(pendingList);
    const [searchTerm, setSearchTerm] = useState("");

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        const res = await updateExternalBangkomStatus(id, status);
        if (res.success) {
            toast.success(`Pengajuan berhasil di-${status}`);
            setList(prev => prev.filter(item => item.id !== id));
        } else {
            toast.error("Gagal memproses pengajuan.");
        }
    };

    const filtered = list.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.provider.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 font-sans">
            <div>
                <h1 className="text-3xl font-serif font-bold text-oxford-900 dark:text-white">Verifikasi Bangkom Eksternal</h1>
                <p className="text-oxford-500 mt-2">Tinjau dan setujui bukti pengembangan kompetensi dari luar sistem.</p>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Cari judul atau penyelenggara..."
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#161B2A] border border-oxford-100 dark:border-oxford-800 rounded-xl focus:ring-2 focus:ring-gold-500 transition-all outline-none text-oxford-900 dark:text-white shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filtered.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-100 dark:border-oxford-800 p-6 shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-oxford-50 dark:bg-oxford-900 text-gold-500 rounded-xl flex items-center justify-center">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-oxford-900 dark:text-white line-clamp-1">{item.title}</h3>
                                        <div className="flex items-center gap-1.5 text-xs text-oxford-400 mt-1">
                                            <Building2 size={14} /> {item.provider}
                                        </div>
                                    </div>
                                </div>
                                <div className="px-3 py-1 bg-gold-500/10 text-gold-500 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-gold-500/20">
                                    {item.jp} JP
                                </div>
                            </div>

                            <div className="space-y-3 mb-8 flex-1">
                                <div className="flex items-center gap-3 text-sm text-oxford-600 dark:text-oxford-300">
                                    <Calendar size={16} className="text-oxford-400" />
                                    Selesai: {new Date(item.dateCompleted).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-oxford-600 dark:text-oxford-300">
                                    <Clock size={16} className="text-oxford-400" />
                                    Diajukan: {new Date(item.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                </div>
                                {item.certificateUrl && (
                                    <a 
                                        href={item.certificateUrl} 
                                        target="_blank" 
                                        className="inline-flex items-center gap-2 text-sm text-gold-600 font-bold hover:underline mt-2"
                                    >
                                        <ExternalLink size={16} /> Lihat Sertifikat
                                    </a>
                                )}
                            </div>

                            <div className="flex items-center gap-3 pt-6 border-t border-oxford-50 dark:border-oxford-800">
                                <button 
                                    onClick={() => handleAction(item.id, 'approved')}
                                    className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <Check size={18} /> Setujui
                                </button>
                                <button 
                                    onClick={() => handleAction(item.id, 'rejected')}
                                    className="flex-1 py-2.5 bg-crimson-500 hover:bg-crimson-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <X size={18} /> Tolak
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-100 dark:border-oxford-800 border-dashed p-16 text-center">
                    <div className="w-16 h-16 bg-oxford-50 dark:bg-oxford-900 text-oxford-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-oxford-900 dark:text-white">Semua beres!</h3>
                    <p className="text-oxford-400 mt-2">Tidak ada pengajuan Bangkom eksternal yang perlu diverifikasi.</p>
                </div>
            )}
        </div>
    );
}

// Separate helper component for ExternalLink since it wasn't in the initial import
function ExternalLink({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    );
}
