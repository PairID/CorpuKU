"use client";

import { useState } from "react";
import { 
    Upload as UploadIcon, Download, Check, FileSpreadsheet,
    Play, ChevronLeft, ArrowRight, Table, RefreshCw, Eye, History
} from "lucide-react";
import Link from "next/link";
import { exportExcel, parseSpreadsheet, type SpreadsheetRow } from "@/lib/excel-client";
import { initiateBatchJob } from "@/app/actions/bangkom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function BatchUploadClient() {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<SpreadsheetRow[]>([]);
    
    // Statuses
    const [step, setStep] = useState(1); // 1: Select, 2: Preview, 3: Processing, 4: Done
    const [jobId, setJobId] = useState<string | null>(null);
    
    // Progress
    const [totalRows, setTotalRows] = useState(0);
    const [processedRows, setProcessedRows] = useState(0);
    const [successCount, setSuccessCount] = useState(0);
    const [failedCount, setFailedCount] = useState(0);
    const [currentChunkStatus, setCurrentChunkStatus] = useState("Menyiapkan data...");

    // Template Generator
    const downloadTemplate = async () => {
        const templateData: SpreadsheetRow[] = [
            {
                "NIP": "199501012020011001",
                "Judul": "Pelatihan Dasar Kepegawaian Pratama",
                "JP": 24,
                "Nomor Sertifikat": "SERT/2026/00912",
                "Tanggal Mulai": "2026-02-10",
                "Tanggal Selesai": "2026-02-13",
                "Penyelenggara": "BPSDM Provinsi"
            },
            {
                "NIP": "199208152018032002",
                "Judul": "Workshop Agile Governance & Digital Transformation",
                "JP": 16,
                "Nomor Sertifikat": "AGILE-9988",
                "Tanggal Mulai": "2026-03-02",
                "Tanggal Selesai": "2026-03-04",
                "Penyelenggara": "Pusdiklat Nasional"
            }
        ];

        await exportExcel([{ name: "Template Bangkom", rows: templateData }], "Template_Batch_Upload_Bangkom.xlsx");
        toast.success("Template Excel berhasil diunduh!");
    };

    // Handle excel reading
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);

        try {
            const data = await parseSpreadsheet(selectedFile);
            if (data.length === 0) {
                toast.error("File spreadsheet kosong atau format salah.");
                return;
            }
            setPreviewData(data);
            setStep(2);
            toast.success(`Berhasil memuat ${data.length} baris data.`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Format file tidak didukung.");
        }
    };

    const startProcessing = async () => {
        if (!file || previewData.length === 0) return;

        setStep(3);
        setTotalRows(previewData.length);
        setProcessedRows(0);
        setSuccessCount(0);
        setFailedCount(0);
        setCurrentChunkStatus("Mengunggah data ke server...");

        try {
            // 1. Initiate Batch Job (staging)
            const formattedRows = previewData.map((row) => ({
                nip: String(row["NIP"] || "").trim(),
                title: String(row["Judul"] || "").trim(),
                jp: Number(row["JP"] || 0),
                certificateNo: row["Nomor Sertifikat"] ? String(row["Nomor Sertifikat"]).trim() : undefined,
                dateStarted: row["Tanggal Mulai"] ? String(row["Tanggal Mulai"]).trim() : undefined,
                dateCompleted: String(row["Tanggal Selesai"] || "").trim(),
                provider: String(row["Penyelenggara"] || "").trim()
            }));

            const initRes = await initiateBatchJob(file.name, formattedRows.length, formattedRows);
            if (!initRes.success || !initRes.jobId) {
                toast.error(initRes.message || "Gagal menginisiasi pekerjaan impor.");
                setStep(2);
                return;
            }

            const currentJobId = initRes.jobId;
            setJobId(currentJobId);

            // 2. Client-orchestrated chunk processing
            const chunkSize = 100;
            let remaining = formattedRows.length;
            let processed = 0;

            while (remaining > 0) {
                setCurrentChunkStatus(`Memproses baris ${processed + 1} sampai ${Math.min(processed + chunkSize, formattedRows.length)}...`);
                
                const response = await fetch("/api/batch/process-chunk", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jobId: currentJobId, limit: chunkSize })
                });

                const chunkResult = await response.json();
                
                if (!chunkResult.success) {
                    throw new Error(chunkResult.message || "Kesalahan saat memproses data.");
                }

                processed += chunkResult.processed;
                remaining = chunkResult.remaining;
                
                // Fetch latest job details to get real-time statistics
                const statsResponse = await fetch(`/api/batch/details?jobId=${currentJobId}`);
                if (statsResponse.ok) {
                    const stats = await statsResponse.json();
                    setSuccessCount(stats.job.success_count);
                    setFailedCount(stats.job.failed_count);
                    setProcessedRows(stats.job.processed_rows);
                } else {
                    setProcessedRows(processed);
                }
            }

            setStep(4);
            toast.success("Seluruh data berhasil diproses!");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Terjadi kesalahan proses batch.");
            setStep(2);
        }
    };

    const resetUpload = () => {
        setFile(null);
        setPreviewData([]);
        setJobId(null);
        setStep(1);
    };

    return (
        <div className="space-y-10 font-sans pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Link 
                        href="/admin/bangkom" 
                        className="p-3 bg-white dark:bg-[#161B2A] border border-oxford-100 dark:border-oxford-800 rounded-2xl hover:bg-oxford-50 transition-colors text-oxford-600 dark:text-white"
                    >
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-oxford-900 dark:text-white">Batch Upload Bangkom</h1>
                        <p className="text-oxford-500 mt-1">Impor data kompetensi secara massal dengan latar belakang, tanpa risiko *timeout*.</p>
                    </div>
                </div>
                <div>
                    <Link 
                        href="/admin/bangkom/upload/history" 
                        className="px-5 py-3 bg-white dark:bg-[#161B2A] border border-oxford-100 dark:border-oxford-800 rounded-2xl font-bold hover:bg-oxford-50 transition-all flex items-center gap-2 text-oxford-700 dark:text-oxford-300"
                    >
                        <History size={18} /> Riwayat Impor
                    </Link>
                </div>
            </div>

            {/* Stepper Progress */}
            <div className="flex flex-wrap items-center gap-6 max-w-2xl bg-white dark:bg-[#161B2A] p-4 rounded-2xl border border-oxford-50 dark:border-oxford-800 shadow-sm">
                <StepIndicator num={1} label="Unggah" active={step >= 1} done={step > 1} />
                <ArrowRight size={14} className="text-oxford-300 hidden sm:block" />
                <StepIndicator num={2} label="Pratinjau" active={step >= 2} done={step > 2} />
                <ArrowRight size={14} className="text-oxford-300 hidden sm:block" />
                <StepIndicator num={3} label="Proses" active={step >= 3} done={step > 3} />
                <ArrowRight size={14} className="text-oxford-300 hidden sm:block" />
                <StepIndicator num={4} label="Selesai" active={step >= 4} done={step > 4} />
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div 
                        key="step1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                    >
                        {/* Dropzone */}
                        <div className="lg:col-span-2 bg-white dark:bg-[#161B2A] rounded-[2rem] border border-oxford-100 dark:border-oxford-800 p-8 shadow-sm flex flex-col items-center justify-center min-h-[380px] relative border-dashed border-2 hover:border-gold-500 transition-colors">
                            <input 
                                type="file" 
                                accept=".xlsx,.csv"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                            />
                            <div className="w-16 h-16 bg-gold-500/10 text-gold-500 rounded-2xl flex items-center justify-center mb-6">
                                <UploadIcon size={32} />
                            </div>
                            <h3 className="font-bold text-lg text-oxford-900 dark:text-white">Pilih atau Seret File Excel</h3>
                            <p className="text-oxford-400 text-sm mt-2 text-center max-w-sm">Mendukung file Excel (.xlsx) dan CSV berisi ribuan data sekaligus.</p>
                        </div>

                        {/* Guide / Template Download */}
                        <div className="bg-white dark:bg-[#161B2A] rounded-[2rem] border border-oxford-100 dark:border-oxford-800 p-8 shadow-sm space-y-6">
                            <h3 className="font-serif text-xl font-bold text-oxford-900 dark:text-white flex items-center gap-2">
                                <FileSpreadsheet className="text-gold-500" /> Panduan Format
                            </h3>
                            <p className="text-sm text-oxford-500">Unduh template standard untuk meminimalkan error data saat proses pencocokan NIP.</p>
                            
                            <button 
                                onClick={downloadTemplate}
                                className="w-full py-4 bg-oxford-900 dark:bg-oxford-800 text-white rounded-2xl font-bold hover:bg-gold-500 hover:text-oxford-950 transition-all flex items-center justify-center gap-2"
                            >
                                <Download size={18} /> Unduh Template Excel
                            </button>

                            <div className="space-y-4 pt-4 border-t border-oxford-50 dark:border-oxford-800 text-xs text-oxford-400">
                                <p className="font-bold text-oxford-600 dark:text-oxford-300">Kolom Wajib:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li><strong>NIP</strong>: NIP Unik Pegawai di sistem</li>
                                    <li><strong>Judul</strong>: Nama diklat/pelatihan</li>
                                    <li><strong>JP</strong>: Jumlah Jam Pelajaran (angka)</li>
                                    <li><strong>Tanggal Selesai</strong>: YYYY-MM-DD</li>
                                    <li><strong>Penyelenggara</strong>: Nama Lembaga</li>
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div 
                        key="step2"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-6"
                    >
                        <div className="bg-white dark:bg-[#161B2A] rounded-[2rem] border border-oxford-100 dark:border-oxford-800 shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-oxford-50 dark:border-oxford-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-oxford-50/50 dark:bg-oxford-900/30">
                                <div className="flex items-center gap-3">
                                    <Table className="text-gold-500" />
                                    <div>
                                        <h3 className="font-bold text-oxford-900 dark:text-white">Pratinjau Impor ({previewData.length} baris)</h3>
                                        <p className="text-xs text-oxford-400 mt-0.5">File: {file?.name}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={resetUpload}
                                        className="px-5 py-2.5 bg-oxford-100 dark:bg-oxford-900 text-oxford-700 dark:text-oxford-300 rounded-xl font-bold hover:bg-oxford-200 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        onClick={startProcessing}
                                        className="px-6 py-2.5 bg-gold-500 text-oxford-950 rounded-xl font-bold hover:bg-gold-400 transition-all flex items-center gap-2"
                                    >
                                        <Play size={18} /> Mulai Asynchronous Impor
                                    </button>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto max-h-[450px]">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-oxford-50/30 dark:bg-oxford-950/20 sticky top-0 border-b border-oxford-100 dark:border-oxford-800">
                                        <tr className="text-xs font-bold text-oxford-400 uppercase tracking-widest">
                                            <th className="p-4 pl-6">NIP</th>
                                            <th className="p-4">Judul Diklat</th>
                                            <th className="p-4">JP</th>
                                            <th className="p-4">No. Sertifikat</th>
                                            <th className="p-4">Tgl Selesai</th>
                                            <th className="p-4 pr-6">Penyelenggara</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-oxford-50 dark:divide-oxford-800">
                                        {previewData.slice(0, 100).map((row, i) => (
                                            <tr key={i} className="hover:bg-oxford-50/20 dark:hover:bg-oxford-900/10 transition-colors">
                                                <td className="p-4 pl-6 font-mono font-bold text-oxford-900 dark:text-white">{String(row["NIP"] ?? "")}</td>
                                                <td className="p-4 text-oxford-700 dark:text-oxford-200 font-medium max-w-xs truncate">{String(row["Judul"] ?? "")}</td>
                                                <td className="p-4 font-bold text-gold-600">{String(row["JP"] ?? 0)} JP</td>
                                                <td className="p-4 font-mono text-xs">{String(row["Nomor Sertifikat"] || "-")}</td>
                                                <td className="p-4 text-xs">{String(row["Tanggal Selesai"] ?? "")}</td>
                                                <td className="p-4 pr-6 text-oxford-500">{String(row["Penyelenggara"] ?? "")}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {previewData.length > 100 && (
                                <div className="p-4 bg-oxford-50/50 dark:bg-oxford-900/20 text-center text-xs text-oxford-400 border-t border-oxford-50 dark:border-oxford-800">
                                    Menampilkan 100 dari {previewData.length} baris pratinjau.
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div 
                        key="step3"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="bg-white dark:bg-[#161B2A] rounded-[2rem] border border-oxford-100 dark:border-oxford-800 p-8 shadow-sm max-w-2xl mx-auto space-y-8"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gold-500/15 text-gold-500 rounded-2xl flex items-center justify-center animate-spin">
                                <RefreshCw size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-oxford-900 dark:text-white">Sedang Memproses Chunk...</h3>
                                <p className="text-sm text-oxford-400">{currentChunkStatus}</p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-oxford-500">Selesai: {processedRows} / {totalRows} baris</span>
                                <span className="text-gold-500">{Math.round((processedRows / totalRows) * 100)}%</span>
                            </div>
                            <div className="h-3 w-full bg-oxford-50 dark:bg-oxford-900 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gold-500 rounded-full transition-all duration-300"
                                    style={{ width: `${(processedRows / totalRows) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Live Counts */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-oxford-50 dark:border-oxford-800">
                            <div className="bg-green-500/5 border border-green-500/10 p-4 rounded-2xl">
                                <span className="text-xs text-green-500 font-bold uppercase tracking-wider block">Sukses / Diperbarui</span>
                                <span className="text-2xl font-bold text-green-500 mt-1 block">{successCount}</span>
                            </div>
                            <div className="bg-crimson-500/5 border border-crimson-500/10 p-4 rounded-2xl">
                                <span className="text-xs text-crimson-500 font-bold uppercase tracking-wider block">Gagal</span>
                                <span className="text-2xl font-bold text-crimson-500 mt-1 block">{failedCount}</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 4 && (
                    <motion.div 
                        key="step4"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-[#161B2A] rounded-[2rem] border border-oxford-100 dark:border-oxford-800 p-8 shadow-sm max-w-2xl mx-auto space-y-8 text-center"
                    >
                        <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-green-500/10">
                            <Check size={32} />
                        </div>
                        
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-oxford-900 dark:text-white">Proses Impor Selesai!</h2>
                            <p className="text-oxford-500 mt-2 max-w-md mx-auto">File Excel Anda telah selesai diproses sepenuhnya. Riwayat lengkap tersimpan di database.</p>
                        </div>

                        {/* Statistics Summary */}
                        <div className="grid grid-cols-3 gap-4 bg-oxford-50/50 dark:bg-oxford-900/20 p-6 rounded-3xl">
                            <div>
                                <span className="text-xs text-oxford-400 font-bold uppercase tracking-wider block">Total Baris</span>
                                <span className="text-2xl font-bold text-oxford-900 dark:text-white mt-1 block">{totalRows}</span>
                            </div>
                            <div>
                                <span className="text-xs text-green-500 font-bold uppercase tracking-wider block">Sukses</span>
                                <span className="text-2xl font-bold text-green-500 mt-1 block">{successCount}</span>
                            </div>
                            <div>
                                <span className="text-xs text-crimson-500 font-bold uppercase tracking-wider block">Gagal</span>
                                <span className="text-2xl font-bold text-crimson-500 mt-1 block">{failedCount}</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                            {jobId && (
                                <Link 
                                    href={`/admin/bangkom/upload/history/${jobId}`}
                                    className="px-6 py-3.5 bg-oxford-900 text-white rounded-2xl font-bold hover:bg-oxford-800 transition-all flex items-center justify-center gap-2"
                                >
                                    <Eye size={18} /> Reviu & Perbaiki Hasil
                                </Link>
                            )}
                            <button 
                                onClick={resetUpload}
                                className="px-6 py-3.5 bg-gold-500 text-oxford-950 rounded-2xl font-bold hover:bg-gold-400 transition-all flex items-center justify-center gap-2"
                            >
                                <UploadIcon size={18} /> Impor File Lain
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StepIndicator({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
    return (
        <div className="flex items-center gap-3 font-sans">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                done 
                    ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20' 
                    : active 
                        ? 'bg-gold-500 border-gold-500 text-oxford-950 shadow-lg shadow-gold-500/20' 
                        : 'border-oxford-200 dark:border-oxford-800 text-oxford-400'
            }`}>
                {done ? <Check size={14} /> : num}
            </div>
            <span className={`text-xs font-bold transition-colors ${active || done ? 'text-oxford-900 dark:text-white' : 'text-oxford-400'}`}>{label}</span>
        </div>
    );
}
