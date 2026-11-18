"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  Award,
  BarChart3,
  FileText,
  AlertTriangle,
  Download,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Radio,
  FileCheck2,
} from "lucide-react";
import { type CourseAnalyticsData } from "@/app/actions/course-analytics";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import FramerFunnelChart from "@/components/charts/FramerFunnelChart";
import FramerBarChart from "@/components/charts/FramerBarChart";
import FramerGaugeChart from "@/components/charts/FramerGaugeChart";
import FramerHistogram from "@/components/charts/FramerHistogram";
import { exportExcel, type SpreadsheetRow } from "@/lib/excel-client";
import { showToast } from "@/lib/toast";

export default function CourseAnalyticsClient({
  initialData,
}: {
  initialData: CourseAnalyticsData;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "evaluations" | "atRisk">("overview");
  const [isExporting, setIsExporting] = useState(false);

  const {
    course,
    summary,
    funnel,
    sessionAttendance,
    gradeDistribution,
    kirkpatrickEvaluations,
    atRiskParticipants,
    opdBreakdown,
  } = initialData;

  const isClassical = course.trainingType === "classical_facilitation";

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const summaryRows: SpreadsheetRow[] = [
        { Indikator: "Judul Kursus", Nilai: course.title },
        { Indikator: "Pola Pelatihan", Nilai: isClassical ? "Klasikal / Fasilitasi" : "E-Learning Mandiri" },
        { Indikator: "Target OPD", Nilai: course.targetOpd || "Semua OPD" },
        { Indikator: "Total JP Pelatihan", Nilai: `${course.jp} JP` },
        { Indikator: "Total Peserta Terdaftar", Nilai: summary.totalEnrolled },
        { Indikator: "Tingkat Kelulusan", Nilai: `${summary.completionRate}%` },
        { Indikator: "Rata-rata Presensi", Nilai: `${summary.avgAttendancePct}%` },
        { Indikator: "Indeks Kepuasan Keseluruhan", Nilai: `${kirkpatrickEvaluations.overallIndex}/100` },
      ];

      const atRiskRows: SpreadsheetRow[] = atRiskParticipants.map((p, idx) => ({
        No: idx + 1,
        Nama: p.name,
        NIP: p.nip,
        Instansi: p.instansiAsal,
        Presensi: `${p.attendancePercentage}%`,
        JP_Hadir: p.attendedJp,
        Evaluasi_Selesai: `${p.evalsDoneCount}/4 Tahap`,
        Status: p.status,
      }));

      await exportExcel(
        [
          { name: "Ringkasan Analitik", rows: summaryRows },
          { name: "Peserta Perlu Perhatian", rows: atRiskRows },
        ],
        `Analitik_${course.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}.xlsx`
      );

      showToast.success("Unduhan Berhasil", "Laporan analitik kursus berhasil diekspor.");
    } catch (err) {
      console.error(err);
      showToast.error("Ekspor Gagal", "Terjadi kesalahan saat mengunduh laporan.");
    } finally {
      setIsExporting(false);
    }
  };

  const sessionBarItems = sessionAttendance.map((s) => ({
    id: s.lessonId,
    label: s.title,
    subLabel: `${s.jp} JP • ${s.attendedCount} hadir`,
    value: s.attendanceRatePct,
    displayValue: `${s.attendanceRatePct}%`,
    highlight: s.attendanceRatePct < course.attendanceThreshold,
  }));

  const opdBarItems = opdBreakdown.map((o) => ({
    label: o.name,
    subLabel: `${o.completedCount} lulus`,
    value: o.participantCount,
    displayValue: `${o.participantCount} orang`,
  }));

  return (
    <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
      <AdminSidebar activePage="courses" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">

          {/* Navigation Bar / Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/courses"
                className="p-2.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-800 rounded-xl text-oxford-600 dark:text-oxford-300 hover:text-oxford-900 dark:hover:text-white transition-colors shadow-sm"
              >
                <ArrowLeft size={18} />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-oxford-400 uppercase tracking-wider mb-0.5">
                  <span>Katalog Kursus</span>
                  <ChevronRight size={12} />
                  <span className="text-gold-600 dark:text-gold-400">Analitik &amp; Laporan</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-oxford-900 dark:text-white truncate max-w-2xl">
                  {course.title}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/courses/${course.id}/attendance`}
                className="px-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-800 text-oxford-700 dark:text-oxford-200 hover:bg-oxford-50 dark:hover:bg-oxford-900 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <Radio size={14} className="text-rose-500 animate-pulse" /> Presensi Live
              </Link>
              <Link
                href={`/admin/courses/${course.id}/certificates`}
                className="px-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-800 text-oxford-700 dark:text-oxford-200 hover:bg-oxford-50 dark:hover:bg-oxford-900 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <FileCheck2 size={14} className="text-emerald-500" /> Sertifikat
              </Link>
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="px-4 py-2 bg-oxford-900 text-white hover:bg-gold-500 hover:text-oxford-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download size={14} /> {isExporting ? "Mengunduh..." : "Ekspor Excel"}
              </button>
            </div>
          </div>

          {/* Sub-header Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-gold-500/15 text-gold-600 dark:text-gold-400 font-bold border border-gold-500/30">
              {isClassical ? "Pelatihan Klasikal" : "E-Learning Mandiri"}
            </span>
            <span className="px-3 py-1 rounded-full bg-oxford-100 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-300 font-medium">
              Target: {course.targetOpd || "Terbuka Seluruh OPD"}
            </span>
            <span className="px-3 py-1 rounded-full bg-oxford-100 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-300 font-medium">
              Beban: {course.jp} JP (Total Sesi: {course.totalClassJp} JP)
            </span>
            <span className="px-3 py-1 rounded-full bg-oxford-100 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-300 font-medium">
              Syarat Presensi: Min. {course.attendanceThreshold}%
            </span>
            {course.instructorName && (
              <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800">
                Pengampu: {course.instructorName}
              </span>
            )}
          </div>

          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#161B2A] p-5 rounded-2xl border border-oxford-200 dark:border-oxford-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-oxford-400 uppercase tracking-wider">Peserta Terdaftar</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-oxford-900 dark:text-white">
                  {summary.totalEnrolled}
                </p>
                <p className="text-[11px] text-oxford-400 mt-0.5">
                  {summary.totalPending > 0 ? `+${summary.totalPending} menunggu persetujuan` : "Semua pendaftaran aktif"}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#161B2A] p-5 rounded-2xl border border-oxford-200 dark:border-oxford-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-oxford-400 uppercase tracking-wider">Kelulusan &amp; Sertifikat</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <Award size={16} />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {summary.completionRate}%
                </p>
                <p className="text-[11px] text-oxford-400 mt-0.5">
                  {summary.totalCompleted} dari {summary.totalEnrolled} peserta tuntas
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#161B2A] p-5 rounded-2xl border border-oxford-200 dark:border-oxford-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-oxford-400 uppercase tracking-wider">Rata-Rata Kehadiran</span>
                <div className="w-8 h-8 rounded-lg bg-gold-50 dark:bg-gold-950/40 text-gold-600 flex items-center justify-center">
                  <Clock size={16} />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-oxford-900 dark:text-white">
                  {summary.avgAttendancePct}%
                </p>
                <p className="text-[11px] text-oxford-400 mt-0.5">
                  Syarat minimal kelulusan {course.attendanceThreshold}% JP
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#161B2A] p-5 rounded-2xl border border-oxford-200 dark:border-oxford-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-oxford-400 uppercase tracking-wider">Indeks Kepuasan (SKM)</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-oxford-900 dark:text-white">
                  {kirkpatrickEvaluations.overallIndex}<span className="text-base font-normal text-oxford-400">/100</span>
                </p>
                <p className="text-[11px] text-oxford-400 mt-0.5">
                  {kirkpatrickEvaluations.totalEvaluations} ulasan evaluasi terisi
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation for Detailed Views */}
          <div className="flex items-center gap-2 border-b border-oxford-200 dark:border-oxford-800 pb-2">
            {[
              { id: "overview", label: "Corong & Retensi", icon: <BarChart3 size={15} /> },
              { id: "sessions", label: "Presensi per Sesi", icon: <Clock size={15} /> },
              { id: "evaluations", label: "Mutu & Kepuasan (Kirkpatrick)", icon: <ShieldCheck size={15} /> },
              { id: "atRisk", label: `Perlu Perhatian (${atRiskParticipants.length})`, icon: <AlertTriangle size={15} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-oxford-900 text-white shadow-md"
                    : "text-oxford-600 dark:text-oxford-400 hover:bg-oxford-100 dark:hover:bg-oxford-800"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content 1: Overview (Funnel & Grade Distribution) */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Funnel Chart (7 cols) */}
              <div className="lg:col-span-7 bg-white dark:bg-[#161B2A] p-6 sm:p-7 rounded-3xl border border-oxford-200 dark:border-oxford-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-oxford-900 dark:text-white">
                      Corong Kelulusan &amp; Retensi Peserta
                    </h3>
                    <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-0.5">
                      Memantau alur peserta mulai dari pendaftaran hingga terbitnya sertifikat.
                    </p>
                  </div>
                </div>

                <FramerFunnelChart steps={funnel} totalEnrolled={summary.totalEnrolled} />
              </div>

              {/* Grade Histogram & OPD Breakdown (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Quiz Grade Histogram */}
                <div className="bg-white dark:bg-[#161B2A] p-6 rounded-3xl border border-oxford-200 dark:border-oxford-800 shadow-sm space-y-4">
                  <h3 className="text-lg font-bold text-oxford-900 dark:text-white">
                    Sebaran Nilai Kuis &amp; Ujian
                  </h3>
                  <p className="text-xs text-oxford-500 dark:text-oxford-400">
                    Distribusi skor kelulusan kuis seluruh modul materi.
                  </p>

                  <FramerHistogram
                    buckets={gradeDistribution.buckets}
                    totalAttempts={gradeDistribution.totalAttempts}
                    highestScore={gradeDistribution.highestScore}
                    lowestScore={gradeDistribution.lowestScore}
                    avgScore={gradeDistribution.avgScore}
                    passingScore={course.passingScore}
                  />
                </div>

                {/* Top OPD Representation */}
                <div className="bg-white dark:bg-[#161B2A] p-6 rounded-3xl border border-oxford-200 dark:border-oxford-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-oxford-900 dark:text-white">
                      Sebaran OPD Terbanyak
                    </h3>
                    <Building2 size={18} className="text-oxford-400" />
                  </div>

                  <FramerBarChart items={opdBarItems.slice(0, 5)} orientation="horizontal" />
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Sessions Attendance */}
          {activeTab === "sessions" && (
            <div className="bg-white dark:bg-[#161B2A] p-6 sm:p-8 rounded-3xl border border-oxford-200 dark:border-oxford-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-xl font-bold text-oxford-900 dark:text-white">
                  Tingkat Kehadiran per Sesi Pembelajaran
                </h3>
                <p className="text-xs sm:text-sm text-oxford-500 dark:text-oxford-400 mt-1">
                  Melihat persentase kehadiran peserta di setiap sesi materi untuk mengidentifikasi materi yang memiliki presensi rendah.
                </p>
              </div>

              {sessionAttendance.length > 0 ? (
                <>
                  <FramerBarChart items={sessionBarItems} orientation="vertical" height={220} />

                  <div className="mt-8 overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-oxford-50 dark:bg-oxford-950/60 text-oxford-500 uppercase text-[11px] font-bold border-y border-oxford-100 dark:border-oxford-800">
                        <tr>
                          <th className="py-3 px-4">No</th>
                          <th className="py-3 px-4">Nama Sesi Pelajaran</th>
                          <th className="py-3 px-4">Modul</th>
                          <th className="py-3 px-4 text-center">Beban JP</th>
                          <th className="py-3 px-4 text-center">Hadir</th>
                          <th className="py-3 px-4 text-right">Persentase</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-oxford-100 dark:divide-oxford-800">
                        {sessionAttendance.map((s, idx) => (
                          <tr key={s.lessonId} className="hover:bg-oxford-50/50 dark:hover:bg-oxford-900/30">
                            <td className="py-3 px-4 font-mono text-oxford-400">#{idx + 1}</td>
                            <td className="py-3 px-4 font-bold text-oxford-900 dark:text-white">{s.title}</td>
                            <td className="py-3 px-4 text-oxford-500">{s.moduleTitle}</td>
                            <td className="py-3 px-4 text-center font-bold text-gold-600">{s.jp} JP</td>
                            <td className="py-3 px-4 text-center text-oxford-700 dark:text-oxford-300">
                              {s.attendedCount} / {summary.totalEnrolled}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                                s.attendanceRatePct >= course.attendanceThreshold
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              }`}>
                                {s.attendanceRatePct}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-oxford-400 bg-oxford-50 dark:bg-oxford-950/40 rounded-2xl border border-dashed border-oxford-200 dark:border-oxford-800 text-sm">
                  Belum ada sesi materi yang diatur dengan presensi JP pada kursus ini.
                </div>
              )}
            </div>
          )}

          {/* Tab Content 3: Kirkpatrick L1 Evaluations */}
          {activeTab === "evaluations" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#161B2A] p-6 sm:p-8 rounded-3xl border border-oxford-200 dark:border-oxford-800 shadow-sm">
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-oxford-900 dark:text-white">
                    Indeks Kepuasan &amp; Mutu Pembelajaran (Kirkpatrick Level 1)
                  </h3>
                  <p className="text-xs sm:text-sm text-oxford-500 dark:text-oxford-400 mt-1">
                    Hasil agregasi kuesioner evaluasi narasumber, penyelenggara, pemahaman materi, dan Standar Kepuasan Masyarakat (SKM).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Gauge 1: Narasumber */}
                  <div className="bg-oxford-50 dark:bg-oxford-950/60 p-4 rounded-2xl border border-oxford-100 dark:border-oxford-800">
                    <FramerGaugeChart
                      score={kirkpatrickEvaluations.narasumber.index100}
                      displayValue={`${kirkpatrickEvaluations.narasumber.avgScore || 0}`}
                      title="Mutu Narasumber"
                      subTitle={`Skala 1-4 (${kirkpatrickEvaluations.narasumber.responses} ulasan)`}
                      colorScheme="emerald"
                    />
                  </div>

                  {/* Gauge 2: Penyelenggara */}
                  <div className="bg-oxford-50 dark:bg-oxford-950/60 p-4 rounded-2xl border border-oxford-100 dark:border-oxford-800">
                    <FramerGaugeChart
                      score={kirkpatrickEvaluations.organizer.index100}
                      displayValue={`${kirkpatrickEvaluations.organizer.avgScore || 0}`}
                      title="Layanan Penyelenggara"
                      subTitle={`Skala 1-4 (${kirkpatrickEvaluations.organizer.responses} ulasan)`}
                      colorScheme="gold"
                    />
                  </div>

                  {/* Gauge 3: Pemahaman Materi */}
                  <div className="bg-oxford-50 dark:bg-oxford-950/60 p-4 rounded-2xl border border-oxford-100 dark:border-oxford-800">
                    <FramerGaugeChart
                      score={kirkpatrickEvaluations.understanding.index100}
                      displayValue={`${kirkpatrickEvaluations.understanding.avgScore || 0}`}
                      title="Tingkat Pemahaman"
                      subTitle={`Skala 1-4 (${kirkpatrickEvaluations.understanding.responses} ulasan)`}
                      colorScheme="indigo"
                    />
                  </div>

                  {/* Gauge 4: Standar Pelayanan Publik (SKM) */}
                  <div className="bg-oxford-50 dark:bg-oxford-950/60 p-4 rounded-2xl border border-oxford-100 dark:border-oxford-800">
                    <FramerGaugeChart
                      score={kirkpatrickEvaluations.skm.index100}
                      displayValue={`${kirkpatrickEvaluations.skm.avgScore || 0}`}
                      title="Indeks IKM / SKM"
                      subTitle={`Skala 1-4 (${kirkpatrickEvaluations.skm.responses} ulasan)`}
                      colorScheme="auto"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 4: At-Risk Participants */}
          {activeTab === "atRisk" && (
            <div className="bg-white dark:bg-[#161B2A] p-6 sm:p-8 rounded-3xl border border-oxford-200 dark:border-oxford-800 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-oxford-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle size={20} className="text-amber-500" /> Peserta yang Perlu Perhatian
                  </h3>
                  <p className="text-xs sm:text-sm text-oxford-500 dark:text-oxford-400 mt-1">
                    Peserta yang tingkat presensinya masih di bawah batas minimal ({course.attendanceThreshold}%) atau belum melengkapi rangkaian 4 tahap evaluasi.
                  </p>
                </div>
              </div>

              {atRiskParticipants.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-oxford-50 dark:bg-oxford-950/60 text-oxford-500 uppercase text-[11px] font-bold border-y border-oxford-100 dark:border-oxford-800">
                      <tr>
                        <th className="py-3 px-4">Nama Peserta</th>
                        <th className="py-3 px-4">NIP</th>
                        <th className="py-3 px-4">Perangkat Daerah (OPD)</th>
                        <th className="py-3 px-4 text-center">Presensi (% JP)</th>
                        <th className="py-3 px-4 text-center">Status Evaluasi</th>
                        <th className="py-3 px-4 text-center">Kendala Utama</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-oxford-100 dark:divide-oxford-800">
                      {atRiskParticipants.map((p) => {
                        const attInsufficient = p.attendancePercentage < course.attendanceThreshold;
                        const evalsIncomplete = !p.allEvaluationsCompleted;

                        return (
                          <tr key={p.enrollmentId} className="hover:bg-oxford-50/50 dark:hover:bg-oxford-900/30">
                            <td className="py-3 px-4 font-bold text-oxford-900 dark:text-white">{p.name}</td>
                            <td className="py-3 px-4 font-mono text-oxford-500">{p.nip}</td>
                            <td className="py-3 px-4 text-oxford-600 dark:text-oxford-300">{p.instansiAsal}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                                attInsufficient
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              }`}>
                                {p.attendancePercentage}% ({p.attendedJp} JP)
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                                evalsIncomplete
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              }`}>
                                {p.evalsDoneCount}/4 Tahap
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-xs">
                              {attInsufficient && evalsIncomplete ? (
                                <span className="text-rose-600 dark:text-rose-400 font-bold">Presensi Kurang &amp; Evaluasi Kosong</span>
                              ) : attInsufficient ? (
                                <span className="text-rose-600 dark:text-rose-400 font-semibold">Presensi &lt; {course.attendanceThreshold}%</span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">Evaluasi Belum Lengkap</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-sm font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 size={18} /> Luar biasa! Seluruh peserta memenuhi ambang batas presensi dan evaluasi.
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
