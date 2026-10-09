"use client";

import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { createWebinar } from "@/app/actions/webinars";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Video, ArrowLeft, Save, RefreshCw, Award } from "lucide-react";
import WebinarFileUpload from "@/components/WebinarFileUpload";

export default function NewWebinarPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        thumbnailUrl: "",
        meetingLink: "",
        materialUrl: "",
        virtualBackgroundUrl: "",
        youtubeUrl: "",
        isAttendanceOpen: false,
        scheduledAt: "",
        attendanceCode: "",
        status: "draft" as "draft" | "published" | "completed",
        certificateEnabled: true,
        certificateAutoIssue: true,
        certificateTemplateType: "sertifikat" as "sertifikat" | "surat_keterangan" | "sttp",
        certificateNumberPrefix: "AKJ-26",
        certificateStartNumber: "",
        certificateJp: 2,
    });

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'CRPK-';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, attendanceCode: result }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await createWebinar({
                ...formData,
                certificateStartNumber: formData.certificateStartNumber ? parseInt(formData.certificateStartNumber) : null,
                scheduledAt: new Date(formData.scheduledAt).toISOString()
            });
            if (res.success) {
                router.push('/admin/webinars');
            } else {
                alert("Gagal membuat webinar: " + res.error);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex">
            <AdminSidebar activePage="webinars" />
            
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Link href="/admin/webinars" className="w-10 h-10 rounded-full bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 flex items-center justify-center text-oxford-600 dark:text-oxford-300 hover:bg-oxford-50 dark:hover:bg-oxford-950 transition-colors shadow-sm">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-oxford-900 dark:text-white flex items-center gap-3">
                                <Video className="text-gold-500" size={32} />
                                Buat Webinar Baru
                            </h1>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 p-8 space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-semibold text-oxford-900 dark:text-white mb-2">Judul Webinar *</label>
                                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50" placeholder="Masukkan judul acara..." />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-semibold text-oxford-900 dark:text-white mb-2">Deskripsi Acara *</label>
                                <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50" placeholder="Deskripsikan webinar ini..." />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-oxford-900 dark:text-white mb-2">Jadwal Acara *</label>
                                <input required type="datetime-local" value={formData.scheduledAt} onChange={e => setFormData({...formData, scheduledAt: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-oxford-900 dark:text-white mb-2">Status Publikasi</label>
                                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as typeof formData.status})} className="w-full px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50">
                                    <option value="draft">Draft (Disembunyikan)</option>
                                    <option value="published">Published (Dibuka untuk Umum)</option>
                                </select>
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <WebinarFileUpload 
                                    label="Poster Acara (Upload)" 
                                    onUploadComplete={(url) => setFormData({...formData, thumbnailUrl: url})}
                                    currentUrl={formData.thumbnailUrl}
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-semibold text-oxford-900 dark:text-white mb-2">Link YouTube (Live Stream / Replay Embed)</label>
                                <input type="url" value={formData.youtubeUrl} onChange={e => setFormData({...formData, youtubeUrl: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50" placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..." />
                                <p className="text-xs text-oxford-500 mt-1">Jika diisi, siaran live YouTube akan otomatis terpasang (embed) di portal publik webinar.</p>
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <div className="flex items-center gap-3 p-4 bg-oxford-50 dark:bg-oxford-950/50 rounded-xl border border-border-base">
                                    <input type="checkbox" id="isAttendanceOpen" checked={formData.isAttendanceOpen} onChange={e => setFormData({...formData, isAttendanceOpen: e.target.checked})} className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500 cursor-pointer" />
                                    <label htmlFor="isAttendanceOpen" className="text-sm font-medium cursor-pointer text-foreground">
                                        <strong>Buka Presensi Live Sekarang</strong> (Peserta dapat langsung mengisi form presensi & SKM)
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-oxford-900 dark:text-white mb-2">Link Meeting (Zoom/Meet)</label>
                                <input type="url" value={formData.meetingLink} onChange={e => setFormData({...formData, meetingLink: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50" placeholder="https://zoom.us/j/..." />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-oxford-900 dark:text-white mb-2">Kode Presensi (Attendance Code)</label>
                                <div className="flex gap-2">
                                    <input type="text" value={formData.attendanceCode} onChange={e => setFormData({...formData, attendanceCode: e.target.value})} className="flex-1 px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50 font-mono" placeholder="KODE-UNIK" />
                                    <button type="button" onClick={generateCode} className="px-4 py-3 bg-oxford-100 dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 hover:bg-oxford-200 dark:hover:bg-oxford-800 hover:text-oxford-900 dark:hover:text-white rounded-xl transition-colors flex items-center justify-center">
                                        <RefreshCw size={20} />
                                    </button>
                                </div>
                                <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-1">Kode ini akan dibagikan ke peserta saat acara berlangsung.</p>
                            </div>

                            <div>
                                <WebinarFileUpload 
                                    label="Bahan Materi (Upload PDF/PPT)" 
                                    onUploadComplete={(url) => setFormData({...formData, materialUrl: url})}
                                    currentUrl={formData.materialUrl}
                                    accept=".pdf,.ppt,.pptx,.doc,.docx"
                                />
                            </div>

                            <div>
                                <WebinarFileUpload 
                                    label="Virtual Background (Upload)" 
                                    onUploadComplete={(url) => setFormData({...formData, virtualBackgroundUrl: url})}
                                    currentUrl={formData.virtualBackgroundUrl}
                                />
                            </div>

                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 space-y-5">
                            <h3 className="flex items-center gap-2 font-bold text-oxford-900"><Award className="text-emerald-600" size={21} /> Sertifikat Otomatis</h3>
                            <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={formData.certificateEnabled} onChange={e => setFormData({...formData, certificateEnabled: e.target.checked})} className="mt-1 h-5 w-5 accent-emerald-600" /><span><strong className="block">Aktifkan sertifikat</strong><span className="text-sm text-oxford-500">Peserta yang hadir dan lulus evaluasi berhak memperoleh sertifikat.</span></span></label>
                            <label className={`flex items-start gap-3 ${formData.certificateEnabled ? 'cursor-pointer' : 'opacity-50'}`}><input type="checkbox" disabled={!formData.certificateEnabled} checked={formData.certificateAutoIssue} onChange={e => setFormData({...formData, certificateAutoIssue: e.target.checked})} className="mt-1 h-5 w-5 accent-emerald-600" /><span><strong className="block">Terbitkan otomatis setelah lulus</strong><span className="text-sm text-oxford-500">Tidak perlu persetujuan admin satu per satu.</span></span></label>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold">Jenis template</label>
                                    <select disabled={!formData.certificateEnabled} value={formData.certificateTemplateType} onChange={e => setFormData({...formData, certificateTemplateType: e.target.value as typeof formData.certificateTemplateType})} className="w-full rounded-xl border border-oxford-200 bg-white px-4 py-3">
                                        <option value="sertifikat">Sertifikat</option>
                                        <option value="surat_keterangan">Surat Keterangan</option>
                                        <option value="sttp">STTP</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold">Awalan nomor (Kode Seri)</label>
                                    <input disabled={!formData.certificateEnabled} maxLength={30} value={formData.certificateNumberPrefix} onChange={e => setFormData({...formData, certificateNumberPrefix: e.target.value.toUpperCase()})} placeholder="AKJ-27" className="w-full rounded-xl border border-oxford-200 bg-white px-4 py-3 font-mono" />
                                    <p className="mt-1 text-xs text-oxford-500">Format: 800.2.5/[No Urut]/BPSDM/{formData.certificateNumberPrefix || 'AKJ-27'}/[Bulan]/[Tahun]</p>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold">Nomor Urut Awal Khusus</label>
                                    <input disabled={!formData.certificateEnabled} type="number" min={1} value={formData.certificateStartNumber} onChange={e => setFormData({...formData, certificateStartNumber: e.target.value})} placeholder="Otomatis (Global)" className="w-full rounded-xl border border-oxford-200 bg-white px-4 py-3 font-mono" />
                                    <p className="mt-1 text-xs text-oxford-500">Kosongkan jika mengikuti register global platform</p>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold">Jam Pelajaran (JP)</label>
                                    <input disabled={!formData.certificateEnabled} type="number" min={1} max={999} value={formData.certificateJp} onChange={e => setFormData({...formData, certificateJp: Number(e.target.value)})} className="w-full rounded-xl border border-oxford-200 bg-white px-4 py-3" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-oxford-100 dark:border-oxford-800 flex justify-end">
                            <button disabled={isSubmitting} type="submit" className="bg-gold-500 hover:bg-gold-600 text-oxford-950 font-medium px-8 py-3 rounded-xl transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
                                <Save size={20} />
                                {isSubmitting ? "Menyimpan..." : "Simpan Webinar"}
                            </button>
                        </div>

                    </form>

                </div>
            </main>
        </div>
    );
}
