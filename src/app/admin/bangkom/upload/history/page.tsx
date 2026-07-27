import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { getBatchJobs } from "@/app/actions/bangkom";
import Link from "next/link";
import { ChevronLeft, FileSpreadsheet, Eye, Calendar, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BatchUploadHistoryPage() {
    const jobs = await getBatchJobs();

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            {/* SIDEBAR */}
            <AdminSidebar activePage="bangkom" />

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Link 
                            href="/admin/bangkom/upload" 
                            className="p-3 bg-white dark:bg-[#161B2A] border border-oxford-100 dark:border-oxford-800 rounded-2xl hover:bg-oxford-50 transition-colors text-oxford-600 dark:text-white"
                        >
                            <ChevronLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-oxford-900 dark:text-white">Riwayat Batch Upload</h1>
                            <p className="text-oxford-500 mt-1">Daftar seluruh pekerjaan impor massal data kompetensi yang pernah dilakukan.</p>
                        </div>
                    </div>

                    {/* Jobs Table */}
                    <div className="bg-white dark:bg-[#161B2A] rounded-3xl border border-oxford-100 dark:border-oxford-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-oxford-50/50 dark:bg-oxford-900/30 border-b border-oxford-100 dark:border-oxford-800">
                                        <th className="p-5 pl-6 font-bold text-oxford-800 dark:text-oxford-200">Nama File</th>
                                        <th className="p-5 font-bold text-oxford-800 dark:text-oxford-200">Tanggal Upload</th>
                                        <th className="p-5 font-bold text-oxford-800 dark:text-oxford-200 text-center">Status</th>
                                        <th className="p-5 font-bold text-oxford-800 dark:text-oxford-200 text-center">Total Baris</th>
                                        <th className="p-5 font-bold text-oxford-800 dark:text-oxford-200 text-center text-green-500">Sukses</th>
                                        <th className="p-5 font-bold text-oxford-800 dark:text-oxford-200 text-center text-crimson-500">Gagal</th>
                                        <th className="p-5 pr-6 font-bold text-oxford-800 dark:text-oxford-200 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-oxford-50 dark:divide-oxford-800">
                                    {jobs.length > 0 ? (
                                        jobs.map((job) => {
                                            const formattedDate = new Date(job.created_at).toLocaleString("id-ID", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            });

                                            return (
                                                <tr key={job.id} className="hover:bg-oxford-50/30 dark:hover:bg-oxford-900/10 transition-colors">
                                                    <td className="p-5 pl-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2.5 bg-gold-500/10 text-gold-500 rounded-xl">
                                                                <FileSpreadsheet size={20} />
                                                            </div>
                                                            <span className="font-bold text-oxford-900 dark:text-white max-w-xs truncate block">{job.file_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-sm text-oxford-500">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar size={14} />
                                                            {formattedDate}
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        {job.status === "COMPLETED" && (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/10 text-green-500 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                                <CheckCircle size={12} /> Selesai
                                                            </span>
                                                        )}
                                                        {job.status === "PROCESSING" && (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gold-500/10 text-gold-500 rounded-lg text-xs font-bold uppercase tracking-wider animate-pulse">
                                                                <AlertTriangle size={12} /> Memproses
                                                            </span>
                                                        )}
                                                        {job.status === "FAILED" && (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-crimson-500/10 text-crimson-500 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                                <XCircle size={12} /> Gagal
                                                            </span>
                                                        )}
                                                        {job.status === "PENDING" && (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-oxford-100 dark:bg-oxford-800 text-oxford-500 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                                <AlertTriangle size={12} /> Menunggu
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-5 font-bold text-oxford-900 dark:text-white text-center font-mono">{job.total_rows}</td>
                                                    <td className="p-5 font-bold text-green-500 text-center font-mono">{job.success_count}</td>
                                                    <td className="p-5 font-bold text-crimson-500 text-center font-mono">{job.failed_count}</td>
                                                    <td className="p-5 pr-6 text-right">
                                                        <Link 
                                                            href={`/admin/bangkom/upload/history/${job.id}`}
                                                            className="px-4 py-2 bg-oxford-900 dark:bg-oxford-850 hover:bg-gold-500 hover:text-oxford-950 text-white rounded-xl font-bold transition-all text-xs inline-flex items-center gap-1.5"
                                                        >
                                                            <Eye size={14} /> Detail Reviu
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="p-16 text-center text-oxford-400 italic">
                                                Belum ada riwayat impor data.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
