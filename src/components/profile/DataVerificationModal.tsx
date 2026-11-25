"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, UserCheck, AlertCircle, CheckCircle2, Loader2, FileText, Search, Plus, X, Check } from "lucide-react";
import { PANGKAT_GOLONGAN, DAFTAR_INSTANSI_KALTARA } from "@/lib/constants";
import { confirmParticipantData, getDistinctInstansiList } from "@/app/actions/attendance";
import { showToast } from "@/lib/toast";

export interface UserVerificationProfile {
  name: string;
  nip: string;
  email: string;
  instansiAsal: string;
  jabatan: string;
  pangkat: string;
  phone: string;
}

interface DataVerificationModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: () => void;
  courseId: string;
  initialProfile: Partial<UserVerificationProfile>;
  courseTitle?: string;
}

export default function DataVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  courseId,
  initialProfile,
  courseTitle,
}: DataVerificationModalProps) {
  const [name, setName] = useState(initialProfile.name || "");
  const [nip, setNip] = useState(initialProfile.nip || "");
  const [email, setEmail] = useState(initialProfile.email || "");
  const [instansiAsal, setInstansiAsal] = useState(initialProfile.instansiAsal || "");
  const [instansiQuery, setInstansiQuery] = useState(initialProfile.instansiAsal || "");
  const [instansiList, setInstansiList] = useState<string[]>(DAFTAR_INSTANSI_KALTARA);
  const [instansiDropdownOpen, setInstansiDropdownOpen] = useState(false);
  const [jabatan, setJabatan] = useState(initialProfile.jabatan || "");
  const [pangkat, setPangkat] = useState(initialProfile.pangkat || "");
  const [phone, setPhone] = useState(initialProfile.phone || "");
  const [statementAccepted, setStatementAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }

    // Hanya inisialisasi ulang field saat modal baru dibuka (transisi false -> true),
    // agar re-render parent tidak menimpa input/pilihan yang sedang diisi peserta.
    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (!justOpened) return;

    if (initialProfile.name !== undefined) setName(initialProfile.name || "");
    if (initialProfile.nip !== undefined) setNip(initialProfile.nip || "");
    if (initialProfile.email !== undefined) setEmail(initialProfile.email || "");
    if (initialProfile.instansiAsal !== undefined) {
      setInstansiAsal(initialProfile.instansiAsal || "");
      setInstansiQuery(initialProfile.instansiAsal || "");
    }
    if (initialProfile.jabatan !== undefined) setJabatan(initialProfile.jabatan || "");
    if (initialProfile.pangkat !== undefined) setPangkat(initialProfile.pangkat || "");
    if (initialProfile.phone !== undefined) setPhone(initialProfile.phone || "");
    setInstansiDropdownOpen(false);

    let active = true;
    getDistinctInstansiList().then((list) => {
      if (!active) return;
      setInstansiList(
        Array.from(new Set([...DAFTAR_INSTANSI_KALTARA, ...list])).sort((a, b) =>
          a.localeCompare(b, "id")
        )
      );
    });
    return () => {
      active = false;
    };
  }, [isOpen, initialProfile]);

  if (!isOpen) return null;

  const cleanNip = nip.replace(/\D/g, "");
  const isNipValid = cleanNip.length >= 16;
  const isNameValid = name.trim().length >= 3;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isInstansiValid = instansiAsal.trim().length >= 3;
  const isFormValid = isNameValid && isNipValid && isEmailValid && isInstansiValid && statementAccepted;

  const trimmedQuery = instansiQuery.trim();
  const filteredInstansi = trimmedQuery
    ? instansiList.filter((item) => item.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : instansiList;
  const hasExactInstansiMatch = instansiList.some(
    (item) => item.toLowerCase() === trimmedQuery.toLowerCase()
  );
  const showManualAddBtn = trimmedQuery.length >= 3 && !hasExactInstansiMatch;

  const handleSelectInstansi = (val: string) => {
    setInstansiQuery(val);
    setInstansiAsal(val);
    setInstansiDropdownOpen(false);
  };

  const handleAddManualInstansi = () => {
    if (!trimmedQuery) return;
    setInstansiList((prev) =>
      Array.from(new Set([...prev, trimmedQuery])).sort((a, b) => a.localeCompare(b, "id"))
    );
    setInstansiAsal(trimmedQuery);
    setInstansiQuery(trimmedQuery);
    setInstansiDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await confirmParticipantData({
        courseId,
        profile: {
          name: name.trim(),
          nip: cleanNip,
          email: email.trim().toLowerCase(),
          instansiAsal: instansiAsal.trim(),
          jabatan: jabatan.trim(),
          pangkat: pangkat.trim(),
          phone: phone.trim(),
        },
        statementAccepted: true,
      });

      if (res.success) {
        showToast.success("Verifikasi Berhasil", "Data profil telah dikonfirmasi dan tervalidasi.");
        onSuccess();
      } else {
        showToast.error("Gagal Mengonfirmasi", res.error || "Gagal mengonfirmasi data profil.");
      }
    } catch (err: unknown) {
      console.error("Data verification error:", err);
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses data.";
      if (msg.includes("Server Action") || msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        showToast.error("Sesi / Build Diperbarui", "Sistem baru saja diperbarui di server. Memuat ulang halaman...");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast.error("Kesalahan Sistem", msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Badge */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-oxford-100 dark:border-oxford-800">
          <div className="p-3 bg-gold-50 dark:bg-gold-950/40 text-gold-600 rounded-2xl flex-shrink-0">
            <ShieldCheck size={28} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gold-100 dark:bg-gold-950 text-gold-800 dark:text-gold-300 mb-1">
              <UserCheck size={12} />
              <span>Verifikasi Wajib Sebelum Mulai Belajar</span>
            </div>
            <h2 className="text-xl font-bold text-oxford-900 dark:text-white">
              Pembersihan & Verifikasi Data Peserta
            </h2>
            <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-0.5">
              {courseTitle ? `Kelas: ${courseTitle}` : "Pelatihan Fasilitasi Klasikal OPD Luar"}
            </p>
          </div>
        </div>

        {/* Notice Box */}
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex gap-3 text-xs text-amber-900 dark:text-amber-200">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Penting untuk Penerbitan Sertifikat Resmi:</span> Pastikan Nama Lengkap beserta gelar, NIP (18 digit), dan Instansi/OPD diisi dengan benar. Data ini akan dicetak langsung pada sertifikat resmi pelatihan dan tidak dapat diubah setelah sertifikat terbit.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field: Nama Lengkap */}
          <div>
            <label className="block text-xs font-bold text-oxford-800 dark:text-oxford-200 mb-1">
              Nama Lengkap & Gelar <span className="text-crimson-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Dr. Budi Santoso, M.Si"
              className="w-full px-3.5 py-2.5 bg-oxford-50 dark:bg-oxford-900/60 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
            />
          </div>

          {/* Field: NIP / NIK */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-oxford-800 dark:text-oxford-200">
                NIP / NIK <span className="text-crimson-500">*</span>
              </label>
              <span className={`text-[10px] font-mono font-bold ${cleanNip.length === 18 ? "text-emerald-600" : cleanNip.length >= 16 ? "text-amber-600" : "text-oxford-400"}`}>
                {cleanNip.length} digit {cleanNip.length === 18 ? "(Format ASN Lengkap)" : cleanNip.length === 16 ? "(NIK)" : ""}
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={20}
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="Contoh: 198209302006042007"
              className="w-full px-3.5 py-2.5 bg-oxford-50 dark:bg-oxford-900/60 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm font-mono focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
            />
          </div>

          {/* Field: Email Aktif */}
          <div>
            <label className="block text-xs font-bold text-oxford-800 dark:text-oxford-200 mb-1">
              Email Aktif <span className="text-crimson-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Contoh: nama@instansi.go.id"
              className="w-full px-3.5 py-2.5 bg-oxford-50 dark:bg-oxford-900/60 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
            />
            <p className="text-[11px] text-oxford-500 dark:text-oxford-400 mt-1">
              Notifikasi otomatis akan dikirim ke email ini saat sertifikat Anda selesai diterbitkan.
            </p>
          </div>

          {/* Grid: Instansi & Jabatan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-bold text-oxford-800 dark:text-oxford-200 mb-1">
                Instansi / OPD <span className="text-crimson-500">*</span>
              </label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-oxford-400 pointer-events-none" size={14} />
                  <input
                    type="text"
                    required
                    value={instansiQuery}
                    onFocus={() => setInstansiDropdownOpen(true)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInstansiQuery(val);
                      setInstansiAsal(val);
                      setInstansiDropdownOpen(true);
                    }}
                    placeholder="Cari instansi atau ketik manual..."
                    autoComplete="off"
                    className="w-full pl-8 pr-8 py-2.5 bg-oxford-50 dark:bg-oxford-900/60 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                  />
                  {instansiQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setInstansiQuery("");
                        setInstansiAsal("");
                        setInstansiDropdownOpen(true);
                      }}
                      aria-label="Hapus pencarian instansi"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-oxford-400 hover:text-oxford-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {showManualAddBtn && (
                  <button
                    type="button"
                    onClick={handleAddManualInstansi}
                    className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shrink-0 shadow-xs transition-colors"
                  >
                    <Plus size={14} />
                    <span>Tambahkan</span>
                  </button>
                )}
              </div>

              {instansiDropdownOpen && (
                <div className="mt-1 border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] rounded-xl shadow-lg overflow-hidden z-30 relative">
                  {filteredInstansi.length > 0 ? (
                    <ul className="max-h-44 overflow-y-auto divide-y divide-oxford-100 dark:divide-oxford-800">
                      {filteredInstansi.slice(0, 60).map((inst) => (
                        <li key={inst}>
                          <button
                            type="button"
                            onClick={() => handleSelectInstansi(inst)}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                              instansiAsal === inst
                                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 font-semibold"
                                : "text-oxford-800 dark:text-oxford-200 hover:bg-gold-50 dark:hover:bg-oxford-800"
                            }`}
                          >
                            <span className="truncate">{inst}</span>
                            {instansiAsal === inst && <Check size={13} className="text-emerald-600 shrink-0" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-2.5 text-xs text-oxford-500 flex items-center justify-between gap-2">
                      <span>Tidak ditemukan di daftar.</span>
                      {trimmedQuery.length >= 3 && (
                        <button
                          type="button"
                          onClick={handleAddManualInstansi}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg inline-flex items-center gap-1 shrink-0"
                        >
                          <Plus size={12} /> Tambahkan
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-oxford-800 dark:text-oxford-200 mb-1">
                Jabatan Resmi
              </label>
              <input
                type="text"
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
                placeholder="Contoh: Pranata Komputer Ahli Muda"
                className="w-full px-3.5 py-2.5 bg-oxford-50 dark:bg-oxford-900/60 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
              />
            </div>
          </div>

          {/* Grid: Pangkat & WhatsApp */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-oxford-800 dark:text-oxford-200 mb-1">
                Pangkat / Golongan
              </label>
              <select
                value={pangkat}
                onChange={(e) => setPangkat(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-oxford-50 dark:bg-oxford-900/60 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
              >
                <option value="">Pilih Pangkat / Golongan...</option>
                {PANGKAT_GOLONGAN.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-oxford-800 dark:text-oxford-200 mb-1">
                Nomor WhatsApp / Kontak Aktif
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full px-3.5 py-2.5 bg-oxford-50 dark:bg-oxford-900/60 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
              />
            </div>
          </div>

          {/* Mandatory Statement Checklist */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border-2 border-gold-300 dark:border-gold-600/60 bg-gold-50/50 dark:bg-gold-950/30 cursor-pointer select-none transition-all hover:bg-gold-50">
              <input
                type="checkbox"
                required
                checked={statementAccepted}
                onChange={(e) => setStatementAccepted(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-oxford-300 text-gold-600 focus:ring-gold-500 accent-gold-500 cursor-pointer"
              />
              <span className="text-xs leading-relaxed text-oxford-900 dark:text-oxford-100 font-medium">
                <strong className="block text-gold-900 dark:text-gold-300 font-bold mb-0.5">
                  Checklist Pernyataan Kebenaran Data:
                </strong>
                &ldquo;Saya menyatakan dengan sadar dan sebenar-benarnya bahwa data identitas di atas adalah sah, mutakhir, dan benar. Saya memahami bahwa data ini akan digunakan sebagai dasar penerbitan Sertifikat Resmi Pelatihan dan tidak dapat diubah setelah sertifikat dicetak.&rdquo;
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-oxford-100 dark:border-oxford-800">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-oxford-600 dark:text-oxford-300 hover:bg-oxford-100 dark:hover:bg-oxford-800 rounded-xl transition-colors"
              >
                Nanti Saja
              </button>
            )}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-oxford-950 text-sm font-bold rounded-xl shadow-lg shadow-gold-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              <span>Konfirmasi Data & Masuk Kelas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
