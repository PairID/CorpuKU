"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, UserCheck, AlertCircle, CheckCircle2, Loader2, FileText } from "lucide-react";
import { PANGKAT_GOLONGAN } from "@/lib/constants";
import { confirmParticipantData, getDistinctInstansiList } from "@/app/actions/attendance";
import { showToast } from "@/lib/toast";

export interface UserVerificationProfile {
  name: string;
  nip: string;
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
  const [instansiAsal, setInstansiAsal] = useState(initialProfile.instansiAsal || "");
  const [instansiList, setInstansiList] = useState<string[]>([]);
  const [isOtherInstansi, setIsOtherInstansi] = useState(false);
  const [jabatan, setJabatan] = useState(initialProfile.jabatan || "");
  const [pangkat, setPangkat] = useState(initialProfile.pangkat || "");
  const [phone, setPhone] = useState(initialProfile.phone || "");
  const [statementAccepted, setStatementAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    getDistinctInstansiList().then((list) => {
      if (!active) return;
      setInstansiList(list);
      const current = (instansiAsal || "").trim();
      if (current && !list.includes(current)) {
        setIsOtherInstansi(true);
      }
    });
    return () => {
      active = false;
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const cleanNip = nip.replace(/\D/g, "");
  const isNipValid = cleanNip.length >= 16;
  const isNameValid = name.trim().length >= 3;
  const isInstansiValid = instansiAsal.trim().length >= 3;
  const isFormValid = isNameValid && isNipValid && isInstansiValid && statementAccepted;

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
      showToast.error("Kesalahan Sistem", "Terjadi kesalahan saat memproses data.");
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

          {/* Grid: Instansi & Jabatan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-oxford-800 dark:text-oxford-200 mb-1">
                Instansi / OPD <span className="text-crimson-500">*</span>
              </label>
              <select
                value={isOtherInstansi ? "__OTHER__" : instansiAsal}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__OTHER__") {
                    setIsOtherInstansi(true);
                    if (instansiList.includes(instansiAsal)) {
                      setInstansiAsal("");
                    }
                  } else {
                    setIsOtherInstansi(false);
                    setInstansiAsal(val);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-oxford-50 dark:bg-oxford-900/60 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
              >
                <option value="">-- Pilih Instansi / OPD --</option>
                {instansiList.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
                <option value="__OTHER__">+ Tambah / Ketik Instansi Lainnya</option>
              </select>
              {(isOtherInstansi || instansiList.length === 0) && (
                <input
                  type="text"
                  required
                  value={instansiAsal}
                  onChange={(e) => setInstansiAsal(e.target.value)}
                  placeholder="Ketik nama instansi lengkap (Contoh: Dinas Kesehatan Prov. Kaltara)"
                  className="mt-2 w-full px-3.5 py-2.5 bg-oxford-50 dark:bg-oxford-900/60 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                />
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
