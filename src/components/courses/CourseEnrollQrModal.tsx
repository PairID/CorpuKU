"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  CheckCircle2,
  Copy,
  Download,
  Edit2,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  QrCode,
  Radio,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { showToast } from "@/lib/toast";
import {
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
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [participants, setParticipants] = useState<LiveEnrolledParticipant[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

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

  const enrollUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/courses/${courseId}`
      : `/courses/${courseId}`;

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(enrollUrl);
      showToast.success("Tautan Disalin", "Link pendaftaran kelas siap dibagikan.");
    } catch {
      showToast.error("Gagal Menyalin", "Silakan salin tautan secara manual.");
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

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-oxford-950 text-white p-5 md:p-8 overflow-y-auto flex flex-col"
          : "fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      }
    >
      <div
        className={
          isFullscreen
            ? "max-w-7xl w-full mx-auto flex-1 flex flex-col"
            : "bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl max-w-5xl w-full p-6 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden"
        }
      >
        {/* Top Bar */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 pb-4 border-b ${
            isFullscreen
              ? "border-oxford-800"
              : "border-oxford-200 dark:border-oxford-700"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gold-500/15 text-gold-500 flex items-center justify-center shrink-0">
              <QrCode size={22} />
            </div>
            <div className="min-w-0">
              <h3
                className={`text-base font-bold truncate ${
                  isFullscreen ? "text-white text-xl" : "text-oxford-950 dark:text-white"
                }`}
              >
                QR Code Pendaftaran Kelas
              </h3>
              <p
                className={`text-xs truncate ${
                  isFullscreen ? "text-oxford-300" : "text-oxford-500 dark:text-oxford-400"
                }`}
              >
                {courseTitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsLive((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                isLive
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500"
                  : isFullscreen
                  ? "bg-oxford-900 border-oxford-700 text-oxford-300"
                  : "bg-oxford-100 dark:bg-oxford-800 border-oxford-200 dark:border-oxford-700 text-oxford-600 dark:text-oxford-300"
              }`}
            >
              <Radio size={14} className={isLive ? "animate-pulse" : ""} />
              {isLive ? "LIVE (4 dtk)" : "Jeda"}
              {isLive ? <Pause size={12} /> : <Play size={12} />}
            </button>

            <button
              type="button"
              onClick={() => fetchParticipants(false)}
              disabled={isRefreshing}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                isFullscreen
                  ? "bg-oxford-900 border-oxford-700 text-oxford-200 hover:bg-oxford-800"
                  : "bg-oxford-100 dark:bg-oxford-800 border-oxford-200 dark:border-oxford-700 text-oxford-800 dark:text-oxford-100 hover:bg-oxford-200"
              }`}
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                isFullscreen
                  ? "bg-gold-500 border-gold-400 text-oxford-950 hover:bg-gold-400"
                  : "bg-oxford-900 dark:bg-gold-500 border-oxford-900 dark:border-gold-500 text-white dark:text-oxford-950 hover:opacity-90"
              }`}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className={`p-2 rounded-xl transition-colors ${
                isFullscreen
                  ? "text-oxford-300 hover:bg-oxford-800 hover:text-white"
                  : "text-oxford-500 hover:bg-oxford-100 dark:hover:bg-oxford-800"
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main 2-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* Left: QR Code & Link */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <p
              className={`text-xs text-center mb-3 ${
                isFullscreen ? "text-oxford-300" : "text-oxford-600 dark:text-oxford-300"
              }`}
            >
              Peserta cukup scan QR ini untuk membuka kelas &amp; klik{" "}
              <strong>Daftar / Mulai Belajar</strong>.
            </p>

            <div className="bg-white p-4 md:p-5 rounded-2xl border-2 border-gold-400/60 shadow-lg flex items-center justify-center mb-4">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={`QR Pendaftaran ${courseTitle}`}
                  className={
                    isFullscreen
                      ? "w-64 h-64 md:w-80 md:h-80 object-contain"
                      : "w-56 h-56 object-contain"
                  }
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-oxford-400">
                  Menyiapkan QR Code...
                </div>
              )}
            </div>

            <div className="w-full flex items-center gap-2 mb-3">
              <input
                type="text"
                readOnly
                value={enrollUrl}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono border ${
                  isFullscreen
                    ? "bg-oxford-900 border-oxford-700 text-oxford-100"
                    : "bg-oxford-50 dark:bg-oxford-900 border-oxford-200 dark:border-oxford-700 text-oxford-800 dark:text-oxford-200"
                }`}
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 ${
                  isFullscreen
                    ? "bg-oxford-800 text-white hover:bg-oxford-700"
                    : "bg-oxford-100 dark:bg-oxford-800 text-oxford-800 dark:text-oxford-100 hover:bg-oxford-200"
                }`}
              >
                <Copy size={14} /> Salin
              </button>
            </div>

            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`QR_Pendaftaran_${courseId}.png`}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold text-xs shadow-sm transition-colors"
              >
                <Download size={15} /> Unduh QR Pendaftaran (PNG)
              </a>
            )}
          </div>

          {/* Right: Live Enrolled Participants + Edit */}
          <div
            className={`lg:col-span-7 flex flex-col min-h-[320px] lg:min-h-0 rounded-2xl border p-4 ${
              isFullscreen
                ? "bg-oxford-900/70 border-oxford-800"
                : "bg-oxford-50/70 dark:bg-oxford-900/40 border-oxford-200 dark:border-oxford-700"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-gold-500" />
                <span className="font-bold text-sm">Peserta Masuk (Live)</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold text-xs">
                  {participants.length} Peserta
                </span>
              </div>
              {lastUpdated && (
                <span
                  className={`text-xs ${
                    isFullscreen ? "text-oxford-400" : "text-oxford-500"
                  }`}
                >
                  Update: {lastUpdated}
                </span>
              )}
            </div>

            <div className="relative mb-3">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-oxford-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NIP, instansi..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-gold-500 ${
                  isFullscreen
                    ? "bg-oxford-950 border-oxford-700 text-white placeholder:text-oxford-500"
                    : "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-700 text-oxford-900 dark:text-white"
                }`}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingList ? (
                <div className="h-40 flex items-center justify-center text-xs text-oxford-400 gap-2">
                  <Loader2 size={16} className="animate-spin" /> Memuat peserta...
                </div>
              ) : filteredParticipants.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-xs text-oxford-400 text-center px-4">
                  {participants.length === 0
                    ? "Belum ada peserta yang mendaftar. Daftar akan muncul otomatis saat peserta scan QR."
                    : "Tidak ada peserta yang cocok dengan pencarian."}
                </div>
              ) : (
                filteredParticipants.map((p, idx) => (
                  <div
                    key={p.enrollmentId}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                      isFullscreen
                        ? "bg-oxford-950/80 border-oxford-800"
                        : "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-oxford-400">
                          #{participants.length - idx}
                        </span>
                        <span className="font-bold text-sm truncate">
                          {p.name}
                        </span>
                        {p.statementAccepted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-bold">
                            <CheckCircle2 size={12} /> Terverifikasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-xs font-bold">
                            Baru Daftar
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs mt-1 ${
                          isFullscreen ? "text-oxford-300" : "text-oxford-600 dark:text-oxford-300"
                        }`}
                      >
                        NIP: <span className="font-mono">{p.nip || "-"}</span> ·{" "}
                        {p.instansiAsal || "Instansi belum diisi"}
                      </p>
                      {(p.jabatan || p.pangkat) && (
                        <p
                          className={`text-xs ${
                            isFullscreen ? "text-oxford-400" : "text-oxford-500"
                          }`}
                        >
                          {[p.jabatan, p.pangkat].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`text-xs font-mono ${
                          isFullscreen ? "text-oxford-400" : "text-oxford-500"
                        }`}
                      >
                        {new Date(p.enrolledAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                          isFullscreen
                            ? "border-oxford-700 bg-oxford-900 text-gold-400 hover:bg-oxford-800"
                            : "border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-800 text-oxford-800 dark:text-gold-400 hover:bg-oxford-100"
                        }`}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
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
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-oxford-900 dark:text-white"
          >
            <div className="flex items-center justify-between pb-3 border-b border-oxford-200 dark:border-oxford-700">
              <div>
                <h4 className="font-bold text-base">Edit Data Registrasi Peserta</h4>
                <p className="text-xs text-oxford-500 dark:text-oxford-400">
                  Perubahan langsung tersimpan ke database profil &amp; sertifikat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-oxford-400 hover:bg-oxford-100 dark:hover:bg-oxford-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Nama Lengkap &amp; Gelar *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-900 text-xs"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">NIP / NIK</label>
                  <input
                    type="text"
                    value={editForm.nip}
                    onChange={(e) => setEditForm((f) => ({ ...f, nip: e.target.value }))}
                    placeholder="Min. 16 digit jika diisi"
                    className="w-full px-3 py-2 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-900 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-900 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Instansi / OPD Asal</label>
                <input
                  type="text"
                  value={editForm.instansiAsal}
                  onChange={(e) => setEditForm((f) => ({ ...f, instansiAsal: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-900 text-xs"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Jabatan</label>
                  <input
                    type="text"
                    value={editForm.jabatan}
                    onChange={(e) => setEditForm((f) => ({ ...f, jabatan: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Pangkat / Golongan</label>
                  <input
                    type="text"
                    value={editForm.pangkat}
                    onChange={(e) => setEditForm((f) => ({ ...f, pangkat: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-900 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl border border-oxford-200 dark:border-oxford-700 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-oxford-950 text-xs font-bold disabled:opacity-50"
              >
                {isSavingEdit && <Loader2 size={14} className="animate-spin" />}
                Simpan ke Database
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
