"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PlusCircle, Trash2, Edit2, PlayCircle, FileText, CheckCircle2, Save, Loader2, ListPlus, FileUp, Sparkles, Search, QrCode, Copy, Check, HelpCircle, Camera, Link2, Lock, Unlock, Clock } from "lucide-react";
import { saveCourseContent, generateMaterialAttendanceQr, getMaterialAttendanceQr, getCourseContentForBuilder, updateModuleAccess } from "@/app/actions/builder";
import { evaluateModuleAccess, toDateTimeLocalValue, type ModuleAccessMode } from "@/lib/module-access";
import { updateCourseDocumentationUrl } from "@/app/actions/courses";
import { generateAIQuiz } from "@/app/actions/ai";
import { useRouter } from "next/navigation";
import { MediaPicker } from "@/components/MediaPicker";
import { showToast } from "@/lib/toast";

interface QuizOption {
    id?: string;
    optionText: string;
    isCorrect: boolean;
}

interface QuizQuestion {
    id: string;
    questionText: string;
    explanation?: string;
    options: QuizOption[];
}

type LessonType = "video" | "reading" | "quiz" | "file";

interface CourseLesson {
    id: string;
    title: string;
    type: LessonType;
    content?: string;
    videoUrl?: string;
    jp?: number;
    hasAttendance?: boolean;
    attendanceQrCode?: string | null;
    narasumberName?: string | null;
    sessionDate?: string | null;
    questions: QuizQuestion[];
}

export interface CourseContentModule {
    id: string;
    title: string;
    order: string | number;
    isActive?: boolean;
    accessMode?: ModuleAccessMode;
    activeFrom?: string | null;
    activeUntil?: string | null;
    lessons: CourseLesson[];
}

interface GeneratedQuestion {
    questionText: string;
    options: Array<{ optionText: string; isCorrect: boolean }>;
}

export default function ContentBuilder({ 
    courseId, 
    initialData, 
    initialDocumentationUrl = "",
    courseTitle,
    trainingType
}: { 
    courseId: string; 
    initialData: CourseContentModule[]; 
    initialDocumentationUrl?: string;
    courseTitle?: string;
    trainingType?: string;
}) {
    const [isSaving, setIsSaving] = useState(false);
    const [documentationUrl, setDocumentationUrl] = useState(initialDocumentationUrl);
    const [isSavingDoc, setIsSavingDoc] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState<{ [key: string]: boolean }>({});
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [showCustomAIInput, setShowCustomAIInput] = useState<{ [key: string]: boolean }>({});
    const [customAITexts, setCustomAITexts] = useState<{ [key: string]: string }>({});
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
    const [activeTarget, setActiveTarget] = useState<{ mIndex: number, lIndex: number, field: "videoUrl" | "content" } | null>(null);
    const [openQuizForLesson, setOpenQuizForLesson] = useState<{ [key: string]: boolean }>({});
    const [copiedCode, setCopiedCode] = useState(false);
    const [qrModalData, setQrModalData] = useState<{
        isOpen: boolean;
        lessonTitle: string;
        lessonId: string;
        code: string;
        qrDataUrl: string;
        isLoading: boolean;
    } | null>(null);
    const router = useRouter();

    const openQrModal = async (lesson: CourseLesson) => {
        if (!lesson.id) {
            showToast.warning("Simpan Materi Dulu", "Simpan kurikulum terlebih dahulu agar materi memiliki ID sebelum membuat QR presensi.");
            return;
        }
        setQrModalData({
            isOpen: true,
            lessonTitle: lesson.title,
            lessonId: lesson.id,
            code: lesson.attendanceQrCode || "",
            qrDataUrl: "",
            isLoading: true,
        });
        const res = await getMaterialAttendanceQr(courseId, lesson.id);
        if (res.success && res.qrDataUrl) {
            setQrModalData(prev => prev ? { ...prev, code: res.code || "", qrDataUrl: res.qrDataUrl, isLoading: false } : null);
        } else {
            setQrModalData(prev => prev ? { ...prev, isLoading: false } : null);
            showToast.error("Gagal Memuat QR", res.error || "Gagal memuat QR presensi.");
        }
    };

    const handleGenerateQr = async () => {
        if (!qrModalData) return;
        setQrModalData(prev => prev ? { ...prev, isLoading: true } : null);
        const res = await generateMaterialAttendanceQr(courseId, qrModalData.lessonId);
        if (res.success && res.qrDataUrl) {
            setQrModalData(prev => prev ? { ...prev, code: res.code || "", qrDataUrl: res.qrDataUrl, isLoading: false } : null);
            showToast.success("QR Code Baru Diterbitkan", `Kode: ${res.code}`);
            setModules(prev => prev.map(m => ({
                ...m,
                lessons: m.lessons.map(l => l.id === qrModalData.lessonId ? { ...l, attendanceQrCode: res.code } : l)
            })));
        } else {
            setQrModalData(prev => prev ? { ...prev, isLoading: false } : null);
            showToast.error("Gagal", res.error || "Gagal men-generate QR presensi.");
        }
    };

    // Core state
    const [modules, setModules] = useState<CourseContentModule[]>(initialData || []);

    // Garbage collection for backend deletions
    const [deletions, setDeletions] = useState({
        modules: [] as string[],
        lessons: [] as string[],
        questions: [] as string[],
        options: [] as string[]
    });

    const addModule = () => {
        setModules([...modules, { id: "", title: "Modul Baru", order: "0", isActive: true, accessMode: "manual", activeFrom: null, activeUntil: null, lessons: [] }]);
    };

    const handleModuleAccessChange = async (
        modIndex: number,
        patch: Partial<Pick<CourseContentModule, "isActive" | "accessMode" | "activeFrom" | "activeUntil">>,
        instantSave = false
    ) => {
        const current = modules[modIndex];
        if (!current) return;
        const nextMod = { ...current, ...patch };
        setModules((prev) => prev.map((m, i) => (i === modIndex ? nextMod : m)));

        if (instantSave && current.id && !current.id.startsWith("temp_")) {
            const res = await updateModuleAccess(courseId, current.id, {
                isActive: nextMod.isActive !== false,
                accessMode: nextMod.accessMode === "scheduled" ? "scheduled" : "manual",
                activeFrom: nextMod.activeFrom || null,
                activeUntil: nextMod.activeUntil || null,
            });
            if (res.success) {
                const status = evaluateModuleAccess({
                    isActive: nextMod.isActive !== false,
                    accessMode: nextMod.accessMode,
                    activeFrom: nextMod.activeFrom,
                    activeUntil: nextMod.activeUntil,
                });
                showToast.success(
                    status.accessible ? "Modul Diaktifkan" : "Modul Dinonaktifkan",
                    status.reason
                );
            } else {
                showToast.error("Gagal Memperbarui Akses", res.error || "Gagal menyimpan status modul.");
            }
        }
    };

    const deleteModule = (modIndex: number) => {
        const mod = modules[modIndex];
        if (mod.id) {
            setDeletions(prev => ({ ...prev, modules: [...prev.modules, mod.id] }));
        }
        setModules(modules.filter((_, i) => i !== modIndex));
    };

    const addLesson = (modIndex: number, type: 'video' | 'reading' | 'quiz' | 'file') => {
        const newModules = [...modules];
        const defaultTitles = {
            video: "Tonton Video",
            reading: "Baca Materi",
            quiz: "Kerjakan Kuis",
            file: "Unduh Materi"
        };
        newModules[modIndex].lessons.push({
            id: "",
            title: defaultTitles[type],
            type,
            content: "",
            videoUrl: "",
            jp: 2,
            hasAttendance: true,
            attendanceQrCode: null,
            narasumberName: "",
            sessionDate: null,
            questions: []
        });
        setModules(newModules);
    };

    const deleteLesson = (modIndex: number, lessonIndex: number) => {
        const newModules = [...modules];
        const ls = newModules[modIndex].lessons[lessonIndex];
        if (ls.id) {
            setDeletions(prev => ({ ...prev, lessons: [...prev.lessons, ls.id] }));
        }
        newModules[modIndex].lessons = newModules[modIndex].lessons.filter((_, i) => i !== lessonIndex);
        setModules(newModules);
    };

    const addQuestion = (modIndex: number, lessonIndex: number) => {
        const newModules = [...modules];
        if (!Array.isArray(newModules[modIndex].lessons[lessonIndex].questions)) {
            newModules[modIndex].lessons[lessonIndex].questions = [];
        }
        newModules[modIndex].lessons[lessonIndex].questions.push({
            id: "",
            questionText: "Pertanyaan Baru?",
            explanation: "",
            options: [
                { id: "", optionText: "Opsi A", isCorrect: true },
                { id: "", optionText: "Opsi B", isCorrect: false },
            ]
        });
        setModules(newModules);
    };

    const deleteQuestion = (modIndex: number, lessonIndex: number, qIndex: number) => {
        const newModules = [...modules];
        const q = newModules[modIndex].lessons[lessonIndex].questions[qIndex];
        if (q.id) {
            setDeletions(prev => ({ ...prev, questions: [...prev.questions, q.id] }));
        }
        newModules[modIndex].lessons[lessonIndex].questions = newModules[modIndex].lessons[lessonIndex].questions.filter((_, i) => i !== qIndex);
        setModules(newModules);
    };

    const addOption = (modIndex: number, lessonIndex: number, qIndex: number) => {
        const newModules = [...modules];
        newModules[modIndex].lessons[lessonIndex].questions[qIndex].options.push({
            id: "", optionText: "Opsi Baru", isCorrect: false
        });
        setModules(newModules);
    };

    const deleteOption = (modIndex: number, lessonIndex: number, qIndex: number, oIndex: number) => {
        const newModules = [...modules];
        const o = newModules[modIndex].lessons[lessonIndex].questions[qIndex].options[oIndex];
        if (o.id) {
            const optionId = o.id;
            setDeletions(prev => ({ ...prev, options: [...prev.options, optionId] }));
        }
        newModules[modIndex].lessons[lessonIndex].questions[qIndex].options = newModules[modIndex].lessons[lessonIndex].questions[qIndex].options.filter((_, i) => i !== oIndex);
        setModules(newModules);
    };

    // Generic Update
    const updateModule = (mIndex: number, field: keyof CourseContentModule, val: unknown) => {
        const temp = [...modules];
        temp[mIndex] = { ...temp[mIndex], [field]: val } as CourseContentModule;
        setModules(temp);
    };

    const updateLesson = (mIndex: number, lIndex: number, field: keyof CourseLesson, val: unknown) => {
        const temp = [...modules];
        temp[mIndex].lessons[lIndex] = { ...temp[mIndex].lessons[lIndex], [field]: val } as CourseLesson;
        setModules(temp);
    };

    const updateQuestion = (mIndex: number, lIndex: number, qIndex: number, field: keyof QuizQuestion, val: unknown) => {
        const temp = [...modules];
        temp[mIndex].lessons[lIndex].questions[qIndex] = { ...temp[mIndex].lessons[lIndex].questions[qIndex], [field]: val } as QuizQuestion;
        setModules(temp);
    };

    const updateOption = (mIndex: number, lIndex: number, qIndex: number, oIndex: number, field: keyof QuizOption, val: unknown) => {
        const temp = [...modules];
        temp[mIndex].lessons[lIndex].questions[qIndex].options[oIndex] = { ...temp[mIndex].lessons[lIndex].questions[qIndex].options[oIndex], [field]: val } as QuizOption;
        setModules(temp);
    };

    const setCorrectOption = (mIndex: number, lIndex: number, qIndex: number, oIndex: number) => {
        const temp = [...modules];
        temp[mIndex].lessons[lIndex].questions[qIndex].options.forEach((opt, i) => {
            opt.isCorrect = i === oIndex;
        });
        setModules(temp);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const res = await saveCourseContent(courseId, modules, deletions);
        if (res.error) {
            setIsSaving(false);
            showToast.error("Gagal Menyimpan Materi", res.error);
        } else {
            const refreshed = await getCourseContentForBuilder(courseId);
            setModules(refreshed as unknown as CourseContentModule[]);
            setIsSaving(false);
            showToast.success("Materi Berhasil Disimpan", "Seluruh kurikulum kursus telah diperbarui.");
            setDeletions({ modules: [], lessons: [], questions: [], options: [] });
            router.refresh();
        }
    };

    return (
        <div className="space-y-8 pb-32">
            <div className="flex justify-between items-center bg-white dark:bg-[#161B2A] p-4 rounded-xl border border-oxford-200 dark:border-oxford-700 shadow-sm sticky top-24 z-20">
                <p className="text-sm text-oxford-600 dark:text-oxford-300 font-medium">Auto-Save dimatikan. Pastikan menekan tombol Simpan sebelum keluar halaman.</p>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-oxford-900 text-gold-400 hover:text-gold-300 font-bold px-6 py-2 rounded-lg transition-colors cursor-pointer"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
            </div>

            {/* Link Dokumentasi Kegiatan (Sidebar Kelas Peserta) */}
            <div className="bg-white dark:bg-[#161B2A] p-4 rounded-xl border border-oxford-200 dark:border-oxford-700 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="p-2 rounded-lg bg-gold-50 dark:bg-gold-950/60 text-gold-700 dark:text-gold-300">
                        <Camera size={16} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-oxford-900 dark:text-white">Link Dokumentasi Kelas (Sidebar)</p>
                        <p className="text-[11px] text-oxford-500 dark:text-oxford-400">Tautan Google Drive / Foto kegiatan tanpa upload file ke server.</p>
                    </div>
                </div>
                <div className="flex-1 flex items-center gap-2">
                    <div className="relative flex-1">
                        <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-oxford-400" />
                        <input
                            type="url"
                            value={documentationUrl}
                            onChange={(e) => setDocumentationUrl(e.target.value)}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className="w-full pl-8 pr-3 py-2 text-xs bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 rounded-lg text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
                        />
                    </div>
                    <button
                        type="button"
                        disabled={isSavingDoc}
                        onClick={async () => {
                            setIsSavingDoc(true);
                            const res = await updateCourseDocumentationUrl(courseId, documentationUrl);
                            setIsSavingDoc(false);
                            if (res.success) {
                                showToast.success("Link Dokumentasi Disimpan", "Tautan dokumentasi tampil di sidebar kelas peserta.");
                            } else {
                                showToast.error("Gagal Menyimpan", res.error || "Link tidak valid.");
                            }
                        }}
                        className="px-4 py-2 rounded-lg bg-oxford-900 hover:bg-oxford-800 text-gold-400 text-xs font-bold whitespace-nowrap disabled:opacity-50"
                    >
                        {isSavingDoc ? "Menyimpan..." : "Simpan Link"}
                    </button>
                </div>
            </div>

            {modules.map((mod, mIndex) => {
                const accessStatus = evaluateModuleAccess({
                    isActive: mod.isActive !== false,
                    accessMode: mod.accessMode,
                    activeFrom: mod.activeFrom,
                    activeUntil: mod.activeUntil,
                });
                const isScheduled = mod.accessMode === "scheduled";
                const isManualOn = mod.isActive !== false;

                return (
                <div key={mIndex} className="bg-white dark:bg-[#161B2A] rounded-xl border-2 border-oxford-200 dark:border-oxford-700 p-6 flex flex-col shadow-sm">
                    <div className="flex flex-col gap-3 mb-4 pb-4 border-b border-oxford-100 dark:border-oxford-800">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <label className="text-xs uppercase tracking-wider font-bold text-oxford-400">Nama Modul {mIndex + 1}</label>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        accessStatus.accessible
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                                            : "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300"
                                    }`}>
                                        {accessStatus.accessible ? <Unlock size={10} /> : <Lock size={10} />}
                                        {accessStatus.accessible ? "Terbuka untuk Peserta" : "Terkunci"}
                                    </span>
                                </div>
                                <input
                                    value={mod.title}
                                    onChange={e => updateModule(mIndex, 'title', e.target.value)}
                                    className="w-full text-xl font-bold font-serif text-oxford-900 dark:text-white focus:outline-none focus:border-b-2 focus:border-gold-500 bg-transparent placeholder-oxford-300"
                                    placeholder="Misal: Pendahuluan"
                                />
                            </div>
                            <button onClick={() => deleteModule(mIndex)} className="text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 p-2 rounded-lg transition-colors" title="Hapus Modul">
                                <Trash2 size={20} />
                            </button>
                        </div>

                        {/* Kontrol Akses Modul: Manual On/Off atau Terjadwal (Jam) */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-oxford-50/80 dark:bg-oxford-950/80 border border-oxford-200/80 dark:border-oxford-800">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-oxford-600 dark:text-oxford-300">Akses Modul:</span>
                                <div className="inline-flex rounded-lg bg-white dark:bg-[#161B2A] p-0.5 border border-oxford-200 dark:border-oxford-700">
                                    <button
                                        type="button"
                                        onClick={() => void handleModuleAccessChange(mIndex, { accessMode: "manual" }, true)}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                                            !isScheduled
                                                ? "bg-oxford-900 text-gold-400 shadow-sm"
                                                : "text-oxford-500 hover:text-oxford-800 dark:text-oxford-400 dark:hover:text-white"
                                        }`}
                                    >
                                        Manual (On/Off)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleModuleAccessChange(mIndex, { accessMode: "scheduled" }, false)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                                            isScheduled
                                                ? "bg-oxford-900 text-gold-400 shadow-sm"
                                                : "text-oxford-500 hover:text-oxford-800 dark:text-oxford-400 dark:hover:text-white"
                                        }`}
                                    >
                                        <Clock size={11} />
                                        Terjadwal (Jam)
                                    </button>
                                </div>
                            </div>

                            {!isScheduled ? (
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isManualOn}
                                    onClick={() => void handleModuleAccessChange(mIndex, { isActive: !isManualOn, accessMode: "manual" }, true)}
                                    className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shadow-sm active:scale-95 ${
                                        isManualOn
                                            ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
                                            : "bg-oxford-200 hover:bg-oxford-300 dark:bg-oxford-800 dark:hover:bg-oxford-700 text-oxford-700 dark:text-oxford-200 border-oxford-300 dark:border-oxford-600"
                                    }`}
                                >
                                    <span className={`w-8 h-4 rounded-full relative transition-colors ${isManualOn ? "bg-emerald-800/50" : "bg-oxford-400/50"}`}>
                                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${isManualOn ? "left-4" : "left-0.5"}`} />
                                    </span>
                                    <span>{isManualOn ? "Modul Aktif" : "Modul Nonaktif"}</span>
                                </button>
                            ) : (
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <label className="flex items-center gap-1.5 text-oxford-600 dark:text-oxford-300 font-semibold">
                                        <span>Mulai:</span>
                                        <input
                                            type="datetime-local"
                                            value={toDateTimeLocalValue(mod.activeFrom)}
                                            onChange={(e) => {
                                                const iso = e.target.value ? new Date(e.target.value).toISOString() : null;
                                                void handleModuleAccessChange(mIndex, { accessMode: "scheduled", activeFrom: iso }, true);
                                            }}
                                            className="px-2 py-1 rounded-lg bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 text-xs text-oxford-900 dark:text-white"
                                        />
                                    </label>
                                    <label className="flex items-center gap-1.5 text-oxford-600 dark:text-oxford-300 font-semibold">
                                        <span>Selesai:</span>
                                        <input
                                            type="datetime-local"
                                            value={toDateTimeLocalValue(mod.activeUntil)}
                                            onChange={(e) => {
                                                const iso = e.target.value ? new Date(e.target.value).toISOString() : null;
                                                void handleModuleAccessChange(mIndex, { accessMode: "scheduled", activeUntil: iso }, true);
                                            }}
                                            className="px-2 py-1 rounded-lg bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 text-xs text-oxford-900 dark:text-white"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 pl-4 md:pl-8 border-l-2 border-oxford-100 dark:border-oxford-800">
                        {mod.lessons?.map((less, lIndex) => (
                            <div key={lIndex} className="bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-3 gap-3">
                                    <div className="p-2 bg-white dark:bg-[#161B2A] rounded-md flex-shrink-0 text-oxford-500 dark:text-oxford-400 border border-oxford-200 dark:border-oxford-700">
                                        {less.type === 'video' && <PlayCircle size={18} />}
                                        {less.type === 'reading' && <FileText size={18} />}
                                        {less.type === 'quiz' && <CheckCircle2 size={18} />}
                                        {less.type === 'file' && <FileUp size={18} />}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                                        <input
                                            value={less.title}
                                            onChange={e => updateLesson(mIndex, lIndex, 'title', e.target.value)}
                                            className="font-bold text-oxford-900 dark:text-white text-sm bg-transparent border-b border-transparent focus:border-gold-500 focus:outline-none w-full"
                                            placeholder="Judul Pelajaran"
                                        />

                                        {less.type === 'video' && (
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    value={less.videoUrl || ""}
                                                    onChange={e => updateLesson(mIndex, lIndex, 'videoUrl', e.target.value)}
                                                    className="text-xs text-oxford-600 dark:text-oxford-300 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded px-2 py-1 flex-1 mt-1"
                                                    placeholder="YouTube / Video URL"
                                                />
                                                <button 
                                                    onClick={() => { setActiveTarget({ mIndex, lIndex, field: 'videoUrl' }); setIsMediaPickerOpen(true); }}
                                                    className="mt-1 p-1.5 border border-oxford-200 dark:border-oxford-700 rounded text-oxford-500 dark:text-oxford-400 hover:text-gold-600"
                                                    title="Pilih dari Galeri"
                                                >
                                                    <Search size={14} />
                                                </button>
                                            </div>
                                        )}

                                        {less.type === 'reading' && (
                                            <textarea
                                                value={less.content || ""}
                                                onChange={e => updateLesson(mIndex, lIndex, 'content', e.target.value)}
                                                className="text-sm text-oxford-700 dark:text-oxford-200 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded px-3 py-2 w-full mt-1 h-32 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 focus:outline-none"
                                                placeholder="Tuliskan materi teks disini... (Mendukung HTML dasar)"
                                            />
                                        )}

                                        {less.type === 'file' && (
                                            <div className="mt-1 flex items-center gap-3">
                                                <input
                                                    type="text"
                                                    value={less.content || ""}
                                                    onChange={e => updateLesson(mIndex, lIndex, 'content', e.target.value)}
                                                    className="flex-1 text-xs text-oxford-600 dark:text-oxford-300 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded px-2 py-1 focus:outline-none"
                                                    placeholder="Tempel Link Materi (Google Drive / OneDrive / PDF URL) - tanpa upload ke server"
                                                />
                                                <label className="flex flex-col items-end gap-1">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-oxford-900 hover:bg-oxford-800 text-gold-400 border border-oxford-800 text-[10px] font-bold rounded cursor-pointer transition-all shadow-sm whitespace-nowrap active:scale-95 text-center justify-center">
                                                        <FileUp size={12} /> {uploadProgress[`${mIndex}-${lIndex}`] !== undefined ? `Mengunggah ${uploadProgress[`${mIndex}-${lIndex}`]}%` : 'Upload File'}
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            disabled={uploadProgress[`${mIndex}-${lIndex}`] !== undefined}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;

                                                                const key = `${mIndex}-${lIndex}`;
                                                                const xhr = new XMLHttpRequest();
                                                                const fd = new FormData();
                                                                fd.append("file", file);

                                                                xhr.upload.onprogress = (event) => {
                                                                    if (event.lengthComputable) {
                                                                        const percent = Math.round((event.loaded / event.total) * 100);
                                                                        setUploadProgress(prev => ({ ...prev, [key]: percent }));
                                                                    }
                                                                };

                                                                xhr.onload = () => {
                                                                    try {
                                                                        const result = JSON.parse(xhr.responseText);
                                                                        if (result.success) {
                                                                            updateLesson(mIndex, lIndex, 'content', result.url);
                                                                            showToast.success("File Berhasil Diunggah");
                                                                        } else if (result.error) {
                                                                            showToast.error("Gagal Mengunggah File", result.error);
                                                                        }
                                                                    } catch {
                                                                        showToast.error("Format Respon Tidak Valid", "Gagal memproses respon upload.");
                                                                    }
                                                                    setUploadProgress(prev => {
                                                                        const newP = { ...prev };
                                                                        delete newP[key];
                                                                        return newP;
                                                                    });
                                                                };

                                                                xhr.onerror = () => {
                                                                    showToast.error("Kesalahan Jaringan", "Gagal upload file.");
                                                                    setUploadProgress(prev => {
                                                                        const newP = { ...prev };
                                                                        delete newP[key];
                                                                        return newP;
                                                                    });
                                                                };

                                                                xhr.open("POST", "/api/upload");
                                                                xhr.send(fd);
                                                            }}
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => { setActiveTarget({ mIndex, lIndex, field: 'content' }); setIsMediaPickerOpen(true); }}
                                                        className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-200 text-[10px] font-bold rounded hover:border-gold-500 hover:text-gold-600 transition-all shadow-sm justify-center"
                                                    >
                                                        <Search size={12} /> Pilih dari Pustaka
                                                    </button>
                                                </div>
                                                    {uploadProgress[`${mIndex}-${lIndex}`] !== undefined && (
                                                        <div className="w-24 h-1 bg-oxford-100 dark:bg-[#161B2A] rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-gold-500 transition-all duration-300"
                                                                style={{ width: `${uploadProgress[`${mIndex}-${lIndex}`]}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </label>
                                            </div>
                                        )}

                                        {/* Classical Facilitation & Attendance Settings */}
                                        <div className="mt-3 p-2.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                                            <div className="flex flex-wrap items-center gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-oxford-600 dark:text-oxford-300">Beban JP:</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        value={less.jp ?? 0}
                                                        onChange={e => updateLesson(mIndex, lIndex, 'jp', parseInt(e.target.value) || 0)}
                                                        className="w-16 px-2 py-1 text-xs border border-oxford-200 dark:border-oxford-700 rounded font-bold text-center bg-oxford-50 dark:bg-oxford-900 text-oxford-900 dark:text-white"
                                                    />
                                                </div>
                                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={less.hasAttendance !== false}
                                                        onChange={e => updateLesson(mIndex, lIndex, 'hasAttendance', e.target.checked)}
                                                        className="h-4 w-4 rounded border-oxford-300 accent-gold-500"
                                                    />
                                                    <span className="font-semibold text-oxford-700 dark:text-oxford-200">Wajib Presensi</span>
                                                </label>
                                                <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                                                    <span className="font-bold text-oxford-600 dark:text-oxford-300 whitespace-nowrap">Narasumber:</span>
                                                    <input
                                                        type="text"
                                                        value={less.narasumberName || ""}
                                                        onChange={e => updateLesson(mIndex, lIndex, 'narasumberName', e.target.value)}
                                                        placeholder="Nama Narasumber / Fasilitator"
                                                        className="flex-1 px-2 py-1 text-xs border border-oxford-200 dark:border-oxford-700 rounded bg-oxford-50 dark:bg-oxford-900 text-oxford-900 dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openQrModal(less)}
                                                    className="px-2.5 py-1 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded flex items-center gap-1.5 transition-colors shadow-xs"
                                                    title="Generate / Lihat QR Code Presensi"
                                                >
                                                    <QrCode size={13} />
                                                    <span>QR Presensi</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const key = `${mIndex}-${lIndex}`;
                                                        setOpenQuizForLesson(prev => ({ ...prev, [key]: !prev[key] }));
                                                    }}
                                                    className={`px-2.5 py-1 font-bold rounded border flex items-center gap-1.5 transition-colors ${
                                                        (less.questions && less.questions.length > 0) || openQuizForLesson[`${mIndex}-${lIndex}`]
                                                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 text-indigo-700 dark:text-indigo-300'
                                                            : 'bg-oxford-50 dark:bg-oxford-900 border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-300 hover:bg-oxford-100'
                                                    }`}
                                                    title="Kelola kuis / soal pemahaman untuk materi ini"
                                                >
                                                    <HelpCircle size={13} />
                                                    <span>
                                                        {less.questions && less.questions.length > 0
                                                            ? `Kuis (${less.questions.length})`
                                                            : (openQuizForLesson[`${mIndex}-${lIndex}`] ? 'Tutup Kuis' : '+ Kuis Materi')}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => deleteLesson(mIndex, lIndex)} className="text-red-400 p-1 hover:bg-red-50 rounded transition-colors flex-shrink-0">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* QUIZ BUILDER SECTION (Any lesson can attach a quiz) */}
                                {(less.type === 'quiz' || openQuizForLesson[`${mIndex}-${lIndex}`] || (less.questions && less.questions.length > 0)) && (
                                    <div className="mt-4 border-t border-oxford-200 dark:border-oxford-700 pt-4 pl-8 border-l border-l-oxford-200 ml-5 space-y-6">
                                        {/* AI Generator Section */}
                                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl mb-4 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md">
                                                    <Sparkles size={16} />
                                                </div>
                                                <div className="flex-1">
                                                    <h5 className="text-xs font-bold text-indigo-900 leading-none mb-1">AI Magic Quiz</h5>
                                                    <p className="text-[10px] text-indigo-500 leading-tight">Generate soal kuis dari bacaan modul atau teks pilihan Anda.</p>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const key = `${mIndex}-${lIndex}`;
                                                        setShowCustomAIInput(prev => ({ ...prev, [key]: !prev[key] }));
                                                    }}
                                                    className={`px-2 py-1 text-[10px] font-bold rounded transition-all flex items-center gap-1 ${showCustomAIInput[`${mIndex}-${lIndex}`] ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-[#161B2A] text-indigo-600 border border-indigo-200 hover:bg-indigo-600 hover:text-white'}`}
                                                >
                                                    <Edit2 size={12} /> {showCustomAIInput[`${mIndex}-${lIndex}`] ? 'Tutup Input' : 'Pilih Input Teks'}
                                                </button>
                                            </div>

                                            {showCustomAIInput[`${mIndex}-${lIndex}`] && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    className="overflow-hidden"
                                                >
                                                    <textarea
                                                        value={customAITexts[`${mIndex}-${lIndex}`] || ""}
                                                        onChange={(e) => setCustomAITexts(prev => ({ ...prev, [`${mIndex}-${lIndex}`]: e.target.value }))}
                                                        className="w-full h-32 text-xs p-3 border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white dark:bg-[#161B2A] placeholder-indigo-300"
                                                        placeholder="Tempelkan teks materi disini..."
                                                    />
                                                </motion.div>
                                            )}

                                            <button 
                                                onClick={async () => {
                                                    const key = `${mIndex}-${lIndex}`;
                                                    let sourceText: string | undefined = customAITexts[key];
                                                    
                                                    // Only fallback if custom input is NOT shown or is empty
                                                    if (!sourceText) {
                                                        sourceText = modules[mIndex].lessons.find((lesson) => lesson.type === 'reading' && lesson.content)?.content;
                                                    }

                                                    if (!sourceText) {
                                                        showToast.warning("Materi Diperlukan", "Silakan masukkan teks materi kustom atau pastikan modul ini memiliki materi bacaan.");
                                                        return;
                                                    }

                                                    setIsGeneratingAI(prev => ({ ...prev, [key]: true }));
                                                    
                                                    const res = await generateAIQuiz(sourceText, 5);
                                                    if (res.success && res.questions) {
                                                        const newModules = [...modules];
                                                        const mappedQuestions = (res.questions as unknown as GeneratedQuestion[]).map((q) => ({
                                                            id: `temp_${Date.now()}_${Math.random()}`,
                                                            questionText: q.questionText,
                                                            options: q.options.map((o) => ({
                                                                optionText: o.optionText,
                                                                isCorrect: o.isCorrect
                                                            }))
                                                        }));
                                                        newModules[mIndex].lessons[lIndex].questions = [
                                                            ...(newModules[mIndex].lessons[lIndex].questions || []),
                                                            ...mappedQuestions
                                                        ];
                                                        setModules(newModules);
                                                        // Close custom input after success if it was open
                                                        if (customAITexts[key]) setShowCustomAIInput(prev => ({ ...prev, [key]: false }));
                                                        showToast.success("Kuis Berhasil Dibuat", `${mappedQuestions.length} pertanyaan berhasil digenerate.`);
                                                    } else {
                                                        showToast.error("Gagal Membuat Kuis", res.error || "Gagal generate kuis.");
                                                    }
                                                    setIsGeneratingAI(prev => ({ ...prev, [key]: false }));
                                                }}
                                                disabled={isGeneratingAI[`${mIndex}-${lIndex}`]}
                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                            >
                                                {isGeneratingAI[`${mIndex}-${lIndex}`] ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                                                {isGeneratingAI[`${mIndex}-${lIndex}`] ? "Generating Questions..." : "Generate dengan AI Magic"}
                                            </button>
                                        </div>
                                        {less.questions?.map((q, qIndex) => (
                                            <div key={qIndex} className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                                                <div className="flex justify-between items-start mb-2">
                                                    <textarea
                                                        value={q.questionText}
                                                        onChange={e => updateQuestion(mIndex, lIndex, qIndex, 'questionText', e.target.value)}
                                                        className="font-bold text-oxford-900 dark:text-white text-sm focus:outline-none w-full bg-oxford-50 dark:bg-oxford-950 p-2 rounded-t-lg resize-none"
                                                        placeholder="Ketik Pertanyaan..."
                                                        rows={2}
                                                    />
                                                    <button onClick={() => deleteQuestion(mIndex, lIndex, qIndex)} className="text-red-400 p-2 hover:bg-red-50 rounded ml-2 flex-shrink-0">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <div className="mb-3">
                                                    <input
                                                        value={q.explanation || ""}
                                                        onChange={e => updateQuestion(mIndex, lIndex, qIndex, 'explanation', e.target.value)}
                                                        className="text-xs text-oxford-500 dark:text-oxford-400 bg-oxford-50 dark:bg-oxford-950 p-2 w-full rounded-b-lg focus:outline-none"
                                                        placeholder="(Opsional) Penjelasan Jawaban (Muncul saat review)"
                                                    />
                                                </div>

                                                <div className="space-y-2 mt-4 ml-2">
                                                    {q.options?.map((opt, oIndex) => (
                                                        <div key={oIndex} className={`flex items-center gap-2 border rounded p-2 ${opt.isCorrect ? 'border-green-300 bg-green-50' : 'border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A]'}`}>
                                                            <div
                                                                onClick={() => setCorrectOption(mIndex, lIndex, qIndex, oIndex)}
                                                                className={`w-4 h-4 rounded-full border flex flex-shrink-0 items-center justify-center cursor-pointer ${opt.isCorrect ? 'border-green-500 bg-green-500' : 'border-oxford-300 dark:border-oxford-600 bg-white dark:bg-[#161B2A] hover:border-gold-500'}`}
                                                            >
                                                                {opt.isCorrect && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#161B2A]" />}
                                                            </div>
                                                            <input
                                                                value={opt.optionText}
                                                                onChange={e => updateOption(mIndex, lIndex, qIndex, oIndex, 'optionText', e.target.value)}
                                                                className="flex-1 text-sm bg-transparent focus:outline-none"
                                                                placeholder="Teks Opsi Jawaban"
                                                            />
                                                            <button onClick={() => deleteOption(mIndex, lIndex, qIndex, oIndex)} className="text-oxford-400 hover:text-red-500 p-1">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => addOption(mIndex, lIndex, qIndex)} className="text-xs text-gold-600 font-bold hover:underline px-2 py-1 flex items-center gap-1">
                                                        <PlusCircle size={12} /> Tambah Opsi
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        <button onClick={() => addQuestion(mIndex, lIndex)} className="text-sm font-bold text-center w-full py-2 bg-oxford-100 dark:bg-[#161B2A]/50 hover:bg-oxford-100 dark:hover:bg-[#161B2A] text-oxford-600 dark:text-oxford-300 rounded-lg transition-colors border border-dashed border-oxford-300 dark:border-oxford-600 flex items-center justify-center gap-2">
                                            <ListPlus size={16} /> Tambah Pertanyaan Kuis
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* ADD LESSON BUTTONS */}
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => addLesson(mIndex, 'video')} className="flex-1 py-3 text-[10px] sm:text-xs md:text-sm font-bold bg-white dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 hover:text-oxford-900 dark:hover:text-white border border-oxford-200 dark:border-oxford-700 border-dashed rounded-lg hover:border-gold-500 hover:bg-gold-50/20 transition-all flex items-center justify-center gap-1 sm:gap-2">
                                <PlayCircle size={16} /> <span className="hidden sm:inline">Tambah</span> Video
                            </button>
                            <button onClick={() => addLesson(mIndex, 'reading')} className="flex-1 py-3 text-[10px] sm:text-xs md:text-sm font-bold bg-white dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 hover:text-oxford-900 dark:hover:text-white border border-oxford-200 dark:border-oxford-700 border-dashed rounded-lg hover:border-emerald-500 hover:bg-emerald-50/20 transition-all flex items-center justify-center gap-1 sm:gap-2">
                                <FileText size={16} /> <span className="hidden sm:inline">Tambah</span> Bacaan
                            </button>
                            <button onClick={() => addLesson(mIndex, 'file')} className="flex-1 py-3 text-[10px] sm:text-xs md:text-sm font-bold bg-white dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 hover:text-oxford-900 dark:hover:text-white border border-oxford-200 dark:border-oxford-700 border-dashed rounded-lg hover:border-blue-500 hover:bg-blue-50/20 transition-all flex items-center justify-center gap-1 sm:gap-2">
                                <FileUp size={16} /> <span className="hidden sm:inline">Tambah</span> File
                            </button>
                            <button onClick={() => addLesson(mIndex, 'quiz')} className="flex-1 py-3 text-[10px] sm:text-xs md:text-sm font-bold bg-white dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 hover:text-oxford-900 dark:hover:text-white border border-oxford-200 dark:border-oxford-700 border-dashed rounded-lg hover:border-indigo-500 hover:bg-indigo-50/20 transition-all flex items-center justify-center gap-1 sm:gap-2">
                                <CheckCircle2 size={16} /> <span className="hidden sm:inline">Tambah</span> Kuis
                            </button>
                        </div>
                    </div>
                </div>
                );
            })}

            <button
                onClick={addModule}
                className="w-full py-4 border-2 border-dashed border-oxford-300 dark:border-oxford-600 bg-oxford-50 dark:bg-oxford-950/50 hover:bg-gold-50 hover:border-gold-500 hover:text-gold-700 text-oxford-500 dark:text-oxford-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
                <PlusCircle size={20} /> Tambah Modul Kurikulum Baru
            </button>
            <MediaPicker 
                isOpen={isMediaPickerOpen} 
                onClose={() => setIsMediaPickerOpen(false)} 
                onSelect={(url) => {
                    if (activeTarget) {
                        updateLesson(activeTarget.mIndex, activeTarget.lIndex, activeTarget.field, url);
                    }
                    setIsMediaPickerOpen(false);
                }}
            />

            {/* Modal QR Code Presensi */}
            {qrModalData && qrModalData.isOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
                        <button
                            type="button"
                            onClick={() => setQrModalData(null)}
                            className="absolute top-4 right-4 text-oxford-400 hover:text-oxford-700 dark:hover:text-white p-1 rounded-lg"
                        >
                            ✕
                        </button>
                        <div className="text-center space-y-4">
                            <div className="inline-flex p-3 bg-gold-50 dark:bg-gold-950/40 text-gold-600 rounded-full">
                                <QrCode size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-oxford-900 dark:text-white">QR Code Presensi Materi</h3>
                                <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-1 line-clamp-2">{qrModalData.lessonTitle}</p>
                            </div>

                            {qrModalData.isLoading ? (
                                <div className="aspect-square w-full max-w-[240px] mx-auto bg-oxford-50 dark:bg-oxford-900 rounded-xl flex items-center justify-center">
                                    <Loader2 size={32} className="animate-spin text-gold-500" />
                                </div>
                            ) : qrModalData.qrDataUrl ? (
                                <div className="space-y-3">
                                    <div className="p-3 bg-white rounded-xl border border-oxford-200 inline-block shadow-inner">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={qrModalData.qrDataUrl} alt="QR Code Presensi" className="w-52 h-52 object-contain mx-auto" />
                                    </div>
                                    <div className="flex items-center justify-center gap-2 bg-oxford-50 dark:bg-oxford-900 p-2.5 rounded-lg border border-oxford-200 dark:border-oxford-700 font-mono text-xs font-bold text-oxford-900 dark:text-white">
                                        <span>Kode: {qrModalData.code}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(qrModalData.code);
                                                setCopiedCode(true);
                                                setTimeout(() => setCopiedCode(false), 2000);
                                            }}
                                            className="p-1 text-oxford-500 hover:text-gold-600"
                                            title="Salin Kode"
                                        >
                                            {copiedCode ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-crimson-500">QR Code belum tersedia.</p>
                            )}

                            <div className="pt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleGenerateQr}
                                    disabled={qrModalData.isLoading}
                                    className="flex-1 py-2.5 bg-oxford-900 hover:bg-oxford-800 text-gold-400 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                    <QrCode size={14} />
                                    <span>{qrModalData.code ? "Regenerate QR" : "Generate QR"}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQrModalData(null)}
                                    className="px-4 py-2.5 bg-oxford-100 hover:bg-oxford-200 dark:bg-oxford-800 dark:hover:bg-oxford-700 text-oxford-700 dark:text-oxford-200 text-xs font-bold rounded-lg transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
