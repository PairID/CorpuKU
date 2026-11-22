"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, Users, Activity, Settings, LogOut, Heart, Image as ImageIcon, Video, GitBranch, Sparkles, Database, X } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

interface AdminSidebarProps {
    activePage: "dashboard" | "courses" | "webinars" | "paths" | "users" | "analytics" | "about" | "news" | "certificates" | "media" | "bangkom" | "creator" | "regulations";
    isOpen?: boolean;
    onClose?: () => void;
}

export function AdminSidebar({ activePage, isOpen, onClose }: AdminSidebarProps) {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await authClient.signOut();
        router.push("/");
        router.refresh();
    };

    const menuItems = [
        { 
            href: "/admin", 
            label: "Dashboard", 
            icon: <LayoutDashboard size={20} />, 
            active: activePage === "dashboard" 
        },
        { 
            href: "/admin/courses", 
            label: "Kursus", 
            icon: <BookOpen size={20} />, 
            active: activePage === "courses" 
        },
        { 
            href: "/admin/courses/creator", 
            label: "Course Creator (AI)", 
            icon: <Sparkles size={20} className="text-gold-400" />, 
            active: activePage === "creator" 
        },
        { 
            href: "/admin/regulations", 
            label: "Bank Data Regulasi", 
            icon: <Database size={20} className="text-cyan-400" />, 
            active: activePage === "regulations" 
        },
        { 
            href: "/admin/webinars", 
            label: "Webinar", 
            icon: <Video size={20} />, 
            active: activePage === "webinars" 
        },
        // ponytail: Dinonaktifkan sementara sampai konsep learning path matang
        // {
        //     href: "/admin/learning-paths",
        //     label: "Learning Paths",
        //     icon: <GitBranch size={20} />,
        //     active: activePage === "paths"
        // },
        { 
            href: "/admin/users", 
            label: "Pengguna", 
            icon: <Users size={20} />, 
            active: activePage === "users" 
        },
        { 
            href: "/admin/bangkom", 
            label: "Lacak Bangkom", 
            icon: <Activity size={20} />, 
            active: activePage === "bangkom" 
        },
        { 
            href: "/admin/analytics", 
            label: "Analitik", 
            icon: <Activity size={20} />, 
            active: activePage === "analytics" 
        },
        { 
            href: "/admin/certificates", 
            label: "Sertifikat", 
            icon: <Heart size={20} />, 
            active: activePage === "certificates" 
        },
        { 
            href: "/admin/media", 
            label: "Galeri Media", 
            icon: <ImageIcon size={20} />, 
            active: activePage === "media" 
        },
    ];

    return (
        <>
            {/* MOBILE OVERLAY */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-oxford-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* SIDEBAR COLUMN (Auto Full Height with Sticky Inner Navigation) */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-[#030712] text-white border-r border-white/10 transition-transform duration-300 transform
                lg:translate-x-0 lg:static lg:z-auto lg:self-stretch lg:shrink-0 lg:flex lg:flex-col min-h-screen
                ${isOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                <div className="lg:sticky lg:top-20 flex flex-col h-full lg:h-[calc(100vh-5rem)] overflow-y-auto no-scrollbar">
                    {/* Mobile-only Drawer Header */}
                    <div className="lg:hidden p-5 border-b border-oxford-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gold-500 text-oxford-950 rounded-lg flex items-center justify-center font-bold">
                                <BookOpen size={18} />
                            </div>
                            <span className="font-serif text-lg font-bold tracking-tight">
                                CorpuKU <span className="font-sans text-gold-500 font-medium text-base">Admin</span>
                            </span>
                        </div>
                        <button onClick={onClose} className="p-2 text-oxford-400 hover:text-white rounded-lg hover:bg-oxford-900 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Desktop Subtle Section Tag (Single logo preserved at the top global header) */}
                    <div className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                            <span className="text-[11px] font-bold uppercase tracking-widest text-oxford-400">Panel Administrator</span>
                        </div>
                    </div>

                {/* Main Navigation */}
                <nav className="flex-1 p-4 space-y-2 mt-2">
                    {menuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group ${
                                item.active
                                    ? "bg-gold-500/10 text-gold-400 border border-gold-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                                    : "text-oxford-300 hover:bg-oxford-900 hover:text-white"
                            }`}
                        >
                            <div className={`${item.active ? "text-gold-500" : "text-oxford-400 group-hover:text-gold-400"}`}>
                                {item.icon}
                            </div>
                            {item.label}
                            {item.active && (
                                 <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                            )}
                        </Link>
                    ))}

                    <div className="pt-4 mt-2 border-t border-oxford-800">
                        <p className="px-4 text-xs font-bold text-oxford-500 dark:text-oxford-400 uppercase tracking-widest mb-2">Content Editor</p>
                        <Link 
                            href="/admin/news" 
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group ${
                                activePage === "news"
                                    ? "bg-gold-500/10 text-gold-400 border border-gold-500/20"
                                    : "text-oxford-300 hover:bg-oxford-900 hover:text-white"
                            }`}
                        >
                            <BookOpen size={20} className={activePage === "news" ? "text-gold-500" : "text-oxford-400 group-hover:text-gold-400"} /> 
                            Berita & Pers
                        </Link>
                        <Link 
                            href="/admin/about" 
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group ${
                                activePage === "about"
                                    ? "bg-gold-500/10 text-gold-400 border border-gold-500/20"
                                    : "text-oxford-300 hover:bg-oxford-900 hover:text-white"
                            }`}
                        >
                            <Settings size={20} className={activePage === "about" ? "text-gold-500" : "text-oxford-400 group-hover:text-gold-400"} /> 
                            Editor Profil (About)
                        </Link>
                    </div>
                </nav>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-oxford-800 space-y-2 mt-auto">
                    <Link 
                        href="/settings" 
                        onClick={onClose}
                        className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-all duration-200 group"
                    >
                        <div className="p-1.5 rounded-lg bg-oxford-900 group-hover:bg-oxford-800 transition-colors">
                            <Settings size={16} className="text-oxford-400 group-hover:text-gold-400" />
                        </div>
                        Pengaturan
                    </Link>
                    <button 
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center gap-3 px-4 py-3 text-crimson-400 hover:bg-crimson-900/30 hover:text-crimson-300 rounded-xl font-medium transition-all duration-200 group disabled:opacity-50"
                    >
                        <div className="p-1.5 rounded-lg bg-crimson-900/20 group-hover:bg-crimson-900/40 transition-colors">
                            <LogOut size={16} className="text-crimson-500 group-hover:text-crimson-400" />
                        </div>
                        {isLoggingOut ? "Logging out..." : "Keluar Panel"}
                    </button>
                </div>

                {/* Footer mini */}
                <div className="p-4 text-center mt-auto">
                    <p className="text-xs text-oxford-600 dark:text-oxford-300 font-medium">BPSDM Kaltara &copy; 2026</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                        <span className="text-[10px] text-oxford-700 dark:text-oxford-400 uppercase tracking-tighter">Powered by</span>
                        <span className="text-[10px] text-gold-600/70 font-bold">CorpuKU</span>
                    </div>
                </div>
            </div>
        </aside>
        </>
    );
}
