"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Search, Calendar, Clock, Video, ChevronRight } from "lucide-react";
import { Webinar } from "@/lib/types";

export default function WebinarsClient({ webinars }: { webinars: Webinar[] }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("Terbaru");

    const filteredWebinars = webinars.filter(w => 
        w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedWebinars = [...filteredWebinars].sort((a, b) => {
        const dateA = new Date(a.scheduledAt).getTime();
        const dateB = new Date(b.scheduledAt).getTime();
        if (sortBy === "Terbaru") return dateB - dateA;
        if (sortBy === "Terlama") return dateA - dateB;
        return 0;
    });

    return (
        <div className="bg-oxford-50 dark:bg-oxford-950 min-h-screen pb-24">
            {/* SEARCH HEADER */}
            <div className="bg-oxford-950 text-white pt-12 pb-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-mesh opacity-20" />
                <div className="container mx-auto px-4 relative z-10">
                    <h1 className="text-4xl md:text-5xl font-serif font-medium mb-4 flex items-center gap-4">
                        <Video className="text-gold-500" size={40} />
                        Webinar & Live Event
                    </h1>
                    <p className="text-oxford-300 text-lg mb-8 max-w-2xl">
                        Tingkatkan wawasan dan keahlian Anda melalui sesi tatap muka virtual interaktif bersama para ahli.
                    </p>
                    <div className="relative max-w-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-700 dark:text-oxford-200" size={24} />
                        <input
                            type="text"
                            placeholder="Cari topik webinar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-4 py-4 bg-white dark:bg-[#161B2A]/10 border border-oxford-700 rounded-xl text-lg font-sans text-white focus:outline-none focus:bg-white dark:focus:bg-[#161B2A] focus:text-oxford-900 dark:focus:text-white focus:border-gold-500 focus:ring-4 focus:ring-gold-500/20 transition-all placeholder:text-oxford-700 dark:placeholder:text-oxford-200"
                        />
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-12 relative z-20">
                <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="font-sans text-oxford-700 dark:text-oxford-200">Menampilkan <span className="font-bold text-oxford-900 dark:text-white">{sortedWebinars.length}</span> webinar</p>
                    <div className="flex items-center gap-3">
                        <span className="font-sans text-sm text-oxford-700 dark:text-oxford-200">Urutkan:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 text-oxford-900 dark:text-white text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5"
                        >
                            <option value="Terbaru">Terbaru</option>
                            <option value="Terlama">Terlama</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sortedWebinars.length > 0 ? (
                        sortedWebinars.map((webinar, idx) => {
                            const isUpcoming = webinar.status === 'published';
                            
                            return (
                                <Link href={`/webinars/${webinar.id}`} key={webinar.id}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        whileHover={{ y: -6 }}
                                        className="bg-white dark:bg-[#161B2A] rounded-2xl overflow-hidden border border-oxford-100 dark:border-oxford-800 shadow-sm hover:shadow-2xl hover:shadow-oxford-900/10 transition-all duration-300 flex flex-col group h-full cursor-pointer relative"
                                    >
                                        <div className="h-48 bg-oxford-900 relative overflow-hidden">
                                            {webinar.thumbnailUrl ? (
                                                <Image src={webinar.thumbnailUrl} alt={webinar.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" unoptimized className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="absolute inset-0 bg-mesh opacity-50" />
                                            )}
                                            
                                            {/* Badge */}
                                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                                {isUpcoming && (
                                                    <span className="px-3 py-1 bg-crimson-500 text-white text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-crimson-500/30">
                                                        <span className="w-2 h-2 bg-white dark:bg-[#161B2A] rounded-full animate-pulse" />
                                                        Akan Datang
                                                    </span>
                                                )}
                                                {webinar.status === 'completed' && (
                                                    <span className="px-3 py-1 bg-oxford-800/80 backdrop-blur-sm text-white text-xs font-bold rounded-full uppercase tracking-wider">
                                                        Selesai
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-6 flex flex-col flex-1">
                                            <h3 className="text-xl font-serif text-oxford-900 dark:text-white mb-3 group-hover:text-gold-600 transition-colors line-clamp-2 leading-snug">
                                                {webinar.title}
                                            </h3>
                                            <p className="font-sans text-sm text-oxford-600 dark:text-oxford-300 line-clamp-2 mb-6">
                                                {webinar.description}
                                            </p>

                                            <div className="mt-auto space-y-3 pt-5 border-t border-oxford-100 dark:border-oxford-800">
                                                <div className="flex items-center gap-3 text-sm text-oxford-700 dark:text-oxford-200">
                                                    <div className="w-8 h-8 rounded-full bg-oxford-50 dark:bg-oxford-950 flex items-center justify-center text-gold-600 shrink-0">
                                                        <Calendar size={16} />
                                                    </div>
                                                    <span className="font-medium text-oxford-900 dark:text-white">
                                                        {new Date(webinar.scheduledAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-oxford-700 dark:text-oxford-200">
                                                    <div className="w-8 h-8 rounded-full bg-oxford-50 dark:bg-oxford-950 flex items-center justify-center text-gold-600 shrink-0">
                                                        <Clock size={16} />
                                                    </div>
                                                    <span className="font-medium text-oxford-900 dark:text-white">
                                                        {new Date(webinar.scheduledAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-6 flex items-center justify-between text-gold-600 font-semibold group-hover:text-gold-500">
                                                <span>Lihat Detail Acara</span>
                                                <ChevronRight size={20} className="transform group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </motion.div>
                                </Link>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-20 text-center bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-100 dark:border-oxford-800">
                            <div className="w-16 h-16 bg-oxford-50 dark:bg-oxford-950 text-oxford-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Video size={32} />
                            </div>
                            <h3 className="text-xl font-serif text-oxford-900 dark:text-white mb-2">Tidak Ada Webinar Ditemukan</h3>
                            <p className="text-oxford-600 dark:text-oxford-300 max-w-md mx-auto">Kami tidak menemukan acara yang cocok dengan pencarian Anda. Silakan coba kata kunci lain.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
