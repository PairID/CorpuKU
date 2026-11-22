"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  Link2,
  Loader2,
  Maximize2,
  Minimize2,
  QrCode,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import {
  generateMaterialAttendanceQr,
  getCourseContentForBuilder,
  getMaterialAttendanceQr,
  updateMaterialAttendanceQrCode,
} from "@/app/actions/builder";
import {
  getSessionAttendanceSummary,
  type SessionAttendanceSummary,
  type SessionAttendanceParticipant,
} from "@/app/actions/attendance";
import { showToast } from "@/lib/toast";

interface SessionItem {
  moduleId: string;
  moduleTitle: string;
  lessonId: string;
  lessonTitle: string;
  jp: number;
  narasumberName?: string | null;
  attendanceQrCode?: string | null;
}

interface CourseAttendanceQrManagerModalProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

export default function CourseAttendanceQrManagerModal({
  courseId,
  courseTitle,
  onClose,
}: CourseAttendanceQrManagerModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [draftCode, setDraftCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [attendanceUrl, setAttendanceUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Live Attendance Summary States
  const [activeTab, setActiveTab] = useState<"qr" | "attendees">("qr");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summary, setSummary] = useState<SessionAttendanceSummary | null>(null);
  const [participantFilter, setParticipantFilter] = useState<"all" | "attended" | "not_attended">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFullscreenDrawer, setShowFullscreenDrawer] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingList(true);
    getCourseContentForBuilder(courseId)
      .then((modules) => {
        if (!active) return;
        const flat: SessionItem[] = [];
        for (const mod of modules) {
          for (const less of mod.lessons || []) {
            if (less.hasAttendance !== false) {
              flat.push({
                moduleId: mod.id,
                moduleTitle: mod.title,
                lessonId: less.id,
                lessonTitle: less.title,
                jp: Number(less.jp || 2),
                narasumberName: less.narasumberName,
                attendanceQrCode: less.attendanceQrCode,
              });
            }
          }
        }
        setSessions(flat);
        if (flat[0]) {
          setSelectedLessonId(flat[0].lessonId);
        }
      })
      .finally(() => {
        if (active) setLoadingList(false);
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  const fetchSummary = async (lessonId: string) => {
    if (!lessonId) return;
    setLoadingSummary(true);
    try {
      const res = await getSessionAttendanceSummary(courseId, lessonId);
      if (res.success) {
        setSummary(res);
      }
    } catch (err) {
      console.error("Error fetching session attendance summary:", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (!selectedLessonId) return;
    let active = true;
    setLoadingQr(true);
    getMaterialAttendanceQr(courseId, selectedLessonId)
      .then((res) => {
        if (!active) return;
        if (res.success && res.qrDataUrl) {
          setQrCode(res.code || "");
          setDraftCode(res.code || "");
          setQrDataUrl(res.qrDataUrl);
          setAttendanceUrl(res.attendanceUrl || "");
        } else {
          showToast.error("Gagal Memuat QR", res.error || "Gagal memuat QR presensi.");
        }
      })
      .finally(() => {
        if (active) setLoadingQr(false);
      });

    void fetchSummary(selectedLessonId);

    return () => {
      active = false;
    };
  }, [courseId, selectedLessonId]);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } catch {
        // Fallback CSS fullscreen already active
      }
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch {
        // ignore
      }
    }
  };

  const handleRegenerate = async () => {
    if (!selectedLessonId) return;
    setLoadingQr(true);
    try {
      const res = await generateMaterialAttendanceQr(courseId, selectedLessonId);
      if (res.success && res.qrDataUrl) {
        setQrCode(res.code || "");
        setDraftCode(res.code || "");
        setQrDataUrl(res.qrDataUrl);
        setAttendanceUrl(res.attendanceUrl || "");
        showToast.success("QR Presensi Diperbarui", `Kode Presensi baru: ${res.code}`);
      } else {
        showToast.error("Gagal", res.error || "Gagal men-generate ulang QR.");
      }
    } finally {
      setLoadingQr(false);
    }
  };

  const handleSaveCustomCode = async () => {
    if (!selectedLessonId || savingCode) return;
    setSavingCode(true);
    try {
      const res = await updateMaterialAttendanceQrCode(courseId, selectedLessonId, draftCode);
      if (res.success && res.qrDataUrl) {
        setQrCode(res.code || "");
        setDraftCode(res.code || "");
        setQrDataUrl(res.qrDataUrl);
        setAttendanceUrl(res.attendanceUrl || "");
        showToast.success("Kode Presensi Disimpan", `Kode & QR diperbarui menjadi ${res.code}`);
      } else {
        showToast.error("Gagal Menyimpan", res.error || "Kode presensi tidak valid.");
      }
    } finally {
      setSavingCode(false);
    }
  };

  const handleCopy = async () => {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast.error("Gagal Menyalin", "Silakan salin kode secara manual.");
    }
  };

  const handleCopyUrl = async () => {
    if (!attendanceUrl) return;
    try {
      await navigator.clipboard.writeText(attendanceUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      showToast.success("Link Presensi Disalin", "Tautan web presensi langsung telah disalin ke clipboard.");
    } catch {
      showToast.error("Gagal Menyalin Link", "Silakan salin tautan secara manual.");
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("id-ID", {
        timeStyle: "short",
        dateStyle: "medium",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const currentIdx = sessions.findIndex((s) => s.lessonId === selectedLessonId);
  const activeSession = currentIdx >= 0 ? sessions[currentIdx] : null;

  const groupedModules = sessions.reduce<Array<{ moduleId: string; moduleTitle: string; items: SessionItem[] }>>(
    (acc, item) => {
      let group = acc.find((g) => g.moduleId === item.moduleId);
      if (!group) {
        group = { moduleId: item.moduleId, moduleTitle: item.moduleTitle, items: [] };
        acc.push(group);
      }
      group.items.push(item);
      return acc;
    },
    []
  );

  const filteredParticipants: Array<SessionAttendanceParticipant & { isAttended: boolean }> = (() => {
    if (!summary) return [];
    const list: Array<SessionAttendanceParticipant & { isAttended: boolean }> = [];
    if (participantFilter === "all" || participantFilter === "attended") {
      for (const p of summary.attended) {
        list.push({ ...p, isAttended: true });
      }
    }
    if (participantFilter === "all" || participantFilter === "not_attended") {
      for (const p of summary.notAttended) {
        list.push({ ...p, isAttended: false });
      }
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.nip.toLowerCase().includes(q) ||
        p.instansiAsal.toLowerCase().includes(q)
    );
  })();

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-[100] bg-oxford-950 text-white flex flex-col justify-between p-6 md:p-10 overflow-y-auto"
          : "fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      }
    >
      {isFullscreen ? (
        <>
          {/* Fullscreen Projector Header */}
          <div className="flex items-center justify-between gap-4 border-b border-oxford-800 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gold-400">
                Presensi Kelas &bull; {courseTitle}
              </p>
              <h2 className="text-xl md:text-3xl font-serif font-bold text-white mt-1">
                {activeSession ? `${activeSession.moduleTitle} — ${activeSession.lessonTitle}` : "Presensi Materi"}
              </h2>
              {activeSession?.narasumberName && (
                <p className="text-sm text-oxford-300 mt-0.5">
                  Narasumber: <span className="font-semibold text-white">{activeSession.narasumberName}</span> &bull; {activeSession.jp} JP
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-oxford-800 hover:bg-oxford-700 text-white text-xs font-bold border border-oxford-700 shrink-0"
            >
              <Minimize2 size={16} /> Keluar Layar Penuh
            </button>
          </div>

          {/* Fullscreen QR Display */}
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            {loadingQr ? (
              <Loader2 size={48} className="animate-spin text-gold-400" />
            ) : qrDataUrl ? (
              <div className="flex flex-col items-center">
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl border-4 border-gold-400">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="QR Presensi Layar Penuh"
                    className="w-72 h-72 sm:w-96 sm:h-96 object-contain"
                  />
                </div>
                <p className="mt-5 text-sm text-oxford-300 text-center max-w-md">
                  Arahkan kamera HP peserta (atau scan QR) langsung ke layar untuk presensi otomatis via web:
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                  <div className="px-6 py-2.5 rounded-2xl bg-oxford-900 border border-oxford-700 text-xl md:text-2xl font-mono font-extrabold tracking-wider text-gold-400">
                    {qrCode}
                  </div>
                  {attendanceUrl && (
                    <button
                      type="button"
                      onClick={() => void handleCopyUrl()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gold-500 hover:bg-gold-400 text-oxford-950 text-xs font-bold shadow-md transition-all active:scale-95"
                    >
                      {copiedUrl ? <Check size={16} className="text-oxford-950" /> : <Link2 size={16} />}
                      <span>{copiedUrl ? "Link Web Disalin!" : "Salin Link Web Presensi"}</span>
                    </button>
                  )}
                </div>

                {/* Fullscreen Live Attendees Badge & Toggle Button */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFullscreenDrawer(!showFullscreenDrawer)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-oxford-900 hover:bg-oxford-850 border border-oxford-700 text-xs font-bold text-white shadow-xl transition-all active:scale-95"
                  >
                    <Users size={16} className="text-gold-400" />
                    <span>
                      Live Kehadiran: <span className="text-emerald-400 font-extrabold">{summary?.attendedCount ?? 0}</span> / {summary?.totalEnrolled ?? 0} Hadir ({summary?.attendancePercentage ?? 0}%)
                    </span>
                    <Eye size={14} className="text-oxford-400 ml-1" />
                  </button>
                  <button
                    type="button"
                    onClick={() => selectedLessonId && void fetchSummary(selectedLessonId)}
                    disabled={loadingSummary}
                    className="p-2.5 rounded-2xl bg-oxford-900 hover:bg-oxford-850 border border-oxford-700 text-oxford-300 disabled:opacity-50"
                    title="Segarkan Data Kehadiran"
                  >
                    <RefreshCw size={14} className={loadingSummary ? "animate-spin text-gold-400" : ""} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-oxford-400">Tidak ada sesi wajib presensi.</p>
            )}
          </div>

          {/* Fullscreen Floating Drawer for Live Attendees */}
          {showFullscreenDrawer && (
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-oxford-900/95 backdrop-blur-md border-l border-oxford-700 shadow-2xl p-6 z-[110] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-oxford-800">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-gold-400" />
                    <h3 className="text-sm font-bold text-white">Live Peserta Hadir &amp; Belum</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullscreenDrawer(false)}
                    className="p-1 rounded-lg text-oxford-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 my-3 text-center">
                  <div className="p-2 rounded-xl bg-oxford-800/80 border border-oxford-700">
                    <p className="text-[10px] text-oxford-400 font-semibold">Total</p>
                    <p className="text-sm font-bold text-white">{summary?.totalEnrolled ?? 0}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60">
                    <p className="text-[10px] text-emerald-400 font-semibold">Sudah</p>
                    <p className="text-sm font-bold text-emerald-300">{summary?.attendedCount ?? 0}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-800/60">
                    <p className="text-[10px] text-amber-400 font-semibold">Belum</p>
                    <p className="text-sm font-bold text-amber-300">{summary?.notAttendedCount ?? 0}</p>
                  </div>
                </div>

                {/* Filter & Search */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-1 p-1 bg-oxford-800 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setParticipantFilter("all")}
                      className={`flex-1 py-1 rounded-lg ${participantFilter === "all" ? "bg-oxford-700 text-white" : "text-oxford-400"}`}
                    >
                      Semua ({summary?.totalEnrolled ?? 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setParticipantFilter("attended")}
                      className={`flex-1 py-1 rounded-lg ${participantFilter === "attended" ? "bg-emerald-800 text-white" : "text-oxford-400"}`}
                    >
                      Hadir ({summary?.attendedCount ?? 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setParticipantFilter("not_attended")}
                      className={`flex-1 py-1 rounded-lg ${participantFilter === "not_attended" ? "bg-amber-800 text-white" : "text-oxford-400"}`}
                    >
                      Belum ({summary?.notAttendedCount ?? 0})
                    </button>
                  </div>

                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-oxford-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama atau NIP..."
                      className="w-full pl-8 pr-3 py-1.5 bg-oxford-800 border border-oxford-700 rounded-xl text-xs text-white placeholder-oxford-400 focus:outline-none focus:border-gold-500"
                    />
                  </div>
                </div>

                {/* Participant List */}
                <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                  {loadingSummary ? (
                    <div className="py-8 text-center text-xs text-oxford-400 flex flex-col items-center gap-2">
                      <Loader2 size={20} className="animate-spin text-gold-400" />
                      <span>Memuat data...</span>
                    </div>
                  ) : filteredParticipants.length === 0 ? (
                    <p className="text-center py-6 text-xs text-oxford-400">Tidak ada peserta yang cocok.</p>
                  ) : (
                    filteredParticipants.map((p) => (
                      <div
                        key={p.userId}
                        className="p-2.5 rounded-xl bg-oxford-800/60 border border-oxford-700/60 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{p.name}</p>
                          <p className="text-[11px] text-oxford-400">{p.nip}</p>
                          <p className="text-[10px] text-oxford-400 truncate">{p.instansiAsal}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          {p.isAttended ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              <CheckCircle2 size={11} /> Hadir
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                              Belum Hadir
                            </span>
                          )}
                          {p.attendedAt && (
                            <p className="text-[9px] text-oxford-400 mt-1 flex items-center justify-end gap-1">
                              <Clock size={10} /> {formatTime(p.attendedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-oxford-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => selectedLessonId && void fetchSummary(selectedLessonId)}
                  disabled={loadingSummary}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-oxford-800 hover:bg-oxford-700 text-xs font-bold text-white"
                >
                  <RefreshCw size={13} className={loadingSummary ? "animate-spin" : ""} /> Segarkan
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullscreenDrawer(false)}
                  className="px-3 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-oxford-950 text-xs font-bold"
                >
                  Tutup Panel
                </button>
              </div>
            </div>
          )}

          {/* Fullscreen Session Switcher Footer */}
          {sessions.length > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4 border-t border-oxford-800">
              <button
                type="button"
                disabled={currentIdx <= 0}
                onClick={() => setSelectedLessonId(sessions[currentIdx - 1].lessonId)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-oxford-800 hover:bg-oxford-700 text-xs font-bold disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Sesi Sebelumnya
              </button>
              <span className="text-xs font-bold text-oxford-300">
                Sesi {currentIdx + 1} dari {sessions.length}
              </span>
              <button
                type="button"
                disabled={currentIdx >= sessions.length - 1}
                onClick={() => setSelectedLessonId(sessions[currentIdx + 1].lessonId)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-oxford-800 hover:bg-oxford-700 text-xs font-bold disabled:opacity-40"
              >
                Sesi Berikutnya <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative my-auto">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-oxford-100 dark:border-oxford-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-500/15 text-gold-600 dark:text-gold-400 flex items-center justify-center shrink-0">
                <QrCode size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-oxford-950 dark:text-white">
                  Manajemen QR Presensi Per Modul
                </h3>
                <p className="text-xs text-oxford-500 dark:text-oxford-400 line-clamp-1">
                  {courseTitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeSession && (
                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-oxford-900 hover:bg-oxford-800 text-gold-400 text-xs font-bold shadow-sm transition-colors"
                >
                  <Maximize2 size={14} /> Layar Penuh
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-oxford-500 hover:bg-oxford-100 dark:hover:bg-oxford-800"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {loadingList ? (
            <div className="py-14 flex flex-col items-center justify-center text-xs text-oxford-500 gap-2">
              <Loader2 size={24} className="animate-spin text-gold-500" />
              <span>Memuat daftar modul &amp; sesi...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-sm text-oxford-500 dark:text-oxford-400">
              Belum ada materi dengan status <strong>Wajib Presensi</strong> pada kursus ini. Silakan tambahkan materi terlebih dahulu di menu Kelola Materi/Konten.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-5">
              {/* Left: Module & Session List */}
              <div className="md:col-span-2 space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {groupedModules.map((mod) => (
                  <div key={mod.moduleId} className="space-y-1.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-oxford-500 dark:text-oxford-400 px-1">
                      {mod.moduleTitle}
                    </p>
                    {mod.items.map((item) => {
                      const isSelected = item.lessonId === selectedLessonId;
                      return (
                        <button
                          key={item.lessonId}
                          type="button"
                          onClick={() => setSelectedLessonId(item.lessonId)}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all ${
                            isSelected
                              ? "bg-gold-50 dark:bg-gold-950/40 border-gold-500 text-oxford-950 dark:text-white font-bold shadow-xs"
                              : "bg-oxford-50/70 dark:bg-oxford-900/60 border-oxford-200 dark:border-oxford-800 text-oxford-700 dark:text-oxford-300 hover:border-gold-400"
                          }`}
                        >
                          <div className="truncate">{item.lessonTitle}</div>
                          <div className="text-[10px] text-oxford-500 dark:text-oxford-400 mt-0.5 flex items-center justify-between">
                            <span>{item.jp} JP</span>
                            {item.narasumberName && <span className="truncate ml-2">{item.narasumberName}</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Right: Tabbed QR & Live Attendees View */}
              <div className="md:col-span-3 flex flex-col bg-oxford-50/70 dark:bg-oxford-950/60 border border-oxford-200 dark:border-oxford-800 rounded-2xl p-4 sm:p-5">
                {activeSession && (
                  <div className="text-center mb-3">
                    <p className="text-xs font-bold text-oxford-950 dark:text-white line-clamp-1">
                      {activeSession.lessonTitle}
                    </p>
                    <p className="text-[11px] text-oxford-500 dark:text-oxford-400">
                      {activeSession.moduleTitle} &bull; {activeSession.jp} JP
                    </p>
                  </div>
                )}

                {/* Segmented Control Tabs */}
                <div className="flex items-center gap-1 p-1 bg-oxford-200/60 dark:bg-oxford-900 rounded-xl mb-3.5 text-xs font-bold w-full">
                  <button
                    type="button"
                    onClick={() => setActiveTab("qr")}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all ${
                      activeTab === "qr"
                        ? "bg-white dark:bg-[#161B2A] text-oxford-950 dark:text-white shadow-xs"
                        : "text-oxford-600 dark:text-oxford-400 hover:text-oxford-900 dark:hover:text-white"
                    }`}
                  >
                    <QrCode size={14} />
                    <span>Kode QR &amp; Kode Presensi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("attendees")}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all ${
                      activeTab === "attendees"
                        ? "bg-white dark:bg-[#161B2A] text-oxford-950 dark:text-white shadow-xs"
                        : "text-oxford-600 dark:text-oxford-400 hover:text-oxford-900 dark:hover:text-white"
                    }`}
                  >
                    <Users size={14} />
                    <span>Status Peserta</span>
                    {summary && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold">
                        {summary.attendedCount}/{summary.totalEnrolled}
                      </span>
                    )}
                  </button>
                </div>

                {/* TAB 1: QR & TOKEN DISPLAY */}
                {activeTab === "qr" && (
                  <div className="flex flex-col items-center justify-center">
                    {/* Live summary banner above QR */}
                    <div className="flex items-center justify-between w-full max-w-sm px-3 py-1.5 mb-2.5 rounded-xl bg-oxford-100 dark:bg-oxford-900/80 border border-oxford-200 dark:border-oxford-800 text-[11px]">
                      <div className="flex items-center gap-1.5 font-semibold text-oxford-700 dark:text-oxford-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>
                          {summary
                            ? `${summary.attendedCount} dari ${summary.totalEnrolled} Hadir (${summary.attendancePercentage}%)`
                            : "Memuat kehadiran..."}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("attendees")}
                        className="font-bold text-gold-600 dark:text-gold-400 hover:underline"
                      >
                        Lihat Daftar &rarr;
                      </button>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-oxford-200 shadow-xs mb-3">
                      {loadingQr ? (
                        <div className="w-48 h-48 flex items-center justify-center">
                          <Loader2 size={28} className="animate-spin text-gold-500" />
                        </div>
                      ) : qrDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={qrDataUrl}
                          alt="QR Presensi Materi"
                          className="w-48 h-48 object-contain"
                        />
                      ) : null}
                    </div>

                    {qrCode && (
                      <div className="flex items-center gap-1.5 w-full max-w-sm mb-3">
                        <input
                          type="text"
                          value={draftCode}
                          onChange={(e) => setDraftCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                          placeholder="Contoh: SESI-1-PAGI"
                          maxLength={40}
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl text-xs font-mono font-bold text-center text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
                        />
                        {draftCode.trim() !== qrCode && (
                          <button
                            type="button"
                            onClick={() => void handleSaveCustomCode()}
                            disabled={savingCode || draftCode.trim().length < 3}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 shrink-0"
                          >
                            {savingCode ? "Menyimpan..." : "Simpan Kode"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleCopy()}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-oxford-200 dark:bg-oxford-800 text-xs font-bold text-oxford-800 dark:text-oxford-100 shrink-0"
                        >
                          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          <span>{copied ? "Disalin" : "Salin"}</span>
                        </button>
                      </div>
                    )}

                    {attendanceUrl && (
                      <div className="w-full max-w-sm mb-3">
                        <button
                          type="button"
                          onClick={() => void handleCopyUrl()}
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gold-50 dark:bg-gold-950/40 border border-gold-300 dark:border-gold-700/60 text-gold-950 dark:text-gold-200 text-xs font-bold hover:bg-gold-100 transition-colors"
                        >
                          {copiedUrl ? <Check size={14} className="text-emerald-600" /> : <Link2 size={14} />}
                          <span>{copiedUrl ? "Tautan Web Presensi Berhasil Disalin!" : "Salin Link Web Presensi (Untuk Dishare ke WA)"}</span>
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => void toggleFullscreen()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-oxford-900 hover:bg-oxford-800 text-gold-400 text-xs font-bold transition-colors"
                      >
                        <Maximize2 size={14} /> Fullscreen Layar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRegenerate()}
                        disabled={loadingQr}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 text-xs font-bold text-oxford-700 dark:text-oxford-200 hover:border-gold-500 disabled:opacity-50"
                      >
                        <RefreshCw size={13} /> Generate Ulang
                      </button>
                      {qrDataUrl && (
                        <a
                          href={qrDataUrl}
                          download={`QR_Presensi_${qrCode || selectedLessonId}.png`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-oxford-950 text-xs font-bold"
                        >
                          <Download size={13} /> Unduh PNG
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: LIVE ATTENDEES LIST */}
                {activeTab === "attendees" && (
                  <div className="flex flex-col h-full">
                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-800 shadow-xs">
                        <p className="text-[10px] text-oxford-500 font-semibold uppercase">Total Peserta</p>
                        <p className="text-base font-extrabold text-oxford-900 dark:text-white mt-0.5">
                          {summary?.totalEnrolled ?? 0}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shadow-xs">
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase">Sudah Hadir</p>
                        <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                          {summary?.attendedCount ?? 0} <span className="text-[10px] font-normal">({summary?.attendancePercentage ?? 0}%)</span>
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 shadow-xs">
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold uppercase">Belum Hadir</p>
                        <p className="text-base font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">
                          {summary?.notAttendedCount ?? 0}
                        </p>
                      </div>
                    </div>

                    {/* Filter & Search Toolbar */}
                    <div className="space-y-2 mb-2.5">
                      <div className="flex items-center gap-1 p-1 bg-oxford-200/60 dark:bg-oxford-900 rounded-xl text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setParticipantFilter("all")}
                          className={`flex-1 py-1 rounded-lg transition-all ${
                            participantFilter === "all"
                              ? "bg-white dark:bg-[#161B2A] text-oxford-950 dark:text-white shadow-xs"
                              : "text-oxford-600 dark:text-oxford-400"
                          }`}
                        >
                          Semua ({summary?.totalEnrolled ?? 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setParticipantFilter("attended")}
                          className={`flex-1 py-1 rounded-lg transition-all ${
                            participantFilter === "attended"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-oxford-600 dark:text-oxford-400"
                          }`}
                        >
                          Hadir ({summary?.attendedCount ?? 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setParticipantFilter("not_attended")}
                          className={`flex-1 py-1 rounded-lg transition-all ${
                            participantFilter === "not_attended"
                              ? "bg-amber-600 text-white shadow-xs"
                              : "text-oxford-600 dark:text-oxford-400"
                          }`}
                        >
                          Belum ({summary?.notAttendedCount ?? 0})
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-2.5 text-oxford-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama, NIP, atau OPD..."
                            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl text-xs text-oxford-900 dark:text-white placeholder-oxford-400 focus:outline-none focus:border-gold-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => selectedLessonId && void fetchSummary(selectedLessonId)}
                          disabled={loadingSummary}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 text-xs font-bold text-oxford-700 dark:text-oxford-300 hover:border-gold-500 disabled:opacity-50 shrink-0"
                          title="Segarkan Rekap Presensi"
                        >
                          <RefreshCw size={13} className={loadingSummary ? "animate-spin text-gold-500" : ""} />
                          <span>Segarkan</span>
                        </button>
                      </div>
                    </div>

                    {/* Participant Scrollable List */}
                    <div className="flex-1 max-h-[260px] overflow-y-auto space-y-2 pr-1">
                      {loadingSummary ? (
                        <div className="py-12 text-center text-xs text-oxford-500 flex flex-col items-center gap-2">
                          <Loader2 size={24} className="animate-spin text-gold-500" />
                          <span>Memuat daftar kehadiran peserta...</span>
                        </div>
                      ) : filteredParticipants.length === 0 ? (
                        <div className="py-10 text-center text-xs text-oxford-500 dark:text-oxford-400">
                          {searchQuery ? "Tidak ada peserta yang cocok dengan kata kunci pencarian." : "Belum ada data peserta."}
                        </div>
                      ) : (
                        filteredParticipants.map((p) => (
                          <div
                            key={p.userId}
                            className={`p-2.5 rounded-xl border flex items-start justify-between gap-3 text-xs transition-colors ${
                              p.isAttended
                                ? "bg-white dark:bg-[#161B2A] border-emerald-200/80 dark:border-emerald-900/60"
                                : "bg-white/60 dark:bg-[#161B2A]/60 border-oxford-200/80 dark:border-oxford-800"
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  p.isAttended
                                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                    : "bg-oxford-100 dark:bg-oxford-800 text-oxford-600 dark:text-oxford-400 border border-oxford-200 dark:border-oxford-700"
                                }`}
                              >
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-oxford-900 dark:text-white truncate">{p.name}</p>
                                <p className="text-[11px] text-oxford-500 dark:text-oxford-400 font-mono">{p.nip}</p>
                                <p className="text-[10px] text-oxford-500 dark:text-oxford-400 line-clamp-1">{p.instansiAsal}</p>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              {p.isAttended ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                                  <CheckCircle2 size={11} /> Hadir
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold">
                                  Belum Hadir
                                </span>
                              )}
                              {p.attendedAt && (
                                <p className="text-[10px] text-oxford-500 dark:text-oxford-400 mt-1 flex items-center justify-end gap-1">
                                  <Clock size={11} className="text-emerald-600 dark:text-emerald-400" />
                                  <span>{formatTime(p.attendedAt)}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
