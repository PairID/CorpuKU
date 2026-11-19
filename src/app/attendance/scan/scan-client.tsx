"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  ArrowRight,
  User,
  Building2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { submitMaterialAttendance } from "@/app/actions/attendance";

interface AttendanceScanClientProps {
  course: {
    id: string;
    title: string;
    type: string;
    totalJp: number;
    image: string | null;
  };
  lesson: {
    id: string;
    title: string;
    jp: number;
    moduleTitle: string;
    narasumberName: string | null;
    attendanceCode: string;
  };
  userState: {
    isLoggedIn: boolean;
    user: {
      id: string;
      name: string;
      nip: string;
      instansiAsal: string;
      jabatan: string;
    } | null;
    isEnrolled: boolean;
    statementAccepted: boolean;
    alreadyAttended: boolean;
    attendedAt: string | null;
    attendedJp: number;
    attendancePercentage: number;
  };
  code: string;
}

export default function AttendanceScanClient({
  course,
  lesson,
  userState,
  code,
}: AttendanceScanClientProps) {
  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">(
    userState.alreadyAttended ? "already" : "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [resultData, setResultData] = useState<{
    attendedJp: number;
    totalClassJp: number;
    attendancePercentage: number;
    attendedAt?: string;
  }>({
    attendedJp: userState.attendedJp,
    totalClassJp: course.totalJp,
    attendancePercentage: userState.attendancePercentage,
    attendedAt: userState.attendedAt || undefined,
  });

  const [isPending, startTransition] = useTransition();

  const performAttendance = () => {
    setStatus("loading");
    setErrorMessage("");

    startTransition(async () => {
      try {
        const res = await submitMaterialAttendance({
          courseId: course.id,
          lessonId: lesson.id,
          attendanceCode: code,
          autoAcceptStatement: true,
        });

        if (res.success) {
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            try {
              navigator.vibrate([80, 40, 80]);
            } catch {
              // Ignore vibrate error
            }
          }

          setResultData({
            attendedJp: res.attendedJp ?? userState.attendedJp,
            totalClassJp: res.totalClassJp ?? course.totalJp,
            attendancePercentage: res.attendancePercentage ?? userState.attendancePercentage,
            attendedAt: res.attendedAt || new Date().toISOString(),
          });

          if (res.alreadyAttended) {
            setStatus("already");
          } else {
            setStatus("success");
          }
        } else {
          setErrorMessage(res.error || "Gagal mencatat presensi.");
          setStatus("error");
        }
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : "Terjadi kesalahan saat menghubungi server."
        );
        setStatus("error");
      }
    });
  };

  useEffect(() => {
    if (!userState.alreadyAttended) {
      performAttendance();
    }
  }, []);

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "Baru saja";
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pb-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold font-serif text-sm">
            CK
          </div>
          <span className="font-serif font-bold text-lg tracking-tight">
            Corpu<span className="text-amber-500 font-sans">KU</span>
          </span>
        </Link>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Presensi Digital
        </span>
      </div>

      {/* Main Content Card */}
      <main className="w-full max-w-md mx-auto my-auto">
        <div className="bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* STATE 1: LOADING */}
          {status === "loading" && (
            <div className="text-center py-10 space-y-4">
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping" />
                <div className="w-16 h-16 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">
                  Mencatat Presensi...
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Menghubungkan akun Anda ke sesi pelatihan ini.
                </p>
              </div>
            </div>
          )}

          {/* STATE 2: SUCCESS (BARU SAJA MASUK) */}
          {status === "success" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-400 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/15 animate-in zoom-in-50 duration-300">
                  <CheckCircle2 size={44} className="stroke-[2.5]" />
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                  <Sparkles size={13} className="text-amber-500" /> Presensi Berhasil Dicatat!
                </div>
                <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
                  Selamat Mengikuti Sesi
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kehadiran Anda pada sesi ini telah resmi tercatat ke sistem dan log JP.
                </p>
              </div>

              {/* Session & Participant Details Card */}
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    {lesson.moduleTitle}
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {lesson.title}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Bobot Materi:</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">+{lesson.jp} JP</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Waktu Hadir:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {formatDateTime(resultData.attendedAt)}
                    </p>
                  </div>
                </div>

                {lesson.narasumberName && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Narasumber:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {lesson.narasumberName}
                    </span>
                  </div>
                )}

                {userState.user && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Peserta:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                      {userState.user.name} ({userState.user.nip})
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Summary Pill */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <Award size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Akumulasi Kehadiran</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {resultData.attendedJp} dari {resultData.totalClassJp} Total JP
                    </p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                  {resultData.attendancePercentage}%
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Link
                  href={`/learn/${course.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all active:scale-[0.98]"
                >
                  <BookOpen size={16} /> Masuk ke Materi Pelatihan <ChevronRight size={16} />
                </Link>
                <Link
                  href="/dashboard"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
                >
                  Buka Dashboard Utama
                </Link>
              </div>
            </div>
          )}

          {/* STATE 3: ALREADY ATTENDED */}
          {status === "already" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-950/80 border-2 border-blue-400 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/15">
                  <ShieldCheck size={44} className="stroke-[2.5]" />
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700/60 text-xs font-extrabold text-blue-700 dark:text-blue-300">
                  Kehadiran Sudah Tercatat Sebelumnya
                </div>
                <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
                  Anda Sudah Hadir
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Data presensi Anda pada sesi ini sudah terekam dengan baik.
                </p>
              </div>

              {/* Details */}
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    {lesson.moduleTitle}
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {lesson.title}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Bobot Materi:</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">+{lesson.jp} JP</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Waktu Presensi:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {formatDateTime(resultData.attendedAt)}
                    </p>
                  </div>
                </div>

                {userState.user && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Peserta:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                      {userState.user.name} ({userState.user.nip})
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Summary Pill */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <Award size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Akumulasi Kehadiran</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {resultData.attendedJp} dari {resultData.totalClassJp} Total JP
                    </p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                  {resultData.attendancePercentage}%
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Link
                  href={`/learn/${course.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all active:scale-[0.98]"
                >
                  <BookOpen size={16} /> Buka Ruang Kelas <ChevronRight size={16} />
                </Link>
                <Link
                  href="/dashboard"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
                >
                  Kembali ke Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* STATE 4: ERROR */}
          {status === "error" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-950/80 border-2 border-red-400 text-red-600 dark:text-red-400 flex items-center justify-center shadow-lg shadow-red-500/15">
                  <AlertCircle size={44} className="stroke-[2.5]" />
                </div>
                <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
                  Presensi Belum Berhasil
                </h2>
                <p className="text-xs text-red-600 dark:text-red-400 px-2 font-medium">
                  {errorMessage || "Kode QR tidak sesuai atau sesi presensi telah berakhir."}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 text-xs space-y-2">
                <p className="font-bold text-slate-800 dark:text-slate-200">Tips Mengatasi:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                  <li>Pastikan Anda terhubung ke internet.</li>
                  <li>Scan kembali QR code terbaru yang ditayangkan presenter di layar.</li>
                  <li>Jika sesi baru saja dibuka, klik tombol <strong>Coba Lagi</strong> di bawah.</li>
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={performAttendance}
                  disabled={isPending}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all disabled:opacity-50"
                >
                  <RefreshCw size={16} className={isPending ? "animate-spin" : ""} />
                  {isPending ? "Mencoba Kembali..." : "Coba Presensi Lagi"}
                </button>
                <Link
                  href="/dashboard"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
                >
                  Kembali ke Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="w-full max-w-md mx-auto text-center pt-4 text-[11px] text-slate-400 dark:text-slate-500">
        Badan Pengembangan Sumber Daya Manusia Provinsi Kalimantan Utara
      </footer>
    </div>
  );
}
