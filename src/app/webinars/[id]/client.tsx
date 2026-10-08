"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  Calendar, Clock, Video, CheckCircle, AlertCircle, ArrowLeft, 
  Download, Award, User, ExternalLink, Search, Printer, Sparkles, Check
} from "lucide-react";
import { toast } from "sonner";
import { submitPublicWebinarAttendance, checkWebinarCertificateByNip } from "@/app/actions/webinars";
import type { Webinar, IssuedWebinarCertificate, SkmAnswer } from "@/lib/types";

type WebinarUser = {
  id: string;
  name: string;
  email?: string | null;
  nip?: string | null;
  instansiAsal?: string | null;
  jabatan?: string | null;
  pangkat?: string | null;
};

const SKM_QUESTIONS = [
  {
    id: 1,
    unsur: "Kesesuaian Persyaratan",
    question: "Bagaimana pendapat Saudara tentang kesesuaian persyaratan pelayanan dengan jenis pelayanannya?",
    options: [
      { key: "A" as const, text: "Sangat Sesuai", score: 4 },
      { key: "B" as const, text: "Sesuai", score: 3 },
      { key: "C" as const, text: "Kurang Sesuai", score: 2 },
      { key: "D" as const, text: "Tidak Sesuai", score: 1 },
    ],
  },
  {
    id: 2,
    unsur: "Kemudahan Prosedur",
    question: "Bagaimana pendapat Saudara tentang kemudahan prosedur pelayanan di unit ini?",
    options: [
      { key: "A" as const, text: "Sangat Mudah", score: 4 },
      { key: "B" as const, text: "Mudah", score: 3 },
      { key: "C" as const, text: "Kurang Mudah", score: 2 },
      { key: "D" as const, text: "Tidak Mudah", score: 1 },
    ],
  },
  {
    id: 3,
    unsur: "Kecepatan Waktu Pelayanan",
    question: "Bagaimana pendapat Saudara tentang kecepatan waktu dalam memberikan pelayanan?",
    options: [
      { key: "A" as const, text: "Sangat Cepat", score: 4 },
      { key: "B" as const, text: "Cepat", score: 3 },
      { key: "C" as const, text: "Kurang Cepat", score: 2 },
      { key: "D" as const, text: "Tidak Cepat", score: 1 },
    ],
  },
  {
    id: 4,
    unsur: "Kewajaran Biaya / Tarif",
    question: "Bagaimana pendapat Saudara tentang kewajaran biaya/tarif dalam pelayanan ini?",
    options: [
      { key: "A" as const, text: "Gratis (Sangat Sesuai)", score: 4 },
      { key: "B" as const, text: "Murah", score: 3 },
      { key: "C" as const, text: "Cukup Mahal", score: 2 },
      { key: "D" as const, text: "Sangat Mahal", score: 1 },
    ],
  },
  {
    id: 5,
    unsur: "Kesesuaian Materi & Tema",
    question: "Bagaimana pendapat Saudara tentang materi/substansi yang disampaikan dengan tema pembinaan?",
    options: [
      { key: "A" as const, text: "Sangat Sesuai", score: 4 },
      { key: "B" as const, text: "Sesuai", score: 3 },
      { key: "C" as const, text: "Kurang Sesuai", score: 2 },
      { key: "D" as const, text: "Tidak Sesuai", score: 1 },
    ],
  },
  {
    id: 6,
    unsur: "Kompetensi Narasumber",
    question: "Bagaimana pendapat Saudara tentang kompetensi atau penguasaan materi yang disampaikan narasumber?",
    options: [
      { key: "A" as const, text: "Sangat Baik", score: 4 },
      { key: "B" as const, text: "Baik", score: 3 },
      { key: "C" as const, text: "Kurang Baik", score: 2 },
      { key: "D" as const, text: "Tidak Baik", score: 1 },
    ],
  },
  {
    id: 7,
    unsur: "Perilaku & Sikap Petugas/Host",
    question: "Bagaimana pendapat Saudara tentang sikap dan perilaku narasumber/panitia dalam memfasilitasi acara?",
    options: [
      { key: "A" as const, text: "Sangat Baik & Ramah", score: 4 },
      { key: "B" as const, text: "Baik", score: 3 },
      { key: "C" as const, text: "Kurang Baik", score: 2 },
      { key: "D" as const, text: "Tidak Baik", score: 1 },
    ],
  },
  {
    id: 8,
    unsur: "Kualitas Sarana & Sistem Siaran",
    question: "Bagaimana pendapat Saudara tentang sarana, prasarana, dan sistem siaran streaming acara?",
    options: [
      { key: "A" as const, text: "Sangat Lancar & Baik", score: 4 },
      { key: "B" as const, text: "Baik", score: 3 },
      { key: "C" as const, text: "Kurang Baik", score: 2 },
      { key: "D" as const, text: "Tidak Baik", score: 1 },
    ],
  },
  {
    id: 9,
    unsur: "Kemanfaatan & Tindak Lanjut",
    question: "Bagaimana pendapat Saudara tentang tindak lanjut dan kemanfaatan materi pelaksanaan kegiatan ini?",
    options: [
      { key: "A" as const, text: "Sangat Bermanfaat", score: 4 },
      { key: "B" as const, text: "Bermanfaat", score: 3 },
      { key: "C" as const, text: "Kurang Bermanfaat", score: 2 },
      { key: "D" as const, text: "Tidak Bermanfaat", score: 1 },
    ],
  },
];

function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0` : null;
}

function useCountdown(targetDateStr: string | null | undefined) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; isPast: boolean }>({
    days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false
  });

  useEffect(() => {
    setMounted(true);
    if (!targetDateStr) return;

    const targetTime = new Date(targetDateStr).getTime();
    if (isNaN(targetTime)) return;

    let intervalId: NodeJS.Timeout | null = null;

    const calculate = () => {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculate();
    intervalId = setInterval(calculate, 1000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [targetDateStr]);

  return { ...timeLeft, mounted };
}

export default function WebinarDetailClient({
  webinar,
  user,
  userRegistration,
}: {
  webinar: Webinar;
  user: WebinarUser | null;
  userRegistration?: { attended: boolean; evaluationCompleted: boolean; certificateGenerated: boolean } | null;
}) {
  // Presensi Form State
  const [nip, setNip] = useState("");
  const [name, setName] = useState("");
  const [agency, setAgency] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [feedback, setFeedback] = useState("");
  const [skmSelected, setSkmSelected] = useState<Record<number, { key: "A" | "B" | "C" | "D"; text: string; score: number }>>({});
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState(Boolean(userRegistration?.attended));

  // Certificate Lookup State
  const [searchCertNip, setSearchCertNip] = useState("");
  const [isSearchingCert, setIsSearchingCert] = useState(false);
  const [foundCertificate, setFoundCertificate] = useState<IssuedWebinarCertificate | null>(null);
  const [certSearchError, setCertSearchError] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const countdown = useCountdown(webinar.scheduledAt);

  // Auto-fill from user profile or localStorage
  useEffect(() => {
    if (user) {
      if (user.nip) setNip(user.nip);
      if (user.name) setName(user.name);
      if (user.instansiAsal) setAgency(user.instansiAsal);
      if (user.jabatan) setPosition(user.jabatan);
      if (user.nip) setSearchCertNip(user.nip);
    } else if (typeof window !== "undefined") {
      const savedNip = localStorage.getItem("corpuku_attendee_nip") || "";
      const savedName = localStorage.getItem("corpuku_attendee_name") || "";
      const savedAgency = localStorage.getItem("corpuku_attendee_agency") || "";
      const savedPosition = localStorage.getItem("corpuku_attendee_position") || "";
      const savedPhone = localStorage.getItem("corpuku_attendee_phone") || "";

      if (savedNip) {
        setNip(savedNip);
        setSearchCertNip(savedNip);
      }
      if (savedName) setName(savedName);
      if (savedAgency) setAgency(savedAgency);
      if (savedPosition) setPosition(savedPosition);
      if (savedPhone) setPhone(savedPhone);
    }
  }, [user]);

  // Set default SKM to "Sangat Baik / A"
  useEffect(() => {
    const defaults: Record<number, { key: "A" | "B" | "C" | "D"; text: string; score: number }> = {};
    SKM_QUESTIONS.forEach(q => {
      defaults[q.id] = { key: "A", text: q.options[0].text, score: q.options[0].score };
    });
    setSkmSelected(defaults);
  }, []);

  const youtubeEmbedUrl = getYouTubeEmbedUrl(webinar.youtubeUrl);

  const handleSkmChange = (questionId: number, option: { key: "A" | "B" | "C" | "D"; text: string; score: number }) => {
    setSkmSelected(prev => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNip = nip.replace(/\D/g, "");
    if (!cleanNip || cleanNip.length < 8) {
      toast.error("NIP/NIK minimal 8 digit angka.");
      return;
    }
    if (!name.trim()) {
      toast.error("Nama lengkap wajib diisi.");
      return;
    }
    if (!agency.trim()) {
      toast.error("Instansi asal wajib diisi.");
      return;
    }

    const payloadSkm: SkmAnswer[] = SKM_QUESTIONS.map(q => {
      const selected = skmSelected[q.id] || { key: "A", text: q.options[0].text, score: q.options[0].score };
      return {
        questionId: q.id,
        questionText: q.question,
        optionKey: selected.key,
        optionText: selected.text,
        score: selected.score,
      };
    });

    setIsSubmittingAttendance(true);
    try {
      const res = await submitPublicWebinarAttendance({
        webinarId: webinar.id,
        nip: cleanNip,
        name,
        agency,
        position,
        phone,
        skmAnswers: payloadSkm,
        feedback,
      });

      if (res.success) {
        toast.success(res.message || "Presensi dan evaluasi berhasil dicatat!");
        setAttendanceSuccess(true);
        if (typeof window !== "undefined") {
          localStorage.setItem("corpuku_attendee_nip", cleanNip);
          localStorage.setItem("corpuku_attendee_name", name);
          localStorage.setItem("corpuku_attendee_agency", agency);
          localStorage.setItem("corpuku_attendee_position", position);
          localStorage.setItem("corpuku_attendee_phone", phone);
        }
        setSearchCertNip(cleanNip);
      } else {
        toast.error(res.error || "Gagal menyimpan presensi.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan server saat memproses presensi.");
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const handleLookupCertificate = async (e?: React.FormEvent, customNip?: string) => {
    if (e) e.preventDefault();
    const queryNip = (customNip || searchCertNip).trim().replace(/\D/g, "");
    if (!queryNip || queryNip.length < 5) {
      toast.error("Masukkan NIP/NIK yang valid.");
      return;
    }

    setIsSearchingCert(true);
    setCertSearchError("");
    setFoundCertificate(null);

    try {
      const res = await checkWebinarCertificateByNip(webinar.id, queryNip);
      if (res.success && res.certificate) {
        setFoundCertificate(res.certificate);
        toast.success("Sertifikat berhasil ditemukan!");
      } else {
        setCertSearchError(res.error || "Sertifikat tidak ditemukan untuk NIP tersebut.");
      }
    } catch (err) {
      console.error(err);
      setCertSearchError("Terjadi gangguan koneksi saat mencari sertifikat.");
    } finally {
      setIsSearchingCert(false);
    }
  };

  const handleDownloadPdfWithToken = async (cert: IssuedWebinarCertificate) => {
    setIsDownloadingPdf(true);
    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'webinar_certificate',
          verificationToken: cert.verificationToken,
          webinarId: webinar.id,
        }),
      });
      if (!response.ok) {
        throw new Error('Gagal mengunduh sertifikat PDF.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cert.participantName}-${cert.certificateNumber}-Yang Lain.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Sertifikat PDF berhasil diunduh!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengunduh sertifikat.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // State Machine 3 Momen
  const isLive = Boolean(webinar.isAttendanceOpen);
  const isPast = new Date(webinar.scheduledAt).getTime() < Date.now();
  const isCompleted = webinar.status === "completed" || (!isLive && isPast);
  const isPreEvent = !isLive && !isCompleted;

  return (
    <div className="bg-oxford-50 dark:bg-oxford-950 min-h-screen pb-24">
      {/* 1. HERO HEADER */}
      <div className="bg-oxford-950 text-white pt-10 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-20" />
        <div className="container mx-auto px-4 relative z-10 max-w-6xl">
          <div className="flex items-center justify-between gap-4 mb-6">
            <Link
              href="/webinars"
              className="inline-flex items-center gap-2 text-gold-500 hover:text-gold-400 font-medium text-sm transition-colors"
            >
              <ArrowLeft size={16} /> Kembali ke Katalog
            </Link>

            {isLive ? (
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-crimson-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-crimson-600/40 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-white" />
                Live Streaming (Sedang Berlangsung)
              </span>
            ) : isCompleted ? (
              <span className="px-3.5 py-1.5 rounded-full bg-oxford-800 text-oxford-300 text-xs font-bold uppercase tracking-wider">
                Sesi Selesai
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Video size={14} /> Akan Datang
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-medium mb-4 leading-tight">
            {webinar.title}
          </h1>
          <p className="text-oxford-300 text-base sm:text-lg mb-8 max-w-3xl leading-relaxed">
            {webinar.description}
          </p>

          <div className="flex flex-wrap gap-4 sm:gap-6 text-sm font-medium">
            <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
              <Calendar size={18} className="text-gold-400" />
              <span>
                {new Date(webinar.scheduledAt).toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "Asia/Makassar",
                })}
              </span>
            </div>

            <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
              <Clock size={18} className="text-gold-400" />
              <span>
                {new Date(webinar.scheduledAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Makassar",
                })}{" "}
                WITA
              </span>
            </div>

            {webinar.certificateEnabled && (
              <div className="flex items-center gap-2 bg-gold-500/20 text-gold-400 px-4 py-2.5 rounded-xl border border-gold-500/30">
                <Award size={18} />
                <span>E-Sertifikat {webinar.certificateJp} JP Tersedia</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. ADAPTIVE CONTENT (SINGLE-PAGE SCROLL, NO TABS) */}
      <div className="container mx-auto px-4 max-w-6xl mt-8">
        
        {/* ========================================================================= */}
        {/* MOMEN 1: PRA-ACARA (Sebelum Acara Dimulai)                                */}
        {/* ========================================================================= */}
        {isPreEvent && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-white dark:bg-[#161B2A] rounded-3xl overflow-hidden border border-oxford-100 dark:border-oxford-800 shadow-xl p-6 sm:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Poster Preview */}
                <div className="lg:col-span-7">
                  {webinar.thumbnailUrl ? (
                    <div className="relative aspect-video sm:aspect-[16/10] w-full rounded-2xl overflow-hidden bg-oxford-900 shadow-md">
                      <Image
                        src={webinar.thumbnailUrl}
                        alt={webinar.title}
                        fill
                        sizes="(min-width: 1024px) 600px, 100vw"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-gradient-to-br from-oxford-900 to-oxford-950 rounded-2xl flex flex-col items-center justify-center text-oxford-400 p-8 text-center border border-white/5">
                      <Video size={56} className="mb-4 text-gold-400 opacity-60" />
                      <p className="font-serif text-xl font-bold text-white mb-1">{webinar.title}</p>
                      <p className="text-sm text-oxford-400">Siaran webinar akan dibuka saat acara dimulai</p>
                    </div>
                  )}
                </div>

                {/* Countdown & Persiapan Peserta */}
                <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
                  <div>
                    <span className="text-xs font-bold text-gold-600 uppercase tracking-widest block mb-2">
                      Jadwal Pelaksanaan
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
                      Acara Segera Dimulai
                    </h2>
                  </div>

                  {/* Countdown Timer */}
                  {countdown.mounted && !countdown.isPast && (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="bg-oxford-900 text-white rounded-xl px-3.5 py-2.5 text-center min-w-[60px] shadow-sm">
                        <div className="text-2xl sm:text-3xl font-bold text-gold-400 font-mono">{countdown.days}</div>
                        <div className="text-[10px] text-oxford-300 uppercase tracking-wider font-semibold">Hari</div>
                      </div>
                      <span className="text-oxford-400 font-bold">:</span>
                      <div className="bg-oxford-900 text-white rounded-xl px-3.5 py-2.5 text-center min-w-[60px] shadow-sm">
                        <div className="text-2xl sm:text-3xl font-bold text-white font-mono">{String(countdown.hours).padStart(2, "0")}</div>
                        <div className="text-[10px] text-oxford-300 uppercase tracking-wider font-semibold">Jam</div>
                      </div>
                      <span className="text-oxford-400 font-bold">:</span>
                      <div className="bg-oxford-900 text-white rounded-xl px-3.5 py-2.5 text-center min-w-[60px] shadow-sm">
                        <div className="text-2xl sm:text-3xl font-bold text-white font-mono">{String(countdown.minutes).padStart(2, "0")}</div>
                        <div className="text-[10px] text-oxford-300 uppercase tracking-wider font-semibold">Menit</div>
                      </div>
                      <span className="text-oxford-400 font-bold">:</span>
                      <div className="bg-oxford-900 text-white rounded-xl px-3.5 py-2.5 text-center min-w-[60px] shadow-sm">
                        <div className="text-2xl sm:text-3xl font-bold text-gold-400 font-mono">{String(countdown.seconds).padStart(2, "0")}</div>
                        <div className="text-[10px] text-oxford-300 uppercase tracking-wider font-semibold">Detik</div>
                      </div>
                    </div>
                  )}

                  {/* Unduh Fasilitas Pra-Acara */}
                  <div className="space-y-3 pt-4 border-t border-border-base">
                    {webinar.meetingLink && (
                      <a
                        href={webinar.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                      >
                        <Video size={18} />
                        Simpan Ruang Zoom / Meet
                        <ExternalLink size={14} />
                      </a>
                    )}

                    {webinar.virtualBackgroundUrl && (
                      <a
                        href={webinar.virtualBackgroundUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full px-5 py-3 border border-border-base hover:border-gold-500 rounded-xl font-medium text-sm text-foreground flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download size={16} />
                        Unduh Virtual Background
                      </a>
                    )}

                    {webinar.materialUrl && (
                      <a
                        href={webinar.materialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full px-5 py-3 border border-border-base hover:border-gold-500 rounded-xl font-medium text-sm text-foreground flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download size={16} />
                        Unduh Bahan Paparan (Materi)
                      </a>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-gold-50 dark:bg-gold-950/30 border border-gold-200 dark:border-gold-800 text-gold-900 dark:text-gold-200 text-xs sm:text-sm flex items-start gap-3">
                    <AlertCircle size={18} className="text-gold-500 shrink-0 mt-0.5" />
                    <p>
                      Formulir presensi kehadiran serta pemutar siaran langsung akan otomatis aktif di halaman ini saat panitia membuka sesi acara.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* MOMEN 2: SAAT ACARA / LIVE STREAMING (Toggle Admin ON)                    */}
        {/* ========================================================================= */}
        {isLive && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            {/* 1. PEMUTAR VIDEO LIVE */}
            <div className="bg-white dark:bg-[#161B2A] rounded-3xl overflow-hidden border border-oxford-100 dark:border-oxford-800 shadow-xl p-4 sm:p-6">
              <div className="flex items-center justify-between gap-4 mb-4 px-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-crimson-600 animate-ping" />
                  <h2 className="text-lg sm:text-xl font-bold font-serif text-foreground">
                    Siaran Langsung Acara
                  </h2>
                </div>
                {webinar.meetingLink && (
                  <a
                    href={webinar.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Buka di Ruang Zoom / Meet <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {youtubeEmbedUrl ? (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner">
                  <iframe
                    src={youtubeEmbedUrl}
                    title={webinar.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : webinar.thumbnailUrl ? (
                <div className="relative h-[320px] sm:h-[480px] w-full rounded-2xl overflow-hidden bg-oxford-900">
                  <Image
                    src={webinar.thumbnailUrl}
                    alt={webinar.title}
                    fill
                    sizes="(min-width: 1024px) 1000px, 100vw"
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-[300px] bg-oxford-900 rounded-2xl flex flex-col items-center justify-center text-oxford-400">
                  <Video size={64} className="mb-4 opacity-50" />
                  <p className="font-serif text-lg">Siaran webinar sedang berlangsung</p>
                </div>
              )}

              {/* Tautan Materi & Virtual Background */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border-base">
                <div className="flex flex-wrap items-center gap-3">
                  {webinar.virtualBackgroundUrl && (
                    <a
                      href={webinar.virtualBackgroundUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 border border-border-base hover:border-gold-500 rounded-xl font-medium text-xs sm:text-sm text-foreground flex items-center gap-2 transition-colors"
                    >
                      <Download size={14} />
                      Virtual Background
                    </a>
                  )}

                  {webinar.materialUrl && (
                    <a
                      href={webinar.materialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 border border-border-base hover:border-gold-500 rounded-xl font-medium text-xs sm:text-sm text-foreground flex items-center gap-2 transition-colors"
                    >
                      <Download size={14} />
                      Materi Paparan
                    </a>
                  )}
                </div>

                {!attendanceSuccess && (
                  <a
                    href="#form-presensi"
                    className="px-5 py-2.5 bg-crimson-600 hover:bg-crimson-500 text-white font-bold rounded-xl transition-all shadow-md text-xs sm:text-sm flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    Isi Presensi Di Bawah ↓
                  </a>
                )}
              </div>
            </div>

            {/* 2. FORM PRESENSI & SKM (LANGSUNG TERBUKA DI BAWAHNYA) */}
            <div id="form-presensi" className="bg-white dark:bg-[#161B2A] rounded-3xl border-2 border-emerald-500/40 shadow-xl p-6 sm:p-10">
              {attendanceSuccess ? (
                <div className="max-w-2xl mx-auto text-center py-10">
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Check size={40} />
                  </div>
                  <h2 className="text-3xl font-serif font-bold text-foreground mb-3">
                    Presensi & Evaluasi Berhasil Dicatat!
                  </h2>
                  <p className="text-oxford-600 dark:text-oxford-300 text-base mb-8 leading-relaxed">
                    Terima kasih atas partisipasi dan penilaian Anda pada Survei Kepuasan Masyarakat (SKM). Kehadiran Anda telah tersimpan secara resmi.
                  </p>
                  
                  {webinar.certificateEnabled && (
                    <div className="p-6 rounded-2xl bg-gold-50/50 dark:bg-gold-950/20 border border-gold-500/30 max-w-lg mx-auto">
                      <p className="text-xs text-gold-700 dark:text-gold-300 font-medium mb-4">
                        Sertifikat resmi ber-QR Code ({webinar.certificateJp} JP) akan diterbitkan setelah sesi acara ditutup oleh panitia.
                      </p>
                      <button
                        onClick={() => handleLookupCertificate(undefined, nip || user?.nip || "")}
                        disabled={isSearchingCert}
                        className="px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-xl transition-all shadow-sm text-sm inline-flex items-center gap-2"
                      >
                        <Award size={16} />
                        {isSearchingCert ? "Memeriksa..." : "Periksa Sertifikat Saya"}
                      </button>
                    </div>
                  )}

                  {/* Kartu jika sertifikat sudah langsung terbit */}
                  {foundCertificate && (
                    <div className="mt-8 text-left border border-gold-500/40 rounded-2xl p-6 bg-gradient-to-br from-gold-50/20 to-transparent">
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <span className="text-xs font-bold text-gold-600 uppercase">Sertifikat Siap Unduh</span>
                        <span className="text-xs font-bold font-mono bg-gold-500 text-oxford-950 px-2.5 py-0.5 rounded-full">{foundCertificate.certificateJp} JP</span>
                      </div>
                      <h4 className="text-lg font-serif font-bold text-foreground">{foundCertificate.participantName}</h4>
                      <p className="text-xs text-oxford-500 font-mono mt-1">No: {foundCertificate.certificateNumber}</p>
                      <div className="flex flex-wrap gap-3 mt-4">
                        <button
                          onClick={() => handleDownloadPdfWithToken(foundCertificate)}
                          disabled={isDownloadingPdf}
                          className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Download size={14} /> {isDownloadingPdf ? "Membuat PDF..." : "Unduh File PDF"}
                        </button>
                        <a
                          href={`/verify/certificates/${foundCertificate.verificationToken}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 border border-border-base hover:border-gold-500 text-foreground font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <ExternalLink size={14} /> Halaman Verifikasi
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmitAttendance} className="space-y-8">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">
                      Presensi Kehadiran Terbuka
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-2">
                      Formulir Kehadiran & Survei Kepuasan (SKM)
                    </h2>
                    <p className="text-sm text-oxford-600 dark:text-oxford-300">
                      Isi identitas Anda untuk pencatatan sertifikat, dan berikan penilaian objektif demi peningkatan mutu penyelenggaraan BPSDM.
                    </p>
                  </div>

                  {/* BAGIAN 1: IDENTITAS */}
                  <div className="bg-oxford-50 dark:bg-oxford-950/60 p-6 rounded-2xl border border-border-base space-y-4">
                    <h3 className="font-sans font-bold text-foreground text-base flex items-center gap-2 mb-4">
                      <User size={18} className="text-gold-500" />
                      1. Identitas Peserta
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-semibold text-oxford-700 dark:text-oxford-300 mb-1">
                          NIP / NIK (Angka Saja) *
                        </label>
                        <input
                          required
                          type="text"
                          value={nip}
                          onChange={e => setNip(e.target.value.replace(/\D/g, ""))}
                          placeholder="Masukkan 18 digit NIP atau NIK Anda..."
                          className="w-full px-4 py-3 rounded-xl border border-border-base bg-background text-foreground font-mono focus:ring-2 focus:ring-gold-500/50 outline-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-oxford-700 dark:text-oxford-300 mb-1">
                          Nama Lengkap Beserta Gelar *
                        </label>
                        <input
                          required
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Nama lengkap untuk tercetak di sertifikat..."
                          className="w-full px-4 py-3 rounded-xl border border-border-base bg-background text-foreground focus:ring-2 focus:ring-gold-500/50 outline-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-oxford-700 dark:text-oxford-300 mb-1">
                          Instansi Asal *
                        </label>
                        <input
                          required
                          type="text"
                          value={agency}
                          onChange={e => setAgency(e.target.value)}
                          placeholder="Contoh: BPSDM Provinsi Kalimantan Utara"
                          className="w-full px-4 py-3 rounded-xl border border-border-base bg-background text-foreground focus:ring-2 focus:ring-gold-500/50 outline-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-oxford-700 dark:text-oxford-300 mb-1">
                          Jabatan
                        </label>
                        <input
                          type="text"
                          value={position}
                          onChange={e => setPosition(e.target.value)}
                          placeholder="Contoh: Analis Kebijakan Ahli Muda"
                          className="w-full px-4 py-3 rounded-xl border border-border-base bg-background text-foreground focus:ring-2 focus:ring-gold-500/50 outline-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-oxford-700 dark:text-oxford-300 mb-1">
                          Nomor WhatsApp / HP
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="08123456789"
                          className="w-full px-4 py-3 rounded-xl border border-border-base bg-background text-foreground focus:ring-2 focus:ring-gold-500/50 outline-none text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* BAGIAN 2: 9 PERTANYAAN SKM PERMENPAN RB */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-sans font-bold text-foreground text-base flex items-center gap-2">
                          <Sparkles size={18} className="text-gold-500" />
                          2. Evaluasi Mutu Pelayanan (SKM Permenpan RB)
                        </h3>
                        <p className="text-xs text-oxford-500 mt-0.5">
                          9 unsur standar penilaian kepuasan masyarakat
                        </p>
                      </div>
                      <span className="text-xs bg-gold-500/10 text-gold-600 dark:text-gold-400 font-semibold px-2.5 py-1 rounded-full border border-gold-500/20">
                        Opsi Default: Sangat Baik
                      </span>
                    </div>

                    <div className="space-y-4">
                      {SKM_QUESTIONS.map(q => {
                        const currentVal = skmSelected[q.id]?.key || "A";
                        return (
                          <div
                            key={q.id}
                            className="p-5 rounded-2xl border border-border-base bg-oxford-50/50 dark:bg-oxford-950/40 hover:border-gold-500/40 transition-colors"
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <span className="w-6 h-6 rounded-full bg-oxford-200 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {q.id}
                              </span>
                              <div>
                                <span className="text-[11px] font-bold text-gold-600 uppercase tracking-wider block">
                                  {q.unsur}
                                </span>
                                <p className="text-sm font-medium text-foreground">
                                  {q.question}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pl-9">
                              {q.options.map(opt => {
                                const isChecked = currentVal === opt.key;
                                return (
                                  <button
                                    type="button"
                                    key={opt.key}
                                    onClick={() => handleSkmChange(q.id, opt)}
                                    className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all flex items-center justify-between gap-2 ${
                                      isChecked
                                        ? "bg-gold-500 text-oxford-950 border-gold-500 font-bold shadow-sm"
                                        : "bg-background border-border-base text-foreground hover:bg-oxford-100 dark:hover:bg-oxford-900"
                                    }`}
                                  >
                                    <span>{opt.key}. {opt.text}</span>
                                    {isChecked && <Check size={14} className="shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* MASUKAN / SARAN */}
                    <div>
                      <label className="block text-xs font-semibold text-oxford-700 dark:text-oxford-300 mb-1">
                        Kritik & Saran Perbaikan (Opsional)
                      </label>
                      <textarea
                        rows={3}
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        placeholder="Berikan masukan untuk topik atau penyelenggaraan webinar berikutnya..."
                        className="w-full p-4 rounded-xl border border-border-base bg-background text-foreground focus:ring-2 focus:ring-gold-500/50 outline-none text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAttendance}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20 text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle size={20} />
                    {isSubmittingAttendance ? "Menyimpan Data..." : "Kirim Presensi & Evaluasi Sekarang"}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* MOMEN 3: PASCA-ACARA (Acara Selesai, Klaim Sertifikat Jadi Utama)           */}
        {/* ========================================================================= */}
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            {/* 1. KOTAK KLAIM & CETAK E-SERTIFIKAT (PANGGUNG UTAMA) */}
            {webinar.certificateEnabled && (
              <div className="bg-white dark:bg-[#161B2A] rounded-3xl border-2 border-gold-500/40 shadow-xl p-6 sm:p-10 max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gold-500/20 text-gold-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award size={32} />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-2">
                    Klaim & Cetak E-Sertifikat Resmi
                  </h2>
                  <p className="text-sm text-oxford-600 dark:text-oxford-300 max-w-lg mx-auto">
                    Masukkan 18 digit NIP atau NIK yang Anda gunakan saat mengisi form presensi untuk mengunduh dokumen sertifikat ber-QR Code ({webinar.certificateJp} JP).
                  </p>
                </div>

                {/* SEARCH BAR */}
                <form onSubmit={e => handleLookupCertificate(e)} className="flex gap-2 max-w-lg mx-auto mb-8">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-400" size={18} />
                    <input
                      type="text"
                      value={searchCertNip}
                      onChange={e => setSearchCertNip(e.target.value.replace(/\D/g, ""))}
                      placeholder="Masukkan NIP / NIK Anda..."
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-border-base bg-background text-foreground font-mono focus:ring-2 focus:ring-gold-500/50 outline-none text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingCert}
                    className="px-6 py-3.5 bg-oxford-900 hover:bg-oxford-800 text-white font-bold rounded-xl transition-all shadow-md shrink-0 text-sm disabled:opacity-50"
                  >
                    {isSearchingCert ? "Mencari..." : "Cari Sertifikat"}
                  </button>
                </form>

                {/* ERROR STATE */}
                {certSearchError && (
                  <div className="p-4 rounded-xl bg-crimson-50 dark:bg-crimson-950/40 border border-crimson-200 dark:border-crimson-800 text-crimson-700 dark:text-crimson-300 text-sm flex items-center gap-3 mb-6">
                    <AlertCircle size={20} className="shrink-0" />
                    <p>{certSearchError}</p>
                  </div>
                )}

                {/* FOUND CERTIFICATE CARD */}
                {foundCertificate && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="border-2 border-gold-500/40 rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-gold-50/20 via-background to-oxford-50/30 dark:from-gold-950/20 dark:to-oxford-950/30"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border-base">
                      <div>
                        <span className="text-xs font-bold text-gold-600 uppercase tracking-widest block mb-1">
                          Sertifikat Terverifikasi
                        </span>
                        <h3 className="text-xl sm:text-2xl font-serif font-bold text-foreground">
                          {foundCertificate.participantName}
                        </h3>
                        <p className="text-xs text-oxford-500 font-mono mt-0.5">
                          NIP: {foundCertificate.participantNip || "-"} • No: {foundCertificate.certificateNumber}
                        </p>
                      </div>

                      <div className="bg-gold-500 text-oxford-950 px-3.5 py-1 rounded-full text-xs font-bold font-mono shrink-0">
                        {foundCertificate.certificateJp} JP
                      </div>
                    </div>

                    <div className="py-6 space-y-2 text-sm text-oxford-600 dark:text-oxford-300">
                      <p>
                        <span className="font-semibold text-foreground">Kegiatan:</span> {foundCertificate.webinarTitle}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Instansi:</span> {foundCertificate.participantInstitution || "-"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border-base">
                      <button
                        onClick={() => handleDownloadPdfWithToken(foundCertificate)}
                        disabled={isDownloadingPdf}
                        className="px-6 py-3 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-xl transition-all shadow-md flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                      >
                        <Download size={16} />
                        {isDownloadingPdf ? "Membuat PDF..." : "Unduh Sertifikat PDF"}
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="px-5 py-3 border border-border-base hover:bg-oxford-50 dark:hover:bg-oxford-900 rounded-xl font-medium text-sm text-foreground flex items-center gap-2 transition-colors"
                      >
                        <Printer size={16} />
                        Cetak Langsung
                      </button>

                      <Link
                        href={`/verify/certificates/${foundCertificate.verificationToken}`}
                        target="_blank"
                        className="text-xs text-gold-600 hover:underline flex items-center gap-1 ml-auto"
                      >
                        Halaman Verifikasi Publik <ExternalLink size={12} />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* 2. REKAMAN SIARAN & MATERI PEMBELAJARAN */}
            <div className="bg-white dark:bg-[#161B2A] rounded-3xl overflow-hidden border border-oxford-100 dark:border-oxford-800 shadow-xl p-4 sm:p-8 max-w-4xl mx-auto">
              <h3 className="text-lg sm:text-xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
                <Video size={20} className="text-gold-500" />
                Rekaman Acara & Materi Paparan
              </h3>

              {youtubeEmbedUrl ? (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner mb-6">
                  <iframe
                    src={youtubeEmbedUrl}
                    title={webinar.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : webinar.thumbnailUrl ? (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-oxford-900 mb-6">
                  <Image
                    src={webinar.thumbnailUrl}
                    alt={webinar.title}
                    fill
                    sizes="(min-width: 1024px) 800px, 100vw"
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border-base">
                <p className="text-xs text-oxford-500 dark:text-oxford-400">
                  Presensi untuk sesi webinar ini telah ditutup oleh panitia.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  {webinar.materialUrl && (
                    <a
                      href={webinar.materialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 bg-oxford-900 hover:bg-oxford-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <Download size={16} />
                      Unduh Bahan Paparan (Materi)
                    </a>
                  )}

                  {webinar.virtualBackgroundUrl && (
                    <a
                      href={webinar.virtualBackgroundUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 border border-border-base hover:border-gold-500 rounded-xl font-medium text-xs sm:text-sm text-foreground flex items-center gap-2 transition-colors"
                    >
                      <Download size={14} />
                      Virtual Background
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
