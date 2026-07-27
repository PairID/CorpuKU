"use client";

import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { updateWebinar } from "@/app/actions/webinars";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Video, ArrowLeft, Save, RefreshCw, Plus, Trash2, PlusCircle, CheckCircle2, Award, ExternalLink } from "lucide-react";
import { Webinar } from "@/lib/types";
import WebinarFileUpload from "@/components/WebinarFileUpload";

export default function EditWebinarClient({ webinar }: { webinar: Webinar }) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Format datetime for datetime-local input
    const formattedDate = webinar.scheduledAt ? new Date(webinar.scheduledAt).toISOString().slice(0, 16) : "";

    const [formData, setFormData] = useState({
        title: webinar.title,
        description: webinar.description,
        thumbnailUrl: webinar.thumbnailUrl || "",
        meetingLink: webinar.meetingLink || "",
        materialUrl: webinar.materialUrl || "",
        virtualBackgroundUrl: webinar.virtualBackgroundUrl || "",
        scheduledAt: formattedDate,
        attendanceCode: webinar.attendanceCode || "",
        status: webinar.status,
        joinWindowMinutes: webinar.joinWindowMinutes || 30,
        certificateEnabled: webinar.certificateEnabled,
        certificateAutoIssue: webinar.certificateAutoIssue,
        certificateTemplateType: webinar.certificateTemplateType,
        certificateNumberPrefix: webinar.certificateNumberPrefix,
        certificateJp: webinar.certificateJp,
        quizSettings: webinar.quizSettings || {
            questions: [
                {
                    id: "q1",
                    question: "Apakah materi yang disampaikan mudah dipahami?",
                    options: ["Sangat Mudah", "Mudah", "Cukup", "Sulit"],
                    correctAnswer: 0
                }
            ]
        }
    });

    const addQuestion = () => {
        const newQuestion = {
            id: `q_${Date.now()}`,
            question: "",
            options: ["", "", "", ""],
            correctAnswer: 0
        };
        setFormData({
            ...formData,
            quizSettings: {
                ...formData.quizSettings,
                questions: [...formData.quizSettings.questions, newQuestion]
            }
        });
    };

    const removeQuestion = (index: number) => {
        const newQuestions = [...formData.quizSettings.questions];
        newQuestions.splice(index, 1);
        setFormData({
            ...formData,
            quizSettings: {
                ...formData.quizSettings,
                questions: newQuestions
            }
        });
    };

    const updateQuestion = (index: number, field: string, value: string | number) => {
        const newQuestions = [...formData.quizSettings.questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setFormData({
            ...formData,
            quizSettings: {
                ...formData.quizSettings,
                questions: newQuestions
            }
        });
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...formData.quizSettings.questions];
        const newOptions = [...newQuestions[qIndex].options];
        newOptions[oIndex] = value;
        newQuestions[qIndex] = { ...newQuestions[qIndex], options: newOptions };
        setFormData({
            ...formData,
            quizSettings: {
                ...formData.quizSettings,
                questions: newQuestions
            }
        });
    };

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
            const res = await updateWebinar(webinar.id, {
                ...formData,
                scheduledAt: new Date(formData.scheduledAt).toISOString()
            });
            if (res.success) {
                router.push('/admin/webinars');
            } else {
                alert("Gagal menyimpan webinar: " + res.error);
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
                                Edit Webinar
                            </h1>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8 pb-20">
                        {/* Informasi Dasar */}
                        <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 p-8 space-y-6">
                            <h3 className="text-lg font-bold text-oxford-900 dark:text-white flex items-center gap-2 border-b border-oxford-50 dark:border-oxford-900 pb-4">
                                <div className="w-2 h-6 bg-gold-500 rounded-full" />
                                Informasi Dasar
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-semibold text-oxford-900 dark:text-white mb-2">Judul Webinar *</label>
                                    <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50" />
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-semibold text-oxford-900 dark:text-white mb-2">Deskripsi Acara *</label>
                                    <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50" />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-oxford-900 dark:text-white mb-2">Jadwal Acara *</label>
                                    <input required type="datetime-local" value={formData.scheduledAt} onChange={e => setFormData({...formData, scheduledAt: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50" />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-oxford-900 dark:text-white mb-2">Status Publikasi</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Webinar['status']})} className="w-full px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50">
                                        <option value="draft">Draft (Disembunyikan)</option>
                                        <option value="published">Published (Dibuka untuk Umum)</option>
                                        <option value="completed">Selesai (Completed)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-oxford-900 dark:text-white mb-2">Akses Link Meeting (Menit Sebelum Acara)</label>
                                    <input type="number" min="0" value={formData.joinWindowMinutes} onChange={e => setFormData({...formData, joinWindowMinutes: parseInt(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50" />
                                    <p className="text-[10px] text-oxford-500 dark:text-oxford-400 mt-1">Contoh: 30 (Link aktif 30 menit sebelum jadwal).</p>
                                </div>
                            </div>
                        </div>

                        {/* Aset & Materi */}
                        <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 p-8 space-y-6">
                            <h3 className="text-lg font-bold text-oxford-900 dark:text-white flex items-center gap-2 border-b border-oxford-50 dark:border-oxford-900 pb-4">
                                <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                                Aset & Materi
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-1 md:col-span-2">
                                    <WebinarFileUpload 
                                        label="Poster Acara (Upload)" 
                                        onUploadComplete={(url) => setFormData({...formData, thumbnailUrl: url})}
                                        currentUrl={formData.thumbnailUrl}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-oxford-900 dark:text-white mb-2">Link Meeting (Zoom/Meet)</label>
                                    <input type="url" value={formData.meetingLink} onChange={e => setFormData({...formData, meetingLink: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50" />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-oxford-900 dark:text-white mb-2">Kode Presensi (Attendance Code)</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={formData.attendanceCode} onChange={e => setFormData({...formData, attendanceCode: e.target.value})} className="flex-1 px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50 font-mono" />
                                        <button type="button" onClick={generateCode} className="px-4 py-3 bg-oxford-100 dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 hover:bg-oxford-200 dark:hover:bg-oxford-800 hover:text-oxford-900 dark:hover:text-white rounded-xl transition-colors flex items-center justify-center">
                                            <RefreshCw size={20} />
                                        </button>
                                    </div>
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
                        </div>

                        {/* Otomasi Sertifikat */}
                        <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-900 p-8 space-y-6">
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-oxford-50 dark:border-oxford-900 pb-4">
                                <h3 className="text-lg font-bold text-oxford-900 dark:text-white flex items-center gap-2"><Award className="text-emerald-600" size={22} /> Otomasi Sertifikat</h3>
                                <Link href={`/admin/webinars/${webinar.id}/certificates`} className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:underline"><ExternalLink size={15} /> Pantau penerbitan</Link>
                            </div>

                            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-oxford-50 dark:bg-oxford-950 p-4">
                                <input type="checkbox" checked={formData.certificateEnabled} onChange={e => setFormData({...formData, certificateEnabled: e.target.checked})} className="mt-1 h-5 w-5 accent-emerald-600" />
                                <span><strong className="block text-oxford-900 dark:text-white">Terbitkan sertifikat untuk webinar ini</strong><span className="text-sm text-oxford-500">Peserta wajib hadir dan lulus evaluasi.</span></span>
                            </label>

                            <label className={`flex items-start gap-3 rounded-xl border p-4 ${formData.certificateEnabled ? 'cursor-pointer border-emerald-200' : 'opacity-50 border-oxford-200'}`}>
                                <input type="checkbox" disabled={!formData.certificateEnabled} checked={formData.certificateAutoIssue} onChange={e => setFormData({...formData, certificateAutoIssue: e.target.checked})} className="mt-1 h-5 w-5 accent-emerald-600" />
                                <span><strong className="block text-oxford-900 dark:text-white">Terbitkan otomatis setelah peserta lulus</strong><span className="text-sm text-oxford-500">Nomor dan snapshot data peserta dibuat otomatis. Matikan jika perlu persetujuan admin.</span></span>
                            </label>

                            <div className="grid gap-5 md:grid-cols-3">
                                <div><label className="mb-2 block text-sm font-semibold">Jenis template</label><select disabled={!formData.certificateEnabled} value={formData.certificateTemplateType} onChange={e => setFormData({...formData, certificateTemplateType: e.target.value as Webinar['certificateTemplateType']})} className="w-full rounded-xl border border-oxford-200 bg-oxford-50 px-4 py-3 dark:bg-oxford-950"><option value="sertifikat">Sertifikat</option><option value="surat_keterangan">Surat Keterangan</option><option value="sttp">STTP</option></select></div>
                                <div><label className="mb-2 block text-sm font-semibold">Awalan nomor</label><input disabled={!formData.certificateEnabled} required maxLength={20} value={formData.certificateNumberPrefix} onChange={e => setFormData({...formData, certificateNumberPrefix: e.target.value.toUpperCase()})} placeholder="WEB" className="w-full rounded-xl border border-oxford-200 bg-oxford-50 px-4 py-3 font-mono dark:bg-oxford-950" /><p className="mt-1 text-xs text-oxford-400">Contoh: WEB/2026/000001</p></div>
                                <div><label className="mb-2 block text-sm font-semibold">Jam Pelajaran</label><input disabled={!formData.certificateEnabled} type="number" min={1} max={999} value={formData.certificateJp} onChange={e => setFormData({...formData, certificateJp: Number(e.target.value)})} className="w-full rounded-xl border border-oxford-200 bg-oxford-50 px-4 py-3 dark:bg-oxford-950" /></div>
                            </div>
                        </div>

                        {/* Quiz Evaluasi */}
                        <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 p-8 space-y-6">
                            <div className="flex justify-between items-center border-b border-oxford-50 dark:border-oxford-900 pb-4">
                                <h3 className="text-lg font-bold text-oxford-900 dark:text-white flex items-center gap-2">
                                    <div className="w-2 h-6 bg-violet-500 rounded-full" />
                                    Quiz Evaluasi Pembelajaran
                                </h3>
                                <button type="button" onClick={addQuestion} className="flex items-center gap-2 text-sm font-bold text-violet-600 hover:text-violet-700 bg-violet-50 px-4 py-2 rounded-lg transition-colors">
                                    <Plus size={18} />
                                    Tambah Pertanyaan
                                </button>
                            </div>
                            
                            <div className="space-y-8">
                                {formData.quizSettings.questions.map((q, qIndex: number) => (
                                    <div key={q.id} className="p-6 rounded-2xl bg-oxford-50 dark:bg-oxford-950/50 border border-oxford-100 dark:border-oxford-800 relative group">
                                        <button type="button" onClick={() => removeQuestion(qIndex)} className="absolute top-4 right-4 p-2 text-oxford-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                            <Trash2 size={18} />
                                        </button>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-oxford-500 dark:text-oxford-400 uppercase tracking-widest mb-2">Pertanyaan {qIndex + 1}</label>
                                                <input required type="text" value={q.question} onChange={e => updateQuestion(qIndex, 'question', e.target.value)} placeholder="Tuliskan pertanyaan di sini..." className="w-full px-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all bg-white dark:bg-[#161B2A]" />
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {q.options.map((opt: string, oIndex: number) => (
                                                    <div key={oIndex} className="relative">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                                                            <button type="button" onClick={() => updateQuestion(qIndex, 'correctAnswer', oIndex)} className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${q.correctAnswer === oIndex ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-oxford-200 dark:border-oxford-700 text-transparent'}`}>
                                                                <CheckCircle2 size={14} />
                                                            </button>
                                                        </div>
                                                        <input required type="text" value={opt} onChange={e => updateOption(qIndex, oIndex, e.target.value)} placeholder={`Pilihan ${oIndex + 1}`} className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-all bg-white dark:bg-[#161B2A] text-sm ${q.correctAnswer === oIndex ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-oxford-200 dark:border-oxford-700'}`} />
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-oxford-400 italic">Klik tombol lingkaran di sebelah kiri pilihan untuk menandai jawaban yang benar.</p>
                                        </div>
                                    </div>
                                ))}
                                
                                {formData.quizSettings.questions.length === 0 && (
                                    <div className="text-center py-10 border-2 border-dashed border-oxford-100 dark:border-oxford-800 rounded-2xl bg-oxford-50 dark:bg-oxford-950/30">
                                        <PlusCircle size={40} className="mx-auto text-oxford-200 mb-3" />
                                        <p className="text-oxford-500 dark:text-oxford-400 font-medium">Belum ada pertanyaan quiz.</p>
                                        <button type="button" onClick={addQuestion} className="text-violet-600 font-bold text-sm mt-2">Buat Pertanyaan Pertama</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sticky Action Bar */}
                        <div className="sticky bottom-0 left-0 right-0 -mx-8 -mb-8 bg-white dark:bg-[#161B2A]/80 backdrop-blur-md border-t border-oxford-100 dark:border-oxford-800 p-4 px-8 flex justify-between items-center z-50">
                            <div className="text-sm text-oxford-500 dark:text-oxford-400 hidden md:block">
                                Perubahan belum disimpan. Klik simpan untuk menerapkan.
                            </div>
                            <button disabled={isSubmitting} type="submit" className="bg-gold-500 hover:bg-gold-600 text-oxford-950 font-bold px-10 py-3 rounded-xl transition-all flex items-center gap-3 shadow-lg shadow-gold-500/20 disabled:opacity-50 ml-auto">
                                <Save size={20} />
                                {isSubmitting ? "Menyimpan..." : "Simpan Semua Perubahan"}
                            </button>
                        </div>

                    </form>

                </div>
            </main>
        </div>
    );
}
