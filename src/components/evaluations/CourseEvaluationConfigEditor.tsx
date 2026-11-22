"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  Plus,
  RotateCcw,
  Trash2,
  UserCheck,
  Building2,
  Star,
  BookOpen,
  CheckCircle,
  Circle,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  CourseEvaluationConfig,
  EvaluationCriterion,
  ComprehensionQuestion,
  NARASUMBER_EVALUATION_QUESTIONS,
  ORGANIZER_EVALUATION_QUESTIONS,
  SKM_QUESTIONS,
  DEFAULT_COMPREHENSION_QUESTIONS,
  getOrganizerEvaluationQuestions,
} from "@/lib/skm-constants";

type EvaluationTab = "narasumber" | "organizer" | "understanding" | "skm";

interface CourseEvaluationConfigEditorProps {
  value: Required<CourseEvaluationConfig>;
  onChange: (next: Required<CourseEvaluationConfig>) => void;
  deliveryMode?: string;
}

const BASE_TABS: {
  key: EvaluationTab;
  label: string;
  desc: string;
  icon: typeof UserCheck;
}[] = [
  {
    key: "narasumber",
    label: "Evaluasi Narasumber",
    desc: "Daftar narasumber otomatis terhubung dengan kolom narasumber pada setiap materi di Kelola Konten & QR.",
    icon: UserCheck,
  },
  {
    key: "organizer",
    label: "Evaluasi Penyelenggara",
    desc: "Penilaian kualitas panitia, ruang kelas, sarana audio-visual, dan konsumsi pelatihan.",
    icon: Building2,
  },
  {
    key: "understanding",
    label: "Pemahaman Materi",
    desc: "Kuis evaluasi pemahaman materi terpisah. Dapat disesuaikan butir soal, opsi jawaban, dan kunci jawabannya.",
    icon: BookOpen,
  },
  {
    key: "skm",
    label: "Survei SKM (9 Unsur)",
    desc: "Instrumen baku Survei Kepuasan Masyarakat mengacu pada PermenPANRB No. 14 Tahun 2017.",
    icon: Star,
  },
];

function cloneDefaultCriterionList(tab: "narasumber" | "organizer" | "skm", mode = "daring"): EvaluationCriterion[] {
  const source =
    tab === "narasumber"
      ? NARASUMBER_EVALUATION_QUESTIONS
      : tab === "organizer"
        ? getOrganizerEvaluationQuestions(mode)
        : SKM_QUESTIONS;
  return source.map((item) => ({
    ...item,
    options: item.options.map((o) => ({ ...o })),
  }));
}

function cloneDefaultUnderstanding(): ComprehensionQuestion[] {
  return DEFAULT_COMPREHENSION_QUESTIONS.map((q) => ({
    ...q,
    options: q.options.map((o) => ({ ...o })),
  }));
}

export default function CourseEvaluationConfigEditor({
  value,
  onChange,
  deliveryMode = "daring",
}: CourseEvaluationConfigEditorProps) {
  const [activeTab, setActiveTab] = useState<EvaluationTab>("narasumber");
  const isUnderstandingEnabled = Boolean(value.enableUnderstanding);

  // Filter tabs: hide understanding tab if disabled
  const visibleTabs = BASE_TABS.filter(
    (tab) => tab.key !== "understanding" || isUnderstandingEnabled
  );

  const toggleUnderstanding = (enabled: boolean) => {
    onChange({
      ...value,
      enableUnderstanding: enabled,
    });
    if (!enabled && activeTab === "understanding") {
      setActiveTab("narasumber");
    }
  };


  // Criterion questions (narasumber, organizer, skm)
  const currentCriteria = (activeTab !== "understanding" ? value[activeTab] : []) || [];
  const understandingQuestions = value.understanding || [];

  const updateCriteria = (nextList: EvaluationCriterion[]) => {
    if (activeTab === "understanding") return;
    const normalized = nextList.map((item, idx) => ({ ...item, id: idx + 1 }));
    onChange({ ...value, [activeTab]: normalized });
  };

  const handleCriterionFieldChange = (
    index: number,
    field: "criterion" | "question",
    val: string
  ) => {
    const updated = currentCriteria.map((q, i) => (i === index ? { ...q, [field]: val } : q));
    updateCriteria(updated);
  };

  const handleCriterionOptionChange = (qIndex: number, optIndex: number, text: string) => {
    const updated = currentCriteria.map((q, i) =>
      i === qIndex
        ? {
            ...q,
            options: q.options.map((opt, oi) =>
              oi === optIndex ? { ...opt, text } : opt
            ),
          }
        : q
    );
    updateCriteria(updated);
  };

  const handleAddCriterion = () => {
    const nextId = currentCriteria.length + 1;
    const newItem: EvaluationCriterion = {
      id: nextId,
      criterion: `Aspek Penilaian ${nextId}`,
      question: "Tuliskan pertanyaan evaluasi di sini...",
      options: [
        { key: "A", text: "Sangat Baik", score: 4 },
        { key: "B", text: "Baik", score: 3 },
        { key: "C", text: "Cukup", score: 2 },
        { key: "D", text: "Kurang", score: 1 },
      ],
    };
    updateCriteria([...currentCriteria, newItem]);
  };

  const handleRemoveCriterion = (index: number) => {
    if (currentCriteria.length <= 1) return;
    updateCriteria(currentCriteria.filter((_, i) => i !== index));
  };

  // Understanding Questions Handlers
  const updateUnderstandingQuestions = (nextList: ComprehensionQuestion[]) => {
    const normalized = nextList.map((q, idx) => ({ ...q, id: idx + 1 }));
    onChange({ ...value, understanding: normalized });
  };

  const handleUnderstandingQuestionTextChange = (qIndex: number, text: string) => {
    const updated = understandingQuestions.map((q, i) =>
      i === qIndex ? { ...q, question: text } : q
    );
    updateUnderstandingQuestions(updated);
  };

  const handleUnderstandingOptionTextChange = (qIndex: number, optIndex: number, text: string) => {
    const updated = understandingQuestions.map((q, i) => {
      if (i !== qIndex) return q;
      const nextOpts = q.options.map((opt, oi) =>
        oi === optIndex ? { ...opt, text } : opt
      );
      return { ...q, options: nextOpts };
    });
    updateUnderstandingQuestions(updated);
  };

  const handleUnderstandingCorrectOption = (qIndex: number, optIndex: number) => {
    const updated = understandingQuestions.map((q, i) => {
      if (i !== qIndex) return q;
      const nextOpts = q.options.map((opt, oi) => ({
        ...opt,
        correct: oi === optIndex,
      }));
      return { ...q, options: nextOpts };
    });
    updateUnderstandingQuestions(updated);
  };

  const handleAddUnderstandingQuestion = () => {
    const nextId = understandingQuestions.length + 1;
    const newItem: ComprehensionQuestion = {
      id: nextId,
      question: "Tuliskan pertanyaan pemahaman materi...",
      options: [
        { text: "Pilihan Jawaban A", correct: true },
        { text: "Pilihan Jawaban B", correct: false },
        { text: "Pilihan Jawaban C", correct: false },
        { text: "Pilihan Jawaban D", correct: false },
      ],
    };
    updateUnderstandingQuestions([...understandingQuestions, newItem]);
  };

  const handleRemoveUnderstandingQuestion = (index: number) => {
    if (understandingQuestions.length <= 1) return;
    updateUnderstandingQuestions(understandingQuestions.filter((_, i) => i !== index));
  };

  const handleResetTab = () => {
    if (activeTab === "understanding") {
      updateUnderstandingQuestions(cloneDefaultUnderstanding());
    } else {
      updateCriteria(cloneDefaultCriterionList(activeTab, deliveryMode));
    }
  };

  const activeMeta = BASE_TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="mt-6 bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-800 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-oxford-100 dark:border-oxford-800">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-500/15 text-gold-600 dark:text-gold-400 flex items-center justify-center shrink-0">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-oxford-900 dark:text-white">
              Instrumen Evaluasi Pelatihan (Otomatis & Dapat Diedit)
            </h3>
            <p className="text-xs text-oxford-500 dark:text-oxford-400">
              Pertanyaan standar Narasumber, Penyelenggara, dan SKM terisi otomatis. Anda dapat menyesuaikan teks instrumen sesuai kebutuhan pelatihan.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleResetTab}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-oxford-200 dark:border-oxford-700 text-xs font-semibold text-oxford-600 dark:text-oxford-300 hover:bg-oxford-50 dark:hover:bg-oxford-900 transition-colors self-start sm:self-auto"
        >
          <RotateCcw size={13} />
          <span>Reset Standar</span>
        </button>
      </div>

      {/* Switch: Aktifkan / Nonaktifkan Tahap Evaluasi Pemahaman */}
      <div className="mt-4 p-4 rounded-xl border border-oxford-200 dark:border-oxford-800 bg-oxford-50/70 dark:bg-oxford-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gold-500/15 text-gold-600 dark:text-gold-400 shrink-0">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-oxford-900 dark:text-white">
                Tahap Evaluasi Pemahaman Materi (Terpisah)
              </h4>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  isUnderstandingEnabled
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                    : "bg-oxford-200 dark:bg-oxford-800 text-oxford-600 dark:text-oxford-400"
                }`}
              >
                {isUnderstandingEnabled ? "Aktif (4 Tahap)" : "Nonaktif (3 Tahap)"}
              </span>
            </div>
            <p className="text-xs text-oxford-600 dark:text-oxford-400 mt-0.5">
              Jika dinonaktifkan, evaluasi langsung 3 tahap (Narasumber &rarr; Penyelenggara &rarr; SKM) karena pemahaman sudah diukur melalui Kuis per Modul.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => toggleUnderstanding(!isUnderstandingEnabled)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            isUnderstandingEnabled
              ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
              : "bg-oxford-200 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-200 hover:bg-oxford-300 dark:hover:bg-oxford-700"
          }`}
        >
          {isUnderstandingEnabled ? (
            <>
              <ToggleRight size={18} />
              <span>Pemahaman Aktif</span>
            </>
          ) : (
            <>
              <ToggleLeft size={18} />
              <span>Gunakan Kuis Saja (3 Tahap)</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mt-4">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const count =
            tab.key === "understanding"
              ? value.understanding?.length || 0
              : value[tab.key]?.length || 0;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                isActive
                  ? "bg-gold-500 text-oxford-950 border-gold-500 shadow-sm"
                  : "bg-oxford-50 dark:bg-oxford-900 text-oxford-600 dark:text-oxford-300 border-oxford-200 dark:border-oxford-700 hover:border-gold-500/50"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  isActive
                    ? "bg-oxford-950/15 text-oxford-950"
                    : "bg-oxford-200 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-300"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-oxford-600 dark:text-oxford-300 bg-oxford-50 dark:bg-oxford-900/60 border border-oxford-200/80 dark:border-oxford-800 rounded-xl px-3.5 py-2.5">
        {activeMeta.desc}
      </p>

      {/* Preset Format Instrumen Penyelenggara (Daring / Luring / Blended) */}
      {activeTab === "organizer" && (
        <div className="mt-3 p-3.5 bg-gold-50/70 dark:bg-gold-950/30 border border-gold-200 dark:border-gold-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-oxford-900 dark:text-white">Pola Instrumen:</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gold-500 text-oxford-950 shadow-xs">
              {deliveryMode === "daring" ? "Daring (Online)" : deliveryMode === "luring" ? "Luring (Tatap Muka)" : "Blended Learning"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-oxford-600 dark:text-oxford-400 font-medium mr-1">Muat Cepat Format:</span>
            <button
              type="button"
              onClick={() => {
                const q = getOrganizerEvaluationQuestions("daring");
                onChange({
                  ...value,
                  organizer: q.map((item) => ({ ...item, options: item.options.map((o) => ({ ...o })) })),
                });
              }}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                deliveryMode === "daring"
                  ? "bg-oxford-900 text-gold-400 border-oxford-900"
                  : "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-700 hover:bg-gold-500 hover:text-oxford-950"
              }`}
            >
              Daring
            </button>
            <button
              type="button"
              onClick={() => {
                const q = getOrganizerEvaluationQuestions("luring");
                onChange({
                  ...value,
                  organizer: q.map((item) => ({ ...item, options: item.options.map((o) => ({ ...o })) })),
                });
              }}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                deliveryMode === "luring"
                  ? "bg-oxford-900 text-gold-400 border-oxford-900"
                  : "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-700 hover:bg-gold-500 hover:text-oxford-950"
              }`}
            >
              Luring
            </button>
            <button
              type="button"
              onClick={() => {
                const q = getOrganizerEvaluationQuestions("blended");
                onChange({
                  ...value,
                  organizer: q.map((item) => ({ ...item, options: item.options.map((o) => ({ ...o })) })),
                });
              }}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                deliveryMode === "blended"
                  ? "bg-oxford-900 text-gold-400 border-oxford-900"
                  : "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-700 hover:bg-gold-500 hover:text-oxford-950"
              }`}
            >
              Blended
            </button>
          </div>
        </div>
      )}

      {/* Mode A: Tab Pemahaman Materi (Understanding) */}
      {activeTab === "understanding" ? (
        <div className="mt-4 space-y-4">
          {understandingQuestions.map((q, qIdx) => (
            <div
              key={`understanding-${q.id}`}
              className="p-4 rounded-xl border border-oxford-200 dark:border-oxford-800 bg-oxford-50/60 dark:bg-oxford-950/60 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-6 h-6 rounded-lg bg-gold-500/20 text-gold-700 dark:text-gold-400 text-xs font-extrabold flex items-center justify-center shrink-0">
                    {qIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => handleUnderstandingQuestionTextChange(qIdx, e.target.value)}
                    placeholder="Tuliskan pertanyaan pemahaman materi..."
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-xs font-bold text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
                {understandingQuestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveUnderstandingQuestion(qIdx)}
                    title="Hapus pertanyaan"
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="space-y-2 pl-8">
                <p className="text-[11px] font-semibold text-oxford-500">
                  Pilihan Jawaban (Klik lingkaran untuk memilih Kunci Jawaban yang Benar):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, optIdx) => {
                    const letter = ["A", "B", "C", "D"][optIdx] || String(optIdx + 1);
                    return (
                      <div
                        key={`opt-${qIdx}-${optIdx}`}
                        className={`flex items-center gap-2 bg-white dark:bg-[#161B2A] border rounded-lg px-3 py-2 transition-all ${
                          opt.correct
                            ? "border-emerald-500 ring-1 ring-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20"
                            : "border-oxford-200 dark:border-oxford-700"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleUnderstandingCorrectOption(qIdx, optIdx)}
                          title={opt.correct ? "Kunci Jawaban Benar" : "Jadikan Kunci Jawaban"}
                          className="shrink-0 text-oxford-400 hover:text-emerald-600 transition-colors"
                        >
                          {opt.correct ? (
                            <CheckCircle className="text-emerald-500" size={16} />
                          ) : (
                            <Circle size={16} />
                          )}
                        </button>
                        <span className="text-xs font-bold text-oxford-500 shrink-0">
                          {letter}.
                        </span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) =>
                            handleUnderstandingOptionTextChange(qIdx, optIdx, e.target.value)
                          }
                          className="w-full bg-transparent text-xs text-oxford-800 dark:text-oxford-200 focus:outline-none"
                          placeholder={`Jawaban ${letter}...`}
                        />
                        {opt.correct && (
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded shrink-0">
                            Kunci
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          <div className="mt-4">
            <button
              type="button"
              onClick={handleAddUnderstandingQuestion}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-oxford-300 dark:border-oxford-700 text-xs font-bold text-oxford-700 dark:text-oxford-200 hover:border-gold-500 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
            >
              <Plus size={14} />
              <span>Tambah Pertanyaan Pemahaman</span>
            </button>
          </div>
        </div>
      ) : (
        /* Mode B: Tab Kriteria Penilaian (Narasumber, Penyelenggara, SKM) */
        <div className="mt-4 space-y-3">
          {currentCriteria.map((q, qIdx) => (
            <div
              key={`${activeTab}-${q.id}`}
              className="p-4 rounded-xl border border-oxford-200 dark:border-oxford-800 bg-oxford-50/60 dark:bg-oxford-950/60 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-6 h-6 rounded-lg bg-gold-500/20 text-gold-700 dark:text-gold-400 text-xs font-extrabold flex items-center justify-center shrink-0">
                    {qIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={q.criterion}
                    onChange={(e) => handleCriterionFieldChange(qIdx, "criterion", e.target.value)}
                    placeholder="Nama aspek / unsur penilaian"
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-xs font-bold text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
                {currentCriteria.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCriterion(qIdx)}
                    title="Hapus pertanyaan"
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <input
                type="text"
                value={q.question}
                onChange={(e) => handleCriterionFieldChange(qIdx, "question", e.target.value)}
                placeholder="Teks pertanyaan yang ditampilkan ke peserta..."
                className="w-full px-3 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-xs text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {q.options.map((opt, optIdx) => (
                  <div
                    key={opt.key}
                    className="flex items-center gap-1.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg px-2.5 py-1.5"
                  >
                    <span className="text-[11px] font-extrabold text-gold-600 dark:text-gold-400 shrink-0">
                      {opt.key} ({opt.score})
                    </span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleCriterionOptionChange(qIdx, optIdx, e.target.value)}
                      className="w-full bg-transparent text-xs text-oxford-800 dark:text-oxford-200 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-4">
            <button
              type="button"
              onClick={handleAddCriterion}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-oxford-300 dark:border-oxford-700 text-xs font-bold text-oxford-700 dark:text-oxford-200 hover:border-gold-500 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
            >
              <Plus size={14} />
              <span>Tambah Pertanyaan {activeMeta.label}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}