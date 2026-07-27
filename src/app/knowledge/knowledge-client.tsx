"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Upload, FileText, FileArchive, Terminal, Video, Search, Filter, Eye, ThumbsUp, MessageSquare } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toggleKnowledgeLike } from "@/app/actions/knowledge";
import { KNOWLEDGE_CATEGORIES } from "@/lib/constants";
import type { AuthUser } from "@/lib/session";

export interface KnowledgeItem {
    id: string;
    title: string;
    description: string | null;
    category: string;
    tags: string[];
    thumbnailUrl: string | null;
    videoUrl: string | null;
    authorId: string;
    authorName?: string;
    authorInstansi?: string;
    views: number;
    likes: number;
    likedBy: string[];
    privacy: "public" | "internal";
    status: "draft" | "published" | "archived";
    createdAt: string;
    updatedAt: string;
    comments?: unknown[];
}

const getIconForCategory = (category: string) => {
    switch (category.toLowerCase()) {
        case 'regulasi': return <FileText size={48} className="text-oxford-700 dark:text-oxford-200" />;
        case 'sop': return <FileArchive size={48} className="text-gold-500" />;
        case 'panduan': return <FileText size={48} className="text-oxford-900 dark:text-white" />;
        case 'artikel': return <FileText size={48} className="text-crimson-500" />;
        case 'code': return <Terminal size={48} className="text-gold-500" />;
        case 'video': return <Video size={48} className="text-blue-500" />;
        default: return <FileText size={48} className="text-oxford-500 dark:text-oxford-400" />;
    }
};

const CATEGORIES = ["Semua", ...KNOWLEDGE_CATEGORIES];

export default function KnowledgeClient({ 
    items, 
    initialQuery = "", 
    initialCategory = "Semua",
    serverUser
}: { 
    items: KnowledgeItem[],
    initialQuery?: string,
    initialCategory?: string,
    serverUser?: AuthUser | null
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { data: sessionData } = authClient.useSession();
    const user = sessionData?.user || serverUser;
    
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [activeCategory, setActiveCategory] = useState(initialCategory);
    
    // Optimistic UI state for likes
    const [localItems, setLocalItems] = useState(items);

    const updateSearch = useCallback((q: string, cat: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (q) params.set('q', q);
        else params.delete('q');
        
        if (cat && cat !== "Semua") params.set('category', cat);
        else params.delete('category');
        
        router.push(`${pathname}?${params.toString()}`);
    }, [pathname, router, searchParams]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateSearch(searchQuery, activeCategory);
    };

    const handleCategoryClick = (cat: string) => {
        setActiveCategory(cat);
        updateSearch(searchQuery, cat);
    };

    const handleLike = async (e: React.MouseEvent, id: string) => {
        e.preventDefault(); // prevent navigation
        if (!user) {
            alert("Silakan login untuk memberikan like.");
            return;
        }

        const res = await toggleKnowledgeLike(id);
        if (res.success) {
            setLocalItems(prev => prev.map(item => {
                if (item.id === id) {
                    return {
                        ...item,
                        likes: res.likes!,
                        likedBy: res.hasLiked 
                            ? [...item.likedBy, user.id] 
                            : item.likedBy.filter(uid => uid !== user.id)
                    };
                }
                return item;
            }));
        }
    };

    return (
        <div className="bg-oxford-50 dark:bg-oxford-950 min-h-screen pb-24">
            {/* HERO SECTION WITH SEARCH */}
            <div className="bg-oxford-950 text-white pt-24 pb-16 px-4">
                <div className="container mx-auto max-w-5xl text-center">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">
                        CorpuKU <span className="text-gold-400">Knowledge Space</span>
                    </h1>
                    <p className="text-oxford-300 text-lg mb-10 max-w-2xl mx-auto font-sans">
                        Pusat pengetahun terpadu. Temukan regulasi, SOP, jurnal, dan praktik terbaik dari seluruh ASN di lingkungan instansi Anda.
                    </p>

                    <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-400 z-10" size={20} />
                            <input 
                                type="text"
                                placeholder="Cari dokumen, topik, atau kata kunci..."
                                className="w-full bg-white dark:bg-[#161B2A]/10 border border-oxford-700 text-white placeholder:text-oxford-400 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="bg-gold-500 hover:bg-gold-400 text-oxford-950 px-8 py-4 rounded-xl font-bold transition-colors shadow-lg">
                            Cari
                        </button>
                    </form>

                    {!user && (
                        <div className="mt-8 inline-block bg-oxford-900 border border-oxford-800 rounded-lg px-4 py-2 text-sm text-oxford-300">
                            <LockIcon className="inline mr-2" size={14}/>
                            Anda masuk sebagai Tamu. Login untuk mengakses ribuan dokumen Internal.
                        </div>
                    )}
                </div>
            </div>

            <div className="container mx-auto px-4 max-w-6xl mt-8">
                
                {/* ACTIONS & FILTERS ROW */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
                    
                    {/* Category TABS */}
                    <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto hidescrollbar">
                        {CATEGORIES.map(cat => (
                            <button 
                                key={cat}
                                onClick={() => handleCategoryClick(cat)}
                                className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                                    activeCategory === cat 
                                        ? "bg-oxford-900 text-white" 
                                        : "bg-white dark:bg-[#161B2A] text-oxford-600 dark:text-oxford-300 border border-oxford-200 dark:border-oxford-700 hover:bg-oxford-100 dark:hover:bg-[#161B2A]"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="w-full md:w-auto">
                        {user && (
                            <Link href="/knowledge/upload" className="w-full md:w-auto group inline-flex">
                                <div className="bg-white dark:bg-[#161B2A] hover:bg-oxford-900 hover:text-white text-oxford-900 dark:text-white rounded-xl px-6 py-3 transition-colors duration-300 flex items-center justify-center border border-oxford-200 dark:border-oxford-700 group-hover:border-oxford-900 shadow-sm cursor-pointer border-dashed border-2 font-bold w-full">
                                    <Upload size={18} className="mr-2" /> Bagikan Naskah
                                </div>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Grid layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {localItems.map((item, idx) => {
                        const hasLiked = user && item.likedBy.includes(user.id);
                        return (
                        <Link href={`/knowledge/${item.id}`} key={item.id}>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                whileHover={{ y: -4 }}
                                className="group cursor-pointer flex flex-col h-full bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-100 dark:border-oxford-800 hover:border-gold-300 shadow-sm hover:shadow-xl transition-all overflow-hidden relative"
                            >
                                {/* PRIVACY BADGE */}
                                {item.privacy === "internal" && (
                                    <div className="absolute top-4 right-4 z-20 bg-crimson-100 text-crimson-700 text-xs font-bold px-2 py-1 rounded border border-crimson-200 flex items-center gap-1 shadow-sm">
                                        <LockIcon size={12} /> Internal
                                    </div>
                                )}

                                {/* THUMBNAIL AREA */}
                                <div className="h-44 bg-oxford-50 dark:bg-oxford-950 flex items-center justify-center border-b border-oxford-100 dark:border-oxford-800 relative overflow-hidden">
                                    {item.thumbnailUrl ? (
                                        <Image src={item.thumbnailUrl} alt={item.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" unoptimized className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <>
                                            <div className="absolute inset-0 bg-mesh mix-blend-overlay opacity-10" />
                                            <div className="z-10 transform group-hover:scale-110 transition-transform duration-500 drop-shadow-md">
                                                {getIconForCategory(item.category)}
                                            </div>
                                        </>
                                    )}
                                    <div className="absolute bottom-3 left-3 bg-white dark:bg-[#161B2A]/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide text-oxford-900 dark:text-white z-20 shadow-sm border border-white/50">
                                        {item.category}
                                    </div>
                                </div>

                                {/* CONTENT AREA */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex gap-2 mb-3 flex-wrap">
                                        {item.tags.map(tag => (
                                            <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-oxford-500 dark:text-oxford-400 bg-oxford-100 dark:bg-[#161B2A] px-2 py-1 rounded">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                    <h3 className="font-serif font-bold text-lg text-oxford-900 dark:text-white leading-tight mb-2 group-hover:text-gold-600 transition-colors line-clamp-2">
                                        {item.title}
                                    </h3>
                                    <p className="font-sans text-sm text-oxford-500 dark:text-oxford-400 line-clamp-2 mb-4 flex-1">
                                        {item.description || "Tidak ada deskripsi."}
                                    </p>
                                    
                                    {/* FOOTER METADATA */}
                                    <div className="border-t border-oxford-100 dark:border-oxford-800 pt-4 mt-auto">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-oxford-200 dark:bg-oxford-800 flex flex-shrink-0 items-center justify-center text-[10px] font-bold text-oxford-600 dark:text-oxford-300">
                                                    {item.authorName?.charAt(0) || "U"}
                                                </div>
                                                <div className="text-xs">
                                                    <p className="font-bold text-oxford-900 dark:text-white truncate max-w-[120px]">{item.authorName}</p>
                                                    <p className="text-oxford-400 truncate max-w-[120px]">{item.authorInstansi}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ENGAGEMENT */}
                                        <div className="flex items-center justify-between text-xs font-bold text-oxford-400">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Eye size={16} /> {item.views}
                                                </div>
                                                <button 
                                                    onClick={(e) => handleLike(e, item.id)}
                                                    className={`flex items-center gap-1.5 transition-colors z-30 relative ${hasLiked ? 'text-gold-600' : 'hover:text-gold-500'}`}
                                                >
                                                    <ThumbsUp size={16} className={hasLiked ? 'fill-gold-600' : ''} /> {item.likes}
                                                </button>
                                                {item.comments && (
                                                    <div className="flex items-center gap-1.5">
                                                        <MessageSquare size={16} /> {item.comments.length}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    )})}
                </div>

                {localItems.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-[#161B2A] shadow-sm rounded-2xl border border-oxford-200 dark:border-oxford-700 mt-8">
                        <Filter size={64} className="mx-auto text-oxford-200 mb-6" />
                        <h3 className="text-2xl font-serif font-bold text-oxford-900 dark:text-white mb-2">Tidak ditemukan dokumen</h3>
                        <p className="text-oxford-500 dark:text-oxford-400 font-sans max-w-md mx-auto">
                            Coba ubah kata kunci pencarian Anda atau kembalikan kategori ke &quot;Semua&quot;.
                        </p>
                        <button 
                            onClick={() => { setSearchQuery(""); handleCategoryClick("Semua"); }}
                            className="mt-6 font-bold text-gold-600 hover:text-gold-700"
                        >
                            Reset Pencarian
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function LockIcon({className, size}:{className?:string, size?:number}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
    )
}
