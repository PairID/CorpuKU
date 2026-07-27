"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PlusCircle, Trash2, Edit2, PlayCircle, FileText, CheckCircle2, Save, Loader2, ListPlus, FileUp, Sparkles, Search } from "lucide-react";
import { saveCourseContent } from "@/app/actions/builder";
import { generateAIQuiz } from "@/app/actions/ai";
import { useRouter } from "next/navigation";
import { MediaPicker } from "@/components/MediaPicker";

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
    questions: QuizQuestion[];
}

export interface CourseContentModule {
    id: string;
    title: string;
    order: string | number;
    lessons: CourseLesson[];
}

interface GeneratedQuestion {
    questionText: string;
    options: Array<{ optionText: string; isCorrect: boolean }>;
}

export default function ContentBuilder({ courseId, initialData }: { courseId: string; initialData: CourseContentModule[] }) {
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState<{ [key: string]: boolean }>({});
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const [showCustomAIInput, setShowCustomAIInput] = useState<{ [key: string]: boolean }>({});
    const [customAITexts, setCustomAITexts] = useState<{ [key: string]: string }>({});
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
    const [activeTarget, setActiveTarget] = useState<{ mIndex: number, lIndex: number, field: "videoUrl" | "content" } | null>(null);
    const router = useRouter();

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
        setModules([...modules, { id: "", title: "Modul Baru", order: "0", lessons: [] }]);
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
        setIsSaving(false);
        if (res.error) {
            alert(res.error);
        } else {
            alert("Materi berhasil disimpan!");
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

            {modules.map((mod, mIndex) => (
                <div key={mIndex} className="bg-white dark:bg-[#161B2A] rounded-xl border-2 border-oxford-200 dark:border-oxford-700 p-6 flex flex-col shadow-sm">
                    <div className="flex justify-between items-start gap-4 mb-4 pb-4 border-b border-oxford-100 dark:border-oxford-800">
                        <div className="flex-1">
                            <label className="text-xs uppercase tracking-wider font-bold text-oxford-400 mb-1 block">Nama Modul {mIndex + 1}</label>
                            <input
                                value={mod.title}
                                onChange={e => updateModule(mIndex, 'title', e.target.value)}
                                className="w-full text-xl font-bold font-serif text-oxford-900 dark:text-white focus:outline-none focus:border-b-2 focus:border-gold-500 bg-transparent placeholder-oxford-300"
                                placeholder="Misal: Pendahuluan"
                            />
                        </div>
                        <button onClick={() => deleteModule(mIndex)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Hapus Modul">
                            <Trash2 size={20} />
                        </button>
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
                                                    placeholder="URL File (PDF/Doc/Zip)"
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
                                                                        } else if (result.error) {
                                                                            alert(result.error);
                                                                        }
                                                                    } catch {
                                                                        alert("Gagal memproses respon upload.");
                                                                    }
                                                                    setUploadProgress(prev => {
                                                                        const newP = { ...prev };
                                                                        delete newP[key];
                                                                        return newP;
                                                                    });
                                                                };

                                                                xhr.onerror = () => {
                                                                    alert("Gagal upload file.");
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
                                    </div>
                                    <button onClick={() => deleteLesson(mIndex, lIndex)} className="text-red-400 p-1 hover:bg-red-50 rounded transition-colors flex-shrink-0">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* QUIZ BUILDER SECTION */}
                                {less.type === 'quiz' && (
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
                                                        alert("Silakan masukkan teks materi kustom atau pastikan modul ini memiliki materi bacaan.");
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
                                                    } else {
                                                        alert(res.error || "Gagal generate kuis.");
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
            ))}

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
        </div>
    );
}
