"use client";

import { 
    Menu, Users, Activity, BarChart3, ShieldCheck, Target, Clock, 
    ArrowUpRight, ArrowDownRight, Minus, Trophy, Loader2, Award, 
    ChevronRight, ExternalLink, Building2 
} from "lucide-react";
import { 
    getAnalyticsMetrics,
    getInstansiCompliance,
    getEngagementStats,
    getEfficacyStats,
    getCoursePerformanceAnalytics
} from "@/app/actions/analytics";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useState, useEffect } from "react";
import Link from "next/link";
import { exportExcel, type SpreadsheetRow } from "@/lib/excel-client";
import { getDetailedStudentReport } from "@/app/actions/reports";
import { ReportPreviewModal } from "./report-preview-modal";
import { showToast } from "@/lib/toast";
import FramerGaugeChart from "@/components/charts/FramerGaugeChart";
import FramerBarChart from "@/components/charts/FramerBarChart";

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

interface CoursePerformance {
    id: string;
    title: string;
    category: string;
    trainingType: string;
    jp: number;
    enrolledCount: number;
    completedCount: number;
    completionRatePct: number;
}

export default function AdminAnalytics() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [stats, setStats] = useState<AnalyticsStats>({ totalUsers: 0, totalJp: 0, complianceRate: 0, avgScore: 0 });
    const [complianceData, setComplianceData] = useState<{ top: AgencyStats[]; bottom: AgencyStats[] }>({ top: [], bottom: [] });
    const [engagementData, setEngagementData] = useState<{ activityByHour: number[] }>({ activityByHour: [] });
    const [efficacyData, setEfficacyData] = useState<{ dropOffPoints: DropOffPoint[] }>({ dropOffPoints: [] });
    const [coursePerformances, setCoursePerformances] = useState<CoursePerformance[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const [s, c, e, ef, cp] = await Promise.all([
                    getAnalyticsMetrics(),
                    getInstansiCompliance(),
                    getEngagementStats(),
                    getEfficacyStats(),
                    getCoursePerformanceAnalytics()
                ]);
                setStats(s as AnalyticsStats);
                setComplianceData(c as { top: AgencyStats[]; bottom: AgencyStats[] });
                setEngagementData(e as { activityByHour: number[] });
                setEfficacyData(ef as { dropOffPoints: DropOffPoint[] });
                setCoursePerformances(cp as CoursePerformance[]);
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
                showToast.warning("Data Kosong", "Tidak ada data untuk diekspor.");
                return;
            }

            await exportExcel(
                [{ name: "Laporan Siswa", rows: data as SpreadsheetRow[] }],
                `Laporan_CorpuKU_${new Date().toISOString().split('T')[0]}.xlsx`,
            );
            showToast.success("Laporan Berhasil Diekspor", "File Excel telah diunduh.");
        } catch (err) {
            console.error("Export error:", err);
            showToast.error("Gagal Mengekspor", "Gagal mengekspor laporan.");
        } finally {
            setIsExporting(false);
        }
    };

    const topOpdBarItems = complianceData.top.slice(0, 5).map((a) => ({
        label: a.name,
        subLabel: `${a.totalJp.toLocaleString("id-ID")} JP`,
        value: a.compliance,
        displayValue: `${a.compliance}%`,
    }));

    const bottomOpdBarItems = complianceData.bottom.slice(0, 5).map((a) => ({
        label: a.name,
        subLabel: `${a.totalJp.toLocaleString("id-ID")} JP`,
        value: a.compliance,
        displayValue: `${a.compliance}%`,
        color: "#ef4444",
    }));

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            {/* SIDEBAR */}
            <AdminSidebar activePage="analytics" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen relative min-w-0">

                {/* Content */}
                <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">

                    {/* Header & Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gold-500/20 text-gold-600 dark:text-gold-400 border border-gold-500/30">
                                    Executive Learning Analytics
                                </span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-oxford-900 dark:text-white">
                                Tinjauan Kepatuhan Bangkom &amp; Efikasi
                            </h2>
                            <p className="text-sm text-oxford-600 dark:text-oxford-300 mt-1">
                                Laporan capaian Jam Pelajaran (JP) dan dampak program pengembangan kompetensi ASN se-Kalimantan Utara.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <button 
                                onClick={() => setShowPreviewModal(true)}
                                className="px-5 py-2.5 bg-gradient-to-r from-oxford-900 to-oxford-800 hover:from-oxford-800 hover:to-oxford-700 text-gold-500 font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border border-oxford-700 hover:shadow-lg text-sm"
                            >
                                <BarChart3 size={16} /> Preview Laporan (PDF)
                            </button>
                            <button 
                                onClick={handleExportExcel}
                                disabled={isExporting}
                                className="px-5 py-2.5 bg-white dark:bg-[#161B2A] hover:bg-oxford-50 dark:hover:bg-oxford-950 text-oxford-900 dark:text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border border-oxford-200 dark:border-oxford-700 disabled:opacity-50 text-sm"
                            >
                                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
                                Laporan Excel
                            </button>
                        </div>
                    </div>

                    {/* METRICS ROW 1: Framer Gauge + Key Executive KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {/* Gauge: 20 JP Compliance Rate */}
                        <div className="bg-white dark:bg-[#161B2A] p-5 rounded-3xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex flex-col items-center justify-between">
                            <FramerGaugeChart
                                score={stats.complianceRate}
                                title="Kepatuhan 20 JP ASN"
                                subTitle="Amanat UU ASN & PP 17/2020"
                                size={130}
                                colorScheme="auto"
                            />
                        </div>

                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-3xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gold-50 dark:bg-gold-950/40 text-gold-600">
                                    <Target size={24} />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-oxford-500 dark:text-oxford-400 text-xs font-bold uppercase tracking-wider mb-1">
                                    Rata-Rata Skor Kuis
                                </h3>
                                <p className="text-3xl font-extrabold text-oxford-900 dark:text-white">{stats.avgScore}</p>
                                <p className="text-xs text-oxford-400 mt-1">Evaluasi pemahaman materi</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-3xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                                    <Users size={24} />
                                </div>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-900">
                                    Aktif
                                </span>
                            </div>
                            <div>
                                <h3 className="text-oxford-500 dark:text-oxford-400 text-xs font-bold uppercase tracking-wider mb-1">
                                    Total ASN Terdaftar
                                </h3>
                                <p className="text-3xl font-extrabold text-oxford-900 dark:text-white">{stats.totalUsers.toLocaleString("id-ID")}</p>
                                <p className="text-xs text-oxford-400 mt-1">Pengguna aktif terverifikasi NIP</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-3xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-crimson-50 dark:bg-crimson-950/40 text-crimson-600">
                                    <Clock size={24} />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-oxford-500 dark:text-oxford-400 text-xs font-bold uppercase tracking-wider mb-1">
                                    Total JP Tersalurkan
                                </h3>
                                <p className="text-3xl font-extrabold text-oxford-900 dark:text-white">
                                    {stats.totalJp.toLocaleString("id-ID")} <span className="text-base text-oxford-400 font-normal">JP</span>
                                </p>
                                <p className="text-xs text-oxford-400 mt-1">Akumulasi seluruh kelulusan</p>
                            </div>
                        </div>
                    </div>

                    {/* COMPLIANCE & INSTANSI DASHBOARD (Animated Framer Bars) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                        {/* Top Performing Agencies */}
                        <div className="bg-white dark:bg-[#161B2A] rounded-3xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6 sm:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-gold-50 dark:bg-gold-950/40 text-gold-600 rounded-xl">
                                    <Trophy size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-oxford-900 dark:text-white text-lg">
                                        Top Kepatuhan Perangkat Daerah
                                    </h3>
                                    <p className="text-xs text-oxford-400">Instansi dengan % ASN pemenuhan 20 JP tertinggi</p>
                                </div>
                            </div>

                            <FramerBarChart items={topOpdBarItems} orientation="horizontal" />
                        </div>

                        {/* Lowest Performing Agencies */}
                        <div className="bg-white dark:bg-[#161B2A] rounded-3xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6 sm:p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 bg-crimson-50 dark:bg-crimson-950/40 text-crimson-600 rounded-xl">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-oxford-900 dark:text-white text-lg">
                                        Perangkat Daerah Butuh Perhatian
                                    </h3>
                                    <p className="text-xs text-oxford-400">Instansi dengan kepatuhan pelatihan di bawah batas minimal</p>
                                </div>
                            </div>

                            {bottomOpdBarItems.length === 0 ? (
                                <div className="text-center py-8 text-oxford-400 text-sm bg-oxford-50 dark:bg-oxford-950 rounded-2xl border border-dashed border-oxford-200 dark:border-oxford-700">
                                    Seluruh instansi telah melampaui target kepatuhan minimal.
                                </div>
                            ) : (
                                <FramerBarChart items={bottomOpdBarItems} orientation="horizontal" />
                            )}
                        </div>
                    </div>

                    {/* COURSE PERFORMANCE TABLE WITH DIRECT LINKS TO COURSE ANALYTICS */}
                    <div className="bg-white dark:bg-[#161B2A] rounded-3xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6 sm:p-8 space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-oxford-900 dark:text-white">
                                    Analitik Performa Katalog Kursus
                                </h3>
                                <p className="text-xs sm:text-sm text-oxford-500 dark:text-oxford-400 mt-1">
                                    Pilih kursus untuk melihat grafik corong kelulusan, presensi per sesi, dan indeks kepuasan Kirkpatrick.
                                </p>
                            </div>
                            <Link
                                href="/admin/courses"
                                className="text-xs font-bold text-gold-600 hover:text-gold-500 flex items-center gap-1 transition-colors"
                            >
                                Kelola Semua Kursus <ChevronRight size={14} />
                            </Link>
                        </div>

                        {coursePerformances.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="bg-oxford-50 dark:bg-oxford-950/60 text-oxford-500 uppercase text-[11px] font-bold border-y border-oxford-100 dark:border-oxford-800">
                                        <tr>
                                            <th className="py-3 px-4">Nama Pelatihan</th>
                                            <th className="py-3 px-4">Pola / Tipe</th>
                                            <th className="py-3 px-4 text-center">Beban JP</th>
                                            <th className="py-3 px-4 text-center">Peserta</th>
                                            <th className="py-3 px-4 text-center">Kelulusan</th>
                                            <th className="py-3 px-4 text-right">Aksi Analitik</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-oxford-100 dark:divide-oxford-800">
                                        {coursePerformances.map((c) => (
                                            <tr key={c.id} className="hover:bg-oxford-50/50 dark:hover:bg-oxford-900/30">
                                                <td className="py-3.5 px-4 font-bold text-oxford-900 dark:text-white max-w-xs truncate">
                                                    {c.title}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                                        c.trainingType === "classical_facilitation"
                                                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                                            : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                                    }`}>
                                                        {c.trainingType === "classical_facilitation" ? "Klasikal" : "E-Learning"}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-center font-bold text-gold-600">
                                                    {c.jp} JP
                                                </td>
                                                <td className="py-3.5 px-4 text-center text-oxford-700 dark:text-oxford-300 font-medium">
                                                    {c.enrolledCount} orang
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                                                        c.completionRatePct >= 75
                                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                                            : "bg-oxford-100 text-oxford-700 dark:bg-oxford-800 dark:text-oxford-300"
                                                    }`}>
                                                        {c.completionRatePct}% ({c.completedCount})
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <Link
                                                        href={`/admin/courses/${c.id}/analytics`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-oxford-900 hover:bg-gold-500 hover:text-oxford-950 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                                    >
                                                        <BarChart3 size={13} /> Buka Analitik <ExternalLink size={12} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-oxford-400 bg-oxford-50 dark:bg-oxford-950/40 rounded-2xl border border-dashed border-oxford-200 dark:border-oxford-800 text-sm">
                                Belum ada data kursus aktif yang tersedia.
                            </div>
                        )}
                    </div>

                    {/* LEARNING INTELLIGENCE & EFFICACY */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                        {/* Hourly Heatmap */}
                        <div className="lg:col-span-1 bg-white dark:bg-[#161B2A] rounded-3xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6">
                            <h3 className="font-bold text-oxford-900 dark:text-white text-lg mb-2">Jam Optimal Akses (DAU)</h3>
                            <p className="text-xs text-oxford-400 mb-6">Pola jam belajar aktif ASN dalam 24 jam</p>

                            <div className="flex items-end justify-between h-40 gap-1 mt-4">
                                {engagementData.activityByHour.map((vol: number, idx: number) => (
                                    <div key={idx} className="w-full flex flex-col items-center group relative">
                                        <div className="absolute -top-8 bg-oxford-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                            Pk. {idx * 2}:00 ({vol})
                                        </div>
                                        <div
                                            className={`w-full rounded-t-sm transition-colors ${vol > 80 ? 'bg-indigo-600' : vol > 50 ? 'bg-indigo-400' : 'bg-indigo-200 dark:bg-indigo-900/60'}`}
                                            style={{ height: `${Math.max(4, Math.min(100, vol))}%` }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-xs text-oxford-400 mt-2 font-medium">
                                <span>00:00</span>
                                <span>12:00 (Siang)</span>
                                <span>22:00</span>
                            </div>
                        </div>

                        {/* Drop-off / Churn Points */}
                        <div className="lg:col-span-1 bg-white dark:bg-[#161B2A] rounded-3xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6">
                            <h3 className="font-bold text-oxford-900 dark:text-white text-lg mb-2">Anomali Kurikulum (Drop-off)</h3>
                            <p className="text-xs text-oxford-500 dark:text-oxford-400 mb-6">Modul dimana peserta paling sering menghentikan belajarnya.</p>
                            <div className="space-y-4">
                                {efficacyData.dropOffPoints.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3.5 bg-oxford-50 dark:bg-oxford-950 rounded-2xl border border-oxford-100 dark:border-oxford-800 border-l-4 border-l-crimson-500">
                                        <span className="text-sm font-semibold text-oxford-900 dark:text-white truncate pr-2">{item.module}</span>
                                        <span className="text-xs font-bold text-crimson-600 bg-crimson-100 dark:bg-crimson-950/60 dark:text-crimson-300 px-2 py-0.5 rounded-full shrink-0">
                                            {item.rate}% Drop
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Search Trends KMS */}
                        <div className="lg:col-span-1 bg-white dark:bg-[#161B2A] rounded-3xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6">
                            <h3 className="font-bold text-oxford-900 dark:text-white text-lg mb-2">Trending Pencarian Materi</h3>
                            <p className="text-xs text-oxford-500 dark:text-oxford-400 mb-6">Topik yang paling dicari ASN namun belum ada di kurikulum.</p>
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
                                            <p className="text-xs text-oxford-500 dark:text-oxford-400">{item.volume.toLocaleString("id-ID")} Pencarian</p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-oxford-50 dark:bg-oxford-950 text-oxford-500 dark:text-oxford-400">
                                            {item.trend === 'up' && <ArrowUpRight size={16} className="text-emerald-500" />}
                                            {item.trend === 'down' && <ArrowDownRight size={16} className="text-crimson-500" />}
                                            {item.trend === 'same' && <Minus size={16} />}
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
