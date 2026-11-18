"use client";

import Link from 'next/link';
import Image from 'next/image';
import { 
    Search, Menu, BookOpen, LayoutDashboard, X, LogOut, Shield,
    Compass, Video, GitBranch, FileText, Newspaper, Trophy,
    Activity, Settings, Sparkles, Database, Users, Heart, Image as ImageIcon
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { globalSearch, GlobalSearchResult } from '@/app/actions/global-search';
import { NotificationBell } from './NotificationBell';
import { authClient } from "@/lib/auth-client";
import ThemeToggle from '../ThemeToggle';
import type { AuthUser } from '@/lib/session';

export function Header() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<GlobalSearchResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // Only hide header on focus-intensive pages like the course player
    const hideOnPaths = ['/learn'];
    const shouldHide = hideOnPaths.some(p => pathname.startsWith(p));

    useEffect(() => {
        let active = true;
        authClient.getSession()
            .then((resolvedUser) => {
                if (active) {
                    setUser(resolvedUser);
                    setIsLoaded(true);
                }
            })
            .catch(() => {
                if (active) {
                    setUser(null);
                    setIsLoaded(true);
                }
            });
        return () => { active = false; };
    }, [pathname]);

    // Intelligent Instant Search Logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                const results = await globalSearch(searchQuery);
                setSuggestions(results);
                setIsSearching(false);
                setShowSuggestions(true);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Close suggestions and mobile menu on route change
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setShowSuggestions(false);
            setSearchQuery("");
            setMobileMenuOpen(false);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [pathname]);

    if (shouldHide) return null;

    const handleLogout = async () => {
        await authClient.signOut();
        setUser(null);
        setMobileMenuOpen(false);
        router.push("/");
        router.refresh();
    };

    const getDashboardLink = () => {
        if (!user) return "/dashboard";
        if (user.role === "admin") return "/admin";
        if (user.role === "instructor") return "/instructor";
        return "/dashboard";
    };

    const getDashboardLabel = () => {
        if (!user) return "Dashboard";
        if (user.role === "admin") return "Panel Admin";
        if (user.role === "instructor") return "Panel Instruktur";
        return "Kelas Saya";
    };

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setShowSuggestions(false);
        }
    };

    const handleSelectSuggestion = (url: string) => {
        router.push(url);
        setShowSuggestions(false);
        setSearchQuery("");
    };

    const isItemActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname === href || pathname.startsWith(href + "/");
    };

    // Navigasi Utama (Menu Atas)
    const topNavItems = [
        { href: "/search", label: "Kursus", icon: <Compass size={18} /> },
        { href: "/webinars", label: "Webinar", icon: <Video size={18} /> },
        { href: "/paths", label: "Learning Paths", icon: <GitBranch size={18} /> },
        { href: "/knowledge", label: "Pusat Pengetahuan", icon: <FileText size={18} /> },
        { href: "/news", label: "Berita & Pers", icon: <Newspaper size={18} /> },
    ];

    // Navigasi Side Bar Siswa
    const studentSidebarItems = [
        { href: "/dashboard", label: "Kelas Saya", icon: <BookOpen size={18} /> },
        { href: "/dashboard/learning-paths", label: "Learning Paths", icon: <GitBranch size={18} /> },
        { href: "/dashboard/bangkom", label: "Progres Bangkom", icon: <Activity size={18} /> },
        { href: "/dashboard/certificates", label: "Sertifikat", icon: <Trophy size={18} /> },
        { href: "/search", label: "Cari Kelas", icon: <Search size={18} /> },
    ];

    // Navigasi Side Bar Admin
    const adminSidebarItems = [
        { href: "/admin", label: "Dashboard Admin", icon: <LayoutDashboard size={18} /> },
        { href: "/admin/courses", label: "Kursus", icon: <BookOpen size={18} /> },
        { href: "/admin/courses/creator", label: "Course Creator (AI)", icon: <Sparkles size={18} className="text-gold-400" /> },
        { href: "/admin/regulations", label: "Bank Data Regulasi", icon: <Database size={18} className="text-cyan-400" /> },
        { href: "/admin/webinars", label: "Webinar", icon: <Video size={18} /> },
        { href: "/admin/learning-paths", label: "Learning Paths", icon: <GitBranch size={18} /> },
        { href: "/admin/users", label: "Pengguna", icon: <Users size={18} /> },
        { href: "/admin/bangkom", label: "Lacak Bangkom", icon: <Activity size={18} /> },
        { href: "/admin/analytics", label: "Analitik", icon: <Activity size={18} /> },
        { href: "/admin/certificates", label: "Sertifikat", icon: <Heart size={18} /> },
        { href: "/admin/media", label: "Galeri Media", icon: <ImageIcon size={18} /> },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border-base bg-background/95 backdrop-blur-md">
            <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                {/* Logo Area */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-10 h-10 bg-gold-500 text-oxford-950 rounded-lg flex items-center justify-center group-hover:bg-gold-400 transition-colors">
                        <BookOpen size={24} />
                    </div>
                    <span className="font-serif text-2xl font-bold text-foreground tracking-tight">
                        CorpuKU <span className="font-sans text-gold-500 font-medium text-xl">Academy</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-3 lg:gap-4">
                    <Link href="/search" className="text-sm lg:text-base font-sans font-medium text-foreground hover:text-gold-500 transition-colors whitespace-nowrap">
                        Kursus
                    </Link>
                    <Link href="/webinars" className="text-sm lg:text-base font-sans font-medium text-foreground hover:text-gold-500 transition-colors whitespace-nowrap">
                        Webinar
                    </Link>
                    <Link href="/paths" className="text-sm lg:text-base font-sans font-medium text-foreground hover:text-gold-500 transition-colors whitespace-nowrap">
                        Learning Paths
                    </Link>
                    <Link href="/knowledge" className="text-sm lg:text-base font-sans font-medium text-foreground hover:text-gold-500 transition-colors whitespace-nowrap">
                        Pusat Pengetahuan
                    </Link>
                    <Link href="/news" className="text-sm lg:text-base font-sans font-medium text-foreground hover:text-gold-500 transition-colors whitespace-nowrap">
                        Berita & Pers
                    </Link>
                </nav>

                {/* Actions Area */}
                <div className="flex items-center gap-4">
                    {/* Search Field */}
                    <div className="relative hidden sm:block">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-oxford-400 group-focus-within:text-gold-500 transition-colors" size={18} />
                            <input 
                                type="text"
                                placeholder="Cari materi..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearch}
                                onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                                className="w-32 lg:w-48 pl-10 pr-4 py-2 text-sm bg-oxford-100 dark:bg-[#161B2A] border-transparent focus:bg-white dark:focus:bg-[#161B2A] focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 rounded-full transition-all outline-none font-sans"
                            />
                        </div>

                        {/* Search Suggestions */}
                        <AnimatePresence>
                            {showSuggestions && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full mt-3 right-0 w-[400px] bg-white dark:bg-[#161B2A] rounded-2xl shadow-2xl border border-oxford-100 dark:border-oxford-800 overflow-hidden z-50"
                                >
                                    <div className="p-3 bg-oxford-50 dark:bg-oxford-950 border-b border-oxford-100 dark:border-oxford-800 flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-oxford-500 dark:text-oxford-400">Hasil Pencarian</span>
                                        <button onClick={() => setShowSuggestions(false)} className="text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-300">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto">
                                        {isSearching ? (
                                             <div className="p-8 text-center">
                                                <div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                                <p className="text-oxford-400 text-sm">Mencari hasil terbaik...</p>
                                            </div>
                                        ) : suggestions.length > 0 ? (
                                            <div className="divide-y divide-oxford-50">
                                                {suggestions.map((result) => (
                                                    <button 
                                                        key={`${result.type}-${result.id}`}
                                                        onClick={() => handleSelectSuggestion(result.url)}
                                                        className="w-full p-4 flex items-start gap-4 hover:bg-gold-50/50 transition-colors text-left group"
                                                    >
                                                        {result.imageUrl ? (
                                                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-oxford-100 dark:border-oxford-800">
                                                                <Image src={result.imageUrl} alt={result.title} width={64} height={64} unoptimized className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-16 h-16 rounded-xl bg-oxford-100 dark:bg-[#161B2A] flex items-center justify-center shrink-0">
                                                                <BookOpen size={24} className="text-oxford-400" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
                                                                    result.type === 'course' ? 'bg-blue-100 text-blue-700' : 
                                                                    result.type === 'news' ? 'bg-amber-100 text-amber-700' : 
                                                                    result.type === 'webinar' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                                                                 }`}>
                                                                     {result.type === 'course' ? 'Kursus' : result.type === 'news' ? 'Berita' : result.type === 'webinar' ? 'Webinar' : result.type === 'path' ? 'Learning Path' : 'Pengetahuan'}
                                                                </span>
                                                                <span className="text-xs text-oxford-400 font-bold uppercase">{result.category}</span>
                                                            </div>
                                                            <h4 className="text-base font-bold text-oxford-900 dark:text-white group-hover:text-gold-600 transition-colors line-clamp-1">
                                                                {result.title}
                                                            </h4>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-oxford-400 text-base">Tidak ada hasil ditemukan.</div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Auth Area */}
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        {isLoaded && user && (
                            <div className="mr-1">
                                <NotificationBell userId={user.id} />
                            </div>
                        )}
                        {isLoaded && user ? (
                            <div className="flex items-center gap-2 md:gap-3">
                                <Link 
                                    href={getDashboardLink()} 
                                    className="hidden sm:flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-sans font-semibold bg-oxford-100 dark:bg-[#161B2A] text-foreground rounded-full hover:bg-oxford-200 dark:hover:bg-oxford-800 transition-all border border-border-base hover:border-gold-500/50 max-w-[150px] md:max-w-[220px]"
                                >
                                    <div className="shrink-0">
                                        {user.role === "admin" ? (
                                            <Shield size={16} className="text-crimson-400 md:w-4.5 md:h-4.5" />
                                        ) : (
                                            <LayoutDashboard size={16} className="text-gold-500 md:w-4.5 md:h-4.5" />
                                        )}
                                    </div>
                                    <div className="flex flex-col items-start min-w-0">
                                        <span className="truncate w-full leading-tight font-bold">{user.name}</span>
                                        <span className="text-xs uppercase text-oxford-400 font-bold tracking-wider">{getDashboardLabel()}</span>
                                    </div>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="hidden sm:flex p-2 md:p-2.5 text-oxford-400 hover:text-crimson-400 hover:bg-oxford-100 dark:hover:bg-[#161B2A] rounded-full transition-all shrink-0"
                                    title="Logout"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        ) : isLoaded ? (
                            <div className="flex items-center gap-2">
                                <Link href="/login" className="px-4 md:px-5 py-2 md:py-2.5 text-sm font-sans font-semibold text-oxford-600 dark:text-oxford-300 hover:text-gold-600 transition-colors">
                                    Masuk
                                </Link>
                                <Link href="/register" className="px-5 md:px-6 py-2 md:py-2.5 text-sm font-sans font-bold bg-oxford-900 text-white rounded-full hover:bg-gold-500 hover:text-oxford-950 transition-all shadow-md">
                                    Daftar
                                </Link>
                            </div>
                        ) : null}

                        {/* Mobile Menu Button (Unified Navigation Toggle with Highlight state) */}
                        <button
                            aria-label="Toggle Menu Navigasi"
                            className={`md:hidden flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 border ${
                                mobileMenuOpen
                                    ? "bg-gold-500 text-oxford-950 border-gold-400 shadow-md ring-2 ring-gold-400/50 scale-105"
                                    : "text-oxford-600 dark:text-oxford-300 border-transparent hover:bg-oxford-100 dark:hover:bg-oxford-800 hover:text-gold-500"
                            }`}
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X size={26} className="stroke-[2.5]" /> : <Menu size={26} className="stroke-[2.5]" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Unified Mobile Menu Overlay (Menu Atas + Side Bar Bersamaan) */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="md:hidden bg-white dark:bg-[#111624] border-t border-border-base shadow-2xl max-h-[calc(100vh-5rem)] overflow-y-auto"
                    >
                        <div className="p-4 sm:p-6 space-y-6">

                            {/* User Profile Card (if logged in) */}
                            {user && (
                                <div className="p-3.5 bg-oxford-50 dark:bg-oxford-950/80 rounded-2xl border border-oxford-200 dark:border-oxford-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center font-bold text-sm shrink-0 border border-gold-500/30">
                                            {(user.name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-oxford-900 dark:text-white truncate">{user.name}</p>
                                            <p className="text-xs text-oxford-500 dark:text-oxford-400 font-medium">
                                                {user.role === 'admin' ? 'Administrator' : user.role === 'instructor' ? 'Instruktur' : 'Peserta Pembelajaran'}
                                            </p>
                                        </div>
                                    </div>
                                    <Link 
                                        href="/settings"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="p-2 text-oxford-400 hover:text-gold-500 hover:bg-oxford-100 dark:hover:bg-oxford-800 rounded-lg transition-colors"
                                        title="Pengaturan Akun"
                                    >
                                        <Settings size={18} />
                                    </Link>
                                </div>
                            )}

                            {/* BAGIAN 1: SIDE BAR (MENU PENGGUNA / ADMIN) */}
                            {user && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2.5 px-1">
                                        <span className="text-xs font-bold uppercase tracking-widest text-gold-600 dark:text-gold-400">
                                            {user.role === 'admin' ? 'Side Bar Admin' : 'Side Bar Belajar'}
                                        </span>
                                        <div className="flex-1 h-px bg-oxford-200 dark:bg-oxford-800" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-sans">
                                        {(user.role === 'admin' ? adminSidebarItems : studentSidebarItems).map((item) => {
                                            const active = isItemActive(item.href);
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                                                        active
                                                            ? 'bg-gold-500/15 text-gold-600 dark:text-gold-400 font-bold border border-gold-500/30 shadow-sm'
                                                            : 'text-oxford-700 dark:text-oxford-200 hover:bg-oxford-50 dark:hover:bg-oxford-900/60 hover:text-gold-500 font-medium border border-transparent'
                                                    }`}
                                                >
                                                    <span className={active ? 'text-gold-500' : 'text-oxford-400'}>
                                                        {item.icon}
                                                    </span>
                                                    <span>{item.label}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* BAGIAN 2: MENU ATAS (NAVIGASI UTAMA) */}
                            <div>
                                <div className="flex items-center gap-2 mb-2.5 px-1">
                                    <span className="text-xs font-bold uppercase tracking-widest text-oxford-500 dark:text-oxford-400">
                                        Menu Navigasi Utama
                                    </span>
                                    <div className="flex-1 h-px bg-oxford-200 dark:bg-oxford-800" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-sans">
                                    {topNavItems.map((item) => {
                                        const active = isItemActive(item.href);
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                                                    active
                                                        ? 'bg-gold-500/15 text-gold-600 dark:text-gold-400 font-bold border border-gold-500/30 shadow-sm'
                                                        : 'text-oxford-700 dark:text-oxford-200 hover:bg-oxford-50 dark:hover:bg-oxford-900/60 hover:text-gold-500 font-medium border border-transparent'
                                                }`}
                                            >
                                                <span className={active ? 'text-gold-500' : 'text-oxford-400'}>
                                                    {item.icon}
                                                </span>
                                                <span>{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Footer Area: Logout atau Login/Register */}
                            {user ? (
                                <div className="pt-2 border-t border-oxford-200 dark:border-oxford-800 flex items-center justify-between gap-3">
                                    <Link
                                        href="/settings"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-oxford-700 dark:text-oxford-300 bg-oxford-100 dark:bg-oxford-900 rounded-xl hover:bg-oxford-200 dark:hover:bg-oxford-800 transition-colors"
                                    >
                                        <Settings size={16} /> Pengaturan
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-crimson-600 dark:text-crimson-400 bg-crimson-50 dark:bg-crimson-950/40 border border-crimson-200 dark:border-crimson-900/40 rounded-xl hover:bg-crimson-100 dark:hover:bg-crimson-900/60 transition-colors"
                                    >
                                        <LogOut size={16} /> Keluar
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-oxford-200 dark:border-oxford-800">
                                    <Link 
                                        href="/login" 
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="w-full py-2.5 text-center text-sm font-bold text-oxford-900 dark:text-white border border-oxford-300 dark:border-oxford-700 rounded-xl hover:bg-oxford-50 dark:hover:bg-oxford-900 transition-colors"
                                    >
                                        Masuk
                                    </Link>
                                    <Link 
                                        href="/register" 
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="w-full py-2.5 text-center text-sm font-bold bg-gold-500 text-oxford-950 rounded-xl hover:bg-gold-400 shadow-md transition-colors"
                                    >
                                        Daftar
                                    </Link>
                                </div>
                            )}

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
