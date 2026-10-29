"use client";

import { useState, useEffect } from "react";
import {
  getCertificateGlobalSequence,
  updateCertificateGlobalSequence,
  updateCertificateGlobalFormat,
  getPassportIntegrationSettings,
  savePassportIntegrationSettings,
  testPassportIntegrationConnection,
} from "@/app/actions/courses";
import {
  Hash,
  CheckCircle,
  AlertCircle,
  Save,
  RefreshCw,
  Info,
  ShieldCheck,
  Activity,
  Eye,
  EyeOff,
  Server,
  Key,
  ExternalLink,
} from "lucide-react";

export function CertificateNumberingAdmin() {
  const [loading, setLoading] = useState(true);
  const [submittingWebinar, setSubmittingWebinar] = useState(false);
  const [submittingCourse, setSubmittingCourse] = useState(false);
  const [submittingFormat, setSubmittingFormat] = useState(false);

  // Integrasi Satu Pintu state
  const [passportForm, setPassportForm] = useState({
    enabled: true,
    apiUrl: "https://api.learningpassport.space",
    apiKey: "",
    maskedApiKey: "",
    source: "none" as "database" | "env" | "none",
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [submittingPassport, setSubmittingPassport] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

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
      const [res, passportRes] = await Promise.all([
        getCertificateGlobalSequence(),
        getPassportIntegrationSettings(),
      ]);

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

      if (passportRes.success) {
        setPassportForm({
          enabled: passportRes.enabled ?? true,
          apiUrl: passportRes.apiUrl || "https://learningpassport.kaltaraprov.go.id",
          apiKey: "",
          maskedApiKey: passportRes.maskedApiKey || "",
          source: passportRes.source || "none",
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

  async function handleSavePassportSettings(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingPassport(true);
    setMessage(null);
    setTestResult(null);
    try {
      const res = await savePassportIntegrationSettings({
        apiUrl: passportForm.apiUrl,
        apiKey: passportForm.apiKey || undefined,
        enabled: passportForm.enabled,
      });

      if (res.success) {
        setMessage({
          type: "success",
          text: "Konfigurasi Integrasi Satu Pintu ASN Learning Passport berhasil disimpan ke database.",
        });
        setPassportForm((prev) => ({
          ...prev,
          apiKey: "",
          maskedApiKey: res.maskedApiKey || prev.maskedApiKey,
          source: "database",
        }));
      } else {
        setMessage({
          type: "error",
          text: res.error || "Gagal menyimpan konfigurasi integrasi.",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Terjadi kesalahan saat menyimpan konfigurasi integrasi.",
      });
    } finally {
      setSubmittingPassport(false);
    }
  }

  async function handleTestPassportConnection() {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testPassportIntegrationConnection({
        apiUrl: passportForm.apiUrl,
        apiKey: passportForm.apiKey || undefined,
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: res.message || "Koneksi berhasil terhubung ke server ASN Learning Passport!",
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || "Gagal terhubung ke server ASN Learning Passport.",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Terjadi kesalahan saat menguji koneksi.",
      });
    } finally {
      setTestingConnection(false);
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

      {/* KARTU UTAMA: Integrasi Satu Pintu (ASN Learning Passport API) */}
      <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-emerald-200/80 dark:border-emerald-800/60 p-6 space-y-6 relative overflow-hidden">
        {/* Accent glow line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-oxford-100 dark:border-oxford-900 pb-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-bold text-base text-oxford-900 dark:text-white">
                  Integrasi Satu Pintu — Master Register ASN Learning Passport
                </h3>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    passportForm.enabled
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                  }`}
                >
                  {passportForm.enabled ? "Aktif (Prioritas Utama)" : "Dinonaktifkan"}
                </span>
                {passportForm.source === "database" && (
                  <span className="text-[10px] bg-oxford-100 dark:bg-oxford-800 text-oxford-600 dark:text-oxford-300 px-2 py-0.5 rounded-md font-mono">
                    Sumber: Database
                  </span>
                )}
                {passportForm.source === "env" && (
                  <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-mono">
                    Sumber: .env
                  </span>
                )}
              </div>
              <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-0.5">
                Single Source of Truth penomoran sertifikat resmi BPSDM Kaltara & auto-sync ke Paspor Pembelajaran ASN.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto select-none">
            <input
              type="checkbox"
              checked={passportForm.enabled}
              onChange={(e) => setPassportForm((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-oxford-200 peer-focus:outline-none rounded-full peer dark:bg-oxford-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-oxford-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            <span className="text-xs font-semibold text-oxford-700 dark:text-oxford-300">
              {passportForm.enabled ? "Aktifkan" : "Nonaktifkan"}
            </span>
          </label>
        </div>

        <form onSubmit={handleSavePassportSettings} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-oxford-700 dark:text-oxford-300 flex items-center gap-1.5">
                <Server size={14} className="text-oxford-400" />
                URL Backend ASN Learning Passport:
              </label>
              <input
                type="url"
                required
                value={passportForm.apiUrl}
                onChange={(e) => setPassportForm((prev) => ({ ...prev, apiUrl: e.target.value }))}
                placeholder="https://learningpassport.kaltaraprov.go.id"
                className="w-full px-3.5 py-2.5 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-950 text-oxford-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <p className="text-[11px] text-oxford-500 dark:text-oxford-400">
                Alamat domain publik atau IP server backend Passport.
              </p>
            </div>

            {/* Input API Key */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-oxford-700 dark:text-oxford-300 flex items-center gap-1.5">
                <Key size={14} className="text-oxford-400" />
                API Key Kredensial:
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={passportForm.apiKey}
                  onChange={(e) => setPassportForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={passportForm.maskedApiKey || "asnlp_live_..."}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-950 text-oxford-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-200"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-oxford-500 dark:text-oxford-400">
                {passportForm.maskedApiKey
                  ? `Tersimpan: ${passportForm.maskedApiKey} (Kosongkan jika tidak ingin mengubah)`
                  : 'Ketik atau tempelkan API Key baru berawalan "asnlp_live_".'}
              </p>
            </div>
          </div>

          {/* Test Result Feedback */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                  : "bg-crimson-50 dark:bg-crimson-950/30 border-crimson-200 dark:border-crimson-800 text-crimson-800 dark:text-crimson-200"
              }`}
            >
              {testResult.success ? (
                <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-crimson-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestPassportConnection}
                disabled={testingConnection || submittingPassport}
                className="px-4 py-2.5 bg-oxford-100 hover:bg-oxford-200 dark:bg-oxford-800 dark:hover:bg-oxford-700 text-oxford-800 dark:text-oxford-100 font-semibold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {testingConnection ? (
                  <RefreshCw size={14} className="animate-spin text-emerald-500" />
                ) : (
                  <Activity size={14} className="text-emerald-600 dark:text-emerald-400" />
                )}
                {testingConnection ? "Menguji Koneksi..." : "Uji Koneksi Server"}
              </button>
            </div>

            <button
              type="submit"
              disabled={submittingPassport || testingConnection}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={14} />
              {submittingPassport ? "Menyimpan ke DB..." : "Simpan Pengaturan"}
            </button>
          </div>
        </form>

        <div className="flex items-start gap-2.5 p-3.5 bg-oxford-50 dark:bg-oxford-950/40 rounded-xl border border-oxford-100 dark:border-oxford-800/60 text-[11px] text-oxford-600 dark:text-oxford-400">
          <Info size={15} className="shrink-0 text-gold-500 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Mekanisme Tanpa Restart (Zero Downtime):</strong> Pengaturan ini tersimpan langsung di database PostgreSQL CorpuKU. Anda tidak perlu me-restart server atau mengedit file <code className="px-1 py-0.5 bg-white dark:bg-oxford-900 rounded font-mono">.env</code>. Jika server Passport sedang offline/pemeliharaan, CorpuKU secara otomatis beralih ke counter lokal di bawah ini sehingga proses penerbitan sertifikat peserta tetap lancar tanpa gangguan.
          </p>
        </div>
      </div>

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
