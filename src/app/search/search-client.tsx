"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, ChevronDown, Check, Signal } from "lucide-react";
import { COURSE_CATEGORIES, COURSE_LEVELS } from "@/lib/constants";

// Mock filters structure
const FILTERS = {
    subjects: COURSE_CATEGORIES,
    skills: ["Python", "Management", "Analytics", "R Programming", "Leadership"],
    levels: COURSE_LEVELS,
    programs: ["MicroMasters", "Professional Certificate", "Executive Ed"],
};

interface CourseProp {
    id: string;
    title: string;
    description: string | null;
    category: string;
    level: string;
    thumbnailUrl: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export default function SearchClient({ courses }: { courses: CourseProp[] }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("Most Relevant");
    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({
        subjects: [],
        levels: [],
    });

    const toggleFilter = (category: string, value: string) => {
        setSelectedFilters(prev => {
            const current = prev[category] || [];
            const updated = current.includes(value)
                ? current.filter(item => item !== value)
                : [...current, value];
            return { ...prev, [category]: updated };
        });
    };

    const filteredCourses = courses.filter(course => {
        // Search filter
        const matchesSearch =
            course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

        // Subject filter (mapped to category in course)
        const matchesSubject =
            selectedFilters.subjects.length === 0 ||
            selectedFilters.subjects.includes(course.category);

        // Level filter
        const matchesLevel =
            selectedFilters.levels.length === 0 ||
            selectedFilters.levels.includes(course.level);

        return matchesSearch && matchesSubject && matchesLevel;
    });

    const sortedCourses = [...filteredCourses].sort((a, b) => {
        if (sortBy === "Newest") {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        }
        // Most Relevant will be default
        return 0;
    });

    return (
        <div className="bg-oxford-50 dark:bg-oxford-950 min-h-screen pb-24">
            {/* SEARCH HEADER */}
            <div className="bg-oxford-950 text-white pt-12 pb-24">
                <div className="container mx-auto px-4">
                    <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6">Explore 3,000+ Courses</h1>
                    <div className="relative max-w-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-700 dark:text-oxford-200" size={24} />
                        <input
                            type="text"
                            placeholder="Search for courses, skills, or universities..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-4 py-4 bg-white dark:bg-[#161B2A]/10 border border-oxford-700 rounded-xl text-lg font-sans text-white focus:outline-none focus:bg-white dark:focus:bg-[#161B2A] focus:text-oxford-900 dark:focus:text-white focus:border-gold-500 focus:ring-4 focus:ring-gold-500/20 transition-all placeholder:text-oxford-700 dark:placeholder:text-oxford-200"
                        />
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-12">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* SIDEBAR FILTERS */}
                    <div className="w-full lg:w-72 flex-shrink-0">
                        <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 p-6 sticky top-28">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-oxford-100 dark:border-oxford-800">
                                <h2 className="font-serif text-xl font-bold text-oxford-900 dark:text-white flex items-center gap-2">
                                    <SlidersHorizontal size={20} className="text-oxford-700 dark:text-oxford-200" /> Filters
                                </h2>
                                <button
                                    onClick={() => setSelectedFilters({ subjects: [], levels: [] })}
                                    className="text-sm font-sans font-semibold text-oxford-700 dark:text-oxford-200 hover:text-gold-600 transition-colors"
                                >
                                    Clear all
                                </button>
                            </div>

                            {/* Filter Section: Subject */}
                            <div className="mb-8">
                                <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-oxford-900 dark:text-white mb-4 flex items-center justify-between cursor-pointer">
                                    Subject <ChevronDown size={16} className="text-oxford-700 dark:text-oxford-200" />
                                </h3>
                                <div className="space-y-3">
                                    {FILTERS.subjects.map(subject => {
                                        const isSelected = selectedFilters.subjects?.includes(subject);
                                        return (
                                            <label key={subject} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleFilter("subjects", subject)}>
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-gold-500 border-gold-500 text-oxford-950' : 'border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] group-hover:border-gold-400'}`}>
                                                    {isSelected && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                <span className={`text-sm font-sans ${isSelected ? 'text-oxford-900 dark:text-white font-medium' : 'text-oxford-700 dark:text-oxford-200 group-hover:text-oxford-900 dark:group-hover:text-white'}`}>
                                                    {subject}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Filter Section: Level */}
                            <div>
                                <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-oxford-900 dark:text-white mb-4 flex items-center justify-between cursor-pointer">
                                    Level <ChevronDown size={16} className="text-oxford-700 dark:text-oxford-200" />
                                </h3>
                                <div className="space-y-3">
                                    {FILTERS.levels.map(level => {
                                        const isSelected = selectedFilters.levels?.includes(level);
                                        return (
                                            <label key={level} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleFilter("levels", level)}>
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-gold-500 border-gold-500 text-oxford-950' : 'border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] group-hover:border-gold-400'}`}>
                                                    {isSelected && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                <span className={`text-sm font-sans ${isSelected ? 'text-oxford-900 dark:text-white font-medium' : 'text-oxford-700 dark:text-oxford-200 group-hover:text-oxford-900 dark:group-hover:text-white'}`}>
                                                    {level}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* COURSE GRID */}
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-6 pt-12 lg:pt-0">
                            <p className="font-sans text-oxford-700 dark:text-oxford-200 lg:text-white">Showing <span className="font-bold text-oxford-900 dark:text-white lg:text-white">{sortedCourses.length}</span> results</p>
                            <div className="flex items-center gap-2">
                                <span className="font-sans text-sm text-oxford-700 dark:text-oxford-200 lg:text-white">Sort by:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-transparent font-sans font-semibold text-oxford-900 dark:text-white lg:text-white focus:outline-none cursor-pointer"
                                >
                                    <option value="Most Relevant" className="text-oxford-900 dark:text-white">Most Relevant</option>
                                    <option value="Newest" className="text-oxford-900 dark:text-white">Newest</option>
                                    <option value="Highest Rated" className="text-oxford-900 dark:text-white">Highest Rated</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {sortedCourses.length > 0 ? (
                                sortedCourses.map((course, idx) => (
                                    <Link href={`/courses/${course.id}`} key={course.id}>
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            whileHover={{ y: -4 }}
                                            className="bg-white dark:bg-[#161B2A] rounded-2xl overflow-hidden border border-oxford-100 dark:border-oxford-800 shadow-sm hover:shadow-xl hover:shadow-oxford-900/5 transition-all duration-300 flex flex-col group h-full cursor-pointer relative"
                                        >
                                            <div className="h-40 bg-oxford-800 relative overflow-hidden">
                                                {course.thumbnailUrl && (
                                                    <Image src={course.thumbnailUrl} alt={course.title} fill sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" unoptimized className="object-cover opacity-60 mix-blend-overlay" />
                                                )}
                                                <div className="absolute inset-0 bg-mesh mix-blend-overlay opacity-50" />
                                            </div>

                                            <div className="p-6 flex flex-col flex-1">
                                                <p className="text-xs font-semibold text-oxford-700 dark:text-oxford-200 uppercase tracking-wider mb-2">
                                                    CorpuKU Academy
                                                </p>
                                                <h3 className="text-xl font-serif text-oxford-900 dark:text-white mb-4 group-hover:text-gold-600 transition-colors line-clamp-2">
                                                    {course.title}
                                                </h3>
                                                <p className="font-sans text-sm text-oxford-600 dark:text-oxford-300 line-clamp-3 mb-4">
                                                    {course.description}
                                                </p>

                                                <div className="mt-auto space-y-3 pt-4 border-t border-oxford-50 dark:border-oxford-900">
                                                    <div className="flex items-center gap-2 text-xs text-oxford-700 dark:text-oxford-200 font-sans">
                                                        <Signal size={14} className="text-gold-600" />
                                                        <span className="font-medium">{course.level}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </Link>
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center">
                                    <h3 className="text-xl font-serif text-oxford-900 dark:text-white mb-2">No courses found</h3>
                                    <p className="text-oxford-600 dark:text-oxford-300">Try adjusting your search or filters to find what you&apos;re looking for.</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        <div className="mt-16 flex justify-center pb-8">
                            <div className="flex items-center gap-2">
                                <button className="w-10 h-10 rounded-full border border-oxford-200 dark:border-oxford-700 flex items-center justify-center text-oxford-700 dark:text-oxford-200 hover:border-gold-400 hover:text-gold-600 transition-colors" disabled>
                                    &lt;
                                </button>
                                <button className="w-10 h-10 rounded-full bg-gold-500 text-oxford-950 font-bold border border-gold-500 flex items-center justify-center">
                                    1
                                </button>
                                <button className="w-10 h-10 rounded-full border border-oxford-200 dark:border-oxford-700 flex items-center justify-center text-oxford-700 dark:text-oxford-200 hover:border-gold-400 hover:text-gold-600 transition-colors">
                                    2
                                </button>
                                <button className="w-10 h-10 rounded-full border border-oxford-200 dark:border-oxford-700 flex items-center justify-center text-oxford-700 dark:text-oxford-200 hover:border-gold-400 hover:text-gold-600 transition-colors">
                                    3
                                </button>
                                <span className="text-oxford-700 dark:text-oxford-200 px-2">...</span>
                                <button className="w-10 h-10 rounded-full border border-oxford-200 dark:border-oxford-700 flex items-center justify-center text-oxford-700 dark:text-oxford-200 hover:border-gold-400 hover:text-gold-600 transition-colors">
                                    42
                                </button>
                                <button className="w-10 h-10 rounded-full border border-oxford-200 dark:border-oxford-700 flex items-center justify-center text-oxford-700 dark:text-oxford-200 hover:border-gold-400 hover:text-gold-600 transition-colors">
                                    &gt;
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
