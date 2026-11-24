"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ClipboardCheck,
    Loader2,
    Trophy,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    RotateCcw,
    XCircle,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { getQuizQuestions, submitQuizAttempt, getQuizAttempt } from "@/app/actions/courses";

interface QuizOption {
    id: string;
    questionId: string;
    optionText: string;
}

interface QuizQuestion {
    id: string;
    lessonId: string;
    questionText: string;
    order: string;
    options: QuizOption[];
}

interface ReviewItem {
    questionId: string;
    questionText: string;
    explanation: string | null;
    isCorrect: boolean;
    selectedOptionId: string | null;
    selectedOptionText: string | null;
    selectedOptionExplanation: string | null;
    correctOptionId: string | null;
    correctOptionText: string | null;
    options: {
        id: string;
        optionText: string;
        isCorrect: boolean;
        explanation: string | null;
    }[];
}

interface QuizResult {
    score: number;
    totalQuestions: number;
    passed: boolean;
    scorePercent: number;
    review: ReviewItem[];
}

type QuizPhase = "start" | "question" | "review-before-submit" | "submitting" | "results";

interface InlineQuizCardProps {
    lessonId: string;
    lessonTitle: string;
    lessonContent?: string | null;
    isCompleted: boolean;
    onPassed: () => void;
}

export default function InlineQuizCard({
    lessonId,
    lessonTitle,
    lessonContent,
    isCompleted,
    onPassed,
}: InlineQuizCardProps) {
    const [quizPhase, setQuizPhase] = useState<QuizPhase>("start");
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
    const [previousAttempt, setPreviousAttempt] = useState<QuizResult | null>(null);
    const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

    const loadPreviousAttempt = useCallback(async () => {
        const prev = await getQuizAttempt(lessonId);
        if (prev) {
            setPreviousAttempt({
                score: prev.score,
                totalQuestions: 0,
                passed: prev.passed,
                scorePercent: prev.score,
                review: [],
            });
        }
    }, [lessonId]);

    useEffect(() => {
        const timer = window.setTimeout(() => void loadPreviousAttempt(), 0);
        return () => window.clearTimeout(timer);
    }, [loadPreviousAttempt]);

    const startQuiz = async () => {
        setIsLoadingQuiz(true);
        const questions = await getQuizQuestions(lessonId);
        setQuizQuestions(questions);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setQuizResult(null);
        setQuizPhase("question");
        setIsLoadingQuiz(false);
    };

    const submitQuiz = async () => {
        setQuizPhase("submitting");
        const answerList = quizQuestions
            .map((q) => ({
                questionId: q.id,
                selectedOptionId: answers[q.id] || "",
            }))
            .filter((a) => a.selectedOptionId !== "");

        const result = await submitQuizAttempt(lessonId, answerList);

        if ("error" in result && result.error) {
            toast.error(result.error);
            setQuizPhase("review-before-submit");
            return;
        }

        if ("success" in result && result.success) {
            const quizRes: QuizResult = {
                score: result.score!,
                totalQuestions: result.totalQuestions!,
                passed: result.passed!,
                scorePercent: result.scorePercent!,
                review: result.review as ReviewItem[],
            };
            setQuizResult(quizRes);
            setPreviousAttempt(quizRes);
            setQuizPhase("results");
            if (quizRes.passed) {
                onPassed();
            }
        }
    };

    const retryQuiz = () => {
        setQuizPhase("start");
        setAnswers({});
        setCurrentQuestionIndex(0);
        setQuizResult(null);
    };

    if (quizPhase === "start") {
        return (
            <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 overflow-hidden">
                <div className="bg-gradient-to-br from-oxford-900 via-oxford-800 to-oxford-950 p-6 md:p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gold-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-gold-400 text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                            <ClipboardCheck size={14} />
                            Quiz Evaluasi Materi
                        </div>
                        <h3 className="text-xl md:text-2xl font-serif font-bold mb-1">{lessonTitle}</h3>
                        {lessonContent && (
                            <p className="text-oxford-300 text-sm leading-relaxed mt-2">{lessonContent}</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-oxford-100 dark:divide-oxford-800 border-b border-oxford-100 dark:border-oxford-800">
                    <div className="p-4 text-center">
                        <div className="text-xl font-bold text-oxford-900 dark:text-white font-sans">5</div>
                        <div className="text-xs text-oxford-500 dark:text-oxford-400 mt-0.5 font-sans">Pertanyaan</div>
                    </div>
                    <div className="p-4 text-center">
                        <div className="text-xl font-bold text-oxford-900 dark:text-white font-sans">~10</div>
                        <div className="text-xs text-oxford-500 dark:text-oxford-400 mt-0.5 font-sans">Menit</div>
                    </div>
                    <div className="p-4 text-center">
                        <div className="text-xl font-bold text-gold-600 font-sans">70%</div>
                        <div className="text-xs text-oxford-500 dark:text-oxford-400 mt-0.5 font-sans">Nilai Min.</div>
                    </div>
                </div>

                <div className="p-5 space-y-3">
                    <button
                        type="button"
                        onClick={startQuiz}
                        disabled={isLoadingQuiz}
                        className="w-full py-3.5 bg-gold-500 text-oxford-950 font-bold font-sans rounded-xl text-base hover:bg-gold-400 transition-all active:scale-[0.98] shadow-md shadow-gold-500/20 flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isLoadingQuiz ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <ClipboardCheck size={20} />
                                {previousAttempt || isCompleted ? "Kerjakan Ulang Quiz" : "Mulai Quiz"}
                            </>
                        )}
                    </button>

                    {previousAttempt && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuizResult(previousAttempt);
                                setQuizPhase("results");
                            }}
                            className="w-full py-2.5 bg-oxford-50 dark:bg-oxford-950 text-oxford-700 dark:text-oxford-200 font-bold font-sans rounded-xl hover:bg-oxford-100 dark:hover:bg-oxford-900 transition-all flex items-center justify-center gap-2 border border-oxford-200 dark:border-oxford-700 text-sm"
                        >
                            <Trophy size={16} className={previousAttempt.passed ? "text-emerald-600" : "text-amber-600"} />
                            Lihat Hasil Sebelumnya ({previousAttempt.scorePercent}% · {previousAttempt.passed ? "Lulus" : "Belum Lulus"})
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (quizPhase === "question") {
        const question = quizQuestions[currentQuestionIndex];
        if (!question) return null;
        const answeredCount = Object.keys(answers).length;
        const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
        const labels = ["A", "B", "C", "D", "E", "F"];

        return (
            <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 overflow-hidden">
                <div className="h-1.5 bg-oxford-100 dark:bg-oxford-900">
                    <motion.div
                        className="h-full bg-gradient-to-r from-gold-500 to-gold-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
                <div className="p-5 pb-3 border-b border-oxford-100 dark:border-oxford-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-gold-600 font-sans uppercase tracking-wider">
                        Pertanyaan {currentQuestionIndex + 1} dari {quizQuestions.length}
                    </span>
                    <span className="text-xs text-oxford-400 font-sans">
                        {answeredCount}/{quizQuestions.length} terjawab
                    </span>
                </div>
                <div className="p-5 md:p-6">
                    <h4 className="text-base md:text-lg font-serif font-bold text-oxford-900 dark:text-white leading-relaxed mb-5">
                        {question.questionText}
                    </h4>
                    <div className="space-y-2.5">
                        {question.options.map((option, idx) => {
                            const isSelected = answers[question.id] === option.id;
                            return (
                                <button
                                    type="button"
                                    key={option.id}
                                    onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-start gap-3.5 group ${
                                        isSelected
                                            ? "border-gold-500 bg-gold-50/50 dark:bg-gold-500/10 shadow-sm"
                                            : "border-oxford-100 dark:border-oxford-800 hover:border-oxford-300 dark:hover:border-oxford-600"
                                    }`}
                                >
                                    <div
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                            isSelected
                                                ? "bg-gold-500 text-oxford-950"
                                                : "bg-oxford-100 dark:bg-oxford-800 text-oxford-500 dark:text-oxford-400"
                                        }`}
                                    >
                                        {labels[idx]}
                                    </div>
                                    <span className="text-sm leading-relaxed pt-0.5 font-sans text-oxford-800 dark:text-oxford-100">
                                        {option.optionText}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="p-5 pt-3 flex items-center justify-between border-t border-oxford-100 dark:border-oxford-800">
                    <button
                        type="button"
                        onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="flex items-center gap-1.5 text-sm font-sans font-bold text-oxford-500 hover:text-oxford-900 dark:text-oxford-400 dark:hover:text-white disabled:opacity-30 py-2 px-3 rounded-lg"
                    >
                        <ChevronLeft size={16} /> Sebelumnya
                    </button>
                    {currentQuestionIndex < quizQuestions.length - 1 ? (
                        <button
                            type="button"
                            onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                            className="flex items-center gap-1.5 text-sm font-sans font-bold text-oxford-900 dark:text-white hover:text-gold-600 py-2 px-3 rounded-lg"
                        >
                            Berikutnya <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setQuizPhase("review-before-submit")}
                            className="flex items-center gap-1.5 text-sm font-sans font-bold bg-gold-500 text-oxford-950 py-2 px-4 rounded-xl hover:bg-gold-400 shadow-sm"
                        >
                            Review <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (quizPhase === "review-before-submit") {
        const answeredCount = Object.keys(answers).length;
        const unansweredCount = quizQuestions.length - answeredCount;
        return (
            <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 overflow-hidden">
                <div className="p-5 border-b border-oxford-100 dark:border-oxford-800">
                    <h4 className="text-lg font-serif font-bold text-oxford-900 dark:text-white">Ringkasan Quiz</h4>
                    <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-1 font-sans">
                        Periksa kembali jawaban Anda sebelum mengumpulkan.
                    </p>
                </div>
                <div className="p-5 space-y-2">
                    {quizQuestions.map((q, i) => {
                        const isAnswered = !!answers[q.id];
                        return (
                            <button
                                type="button"
                                key={q.id}
                                onClick={() => {
                                    setCurrentQuestionIndex(i);
                                    setQuizPhase("question");
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-oxford-50 dark:hover:bg-oxford-950 transition-colors text-left"
                            >
                                <div
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        isAnswered ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                                    }`}
                                >
                                    {isAnswered ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-sans text-oxford-900 dark:text-white truncate">
                                        Soal {i + 1}: {q.questionText}
                                    </div>
                                    <div className={`text-xs font-sans ${isAnswered ? "text-green-600" : "text-amber-600"}`}>
                                        {isAnswered ? "Sudah dijawab" : "Belum dijawab"}
                                    </div>
                                </div>
                                <ChevronRight size={15} className="text-oxford-300" />
                            </button>
                        );
                    })}
                </div>
                <div className="p-5 border-t border-oxford-100 dark:border-oxford-800 bg-oxford-50 dark:bg-oxford-950/50">
                    <div className="flex items-center justify-between mb-3 text-sm font-sans">
                        <span className="text-oxford-600 dark:text-oxford-300">
                            <strong className="text-oxford-900 dark:text-white">
                                {answeredCount}/{quizQuestions.length}
                            </strong>{" "}
                            soal terjawab
                        </span>
                        {unansweredCount > 0 && (
                            <span className="text-xs text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-lg">
                                {unansweredCount} belum dijawab
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setQuizPhase("question")}
                            className="flex-1 py-2.5 border-2 border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-200 font-bold font-sans rounded-xl flex items-center justify-center gap-1.5 text-sm"
                        >
                            <ChevronLeft size={16} /> Kembali
                        </button>
                        <button
                            type="button"
                            onClick={submitQuiz}
                            disabled={answeredCount === 0}
                            className="flex-1 py-2.5 bg-gold-500 text-oxford-950 font-bold font-sans rounded-xl hover:bg-gold-400 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                        >
                            Kumpulkan Quiz
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (quizPhase === "submitting") {
        return (
            <div className="bg-white dark:bg-[#161B2A] rounded-2xl p-12 text-center border border-oxford-100 dark:border-oxford-800">
                <Loader2 className="animate-spin text-gold-500 mx-auto mb-3" size={40} />
                <h4 className="font-serif font-bold text-lg text-oxford-900 dark:text-white">Mengoreksi Jawaban...</h4>
                <p className="text-xs text-oxford-500 dark:text-oxford-400 font-sans mt-1">Mohon tunggu sebentar.</p>
            </div>
        );
    }

    if (quizPhase === "results" && quizResult) {
        const isPass = quizResult.passed;
        return (
            <div className="space-y-4">
                <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 overflow-hidden">
                    <div
                        className={`p-6 text-center ${
                            isPass
                                ? "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/30"
                                : "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/30"
                        }`}
                    >
                        <div className="text-4xl font-bold font-sans text-oxford-900 dark:text-white mb-2">
                            {quizResult.scorePercent}%
                        </div>
                        <div
                            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-bold font-sans text-xs ${
                                isPass
                                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    : "bg-red-100 text-red-700 border border-red-200"
                            }`}
                        >
                            {isPass ? <Trophy size={15} /> : <XCircle size={15} />}
                            {isPass ? "LULUS — Selamat!" : "BELUM LULUS — Coba lagi!"}
                        </div>
                        {!isPass && (
                            <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-2 font-sans">
                                Nilai minimum untuk lulus: 70%
                            </p>
                        )}
                    </div>
                    <div className="p-4 flex justify-center border-t border-oxford-100 dark:border-oxford-800">
                        <button
                            type="button"
                            onClick={retryQuiz}
                            className="px-5 py-2.5 border-2 border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-200 font-bold font-sans rounded-xl hover:bg-oxford-50 dark:hover:bg-oxford-950 transition-all flex items-center gap-2 text-sm"
                        >
                            <RotateCcw size={15} /> Ulangi Quiz
                        </button>
                    </div>
                </div>

                {quizResult.review && quizResult.review.length > 0 && (
                    <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 overflow-hidden">
                        <div className="p-4 border-b border-oxford-100 dark:border-oxford-800">
                            <h4 className="font-serif font-bold text-base text-oxford-900 dark:text-white">Review Jawaban</h4>
                        </div>
                        <div className="divide-y divide-oxford-100 dark:divide-oxford-800">
                            {quizResult.review.map((item, idx) => (
                                <ReviewItemCard key={item.questionId} item={item} index={idx} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
}

function ReviewItemCard({ item, index }: { item: ReviewItem; index: number }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="p-4">
            <div className="flex items-start gap-3 mb-2">
                <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        item.isCorrect ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    }`}
                >
                    {item.isCorrect ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                </div>
                <div className="flex-1">
                    <div className="text-[11px] font-bold uppercase font-sans tracking-wider mb-0.5">
                        <span className={item.isCorrect ? "text-green-600" : "text-red-600"}>
                            Soal {index + 1} — {item.isCorrect ? "Benar" : "Salah"}
                        </span>
                    </div>
                    <p className="text-sm font-sans text-oxford-900 dark:text-white font-medium">{item.questionText}</p>
                </div>
            </div>
            <div className="ml-9 space-y-1 text-xs font-sans">
                {!item.isCorrect && item.selectedOptionText && (
                    <div className="text-red-600 dark:text-red-400">Jawaban Anda: {item.selectedOptionText}</div>
                )}
                <div className="text-emerald-700 dark:text-emerald-400">Jawaban Benar: {item.correctOptionText}</div>
            </div>
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="ml-9 mt-2 text-[11px] font-bold text-oxford-500 hover:text-oxford-700 dark:text-oxford-400 uppercase tracking-wider flex items-center gap-1"
            >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded ? "Sembunyikan Penjelasan" : "Lihat Penjelasan"}
            </button>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="ml-9 mt-2 p-3 bg-oxford-50 dark:bg-oxford-950 rounded-xl border border-oxford-100 dark:border-oxford-800 text-xs text-oxford-700 dark:text-oxford-200">
                            {item.explanation && <p>{item.explanation}</p>}
                            {item.selectedOptionExplanation && !item.isCorrect && (
                                <p className="mt-2 pt-2 border-t border-oxford-200 dark:border-oxford-700 text-oxford-500">
                                    {item.selectedOptionExplanation}
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
