import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, QrCode } from "lucide-react";
import { getAuthSession } from "@/app/actions/auth";
import { getAttendanceScanContext } from "@/app/actions/attendance";
import AttendanceScanClient from "./scan-client";

interface PageProps {
  searchParams: Promise<{
    courseId?: string;
    lessonId?: string;
    code?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function AttendanceScanPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const courseId = (params.courseId || "").trim();
  const lessonId = (params.lessonId || "").trim();
  const code = (params.code || "").trim();

  // If parameters are completely missing
  if (!courseId || !code) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <QrCode size={32} />
          </div>
          <h1 className="text-xl font-bold font-serif text-slate-900 dark:text-white">
            Tautan Presensi Tidak Lengkap
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pastikan Anda memindai kode QR resmi yang ditayangkan oleh pengampu atau panitia di layar kelas.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              <ArrowLeft size={14} /> Ke Dashboard Belajar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check login state: if not logged in, preserve the full scan URL so after login it bounces straight back!
  const session = await getAuthSession();
  if (!session) {
    const callbackTarget = `/attendance/scan?courseId=${encodeURIComponent(courseId)}${
      lessonId ? `&lessonId=${encodeURIComponent(lessonId)}` : ""
    }&code=${encodeURIComponent(code)}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackTarget)}`);
  }

  // Load session & course context
  const context = await getAttendanceScanContext({
    courseId,
    lessonId,
    code,
  });

  if (!context.success || !context.course || !context.lesson) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-xl font-bold font-serif text-slate-900 dark:text-white">
            Sesi Presensi Tidak Ditemukan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {context.error || "Materi atau kelas pelatihan tidak sesuai dengan kode yang dipindai."}
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
            >
              <ArrowLeft size={14} /> Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AttendanceScanClient
      course={context.course}
      lesson={context.lesson}
      userState={
        context.userState || {
          isLoggedIn: true,
          user: null,
          isEnrolled: false,
          statementAccepted: true,
          alreadyAttended: false,
          attendedAt: null,
          attendedJp: 0,
          attendancePercentage: 0,
        }
      }
      code={code}
    />
  );
}
