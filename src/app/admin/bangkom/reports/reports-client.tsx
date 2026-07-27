"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { 
    Download, Users, TrendingUp, CheckCircle2,
    Target, Calendar, Award, Info
} from "lucide-react";
import { exportExcel, type SpreadsheetRow } from '@/lib/excel-client';
import { motion } from "framer-motion";

type NumericValue = number | string | null;

interface CategoryStat {
    category: string;
    total_users: NumericValue;
    compliant_users: NumericValue;
    total_jp_category: NumericValue;
}

interface InstansiStat {
    nama_instansi: string;
    total_users: NumericValue;
    compliant_users: NumericValue;
    avg_jp: NumericValue;
}

interface MonthlyTrend {
    month: NumericValue;
    jp: NumericValue;
}

interface TypeBreakdown {
    type: string;
    jp: NumericValue;
}

interface TopPerformer {
    id: string;
    name: string;
    nama_instansi: string | null;
    total_jp: NumericValue;
}

export interface ReportData {
    categoryStats: CategoryStat[];
    instansiStats: InstansiStat[];
    monthlyTrends: MonthlyTrend[];
    typeBreakdown: TypeBreakdown[];
    topPerformers: TopPerformer[];
}

const toNumber = (value: NumericValue | undefined) => Number(value || 0);

export default function ReportsClient({ data }: { data: ReportData }) {
    const [activeTab, setActiveTab] = useState("overview");

    const exportToExcel = async () => {
        await exportExcel([
            { name: "Kepatuhan Instansi", rows: data.instansiStats as unknown as SpreadsheetRow[] },
            { name: "Top Pegawai", rows: data.topPerformers as unknown as SpreadsheetRow[] },
        ], `Ultra_Detail_Bangkom_Report_${new Date().getFullYear()}.xlsx`);
    };

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const maxMonthlyJp = Math.max(...data.monthlyTrends.map(t => toNumber(t.jp)), 1);

    return (
        <div className="space-y-10 font-sans pb-32">
            {/* Ultra Header */}
            <div className="relative overflow-hidden bg-oxford-950 rounded-[2.5rem] p-10 lg:p-16 border border-white/10 shadow-2xl">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-[100px] -mr-64 -mt-64" />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold-500/20 text-gold-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-gold-500/30">
                            <Info size={12} /> Enterprise Level Analytics
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-serif font-bold text-white tracking-tight">Executive Summary <br/><span className="text-gold-500">Bangkom CorpuKU</span></h1>
                        <p className="text-oxford-400 max-w-xl text-lg">Laporan ultra-detail mengenai pemenuhan target pengembangan kompetensi tahun {new Date().getFullYear()} di seluruh lingkup instansi.</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <button 
                            onClick={exportToExcel}
                            className="px-8 py-4 bg-gold-500 text-oxford-950 rounded-2xl font-bold flex items-center gap-3 hover:bg-gold-400 transition-all shadow-xl shadow-gold-500/20 active:scale-95"
                        >
                            <Download size={20} /> Unduh Laporan Lengkap
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-[#161B2A] w-fit rounded-2xl border border-oxford-100 dark:border-oxford-800 shadow-sm">
                <button 
                    onClick={() => setActiveTab("overview")}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-oxford-900 text-white shadow-lg' : 'text-oxford-500 hover:bg-oxford-50'}`}
                >
                    Overview
                </button>
                <button 
                    onClick={() => setActiveTab("compliance")}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'compliance' ? 'bg-oxford-900 text-white shadow-lg' : 'text-oxford-500 hover:bg-oxford-50'}`}
                >
                    Compliance Detail
                </button>
                <button 
                    onClick={() => setActiveTab("trends")}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'trends' ? 'bg-oxford-900 text-white shadow-lg' : 'text-oxford-500 hover:bg-oxford-50'}`}
                >
                    Growth Trends
                </button>
            </div>

            {activeTab === "overview" && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard icon={<Target className="text-gold-500"/>} title="Total Jam Pelajaran" value={data.categoryStats.reduce((acc, curr) => acc + toNumber(curr.total_jp_category), 0)} unit="JP" color="gold" />
                        <MetricCard icon={<CheckCircle2 className="text-green-500"/>} title="Compliance Rate" value={Math.round((data.categoryStats.reduce((acc, curr) => acc + toNumber(curr.compliant_users), 0) / data.categoryStats.reduce((acc, curr) => acc + toNumber(curr.total_users), 1)) * 100)} unit="%" color="green" />
                        <MetricCard icon={<Users className="text-blue-500"/>} title="Total Pegawai" value={data.categoryStats.reduce((acc, curr) => acc + toNumber(curr.total_users), 0)} unit="User" color="blue" />
                        <MetricCard icon={<Award className="text-purple-500"/>} title="Internal Contribution" value={Math.round((toNumber(data.typeBreakdown.find(t => t.type === 'Internal Courses')?.jp) / data.categoryStats.reduce((acc, curr) => acc + Math.max(1, toNumber(curr.total_jp_category)), 1)) * 100)} unit="%" color="purple" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Type Distribution */}
                        <div className="lg:col-span-1 bg-white dark:bg-[#161B2A] rounded-[2rem] p-8 border border-oxford-100 dark:border-oxford-800 shadow-sm">
                            <h3 className="font-serif text-xl font-bold text-oxford-900 dark:text-white mb-8">Distribusi Sumber Bangkom</h3>
                            <div className="space-y-8">
                                {data.typeBreakdown.map((type, idx) => {
                                    const totalJp = data.typeBreakdown.reduce((acc, curr) => acc + toNumber(curr.jp), 1);
                                    const percent = Math.round((toNumber(type.jp) / totalJp) * 100);
                                    return (
                                        <div key={idx} className="space-y-2">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-bold text-oxford-600 dark:text-oxford-300">{type.type}</span>
                                                <span className="text-oxford-900 dark:text-white font-bold">{type.jp} JP</span>
                                            </div>
                                            <div className="h-2 w-full bg-oxford-50 dark:bg-oxford-900 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${idx === 0 ? 'bg-gold-500' : idx === 1 ? 'bg-blue-500' : 'bg-purple-500'}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-12 p-6 bg-oxford-50 dark:bg-oxford-900/50 rounded-2xl border border-oxford-100 dark:border-oxford-800">
                                <p className="text-xs text-oxford-400 italic">&ldquo;Kontribusi terbesar berasal dari {[...data.typeBreakdown].sort((a,b) => toNumber(b.jp) - toNumber(a.jp))[0]?.type}, menunjukkan efektivitas platform internal.&rdquo;</p>
                            </div>
                        </div>

                        {/* Top Performers */}
                        <div className="lg:col-span-2 bg-white dark:bg-[#161B2A] rounded-[2rem] p-8 border border-oxford-100 dark:border-oxford-800 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-serif text-xl font-bold text-oxford-900 dark:text-white">Top 5 Pegawai Berprestasi</h3>
                                <Award className="text-gold-500" />
                            </div>
                            <div className="space-y-4">
                                {data.topPerformers.map((user, idx) => (
                                    <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-oxford-50 dark:hover:bg-oxford-900/40 rounded-2xl transition-all border border-transparent hover:border-oxford-100 dark:hover:border-oxford-800 group">
                                        <div className="w-12 h-12 rounded-xl bg-gold-500 text-oxford-950 flex items-center justify-center font-serif text-xl font-bold shadow-lg shadow-gold-500/10">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-oxford-900 dark:text-white group-hover:text-gold-600 transition-colors">{user.name}</p>
                                            <p className="text-xs text-oxford-400">{user.nama_instansi}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-serif font-bold text-oxford-900 dark:text-white">{user.total_jp}</p>
                                            <p className="text-[10px] text-gold-500 font-bold uppercase tracking-widest">Total Jam Pelajaran</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {activeTab === "compliance" && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                    {/* Compliance Matrix */}
                    <div className="bg-white dark:bg-[#161B2A] rounded-[2rem] border border-oxford-100 dark:border-oxford-800 shadow-xl overflow-hidden">
                        <div className="p-8 border-b border-oxford-100 dark:border-oxford-800 flex items-center justify-between bg-oxford-50/50 dark:bg-oxford-900/30">
                            <h3 className="text-xl font-serif font-bold text-oxford-900 dark:text-white">Matriks Kepatuhan Unit Kerja</h3>
                            <span className="text-sm font-medium text-oxford-500">Menampilkan status pemenuhan target tahunan</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-xs font-bold text-oxford-400 uppercase tracking-widest border-b border-oxford-100 dark:border-oxford-800">
                                        <th className="p-6">Unit Kerja / Instansi</th>
                                        <th className="p-6">Populasi</th>
                                        <th className="p-6">Compliant</th>
                                        <th className="p-6">Gap Analysis</th>
                                        <th className="p-6">Avg JP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-oxford-50 dark:divide-oxford-800">
                                    {data.instansiStats.map((inst, idx) => {
                                        const compliantRate = Math.round((toNumber(inst.compliant_users) / Math.max(1, toNumber(inst.total_users))) * 100);
                                        return (
                                            <tr key={idx} className="hover:bg-oxford-50/30 dark:hover:bg-oxford-900/10 transition-colors">
                                                <td className="p-6 font-bold text-oxford-800 dark:text-oxford-200">{inst.nama_instansi}</td>
                                                <td className="p-6 text-oxford-500">{inst.total_users} Pegawai</td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-oxford-900 dark:text-white">{inst.compliant_users}</span>
                                                        <span className="text-xs text-green-500 font-bold">({compliantRate}%)</span>
                                                    </div>
                                                </td>
                                                <td className="p-6 w-64">
                                                    <div className="h-1.5 w-full bg-oxford-100 dark:bg-oxford-800 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${compliantRate > 70 ? 'bg-green-500' : compliantRate > 40 ? 'bg-gold-500' : 'bg-crimson-500'}`}
                                                            style={{ width: `${compliantRate}%` }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="text-lg font-bold text-oxford-900 dark:text-white">{Math.round(toNumber(inst.avg_jp))} <span className="text-[10px] text-oxford-400">JP</span></div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}

            {activeTab === "trends" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                    {/* Monthly Trend Chart (Tailwind Bars) */}
                    <div className="bg-white dark:bg-[#161B2A] rounded-[2rem] p-10 border border-oxford-100 dark:border-oxford-800 shadow-sm">
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h3 className="font-serif text-2xl font-bold text-oxford-900 dark:text-white">Trend Pertumbuhan Jam Pelajaran</h3>
                                <p className="text-oxford-400 mt-1">Aktivitas akumulasi JP bulanan tahun {new Date().getFullYear()}</p>
                            </div>
                            <div className="flex items-center gap-2 text-gold-500 font-bold">
                                <TrendingUp size={24} /> <span className="text-3xl font-serif">{data.monthlyTrends.reduce((a,b) => a + toNumber(b.jp), 0)}</span> <span className="text-xs uppercase tracking-widest mt-3">Total JP</span>
                            </div>
                        </div>
                        
                        <div className="flex items-end justify-between h-80 gap-2 px-4 border-b border-oxford-100 dark:border-oxford-800 pb-2">
                            {monthNames.map((name, i) => {
                                const trend = data.monthlyTrends.find(t => toNumber(t.month) === i + 1);
                                const val = trend ? toNumber(trend.jp) : 0;
                                const height = (val / maxMonthlyJp) * 100;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                                        <div className="relative w-full flex justify-center">
                                            {val > 0 && (
                                                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-oxford-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl whitespace-nowrap z-10">
                                                    {val} JP
                                                </div>
                                            )}
                                            <div 
                                                className={`w-full max-w-[40px] rounded-t-xl transition-all duration-1000 origin-bottom ${val > 0 ? 'bg-gradient-to-t from-gold-600 to-gold-400' : 'bg-oxford-50 dark:bg-oxford-900/30'}`}
                                                style={{ height: val > 0 ? `${height}%` : '4px' }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-oxford-400 uppercase tracking-widest">{name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-oxford-900 text-white rounded-3xl p-8 flex items-center justify-between">
                            <div>
                                <h4 className="text-oxford-400 font-bold text-xs uppercase tracking-widest mb-2">Puncak Aktivitas</h4>
                                <p className="text-2xl font-serif font-bold italic">
                                    {monthNames[toNumber([...data.monthlyTrends].sort((a,b) => toNumber(b.jp) - toNumber(a.jp))[0]?.month || 1) - 1]}
                                </p>
                            </div>
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                                <TrendingUp className="text-gold-500" size={32} />
                            </div>
                        </div>
                        <div className="bg-gold-500 text-oxford-950 rounded-3xl p-8 flex items-center justify-between">
                            <div>
                                <h4 className="text-oxford-950/60 font-bold text-xs uppercase tracking-widest mb-2">Rata-rata Bulanan</h4>
                                <p className="text-2xl font-serif font-bold italic">
                                    {Math.round(data.monthlyTrends.reduce((a,b) => a + toNumber(b.jp), 0) / 12)} JP
                                </p>
                            </div>
                            <div className="w-16 h-16 bg-oxford-950/10 rounded-2xl flex items-center justify-center">
                                <Calendar className="text-oxford-950" size={32} />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

function MetricCard({ icon, title, value, unit, color }: { icon: ReactNode, title: string, value: number, unit: string, color: string }) {
    return (
        <div className="bg-white dark:bg-[#161B2A] p-8 rounded-[2rem] border border-oxford-100 dark:border-oxford-800 shadow-sm hover:shadow-xl transition-all group">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
                color === 'gold' ? 'bg-gold-500/10' : color === 'green' ? 'bg-green-500/10' : color === 'blue' ? 'bg-blue-500/10' : 'bg-purple-500/10'
            }`}>
                {icon}
            </div>
            <h3 className="text-oxford-400 font-bold text-xs uppercase tracking-widest mb-2">{title}</h3>
            <p className="text-3xl font-serif font-bold text-oxford-900 dark:text-white">
                {value.toLocaleString('id-ID')}
                <span className="text-sm text-oxford-400 ml-2 font-sans font-medium">{unit}</span>
            </p>
        </div>
    );
}
