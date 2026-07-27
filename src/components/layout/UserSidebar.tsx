"use client";

import Link from "next/link";
import { BookOpen, Trophy, Search, Settings, LogOut, X, Activity, GitBranch } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface UserSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UserSidebar({ isOpen, onClose }: UserSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
    };

    const menuItems = [
        { href: "/dashboard", label: "Kelas Saya", icon: <BookOpen size={20} /> },
        { href: "/dashboard/learning-paths", label: "Learning Paths", icon: <GitBranch size={20} /> },
        { href: "/dashboard/bangkom", label: "Progres Bangkom", icon: <Activity size={20} /> },
        { href: "/dashboard/certificates", label: "Sertifikat", icon: <Trophy size={20} /> },
        { href: "/search", label: "Cari Kelas", icon: <Search size={20} /> },
    ];

    return (
        <>
            <aside className={`fixed lg:sticky top-20 left-0 z-50 lg:z-40 w-64 h-[calc(100vh-5rem)] bg-oxford-950 text-white transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="p-6 border-b border-oxford-800 flex items-center justify-between lg:hidden text-white font-bold text-sm uppercase tracking-widest">
                    <span>Menu Navigasi</span>
                    <button onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 font-sans">
                    {menuItems.map((item) => (
                        <Link 
                            key={item.href}
                            href={item.href} 
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                                pathname === item.href 
                                    ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20' 
                                    : 'text-oxford-300 hover:bg-oxford-900 hover:text-white'
                            }`}
                        >
                            {item.icon} {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-oxford-800 font-sans space-y-2">
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-oxford-300 hover:bg-oxford-900 hover:text-white rounded-xl font-medium transition-colors">
                        <Settings size={20} /> Pengaturan
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-crimson-400 hover:bg-crimson-900/30 hover:text-crimson-300 rounded-xl font-medium transition-colors"
                    >
                        <LogOut size={20} /> Keluar
                    </button>
                </div>
            </aside>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-[65] lg:hidden" onClick={onClose} />
            )}
        </>
    );
}
