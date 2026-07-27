"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { attendWebinar, submitWebinarEvaluation } from "@/app/actions/webinars";
import { Webinar, WebinarRegistration } from "@/lib/types";
import { Calendar, Clock, Video, CheckCircle, Lock, Unlock, Download } from "lucide-react";
import { toast } from "sonner";

type WebinarParticipant = { name: string };

export default function DashboardClient({ webinar, registration, user }: { webinar: Webinar, registration: WebinarRegistration, user: WebinarParticipant }) {
    const router = useRouter();
    const [attendanceCode, setAttendanceCode] = useState("");
    const [isSubmittingCode, setIsSubmittingCode] = useState(false);
    
    const [isGeneratingCert, setIsGeneratingCert] = useState(false);
    
    // Quiz State
    const [quizStarted, setQuizStarted] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<number[]>([]);
    const [quizFinished, setQuizFinished] = useState(false);

    // Quiz Questions from Database or Fallback
    const quizQuestions = webinar.quizSettings?.questions || [];

    // Timeline calculation
    const now = new Date().getTime();
    const scheduledTime = new Date(webinar.scheduledAt).getTime();
    // Use dynamic join window from database
    const joinWindowMs = (webinar.joinWindowMinutes || 30) * 60 * 1000;
    const isJoinable = now >= scheduledTime - joinWindowMs;
    const certificateAvailable = webinar.certificateEnabled && registration.evaluationCompleted
        && (webinar.certificateAutoIssue || registration.certificateGenerated);

    const handleAttend = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingCode(true);
        try {
            const res = await attendWebinar(webinar.id, attendanceCode);
            if (res.success) {
                toast.success("Presensi berhasil!");
                router.refresh();
            } else {
                toast.error(res.error || "Gagal melakukan presensi");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmittingCode(false);
        }
    };

    const handleQuizAnswer = (optionIndex: number) => {
        const newAnswers = [...answers, optionIndex];
        setAnswers(newAnswers);
        
        if (currentQuestion < quizQuestions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            setQuizFinished(true);
            void submitFinalEvaluation(newAnswers);
        }
    };

    const submitFinalEvaluation = async (finalAnswers: number[]) => {
        try {
            const res = await submitWebinarEvaluation(webinar.id, finalAnswers);
            if (res.success) {
                toast.success(webinar.certificateAutoIssue
                    ? "Quiz berhasil! Sertifikat Anda telah diterbitkan otomatis."
                    : "Quiz berhasil! Sertifikat menunggu penerbitan admin.");
                router.refresh();
            } else {
                toast.error(res.error || "Gagal mengirim evaluasi");
                setQuizFinished(false);
                setQuizStarted(false);
                setCurrentQuestion(0);
                setAnswers([]);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownloadCert = async () => {
        setIsGeneratingCert(true);
        try {
            // Reusing existing pdf route. Assuming standard behavior.
            const response = await fetch('/api/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'webinar_certificate',
                    webinarId: webinar.id,
                }),
            });

            if (!response.ok) throw new Error("Gagal generate PDF");
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Sertifikat-${webinar.title}-${user.name}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Sertifikat berhasil diunduh!");
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Gagal mengunduh sertifikat");
        } finally {
            setIsGeneratingCert(false);
        }
    };

    return (
        <div className="bg-oxford-50 dark:bg-oxford-950 min-h-screen pb-24">
            {/* HEADER */}
            <div className="bg-oxford-950 text-white pt-12 pb-24">
                <div className="container mx-auto px-4 max-w-5xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <span className="text-gold-500 font-bold uppercase tracking-wider text-xs mb-2 block">Dashboard Peserta</span>
                            <h1 className="text-3xl md:text-4xl font-serif font-medium mb-4">
                                {webinar.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-oxford-300 text-sm font-medium">
                                <span className="flex items-center gap-2 bg-white dark:bg-[#161B2A]/10 px-3 py-1 rounded-full"><Calendar size={14} /> {new Date(webinar.scheduledAt).toLocaleDateString('id-ID')}</span>
                                <span className="flex items-center gap-2 bg-white dark:bg-[#161B2A]/10 px-3 py-1 rounded-full"><Clock size={14} /> {new Date(webinar.scheduledAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-12 max-w-5xl">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    
                    {/* LEFT COLUMN: Main flow */}
                    <div className="md:col-span-8 space-y-6">
                        
                        {/* STEP 1: Persiapan & Link Zoom */}
                        <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 p-8">
                            <h3 className="text-xl font-serif font-bold text-oxford-900 dark:text-white mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-gold-500 text-oxford-900 dark:text-white flex items-center justify-center font-bold text-sm shrink-0">1</span>
                                Akses Acara & Materi
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                {webinar.virtualBackgroundUrl && (
                                    <a href={webinar.virtualBackgroundUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 rounded-xl border border-oxford-200 dark:border-oxford-700 hover:border-gold-500 hover:bg-gold-50 transition-colors group">
                                        <div className="w-10 h-10 rounded-full bg-oxford-100 dark:bg-[#161B2A] text-oxford-600 dark:text-oxford-300 group-hover:bg-gold-500 group-hover:text-oxford-900 dark:group-hover:text-white flex items-center justify-center transition-colors">
                                            <Download size={18} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-oxford-900 dark:text-white text-sm">Virtual Background</p>
                                            <p className="text-xs text-oxford-500 dark:text-oxford-400">Unduh untuk digunakan di Zoom</p>
                                        </div>
                                    </a>
                                )}
                                {webinar.materialUrl && (
                                    <a href={webinar.materialUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 rounded-xl border border-oxford-200 dark:border-oxford-700 hover:border-gold-500 hover:bg-gold-50 transition-colors group">
                                        <div className="w-10 h-10 rounded-full bg-oxford-100 dark:bg-[#161B2A] text-oxford-600 dark:text-oxford-300 group-hover:bg-gold-500 group-hover:text-oxford-900 dark:group-hover:text-white flex items-center justify-center transition-colors">
                                            <Download size={18} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-oxford-900 dark:text-white text-sm">Bahan Materi</p>
                                            <p className="text-xs text-oxford-500 dark:text-oxford-400">Unduh modul / PPT acara</p>
                                        </div>
                                    </a>
                                )}
                            </div>

                            <div className="bg-oxford-50 dark:bg-oxford-950 rounded-xl p-6 text-center border border-oxford-200 dark:border-oxford-700">
                                <Video size={48} className="mx-auto text-oxford-300 mb-4" />
                                {webinar.meetingLink ? (
                                    isJoinable ? (
                                        <a href={webinar.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/30">
                                            Gabung Video Conference (Zoom/Meet)
                                        </a>
                                    ) : (
                                        <div>
                                            <p className="text-oxford-600 dark:text-oxford-300 font-medium mb-2">Link meeting akan aktif {webinar.joinWindowMinutes} menit sebelum acara dimulai.</p>
                                            <button disabled className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3 bg-oxford-300 text-oxford-500 dark:text-oxford-400 font-bold rounded-xl cursor-not-allowed">
                                                Belum Waktunya
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    <p className="text-oxford-600 dark:text-oxford-300 font-medium">Link acara belum tersedia. Silakan tunggu update dari admin.</p>
                                )}
                            </div>
                        </div>

                        {/* STEP 2: Presensi */}
                        <div className={`rounded-2xl shadow-sm border p-8 transition-all ${registration.attended ? 'bg-green-50 border-green-200' : 'bg-white dark:bg-[#161B2A] border-oxford-100 dark:border-oxford-800'}`}>
                            <h3 className={`text-xl font-serif font-bold mb-6 flex items-center gap-3 ${registration.attended ? 'text-green-900' : 'text-oxford-900 dark:text-white'}`}>
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${registration.attended ? 'bg-green-500 text-white' : 'bg-gold-500 text-oxford-900 dark:text-white'}`}>
                                    {registration.attended ? <CheckCircle size={16} /> : "2"}
                                </span>
                                Presensi Kehadiran
                            </h3>

                            {registration.attended ? (
                                <p className="text-green-800 font-medium flex items-center gap-2">
                                    <CheckCircle size={20} />
                                    Terima kasih, Anda telah tercatat hadir pada acara ini.
                                </p>
                            ) : (
                                <form onSubmit={handleAttend} className="bg-oxford-50 dark:bg-oxford-950 p-6 rounded-xl border border-oxford-200 dark:border-oxford-700">
                                    <p className="text-oxford-600 dark:text-oxford-300 text-sm mb-4">Silakan masukkan kode presensi yang dibagikan oleh panitia saat acara berlangsung.</p>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <input 
                                            type="text" 
                                            required 
                                            value={attendanceCode}
                                            onChange={e => setAttendanceCode(e.target.value)}
                                            placeholder="KODE-PRESENSI" 
                                            className="flex-1 px-4 py-3 rounded-xl border border-oxford-300 dark:border-oxford-600 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 font-mono text-center sm:text-left text-lg uppercase"
                                        />
                                        <button disabled={isSubmittingCode} type="submit" className="bg-oxford-900 hover:bg-oxford-800 text-white px-6 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 whitespace-nowrap">
                                            {isSubmittingCode ? "Memeriksa..." : "Submit Kode"}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>

                        {/* STEP 3: Evaluasi */}
                        <div className={`rounded-2xl shadow-sm border p-8 transition-all relative overflow-hidden ${!registration.attended ? 'bg-oxford-50 dark:bg-oxford-950 border-oxford-100 dark:border-oxford-800' : registration.evaluationCompleted ? 'bg-green-50 border-green-200' : 'bg-white dark:bg-[#161B2A] border-oxford-100 dark:border-oxford-800'}`}>
                            
                            {!registration.attended && (
                                <div className="absolute inset-0 bg-oxford-50 dark:bg-oxford-950/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-oxford-500 dark:text-oxford-400">
                                    <Lock size={32} className="mb-2 opacity-50" />
                                    <p className="font-medium text-sm">Selesaikan Presensi terlebih dahulu</p>
                                </div>
                            )}

                            <h3 className={`text-xl font-serif font-bold mb-6 flex items-center gap-3 ${registration.evaluationCompleted ? 'text-green-900' : 'text-oxford-900 dark:text-white'}`}>
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${!registration.attended ? 'bg-oxford-300 text-oxford-500 dark:text-oxford-400' : registration.evaluationCompleted ? 'bg-green-500 text-white' : 'bg-gold-500 text-oxford-900 dark:text-white'}`}>
                                    {registration.evaluationCompleted ? <CheckCircle size={16} /> : "3"}
                                </span>
                                Evaluasi Pembelajaran
                            </h3>

                            {registration.evaluationCompleted ? (
                                <p className="text-green-800 font-medium flex items-center gap-2">
                                    <CheckCircle size={20} />
                                    Selamat! Anda telah menyelesaikan Quiz Evaluasi.
                                </p>
                            ) : !quizStarted ? (
                                <div className="text-center py-4">
                                    <p className="text-oxford-600 dark:text-oxford-300 text-sm mb-6">Untuk mendapatkan sertifikat, Anda wajib menyelesaikan Quiz Evaluasi singkat mengenai materi webinar.</p>
                                    <button 
                                        onClick={() => setQuizStarted(true)}
                                        className="bg-oxford-900 hover:bg-oxford-800 text-white px-10 py-3 rounded-xl font-bold transition-colors"
                                    >
                                        Mulai Quiz Evaluasi
                                    </button>
                                </div>
                            ) : quizFinished ? (
                                <div className="text-center py-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500 mx-auto mb-4"></div>
                                    <p className="text-oxford-600 dark:text-oxford-300 font-medium">Memproses hasil evaluasi...</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="text-oxford-500 dark:text-oxford-400 font-medium">Pertanyaan {currentQuestion + 1} dari {quizQuestions.length}</span>
                                        <span className="text-gold-600 font-bold">{Math.round(((currentQuestion) / quizQuestions.length) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-oxford-100 dark:bg-[#161B2A] h-2 rounded-full mb-6">
                                        <div 
                                            className="bg-gold-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${((currentQuestion) / quizQuestions.length) * 100}%` }}
                                        ></div>
                                    </div>
                                    
                                    <h4 className="text-lg font-bold text-oxford-900 dark:text-white mb-6">
                                        {quizQuestions[currentQuestion].question}
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 gap-3">
                                        {quizQuestions[currentQuestion].options.map((option: string, idx: number) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleQuizAnswer(idx)}
                                                className="w-full text-left p-4 rounded-xl border border-oxford-200 dark:border-oxford-700 hover:border-gold-500 hover:bg-gold-50 transition-all group flex items-center justify-between"
                                            >
                                                <span className="text-oxford-700 dark:text-oxford-200 group-hover:text-oxford-900 dark:group-hover:text-white font-medium">{option}</span>
                                                <div className="w-6 h-6 rounded-full border-2 border-oxford-200 dark:border-oxford-700 group-hover:border-gold-500 transition-colors"></div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* STEP 4: Sertifikat */}
                        <div className={`rounded-2xl shadow-sm border p-8 transition-all relative overflow-hidden ${!certificateAvailable ? 'bg-oxford-50 dark:bg-oxford-950 border-oxford-100 dark:border-oxford-800' : 'bg-white dark:bg-[#161B2A] border-gold-300 shadow-gold-500/10'}`}>
                            
                            {!certificateAvailable && (
                                <div className="absolute inset-0 bg-oxford-50 dark:bg-oxford-950/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-oxford-500 dark:text-oxford-400">
                                    <Lock size={32} className="mb-2 opacity-50" />
                                    <p className="font-medium text-sm">{!webinar.certificateEnabled
                                        ? "Sertifikat tidak diterbitkan untuk webinar ini"
                                        : !registration.evaluationCompleted
                                            ? "Isi Evaluasi untuk membuka Sertifikat"
                                            : "Sertifikat menunggu penerbitan admin"}</p>
                                </div>
                            )}

                            <div className="text-center">
                                <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 transition-colors ${certificateAvailable ? 'bg-gold-50 text-gold-600' : 'bg-oxford-100 dark:bg-[#161B2A] text-oxford-400'}`}>
                                    {certificateAvailable ? <Unlock size={32} /> : <Lock size={32} />}
                                </div>
                                <h3 className="text-2xl font-serif font-bold text-oxford-900 dark:text-white mb-2">E-Sertifikat</h3>
                                <p className="text-oxford-600 dark:text-oxford-300 mb-8 max-w-md mx-auto">Sertifikat kehadiran telah diterbitkan. Pastikan nama dan instansi Anda di profil sudah benar sebelum mengunduh.</p>
                                
                                <button 
                                    onClick={handleDownloadCert}
                                    disabled={isGeneratingCert || !certificateAvailable}
                                    className="w-full sm:w-auto mx-auto bg-gold-500 hover:bg-gold-400 text-oxford-950 px-10 py-4 rounded-xl font-bold transition-all shadow-lg shadow-gold-500/30 flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download size={24} />
                                    {isGeneratingCert ? "Memproses PDF..." : "Unduh Sertifikat PDF"}
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Sidebar info */}
                    <div className="md:col-span-4">
                        <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 p-6 sticky top-24">
                            <h4 className="font-serif font-bold text-oxford-900 dark:text-white mb-4 border-b border-oxford-100 dark:border-oxford-800 pb-4">Status Peserta</h4>
                            
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                                        <CheckCircle size={14} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-oxford-900 dark:text-white">Terdaftar</p>
                                        <p className="text-xs text-oxford-500 dark:text-oxford-400">{new Date(registration.registeredAt).toLocaleDateString('id-ID')}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${registration.attended ? 'bg-green-100 text-green-600' : 'bg-oxford-100 dark:bg-[#161B2A] text-oxford-400'}`}>
                                        {registration.attended ? <CheckCircle size={14} /> : <span className="text-[10px] font-bold">2</span>}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-oxford-900 dark:text-white">Presensi</p>
                                        <p className="text-xs text-oxford-500 dark:text-oxford-400">{registration.attended ? "Sudah Hadir" : "Menunggu Kehadiran"}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${registration.evaluationCompleted ? 'bg-green-100 text-green-600' : 'bg-oxford-100 dark:bg-[#161B2A] text-oxford-400'}`}>
                                        {registration.evaluationCompleted ? <CheckCircle size={14} /> : <span className="text-[10px] font-bold">3</span>}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-oxford-900 dark:text-white">Evaluasi</p>
                                        <p className="text-xs text-oxford-500 dark:text-oxford-400">{registration.evaluationCompleted ? "Sudah Mengisi" : "Belum Mengisi"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
