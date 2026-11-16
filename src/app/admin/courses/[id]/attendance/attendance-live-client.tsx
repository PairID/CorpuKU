"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Radio,
  Pause,
  Play,
  RefreshCw,
  Search,
  Users,
  CheckCircle2,
  Clock,
  Award,
  Layers,
  Download,
} from "lucide-react";
import { getCourseAttendanceLive } from "@/app/actions/attendance";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { exportExcel, type SpreadsheetRow } from "@/lib/excel-client";

interface AttendanceSessionItem {
  id: string;
  title: string;
  moduleTitle: string;
  jp: number;
  qrCode: string | null;
  speakerName: string | null;
}

interface ParticipantAttendanceItem {
  lessonId: string;
  jp: number;
  attendedAt: string;
}

interface ParticipantEvaluationItem {
  stage: string;
  sessionId: string | null;
  score: number | null;
  notes: string | null;
  createdAt: string;
}

interface ParticipantRow {
  enrollmentId: string;
  userId: string;
  name: string;
  nip: string;
  instansiAsal: string;
  attendedJp: number;
  attendancePercentage: number;
  statementAccepted: boolean;
  allEvaluationsCompleted: boolean;
  status: string;
  attendances: ParticipantAttendanceItem[];
  evaluations?: ParticipantEvaluationItem[];
}

export interface AttendanceLiveData {
  fetchedAt: string;
  course: {
    id: string;
    title: string;
    trainingType: string;
    targetOpd: string | null;
    attendanceThreshold: number;
    totalClassJp: number;
  };
  sessions: AttendanceSessionItem[];
  participants: ParticipantRow[];
}

const POLL_INTERVAL_MS = 4000;

export default function AttendanceLiveClient({
  courseId,
  initialData,
}: {
  courseId: string;
  initialData: AttendanceLiveData;
}) {
  const [data, setData] = useState<AttendanceLiveData>(initialData);
  const [isLive, setIsLive] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const stageAvg = (evals: ParticipantEvaluationItem[] | undefined, stage: string) => {
        const list = (evals || []).filter((e) => e.stage === stage && e.score != null);
        if (list.length === 0) return "-";
        const avg = list.reduce((acc, e) => acc + Number(e.score || 0), 0) / list.length;
        return Math.round(avg * 100) / 100;
      };

      const summaryRows: SpreadsheetRow[] = data.participants.map((p, idx) => {
        const row: SpreadsheetRow = {
          No: idx + 1,
          "Nama Peserta": p.name,
          NIP: p.nip,
          "Instansi / OPD": p.instansiAsal,
        };
        data.sessions.forEach((s, sIdx) => {
          const att = p.attendances.find((a) => a.lessonId === s.id);
          row[`Sesi ${sIdx + 1}: ${s.title}`] = att
            ? `Hadir (${new Date(att.attendedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })})`
            : "Belum Hadir";
        });
        row["Total JP Hadir"] = p.attendedJp;
        row["Total JP Kelas"] = data.course.totalClassJp;
        row["Kehadiran (%)"] = p.attendancePercentage;
        row["Syarat Kehadiran"] =
          p.attendancePercentage >= data.course.attendanceThreshold ? "Memenuhi" : "Belum Memenuhi";
        row["Nilai Narasumber"] = stageAvg(p.evaluations, "narasumber");
        row["Nilai Penyelenggara"] = stageAvg(p.evaluations, "organizer");
        row["Nilai Pemahaman Materi"] = stageAvg(p.evaluations, "understanding");
        row["Nilai SKM"] = stageAvg(p.evaluations, "skm");
        row["Status Evaluasi"] = p.allEvaluationsCompleted ? "Tuntas" : "Belum Tuntas";
        row["Status Kelas"] = p.status === "completed" ? "Selesai" : "Berlangsung";
        return row;
      });

      const stageLabel: Record<string, string> = {
        narasumber: "1. Evaluasi Narasumber",
        organizer: "2. Evaluasi Penyelenggara",
        understanding: "3. Pemahaman Materi",
        skm: "4. Survei SKM (9 Unsur)",
      };

      const evalDetailRows: SpreadsheetRow[] = [];
      let evalIdx = 1;
      for (const p of data.participants) {
        for (const ev of p.evaluations || []) {
          const sess = data.sessions.find((s) => s.id === ev.sessionId);
          evalDetailRows.push({
            No: evalIdx++,
            "Nama Peserta": p.name,
            NIP: p.nip,
            "Instansi / OPD": p.instansiAsal,
            "Tahap Evaluasi": stageLabel[ev.stage] || ev.stage,
            "Sesi / Narasumber": sess
              ? `${sess.title}${sess.speakerName ? ` (${sess.speakerName})` : ""}`
              : "-",
            Skor: ev.score ?? "-",
            "Catatan / Masukan": ev.notes || "-",
            "Waktu Pengisian": new Date(ev.createdAt).toLocaleString("id-ID"),
          });
        }
      }

      const safeTitle = (data.course.title || "Laporan_Kelas")
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .slice(0, 40);
      await exportExcel(
        [
          { name: "Kehadiran & Nilai", rows: summaryRows.length ? summaryRows : [{ Info: "Belum ada peserta" }] },
          { name: "Detail Evaluasi", rows: evalDetailRows.length ? evalDetailRows : [{ Info: "Belum ada data evaluasi" }] },
        ],
        `Laporan_${safeTitle}.xlsx`
      );
    } finally {
      setIsExporting(false);
    }
  };

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await getCourseAttendanceLive(courseId);
      if (res.success && res.course) {
        setData({
          fetchedAt: res.fetchedAt!,
          course: res.course,
          sessions: res.sessions || [],
          participants: res.participants || [],
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => {
      void refreshData();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isLive, refreshData]);

  const filteredParticipants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.participants.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.nip.toLowerCase().includes(q) ||
        p.instansiAsal.toLowerCase().includes(q)
      );
    });
  }, [data.participants, searchQuery]);

  const visibleSessions = useMemo(() => {
    if (selectedSessionId === "all") return data.sessions;
    return data.sessions.filter((s) => s.id === selectedSessionId);
  }, [data.sessions, selectedSessionId]);

  const stats = useMemo(() => {
    const total = data.participants.length;
    const threshold = data.course.attendanceThreshold || 80;
    const qualifiedCount = data.participants.filter(
      (p) => p.attendancePercentage >= threshold
    ).length;
    const activeAttendees =
      selectedSessionId === "all"
        ? data.participants.filter((p) => p.attendances.length > 0).length
        : data.participants.filter((p) =>
            p.attendances.some((a) => a.lessonId === selectedSessionId)
          ).length;
    const avgPct =
      total > 0
        ? Math.round(
            (data.participants.reduce((s, p) => s + p.attendancePercentage, 0) /
              total) *
              10
          ) / 10
        : 0;
    return { total, qualifiedCount, activeAttendees, avgPct, threshold };
  }, [data.participants, data.course.attendanceThreshold, selectedSessionId]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
      <AdminSidebar
        activePage="courses"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Navigation & Live Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href={`/admin/courses/${courseId}/content`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-oxford-600 dark:text-oxford-300 hover:text-gold-600"
                >
                  <ArrowLeft size={14} /> Kembali ke Materi & QR
                </Link>
                <span className="text-oxford-300 dark:text-oxford-700">|</span>
                <Link
                  href={`/admin/courses/${courseId}/certificates`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                  <Award size={14} /> Sertifikat Kelas
                </Link>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-oxford-950 dark:text-white">
                Monitoring Presensi Live
              </h1>
              <p className="text-sm text-oxford-600 dark:text-oxford-300 mt-1">
                {data.course.title}
                {data.course.targetOpd ? ` (${data.course.targetOpd})` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border ${
                  isLive
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-oxford-100 dark:bg-oxford-900 text-oxford-600 dark:text-oxford-300 border-oxford-200 dark:border-oxford-700"
                }`}
              >
                <Radio
                  size={14}
                  className={isLive ? "animate-pulse text-emerald-600" : ""}
                />
                <span>{isLive ? "LIVE (Auto 4 dtk)" : "PAUSED"}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsLive((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 text-xs font-bold text-oxford-800 dark:text-oxford-100 hover:border-gold-500 transition-colors"
              >
                {isLive ? <Pause size={14} /> : <Play size={14} />}
                <span>{isLive ? "Jeda" : "Lanjutkan Live"}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleExportExcel()}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-60 shadow-sm"
              >
                <Download size={14} />
                <span>{isExporting ? "Menyiapkan..." : "Ekspor Excel"}</span>
              </button>

              <button
                type="button"
                onClick={() => void refreshData()}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-oxford-900 hover:bg-oxford-800 text-gold-400 text-xs font-bold transition-colors disabled:opacity-60"
              >
                <RefreshCw
                  size={14}
                  className={isRefreshing ? "animate-spin" : ""}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#161B2A] p-5 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm">
              <div className="flex items-center justify-between text-oxford-500 dark:text-oxford-400 text-xs font-semibold">
                <span>Peserta Terdaftar</span>
                <Users size={16} className="text-gold-600" />
              </div>
              <p className="text-3xl font-bold text-oxford-950 dark:text-white mt-2">
                {stats.total}
              </p>
            </div>

            <div className="bg-white dark:bg-[#161B2A] p-5 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm">
              <div className="flex items-center justify-between text-oxford-500 dark:text-oxford-400 text-xs font-semibold">
                <span>Sudah Scan Presensi</span>
                <CheckCircle2 size={16} className="text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-emerald-600 mt-2">
                {stats.activeAttendees}
                <span className="text-sm font-normal text-oxford-400 ml-1">
                  / {stats.total}
                </span>
              </p>
            </div>

            <div className="bg-white dark:bg-[#161B2A] p-5 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm">
              <div className="flex items-center justify-between text-oxford-500 dark:text-oxford-400 text-xs font-semibold">
                <span>Memenuhi Syarat {stats.threshold}% JP</span>
                <Award size={16} className="text-gold-600" />
              </div>
              <p className="text-3xl font-bold text-oxford-950 dark:text-white mt-2">
                {stats.qualifiedCount}
              </p>
            </div>

            <div className="bg-white dark:bg-[#161B2A] p-5 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm">
              <div className="flex items-center justify-between text-oxford-500 dark:text-oxford-400 text-xs font-semibold">
                <span>Rata-rata Kehadiran</span>
                <Clock size={16} className="text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-oxford-950 dark:text-white mt-2">
                {stats.avgPct}%
                <span className="text-xs font-normal text-oxford-400 ml-1.5">
                  ({data.course.totalClassJp} JP total)
                </span>
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white dark:bg-[#161B2A] p-4 rounded-2xl border border-oxford-200 dark:border-oxford-700 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-oxford-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama peserta, NIP, atau OPD..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 rounded-xl text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Layers size={15} className="text-oxford-400 flex-shrink-0" />
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="px-3.5 py-2.5 text-sm bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 rounded-xl text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
              >
                <option value="all">
                  Semua Sesi ({data.sessions.length} Sesi Wajib Presensi)
                </option>
                {data.sessions.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    Sesi {idx + 1}: {s.title} ({s.jp} JP)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-oxford-100 dark:border-oxford-800 flex items-center justify-between text-xs text-oxford-500 dark:text-oxford-400">
              <span>
                Menampilkan {filteredParticipants.length} dari {stats.total} peserta
              </span>
              <span>Terakhir diperbarui: {formatTime(data.fetchedAt)}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-oxford-50 dark:bg-oxford-950 text-xs font-bold uppercase tracking-wider text-oxford-500 dark:text-oxford-400 border-b border-oxford-200 dark:border-oxford-700">
                  <tr>
                    <th className="p-4">Peserta & OPD</th>
                    {visibleSessions.map((s, idx) => (
                      <th key={s.id} className="p-4 whitespace-nowrap">
                        <div className="text-oxford-800 dark:text-oxford-200">
                          {selectedSessionId === "all" ? `Sesi ${idx + 1}` : s.title}
                        </div>
                        <div className="text-[10px] font-normal text-oxford-400">
                          {s.jp} JP {s.qrCode ? `• ${s.qrCode}` : ""}
                        </div>
                      </th>
                    ))}
                    <th className="p-4 whitespace-nowrap">Total JP</th>
                    <th className="p-4 whitespace-nowrap">Evaluasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-oxford-100 dark:divide-oxford-800">
                  {filteredParticipants.map((p) => {
                    const meetsThreshold =
                      p.attendancePercentage >= stats.threshold;
                    return (
                      <tr
                        key={p.enrollmentId}
                        className="hover:bg-oxford-50/60 dark:hover:bg-oxford-950/40 transition-colors"
                      >
                        <td className="p-4">
                          <p className="font-bold text-oxford-950 dark:text-white">
                            {p.name}
                          </p>
                          <p className="text-xs text-oxford-500 dark:text-oxford-400 font-mono">
                            {p.nip}
                          </p>
                          <p className="text-xs text-oxford-500 dark:text-oxford-400">
                            {p.instansiAsal}
                          </p>
                        </td>

                        {visibleSessions.map((s) => {
                          const att = p.attendances.find(
                            (a) => a.lessonId === s.id
                          );
                          return (
                            <td key={s.id} className="p-4 whitespace-nowrap">
                              {att ? (
                                <div className="inline-flex flex-col">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold w-fit">
                                    <CheckCircle2 size={12} /> Hadir
                                  </span>
                                  <span className="text-[11px] text-oxford-500 dark:text-oxford-400 mt-1 font-mono">
                                    {formatTime(att.attendedAt)}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-oxford-100 dark:bg-oxford-900 text-oxford-500 dark:text-oxford-400 text-xs font-medium">
                                  Belum
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                meetsThreshold
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                                  : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                              }`}
                            >
                              {p.attendancePercentage}%
                            </span>
                            <span className="text-xs text-oxford-600 dark:text-oxford-300">
                              {p.attendedJp}/{data.course.totalClassJp} JP
                            </span>
                          </div>
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          {p.allEvaluationsCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gold-100 dark:bg-gold-950/70 text-gold-800 dark:text-gold-200 text-xs font-bold">
                              4/4 Selesai
                            </span>
                          ) : (
                            <span className="text-xs text-oxford-400">
                              Belum tuntas
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredParticipants.length === 0 && (
                    <tr>
                      <td
                        colSpan={visibleSessions.length + 3}
                        className="p-10 text-center text-oxford-500 dark:text-oxford-400 italic"
                      >
                        Belum ada peserta yang sesuai atau terdaftar pada kelas ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
