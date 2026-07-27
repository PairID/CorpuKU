"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, Info, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotifications, markAsRead } from '@/app/actions/users';
import { Notification } from '@/lib/types';

export function NotificationBell({ userId }: { userId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const data = await getNotifications(userId);
            const normalized: Notification[] = data.map((row) => ({
                id: String(row.id),
                userId: String(row.userId),
                title: String(row.title),
                message: String(row.message),
                type: row.type === "success" || row.type === "warning" || row.type === "error" ? row.type : "info",
                link: row.link ? String(row.link) : undefined,
                isRead: Boolean(row.isRead),
                createdAt: new Date(String(row.createdAt)).toISOString(),
            }));
            setNotifications(normalized);
            setUnreadCount(normalized.filter(notification => !notification.isRead).length);
        } catch (error) {
            console.error("Gagal mengambil notifikasi:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchNotifications();
        // Set up interval to poll for new notifications every minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id: string) => {
        const result = await markAsRead(id);
        if (result.success) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'success': return <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full"><Check size={16} /></div>;
            case 'warning': return <div className="p-2 bg-amber-100 text-amber-600 rounded-full"><AlertTriangle size={16} /></div>;
            case 'error': return <div className="p-2 bg-crimson-100 text-crimson-600 rounded-full"><XCircle size={16} /></div>;
            default: return <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Info size={16} /></div>;
        }
    };

    const formatDate = (date: Date | string) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        
        if (diff < 60000) return 'Baru saja';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-oxford-500 dark:text-oxford-400 hover:text-gold-600 hover:bg-oxford-100 dark:hover:bg-[#161B2A] rounded-full transition-all"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-crimson-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-[#161B2A] rounded-2xl shadow-2xl border border-oxford-100 dark:border-oxford-800 overflow-hidden z-50 overflow-hidden"
                    >
                        <div className="p-4 bg-white dark:bg-[#161B2A] border-b border-oxford-100 dark:border-oxford-800 flex items-center justify-between">
                            <h3 className="font-sans font-bold text-oxford-900 dark:text-white">Notifikasi</h3>
                            <span className="text-[10px] font-bold uppercase bg-oxford-100 dark:bg-[#161B2A] text-oxford-500 dark:text-oxford-400 px-2.5 py-1 rounded-full">{unreadCount} Belum dibaca</span>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto bg-oxford-50 dark:bg-oxford-950/30">
                            {isLoading && notifications.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                    <p className="text-oxford-400 text-sm italic">Memasukkan data...</p>
                                </div>
                            ) : notifications.length > 0 ? (
                                <div className="divide-y divide-oxford-100">
                                    {notifications.map((notif) => (
                                        <div 
                                            key={notif.id}
                                            onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                                            className={`p-4 flex items-start gap-4 transition-colors cursor-pointer ${notif.isRead ? 'opacity-70 bg-transparent' : 'bg-white dark:bg-[#161B2A] hover:bg-gold-50/30'}`}
                                        >
                                            <div className="shrink-0 mt-1">
                                                {getTypeIcon(notif.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <h4 className={`text-sm font-bold ${notif.isRead ? 'text-oxford-600 dark:text-oxford-300' : 'text-oxford-900 dark:text-white'}`}>{notif.title}</h4>
                                                    {!notif.isRead && <div className="w-2 h-2 bg-gold-500 rounded-full shadow-sm" />}
                                                </div>
                                                <p className="text-xs text-oxford-600 dark:text-oxford-300 line-clamp-2 mb-2 leading-relaxed">{notif.message}</p>
                                                <div className="flex items-center gap-1.5 text-[10px] text-oxford-400 font-medium">
                                                    <Clock size={10} />
                                                    {formatDate(notif.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center">
                                    <Bell size={40} className="mx-auto text-oxford-200 mb-3 opacity-50" />
                                    <p className="text-oxford-400 text-sm">Belum ada notifikasi.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-white dark:bg-[#161B2A] border-t border-oxford-100 dark:border-oxford-800 text-center">
                            <button 
                                onClick={fetchNotifications}
                                className="text-xs font-bold text-gold-600 hover:text-gold-700 transition-colors py-1 px-4"
                            >
                                Perbarui
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
