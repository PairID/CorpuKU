"use client";

import { useState } from "react";
import { Search, PlusCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import AdminCourseTable from "./admin-course-table";

export interface AdminCourse {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    status: string;
    instructorName: string | null;
    studentCount: number;
    pendingCount?: number;
    accessMode?: string;
    createdAt: string;
    updatedAt: string;
}

export default function AdminCourseControls({ courses, basePath = "/admin" }: { courses: AdminCourse[], basePath?: string }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    return (
        <>
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-oxford-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari nama kursus, instruktur..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all w-full text-oxford-900 dark:text-white shadow-xs"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-gold-500 text-oxford-700 dark:text-oxford-200 shadow-xs cursor-pointer"
                    >
                        <option value="all">Semua Status</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                    </select>

                    <Link
                        href={`${basePath}/courses/creator`}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-oxford-950 via-oxford-900 to-oxford-950 text-white font-bold rounded-xl border border-gold-500/40 hover:border-gold-400 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm group text-xs sm:text-sm whitespace-nowrap"
                    >
                        <Sparkles size={15} className="text-gold-400 group-hover:rotate-12 transition-transform shrink-0" />
                        <span>AI Creator</span>
                    </Link>

                    <Link
                        href={`${basePath}/courses/new`}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-xl transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm whitespace-nowrap"
                    >
                        <PlusCircle size={16} className="shrink-0" />
                        <span>Buat Manual</span>
                    </Link>
                </div>
            </div>

            {/* Table Area */}
            <AdminCourseTable courses={courses} searchQuery={searchQuery} statusFilter={statusFilter} basePath={basePath} />
        </>
    );
}
