"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Lock,
  ChevronRight,
  User,
  Building2,
  BookOpen,
  Award,
  Loader2,
  Star,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import {
  CourseEvaluationConfig,
  SKM_QUESTIONS,
  NARASUMBER_EVALUATION_QUESTIONS,
  ORGANIZER_EVALUATION_QUESTIONS,
  calculateSkmScore,
} from "@/lib/skm-constants";
import {
  getTrainingEvaluations,
  submitTrainingEvaluation,
  EvaluationStage,
} from "@/app/actions/evaluations";
import { showToast } from "@/lib/toast";

interface SessionInfo {
  id: string;
  title: string;
  narasumberName?: string | null;
  jp?: number;
}

interface FourStageEvaluationWizardProps {
  courseId: string;
  courseTitle?: string;
  sessions?: SessionInfo[];
  evaluationConfig?: CourseEvaluationConfig | null;
  requestedStage?: EvaluationStage | null;
  onEvaluationsComplete?: () => void;
}

export default function FourStageEvaluationWizard({
  courseId,
  courseTitle,
  sessions = [],
  evaluationConfig,
  requestedStage = null,
  onEvaluationsComplete,
}: FourStageEvaluationWizardProps) {
  const narasumberQuestions =
    evaluationConfig?.narasumber && evaluationConfig.narasumber.length > 0
      ? evaluationConfig.narasumber
      : NARASUMBER_EVALUATION_QUESTIONS;
  const organizerQuestions =
    evaluationConfig?.organizer && evaluationConfig.organizer.length > 0
      ? evaluationConfig.organizer
      : ORGANIZER_EVALUATION_QUESTIONS;
  const skmQuestions =
    evaluationConfig?.skm && evaluationConfig.skm.length > 0
      ? evaluationConfig.skm
      : SKM_QUESTIONS;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStage, setCurrentStage] = useState<EvaluationStage | "completed">("narasumber");
  const [stagesStatus, setStagesStatus] = useState({
    narasumber: false,
    organizer: false,
    understanding: false,
    skm: false,
  });

  // State Stage 1: Narasumber
  const narasumberSessions = sessions.filter(
    (s) => s.narasumberName && s.narasumberName.trim().length > 0
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    narasumberSessions[0]?.id || sessions[0]?.id || "sess_default"
  );
  const [narasumberRatings, setNarasumberRatings] = useState<Record<number, { key: string; score: number }>>({});
  const [narasumberNotes, setNarasumberNotes] = useState("");

  // State Stage 2: Penyelenggara
  const [organizerRatings, setOrganizerRatings] = useState<Record<number, { key: string; score: number }>>({});
  const [organizerNotes, setOrganizerNotes] = useState("");

  // State Stage 3: Pemahaman Materi
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  // State Stage 4: SKM
  const [skmRatings, setSkmRatings] = useState<Record<number, { key: string; text: string; score: number }>>({});
  const [skmNotes, setSkmNotes] = useState("");

  // Refresh status from server
  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await getTrainingEvaluations(courseId);
      if (res.success && res.stages) {
        const nextStatus = {
          narasumber: Boolean(res.stages.narasumber.completed),
          organizer: Boolean(res.stages.organizer.completed),
          understanding: Boolean(res.stages.understanding.completed),
          skm: Boolean(res.stages.skm.completed),
        };
        setStagesStatus(nextStatus);
        const canJump =
          requestedStage &&
          (requestedStage === "narasumber" ||
            (requestedStage === "organizer" && nextStatus.narasumber) ||
            (requestedStage === "understanding" && nextStatus.organizer) ||
            (requestedStage === "skm" && nextStatus.understanding));
        setCurrentStage(canJump ? requestedStage : (res.currentStage as EvaluationStage | "completed"));
        if (res.allCompleted && onEvaluationsComplete) {
          onEvaluationsComplete();
        }
      }
    } catch (err) {
      console.error("loadStatus error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [courseId]);

  // Stage 1 Submit
  const handleNarasumberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const answeredCount = Object.keys(narasumberRatings).length;
    if (answeredCount < narasumberQuestions.length) {
      showToast.warning("Lengkapi Penilaian", `Harap isi seluruh ${narasumberQuestions.length} aspek penilaian narasumber.`);
      return;
    }

    setSubmitting(true);
    try {
      const ratingsArray = Object.entries(narasumberRatings).map(([id, val]) => ({
        questionId: Number(id),
        score: val.score,
      }));

      const res = await submitTrainingEvaluation({
        courseId,
        stage: "narasumber",
        sessionId: selectedSessionId,
        answers: {
          ratings: ratingsArray,
          notes: narasumberNotes.trim(),
        },
      });

      if (res.success) {
        if (res.nextStage === "narasumber") {
          const nextSess = narasumberSessions.find((s) => s.id !== selectedSessionId);
          if (nextSess) setSelectedSessionId(nextSess.id);
          setNarasumberRatings({});
          setNarasumberNotes("");
          showToast.success("Evaluasi Narasumber Disimpan", "Silakan lanjut menilai narasumber sesi berikutnya.");
        } else {
          showToast.success("Tahap 1 Selesai!", "Seluruh evaluasi narasumber berhasil disimpan.");
          setStagesStatus((prev) => ({ ...prev, narasumber: true }));
          setCurrentStage("organizer");
        }
      } else {
        showToast.error("Gagal Menyimpan", res.error || "Gagal menyimpan evaluasi.");
      }
    } catch {
      showToast.error("Kesalahan Sistem", "Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  // Stage 2 Submit
  const handleOrganizerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const answeredCount = Object.keys(organizerRatings).length;
    if (answeredCount < organizerQuestions.length) {
      showToast.warning("Lengkapi Penilaian", `Harap isi seluruh ${organizerQuestions.length} aspek penilaian penyelenggaraan.`);
      return;
    }

    setSubmitting(true);
    try {
      const ratingsArray = Object.entries(organizerRatings).map(([id, val]) => ({
        questionId: Number(id),
        score: val.score,
      }));

      const res = await submitTrainingEvaluation({
        courseId,
        stage: "organizer",
        answers: {
          ratings: ratingsArray,
          notes: organizerNotes.trim(),
        },
      });

      if (res.success) {
        showToast.success("Tahap 2 Selesai!", "Evaluasi penyelenggaraan berhasil disimpan.");
        setStagesStatus((prev) => ({ ...prev, organizer: true }));
        setCurrentStage("understanding");
      } else {
        showToast.error("Gagal Menyimpan", res.error || "Gagal menyimpan evaluasi.");
      }
    } catch {
      showToast.error("Kesalahan Sistem", "Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  // Stage 3 Questions
  const DEFAULT_COMPREHENSION_QUESTIONS = [
    {
      id: 1,
      question: "Apakah prinsip utama dalam penyusunan instrumen fasilitasi pelatihan klasikal bagi ASN?",
      options: [
        { text: "Berorientasi hasil, terstruktur, andragogis, dan terukur", correct: true },
        { text: "Hanya menitikberatkan pada ceramah satu arah", correct: false },
        { text: "Tidak memerlukan presensi jam pelajaran", correct: false },
        { text: "Menghindari evaluasi bertahap", correct: false },
      ],
    },
    {
      id: 2,
      question: "Berapa batas minimal persentase kehadiran JP untuk syarat penerbitan sertifikat pelatihan klasikal?",
      options: [
        { text: "50% dari total JP", correct: false },
        { text: "70% dari total JP", correct: false },
        { text: "80% dari total JP", correct: true },
        { text: "100% tanpa toleransi", correct: false },
      ],
    },
    {
      id: 3,
      question: "Survei Kepuasan Masyarakat (SKM) dalam pelatihan mengacu pada regulasi:",
      options: [
        { text: "PermenPANRB No. 14 Tahun 2017", correct: true },
        { text: "Permendagri No. 1 Tahun 2000", correct: false },
        { text: "Perpres Pengadaan Barang & Jasa", correct: false },
        { text: "UU Cipta Kerja", correct: false },
      ],
    },
  ];

  // Stage 3 Submit
  const handleUnderstandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(quizAnswers).length < DEFAULT_COMPREHENSION_QUESTIONS.length) {
      showToast.warning("Jawab Seluruh Soal", "Harap selesaikan seluruh pertanyaan evaluasi pemahaman.");
      return;
    }

    setSubmitting(true);
    try {
      let correct = 0;
      DEFAULT_COMPREHENSION_QUESTIONS.forEach((q) => {
        const selectedIdx = quizAnswers[q.id];
        if (selectedIdx !== undefined && q.options[selectedIdx]?.correct) {
          correct++;
        }
      });
      const score = Math.round((correct / DEFAULT_COMPREHENSION_QUESTIONS.length) * 100);

      const res = await submitTrainingEvaluation({
        courseId,
        stage: "understanding",
        answers: {
          quizAnswers,
          score,
          correctCount: correct,
          totalQuestions: DEFAULT_COMPREHENSION_QUESTIONS.length,
        },
        score,
      });

      if (res.success) {
        showToast.success("Tahap 3 Selesai!", `Evaluasi pemahaman materi tuntas dengan skor ${score}/100.`);
        setStagesStatus((prev) => ({ ...prev, understanding: true }));
        setCurrentStage("skm");
      } else {
        showToast.error("Gagal Menyimpan", res.error || "Gagal menyimpan evaluasi.");
      }
    } catch {
      showToast.error("Kesalahan Sistem", "Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  // Stage 4 Submit (SKM 9 Unsur)
  const handleSkmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(skmRatings).length < skmQuestions.length) {
      showToast.warning("Lengkapi Kuesioner SKM", `Harap isi seluruh ${skmQuestions.length} unsur pelayanan publik.`);
      return;
    }

    setSubmitting(true);
    try {
      const skmAnswersList = Object.entries(skmRatings).map(([id, val]) => ({
        questionId: Number(id),
        questionText: skmQuestions.find((q) => q.id === Number(id))?.question || "",
        optionKey: val.key as "A" | "B" | "C" | "D",
        optionText: val.text,
        score: val.score,
      }));

      const skmResult = calculateSkmScore(skmAnswersList);
      const finalScore = skmResult.score;

      const res = await submitTrainingEvaluation({
        courseId,
        stage: "skm",
        answers: {
          skmAnswers: skmAnswersList,
          score: finalScore,
          notes: skmNotes.trim(),
        },
        score: finalScore,
      });

      if (res.success) {
        showToast.success("Seluruh Evaluasi Selesai! 🎉", `Survei SKM berhasil diserahkan (Indeks: ${finalScore}).`);
        setStagesStatus({ narasumber: true, organizer: true, understanding: true, skm: true });
        setCurrentStage("completed");
        if (onEvaluationsComplete) {
          onEvaluationsComplete();
        }
      } else {
        showToast.error("Gagal Menyimpan SKM", res.error || "Gagal menyimpan survei SKM.");
      }
    } catch {
      showToast.error("Kesalahan Sistem", "Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700">
        <Loader2 className="animate-spin text-gold-500 mx-auto mb-2" size={28} />
        <p className="text-xs text-oxford-500">Memuat status rangkaian evaluasi...</p>
      </div>
    );
  }

  const STAGES_LIST = [
    { key: "narasumber", title: "1. Narasumber", icon: User },
    { key: "organizer", title: "2. Penyelenggara", icon: Building2 },
    { key: "understanding", title: "3. Pemahaman Materi", icon: BookOpen },
    { key: "skm", title: "4. Survei SKM", icon: Award },
  ];

  return (
    <div className="bg-white dark:bg-[#161B2A] rounded-3xl border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden">
      {/* Header Wizard Steps */}
      <div className="p-4 md:p-6 bg-oxford-50 dark:bg-oxford-950 border-b border-oxford-200 dark:border-oxford-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base md:text-lg font-bold text-oxford-900 dark:text-white">
              Rangkaian 4 Tahap Evaluasi Pelatihan
            </h3>
            <p className="text-xs text-oxford-500 dark:text-oxford-400">
              Selesaikan secara berurutan sebagai syarat wajib penerbitan sertifikat resmi.
            </p>
          </div>
          {currentStage === "completed" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 size={14} />
              4/4 Selesai
            </span>
          )}
        </div>

        {/* Stepper Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STAGES_LIST.map((st, idx) => {
            const isDone = stagesStatus[st.key as keyof typeof stagesStatus];
            const isActive = currentStage === st.key;
            const Icon = st.icon;

            return (
              <button
                key={st.key}
                type="button"
                onClick={() => {
                  if (isDone || isActive) {
                    setCurrentStage(st.key as EvaluationStage);
                  }
                }}
                disabled={!isDone && !isActive}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                  isDone
                    ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-400 cursor-pointer text-emerald-900 dark:text-emerald-200"
                    : isActive
                    ? "bg-gold-50 dark:bg-gold-950/70 border-gold-400 dark:border-gold-500/50 shadow-xs cursor-default ring-1 ring-gold-400/40 dark:ring-gold-500/20 text-oxford-950 dark:text-gold-200"
                    : "bg-oxford-100/50 dark:bg-oxford-900/30 border-oxford-200 dark:border-oxford-800/60 text-oxford-600 dark:text-oxford-400 cursor-not-allowed opacity-80"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isActive
                      ? "bg-gold-500 text-oxford-950 dark:bg-gold-400 dark:text-oxford-950 shadow-xs"
                      : "bg-oxford-200 dark:bg-oxford-800 text-oxford-600 dark:text-oxford-400"
                  }`}
                >
                  {isDone ? <CheckCircle2 size={16} /> : idx + 1}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-bold truncate ${
                      isDone
                        ? "text-emerald-950 dark:text-emerald-200"
                        : isActive
                        ? "text-oxford-950 dark:text-gold-200"
                        : "text-oxford-700 dark:text-oxford-300"
                    }`}
                  >
                    {st.title}
                  </p>
                  <p
                    className={`text-[10px] font-medium ${
                      isDone
                        ? "text-emerald-700 dark:text-emerald-400"
                        : isActive
                        ? "text-gold-800 dark:text-gold-300"
                        : "text-oxford-500 dark:text-oxford-400"
                    }`}
                  >
                    {isDone ? "Selesai" : isActive ? "Aktif" : "Terkunci"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Body Content per Stage */}
      <div className="p-6 md:p-8">
        {/* COMPLETED CELEBRATION */}
        {currentStage === "completed" && (
          <div className="text-center py-8 space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Award size={36} />
            </div>
            <h4 className="text-xl font-bold text-oxford-900 dark:text-white">
              Seluruh Evaluasi Selesai Dilengkapi!
            </h4>
            <p className="text-xs text-oxford-600 dark:text-oxford-300 leading-relaxed">
              Terima kasih atas partisipasi dan penilaian Anda pada Pelatihan Fasilitasi OPD Luar. Seluruh 4 tahap evaluasi telah terekam di pangkalan data BPSDM Kaltara.
            </p>
            <div className="p-4 bg-gold-50 dark:bg-gold-950/30 rounded-xl border border-gold-200 dark:border-gold-800/60 text-xs font-medium text-gold-950 dark:text-gold-200">
              Tombol unduh sertifikat resmi kini terbuka pada halaman progres jika presensi Anda telah memenuhi batas minimal 80% total JP.
            </div>
          </div>
        )}

        {/* STAGE 1: NARASUMBER */}
        {currentStage === "narasumber" && (
          <form onSubmit={handleNarasumberSubmit} className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-oxford-100 dark:border-oxford-800">
              <User size={20} className="text-gold-500" />
              <div>
                <h4 className="text-base font-bold text-oxford-900 dark:text-white">
                  Tahap 1: Evaluasi Narasumber / Fasilitator Sesi
                </h4>
                <p className="text-xs text-oxford-500">
                  Berikan penilaian Anda terhadap kompetensi, artikulasi, dan fasilitasi narasumber.
                </p>
              </div>
            </div>

            {/* Session Selector */}
            {narasumberSessions.length === 1 && (
              <div className="px-3.5 py-2.5 rounded-xl bg-oxford-50 dark:bg-oxford-900 border border-oxford-200 dark:border-oxford-700 text-xs font-bold text-oxford-900 dark:text-white">
                Narasumber Sesi: {narasumberSessions[0].narasumberName} ({narasumberSessions[0].title})
              </div>
            )}
            {narasumberSessions.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-oxford-800 dark:text-oxford-200 mb-1">
                  Pilih Narasumber Sesi yang Dinilai:
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full px-3 py-2 bg-oxford-50 dark:bg-oxford-900 border border-oxford-200 dark:border-oxford-700 rounded-xl text-xs font-bold text-oxford-900 dark:text-white"
                >
                  {narasumberSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.narasumberName} &mdash; {s.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Questions */}
            <div className="space-y-4">
              {narasumberQuestions.map((q) => (
                <div
                  key={q.id}
                  className="p-4 bg-oxford-50/70 dark:bg-oxford-900/40 rounded-2xl border border-oxford-200/80 dark:border-oxford-800"
                >
                  <p className="text-xs font-bold text-oxford-900 dark:text-white mb-2.5">
                    {q.id}. {q.question}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {q.options.map((opt) => {
                      const isSelected = narasumberRatings[q.id]?.key === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() =>
                            setNarasumberRatings((prev) => ({
                              ...prev,
                              [q.id]: { key: opt.key, score: opt.score },
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-1.5 transition-all ${
                            isSelected
                              ? "bg-gold-500 border-gold-600 text-oxford-950 shadow-sm"
                              : "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-300 hover:border-gold-400"
                          }`}
                        >
                          <span>{opt.text}</span>
                          <span className="text-[10px] opacity-75 font-mono">({opt.score})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Qualitative Notes */}
            <div>
              <label className="block text-xs font-bold text-oxford-800 dark:text-oxford-200 mb-1">
                Catatan Apresiasi & Masukan untuk Narasumber (Opsional):
              </label>
              <textarea
                rows={3}
                value={narasumberNotes}
                onChange={(e) => setNarasumberNotes(e.target.value)}
                placeholder="Tuliskan masukan atau hal positif dari penyampaian materi..."
                className="w-full px-3.5 py-2.5 bg-oxford-50 dark:bg-oxford-900 border border-oxford-200 dark:border-oxford-700 rounded-xl text-xs text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 text-oxford-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              <span>Simpan & Lanjut ke Tahap 2: Kualitas Penyelenggaraan</span>
            </button>
          </form>
        )}

        {/* STAGE 2: PENYELENGGARA */}
        {currentStage === "organizer" && (
          <form onSubmit={handleOrganizerSubmit} className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-oxford-100 dark:border-oxford-800">
              <Building2 size={20} className="text-gold-500" />
              <div>
                <h4 className="text-base font-bold text-oxford-900 dark:text-white">
                  Tahap 2: Evaluasi Kualitas Penyelenggaraan Pelatihan
                </h4>
                <p className="text-xs text-oxford-500">
                  Penilaian kepanitiaan, fasilitas kelas, konsumsi, dan sarana prasarana pelatihan.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {organizerQuestions.map((q) => (
                <div
                  key={q.id}
                  className="p-4 bg-oxford-50/70 dark:bg-oxford-900/40 rounded-2xl border border-oxford-200/80 dark:border-oxford-800"
                >
                  <p className="text-xs font-bold text-oxford-900 dark:text-white mb-2.5">
                    {q.id}. {q.question}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {q.options.map((opt) => {
                      const isSelected = organizerRatings[q.id]?.key === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() =>
                            setOrganizerRatings((prev) => ({
                              ...prev,
                              [q.id]: { key: opt.key, score: opt.score },
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-1.5 transition-all ${
                            isSelected
                              ? "bg-gold-500 border-gold-600 text-oxford-950 shadow-sm"
                              : "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-300 hover:border-gold-400"
                          }`}
                        >
                          <span>{opt.text}</span>
                          <span className="text-[10px] opacity-75 font-mono">({opt.score})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-oxford-800 dark:text-oxford-200 mb-1">
                Catatan Masukan Penyelenggaraan (Opsional):
              </label>
              <textarea
                rows={3}
                value={organizerNotes}
                onChange={(e) => setOrganizerNotes(e.target.value)}
                placeholder="Tuliskan saran untuk penyempurnaan fasilitas dan pelayanan panitia..."
                className="w-full px-3.5 py-2.5 bg-oxford-50 dark:bg-oxford-900 border border-oxford-200 dark:border-oxford-700 rounded-xl text-xs text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 text-oxford-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              <span>Simpan & Lanjut ke Tahap 3: Pemahaman Materi</span>
            </button>
          </form>
        )}

        {/* STAGE 3: PEMAHAMAN MATERI */}
        {currentStage === "understanding" && (
          <form onSubmit={handleUnderstandingSubmit} className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-oxford-100 dark:border-oxford-800">
              <BookOpen size={20} className="text-gold-500" />
              <div>
                <h4 className="text-base font-bold text-oxford-900 dark:text-white">
                  Tahap 3: Evaluasi Tingkat Pemahaman Materi
                </h4>
                <p className="text-xs text-oxford-500">
                  Uji pemahaman konsep substansi fasilitasi pelatihan yang telah dipelajari.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {DEFAULT_COMPREHENSION_QUESTIONS.map((q) => (
                <div
                  key={q.id}
                  className="p-4 bg-oxford-50/70 dark:bg-oxford-900/40 rounded-2xl border border-oxford-200/80 dark:border-oxford-800"
                >
                  <p className="text-xs font-bold text-oxford-900 dark:text-white mb-2.5">
                    {q.id}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = quizAnswers[q.id] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() =>
                            setQuizAnswers((prev) => ({
                              ...prev,
                              [q.id]: optIdx,
                            }))
                          }
                          className={`w-full p-3 rounded-xl border text-xs text-left font-medium flex items-center gap-3 transition-all ${
                            isSelected
                              ? "bg-gold-50 dark:bg-gold-950/40 border-gold-500 text-oxford-950 dark:text-gold-200 font-bold"
                              : "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-300 hover:border-gold-300"
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border flex-shrink-0 ${
                              isSelected
                                ? "bg-gold-500 border-gold-600 text-oxford-950"
                                : "border-oxford-300 dark:border-oxford-600"
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 text-oxford-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              <span>Simpan & Lanjut ke Tahap 4: Survei Kepuasan Masyarakat (SKM)</span>
            </button>
          </form>
        )}

        {/* STAGE 4: SURVEI SKM 9 UNSUR */}
        {currentStage === "skm" && (
          <form onSubmit={handleSkmSubmit} className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-oxford-100 dark:border-oxford-800">
              <Award size={20} className="text-gold-500" />
              <div>
                <h4 className="text-base font-bold text-oxford-900 dark:text-white">
                  Tahap 4: Survei Kepuasan Masyarakat (SKM PermenPANRB No. 14/2017)
                </h4>
                <p className="text-xs text-oxford-500">
                  9 Unsur Standar Pelayanan Publik Nasional untuk akuntabilitas mutu pelatihan.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {skmQuestions.map((q) => (
                <div
                  key={q.id}
                  className="p-4 bg-oxford-50/70 dark:bg-oxford-900/40 rounded-2xl border border-oxford-200/80 dark:border-oxford-800"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold-100 dark:bg-gold-950 text-gold-800 dark:text-gold-300">
                      Unsur {q.id}: {q.criterion}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-oxford-900 dark:text-white mb-2.5">
                    {q.question}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {q.options.map((opt) => {
                      const isSelected = skmRatings[q.id]?.key === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() =>
                            setSkmRatings((prev) => ({
                              ...prev,
                              [q.id]: { key: opt.key, text: opt.text, score: opt.score },
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-1.5 transition-all ${
                            isSelected
                              ? "bg-gold-500 border-gold-600 text-oxford-950 shadow-sm"
                              : "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-300 hover:border-gold-400"
                          }`}
                        >
                          <span className="truncate">{opt.text}</span>
                          <span className="text-[10px] opacity-75 font-mono">({opt.score})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-oxford-800 dark:text-oxford-200 mb-1">
                Kritik & Saran Pelayanan BPSDM (Opsional):
              </label>
              <textarea
                rows={3}
                value={skmNotes}
                onChange={(e) => setSkmNotes(e.target.value)}
                placeholder="Tuliskan saran konstruktif untuk peningkatan mutu fasilitasi ke depan..."
                className="w-full px-3.5 py-2.5 bg-oxford-50 dark:bg-oxford-900 border border-oxford-200 dark:border-oxford-700 rounded-xl text-xs text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
              <span>Selesaikan Rangkaian Evaluasi & Ajukan Kelulusan Sertifikat</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
