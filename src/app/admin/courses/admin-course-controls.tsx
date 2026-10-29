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
    createdAt: string;
    updatedAt: string;
}

export default function AdminCourseControls({ courses, basePath = "/admin" }: { courses: AdminCourse[], basePath?: string }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    return (
        <>
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-oxford-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari nama kursus, instruktur..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all w-full sm:w-64 text-oxford-900 dark:text-white"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-700 dark:text-oxford-200"
                    >
                        <option value="all">Semua Status</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                    </select>
                    <Link href={`${basePath}/courses/creator`} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-oxford-950 via-oxford-900 to-oxford-950 text-white font-bold rounded-lg border border-gold-500/40 hover:border-gold-400 hover:scale-[1.02] transition-all shadow-md group text-sm">
                        <Sparkles size={16} className="text-gold-400 group-hover:rotate-12 transition-transform" />
                        <span>AI Course Creator</span>
                    </Link>
                    <Link href={`${basePath}/courses/new`} className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-lg transition-colors shadow-sm text-sm">
                        <PlusCircle size={18} /> Buat Manual
                    </Link>
                </div>
            </div>

            {/* Table Area */}
            <AdminCourseTable courses={courses} searchQuery={searchQuery} statusFilter={statusFilter} basePath={basePath} />
        </>
    );
}
