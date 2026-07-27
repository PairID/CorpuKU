"use client";

import { useState } from "react";
import { Search, Filter, ArrowUpRight, CheckCircle2, AlertCircle, Clock, ExternalLink, Upload } from "lucide-react";
import Link from "next/link";

export interface BangkomUser {
    id: string;
    name: string;
    nip: string;
    jabatan: string;
    kategori_pegawai: string | null;
    nama_instansi: string | null;
    totalJp: number;
    targetJp: number;
}

export default function BangkomClient({ users }: { users: BangkomUser[] }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    const filteredUsers = users.filter(user => {
        const matchesSearch = 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (user.nip && user.nip.includes(searchTerm)) ||
            (user.nama_instansi && user.nama_instansi.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesCategory = categoryFilter === "all" || user.kategori_pegawai === categoryFilter;
        
        return matchesSearch && matchesCategory;
    });

    const stats = {
        totalUsers: users.length,
        metTarget: users.filter(u => u.totalJp >= u.targetJp).length,
        nearTarget: users.filter(u => u.totalJp >= (u.targetJp * 0.7) && u.totalJp < u.targetJp).length,
        belowTarget: users.filter(u => u.totalJp < (u.targetJp * 0.7)).length,
    };

    return (
        <div className="space-y-8 font-sans">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-oxford-900 dark:text-white">Tracking Progres Bangkom</h1>
                    <p className="text-oxford-500 mt-2">Monitor pemenuhan Jam Pelajaran (JP) tahunan seluruh pegawai.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/admin/bangkom/upload" className="px-5 py-2.5 bg-oxford-100 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-300 rounded-xl font-bold hover:bg-oxford-200 transition-all flex items-center gap-2">
                        <Upload size={18} /> Batch Upload
                    </Link>
                    <Link href="/admin/bangkom/verifikasi" className="px-5 py-2.5 bg-oxford-100 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-300 rounded-xl font-bold hover:bg-oxford-200 transition-all flex items-center gap-2">
                        <Clock size={18} /> Verifikasi Eksternal
                    </Link>
                    <Link href="/admin/bangkom/reports" className="px-5 py-2.5 bg-gold-500 text-oxford-950 rounded-xl font-bold hover:bg-gold-400 transition-all flex items-center gap-2 shadow-lg shadow-gold-500/20">
                        <ArrowUpRight size={18} /> Dashboard Report
                    </Link>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-100 dark:border-oxford-800 shadow-sm">
                    <p className="text-sm font-bold text-oxford-400 uppercase tracking-wider mb-1">Total Pegawai</p>
                    <p className="text-3xl font-bold text-oxford-900 dark:text-white">{stats.totalUsers}</p>
                </div>
                <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-100 dark:border-oxford-800 shadow-sm">
                    <p className="text-sm font-bold text-green-500 uppercase tracking-wider mb-1">Memenuhi Target</p>
                    <p className="text-3xl font-bold text-oxford-900 dark:text-white">{stats.metTarget}</p>
                </div>
                <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-100 dark:border-oxford-800 shadow-sm">
                    <p className="text-sm font-bold text-gold-500 uppercase tracking-wider mb-1">Mendekati Target</p>
                    <p className="text-3xl font-bold text-oxford-900 dark:text-white">{stats.nearTarget}</p>
                </div>
                <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-100 dark:border-oxford-800 shadow-sm">
                    <p className="text-sm font-bold text-crimson-500 uppercase tracking-wider mb-1">Butuh Perhatian</p>
                    <p className="text-3xl font-bold text-oxford-900 dark:text-white">{stats.belowTarget}</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-[#161B2A] p-4 rounded-2xl border border-oxford-100 dark:border-oxford-800 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Cari nama, NIP, atau instansi..."
                        className="w-full pl-12 pr-4 py-3 bg-oxford-50 dark:bg-oxford-900/50 border-none rounded-xl focus:ring-2 focus:ring-gold-500 transition-all outline-none text-oxford-900 dark:text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Filter className="text-oxford-400" size={20} />
                    <select 
                        className="bg-oxford-50 dark:bg-oxford-900/50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-gold-500 transition-all outline-none text-oxford-900 dark:text-white"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">Semua Kategori</option>
                        <option value="Provinsi">Provinsi</option>
                        <option value="OPD">OPD</option>
                        <option value="Kab_Kota">Kabupaten/Kota</option>
                        <option value="Lainnya">Instansi Lainnya</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-100 dark:border-oxford-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-oxford-50 dark:bg-oxford-900/50 border-b border-oxford-100 dark:border-oxford-800">
                                <th className="p-4 font-bold text-oxford-800 dark:text-oxford-200">Nama Pegawai</th>
                                <th className="p-4 font-bold text-oxford-800 dark:text-oxford-200">Instansi / Jabatan</th>
                                <th className="p-4 font-bold text-oxford-800 dark:text-oxford-200">Kategori</th>
                                <th className="p-4 font-bold text-oxford-800 dark:text-oxford-200">Progres JP</th>
                                <th className="p-4 font-bold text-oxford-800 dark:text-oxford-200 text-center">Status</th>
                                <th className="p-4 font-bold text-oxford-800 dark:text-oxford-200 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-oxford-50 dark:divide-oxford-800">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => {
                                    const progressPercent = Math.min((user.totalJp / user.targetJp) * 100, 100);
                                    return (
                                        <tr key={user.id} className="hover:bg-oxford-50/50 dark:hover:bg-oxford-900/20 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-oxford-900 dark:text-white">{user.name}</div>
                                                <div className="text-xs text-oxford-400 font-mono mt-1">NIP: {user.nip || "-"}</div>
                                            </td>
                                            <td className="p-4 text-sm">
                                                <div className="text-oxford-700 dark:text-oxford-300 font-medium">{user.nama_instansi || "-"}</div>
                                                <div className="text-oxford-400 mt-0.5">{user.jabatan || "-"}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2.5 py-1 bg-oxford-100 dark:bg-oxford-800 text-oxford-600 dark:text-oxford-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                    {user.kategori_pegawai || "Lainnya"}
                                                </span>
                                            </td>
                                            <td className="p-4 w-48">
                                                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                                                    <span className="text-oxford-900 dark:text-white">{user.totalJp} <span className="text-oxford-400">/ {user.targetJp} JP</span></span>
                                                    <span className={progressPercent === 100 ? "text-green-500" : "text-gold-500"}>{Math.round(progressPercent)}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-oxford-100 dark:bg-oxford-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${progressPercent === 100 ? "bg-green-500" : "bg-gold-500"}`} 
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {user.totalJp >= user.targetJp ? (
                                                    <div className="inline-flex items-center gap-1.5 text-green-500 font-bold text-xs">
                                                        <CheckCircle2 size={16} /> COMPLIANT
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 text-oxford-400 font-bold text-xs">
                                                        <AlertCircle size={16} /> IN PROGRESS
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Link href={`/admin/users/${user.id}`} className="p-2 text-oxford-400 hover:text-gold-500 hover:bg-gold-500/10 rounded-lg transition-all inline-block">
                                                    <ExternalLink size={18} />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-oxford-400 italic">
                                        Tidak ada data yang ditemukan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
