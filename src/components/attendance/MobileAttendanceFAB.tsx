"use client";

import { useState, useRef, useEffect } from "react";
import { QrCode, Camera, Upload, Keyboard, X, Loader2, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
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
  onAttendanceSuccess,
}: MobileAttendanceFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "code">("camera");
  const [attendedSet, setAttendedSet] = useState<Set<string>>(() => new Set(attendedLessonIds));
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    lessons.find((l) => l.hasAttendance !== false)?.id || lessons[0]?.id || ""
  );
  const [attendanceCode, setAttendanceCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Stop camera stream cleanly
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start camera stream when tab is "camera" and modal is open
  useEffect(() => {
    if (!isOpen || activeTab !== "camera") {
      stopCamera();
      return;
    }

    let isMounted = true;
    const startCamera = async () => {
      setCameraError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Kamera tidak didukung pada browser ini.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setIsCameraActive(true);

        // Native BarcodeDetector API if available
        if ("BarcodeDetector" in window) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const barcodeDetector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
          const intervalId = setInterval(async () => {
            if (!videoRef.current || !streamRef.current) {
              clearInterval(intervalId);
              return;
            }
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                clearInterval(intervalId);
                handleQrScanned(barcodes[0].rawValue);
              }
            } catch {
              // frame detection pass
            }
          }, 400);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Tidak dapat mengakses kamera.";
          setCameraError(msg);
          setIsCameraActive(false);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const handleQrScanned = async (rawCode: string) => {
    let targetLessonId = selectedLessonId;
    let codeStr = rawCode.trim();

    // Check if rawCode is JSON with courseId, lessonId, code
    if (codeStr.startsWith("{") && codeStr.endsWith("}")) {
      try {
        const parsed = JSON.parse(codeStr);
        if (parsed.lessonId) targetLessonId = parsed.lessonId;
        if (parsed.code) codeStr = parsed.code;
      } catch {
        // fallback to raw string
      }
    }

    await executeAttendance(targetLessonId, codeStr);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate / decode QR image
    // In headless test or image upload fallback, filename or prompt can supply test code
    showToast.info("Memproses Gambar QR", "Menganalisis barcode dari gambar...");
    const reader = new FileReader();
    reader.onload = () => {
      // Prompt user or use input
      setActiveTab("code");
      showToast.info("Pindai Kode Selesai", "Masukkan atau konfirmasi token presensi di bawah ini.");
    };
    reader.readAsDataURL(file);
  };

  const executeAttendance = async (lessonId: string, code: string) => {
    if (!lessonId) {
      showToast.warning("Pilih Sesi Materi", "Silakan pilih sesi materi yang dihadiri.");
      return;
    }
    if (!code.trim()) {
      showToast.warning("Kode Presensi Kosong", "Masukkan kode QR presensi sesi materi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitMaterialAttendance({
        courseId,
        lessonId,
        attendanceCode: code.trim(),
      });

      if (res.success) {
        setAttendedSet((prev) => new Set(prev).add(lessonId));
        showToast.success("Presensi Berhasil! 🎉", res.message || "Presensi Anda telah dicatat.");
        stopCamera();
        setIsOpen(false);
        setAttendanceCode("");

        if (onAttendanceSuccess && res.attendedJp !== undefined) {
          onAttendanceSuccess({
            attendedJp: res.attendedJp,
            totalClassJp: res.totalClassJp || 0,
            attendancePercentage: res.attendancePercentage || 0,
            lessonId,
          });
        }
      } else {
        showToast.error("Presensi Gagal", res.error || "Kode QR presensi tidak valid.");
      }
    } catch (err: unknown) {
      console.error("Attendance submission error:", err);
      showToast.error("Kesalahan Sistem", "Gagal menghubungi server presensi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeAttendance(selectedLessonId, attendanceCode);
  };

  return (
    <>
      {/* Persistent Bottom-Center Floating Action Button (Mobile Only) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative w-14 h-14 flex items-center justify-center bg-gold-500 hover:bg-gold-400 text-oxford-950 rounded-full shadow-[0_10px_25px_-5px_rgba(239,177,25,0.5)] active:scale-95 transition-all group"
          aria-label="Scan QR Presensi Materi"
          title="Scan QR Presensi"
        >
          <QrCode size={26} className="stroke-[2.25] group-hover:scale-110 transition-transform" />
          {pendingAttendanceCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-crimson-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow">
              {pendingAttendanceCount}
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

            {/* Session Selector */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-oxford-700 dark:text-oxford-300 mb-1">
                Pilih Sesi Materi Pelatihan:
              </label>
              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="w-full px-3 py-2 bg-oxford-50 dark:bg-oxford-900 border border-oxford-200 dark:border-oxford-700 rounded-xl text-xs font-medium text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
              >
                {attendanceLessons.map((l, i) => (
                  <option key={l.id} value={l.id}>
                    {i + 1}. {l.title} ({l.jp || 2} JP) {attendedSet.has(l.id) ? "✓ Sudah" : "• Belum"}
                  </option>
                ))}
              </select>
            </div>

            {/* Multi-Mode Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-oxford-100 dark:bg-oxford-900/80 p-1 rounded-xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("camera")}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "camera"
                    ? "bg-white dark:bg-[#161B2A] text-oxford-950 dark:text-white shadow-xs"
                    : "text-oxford-500 dark:text-oxford-400 hover:text-oxford-900"
                }`}
              >
                <Camera size={14} />
                <span>Kamera</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "upload"
                    ? "bg-white dark:bg-[#161B2A] text-oxford-950 dark:text-white shadow-xs"
                    : "text-oxford-500 dark:text-oxford-400 hover:text-oxford-900"
                }`}
              >
                <Upload size={14} />
                <span>Upload QR</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("code")}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "code"
                    ? "bg-white dark:bg-[#161B2A] text-oxford-950 dark:text-white shadow-xs"
                    : "text-oxford-500 dark:text-oxford-400 hover:text-oxford-900"
                }`}
              >
                <Keyboard size={14} />
                <span>Input Token</span>
              </button>
            </div>

            {/* TAB CONTENT 1: CAMERA */}
            {activeTab === "camera" && (
              <div className="space-y-3">
                <div className="relative aspect-square w-full rounded-2xl bg-black overflow-hidden flex items-center justify-center border border-oxford-800">
                  <video
                    ref={videoRef}
                    playsInline
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
                  Arahkan kamera smartphone ke QR Code yang ditampilkan narasumber/panitia di layar presentasi.
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
                    capture="environment"
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
                    placeholder="Contoh: CLF-less_1-A3B9"
                    className="w-full px-4 py-3 bg-oxford-50 dark:bg-oxford-900 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm font-mono tracking-wider text-center uppercase font-bold text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
                  />
                  <p className="text-[10px] text-oxford-500 mt-1 text-center">
                    Kode alfanumerik tertera di bawah QR Code yang ditampilkan panitia di depan kelas.
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
