"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayCircle, FileText, CheckCircle, ChevronLeft, ChevronDown, ChevronUp, CheckCircle2, ClipboardCheck, Loader2, XCircle, ChevronRight, RotateCcw, AlertCircle, Trophy, FileUp, MessageSquare, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { UserSession } from "@/app/dashboard/dashboard-client";
import { getQuizQuestions, submitQuizAttempt, getQuizAttempt, updateLessonProgress } from "@/app/actions/courses";
import { getLessonDiscussions, addDiscussion, deleteDiscussion } from "@/app/actions/discussions";
import { optimizeAvatar } from "@/lib/utils";
import { toast } from "sonner";

interface Lesson {
    id: string;
    moduleId: string;
    title: string;
    content: string | null;
    videoUrl: string | null;
    type: string;
    order: string;
}

interface Module {
    id: string;
    courseId: string;
    title: string;
    order: string;
    lessons: Lesson[];
}

interface Course {
    id: string;
    title: string;
    description: string | null;
}

interface LearnClientProps {
    course: Course;
    courseContent: Module[];
    session: UserSession;
    enrollment: { id: string; completedLessons?: string[] } | null;
}

interface LessonDiscussion {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    name: string;
    image?: string | null;
}

// Quiz types
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

export default function LearnClient({ course, courseContent, session, enrollment }: LearnClientProps) {
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(
        courseContent[0]?.lessons[0] || null
    );
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(
        courseContent.reduce((acc, mod) => ({ ...acc, [mod.id]: true }), {})
    );
    const [completedLessons, setCompletedLessons] = useState<Record<string, boolean>>(() =>
        Object.fromEntries((enrollment?.completedLessons || []).map((lessonId) => [lessonId, true]))
    );
    const [discussions, setDiscussions] = useState<LessonDiscussion[]>([]);
    const [commentText, setCommentText] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isFetchingDiscussions, setIsFetchingDiscussions] = useState(false);
    const user = session.user;

    // Quiz state
    const [quizPhase, setQuizPhase] = useState<QuizPhase>("start");
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
    const [previousAttempt, setPreviousAttempt] = useState<QuizResult | null>(null);
    const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

    const toggleModule = (moduleId: string) => {
        setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
    };

    const handleLessonClick = (lesson: Lesson) => {
        setActiveLesson(lesson);
        // Reset quiz state when switching lessons
        if (lesson.type === "quiz") {
            setQuizPhase("start");
            setQuizQuestions([]);
            setCurrentQuestionIndex(0);
            setAnswers({});
            setQuizResult(null);
            setPreviousAttempt(null);
        }
    };

    const markAsComplete = async () => {
        if (activeLesson) {
            setCompletedLessons(prev => ({ ...prev, [activeLesson.id]: true }));
            // Persistent sync
            await updateLessonProgress(course.id, activeLesson.id, true);
        }
    };

    const loadPreviousAttempt = useCallback(async (lessonId: string) => {
        const attempt = await getQuizAttempt(lessonId);
        if (attempt) {
            const quizRes: QuizResult = {
                score: Number(attempt.score),
                totalQuestions: 0,
                scorePercent: Number(attempt.score),
                passed: Boolean(attempt.passed),
                review: [],
            };
            setPreviousAttempt(quizRes);
            if (quizRes.passed) {
                setCompletedLessons(prev => ({ ...prev, [lessonId]: true }));
            }
        }
    }, []);

    // Load previous quiz attempt when a quiz lesson is selected
    useEffect(() => {
        if (activeLesson?.type !== "quiz") return;
        const timer = window.setTimeout(() => void loadPreviousAttempt(activeLesson.id), 0);
        return () => window.clearTimeout(timer);
    }, [activeLesson, loadPreviousAttempt]);

    // Quiz flow handlers
    const startQuiz = async () => {
        if (!activeLesson) return;
        setIsLoadingQuiz(true);
        const questions = await getQuizQuestions(activeLesson.id);
        setQuizQuestions(questions);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setQuizResult(null);
        setQuizPhase("question");
        setIsLoadingQuiz(false);
    };

    const selectOption = (questionId: string, optionId: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const goToReviewBeforeSubmit = () => {
        setQuizPhase("review-before-submit");
    };

    const goBackToQuestion = (index: number) => {
        setCurrentQuestionIndex(index);
        setQuizPhase("question");
    };

    const submitQuiz = async () => {
        if (!activeLesson) return;
        setQuizPhase("submitting");

        const answerList = quizQuestions.map(q => ({
            questionId: q.id,
            selectedOptionId: answers[q.id] || "",
        })).filter(a => a.selectedOptionId !== "");

        const result = await submitQuizAttempt(activeLesson.id, answerList);

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
            if (quizRes.passed) {
                setCompletedLessons(prev => ({ ...prev, [activeLesson.id]: true }));
            }
            setPreviousAttempt(quizRes);
            setQuizPhase("results");
        }
    };

    const retryQuiz = () => {
        setQuizPhase("start");
        setAnswers({});
        setCurrentQuestionIndex(0);
        setQuizResult(null);
    };

    const loadDiscussions = useCallback(async (lessonId: string) => {
        setIsFetchingDiscussions(true);
        const data = await getLessonDiscussions(lessonId);
        setDiscussions(data);
        setIsFetchingDiscussions(false);
    }, []);

    useEffect(() => {
        if (!activeLesson) return;
        const timer = window.setTimeout(() => void loadDiscussions(activeLesson.id), 0);
        return () => window.clearTimeout(timer);
    }, [activeLesson, loadDiscussions]);

    const handleAddComment = async () => {
        if (!commentText.trim() || !activeLesson) return;
        setIsSubmittingComment(true);
        const res = await addDiscussion(activeLesson.id, commentText);
        if (res.success) {
            setCommentText("");
            loadDiscussions(activeLesson.id);
            toast.success("Diskusi berhasil ditambahkan!");
        } else {
            toast.error(res.error || "Gagal menambahkan diskusi");
        }
        setIsSubmittingComment(false);
    };

    const handleDeleteComment = async (id: string) => {
        if (!confirm("Hapus diskusi ini?")) return;
        const res = await deleteDiscussion(id);
        if (res.success && activeLesson) {
            loadDiscussions(activeLesson.id);
            toast.success("Diskusi berhasil dihapus!");
        } else {
            toast.error(res.error || "Gagal menghapus diskusi");
        }
    };

    // Calculate Progress
    const totalLessons = courseContent.reduce((sum, mod) => sum + mod.lessons.length, 0);
    const completedCount = Object.keys(completedLessons).length;
    const progressPercent = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);
    
    // Navigation helpers
    const allLessons = courseContent.flatMap(m => m.lessons);
    const currentLessonIndex = allLessons.findIndex(l => l.id === activeLesson?.id);
    const nextLesson = allLessons[currentLessonIndex + 1];
    const prevLesson = allLessons[currentLessonIndex - 1];

    // Extract YouTube ID for embed
    const getYoutubeEmbedUrl = (url: string | null) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
    };

    const getLessonTypeLabel = (type: string) => {
        switch (type) {
            case 'video': return 'Tonton Video';
            case 'quiz': return 'Kerjakan Kuis';
            case 'reading': return 'Baca Materi';
            case 'file': return 'Unduh Materi';
            default: return type;
        }
    };

    const cleanLessonTitle = (title: string, type: string) => {
        if (title.startsWith("Pelajaran Baru (") || title === "Pelajaran Baru") {
            return getLessonTypeLabel(type);
        }
        return title;
    };

    // Render quiz content based on phase
    const renderQuizContent = () => {
        if (!activeLesson) return null;

        switch (quizPhase) {
            case "start":
                return renderQuizStart();
            case "question":
                return renderQuizQuestion();
            case "review-before-submit":
                return renderReviewBeforeSubmit();
            case "submitting":
                return renderSubmitting();
            case "results":
                return renderResults(quizResult);
            default:
                return null;
        }
    };

    const renderQuizStart = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto w-full"
        >
            {/* Quiz start card */}
            <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 overflow-hidden">
                {/* Header gradient */}
                <div className="bg-gradient-to-br from-oxford-900 via-oxford-800 to-oxford-950 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gold-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gold-500/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 bg-white dark:bg-[#161B2A]/10 backdrop-blur-sm text-gold-400 text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider">
                            <ClipboardCheck size={14} />
                            Quiz
                        </div>
                        <h2 className="text-2xl md:text-3xl font-serif font-bold mb-2">{activeLesson?.title}</h2>
                        {activeLesson?.content && (
                            <p className="text-oxford-300 text-sm leading-relaxed mt-3">{activeLesson.content}</p>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 divide-x divide-oxford-100 border-b border-oxford-100 dark:border-oxford-800">
                    <div className="p-5 text-center">
                        <div className="text-2xl font-bold text-oxford-900 dark:text-white font-sans">{previousAttempt ? "5" : "5"}</div>
                        <div className="text-xs text-oxford-500 dark:text-oxford-400 mt-1 font-sans">Pertanyaan</div>
                    </div>
                    <div className="p-5 text-center">
                        <div className="text-2xl font-bold text-oxford-900 dark:text-white font-sans">~10</div>
                        <div className="text-xs text-oxford-500 dark:text-oxford-400 mt-1 font-sans">Menit</div>
                    </div>
                    <div className="p-5 text-center">
                        <div className="text-2xl font-bold text-gold-600 font-sans">70%</div>
                        <div className="text-xs text-oxford-500 dark:text-oxford-400 mt-1 font-sans">Nilai Min.</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 space-y-3">
                    <button
                        onClick={startQuiz}
                        disabled={isLoadingQuiz}
                        className="w-full py-4 bg-gold-500 text-oxford-950 font-bold font-sans rounded-xl text-lg hover:bg-gold-400 transition-all active:scale-[0.98] shadow-lg shadow-gold-500/20 flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isLoadingQuiz ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <ClipboardCheck size={20} />
                                Mulai Quiz
                            </>
                        )}
                    </button>

                    {previousAttempt && (
                        <button
                            onClick={() => {
                                setQuizResult(previousAttempt);
                                setQuizPhase("results");
                            }}
                            className="w-full py-3 bg-oxford-50 dark:bg-oxford-950 text-oxford-700 dark:text-oxford-200 font-bold font-sans rounded-xl hover:bg-oxford-100 dark:hover:bg-[#161B2A] transition-all flex items-center justify-center gap-2 border border-oxford-200 dark:border-oxford-700"
                        >
                            <Trophy size={18} />
                            Lihat Hasil Sebelumnya ({previousAttempt.scorePercent}%)
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );

    const renderQuizQuestion = () => {
        const question = quizQuestions[currentQuestionIndex];
        if (!question) return null;

        const answeredCount = Object.keys(answers).length;
        const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;

        return (
            <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="max-w-2xl mx-auto w-full"
            >
                <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 overflow-hidden">
                    {/* Progress bar */}
                    <div className="h-1.5 bg-oxford-100 dark:bg-[#161B2A]">
                        <motion.div
                            className="h-full bg-gradient-to-r from-gold-500 to-gold-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                    </div>

                    {/* Question header */}
                    <div className="p-6 pb-4 border-b border-oxford-50 dark:border-oxford-900">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gold-600 font-sans uppercase tracking-wider">
                                Pertanyaan {currentQuestionIndex + 1} dari {quizQuestions.length}
                            </span>
                            <span className="text-xs text-oxford-400 font-sans">
                                {answeredCount}/{quizQuestions.length} terjawab
                            </span>
                        </div>
                    </div>

                    {/* Question */}
                    <div className="p-6 pt-5">
                        <h3 className="text-lg md:text-xl font-serif font-bold text-oxford-900 dark:text-white leading-relaxed mb-6">
                            {question.questionText}
                        </h3>

                        {/* Options */}
                        <div className="space-y-3">
                            {question.options.map((option, idx) => {
                                const isSelected = answers[question.id] === option.id;
                                const labels = ["A", "B", "C", "D", "E", "F"];
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => selectOption(question.id, option.id)}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 group
                                            ${isSelected
                                                ? 'border-gold-500 bg-gold-50/50 shadow-sm shadow-gold-500/10'
                                                : 'border-oxford-100 dark:border-oxford-800 hover:border-oxford-300 dark:hover:border-oxford-600 hover:bg-oxford-50 dark:hover:bg-oxford-950/50'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 transition-all
                                            ${isSelected
                                                ? 'bg-gold-500 text-white'
                                                : 'bg-oxford-100 dark:bg-[#161B2A] text-oxford-500 dark:text-oxford-400 group-hover:bg-oxford-200 dark:group-hover:bg-oxford-800'
                                            }`}
                                        >
                                            {labels[idx]}
                                        </div>
                                        <span className={`text-sm md:text-base leading-relaxed pt-1 font-sans ${isSelected ? 'text-oxford-900 dark:text-white font-medium' : 'text-oxford-700 dark:text-oxford-200'}`}>
                                            {option.optionText}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="p-6 pt-4 flex items-center justify-between border-t border-oxford-50 dark:border-oxford-900">
                        <button
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                            className="flex items-center gap-2 text-sm font-sans font-bold text-oxford-500 dark:text-oxford-400 hover:text-oxford-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors py-2 px-3 rounded-lg hover:bg-oxford-50 dark:hover:bg-oxford-950"
                        >
                            <ChevronLeft size={16} />
                            Sebelumnya
                        </button>

                        {/* Question dots */}
                        <div className="hidden sm:flex items-center gap-1.5">
                            {quizQuestions.map((q, i) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(i)}
                                    className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentQuestionIndex
                                        ? 'bg-gold-500 scale-125'
                                        : answers[q.id]
                                            ? 'bg-oxford-400'
                                            : 'bg-oxford-200 dark:bg-oxford-800'
                                        }`}
                                />
                            ))}
                        </div>

                        {currentQuestionIndex < quizQuestions.length - 1 ? (
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                className="flex items-center gap-2 text-sm font-sans font-bold text-oxford-900 dark:text-white hover:text-gold-600 transition-colors py-2 px-3 rounded-lg hover:bg-oxford-50 dark:hover:bg-oxford-950"
                            >
                                Berikutnya
                                <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={goToReviewBeforeSubmit}
                                className="flex items-center gap-2 text-sm font-sans font-bold bg-gold-500 text-oxford-950 py-2.5 px-5 rounded-xl hover:bg-gold-400 transition-all active:scale-95 shadow-sm"
                            >
                                Review
                                <ChevronRight size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    const renderReviewBeforeSubmit = () => {
        const answeredCount = Object.keys(answers).length;
        const unansweredCount = quizQuestions.length - answeredCount;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto w-full"
            >
                <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 overflow-hidden">
                    <div className="p-6 border-b border-oxford-100 dark:border-oxford-800">
                        <h2 className="text-xl font-serif font-bold text-oxford-900 dark:text-white">Ringkasan Quiz</h2>
                        <p className="text-sm text-oxford-500 dark:text-oxford-400 mt-1 font-sans">Periksa kembali jawaban Anda sebelum mengumpulkan.</p>
                    </div>

                    <div className="p-6 space-y-2">
                        {quizQuestions.map((q, i) => {
                            const isAnswered = !!answers[q.id];
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => goBackToQuestion(i)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-oxford-50 dark:hover:bg-oxford-950 transition-colors text-left group"
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isAnswered ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {isAnswered ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-sans text-oxford-900 dark:text-white truncate">
                                            Soal {i + 1}: {q.questionText}
                                        </div>
                                        <div className={`text-xs mt-0.5 font-sans ${isAnswered ? 'text-green-600' : 'text-amber-600'}`}>
                                            {isAnswered ? 'Sudah dijawab' : 'Belum dijawab'}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-oxford-300 group-hover:text-oxford-500 dark:group-hover:text-oxford-400 flex-shrink-0" />
                                </button>
                            );
                        })}
                    </div>

                    {/* Summary */}
                    <div className="p-6 border-t border-oxford-100 dark:border-oxford-800 bg-oxford-50 dark:bg-oxford-950/50">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-oxford-600 dark:text-oxford-300 font-sans">
                                <span className="font-bold text-oxford-900 dark:text-white">{answeredCount}/{quizQuestions.length}</span> soal terjawab
                            </span>
                            {unansweredCount > 0 && (
                                <span className="text-xs text-amber-600 font-sans font-bold bg-amber-100 px-2 py-1 rounded-lg">
                                    {unansweredCount} belum dijawab
                                </span>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => goBackToQuestion(currentQuestionIndex)}
                                className="flex-1 py-3 border-2 border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-200 font-bold font-sans rounded-xl hover:bg-white dark:hover:bg-[#161B2A] transition-all flex items-center justify-center gap-2"
                            >
                                <ChevronLeft size={16} />
                                Kembali
                            </button>
                            <button
                                onClick={submitQuiz}
                                disabled={answeredCount === 0}
                                className="flex-1 py-3 bg-gold-500 text-oxford-950 font-bold font-sans rounded-xl hover:bg-gold-400 transition-all active:scale-[0.98] shadow-lg shadow-gold-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                Kumpulkan Quiz
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    const renderSubmitting = () => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md mx-auto w-full flex items-center justify-center py-20"
        >
            <div className="text-center">
                <Loader2 className="animate-spin text-gold-500 mx-auto mb-4" size={48} />
                <h3 className="font-serif font-bold text-xl text-oxford-900 dark:text-white mb-2">Mengoreksi Jawaban...</h3>
                <p className="text-sm text-oxford-500 dark:text-oxford-400 font-sans">Mohon tunggu sebentar.</p>
            </div>
        </motion.div>
    );

    const renderResults = (result: QuizResult | null) => {
        if (!result) return null;

        const isPass = result.passed;
        const ringColor = isPass ? "#22c55e" : "#ef4444";
        const strokeDasharray = 283; // 2 * PI * 45
        const strokeDashoffset = strokeDasharray - (strokeDasharray * result.scorePercent) / 100;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto w-full"
            >
                {/* Score Card */}
                <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 overflow-hidden mb-6">
                    <div className={`p-8 text-center ${isPass ? 'bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-gradient-to-br from-red-50 to-orange-50'}`}>
                        {/* Score Ring */}
                        <div className="relative w-32 h-32 mx-auto mb-6">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                                <motion.circle
                                    cx="50" cy="50" r="45"
                                    fill="none"
                                    stroke={ringColor}
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray={strokeDasharray}
                                    initial={{ strokeDashoffset: strokeDasharray }}
                                    animate={{ strokeDashoffset }}
                                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <motion.span
                                    className="text-3xl font-bold font-sans text-oxford-900 dark:text-white"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5, duration: 0.4 }}
                                >
                                    {result.scorePercent}%
                                </motion.span>
                                {result.totalQuestions > 0 && (
                                    <span className="text-xs text-oxford-500 dark:text-oxford-400 font-sans">{result.score}/{result.totalQuestions}</span>
                                )}
                            </div>
                        </div>

                        {/* Pass/Fail Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                        >
                            <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold font-sans text-sm ${isPass
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                {isPass ? <Trophy size={18} /> : <XCircle size={18} />}
                                {isPass ? 'LULUS — Selamat!' : 'BELUM LULUS — Coba lagi!'}
                            </div>
                            {!isPass && (
                                <p className="text-sm text-oxford-500 dark:text-oxford-400 mt-3 font-sans">Nilai minimum untuk lulus: 70%</p>
                            )}
                        </motion.div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 flex flex-col sm:flex-row gap-3 border-t border-oxford-100 dark:border-oxford-800">
                        <button
                            onClick={retryQuiz}
                            className="flex-1 py-3 border-2 border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-200 font-bold font-sans rounded-xl hover:bg-oxford-50 dark:hover:bg-oxford-950 transition-all flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={16} />
                            Ulangi Quiz
                        </button>
                        
                        {nextLesson ? (
                             <button
                                onClick={() => {
                                    if (!completedLessons[activeLesson?.id ?? ""]) {
                                        markAsComplete();
                                    }
                                    handleLessonClick(nextLesson);
                                }}
                                disabled={!isPass && !completedLessons[activeLesson?.id ?? ""]}
                                className={`flex-[1.5] py-3 font-bold font-sans rounded-xl transition-all flex items-center justify-center gap-2
                                    ${(isPass || completedLessons[activeLesson?.id ?? ""])
                                        ? 'bg-gold-500 text-oxford-950 hover:bg-gold-400 shadow-lg shadow-gold-500/20 active:scale-95'
                                        : 'bg-oxford-100 dark:bg-[#161B2A] text-oxford-400 cursor-not-allowed'
                                    }`}
                            >
                                <ChevronRight size={20} />
                                Lanjutkan ke Materi Berikutnya
                            </button>
                        ) : (
                            <button
                                onClick={markAsComplete}
                                disabled={completedLessons[activeLesson?.id ?? ""]}
                                className={`flex-1 py-3 font-bold font-sans rounded-xl transition-all flex items-center justify-center gap-2
                                    ${completedLessons[activeLesson?.id ?? ""]
                                        ? 'bg-green-100 text-green-700 cursor-default'
                                        : isPass
                                            ? 'bg-gold-500 text-oxford-950 hover:bg-gold-400 active:scale-[0.98]'
                                            : 'bg-oxford-100 dark:bg-[#161B2A] text-oxford-400 cursor-not-allowed'
                                    }`}
                            >
                                <CheckCircle size={16} />
                                {completedLessons[activeLesson?.id ?? ""] ? 'Selesai' : 'Tandai Selesai'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Review Section */}
                {result.review && result.review.length > 0 && (
                    <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 overflow-hidden">
                        <div className="p-6 border-b border-oxford-100 dark:border-oxford-800">
                            <h3 className="font-serif font-bold text-lg text-oxford-900 dark:text-white">Review Jawaban</h3>
                            <p className="text-sm text-oxford-500 dark:text-oxford-400 font-sans mt-1">Pelajari penjelasan untuk setiap soal.</p>
                        </div>

                        <div className="divide-y divide-oxford-100">
                            {result.review.map((item, idx) => (
                                <ReviewItemCard key={item.questionId} item={item} index={idx} />
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex flex-col">
            {/* Top Navigation Bar - sticky at top since global header is hidden */}
            <div className="bg-oxford-950 text-white h-14 flex items-center px-4 md:px-6 sticky top-0 z-30 shadow-md">
                <Link href={`/courses/${course.id}`} className="flex items-center text-oxford-300 hover:text-white transition-colors mr-4">
                    <ChevronLeft size={20} className="mr-1" />
                    <span className="hidden sm:inline text-sm font-sans font-medium">Kembali ke Kursus</span>
                </Link>
                <div className="w-px h-6 bg-oxford-800 mx-4 hidden sm:block"></div>
                <h1 className="text-sm md:text-base font-serif font-bold truncate flex-1">{activeLesson ? cleanLessonTitle(activeLesson.title, activeLesson.type) : course.title}</h1>
                {enrollment?.id && (
                    <Link
                        href={`/dashboard/courses/${enrollment.id}/progress`}
                        className="hidden sm:inline-flex items-center gap-2 rounded-full border border-oxford-700 px-3 py-1.5 text-xs font-bold text-oxford-200 transition-colors hover:border-gold-500 hover:text-gold-400"
                    >
                        <ClipboardCheck size={15} /> Nilai
                    </Link>
                )}
                <div className="flex items-center ml-4">
                    <div className="text-right mr-3 hidden md:block">
                        <div className="text-xs text-oxford-400 font-sans">Progress</div>
                        <div className="text-sm font-bold font-sans">{progressPercent}%</div>
                    </div>
                    <div className="w-24 h-2 bg-oxford-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gold-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-1 h-[calc(100vh-56px)]">
                {/* Sidebar - Curriculum */}
                <div className="w-full md:w-80 lg:w-96 bg-white dark:bg-[#161B2A] border-r border-oxford-200 dark:border-oxford-700 flex-shrink-0 flex flex-col md:static absolute inset-y-0 left-0 z-20 md:z-0 transform transition-transform duration-300 md:translate-x-0 -translate-x-full">
                    <div className="p-4 border-b border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-950">
                        <h2 className="font-sans font-bold text-oxford-900 dark:text-white">Kurikulum Kursus</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {courseContent.map((module) => {
                            const isExpanded = !!expandedModules[module.id];
                            const hasActiveLesson = module.lessons.some(l => l.id === activeLesson?.id);
                            
                            return (
                                <div key={module.id} className={`border-b border-oxford-100 dark:border-oxford-800 last:border-0 ${hasActiveLesson ? 'bg-gold-50/10' : ''}`}>
                                    <button
                                        onClick={() => toggleModule(module.id)}
                                        className={`w-full text-left px-5 py-4 flex items-center justify-between transition-all group
                                            ${hasActiveLesson ? 'bg-gold-50/30' : 'hover:bg-oxford-50 dark:hover:bg-oxford-950'}`}
                                    >
                                        <div className="flex-1 min-w-0 pr-2">
                                            <h3 className={`font-sans font-bold text-sm truncate ${hasActiveLesson ? 'text-gold-700' : 'text-oxford-900 dark:text-white'}`}>
                                                {module.title}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-oxford-400 font-sans uppercase tracking-wider">
                                                    {module.lessons.length} Materi
                                                </span>
                                                {hasActiveLesson && (
                                                    <span className="flex h-1.5 w-1.5 rounded-full bg-gold-500 animate-pulse" />
                                                )}
                                            </div>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronUp size={16} className={hasActiveLesson ? 'text-gold-500' : 'text-oxford-400'} />
                                        ) : (
                                            <ChevronDown size={16} className={hasActiveLesson ? 'text-gold-500' : 'text-oxford-400'} />
                                        )}
                                    </button>

                                <AnimatePresence initial={false}>
                                    {expandedModules[module.id] && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <ul className="pb-2">
                                                {module.lessons.map((lesson) => {
                                                    const isActive = activeLesson?.id === lesson.id;
                                                    const isCompleted = completedLessons[lesson.id];

                                                    return (
                                                        <li key={lesson.id}>
                                                            <button
                                                                onClick={() => handleLessonClick(lesson)}
                                                                className={`w-full text-left px-5 py-3 pl-8 flex items-start transition-all relative group
                                                                    ${isActive 
                                                                        ? 'bg-gold-100/50' 
                                                                        : 'hover:bg-oxford-50 dark:hover:bg-oxford-950'
                                                                    }`}
                                                            >
                                                                {isActive && (
                                                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gold-500 rounded-r-full" />
                                                                )}
                                                                <div className={`mt-0.5 mr-3 flex-shrink-0 transition-colors ${isCompleted ? 'text-green-500' : (isActive ? 'text-gold-600' : 'text-oxford-400 group-hover:text-oxford-600 dark:group-hover:text-oxford-300')}`}>
                                                                    {isCompleted ? (
                                                                        <CheckCircle2 size={16} />
                                                                    ) : lesson.type === 'video' ? (
                                                                        <PlayCircle size={16} />
                                                                    ) : lesson.type === 'quiz' ? (
                                                                        <ClipboardCheck size={16} />
                                                                    ) : lesson.type === 'file' ? (
                                                                        <FileUp size={16} />
                                                                    ) : (
                                                                        <FileText size={16} />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className={`text-sm font-sans truncate ${isActive ? 'font-bold text-oxford-950' : 'text-oxford-700 dark:text-oxford-200'}`}>
                                                                        {cleanLessonTitle(lesson.title, lesson.type)}
                                                                    </div>
                                                                    <div className={`text-[11px] mt-0.5 flex items-center ${isActive ? 'text-gold-700 font-medium' : 'text-oxford-400'}`}>
                                                                        {getLessonTypeLabel(lesson.type)}
                                                                        {isCompleted && <CheckCircle size={10} className="ml-1.5 text-green-500" />}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ); })}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-y-auto relative bg-white dark:bg-[#161B2A] md:bg-oxford-50 dark:md:bg-oxford-950">
                    {activeLesson ? (
                        <div className="max-w-4xl mx-auto w-full p-4 md:p-8 flex-1 flex flex-col">
                            {activeLesson.type === 'quiz' ? (
                                // Quiz content
                                <div className="flex-1 flex flex-col justify-start pt-2">
                                    {renderQuizContent()}

                                    {/* Bottom padding */}
                                    <div className="h-24"></div>
                                </div>
                            ) : (
                                <>
                                    {/* Lesson Header */}
                                    <div className="mb-6 md:mb-8 bg-white dark:bg-[#161B2A] md:rounded-2xl md:p-6 md:shadow-sm">
                                        <span className="inline-block px-3 py-1 bg-gold-100 text-gold-800 text-xs font-bold font-sans rounded-full mb-3 uppercase tracking-wider">
                                            {getLessonTypeLabel(activeLesson.type)}
                                        </span>
                                        <h1 className="text-2xl md:text-3xl font-serif font-bold text-oxford-900 dark:text-white mb-2">
                                            {cleanLessonTitle(activeLesson.title, activeLesson.type)}
                                        </h1>
                                    </div>

                                    {/* Video Content */}
                                    {activeLesson.type === 'video' && activeLesson.videoUrl && (
                                        <div className="mb-8 md:mb-10 rounded-xl md:rounded-2xl overflow-hidden shadow-lg bg-black aspect-video relative">
                                            {getYoutubeEmbedUrl(activeLesson.videoUrl) ? (
                                                <iframe
                                                    src={getYoutubeEmbedUrl(activeLesson.videoUrl)!}
                                                    title={activeLesson.title}
                                                    className="absolute top-0 left-0 w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                ></iframe>
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-white font-sans">
                                                    Video format not supported in demo.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Text / Reading Content */}
                                    {activeLesson.type === 'reading' && activeLesson.content && (
                                        <div className="bg-white dark:bg-[#161B2A] rounded-2xl p-6 md:p-8 shadow-sm border border-oxford-100 dark:border-oxford-800 mb-8 font-sans">
                                            <div
                                                className="prose prose-oxford max-w-none text-oxford-800 dark:text-oxford-100 leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: activeLesson.content.replace(/\n/g, '<br/>') }}
                                            />
                                        </div>
                                    )}

                                    {/* File / Download Content */}
                                    {activeLesson.type === 'file' && (
                                        <div className="bg-white dark:bg-[#161B2A] rounded-2xl p-8 md:p-12 shadow-sm border-2 border-dashed border-oxford-200 dark:border-oxford-700 mb-8 font-sans flex flex-col items-center text-center animate-fade-in">
                                            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                                                <FileUp size={40} />
                                            </div>
                                            <h2 className="text-2xl font-serif font-bold text-oxford-900 dark:text-white mb-2">Materi Pendukung</h2>
                                            <p className="text-oxford-500 dark:text-oxford-400 max-w-md mb-8">
                                                Silakan unduh file materi ini sebagai referensi belajar tambahan untuk modul ini.
                                            </p>
                                            
                                            {activeLesson.content ? (
                                                <a 
                                                    href={activeLesson.content} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-3 px-8 py-4 bg-oxford-900 text-gold-400 hover:text-gold-300 font-bold rounded-xl shadow-lg transition-all active:scale-95 group"
                                                >
                                                    <FileUp size={24} className="group-hover:translate-y-[-2px] transition-transform" />
                                                    Unduh / Lihat File Materi
                                                </a>
                                            ) : (
                                                <div className="p-4 bg-amber-50 text-amber-600 rounded-lg text-sm border border-amber-100">
                                                    File belum tersedia atau tautan rusak.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Action Area */}
                                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-[#161B2A] p-5 md:p-6 rounded-xl md:rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800">
                                        <div className="mb-4 sm:mb-0 text-center sm:text-left">
                                            <p className="font-sans font-bold text-oxford-900 dark:text-white">Selesai mempelajari materi ini?</p>
                                            <p className="text-sm text-oxford-500 dark:text-oxford-400">Tandai sebagai selesai untuk meningkatkan progress kamu.</p>
                                        </div>
                                        <div className="flex flex-wrap justify-center sm:justify-end gap-3">
                                            {prevLesson && (
                                                <button
                                                    onClick={() => handleLessonClick(prevLesson)}
                                                    className="px-6 py-3 rounded-full border-2 border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-200 hover:bg-oxford-50 dark:hover:bg-oxford-950 font-sans font-bold transition-all flex items-center gap-2 active:scale-95"
                                                >
                                                    <ChevronLeft size={20} />
                                                    Materi Sebelumnya
                                                </button>
                                            )}

                                            <button
                                                onClick={markAsComplete}
                                                disabled={completedLessons[activeLesson.id]}
                                                className={`px-8 py-3 rounded-full font-sans font-bold transition-all flex items-center gap-2 ${completedLessons[activeLesson.id]
                                                    ? 'bg-green-100 text-green-700 cursor-default'
                                                    : 'bg-gold-500 text-oxford-950 hover:bg-gold-400 hover:shadow-lg hover:shadow-gold-500/20 active:scale-95'
                                                    }`}
                                            >
                                                <CheckCircle size={20} />
                                                {completedLessons[activeLesson.id] ? 'Selesai' : 'Tandai Selesai'}
                                            </button>

                                            {nextLesson && (
                                                <button
                                                    onClick={() => handleLessonClick(nextLesson)}
                                                    className="px-8 py-3 bg-oxford-900 text-gold-400 hover:text-gold-300 rounded-full font-sans font-bold transition-all flex items-center gap-2 active:scale-95 shadow-lg"
                                                >
                                                    Materi Selanjutnya
                                                    <ChevronRight size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Discussion Forum Section */}
                                    <div className="mt-12 bg-white dark:bg-[#161B2A] rounded-2xl shadow-sm border border-oxford-100 dark:border-oxford-800 overflow-hidden">
                                        <div className="p-6 border-b border-oxford-100 dark:border-oxford-800 bg-oxford-50 dark:bg-oxford-950/50 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="text-oxford-900 dark:text-white" size={20} />
                                                <h3 className="font-sans font-bold text-oxford-900 dark:text-white">Diskusi Pelajaran</h3>
                                            </div>
                                            <span className="text-xs font-bold text-oxford-400 bg-white dark:bg-[#161B2A] px-2 py-1 rounded-full border border-oxford-100 dark:border-oxford-800">
                                                {discussions.length} Komentar
                                            </span>
                                        </div>

                                        <div className="p-6">
                                            {/* Comment Input */}
                                            <div className="flex gap-4 mb-10">
                                                <div className="w-10 h-10 rounded-full bg-oxford-100 dark:bg-[#161B2A] flex-shrink-0 overflow-hidden border border-oxford-200 dark:border-oxford-700">
                                                    {user?.image ? (
                                                        <Image src={optimizeAvatar(user.image)} alt={user.name} width={40} height={40} unoptimized className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-oxford-400 font-bold uppercase">
                                                            {user?.name?.charAt(0) || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <textarea
                                                        value={commentText}
                                                        onChange={(e) => setCommentText(e.target.value)}
                                                        placeholder="Tanyakan sesuatu atau berikan tanggapan..."
                                                        className="w-full bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 rounded-xl px-4 py-3 text-sm focus:bg-white dark:focus:bg-[#161B2A] focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 outline-none transition-all min-h-[100px] resize-none"
                                                    />
                                                    <div className="mt-3 flex justify-end">
                                                        <button 
                                                            onClick={handleAddComment}
                                                            disabled={isSubmittingComment || !commentText.trim()}
                                                            className="flex items-center gap-2 px-6 py-2 bg-oxford-900 text-gold-400 font-bold rounded-full hover:bg-oxford-800 transition-all disabled:opacity-50 active:scale-95 text-sm"
                                                        >
                                                            {isSubmittingComment ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                                            Kirim Diskusi
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Discussion List */}
                                            <div className="space-y-8">
                                                {isFetchingDiscussions ? (
                                                    <div className="py-10 text-center">
                                                        <Loader2 className="animate-spin mx-auto text-oxford-300" size={32} />
                                                        <p className="mt-2 text-sm text-oxford-400">Memuat diskusi...</p>
                                                    </div>
                                                ) : discussions.length > 0 ? (
                                                    discussions.map((disc) => (
                                                        <div key={disc.id} className="group">
                                                            <div className="flex gap-4">
                                                                <div className="w-10 h-10 rounded-full bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 overflow-hidden flex-shrink-0">
                                                                    {disc.image ? (
                                                                        <Image src={optimizeAvatar(disc.image)} alt={disc.name} width={40} height={40} unoptimized className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-oxford-300 font-bold bg-oxford-50 dark:bg-oxford-950">
                                                                            {disc.name.charAt(0)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-sans font-bold text-oxford-900 dark:text-white text-sm">{disc.name}</span>
                                                                            <span className="text-[10px] text-oxford-400 font-medium">
                                                                                {new Date(disc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                            </span>
                                                                        </div>
                                                                        {(user?.id === disc.user_id || user?.role === 'admin') && (
                                                                            <button 
                                                                                onClick={() => handleDeleteComment(disc.id)}
                                                                                className="text-oxford-300 hover:text-crimson-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <div className="bg-oxford-50 dark:bg-oxford-950 p-4 rounded-2xl rounded-tl-none border border-oxford-100 dark:border-oxford-800">
                                                                        <p className="text-sm text-oxford-800 dark:text-oxford-100 leading-relaxed whitespace-pre-line">
                                                                            {disc.content}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-12 text-center bg-oxford-50 dark:bg-oxford-950 rounded-2xl border border-dashed border-oxford-200 dark:border-oxford-700">
                                                        <MessageSquare className="mx-auto text-oxford-200 mb-3" size={40} />
                                                        <p className="font-sans font-medium text-oxford-500 dark:text-oxford-400">Belum ada diskusi di materi ini.</p>
                                                        <p className="text-xs text-oxford-400 mt-1">Jadilah yang pertama untuk bertanya!</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom padding for scrolling */}
                                    <div className="h-24"></div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-[#161B2A] min-h-[500px]">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-oxford-50 dark:bg-oxford-950 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="text-oxford-300 w-10 h-10" />
                                </div>
                                <h3 className="font-serif font-bold text-xl text-oxford-900 dark:text-white mb-2">Pilih Materi Pembelajaran</h3>
                                <p className="text-oxford-500 dark:text-oxford-400 font-sans max-w-md">Klik salah satu materi di sidebar untuk mulai belajar.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Separate ReviewItemCard component for cleaner code
function ReviewItemCard({ item, index }: { item: ReviewItem; index: number }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="p-5">
            {/* Question header */}
            <div className="flex items-start gap-3 mb-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${item.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {item.isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                </div>
                <div className="flex-1">
                    <div className="text-xs font-bold uppercase font-sans tracking-wider mb-1">
                        <span className={item.isCorrect ? 'text-green-600' : 'text-red-600'}>
                            Soal {index + 1} — {item.isCorrect ? 'Benar' : 'Salah'}
                        </span>
                    </div>
                    <p className="text-sm font-sans text-oxford-900 dark:text-white font-medium leading-relaxed">{item.questionText}</p>
                </div>
            </div>

            {/* Answer info */}
            <div className="ml-10 space-y-2">
                {!item.isCorrect && item.selectedOptionText && (
                    <div className="flex items-start gap-2 text-sm">
                        <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="text-oxford-500 dark:text-oxford-400 font-sans">Jawaban Anda: </span>
                            <span className="text-red-700 font-sans font-medium">{item.selectedOptionText}</span>
                        </div>
                    </div>
                )}
                <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="text-oxford-500 dark:text-oxford-400 font-sans">Jawaban Benar: </span>
                        <span className="text-green-700 font-sans font-medium">{item.correctOptionText}</span>
                    </div>
                </div>
            </div>

            {/* Explanation toggle */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="ml-10 mt-3 text-xs font-bold text-oxford-500 dark:text-oxford-400 hover:text-oxford-700 dark:hover:text-oxford-200 font-sans uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded ? 'Sembunyikan Penjelasan' : 'Lihat Penjelasan'}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="ml-10 mt-3 p-4 bg-oxford-50 dark:bg-oxford-950 rounded-xl border border-oxford-100 dark:border-oxford-800">
                            {item.explanation && (
                                <p className="text-sm text-oxford-700 dark:text-oxford-200 font-sans leading-relaxed">{item.explanation}</p>
                            )}
                            {item.selectedOptionExplanation && !item.isCorrect && (
                                <div className="mt-3 pt-3 border-t border-oxford-200 dark:border-oxford-700">
                                    <p className="text-xs font-bold text-oxford-500 dark:text-oxford-400 mb-1 font-sans uppercase tracking-wider">Mengapa jawaban Anda salah:</p>
                                    <p className="text-sm text-oxford-600 dark:text-oxford-300 font-sans leading-relaxed">{item.selectedOptionExplanation}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
