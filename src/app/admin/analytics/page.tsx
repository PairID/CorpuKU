"use client";

import { Menu, Users, Activity, BarChart3, ShieldCheck, Target, Clock, ArrowUpRight, ArrowDownRight, Minus, Trophy, Loader2 } from "lucide-react";
import { 
    getAnalyticsMetrics,
    getInstansiCompliance,
    getEngagementStats,
    getEfficacyStats
} from "@/app/actions/analytics";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useState, useEffect } from "react";
import { exportExcel, type SpreadsheetRow } from "@/lib/excel-client";
import { getDetailedStudentReport } from "@/app/actions/reports";
import { ReportPreviewModal } from "./report-preview-modal";

interface AgencyStats {
    name: string;
    compliance: number;
    totalJp: number;
}

interface AnalyticsStats {
    totalUsers: number;
    totalJp: number;
    complianceRate: number;
    avgScore: number;
}

interface DropOffPoint {
    module: string;
    rate: number;
}

export default function AdminAnalytics() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [stats, setStats] = useState<AnalyticsStats>({ totalUsers: 0, totalJp: 0, complianceRate: 0, avgScore: 0 });
    const [complianceData, setComplianceData] = useState<{ top: AgencyStats[]; bottom: AgencyStats[] }>({ top: [], bottom: [] });
    const [engagementData, setEngagementData] = useState<{ activityByHour: number[] }>({ activityByHour: [] });
    const [efficacyData, setEfficacyData] = useState<{ dropOffPoints: DropOffPoint[] }>({ dropOffPoints: [] });
    const [isExporting, setIsExporting] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const [s, c, e, ef] = await Promise.all([
                    getAnalyticsMetrics(),
                    getInstansiCompliance(),
                    getEngagementStats(),
                    getEfficacyStats()
                ]);
                setStats(s as AnalyticsStats);
                setComplianceData(c as { top: AgencyStats[]; bottom: AgencyStats[] });
                setEngagementData(e as { activityByHour: number[] });
                setEfficacyData(ef as { dropOffPoints: DropOffPoint[] });
            } catch (err) {
                console.error(err);
            }
        }
        fetchData();
    }, []);

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const data = await getDetailedStudentReport();
            if (data.length === 0) {
                alert("Tidak ada data untuk diekspor.");
                return;
            }

            await exportExcel(
                [{ name: "Laporan Siswa", rows: data as SpreadsheetRow[] }],
                `Laporan_CorpuKU_${new Date().toISOString().split('T')[0]}.xlsx`,
            );
        } catch (err) {
            console.error("Export error:", err);
            alert("Gagal mengekspor laporan.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            {/* SIDEBAR */}
            <AdminSidebar activePage="analytics" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen relative">
                {/* Mobile sidebar toggle button (floating) */}
                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gold-500 text-oxford-950 rounded-full shadow-2xl hover:bg-gold-400 transition-all active:scale-95"
                >
                    <Menu size={24} />
                </button>

                {/* Content */}
                <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">

                    {/* Header & Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-oxford-900 dark:text-white mb-1">Tinjauan Kepatuhan & Efikasi</h2>
                            <p className="text-sm sm:text-base text-oxford-600 dark:text-oxford-300">Laporan capaian Jam Pelajaran (JP) dan dampak program pengembangan kompetensi.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <select className="px-4 py-2.5 sm:py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-700 dark:text-oxford-200 font-bold shadow-sm w-full sm:w-auto">
                                <option>Tahun Ajaran 2026</option>
                                <option>Tahun Ajaran 2025</option>
                            </select>
                            <button 
                                onClick={() => setShowPreviewModal(true)}
                                className="px-5 py-2.5 sm:py-2 bg-gradient-to-r from-oxford-900 to-oxford-800 hover:from-oxford-800 hover:to-oxford-700 text-gold-500 font-bold rounded-lg transition-all shadow-md w-full sm:w-auto text-center flex items-center justify-center gap-2 border border-oxford-700 hover:shadow-lg"
                            >
                                <BarChart3 size={16} /> Preview Laporan (PDF)
                            </button>
                            <button 
                                onClick={handleExportExcel}
                                disabled={isExporting}
                                className="px-5 py-2.5 sm:py-2 bg-white dark:bg-[#161B2A] hover:bg-oxford-50 dark:hover:bg-oxford-950 text-oxford-900 dark:text-white font-bold rounded-lg transition-all shadow-md w-full sm:w-auto text-center flex items-center justify-center gap-2 border border-oxford-200 dark:border-oxford-700 disabled:opacity-50"
                            >
                                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
                                Laporan Excel
                            </button>
                        </div>
                    </div>

                    {/* METRICS ROW 1: Compliance & Efficacy */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600">
                                    <ShieldCheck size={24} />
                                </div>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">+3.2% (YTD)</span>
                            </div>
                            <h3 className="text-oxford-500 dark:text-oxford-400 text-sm font-medium mb-1">Pemenuhan JP Minimal (20 JP)</h3>
                            <p className="text-3xl font-bold text-oxford-900 dark:text-white">{stats.complianceRate}%</p>
                        </div>

                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gold-50 text-gold-600">
                                    <Target size={24} />
                                </div>
                            </div>
                            <h3 className="text-oxford-500 dark:text-oxford-400 text-sm font-medium mb-1">Rata-rata Skor Kelulusan</h3>
                            <p className="text-3xl font-bold text-oxford-900 dark:text-white">{stats.avgScore}</p>
                        </div>

                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600">
                                    <Users size={24} />
                                </div>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">+100%</span>
                            </div>
                            <h3 className="text-oxford-500 dark:text-oxford-400 text-sm font-medium mb-1">Pengguna Terdaftar</h3>
                            <p className="text-3xl font-bold text-oxford-900 dark:text-white">{stats.totalUsers}</p>
                        </div>

                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-crimson-50 text-crimson-600">
                                    <Clock size={24} />
                                </div>
                            </div>
                            <h3 className="text-oxford-500 dark:text-oxford-400 text-sm font-medium mb-1">Total Jam Pelajaran Terkumpul</h3>
                            <p className="text-3xl font-bold text-oxford-900 dark:text-white">{stats.totalJp} <span className="text-lg text-oxford-500 dark:text-oxford-400">JP</span></p>
                        </div>
                    </div>

                    {/* COMPLIANCE & INSTANSI DASHBOARD */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                        {/* Top Performing Agencies */}
                        <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6 lg:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gold-50 text-gold-600 rounded-lg"><Trophy size={20} /></div>
                                <h3 className="font-bold text-oxford-900 dark:text-white text-lg">Top Kepatuhan Perangkat Daerah</h3>
                            </div>
                            <div className="space-y-6">
                                {complianceData.top.map((agency: AgencyStats, i: number) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-sm font-sans mb-2">
                                            <span className="font-bold text-oxford-800 dark:text-oxford-100 flex items-center gap-2">
                                                <span className="text-oxford-400 font-medium">#{i + 1}</span> {agency.name}
                                            </span>
                                            <span className="text-oxford-600 dark:text-oxford-300 font-bold">{agency.compliance}% ASN Patuh (<span className="text-gold-600">{agency.totalJp.toLocaleString()} JP</span>)</span>
                                        </div>
                                        <div className="h-3 w-full bg-oxford-100 dark:bg-[#161B2A] rounded-full overflow-hidden">
                                            <div className="h-full bg-gold-500 rounded-full transition-all duration-1000" style={{ width: `${agency.compliance}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Lowest Performing Agencies */}
                        <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6 lg:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-crimson-50 text-crimson-600 rounded-lg"><Activity size={20} /></div>
                                <h3 className="font-bold text-oxford-900 dark:text-white text-lg">Perangkat Daerah Butuh Perhatian</h3>
                            </div>
                            <p className="text-sm text-oxford-600 dark:text-oxford-300 mb-6">Instansi dengan tingkat kepatuhan pelatihan di bawah batas wajar administrasi.</p>
                            <div className="space-y-6">
                                {complianceData.bottom.length === 0 ? (
                                    <div className="text-center py-4 text-oxford-400 text-sm bg-oxford-50 dark:bg-oxford-950 rounded-xl border border-dashed border-oxford-200 dark:border-oxford-700">Seluruh instansi melampaui target kepatuhan minimal.</div>
                                ) : (
                                    complianceData.bottom.map((agency: AgencyStats, i: number) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-sm font-sans mb-2">
                                                <span className="font-bold text-oxford-800 dark:text-oxford-100">{agency.name}</span>
                                                <span className="text-oxford-600 dark:text-oxford-300 font-bold text-crimson-600">{agency.compliance}% ASN Patuh</span>
                                            </div>
                                            <div className="h-3 w-full bg-oxford-100 dark:bg-[#161B2A] rounded-full overflow-hidden">
                                                <div className="h-full bg-crimson-500 rounded-full transition-all duration-1000" style={{ width: `${agency.compliance}%` }} />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* LEARNING INTELLIGENCE & EFFICACY */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                        {/* Hourly Heatmap Sim */}
                        <div className="lg:col-span-1 bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6">
                            <h3 className="font-bold text-oxford-900 dark:text-white text-lg mb-6">Jam Optimal Akses (DAU)</h3>

                            <div className="flex items-end justify-between h-40 gap-1 mt-4">
                                {engagementData.activityByHour.map((vol: number, idx: number) => (
                                    <div key={idx} className="w-full flex flex-col items-center group relative">
                                        <div className="absolute -top-8 bg-oxford-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Pk. {idx + 6}:00</div>
                                        <div
                                            className={`w-full rounded-t-sm transition-colors ${vol > 80 ? 'bg-indigo-600' : vol > 50 ? 'bg-indigo-400' : 'bg-indigo-200'}`}
                                            style={{ height: `${vol}%` }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-xs text-oxford-400 mt-2 font-medium">
                                <span>06:00</span>
                                <span>Puncak (10:00 - 11:00)</span>
                                <span>18:00</span>
                            </div>
                        </div>

                        {/* Drop-off / Churn Points */}
                        <div className="lg:col-span-1 bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6">
                            <h3 className="font-bold text-oxford-900 dark:text-white text-lg mb-6">Anomali Kurikulum (Drop-off Rate)</h3>
                            <p className="text-xs text-oxford-500 dark:text-oxford-400 mb-4">Modul dimana peserta paling sering menghentikan belajarnya.</p>
                            <div className="space-y-4">
                                {efficacyData.dropOffPoints.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-oxford-50 dark:bg-oxford-950 rounded-lg border border-oxford-100 dark:border-oxford-800 border-l-4 border-l-crimson-500">
                                        <span className="text-sm font-semibold text-oxford-900 dark:text-white truncate pr-2">{item.module}</span>
                                        <span className="text-sm font-bold text-crimson-600 bg-crimson-100 px-2 py-0.5 rounded">{item.rate}% Drop</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Search Trends KMS */}
                        <div className="lg:col-span-1 bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6">
                            <h3 className="font-bold text-oxford-900 dark:text-white text-lg mb-6">Trending Pencarian Materi</h3>
                            <p className="text-xs text-oxford-500 dark:text-oxford-400 mb-4">Topik yang paling dicari ASN namun belum ada di kurikulum.</p>
                            <div className="space-y-4">
                                {[
                                    { term: "Manajemen Stress ASN", volume: 1240, trend: "up" },
                                    { term: "Digital Signature PDF", volume: 980, trend: "up" },
                                    { term: "SOP Pengadaan 2026", volume: 850, trend: "same" },
                                    { term: "Leadership 4.0", volume: 620, trend: "down" }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center border-b border-oxford-100 dark:border-oxford-800 pb-3 last:border-0 last:pb-0">
                                        <div>
                                            <p className="text-sm font-bold text-oxford-900 dark:text-white">{item.term}</p>
                                            <p className="text-xs text-oxford-500 dark:text-oxford-400">{item.volume.toLocaleString()} Pencarian</p>
                                        </div>
                                        <div className="p-2 rounded-lg bg-oxford-50 dark:bg-oxford-950 text-oxford-500 dark:text-oxford-400">
                                            {item.trend === 'up' && <ArrowUpRight size={18} className="text-emerald-500" />}
                                            {item.trend === 'down' && <ArrowDownRight size={18} className="text-crimson-500" />}
                                            {item.trend === 'same' && <Minus size={18} />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </main>

            {/* MODALS */}
            {showPreviewModal && <ReportPreviewModal onClose={() => setShowPreviewModal(false)} />}
        </div>
    );
}
