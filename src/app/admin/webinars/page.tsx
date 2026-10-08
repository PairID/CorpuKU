import { getAdminWebinars } from "@/app/actions/webinars";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import Link from "next/link";
import { Video, Plus, Edit, Calendar, Award, Eye } from "lucide-react";
import { AttendanceToggleButton, DeleteWebinarButton } from "./admin-webinar-controls";

export const dynamic = "force-dynamic";

export default async function AdminWebinarsPage() {
    const webinars = await getAdminWebinars();

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex">
            <AdminSidebar activePage="webinars" />
            
            <main className="flex-1 p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-oxford-900 dark:text-white flex items-center gap-3">
                                <Video className="text-gold-500" size={32} />
                                Manajemen Webinar
                            </h1>
                            <p className="text-oxford-600 dark:text-oxford-300 mt-2">Kelola daftar acara webinar, presensi, dan materi.</p>
                        </div>
                        <Link 
                            href="/admin/webinars/new"
                            className="bg-gold-500 hover:bg-gold-600 text-oxford-950 font-medium px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <Plus size={20} />
                            Buat Webinar
                        </Link>
                    </div>

                    <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-oxford-50 dark:bg-oxford-950 border-b border-oxford-100 dark:border-oxford-800">
                                        <th className="p-4 font-sans font-semibold text-oxford-800 dark:text-oxford-100">Judul Webinar</th>
                                        <th className="p-4 font-sans font-semibold text-oxford-800 dark:text-oxford-100">Jadwal</th>
                                        <th className="p-4 font-sans font-semibold text-oxford-800 dark:text-oxford-100">Status</th>
                                        <th className="p-4 font-sans font-semibold text-oxford-800 dark:text-oxford-100">Presensi Live</th>
                                        <th className="p-4 font-sans font-semibold text-oxford-800 dark:text-oxford-100">Hadir</th>
                                        <th className="p-4 font-sans font-semibold text-oxford-800 dark:text-oxford-100 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {webinars.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-oxford-500 dark:text-oxford-400">
                                                Belum ada webinar yang dibuat.
                                            </td>
                                        </tr>
                                    ) : webinars.map((webinar) => (
                                        <tr key={webinar.id} className="border-b border-oxford-50 dark:border-oxford-900 hover:bg-oxford-50 dark:hover:bg-oxford-950/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-serif font-medium text-oxford-900 dark:text-white line-clamp-1">{webinar.title}</div>
                                                {webinar.youtubeUrl && (
                                                    <span className="text-[11px] text-crimson-600 font-medium">YouTube Terhubung</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-sm text-oxford-700 dark:text-oxford-200">
                                                    <Calendar size={14} className="text-gold-600" />
                                                    {new Date(webinar.scheduledAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                                                    webinar.status === 'published' ? 'bg-green-100 text-green-700' :
                                                    webinar.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {webinar.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <AttendanceToggleButton
                                                    webinarId={webinar.id}
                                                    isAttendanceOpen={Boolean(webinar.isAttendanceOpen)}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm font-bold text-foreground">
                                                    {webinar.attendanceCount || 0}
                                                </span>
                                                <span className="text-xs text-oxford-400 ml-1">peserta</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link href={`/webinars/${webinar.id}`} target="_blank" className="p-2 text-oxford-500 dark:text-oxford-400 hover:text-gold-600 hover:bg-oxford-100 dark:hover:bg-[#161B2A] rounded-lg transition-colors" title="Lihat Portal Publik">
                                                        <Eye size={18} />
                                                    </Link>
                                                    <Link href={`/admin/webinars/${webinar.id}`} className="p-2 text-oxford-500 dark:text-oxford-400 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors" title="Edit">
                                                        <Edit size={18} />
                                                    </Link>
                                                    <Link href={`/admin/webinars/${webinar.id}/certificates`} className="p-2 text-oxford-500 dark:text-oxford-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Kelola Sertifikat">
                                                        <Award size={18} />
                                                    </Link>
                                                    <DeleteWebinarButton
                                                        webinarId={webinar.id}
                                                        webinarTitle={webinar.title}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
