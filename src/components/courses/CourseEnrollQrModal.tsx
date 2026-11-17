"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit2,
  Loader2,
  Maximize2,
  Minimize2,
  QrCode,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { showToast } from "@/lib/toast";
import {
  adminApproveAllPendingEnrollments,
  adminRemoveCourseParticipant,
  adminUpdateEnrollmentApproval,
  adminUpdateParticipantRegistration,
  getCourseEnrollmentsLive,
  type LiveEnrolledParticipant,
} from "@/app/actions/attendance";

interface CourseEnrollQrModalProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

export default function CourseEnrollQrModal({
  courseId,
  courseTitle,
  onClose,
}: CourseEnrollQrModalProps) {
  const [mounted, setMounted] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [participants, setParticipants] = useState<LiveEnrolledParticipant[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Delete confirmation state
  const [deletingEnrollment, setDeletingEnrollment] = useState<{ id: string; name: string } | null>(null);

  // Edit participant modal state
  const [editingUser, setEditingUser] = useState<LiveEnrolledParticipant | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    nip: "",
    instansiAsal: "",
    jabatan: "",
    pangkat: "",
    phone: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const enrollUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/courses/${courseId}`
      : `/courses/${courseId}`;

  const handleEnterFullscreen = async () => {
    setIsFullscreen(true);
    try {
      if (typeof document !== "undefined" && document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser may block automatic fullscreen API if policy restricts, viewport overlay handles it
    }
  };

  const handleExitFullscreen = async () => {
    setIsFullscreen(false);
    try {
      if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  // Keyboard shortcut ESC to exit fullscreen or close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          handleExitFullscreen();
        } else if (!editingUser) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, editingUser, onClose]);

  // Sync with browser native fullscreen exit (e.g. user pressed browser default ESC)
  useEffect(() => {
    const handleFsChange = () => {
      if (typeof document !== "undefined" && !document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, [isFullscreen]);

  useEffect(() => {
    QRCode.toDataURL(enrollUrl, {
      width: 512,
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [enrollUrl]);

  const fetchParticipants = useCallback(
    async (silent = true) => {
      if (!silent) setIsRefreshing(true);
      try {
        const res = await getCourseEnrollmentsLive(courseId);
        if (res.success && res.participants) {
          setParticipants(res.participants);
          setLastUpdated(
            new Date(res.fetchedAt || Date.now()).toLocaleTimeString("id-ID")
          );
        }
      } finally {
        setLoadingList(false);
        setIsRefreshing(false);
      }
    },
    [courseId]
  );

  useEffect(() => {
    fetchParticipants(true);
  }, [fetchParticipants]);

  useEffect(() => {
    if (!isLive || editingUser) return;
    const interval = setInterval(() => {
      fetchParticipants(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLive, editingUser, fetchParticipants]);

  const filteredParticipants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.nip.toLowerCase().includes(q) ||
        p.instansiAsal.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }, [participants, searchQuery]);

  const pendingParticipants = useMemo(() => {
    return participants.filter((p) => p.status === "pending_approval");
  }, [participants]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(enrollUrl);
      showToast.success("Tautan Disalin", "Link pendaftaran kelas siap dibagikan.");
    } catch {
      showToast.error("Gagal Menyalin", "Silakan salin tautan secara manual.");
    }
  };

  const handleApprove = async (enrollmentId: string) => {
    setIsActionLoading(true);
    try {
      const res = await adminUpdateEnrollmentApproval({
        courseId,
        enrollmentId,
        status: "active",
      });
      if (res.success) {
        showToast.success("Pendaftaran Disetujui", "Peserta kini aktif dan dapat mengakses materi kelas.");
        await fetchParticipants(true);
      } else {
        showToast.error("Gagal Menyetujui", res.error || "Terjadi kesalahan.");
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async (enrollmentId: string) => {
    setIsActionLoading(true);
    try {
      const res = await adminUpdateEnrollmentApproval({
        courseId,
        enrollmentId,
        status: "rejected",
      });
      if (res.success) {
        showToast.info("Pendaftaran Ditolak", "Status pendaftaran peserta diubah menjadi ditolak.");
        await fetchParticipants(true);
      } else {
        showToast.error("Gagal Menolak", res.error || "Terjadi kesalahan.");
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApproveAll = async () => {
    setIsActionLoading(true);
    try {
      const res = await adminApproveAllPendingEnrollments(courseId);
      if (res.success) {
        showToast.success(
          "Semua Disetujui",
          `${res.count || 0} pengajuan pendaftaran berhasil disetujui.`
        );
        await fetchParticipants(true);
      } else {
        showToast.error("Gagal Menyetujui", res.error || "Terjadi kesalahan.");
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteParticipant = async () => {
    if (!deletingEnrollment) return;
    setIsActionLoading(true);
    try {
      const res = await adminRemoveCourseParticipant({
        courseId,
        enrollmentId: deletingEnrollment.id,
      });
      if (res.success) {
        showToast.success(
          "Peserta Dihapus",
          `${deletingEnrollment.name} telah berhasil dikeluarkan dari kelas.`
        );
        setDeletingEnrollment(null);
        await fetchParticipants(true);
      } else {
        showToast.error("Gagal Menghapus", res.error || "Terjadi kesalahan.");
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const openEdit = (p: LiveEnrolledParticipant) => {
    setEditingUser(p);
    setEditForm({
      name: p.name || "",
      nip: p.nip || "",
      instansiAsal: p.instansiAsal || "",
      jabatan: p.jabatan || "",
      pangkat: p.pangkat || "",
      phone: p.phone || "",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingEdit(true);
    try {
      const res = await adminUpdateParticipantRegistration({
        courseId,
        userId: editingUser.userId,
        ...editForm,
      });
      if (res.success) {
        showToast.success("Data Diperbarui", "Data registrasi peserta tersimpan ke database.");
        setEditingUser(null);
        await fetchParticipants(true);
      } else {
        showToast.error("Gagal Menyimpan", res.error || "Terjadi kesalahan.");
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (!mounted) return null;

  // FULLSCREEN MODE (Diproyeksikan ke layar penuh tanpa elemen lain)
  if (isFullscreen) {
    return createPortal(
      <div className="fixed inset-0 z-[999999] w-screen h-screen bg-oxford-950 flex flex-col items-center justify-center p-6 sm:p-12 select-none overflow-hidden animate-fade-in">
        {/* Tombol keluar layar penuh */}
        <button
          type="button"
          onClick={handleExitFullscreen}
          aria-label="Keluar Layar Penuh"
          className="absolute top-6 right-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-oxford-900/90 hover:bg-oxford-800 text-oxford-200 hover:text-white border border-oxford-700 text-sm sm:text-base font-bold backdrop-blur-md transition-all active:scale-95 shadow-xl group"
        >
          <Minimize2 size={18} className="group-hover:scale-90 transition-transform text-gold-400" />
          <span>Keluar Layar Penuh (ESC)</span>
        </button>

        {/* Teks instruksi sesuai permintaan user */}
        <p className="text-white text-2xl sm:text-3xl md:text-4xl font-bold text-center max-w-4xl mb-8 leading-snug drop-shadow-md">
          Peserta cukup scan QR ini untuk membuka kelas &amp; klik{" "}
          <span className="text-gold-400">Daftar / Mulai Belajar</span>.
        </p>

        {/* QR Code besar & tajam */}
        <div className="bg-white p-6 sm:p-8 md:p-10 rounded-3xl shadow-2xl border-4 border-gold-400/80 flex items-center justify-center">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`QR Pendaftaran ${courseTitle}`}
              className="w-72 h-72 sm:w-96 sm:h-96 md:w-[460px] md:h-[460px] object-contain"
            />
          ) : (
            <div className="w-72 h-72 flex items-center justify-center text-base text-oxford-500">
              Menyiapkan QR Code...
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  // NORMAL MODAL MODE: Pendaftaran & Persetujuan Peserta (Mounted directly to document.body)
  return createPortal(
    <div className="fixed inset-0 z-[99999] w-screen h-screen bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden text-base">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-oxford-200 dark:border-oxford-700">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gold-500/15 text-gold-500 flex items-center justify-center shrink-0">
              <QrCode size={26} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold truncate text-oxford-950 dark:text-white">
                Pendaftaran &amp; Persetujuan Peserta
              </h3>
              <p className="text-sm truncate text-oxford-500 dark:text-oxford-400">
                {courseTitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchParticipants(false)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold border transition-colors bg-oxford-100 dark:bg-oxford-800 border-oxford-200 dark:border-oxford-700 text-oxford-800 dark:text-oxford-100 hover:bg-oxford-200"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleEnterFullscreen}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors bg-oxford-900 dark:bg-gold-500 border-oxford-900 dark:border-gold-500 text-white dark:text-oxford-950 hover:opacity-90"
            >
              <Maximize2 size={16} />
              Layar Penuh
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="p-2 rounded-xl transition-colors text-oxford-500 hover:bg-oxford-100 dark:hover:bg-oxford-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main 2-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* Left: QR Code & Link */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <p className="text-sm text-center mb-3 text-oxford-700 dark:text-oxford-300 font-medium">
              Peserta cukup scan QR ini untuk membuka kelas &amp; klik{" "}
              <strong className="text-oxford-950 dark:text-white">Daftar / Mulai Belajar</strong>.
            </p>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-gold-400/60 shadow-lg flex items-center justify-center mb-4">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={`QR Pendaftaran ${courseTitle}`}
                  className="w-56 h-56 sm:w-60 sm:h-60 object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-sm text-oxford-400">
                  Menyiapkan QR Code...
                </div>
              )}
            </div>

            <div className="w-full flex items-center gap-2 mb-3">
              <input
                type="text"
                readOnly
                value={enrollUrl}
                className="flex-1 px-3 py-2 rounded-xl text-sm font-mono border bg-oxford-50 dark:bg-oxford-900 border-oxford-200 dark:border-oxford-700 text-oxford-800 dark:text-oxford-200"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold shrink-0 bg-oxford-100 dark:bg-oxford-800 text-oxford-800 dark:text-oxford-100 hover:bg-oxford-200"
              >
                <Copy size={16} /> Salin
              </button>
            </div>

            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`QR_Pendaftaran_${courseId}.png`}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold text-sm shadow-sm transition-colors"
              >
                <Download size={16} /> Unduh QR Pendaftaran (PNG)
              </a>
            )}
          </div>

          {/* Right: Live Enrolled Participants + Approval + Edit */}
          <div className="lg:col-span-7 flex flex-col min-h-[340px] lg:min-h-0 rounded-2xl border p-4 sm:p-5 bg-oxford-50/70 dark:bg-oxford-900/40 border-oxford-200 dark:border-oxford-700">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-gold-500" />
                <span className="font-bold text-base">Pendaftar Kelas</span>
                <span className="px-3 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  {participants.length} Peserta
                </span>
              </div>
              {lastUpdated && (
                <span className="text-sm text-oxford-500">
                  Update: {lastUpdated}
                </span>
              )}
            </div>

            {/* Banner persetujuan tertunda jika ada */}
            {pendingParticipants.length > 0 && (
              <div className="mb-3 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>{pendingParticipants.length} peserta menunggu persetujuan Anda.</span>
                </div>
                <button
                  type="button"
                  onClick={handleApproveAll}
                  disabled={isActionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-sm transition-colors disabled:opacity-50 shrink-0"
                >
                  <UserCheck size={16} /> Setujui Semua ({pendingParticipants.length})
                </button>
              </div>
            )}

            <div className="relative mb-3">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-oxford-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NIP, instansi..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-gold-500 bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-700 text-oxford-900 dark:text-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loadingList ? (
                <div className="h-44 flex items-center justify-center text-sm text-oxford-400 gap-2">
                  <Loader2 size={18} className="animate-spin" /> Memuat daftar pendaftar...
                </div>
              ) : filteredParticipants.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-sm text-oxford-400 text-center px-4">
                  {participants.length === 0
                    ? "Belum ada peserta yang mendaftar. Daftar akan muncul otomatis saat peserta scan QR."
                    : "Tidak ada peserta yang cocok dengan pencarian."}
                </div>
              ) : (
                filteredParticipants.map((p, idx) => (
                  <div
                    key={p.enrollmentId}
                    className="p-3.5 rounded-xl border flex items-start justify-between gap-3 bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-700 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-mono text-oxford-400">
                          #{participants.length - idx}
                        </span>
                        <span className="font-bold text-base truncate">
                          {p.name}
                        </span>

                        {p.status === "pending_approval" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-sm font-bold">
                            ⏳ Menunggu Persetujuan
                          </span>
                        ) : p.status === "rejected" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-sm font-bold">
                            <UserX size={14} /> Ditolak
                          </span>
                        ) : p.statementAccepted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                            <CheckCircle2 size={14} /> Terverifikasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-sm font-bold">
                            Terdaftar
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1 text-oxford-700 dark:text-oxford-300 font-medium">
                        NIP: <span className="font-mono">{p.nip || "-"}</span> ·{" "}
                        {p.instansiAsal || "Instansi belum diisi"}
                      </p>
                      {(p.jabatan || p.pangkat) && (
                        <p className="text-sm text-oxford-500">
                          {[p.jabatan, p.pangkat].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-sm font-mono text-oxford-500">
                        {new Date(p.enrolledAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {p.status === "pending_approval" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(p.enrollmentId)}
                              disabled={isActionLoading}
                              title="Setujui pendaftaran peserta"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors disabled:opacity-50"
                            >
                              <Check size={14} /> Setujui
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(p.enrollmentId)}
                              disabled={isActionLoading}
                              title="Tolak pendaftaran peserta"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                            >
                              <X size={14} /> Tolak
                            </button>
                          </>
                        ) : p.status === "rejected" ? (
                          <button
                            type="button"
                            onClick={() => handleApprove(p.enrollmentId)}
                            disabled={isActionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors disabled:opacity-50"
                          >
                            <UserCheck size={14} /> Setujui Ulang
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-800 text-oxford-800 dark:text-gold-400 hover:bg-oxford-100 transition-colors"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingEnrollment({ id: p.enrollmentId, name: p.name })}
                          disabled={isActionLoading}
                          title="Hapus / Keluarkan peserta dari kelas"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={14} /> Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modal Edit Data Registrasi Peserta */}
      {editingUser && (
        <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 text-oxford-900 dark:text-white text-sm sm:text-base"
          >
            <div className="flex items-center justify-between pb-3 border-b border-oxford-200 dark:border-oxford-700">
              <div>
                <h4 className="font-bold text-lg">Edit Data Registrasi Peserta</h4>
                <p className="text-sm text-oxford-500 dark:text-oxford-400">
                  Perubahan langsung tersimpan ke database profil &amp; sertifikat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-oxford-400 hover:bg-oxford-100 dark:hover:bg-oxford-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-sm font-bold mb-1">Nama Lengkap &amp; Gelar *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-900 text-sm sm:text-base"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1">NIP / NIK</label>
                  <input
                    type="text"
                    value={editForm.nip}
                    onChange={(e) => setEditForm((f) => ({ ...f, nip: e.target.value }))}
                    placeholder="Min. 16 digit jika diisi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-900 text-sm sm:text-base font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-900 text-sm sm:text-base"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Instansi / OPD Asal</label>
                <input
                  type="text"
                  value={editForm.instansiAsal}
                  onChange={(e) => setEditForm((f) => ({ ...f, instansiAsal: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-900 text-sm sm:text-base"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1">Jabatan</label>
                  <input
                    type="text"
                    value={editForm.jabatan}
                    onChange={(e) => setEditForm((f) => ({ ...f, jabatan: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-900 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Pangkat / Golongan</label>
                  <input
                    type="text"
                    value={editForm.pangkat}
                    onChange={(e) => setEditForm((f) => ({ ...f, pangkat: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-900 text-sm sm:text-base"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2.5 rounded-xl border border-oxford-200 dark:border-oxford-700 text-sm font-bold text-oxford-700 dark:text-oxford-200 hover:bg-oxford-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-oxford-950 text-sm font-bold disabled:opacity-50 shadow-sm"
              >
                {isSavingEdit && <Loader2 size={16} className="animate-spin" />}
                Simpan ke Database
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-modal Konfirmasi Hapus Peserta dari Kelas */}
      {deletingEnrollment && (
        <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 text-oxford-900 dark:text-white">
            <div className="flex items-center gap-3.5 text-rose-600 dark:text-rose-400 pb-2">
              <div className="w-11 h-11 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h4 className="font-bold text-lg text-oxford-950 dark:text-white">Hapus Peserta dari Kelas?</h4>
                <p className="text-xs text-oxford-500 dark:text-oxford-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-sm text-oxford-700 dark:text-oxford-300 leading-relaxed">
              Apakah Anda yakin ingin mengeluarkan dan menghapus peserta{" "}
              <strong className="text-oxford-950 dark:text-white">{deletingEnrollment.name}</strong> dari kelas ini?
              Seluruh data presensi dan evaluasi peserta pada kelas ini juga akan otomatis dibersihkan.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-oxford-100 dark:border-oxford-800">
              <button
                type="button"
                onClick={() => setDeletingEnrollment(null)}
                disabled={isActionLoading}
                className="px-4 py-2.5 rounded-xl border border-oxford-200 dark:border-oxford-700 text-sm font-bold text-oxford-700 dark:text-oxford-300 hover:bg-oxford-100 dark:hover:bg-oxford-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteParticipant}
                disabled={isActionLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Ya, Hapus Peserta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
