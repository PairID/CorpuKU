"use client";

import { useState } from "react";
import { Search, PlusCircle, Sparkles, LayoutGrid, Table as TableIcon } from "lucide-react";
import Link from "next/link";
import AdminCourseTable from "./admin-course-table";

export interface AdminCourse {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    level?: string | null;
    thumbnailUrl?: string | null;
    status: string;
    instructorName: string | null;
    studentCount: number;
    pendingCount?: number;
    accessMode?: string;
    jp?: number | null;
    trainingType?: string | null;
    createdAt: string;
    updatedAt: string;
}

export default function AdminCourseControls({ courses, basePath = "/admin" }: { courses: AdminCourse[], basePath?: string }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

    return (
        <div className="space-y-6">
            {/* Header Title & Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-oxford-900 dark:text-white">
                        Manajemen Kursus & Pelatihan
                    </h1>
                    <p className="text-sm text-oxford-500 dark:text-oxford-400 mt-1">
                        Kelola kurikulum, jadwal presensi, analitik, dan sertifikat dalam tampilan pratinjau peserta.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                        href={`${basePath}/courses/creator`}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-oxford-950 via-oxford-900 to-oxford-950 text-white font-bold rounded-xl border border-gold-500/40 hover:border-gold-400 hover:scale-[1.02] transition-all shadow-md group text-sm"
                    >
                        <Sparkles size={16} className="text-gold-400 group-hover:rotate-12 transition-transform" />
                        <span>AI Course Creator</span>
                    </Link>
                    <Link
                        href={`${basePath}/courses/new`}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-xl transition-all shadow-sm text-sm active:scale-95"
                    >
                        <PlusCircle size={18} />
                        <span>Buat Manual</span>
                    </Link>
                </div>
            </div>

            {/* Filter, Search & View Mode Switcher */}
            <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-800 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-oxford-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari kursus, kategori, instruktur..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-oxford-50 dark:bg-oxford-900/60 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-oxford-900 dark:text-white placeholder:text-oxford-400"
                    />
                </div>

                {/* Filter and View Toggle */}
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3.5 py-2.5 bg-oxford-50 dark:bg-oxford-900/60 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-oxford-700 dark:text-oxford-200 font-medium cursor-pointer"
                    >
                        <option value="all">Semua Status</option>
                        <option value="active">Active (Publik)</option>
                        <option value="draft">Draft (Konsep)</option>
                        <option value="archived">Archived (Diarsipkan)</option>
                    </select>

                    {/* View Switcher: Tampilan Siswa (Cards) vs Tabel Data */}
                    <div className="inline-flex items-center p-1 bg-oxford-100 dark:bg-oxford-900/80 rounded-xl border border-oxford-200 dark:border-oxford-800">
                        <button
                            type="button"
                            onClick={() => setViewMode("cards")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === "cards"
                                    ? "bg-white dark:bg-oxford-800 text-oxford-950 dark:text-gold-400 shadow-sm"
                                    : "text-oxford-600 dark:text-oxford-400 hover:text-oxford-950 dark:hover:text-white"
                            }`}
                            title="Tampilan Kartu (Persis seperti yang dilihat siswa)"
                        >
                            <LayoutGrid size={15} />
                            <span>Tampilan Siswa</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === "table"
                                    ? "bg-white dark:bg-oxford-800 text-oxford-950 dark:text-gold-400 shadow-sm"
                                    : "text-oxford-600 dark:text-oxford-400 hover:text-oxford-950 dark:hover:text-white"
                            }`}
                            title="Tampilan Tabel Data Manajemen"
                        >
                            <TableIcon size={15} />
                            <span>Tabel Data</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Courses Display */}
            <AdminCourseTable
                courses={courses}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                basePath={basePath}
                viewMode={viewMode}
            />
        </div>
    );
}
