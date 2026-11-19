"use client";

import { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";
import { QrCode, Camera, Upload, Keyboard, X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { submitMaterialAttendance, getMaterialAttendances } from "@/app/actions/attendance";
import { showToast } from "@/lib/toast";

interface LessonOption {
  id: string;
  title: string;
  jp?: number;
  hasAttendance?: boolean;
  attendanceQrCode?: string | null;
}

interface MobileAttendanceFABProps {
  courseId: string;
  courseTitle?: string;
  lessons?: LessonOption[];
  attendedLessonIds?: string[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAttendanceSuccess?: (data: {
    attendedJp: number;
    totalClassJp: number;
    attendancePercentage: number;
    lessonId: string;
  }) => void;
}

export default function MobileAttendanceFAB({
  courseId,
  courseTitle,
  lessons = [],
  attendedLessonIds = [],
  isOpen: propIsOpen,
  onOpenChange,
  onAttendanceSuccess,
}: MobileAttendanceFABProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalOpen;
  const setIsOpen = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    setInternalOpen(val);
  };
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "code">("code");
  const [attendedSet, setAttendedSet] = useState<Set<string>>(() => new Set(attendedLessonIds));
  const [attendanceCode, setAttendanceCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scanLockRef = useRef(false);

  // Filter lessons that require attendance
  const attendanceLessons = lessons.filter((l) => l.hasAttendance !== false);
  const pendingAttendanceCount = attendanceLessons.filter((l) => !attendedSet.has(l.id)).length;

  useEffect(() => {
    let active = true;
    getMaterialAttendances(courseId).then((res) => {
      if (active && res.success && Array.isArray(res.attendedLessonIds)) {
        setAttendedSet(new Set(res.attendedLessonIds));
      }
    });
    return () => {
      active = false;
    };
  }, [courseId]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const executeAttendance = async (rawCode: string, explicitLessonId?: string) => {
    if (!rawCode.trim()) {
      showToast.warning("Kode Presensi Kosong", "Scan QR Code atau masukkan token presensi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitMaterialAttendance({
        courseId,
        lessonId: explicitLessonId,
        attendanceCode: rawCode.trim(),
      });

      if (res.success) {
        const matchedLessonId = res.lessonId || explicitLessonId || "";
        if (matchedLessonId) {
          setAttendedSet((prev) => new Set(prev).add(matchedLessonId));
        }
        showToast.success("Presensi Berhasil! 🎉", res.message || "Presensi Anda telah dicatat.");
        stopCamera();
        setIsOpen(false);
        setAttendanceCode("");

        if (onAttendanceSuccess && res.attendedJp !== undefined) {
          onAttendanceSuccess({
            attendedJp: res.attendedJp,
            totalClassJp: res.totalClassJp || 0,
            attendancePercentage: res.attendancePercentage || 0,
            lessonId: matchedLessonId,
          });
        }
      } else {
        showToast.error("Presensi Gagal", res.error || "Kode QR presensi tidak valid.");
        scanLockRef.current = false;
      }
    } catch (err: unknown) {
      console.error("Attendance submission error:", err);
      showToast.error("Kesalahan Sistem", "Gagal menghubungi server presensi.");
      scanLockRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQrScanned = async (rawCode: string) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;

    let targetLessonId: string | undefined;
    let codeStr = rawCode.trim();

    // Support URL QR code (https://corpuku.../attendance/scan?courseId=...&lessonId=...&code=...)
    if (codeStr.includes("/attendance/scan") || codeStr.startsWith("http://") || codeStr.startsWith("https://")) {
      try {
        const urlObj = new URL(codeStr);
        const qCode = urlObj.searchParams.get("code");
        const qLessonId = urlObj.searchParams.get("lessonId");
        if (qCode) codeStr = qCode.trim();
        if (qLessonId) targetLessonId = qLessonId.trim();
      } catch {
        const codeMatch = codeStr.match(/[?&]code=([^&]+)/);
        const lessonMatch = codeStr.match(/[?&]lessonId=([^&]+)/);
        if (codeMatch) codeStr = decodeURIComponent(codeMatch[1]).trim();
        if (lessonMatch) targetLessonId = decodeURIComponent(lessonMatch[1]).trim();
      }
    } else if (codeStr.startsWith("{") && codeStr.endsWith("}")) {
      try {
        const parsed = JSON.parse(codeStr);
        if (parsed.lessonId) targetLessonId = String(parsed.lessonId);
        if (parsed.code) codeStr = String(parsed.code);
      } catch {
        // fallback to raw string
      }
    }

    await executeAttendance(codeStr, targetLessonId);
  };

  // Start camera & cross-browser jsQR frame loop (works on iOS Safari/Brave, Android, Desktop)
  useEffect(() => {
    if (!isOpen || activeTab !== "camera") {
      stopCamera();
      scanLockRef.current = false;
      return;
    }

    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    scanLockRef.current = false;

    const startCamera = async () => {
      setCameraError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Kamera tidak didukung pada browser ini.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play().catch(() => {});
        }

        intervalId = setInterval(() => {
          const video = videoRef.current;
          if (!video || !streamRef.current || scanLockRef.current) return;
          if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

          const canvas = canvasRef.current || document.createElement("canvas");
          canvasRef.current = canvas;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (decoded?.data) {
            if (intervalId) clearInterval(intervalId);
            void handleQrScanned(decoded.data);
          }
        }, 250);
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Tidak dapat mengakses kamera.";
          setCameraError(msg);
        }
      }
    };

    void startCamera();

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      stopCamera();
    };
  }, [isOpen, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height);
        if (decoded?.data) {
          void handleQrScanned(decoded.data);
        } else {
          setActiveTab("code");
          showToast.warning(
            "QR Tidak Terbaca",
            "Gambar QR tidak terbaca jelas. Silakan masukkan token presensi secara manual."
          );
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeAttendance(attendanceCode);
  };

  return (
    <>
      {/* Persistent Bottom-Right Floating Action Button (Mobile & Laptop/Desktop) */}
      <div className="fixed bottom-5 right-4 md:bottom-6 md:right-6 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative flex items-center gap-2 px-3.5 py-3 md:px-4 md:py-3 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold text-xs rounded-full shadow-[0_10px_25px_-5px_rgba(239,177,25,0.5)] active:scale-95 transition-all group border border-gold-300"
          aria-label="Scan QR Presensi Materi"
          title="Buka form presensi materi (Scan QR / Upload Foto / Input Token)"
        >
          <QrCode size={20} className="stroke-[2.25] group-hover:scale-110 transition-transform shrink-0" />
          <span className="hidden sm:inline font-sans">Presensi Kehadiran</span>
          {pendingAttendanceCount > 0 ? (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-crimson-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow">
              {pendingAttendanceCount} Sesi Belum
            </span>
          ) : (
            <span className="hidden md:inline-flex items-center text-[10px] text-emerald-900 font-extrabold bg-emerald-300/80 px-2 py-0.5 rounded-full">
              Lengkap
            </span>
          )}
        </button>
      </div>

      {/* Multi-Mode Scanner Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#161B2A] border-t sm:border border-oxford-200 dark:border-oxford-700 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-oxford-100 dark:border-oxford-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gold-100 dark:bg-gold-950 text-gold-700 dark:text-gold-300 rounded-xl">
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-oxford-900 dark:text-white">
                    Scan Presensi Materi
                  </h3>
                  <p className="text-[11px] text-oxford-500 dark:text-oxford-400 line-clamp-1">
                    {courseTitle || "Pelatihan Fasilitasi OPD Luar"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setIsOpen(false);
                }}
                className="p-1.5 text-oxford-400 hover:text-oxford-700 dark:hover:text-white rounded-lg hover:bg-oxford-100 dark:hover:bg-oxford-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Status Notifikasi Presensi Per Sesi */}
            {attendanceLessons.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-oxford-50 dark:bg-oxford-900/70 border border-oxford-200 dark:border-oxford-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-oxford-700 dark:text-oxford-200">Status Presensi Kelas Ini</span>
                  <span className={pendingAttendanceCount === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                    {pendingAttendanceCount === 0
                      ? "Semua Sesi Sudah Presensi"
                      : `${pendingAttendanceCount} Sesi Belum Presensi`}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {attendanceLessons.map((l, idx) => {
                    const isDone = attendedSet.has(l.id);
                    return (
                      <div
                        key={l.id}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${
                          isDone
                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200"
                        }`}
                      >
                        <span className="truncate font-semibold">
                          {idx + 1}. {l.title} ({l.jp || 2} JP)
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold shrink-0">
                          {isDone ? (
                            <>
                              <CheckCircle2 size={12} className="text-emerald-600" /> Sudah
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={12} className="text-amber-600" /> Belum
                            </>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Multi-Mode Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-oxford-100 dark:bg-oxford-900/80 p-1 rounded-xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab("code");
                }}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "code"
                    ? "bg-white dark:bg-[#161B2A] text-oxford-950 dark:text-white shadow-xs"
                    : "text-oxford-500 dark:text-oxford-400 hover:text-oxford-900 dark:hover:text-white"
                }`}
              >
                <Keyboard size={14} />
                <span>Input Token</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("camera")}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "camera"
                    ? "bg-white dark:bg-[#161B2A] text-oxford-950 dark:text-white shadow-xs"
                    : "text-oxford-500 dark:text-oxford-400 hover:text-oxford-900 dark:hover:text-white"
                }`}
              >
                <Camera size={14} />
                <span>Kamera / Webcam</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab("upload");
                }}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "upload"
                    ? "bg-white dark:bg-[#161B2A] text-oxford-950 dark:text-white shadow-xs"
                    : "text-oxford-500 dark:text-oxford-400 hover:text-oxford-900 dark:hover:text-white"
                }`}
              >
                <Upload size={14} />
                <span>Upload QR</span>
              </button>
            </div>

            {/* TAB CONTENT 1: CAMERA */}
            {activeTab === "camera" && (
              <div className="space-y-3">
                <div className="relative aspect-square w-full rounded-2xl bg-black overflow-hidden flex items-center justify-center border border-oxford-800">
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder Overlay */}
                  <div className="absolute inset-0 border-2 border-gold-400/40 pointer-events-none flex items-center justify-center">
                    <div className="w-52 h-52 border-2 border-gold-400 rounded-2xl relative shadow-[0_0_20px_rgba(239,177,25,0.3)]">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-gold-400 -mt-1 -ml-1"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-gold-400 -mt-1 -mr-1"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-gold-400 -mb-1 -ml-1"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-gold-400 -mb-1 -mr-1"></div>
                    </div>
                  </div>
                  {isSubmitting && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-xs gap-2">
                      <Loader2 size={28} className="animate-spin text-gold-400" />
                      <span>Mencatat presensi...</span>
                    </div>
                  )}
                  {cameraError && (
                    <div className="absolute inset-0 bg-oxford-950/90 p-4 flex flex-col items-center justify-center text-center text-xs text-oxford-300">
                      <AlertTriangle size={28} className="text-amber-400 mb-2" />
                      <p className="font-bold text-white mb-1">Akses Kamera Terkendala</p>
                      <p className="mb-3">{cameraError}</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("code")}
                        className="px-4 py-2 bg-gold-500 text-oxford-950 font-bold rounded-lg text-xs"
                      >
                        Beralih ke Input Token Manual
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-center text-oxford-500 dark:text-oxford-400">
                  Arahkan kamera ke QR Code dari Admin. Sesi/modul akan terdeteksi otomatis.
                </p>
              </div>
            )}

            {/* TAB CONTENT 2: UPLOAD IMAGE */}
            {activeTab === "upload" && (
              <div className="space-y-4 text-center py-4">
                <label className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-oxford-300 dark:border-oxford-700 rounded-2xl cursor-pointer hover:border-gold-500 hover:bg-gold-50/20 transition-all">
                  <div className="w-14 h-14 bg-oxford-100 dark:bg-oxford-900 rounded-2xl flex items-center justify-center text-oxford-500 dark:text-oxford-400">
                    <Upload size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-oxford-800 dark:text-oxford-200">
                      Pilih Foto / Tangkapan Layar QR
                    </p>
                    <p className="text-[10px] text-oxford-400 mt-0.5">JPG, PNG, atau WebP</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTab("code")}
                  className="text-xs text-gold-600 font-bold hover:underline"
                >
                  Atau masukkan kode presensi secara manual &rarr;
                </button>
              </div>
            )}

            {/* TAB CONTENT 3: MANUAL TOKEN INPUT */}
            {activeTab === "code" && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-oxford-700 dark:text-oxford-300 mb-1">
                    Kode Presensi Sesi Materi <span className="text-crimson-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={attendanceCode}
                    onChange={(e) => setAttendanceCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: CLF-1794872162-CDE6B1"
                    className="w-full px-4 py-3 bg-oxford-50 dark:bg-oxford-900 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm font-mono tracking-wider text-center uppercase font-bold text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
                  />
                  <p className="text-[10px] text-oxford-500 mt-1 text-center">
                    Masukkan kode di bawah QR Code. Sistem otomatis mencocokkan modul/sesinya.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!attendanceCode.trim() || isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-oxford-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  <span>Kirim Presensi Kehadiran</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
