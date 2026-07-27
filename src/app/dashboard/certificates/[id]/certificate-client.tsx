"use client";

import { CertificateView, CertificateData, CertificateTypeConfig } from "@/components/CertificateView";
import { Download, ExternalLink, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function CertificateClient({ data, initialConfig, courseId, verificationToken }: { data: CertificateData, initialConfig?: CertificateTypeConfig, courseId: string, verificationToken: string }) {
    const config = initialConfig;
    const orientation = config?.orientation || "landscape";
    const isPortrait = orientation === "portrait";
    const aspectRatio = isPortrait ? '1 / 1.414' : '1.414 / 1';

    const handleDownload = async () => {
        const response = await fetch('/api/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'course_certificate', courseId }),
        });
        if (!response.ok) return;
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Sertifikat-${data.courseName}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-oxford-100 dark:bg-[#161B2A]/50 print:bg-white dark:print:bg-[#161B2A] pb-20">
            {/* Top Toolbar (Hidden in Print) */}
            <div className="bg-white dark:bg-[#161B2A] border-b border-oxford-200 dark:border-oxford-700 h-16 flex items-center justify-between px-6 sticky top-0 z-40 print:hidden">
                <Link href="/dashboard" className="flex items-center gap-2 text-oxford-500 dark:text-oxford-400 hover:text-gold-600 transition-colors font-sans font-bold text-sm">
                    <ChevronLeft size={18} /> Kembali ke Dashboard
                </Link>
                
                <div className="flex items-center gap-3">
                    <Link href={`/verify/certificates/${verificationToken}`} target="_blank" className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-oxford-700 dark:text-oxford-200">
                        <ExternalLink size={16} /> Verifikasi
                    </Link>
                    <button 
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-5 py-2 font-sans font-bold text-sm bg-gold-500 text-oxford-950 rounded-lg hover:bg-gold-400 transition-all shadow-sm active:scale-95"
                    >
                        <Download size={16} /> Unduh PDF
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center p-4 md:p-10 lg:p-16 relative print:p-0 print:m-0 print:block">
                {/* Certificate Render Container with Scrollable Preview */}
                <div 
                    className="w-full max-w-5xl mx-auto bg-white dark:bg-[#161B2A] shadow-2xl rounded-sm relative print:shadow-none print:rounded-none overflow-visible" 
                    style={{ 
                        aspectRatio,
                        width: '100%',
                    }}
                >
                    <div className="w-full h-full">
                        {config ? (
                            <CertificateView data={data} config={config} />
                        ) : (
                            <CertificateView data={data} />
                        )}
                    </div>
                </div>
            </div>
            
            {/* Global print styles specifically for this page */}
            <style jsx global>{`
                @media print {
                    @page { 
                        size: A4 ${isPortrait ? 'portrait' : 'landscape'}; 
                        margin: 0; 
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        height: 100% !important;
                        overflow: visible !important;
                    }
                    /* Ensure the container takes full page in print */
                    .flex-1 {
                        display: block !important;
                        width: 100vw !important;
                        height: ${isPortrait ? '141.4vw' : '70.7vw'} !important;
                        max-height: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    /* Container for the certificate itself */
                    .flex-1 > div {
                        width: 100% !important;
                        height: 100% !important;
                        max-height: none !important;
                        max-width: none !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    header, .print\\:hidden {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
