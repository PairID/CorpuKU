"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, BookOpen, Trophy, Clock, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { getUserGamification } from "@/app/actions/gamification";
import { Star, Crown, Zap } from "lucide-react";
import { UserSidebar } from "@/components/layout/UserSidebar";

interface EnrolledCourse {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    enrolledAt: string;
    progress?: number;
    status?: 'in_progress' | 'completed';
    provider?: string;
}

export interface UserSession {
    user: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
        role?: "student" | "instructor" | "admin";
        instansiAsal?: string;
    };
}

export default function DashboardClient({
    enrollments,
    session
}: {
    enrollments: EnrolledCourse[],
    session: UserSession
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    type Badge = { id: string; name: string; description: string; icon?: string };
    const [gamification, setGamification] = useState<{ points: number; badges: Badge[] }>({ points: 0, badges: [] });
    useEffect(() => {
        const fetchGamification = async (uid: string) => {
            const data = await getUserGamification(uid);
            setGamification(data);
        };
        if (session.user.id) fetchGamification(session.user.id);
    }, [session.user.id]);

    // Filter enrollments based on actual user
    const filteredEnrollments = enrollments;

    const displayUser = session.user;

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex">

            {/* SIDEBAR */}
            <UserSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen relative">
                {/* Mobile sidebar toggle button (floating) */}
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gold-500 text-oxford-950 rounded-full shadow-2xl hover:bg-gold-400 transition-all active:scale-95"
                >
                    <Menu size={24} />
                </button>

                {/* Dashboard Content */}
                <div className="p-6 md:p-8 lg:p-12 max-w-7xl mx-auto w-full">

                    <div className="mb-10">
                        <h2 className="text-3xl font-sans font-bold text-oxford-900 dark:text-white mb-2">Selamat datang kembali, {(displayUser.name || 'User').split(' ')[0]}!</h2>
                        <p className="text-oxford-600 dark:text-oxford-300 font-sans">Lanjutkan progres belajar Anda hari ini.</p>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-oxford-100 dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 rounded-full flex items-center justify-center">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <p className="text-3xl font-sans font-bold text-oxford-900 dark:text-white leading-tight">{filteredEnrollments.length}</p>
                                <p className="text-sm font-sans text-oxford-500 dark:text-oxford-400">Kelas Diikuti</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-gold-50 text-gold-600 rounded-full flex items-center justify-center">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <p className="text-3xl font-sans font-bold text-oxford-900 dark:text-white leading-tight">
                                    {filteredEnrollments.filter(e => e.status === 'completed').length}
                                </p>
                                <p className="text-sm font-sans text-oxford-500 dark:text-oxford-400">Kelas Selesai</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-crimson-50 text-crimson-600 rounded-full flex items-center justify-center">
                                <Trophy size={24} />
                            </div>
                            <div>
                                <p className="text-3xl font-sans font-bold text-oxford-900 dark:text-white leading-tight">
                                    {filteredEnrollments.filter(e => e.status === 'completed').length}
                                </p>
                                <p className="text-sm font-sans text-oxford-500 dark:text-oxford-400">Sertifikat</p>
                            </div>
                        </div>
                        <div className="bg-oxford-900 p-6 rounded-2xl border border-oxford-800 shadow-md flex items-center gap-4 group hover:bg-oxford-800 transition-colors">
                            <div className="w-12 h-12 bg-gold-500 text-oxford-900 dark:text-white rounded-full flex items-center justify-center shadow-lg shadow-gold-500/20">
                                <Star size={24} fill="currentColor" />
                            </div>
                            <div>
                                <p className="text-3xl font-sans font-bold text-gold-500 leading-tight">{gamification.points}</p>
                                <p className="text-sm font-sans text-oxford-400">Poin Belajar</p>
                            </div>
                        </div>
                    </div>

                    {/* Course List */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-sans font-bold text-oxford-900 dark:text-white">Kelas Saya</h3>
                        </div>

                        <div className="space-y-6">
                            {filteredEnrollments.length > 0 ? (
                                filteredEnrollments.map(course => (
                                    <div key={course.id} className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-6 lg:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center hover:border-gold-400 hover:shadow-md transition-all group">
                                        
                                        {/* Left/Middle wrapped in Link for easy clicking */}
                                        <Link href={`/learn/${course.id}`} className="flex flex-col md:flex-row gap-8 flex-1 w-full">
                                            {/* Left: Thumbnail placeholder */}
                                            <div className="w-full md:w-64 aspect-video bg-oxford-100 dark:bg-[#161B2A] rounded-xl shrink-0 flex items-center justify-center relative overflow-hidden">
                                                {course.thumbnailUrl ? (
                                                    <Image src={course.thumbnailUrl} alt={course.title} fill sizes="(min-width: 768px) 256px, 100vw" unoptimized className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="absolute inset-0 bg-mesh opacity-30 group-hover:scale-105 transition-transform duration-500" />
                                                )}
                                                {course.status === 'completed' && (
                                                    <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10 flex items-center gap-1">
                                                        <CheckCircle size={12} /> Selesai
                                                    </div>
                                                )}
                                            </div>

                                            {/* Middle: Info */}
                                            <div className="flex-1 w-full font-sans">
                                                <p className="text-xs font-bold text-oxford-500 dark:text-oxford-400 uppercase tracking-widest mb-1">{course.provider || "CorpuKU Academy"}</p>
                                                <h4 className="text-xl font-bold text-oxford-900 dark:text-white mb-4 group-hover:text-gold-600 transition-colors">{course.title}</h4>

                                                <div className="flex flex-wrap items-center gap-4 text-sm text-oxford-600 dark:text-oxford-300 mb-6">
                                                    <span className="flex items-center gap-1.5"><Clock size={16} className="text-oxford-400" /> Terdaftar pada: {new Date(course.enrolledAt).toLocaleDateString('id-ID')}</span>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="w-full">
                                                    <div className="flex justify-between text-sm mb-2 font-medium">
                                                        <span className={(course.progress || 0) === 100 ? "text-green-600" : "text-oxford-700 dark:text-oxford-200"}>{course.progress || 0}% Selesai</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-oxford-100 dark:bg-[#161B2A] rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${(course.progress || 0) === 100 ? 'bg-green-500' : 'bg-gold-500'}`}
                                                            style={{ width: `${course.progress || 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>

                                        {/* Right: CTA */}
                                        <div className="w-full md:w-auto shrink-0 flex flex-col gap-3">
                                            <Link href={`/dashboard/courses/${course.id}/progress`} className="w-full md:w-40 py-3 px-6 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-200 text-center font-sans font-bold rounded-full hover:border-gold-400 hover:text-gold-600 transition-colors">
                                                Progress &amp; Nilai
                                            </Link>
                                            {course.status === 'completed' ? (
                                                <Link href={`/dashboard/certificates/${course.id}`} className="w-full md:w-40 py-3 px-6 bg-white dark:bg-[#161B2A] border border-oxford-300 dark:border-oxford-600 text-oxford-700 dark:text-oxford-200 text-center font-sans font-bold rounded-full hover:bg-oxford-50 dark:hover:bg-oxford-950 transition-colors">
                                                    Lihat Sertifikat
                                                </Link>
                                            ) : (
                                                <Link href={`/learn/${course.id}`} className="w-full md:w-40 py-3 px-6 bg-oxford-900 text-white text-center font-sans font-bold rounded-full hover:bg-gold-500 hover:text-oxford-950 transition-colors">
                                                    Lanjutkan
                                                </Link>
                                            )}
                                        </div>

                                    </div>
                                ))
                            ) : (
                                <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 border-dashed p-12 text-center">
                                    <BookOpen size={48} className="mx-auto text-oxford-200 mb-4" />
                                    <h4 className="text-lg font-sans font-bold text-oxford-900 dark:text-white mb-2">Belum ada kelas</h4>
                                    <p className="text-oxford-600 dark:text-oxford-300 mb-6">Anda belum mendaftar di kelas manapun.</p>
                                    <Link href="/search" className="inline-block py-3 px-8 bg-gold-500 text-oxford-950 font-bold rounded-full hover:bg-gold-400 transition-all">
                                        Cari Kelas Sekarang
                                    </Link>
                                </div>
                            )}
                        </div>

                    {/* Badges Section */}
                    <div className="mt-16">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-sans font-bold text-oxford-900 dark:text-white">Achievement Badges</h3>
                                <p className="text-sm text-oxford-500 dark:text-oxford-400 mt-1">Lencana yang Anda peroleh dari aktivitas belajar.</p>
                            </div>
                        </div>

                        {gamification.badges.length > 0 ? (
                            <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
                                {gamification.badges.map((badge) => (
                                    <div key={badge.id} className="bg-white dark:bg-[#161B2A] p-6 rounded-3xl border border-oxford-100 dark:border-oxford-800 shadow-sm flex flex-col items-center text-center group hover:shadow-xl hover:shadow-oxford-200/50 hover:translate-y-[-4px] transition-all duration-300">
                                        <div className="w-16 h-16 bg-gradient-to-br from-gold-400 to-gold-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-gold-500/20 group-hover:scale-110 transition-transform">
                                            {badge.icon === 'Zap' && <Zap size={32} />}
                                            {badge.icon === 'Trophy' && <Trophy size={32} />}
                                            {badge.icon === 'Star' && <Star size={32} fill="currentColor" />}
                                            {badge.icon === 'Crown' && <Crown size={32} />}
                                        </div>
                                        <h4 className="font-bold text-oxford-900 dark:text-white text-sm mb-1">{badge.name}</h4>
                                        <p className="text-[10px] text-oxford-400 leading-tight">{badge.description}</p>
                                        <p className="mt-3 text-[9px] font-bold text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full uppercase tracking-wider italic">Unlocked</p>
                                    </div>
                                ))}

                                {/* Locked Badges Hint */}
                                <div className="bg-oxford-50 dark:bg-oxford-950/50 p-6 rounded-3xl border border-dashed border-oxford-200 dark:border-oxford-700 flex flex-col items-center justify-center text-center opacity-70 grayscale">
                                    <div className="w-12 h-12 bg-oxford-200 dark:bg-oxford-800 text-oxford-400 rounded-full flex items-center justify-center mb-3">
                                        <Star size={24} />
                                    </div>
                                    <p className="text-[10px] font-medium text-oxford-400">Badge Berikutnya Menanti Anda...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 border-dashed p-12 text-center">
                                <Trophy size={40} className="mx-auto text-oxford-200 mb-3" />
                                <h4 className="text-lg font-sans font-medium text-oxford-500 dark:text-oxford-400">Belum Ada Lencana</h4>
                                <p className="text-xs text-oxford-400">Selesaikan materi untuk mendapatkan lencana pertama Anda!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            </main>

        </div>
    );
}
