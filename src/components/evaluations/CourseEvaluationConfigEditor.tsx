"use client";

import { useState } from "react";
import { ClipboardCheck, Plus, RotateCcw, Trash2, UserCheck, Building2, Star } from "lucide-react";
import {
  CourseEvaluationConfig,
  EvaluationCriterion,
  NARASUMBER_EVALUATION_QUESTIONS,
  ORGANIZER_EVALUATION_QUESTIONS,
  SKM_QUESTIONS,
} from "@/lib/skm-constants";

type EvaluationTab = "narasumber" | "organizer" | "skm";

interface CourseEvaluationConfigEditorProps {
  value: Required<CourseEvaluationConfig>;
  onChange: (next: Required<CourseEvaluationConfig>) => void;
}

const TAB_META: {
  key: EvaluationTab;
  label: string;
  desc: string;
  icon: typeof UserCheck;
}[] = [
  {
    key: "narasumber",
    label: "Evaluasi Narasumber",
    desc: "Daftar nama narasumber otomatis terhubung dengan kolom Narasumber yang diisi pada setiap materi di Kelola Konten & QR.",
    icon: UserCheck,
  },
  {
    key: "organizer",
    label: "Evaluasi Penyelenggara",
    desc: "Penilaian kualitas panitia, ruang kelas, sarana audio-visual, dan konsumsi pelatihan.",
    icon: Building2,
  },
  {
    key: "skm",
    label: "Survei SKM (9 Unsur)",
    desc: "Instrumen baku Survei Kepuasan Masyarakat mengacu pada PermenPANRB No. 14 Tahun 2017.",
    icon: Star,
  },
];

function cloneDefaultList(tab: EvaluationTab): EvaluationCriterion[] {
  const source =
    tab === "narasumber"
      ? NARASUMBER_EVALUATION_QUESTIONS
      : tab === "organizer"
        ? ORGANIZER_EVALUATION_QUESTIONS
        : SKM_QUESTIONS;
  return source.map((item) => ({
    ...item,
    options: item.options.map((o) => ({ ...o })),
  }));
}

export default function CourseEvaluationConfigEditor({
  value,
  onChange,
}: CourseEvaluationConfigEditorProps) {
  const [activeTab, setActiveTab] = useState<EvaluationTab>("narasumber");
  const questions = value[activeTab] || [];

  const updateQuestions = (nextList: EvaluationCriterion[]) => {
    // Renumber ids sequentially so submission/scoring stays consistent
    const normalized = nextList.map((item, idx) => ({ ...item, id: idx + 1 }));
    onChange({ ...value, [activeTab]: normalized });
  };

  const handleFieldChange = (
    index: number,
    field: "criterion" | "question",
    val: string
  ) => {
    const updated = questions.map((q, i) => (i === index ? { ...q, [field]: val } : q));
    updateQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    const updated = questions.map((q, i) =>
      i === qIndex
        ? {
            ...q,
            options: q.options.map((opt, oi) =>
              oi === optIndex ? { ...opt, text } : opt
            ),
          }
        : q
    );
    updateQuestions(updated);
  };

  const handleAddQuestion = () => {
    const nextId = questions.length + 1;
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
    updateQuestions([...questions, newItem]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    updateQuestions(questions.filter((_, i) => i !== index));
  };

  const handleResetTab = () => {
    updateQuestions(cloneDefaultList(activeTab));
  };

  const activeMeta = TAB_META.find((t) => t.key === activeTab)!;

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
              Pertanyaan standar Narasumber, Penyelenggara, dan SKM sudah terisi otomatis. Ubah teks kriteria, pertanyaan, atau pilihan jawaban bila diperlukan.
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mt-4">
        {TAB_META.map((tab) => {
          const Icon = tab.icon;
          const count = value[tab.key]?.length || 0;
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

      {/* Questions list */}
      <div className="mt-4 space-y-3">
        {questions.map((q, qIdx) => (
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
                  onChange={(e) => handleFieldChange(qIdx, "criterion", e.target.value)}
                  placeholder="Nama aspek / unsur penilaian"
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-xs font-bold text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
                />
              </div>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(qIdx)}
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
              onChange={(e) => handleFieldChange(qIdx, "question", e.target.value)}
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
                    onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                    className="w-full bg-transparent text-xs text-oxford-800 dark:text-oxford-200 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleAddQuestion}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-oxford-300 dark:border-oxford-700 text-xs font-bold text-oxford-700 dark:text-oxford-200 hover:border-gold-500 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
        >
          <Plus size={14} />
          <span>Tambah Pertanyaan {activeMeta.label}</span>
        </button>
      </div>
    </div>
  );
}
