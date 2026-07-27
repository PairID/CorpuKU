"use client";

import { X, FileDown, Loader2 } from "lucide-react";
import { useState } from "react";

export function ReportPreviewModal({ onClose }: { onClose: () => void }) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            const res = await fetch("/api/analytics/pdf");
            if (!res.ok) throw new Error("Failed to generate PDF");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Laporan_CorpuKU_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert("Gagal mengunduh PDF.");
        } finally {
            setIsDownloading(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6">
            <div className="absolute inset-0 bg-oxford-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-oxford-100 dark:bg-[#161B2A] rounded-2xl shadow-2xl border border-oxford-200 dark:border-oxford-700 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-scale-in">
                
                {/* Header Modal */}
                <div className="shrink-0 p-4 sm:p-6 border-b border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-oxford-900 dark:text-white">Preview Laporan (PDF)</h2>
                        <p className="text-sm text-oxford-500 dark:text-oxford-400">Pratinjau dokumen sebelum diekspor.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleDownloadPDF} 
                            disabled={isDownloading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 hover:bg-gold-400 text-oxford-950 text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                            {isDownloading ? "Memproses PDF..." : "Unduh PDF"}
                        </button>
                        <button onClick={onClose} className="p-2 text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-300 hover:bg-oxford-50 dark:hover:bg-oxford-950 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Preview Area (Iframe holding the HTML) */}
                <div className="flex-1 overflow-hidden bg-oxford-200 dark:bg-oxford-800/50 p-4 sm:p-8 flex items-start justify-center relative">
                     {/* The iframe will load the generated HTML from the API */}
                    <div className="w-full max-w-[210mm] h-full shadow-2xl rounded bg-white dark:bg-[#161B2A] overflow-hidden flex flex-col">
                         <iframe 
                            src="/api/analytics/preview-html" 
                            className="w-full h-full border-0 outline-none"
                            title="Report Preview"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
