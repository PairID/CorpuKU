"use client";

import { useState } from "react";
import { 
    ChevronLeft, CheckCircle2, XCircle, AlertCircle, Edit, RefreshCw, 
    Filter, Check, ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { retryBatchItem } from "@/app/actions/bangkom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export interface BatchItem {
    id: string;
    nip: string;
    rawData: {
        title: string;
        jp: number;
        provider: string;
        dateCompleted: string;
        dateStarted?: string;
        certificateNo?: string;
        [key: string]: string | number | undefined;
    };
    status: "PENDING" | "SUCCESS" | "FAILED";
    actionTaken?: "INSERTED" | "UPDATED" | "SKIPPED" | "ERROR";
    errorMessage?: string;
}

export interface BatchJobSummary {
    file_name: string;
    total_rows: number;
    success_count: number;
    failed_count: number;
}

export default function BatchJobDetailClient({ initialJob, initialItems }: { initialJob: BatchJobSummary; initialItems: BatchItem[] }) {
    const [job, setJob] = useState(initialJob);
    const [items, setItems] = useState<BatchItem[]>(initialItems);
    const [filterStatus, setFilterStatus] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL");
    
    // Modal Edit State
    const [selectedItem, setSelectedItem] = useState<BatchItem | null>(null);
    const [editNip, setEditNip] = useState("");
    const [isRetrying, setIsRetrying] = useState(false);

    const filteredItems = items.filter(item => {
        if (filterStatus === "ALL") return true;
        return item.status === filterStatus;
    });

    const openEditModal = (item: BatchItem) => {
        setSelectedItem(item);
        setEditNip(item.nip);
    };

    const handleRetry = async () => {
        if (!selectedItem) return;

        setIsRetrying(true);
        try {
            const res = await retryBatchItem(selectedItem.id, editNip);
            
            if (res.success) {
                toast.success("Baris data berhasil diperbaiki dan di-impor!");
                
                // Dynamically update this item's status in local state
                setItems(prevItems => prevItems.map(item => {
                    if (item.id === selectedItem.id) {
                        return {
                            ...item,
                            nip: editNip,
                            status: "SUCCESS" as const,
                            actionTaken: "INSERTED" as const, // Or UPDATED, but SUCCESS is enough
                            errorMessage: undefined
                        };
                    }
                    return item;
                }));

                // Update job summary counts locally
                setJob((prevJob) => {
                    const nextSuccess = prevJob.success_count + 1;
                    const nextFailed = Math.max(0, prevJob.failed_count - 1);
                    return {
                        ...prevJob,
                        success_count: nextSuccess,
                        failed_count: nextFailed
                    };
                });

                setSelectedItem(null);
            } else {
                toast.error(res.message || "Pegawai tetap tidak ditemukan. Periksa kembali NIP.");
            }
        } catch {
            toast.error("Terjadi kesalahan koneksi.");
        } finally {
            setIsRetrying(false);
        }
    };

    return (
        <div className="space-y-10 font-sans pb-32">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link 
                    href="/admin/bangkom/upload/history" 
                    className="p-3 bg-white dark:bg-[#161B2A] border border-oxford-100 dark:border-oxford-800 rounded-2xl hover:bg-oxford-50 transition-colors text-oxford-600 dark:text-white"
                >
                    <ChevronLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-3xl font-serif font-bold text-oxford-900 dark:text-white">Audit Baris Impor</h1>
                    <p className="text-oxford-500 mt-1">Reviu detail per-baris dari file: <span className="font-bold text-oxford-700 dark:text-white">{job.file_name}</span></p>
                </div>
            </div>

            {/* Statistics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#161B2A] p-6 rounded-3xl border border-oxford-100 dark:border-oxford-800 shadow-sm">
                    <span className="text-xs text-oxford-400 font-bold uppercase tracking-wider block">Total Baris</span>
                    <span className="text-3xl font-bold text-oxford-900 dark:text-white mt-1 block">{job.total_rows}</span>
                </div>
                <div className="bg-white dark:bg-[#161B2A] p-6 rounded-3xl border border-oxford-100 dark:border-oxford-800 shadow-sm">
                    <span className="text-xs text-green-500 font-bold uppercase tracking-wider block">Sukses Terproses</span>
                    <span className="text-3xl font-bold text-green-500 mt-1 block">{job.success_count}</span>
                </div>
                <div className="bg-white dark:bg-[#161B2A] p-6 rounded-3xl border border-oxford-100 dark:border-oxford-800 shadow-sm">
                    <span className="text-xs text-crimson-500 font-bold uppercase tracking-wider block">Butuh Perbaikan</span>
                    <span className="text-3xl font-bold text-crimson-500 mt-1 block">{job.failed_count}</span>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="bg-white dark:bg-[#161B2A] p-4 rounded-2xl border border-oxford-100 dark:border-oxford-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm">
                    <Filter size={18} className="text-oxford-400" />
                    <span className="font-bold text-oxford-500">Filter Status:</span>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setFilterStatus("ALL")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            filterStatus === "ALL" 
                                ? 'bg-oxford-900 dark:bg-oxford-800 text-white' 
                                : 'bg-oxford-50 dark:bg-oxford-900/50 text-oxford-500 hover:bg-oxford-100'
                        }`}
                    >
                        Semua ({items.length})
                    </button>
                    <button 
                        onClick={() => setFilterStatus("SUCCESS")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            filterStatus === "SUCCESS" 
                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/10' 
                                : 'bg-oxford-50 dark:bg-oxford-900/50 text-oxford-500 hover:bg-oxford-100'
                        }`}
                    >
                        Sukses ({items.filter(i => i.status === "SUCCESS").length})
                    </button>
                    <button 
                        onClick={() => setFilterStatus("FAILED")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            filterStatus === "FAILED" 
                                ? 'bg-crimson-500 text-white shadow-lg shadow-crimson-500/10' 
                                : 'bg-oxford-50 dark:bg-oxford-900/50 text-oxford-500 hover:bg-oxford-100'
                        }`}
                    >
                        Gagal ({items.filter(i => i.status === "FAILED").length})
                    </button>
                </div>
            </div>

            {/* Audit Table */}
            <div className="bg-white dark:bg-[#161B2A] rounded-3xl border border-oxford-100 dark:border-oxford-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-oxford-50/50 dark:bg-oxford-900/30 border-b border-oxford-100 dark:border-oxford-800">
                                <th className="p-4 pl-6 font-bold text-oxford-800 dark:text-oxford-200">NIP</th>
                                <th className="p-4 font-bold text-oxford-800 dark:text-oxford-200">Judul Pelatihan</th>
                                <th className="p-4 font-bold text-oxford-800 dark:text-oxford-200">JP</th>
                                <th className="p-4 font-bold text-oxford-800 dark:text-oxford-200">Penyelenggara</th>
                                <th className="p-4 font-bold text-oxford-800 dark:text-oxford-200">Status Aksi</th>
                                <th className="p-4 font-bold text-oxford-800 dark:text-oxford-200">Keterangan / Kesalahan</th>
                                <th className="p-4 pr-6 font-bold text-oxford-800 dark:text-oxford-200 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-oxford-50 dark:divide-oxford-800">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-oxford-50/20 dark:hover:bg-oxford-900/10 transition-colors text-sm">
                                        <td className="p-4 pl-6 font-mono font-bold text-oxford-900 dark:text-white">{item.nip}</td>
                                        <td className="p-4">
                                            <div className="font-semibold text-oxford-900 dark:text-white max-w-xs truncate">{item.rawData.title || item.rawData["Judul"]}</div>
                                            <div className="text-xs text-oxford-400 mt-1 font-mono">{item.rawData.certificateNo || item.rawData["Nomor Sertifikat"] || "-"}</div>
                                        </td>
                                        <td className="p-4 font-bold text-gold-600">{item.rawData.jp || item.rawData["JP"]} JP</td>
                                        <td className="p-4 text-oxford-500 text-xs">{item.rawData.provider || item.rawData["Penyelenggara"]}</td>
                                        <td className="p-4">
                                            {item.status === "SUCCESS" ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/10 text-green-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                    <CheckCircle2 size={10} /> {item.actionTaken || "SUCCESS"}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-crimson-500/10 text-crimson-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                    <XCircle size={10} /> ERROR
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-xs">
                                            {item.status === "FAILED" ? (
                                                <span className="text-crimson-500 font-medium flex items-center gap-1.5">
                                                    <AlertCircle size={14} />
                                                    {item.errorMessage || "Format data tidak valid."}
                                                </span>
                                            ) : (
                                                <span className="text-oxford-400">Diproses dengan sukses</span>
                                            )}
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            {item.status === "FAILED" && (
                                                <button 
                                                    onClick={() => openEditModal(item)}
                                                    className="px-3.5 py-2 bg-oxford-100 dark:bg-oxford-900 text-oxford-700 dark:text-oxford-300 rounded-xl font-bold hover:bg-gold-500 hover:text-oxford-950 transition-all text-xs inline-flex items-center gap-1.5 active:scale-95"
                                                >
                                                    <Edit size={12} /> Edit & Retry
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-oxford-400 italic">
                                        Tidak ada data audit yang sesuai dengan filter ini.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit / Retry Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedItem(null)}
                            className="absolute inset-0 bg-oxford-950/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            className="bg-white dark:bg-[#161B2A] rounded-[2rem] border border-oxford-100 dark:border-oxford-800 p-8 w-full max-w-md relative z-10 shadow-2xl space-y-6"
                        >
                            <div className="flex items-center gap-3 text-gold-500">
                                <ShieldAlert size={28} />
                                <div>
                                    <h3 className="font-serif text-xl font-bold text-oxford-900 dark:text-white">Perbaiki Data Pegawai</h3>
                                    <p className="text-xs text-oxford-400 mt-0.5">Edit NIP untuk mencocokkan ke database.</p>
                                </div>
                            </div>

                            <div className="p-4 bg-oxford-50 dark:bg-oxford-900/50 rounded-2xl space-y-2 text-xs">
                                <p className="text-oxford-400">Pelatihan yang Diimpor:</p>
                                <p className="font-bold text-oxford-900 dark:text-white">{selectedItem.rawData.title || selectedItem.rawData["Judul"]}</p>
                                <div className="flex justify-between pt-1 border-t border-oxford-100/50 dark:border-oxford-800">
                                    <span className="text-oxford-400">JP: {selectedItem.rawData.jp || selectedItem.rawData["JP"]} JP</span>
                                    <span className="text-oxford-400">Penyelenggara: {selectedItem.rawData.provider || selectedItem.rawData["Penyelenggara"]}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-oxford-500 uppercase tracking-wider">NIP Pegawai</label>
                                <input 
                                    type="text" 
                                    placeholder="Masukkan NIP yang benar..."
                                    className="w-full px-4 py-3.5 bg-oxford-50 dark:bg-oxford-900/50 border-none rounded-xl focus:ring-2 focus:ring-gold-500 transition-all outline-none font-mono font-bold text-oxford-900 dark:text-white"
                                    value={editNip}
                                    onChange={(e) => setEditNip(e.target.value)}
                                />
                                <span className="text-[10px] text-crimson-500 block mt-1">Status Error: {selectedItem.errorMessage}</span>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setSelectedItem(null)}
                                    className="flex-1 py-3.5 bg-oxford-100 dark:bg-oxford-900 text-oxford-700 dark:text-oxford-300 font-bold rounded-2xl hover:bg-oxford-200 transition-colors"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={handleRetry}
                                    disabled={isRetrying}
                                    className="flex-1 py-3.5 bg-gold-500 text-oxford-950 font-bold rounded-2xl hover:bg-gold-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isRetrying ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                                    Impor Ulang
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
