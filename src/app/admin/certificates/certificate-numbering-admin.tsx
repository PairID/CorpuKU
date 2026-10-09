"use client";

import { useState, useEffect } from "react";
import {
  getCertificateGlobalSequence,
  updateCertificateGlobalSequence,
  updateCertificateGlobalFormat,
} from "@/app/actions/courses";
import { Hash, CheckCircle, AlertCircle, Save, RefreshCw, Info } from "lucide-react";

export function CertificateNumberingAdmin() {
  const [loading, setLoading] = useState(true);
  const [submittingWebinar, setSubmittingWebinar] = useState(false);
  const [submittingCourse, setSubmittingCourse] = useState(false);
  const [submittingFormat, setSubmittingFormat] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [seqData, setSeqData] = useState<{
    webinar: { currentValue: number; nextValue: number; isCalled: boolean };
    course: { currentValue: number; nextValue: number; isCalled: boolean };
    format: { classificationCode?: string; institutionCode?: string; delimiter?: string };
  }>({
    webinar: { currentValue: 1, nextValue: 1, isCalled: false },
    course: { currentValue: 1, nextValue: 1, isCalled: false },
    format: { classificationCode: "800.2.5", institutionCode: "BPSDM", delimiter: "/" },
  });

  const [customWebinarNext, setCustomWebinarNext] = useState<number>(1);
  const [customCourseNext, setCustomCourseNext] = useState<number>(1);
  const [formatForm, setFormatForm] = useState({
    classificationCode: "800.2.5",
    institutionCode: "BPSDM",
  });

  async function loadData() {
    setLoading(true);
    try {
      const res = await getCertificateGlobalSequence();
      if (res.success && res.webinar && res.course) {
        setSeqData({
          webinar: res.webinar,
          course: res.course,
          format: res.format,
        });
        setCustomWebinarNext(res.webinar.nextValue);
        setCustomCourseNext(res.course.nextValue);
        setFormatForm({
          classificationCode: res.format.classificationCode || "800.2.5",
          institutionCode: res.format.institutionCode || "BPSDM",
        });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Gagal memuat status penomoran sertifikat." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSaveWebinarSequence(e: React.FormEvent) {
    e.preventDefault();
    if (customWebinarNext < 1) {
      setMessage({ type: "error", text: "Nomor urut webinar harus minimal 1." });
      return;
    }
    setSubmittingWebinar(true);
    setMessage(null);
    try {
      const res = await updateCertificateGlobalSequence("webinar", customWebinarNext);
      if (res.success) {
        setMessage({
          type: "success",
          text: `Nomor urut awal webinar berhasil diset ke ${customWebinarNext}. Sertifikat berikutnya akan mulai dari nomor ini.`,
        });
        await loadData();
      } else {
        setMessage({ type: "error", text: res.error || "Gagal memperbarui nomor urut webinar." });
      }
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan saat menyimpan nomor urut webinar." });
    } finally {
      setSubmittingWebinar(false);
    }
  }

  async function handleSaveCourseSequence(e: React.FormEvent) {
    e.preventDefault();
    if (customCourseNext < 1) {
      setMessage({ type: "error", text: "Nomor urut pelatihan/kursus harus minimal 1." });
      return;
    }
    setSubmittingCourse(true);
    setMessage(null);
    try {
      const res = await updateCertificateGlobalSequence("course", customCourseNext);
      if (res.success) {
        setMessage({
          type: "success",
          text: `Nomor urut awal kursus berhasil diset ke ${customCourseNext}.`,
        });
        await loadData();
      } else {
        setMessage({ type: "error", text: res.error || "Gagal memperbarui nomor urut kursus." });
      }
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan saat menyimpan nomor urut kursus." });
    } finally {
      setSubmittingCourse(false);
    }
  }

  async function handleSaveFormat(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingFormat(true);
    setMessage(null);
    try {
      const res = await updateCertificateGlobalFormat(formatForm);
      if (res.success) {
        setMessage({
          type: "success",
          text: "Format standar nomor sertifikat berhasil diperbarui.",
        });
        await loadData();
      } else {
        setMessage({ type: "error", text: res.error || "Gagal memperbarui format sertifikat." });
      }
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan saat menyimpan format." });
    } finally {
      setSubmittingFormat(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-100 dark:border-oxford-800">
        <RefreshCw className="animate-spin text-gold-500 mr-2" size={20} />
        <span className="text-sm text-oxford-600 dark:text-oxford-300">Memuat status nomor sertifikat...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-crimson-50 dark:bg-crimson-950/30 border-crimson-200 dark:border-crimson-800 text-crimson-800 dark:text-crimson-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="shrink-0 mt-0.5 text-emerald-600" size={18} />
          ) : (
            <AlertCircle className="shrink-0 mt-0.5 text-crimson-600" size={18} />
          )}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Grid: 2 Card Sequence Control */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Webinar Sequence Card */}
        <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-oxford-50 dark:border-oxford-900 pb-3">
            <div className="w-10 h-10 rounded-xl bg-gold-50 dark:bg-gold-950/30 flex items-center justify-center text-gold-600 dark:text-gold-400">
              <Hash size={20} />
            </div>
            <div>
              <h3 className="font-bold text-oxford-900 dark:text-white">Nomor Urut Global Webinar</h3>
              <p className="text-xs text-oxford-500 dark:text-oxford-400">Buku Register Sertifikat Webinar Terpusat</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-oxford-50 dark:bg-oxford-950/50 p-4 rounded-xl border border-oxford-100 dark:border-oxford-800/60">
            <div>
              <span className="text-[11px] font-semibold text-oxford-500 dark:text-oxford-400 uppercase tracking-wider block">Terakhir Terbit</span>
              <span className="text-xl font-bold font-mono text-oxford-900 dark:text-white">{seqData.webinar.currentValue}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-oxford-500 dark:text-oxford-400 uppercase tracking-wider block">Berikutnya Terbit</span>
              <span className="text-xl font-bold font-mono text-gold-600 dark:text-gold-400">{seqData.webinar.nextValue}</span>
            </div>
          </div>

          <form onSubmit={handleSaveWebinarSequence} className="space-y-3">
            <label className="block text-xs font-semibold text-oxford-700 dark:text-oxford-300">
              Atur Nomor Awal Berikutnya (Next Sequence):
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                required
                value={customWebinarNext}
                onChange={(e) => setCustomWebinarNext(parseInt(e.target.value) || 1)}
                className="flex-1 px-3 py-2 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-950 text-oxford-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
              <button
                type="submit"
                disabled={submittingWebinar}
                className="px-4 py-2 bg-oxford-900 hover:bg-oxford-800 text-white dark:bg-gold-500 dark:hover:bg-gold-600 dark:text-oxford-950 font-medium text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                <Save size={14} />
                {submittingWebinar ? "Menyimpan..." : "Terapkan"}
              </button>
            </div>
            <p className="text-[11px] text-oxford-500 dark:text-oxford-400 leading-relaxed">
              Gunakan jika ingin melompati nomor register atau mereset nomor urut di awal tahun kalender.
            </p>
          </form>
        </div>

        {/* Course Sequence Card */}
        <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-oxford-50 dark:border-oxford-900 pb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Hash size={20} />
            </div>
            <div>
              <h3 className="font-bold text-oxford-900 dark:text-white">Nomor Urut Global Pelatihan/Kursus</h3>
              <p className="text-xs text-oxford-500 dark:text-oxford-400">Buku Register Sertifikat Kursus / Pelatihan Terpusat</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-oxford-50 dark:bg-oxford-950/50 p-4 rounded-xl border border-oxford-100 dark:border-oxford-800/60">
            <div>
              <span className="text-[11px] font-semibold text-oxford-500 dark:text-oxford-400 uppercase tracking-wider block">Terakhir Terbit</span>
              <span className="text-xl font-bold font-mono text-oxford-900 dark:text-white">{seqData.course.currentValue}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-oxford-500 dark:text-oxford-400 uppercase tracking-wider block">Berikutnya Terbit</span>
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{seqData.course.nextValue}</span>
            </div>
          </div>

          <form onSubmit={handleSaveCourseSequence} className="space-y-3">
            <label className="block text-xs font-semibold text-oxford-700 dark:text-oxford-300">
              Atur Nomor Awal Berikutnya (Next Sequence):
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                required
                value={customCourseNext}
                onChange={(e) => setCustomCourseNext(parseInt(e.target.value) || 1)}
                className="flex-1 px-3 py-2 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-950 text-oxford-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                type="submit"
                disabled={submittingCourse}
                className="px-4 py-2 bg-oxford-900 hover:bg-oxford-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white font-medium text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                <Save size={14} />
                {submittingCourse ? "Menyimpan..." : "Terapkan"}
              </button>
            </div>
            <p className="text-[11px] text-oxford-500 dark:text-oxford-400 leading-relaxed">
              Mengontrol nomor agenda sertifikat kelulusan e-learning kursus.
            </p>
          </form>
        </div>
      </div>

      {/* Global Numbering Format Configuration Card */}
      <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-oxford-50 dark:border-oxford-900 pb-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
            <Info size={20} />
          </div>
          <div>
            <h3 className="font-bold text-oxford-900 dark:text-white">Format Standar Penomoran Resmi (Naskah Dinas)</h3>
            <p className="text-xs text-oxford-500 dark:text-oxford-400">Standar pemisah garis miring (/) dan kode instansi</p>
          </div>
        </div>

        <form onSubmit={handleSaveFormat} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-oxford-700 dark:text-oxford-300 mb-1">
                Kode Klasifikasi Surat
              </label>
              <input
                type="text"
                required
                value={formatForm.classificationCode}
                onChange={(e) => setFormatForm({ ...formatForm, classificationCode: e.target.value.trim() })}
                className="w-full px-3 py-2 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-950 text-oxford-900 dark:text-white font-mono text-sm"
                placeholder="800.2.5"
              />
              <p className="text-[10px] text-oxford-400 mt-1">Default BPSDM: 800.2.5 (Pengembangan SDM)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-oxford-700 dark:text-oxford-300 mb-1">
                Kode Instansi / Lembaga
              </label>
              <input
                type="text"
                required
                value={formatForm.institutionCode}
                onChange={(e) => setFormatForm({ ...formatForm, institutionCode: e.target.value.trim().toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-950 text-oxford-900 dark:text-white font-mono text-sm"
                placeholder="BPSDM"
              />
              <p className="text-[10px] text-oxford-400 mt-1">Contoh: BPSDM</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-oxford-700 dark:text-oxford-300 mb-1">
                Karakter Pemisah (Delimiter)
              </label>
              <input
                type="text"
                disabled
                value="/"
                className="w-full px-3 py-2 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-100 dark:bg-oxford-900 text-oxford-700 dark:text-oxford-300 font-mono text-sm cursor-not-allowed"
              />
              <p className="text-[10px] text-oxford-400 mt-1">Terkunci ke format resmi garis miring (/)</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gold-50/60 dark:bg-gold-950/20 border border-gold-200/60 dark:border-gold-800/40">
            <span className="text-xs font-semibold text-oxford-700 dark:text-oxford-300 block mb-1">
              Contoh Hasil Penomoran Sertifikat Webinar:
            </span>
            <div className="font-mono text-sm font-bold text-oxford-900 dark:text-gold-300 bg-white dark:bg-oxford-950 px-3 py-2 rounded-lg border border-gold-200 dark:border-gold-900 inline-block">
              {formatForm.classificationCode || "800.2.5"}/{String(seqData.webinar.nextValue).padStart(5, "0")}/{formatForm.institutionCode || "BPSDM"}/AKJ-27/X/{new Date().getFullYear()}
            </div>
            <p className="text-[11px] text-oxford-600 dark:text-oxford-400 mt-2">
              💡 <em>Catatan:</em> Untuk pelatihan atau webinar dengan nomor khusus (misal webinar kerjasama/mandiri), admin dapat memasukkan <strong>Nomor Urut Awal Khusus</strong> langsung pada form edit acara terkait. Jika dikosongkan, penomoran otomatis melanjutkan nomor register global di atas.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingFormat}
              className="px-5 py-2.5 bg-oxford-900 hover:bg-oxford-800 text-white dark:bg-gold-500 dark:hover:bg-gold-600 dark:text-oxford-950 font-medium text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save size={14} />
              {submittingFormat ? "Menyimpan Format..." : "Simpan Format Standar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
