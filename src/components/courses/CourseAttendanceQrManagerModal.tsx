"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  QrCode,
  RefreshCw,
  X,
} from "lucide-react";
import {
  generateMaterialAttendanceQr,
  getCourseContentForBuilder,
  getMaterialAttendanceQr,
  updateMaterialAttendanceQrCode,
} from "@/app/actions/builder";
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
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        } else {
          showToast.error("Gagal Memuat QR", res.error || "Gagal memuat QR presensi.");
        }
      })
      .finally(() => {
        if (active) setLoadingQr(false);
      });
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
        showToast.success("QR Presensi Diperbarui", `Token baru: ${res.code}`);
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
        showToast.success("Token Disimpan", `Token & QR diperbarui menjadi ${res.code}`);
      } else {
        showToast.error("Gagal Menyimpan Token", res.error || "Token tidak valid.");
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
                <p className="mt-5 text-sm text-oxford-300">
                  Scan QR Code di atas menggunakan tombol QR di aplikasi peserta, atau masukkan token:
                </p>
                <div className="mt-2 px-6 py-2.5 rounded-2xl bg-oxford-900 border border-oxford-700 text-xl md:text-2xl font-mono font-extrabold tracking-wider text-gold-400">
                  {qrCode}
                </div>
              </div>
            ) : (
              <p className="text-oxford-400">Tidak ada sesi wajib presensi.</p>
            )}
          </div>

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
        <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative my-auto">
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
              <div className="md:col-span-2 space-y-3 max-h-[380px] overflow-y-auto pr-1">
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

              {/* Right: QR Code & Controls */}
              <div className="md:col-span-3 flex flex-col items-center justify-center bg-oxford-50/70 dark:bg-oxford-950/60 border border-oxford-200 dark:border-oxford-800 rounded-2xl p-5">
                {activeSession && (
                  <div className="text-center mb-3">
                    <p className="text-xs font-bold text-oxford-950 dark:text-white">
                      {activeSession.lessonTitle}
                    </p>
                    <p className="text-[11px] text-oxford-500 dark:text-oxford-400">
                      {activeSession.moduleTitle} &bull; {activeSession.jp} JP
                    </p>
                  </div>
                )}

                <div className="bg-white p-3.5 rounded-2xl border border-oxford-200 shadow-xs mb-3">
                  {loadingQr ? (
                    <div className="w-52 h-52 flex items-center justify-center">
                      <Loader2 size={28} className="animate-spin text-gold-500" />
                    </div>
                  ) : qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="QR Presensi Materi"
                      className="w-52 h-52 object-contain"
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
                        {savingCode ? "Menyimpan..." : "Simpan Token"}
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

                <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => void toggleFullscreen()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-oxford-900 hover:bg-oxford-800 text-gold-400 text-xs font-bold transition-colors"
                  >
                    <Maximize2 size={14} /> Tampilkan Fullscreen
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
