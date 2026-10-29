"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    BookOpen,
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    FileText,
    CheckSquare,
    HelpCircle,
    Send,
    ArrowRight,
    ArrowLeft,
    ExternalLink,
    Loader2,
    Eye,
    Check,
    Cpu,
    Scale,
    Database,
    Search,
    Globe,
    Plus,
    Trash2,
    Edit3,
    ArrowUpDown,
    BookMarked,
    X
} from "lucide-react";
import {
    generateOnDemandLearningAction,
    getAvailableRegulationsAction,
    publishOnDemandCourseAction,
    RegulationItem
} from "@/app/actions/on-demand-learning";
import {
    searchExternalSourcesAction,
    ingestExternalSourceAction,
    ExternalSourceItem
} from "@/app/actions/regulations";
import type { OnDemandCoursePackage, ChecklistCheckpoint } from "@/lib/on-demand-learning";
import { showToast } from "@/lib/toast";

interface CourseCreatorWizardProps {
    basePath?: string;
    instructorName?: string;
}

type TabType = "identity" | "regulations" | "syllabus" | "modules" | "evaluation" | "publish";

const DEFAULT_PROBLEM = 
    "Saya baru ditunjuk sebagai Pejabat Pembuat Komitmen (PPK) dan harus menyusun Harga Perkiraan Sendiri (HPS) serta dokumen spesifikasi teknis pengadaan barang/jasa di instansi daerah agar akuntabel, tidak terjadi penguncian merek yang melanggar hukum, dan sesuai dengan Perpres PBJ terbaru (Perpres 46/2025 jo. Perpres 16/2018 jo. 12/2021 serta Perka LKPP 4/2024).";

export default function CourseCreatorWizard({ basePath = "/instructor" }: CourseCreatorWizardProps) {
    // Navigation state
    const [activeTab, setActiveTab] = useState<TabType>("identity");
    
    // Form state (Identity)
    const [title, setTitle] = useState("Penyusunan Spesifikasi Teknis & HPS Akuntabel bagi PPK");
    const [targetAudience, setTargetAudience] = useState("Pejabat Pembuat Komitmen (PPK), Pokja Pemilihan, dan Pejabat Pengadaan");
    const [category, setCategory] = useState("Pengadaan Barang/Jasa");
    const [competencyLevel, setCompetencyLevel] = useState("Bloom C3-C4 (Aplikasi & Analisis)");
    
    // Regulations state (Local Document Registry)
    const [regulations, setRegulations] = useState<RegulationItem[]>([]);
    const [selectedRegulationIds, setSelectedRegulationIds] = useState<string[]>([]);
    const [isLoadingRegulations, setIsLoadingRegulations] = useState(true);

    // Search Bar 1: Pencarian Sumber di Internet (JDIH, Scholar, Buku) - Desain Gambar 2
    const [searchQueryExternal, setSearchQueryExternal] = useState("");
    const [selectedExternalCategory, setSelectedExternalCategory] = useState<"ALL" | "JDIH" | "JOURNAL" | "BOOK">("ALL");
    const [activeFilterTagExternal, setActiveFilterTagExternal] = useState<string | null>(null);
    const [isSearchingExternal, setIsSearchingExternal] = useState(false);
    const [externalResults, setExternalResults] = useState<ExternalSourceItem[]>([]);
    const [annasArchiveUrl, setAnnasArchiveUrl] = useState<string | null>(null);
    const [ingestingIds, setIngestingIds] = useState<string[]>([]);
    const [externalSearchMessage, setExternalSearchMessage] = useState<string | null>(null);

    // Search Bar 2: Dokumen yang Dimiliki di Database (Dikembalikan)
    const [localSearchQuery, setLocalSearchQuery] = useState("");
    const [localStatusFilter, setLocalStatusFilter] = useState<string>("ALL");
    const [localSortBy, setLocalSortBy] = useState<"year_desc" | "year_asc" | "title_asc">("year_desc");

    // AI Generation state
    const [workplaceProblem, setWorkplaceProblem] = useState(DEFAULT_PROBLEM);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStep, setGenerationStep] = useState<string>("");
    const [generatedCourse, setGeneratedCourse] = useState<OnDemandCoursePackage | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);

    // Module Editing state (Tab 4)
    const [isEditingModules, setIsEditingModules] = useState(false);

    // Publish state
    const [publishStatus, setPublishStatus] = useState<"active" | "draft">("active");
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [publishedResult, setPublishedResult] = useState<{ courseId: string; redirectUrl: string } | null>(null);

    // Active module preview index
    const [activeModuleIdx, setActiveModuleIdx] = useState(0);

    // Fetch regulations on mount
    const loadLocalRegulations = React.useCallback(async () => {
        try {
            const res = await getAvailableRegulationsAction();
            if (res.success && res.data) {
                setRegulations(res.data);
                setSelectedRegulationIds(prev => prev.length === 0 ? res.data.map(r => r.id) : prev);
            }
        } catch (err) {
            console.error("Failed to load regulations:", err);
        } finally {
            setIsLoadingRegulations(false);
        }
    }, []);

    useEffect(() => {
        loadLocalRegulations();
    }, [loadLocalRegulations]);

    // Toggle regulation selection
    const toggleRegulation = (id: string) => {
        setSelectedRegulationIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Handlers for Search Bar 1: External Search Bot (Gambar 2)
    const handleTriggerExternalSearch = async (overrideQuery?: string) => {
        const q = (overrideQuery !== undefined ? overrideQuery : searchQueryExternal).trim();
        if (!q) {
            setExternalResults([]);
            setExternalSearchMessage(null);
            return;
        }

        setIsSearchingExternal(true);
        setExternalSearchMessage(null);

        try {
            const res = await searchExternalSourcesAction(q, selectedExternalCategory);
            if (res.success) {
                setExternalResults(res.results);
                setAnnasArchiveUrl(res.annasArchiveSearchUrl || null);
                if (res.results.length === 0) {
                    setExternalSearchMessage("Tidak ada hasil eksternal baru yang ditemukan untuk kata kunci ini.");
                }
            } else {
                setExternalSearchMessage(res.error || "Gagal melakukan pencarian eksternal.");
            }
        } catch (err: unknown) {
            setExternalSearchMessage(err instanceof Error ? err.message : "Terjadi kesalahan saat mencari.");
        } finally {
            setIsSearchingExternal(false);
        }
    };

    const handleClearExternalSearch = () => {
        setSearchQueryExternal("");
        setExternalResults([]);
        setExternalSearchMessage(null);
    };

    const handleSelectExternalCategory = (cat: "ALL" | "JDIH" | "JOURNAL" | "BOOK", label: string) => {
        setSelectedExternalCategory(cat);
        setActiveFilterTagExternal(cat === "ALL" ? null : label);
    };

    // Ingest External Source into Local Registry
    const handleIngestSource = async (item: ExternalSourceItem) => {
        setIngestingIds(prev => [...prev, item.id]);
        try {
            const res = await ingestExternalSourceAction(item);
            if (res.success && res.documentId) {
                setExternalResults(prev => prev.map(p => p.id === item.id ? { ...p, isIngested: true } : p));
                const refreshed = await getAvailableRegulationsAction();
                if (refreshed.success && refreshed.data) {
                    setRegulations(refreshed.data);
                    setSelectedRegulationIds(prev => prev.includes(res.documentId!) ? prev : [...prev, res.documentId!]);
                }
                showToast.success("Dokumen Tersimpan ke Bank Data", item.title);
            } else {
                showToast.error("Gagal Menyimpan Dokumen", res.error || "Gagal menyimpan dokumen ke bank data.");
            }
        } catch (err: unknown) {
            showToast.error("Kesalahan Jaringan", err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan dokumen.");
        } finally {
            setIngestingIds(prev => prev.filter(id => id !== item.id));
        }
    };

    // Execute Course Generation
    const handleGenerateCourse = async () => {
        if (!workplaceProblem.trim() || workplaceProblem.trim().length < 20) {
            setGenerationError("Mohon uraikan masalah tempat kerja minimal 20 karakter.");
            return;
        }

        if (selectedRegulationIds.length === 0) {
            setGenerationError("Pilih minimal 1 dokumen sumber rujukan hukum pada Tab 2.");
            return;
        }

        setIsGenerating(true);
        setGenerationError(null);
        setGenerationStep("Menghubungkan ke Gemini & Document Grounding...");

        try {
            const result = await generateOnDemandLearningAction(workplaceProblem);

            if (!result.success || !result.course) {
                setGenerationError(result.error || "Gagal menyintesis materi kursus.");
                setIsGenerating(false);
                return;
            }

            setGeneratedCourse(result.course);
            if (result.course.curriculumMeta?.title) {
                setTitle(result.course.curriculumMeta.title);
            }
            setActiveModuleIdx(0);
        } catch (err: unknown) {
            console.error("Course Generation Error:", err);
            setGenerationError(err instanceof Error ? err.message : "Terjadi kesalahan sistem saat membuat materi.");
        } finally {
            setIsGenerating(false);
            setGenerationStep("");
        }
    };

    // Module Editing Handlers (Tab 4)
    const handleUpdateModuleTitle = (idx: number, newTitle: string) => {
        if (!generatedCourse) return;
        const newModules = [...generatedCourse.modules];
        newModules[idx] = { ...newModules[idx], moduleTitle: newTitle };
        setGeneratedCourse({ ...generatedCourse, modules: newModules });
    };

    const handleUpdateModuleContent = (idx: number, newContent: string) => {
        if (!generatedCourse) return;
        const newModules = [...generatedCourse.modules];
        newModules[idx] = { ...newModules[idx], contentBody: newContent };
        setGeneratedCourse({ ...generatedCourse, modules: newModules });
    };

    const handleUpdateLearningPoint = (moduleIdx: number, pointIdx: number, val: string) => {
        if (!generatedCourse) return;
        const newModules = [...generatedCourse.modules];
        const newPoints = [...newModules[moduleIdx].learningPoints];
        newPoints[pointIdx] = val;
        newModules[moduleIdx] = { ...newModules[moduleIdx], learningPoints: newPoints };
        setGeneratedCourse({ ...generatedCourse, modules: newModules });
    };

    const handleAddLearningPoint = (moduleIdx: number) => {
        if (!generatedCourse) return;
        const newModules = [...generatedCourse.modules];
        newModules[moduleIdx] = {
            ...newModules[moduleIdx],
            learningPoints: [...newModules[moduleIdx].learningPoints, "Indikator kompetensi baru..."]
        };
        setGeneratedCourse({ ...generatedCourse, modules: newModules });
    };

    const handleRemoveLearningPoint = (moduleIdx: number, pointIdx: number) => {
        if (!generatedCourse) return;
        const newModules = [...generatedCourse.modules];
        const newPoints = newModules[moduleIdx].learningPoints.filter((_, i) => i !== pointIdx);
        newModules[moduleIdx] = { ...newModules[moduleIdx], learningPoints: newPoints };
        setGeneratedCourse({ ...generatedCourse, modules: newModules });
    };

    const handleUpdatePitfall = (moduleIdx: number, pitfallIdx: number, val: string) => {
        if (!generatedCourse) return;
        const newModules = [...generatedCourse.modules];
        const newPitfalls = [...newModules[moduleIdx].commonPitfalls];
        newPitfalls[pitfallIdx] = val;
        newModules[moduleIdx] = { ...newModules[moduleIdx], commonPitfalls: newPitfalls };
        setGeneratedCourse({ ...generatedCourse, modules: newModules });
    };

    const handleAddPitfall = (moduleIdx: number) => {
        if (!generatedCourse) return;
        const newModules = [...generatedCourse.modules];
        newModules[moduleIdx] = {
            ...newModules[moduleIdx],
            commonPitfalls: [...newModules[moduleIdx].commonPitfalls, "Fokus materi / titik kritis audit baru..."]
        };
        setGeneratedCourse({ ...generatedCourse, modules: newModules });
    };

    const handleRemovePitfall = (moduleIdx: number, pitfallIdx: number) => {
        if (!generatedCourse) return;
        const newModules = [...generatedCourse.modules];
        const newPitfalls = newModules[moduleIdx].commonPitfalls.filter((_, i) => i !== pitfallIdx);
        newModules[moduleIdx] = { ...newModules[moduleIdx], commonPitfalls: newPitfalls };
        setGeneratedCourse({ ...generatedCourse, modules: newModules });
    };

    const handleUpdateChecklistRow = (rowIdx: number, field: keyof ChecklistCheckpoint, val: string) => {
        if (!generatedCourse?.actionableToolkits) return;
        const newChecklist = [...generatedCourse.actionableToolkits.selfVerificationChecklist];
        newChecklist[rowIdx] = { ...newChecklist[rowIdx], [field]: val };
        setGeneratedCourse({
            ...generatedCourse,
            actionableToolkits: { ...generatedCourse.actionableToolkits, selfVerificationChecklist: newChecklist }
        });
    };

    // Execute Publish
    const handlePublishCourse = async () => {
        if (!generatedCourse) {
            setPublishError("Silakan lakukan sintesis silabus terlebih dahulu.");
            return;
        }

        setIsPublishing(true);
        setPublishError(null);

        try {
            const res = await publishOnDemandCourseAction({
                course: generatedCourse,
                category,
                status: publishStatus
            });

            if (!res.success || !res.courseId) {
                setPublishError(res.error || "Gagal mempublikasikan kursus ke database.");
                return;
            }

            setPublishedResult({
                courseId: res.courseId,
                redirectUrl: res.redirectUrl || `/courses/${res.courseId}`
            });
        } catch (err: unknown) {
            console.error("Publish Error:", err);
            setPublishError(err instanceof Error ? err.message : "Terjadi kesalahan saat mempublikasikan kursus.");
        } finally {
            setIsPublishing(false);
        }
    };

    // Filter & Sort for Search Bar 2 (Local Document Registry from Database)
    const filteredAndSortedRegulations = [...regulations]
        .filter((reg) => {
            const q = localSearchQuery.toLowerCase().trim();
            const matchesSearch = !q ||
                reg.title.toLowerCase().includes(q) ||
                reg.docNumber.toLowerCase().includes(q) ||
                reg.issuer.toLowerCase().includes(q);

            const matchesStatus = localStatusFilter === "ALL" || reg.status === localStatusFilter;

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            if (localSortBy === "year_desc") return b.docYear - a.docYear;
            if (localSortBy === "year_asc") return a.docYear - b.docYear;
            return a.title.localeCompare(b.title);
        });

    const TABS = [
        { id: "identity", label: "1. Identitas", icon: FileText },
        { id: "regulations", label: "2. Dokumen Sumber", icon: ShieldCheck },
        { id: "syllabus", label: "3. Buat Kurikulum", icon: Scale },
        { id: "modules", label: "4. Modul", icon: BookOpen },
        { id: "evaluation", label: "5. Evaluasi Kasus (SJT)", icon: HelpCircle },
        { id: "publish", label: "6. Publikasi ke Kursus", icon: Send }
    ] as const;

    return (
        <div className="space-y-6">
            {/* Top Title Banner */}
            <div className="bg-gradient-to-r from-oxford-950 via-oxford-900 to-oxford-950 text-white rounded-2xl p-6 md:p-8 border border-oxford-800 shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-tight">
                            Buat Kursus
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
                        <Link
                            href={`${basePath}/courses`}
                            className="px-4 py-2.5 rounded-xl border border-oxford-700 hover:bg-oxford-800 text-oxford-300 hover:text-white text-sm font-medium transition-colors"
                        >
                            Kembali ke Daftar
                        </Link>
                    </div>
                </div>

                {/* Progress Tabs Header */}
                <div className="mt-8 pt-6 border-t border-oxford-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const isDone = 
                            (tab.id === "identity" && Boolean(title)) ||
                            (tab.id === "regulations" && selectedRegulationIds.length > 0) ||
                            (tab.id === "syllabus" && Boolean(generatedCourse)) ||
                            (tab.id === "modules" && Boolean(generatedCourse)) ||
                            (tab.id === "evaluation" && Boolean(generatedCourse?.situationalJudgmentQuiz)) ||
                            (tab.id === "publish" && Boolean(publishedResult));

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                                    isActive
                                        ? "bg-gold-500 text-oxford-950 font-bold shadow-md shadow-gold-500/20"
                                        : isDone
                                        ? "bg-oxford-800/80 text-gold-300 hover:bg-oxford-800 border border-gold-500/20"
                                        : "bg-oxford-900/60 text-oxford-400 hover:bg-oxford-800/50 hover:text-oxford-200"
                                }`}
                            >
                                <Icon size={16} className={isActive ? "text-oxford-950" : isDone ? "text-gold-400" : "text-oxford-400"} />
                                <span className="truncate">{tab.label}</span>
                                {isDone && !isActive && <Check size={12} className="ml-auto text-gold-400 shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TAB 1: IDENTITAS & SASARAN */}
            {activeTab === "identity" && (
                <div className="bg-white dark:bg-[#161B2A] rounded-2xl p-6 md:p-8 border border-oxford-200 dark:border-oxford-800 shadow-sm space-y-6">
                    <div className="border-b border-oxford-100 dark:border-oxford-800 pb-4">
                        <h2 className="text-xl font-bold text-oxford-900 dark:text-white flex items-center gap-2">
                            <FileText size={20} className="text-gold-500" />
                            <span>1. Identitas Kursus & Sasaran Kompetensi</span>
                        </h2>
                        <p className="text-sm text-oxford-500 dark:text-oxford-400 mt-1">
                            Tentukan fokus pembelajaran dan target peserta yang akan mengikuti kursus ini.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">
                                Judul Pelatihan / Kursus
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 text-oxford-900 dark:text-white font-medium"
                                placeholder="Contoh: Penyusunan Spesifikasi Teknis & HPS Akuntabel bagi PPK"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">
                                Sasaran Peserta Pelatihan
                            </label>
                            <input
                                type="text"
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                className="w-full px-4 py-3 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 text-oxford-900 dark:text-white"
                                placeholder="Contoh: Pejabat Pembuat Komitmen (PPK), Pokja PBJ"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">
                                Kategori Pelatihan
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-3 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                            >
                                <option value="Pengadaan Barang/Jasa">Pengadaan Barang/Jasa (PBJ)</option>
                                <option value="Keuangan Daerah">Pengelolaan Keuangan Negara / Daerah</option>
                                <option value="Kepemimpinan">Kepemimpinan & Manajerial ASN</option>
                                <option value="Teknologi Informasi">Transformasi Digital & SPBE</option>
                                <option value="Pelayanan Publik">Pelayanan Publik & Etika ASN</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">
                                Tingkat Penguasaan Kompetensi
                            </label>
                            <select
                                value={competencyLevel}
                                onChange={(e) => setCompetencyLevel(e.target.value)}
                                className="w-full px-4 py-3 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                            >
                                <option value="Bloom C3-C4 (Aplikasi & Analisis Kasus)">Bloom C3-C4 (Aplikasi & Analisis Kasus Riil)</option>
                                <option value="Bloom C4-C5 (Evaluasi & Penyelesaian Dilema)">Bloom C4-C5 (Evaluasi & Penyelesaian Dilema Kritis)</option>
                                <option value="Bloom C2-C3 (Pemahaman Konseptual & Prosedur)">Bloom C2-C3 (Pemahaman Konseptual & Prosedural)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-oxford-100 dark:border-oxford-800">
                        <button
                            type="button"
                            onClick={() => setActiveTab("regulations")}
                            className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-xl transition-all shadow-md shadow-gold-500/10 cursor-pointer"
                        >
                            <span>Lanjut ke Dokumen Sumber</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 2: DOKUMEN SUMBER */}
            {activeTab === "regulations" && (
                <div className="bg-white dark:bg-[#161B2A] rounded-2xl p-6 md:p-8 border border-oxford-200 dark:border-oxford-800 shadow-sm space-y-8">
                    <div className="border-b border-oxford-100 dark:border-oxford-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-oxford-900 dark:text-white flex items-center gap-2">
                                <ShieldCheck size={20} className="text-gold-500" />
                                <span>2. Dokumen Sumber</span>
                            </h2>
                            <p className="text-sm text-oxford-500 dark:text-oxford-400 mt-1">
                                Pilih dokumen rujukan hukum dan literatur yang mendasari kursus.
                            </p>
                        </div>

                        <Link
                            href={`${basePath}/regulations`}
                            target="_blank"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oxford-100 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-200 text-xs font-semibold hover:bg-gold-500 hover:text-oxford-950 transition-colors w-fit"
                        >
                            <Database size={14} />
                            <span>Kelola Bank Data & Unggah SOP</span>
                            <ExternalLink size={12} />
                        </Link>
                    </div>

                    {/* SECTION 1: SEARCH BAR 1 - PENCARIAN SUMBER DI INTERNET (Desain Gambar 2) */}
                    <div className="p-6 rounded-2xl bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-oxford-900 dark:text-white flex items-center gap-2">
                                    <Globe size={16} className="text-cyan-600 dark:text-cyan-400" />
                                    <span>Cari Dokumen Sumber di Internet (JDIH se-Indonesia, Jurnal Ilmiah, Buku)</span>
                                </h3>
                                <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-0.5">
                                    Bot crawler mencari naskah peraturan dari portal JDIH, jurnal ilmiah peer-reviewed (Google Scholar/CrossRef), atau katalog buku referensi.
                                </p>
                            </div>
                        </div>

                        {/* Top Search Bar (Gambar 2) */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-xl border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] shadow-sm focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
                            <div className="flex items-center gap-2 flex-1 px-2 py-1">
                                <Search size={18} className="text-oxford-400 dark:text-oxford-500 shrink-0" />

                                {activeFilterTagExternal && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-800 shrink-0">
                                        <span>{activeFilterTagExternal}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectExternalCategory("ALL", "Semua Sumber")}
                                            className="text-cyan-600 hover:text-cyan-900 dark:text-cyan-400 dark:hover:text-cyan-100 p-0.5 rounded cursor-pointer"
                                            title="Hapus filter kategori"
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                )}

                                <input
                                    type="text"
                                    value={searchQueryExternal}
                                    onChange={(e) => setSearchQueryExternal(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleTriggerExternalSearch();
                                        }
                                    }}
                                    placeholder="Ketik kata kunci untuk mencari regulasi JDIH, jurnal ilmiah, atau buku..."
                                    className="flex-1 bg-transparent border-none text-sm text-oxford-900 dark:text-white placeholder-oxford-400 focus:outline-none min-w-[140px]"
                                />

                                {searchQueryExternal && (
                                    <button
                                        type="button"
                                        onClick={handleClearExternalSearch}
                                        className="text-xs font-medium text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-200 px-2 cursor-pointer transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => handleTriggerExternalSearch()}
                                disabled={isSearchingExternal || !searchQueryExternal.trim()}
                                className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-sm shrink-0"
                            >
                                {isSearchingExternal ? (
                                    <>
                                        <Loader2 size={13} className="animate-spin" />
                                        <span>Mencari...</span>
                                    </>
                                ) : (
                                    <>
                                        <Search size={13} />
                                        <span>Cari</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Two-Column Area for Search Bar 1 (Sidebar Kategori & Hasil Temuan Bot) */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-1">
                            {/* Kiri: Filter Kategori Sumber Eksternal */}
                            <div className="md:col-span-4 lg:col-span-3 space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-oxford-900 dark:text-white uppercase tracking-wider mb-2.5">
                                        Kategori Sumber
                                    </h4>
                                    <div className="space-y-2">
                                        {[
                                            { key: "ALL", label: "Semua Sumber" },
                                            { key: "JDIH", label: "JDIH se-Indonesia" },
                                            { key: "JOURNAL", label: "Jurnal Ilmiah (Scholar)" },
                                            { key: "BOOK", label: "Buku Referensi" },
                                        ].map((cat) => {
                                            const isSelected = selectedExternalCategory === cat.key;
                                            return (
                                                <label
                                                    key={cat.key}
                                                    onClick={() => handleSelectExternalCategory(cat.key as "ALL" | "JDIH" | "JOURNAL" | "BOOK", cat.label)}
                                                    className="flex items-center gap-2.5 text-xs text-oxford-700 dark:text-oxford-300 hover:text-oxford-950 dark:hover:text-white cursor-pointer select-none"
                                                >
                                                    <input
                                                        type="radio"
                                                        name="external_category"
                                                        checked={isSelected}
                                                        onChange={() => {}}
                                                        className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 cursor-pointer accent-cyan-600"
                                                    />
                                                    <span className={isSelected ? "font-semibold text-cyan-900 dark:text-cyan-200" : ""}>
                                                        {cat.label}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-800 space-y-1.5 text-xs">
                                    <div className="font-bold text-oxford-900 dark:text-white flex items-center gap-1.5">
                                        <Globe size={13} className="text-cyan-600 dark:text-cyan-400" />
                                        <span>Shadow Archive</span>
                                    </div>
                                    <p className="text-[11px] text-oxford-500 dark:text-oxford-400 leading-relaxed">
                                        Akses repositori buku referensi dan literatur akademik global secara langsung.
                                    </p>
                                    <a
                                        href={annasArchiveUrl || `https://annas-archive.org/search?q=${encodeURIComponent(searchQueryExternal || "pengadaan barang jasa")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline pt-0.5"
                                    >
                                        <span>Buka Anna&apos;s Archive</span>
                                        <ExternalLink size={10} />
                                    </a>
                                </div>
                            </div>

                            {/* Kanan: Hasil Temuan Bot Eksternal */}
                            <div className="md:col-span-8 lg:col-span-9 space-y-3">
                                {externalSearchMessage && (
                                    <div className="p-3 rounded-xl bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-800 text-xs text-oxford-600 dark:text-oxford-300">
                                        {externalSearchMessage}
                                    </div>
                                )}

                                {externalResults.length > 0 ? (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between text-xs text-oxford-500 dark:text-oxford-400">
                                            <span>Hasil Temuan Bot ({externalResults.length} Sumber):</span>
                                            <span className="text-[11px]">Simpan ke dokumen saya untuk dijadikan rujukan</span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto pr-1">
                                            {externalResults.map((item) => {
                                                const isIngesting = ingestingIds.includes(item.id);
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="p-3.5 rounded-xl bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-cyan-500/40 transition-colors"
                                                    >
                                                        <div className="space-y-1 max-w-2xl">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                    item.sourceType === "JDIH"
                                                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                                                        : item.sourceType === "JOURNAL"
                                                                        ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                                                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                                                }`}>
                                                                    {item.sourceType === "JDIH" ? "JDIH Regulasi" : item.sourceType === "JOURNAL" ? "Jurnal Ilmiah" : "Buku Referensi"}
                                                                </span>
                                                                <span className="text-oxford-400 font-medium">
                                                                    {item.year} • {item.authorOrIssuer}
                                                                </span>
                                                            </div>
                                                            <div className="font-bold text-oxford-900 dark:text-white leading-snug">
                                                                {item.title}
                                                            </div>
                                                            {item.description && (
                                                                <p className="text-[11px] text-oxford-500 dark:text-oxford-400 line-clamp-1">
                                                                    {item.description}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                            {item.url && (
                                                                <a
                                                                    href={item.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-2 text-oxford-500 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-lg hover:bg-oxford-100 dark:hover:bg-oxford-800 transition-colors"
                                                                    title="Buka Dokumen Asli"
                                                                >
                                                                    <ExternalLink size={14} />
                                                                </a>
                                                            )}

                                                            {item.isIngested ? (
                                                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                                                                    <Check size={12} />
                                                                    <span>Sudah Dimiliki</span>
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    disabled={isIngesting}
                                                                    onClick={() => handleIngestSource(item)}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                                                                >
                                                                    {isIngesting ? (
                                                                        <>
                                                                            <Loader2 size={12} className="animate-spin" />
                                                                            <span>Menyimpan...</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Plus size={12} />
                                                                            <span>Simpan ke Dokumen Saya</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-xs text-oxford-400 border border-dashed border-oxford-200 dark:border-oxford-800 rounded-xl">
                                        Ketik kata kunci di atas dan tekan <strong>Cari</strong> untuk menemukan regulasi baru dari JDIH se-Indonesia atau jurnal ilmiah.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: SEARCH BAR 2 - DAFTAR DOKUMEN YANG DIMILIKI DI DATABASE (DIKEMBALIKAN) */}
                    <div className="space-y-4 pt-4 border-t border-oxford-100 dark:border-oxford-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-base font-bold text-oxford-900 dark:text-white flex items-center gap-2">
                                    <BookMarked size={18} className="text-gold-500" />
                                    <span>Daftar Dokumen yang Dimiliki ({filteredAndSortedRegulations.length} Dokumen)</span>
                                </h3>
                                <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-0.5">
                                    Pilih dokumen dari database sebagai rujukan kebenaran (*Source of Truth*) saat AI menyusun kurikulum.
                                </p>
                            </div>

                            <div className="text-xs text-oxford-500 dark:text-oxford-400 shrink-0">
                                Dipilih: <strong className="text-gold-600 dark:text-gold-400">{selectedRegulationIds.length}</strong> dokumen sebagai rujukan
                            </div>
                        </div>

                        {/* Search, Filter, Sort Controls for Local Regulations (Search Bar 2) */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-6 relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-oxford-400" />
                                <input
                                    type="text"
                                    value={localSearchQuery}
                                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                                    placeholder="Cari dalam dokumen yang dimiliki..."
                                    className="w-full pl-10 pr-4 py-2 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-xs text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <select
                                    value={localStatusFilter}
                                    onChange={(e) => setLocalStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-xs text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
                                >
                                    <option value="ALL">Semua Status</option>
                                    <option value="ACTIVE">Berlaku (Active)</option>
                                    <option value="AMENDED_PARTIALLY">Diubah Sebagian</option>
                                </select>
                            </div>

                            <div className="sm:col-span-3">
                                <div className="flex items-center gap-1.5">
                                    <ArrowUpDown size={14} className="text-oxford-400 shrink-0" />
                                    <select
                                        value={localSortBy}
                                        onChange={(e) => setLocalSortBy(e.target.value as "year_desc" | "year_asc" | "title_asc")}
                                        className="w-full px-3 py-2 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-xs text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
                                    >
                                        <option value="year_desc">Tahun Terbaru</option>
                                        <option value="year_asc">Tahun Terlama</option>
                                        <option value="title_asc">Judul A-Z</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Local Regulation Cards */}
                        {isLoadingRegulations ? (
                            <div className="p-8 text-center">
                                <Loader2 size={32} className="animate-spin text-gold-500 mx-auto mb-2" />
                                <p className="text-sm text-oxford-500">Memuat bank data dokumen...</p>
                            </div>
                        ) : filteredAndSortedRegulations.length === 0 ? (
                            <div className="p-8 text-center text-oxford-400 border border-dashed border-oxford-200 dark:border-oxford-800 rounded-2xl text-xs">
                                Tidak ada dokumen yang cocok dengan kata kunci pencarian.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {filteredAndSortedRegulations.map((reg) => {
                                    const isSelected = selectedRegulationIds.includes(reg.id);
                                    const isFlagship = reg.id === "perpres-46-2025" || reg.id === "peraturan-lkpp-4-2024";

                                    return (
                                        <div
                                            key={reg.id}
                                            onClick={() => toggleRegulation(reg.id)}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                                                isSelected
                                                    ? "bg-gold-50/40 dark:bg-gold-500/5 border-gold-400 dark:border-gold-500/40 shadow-sm"
                                                    : "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-800 opacity-60 hover:opacity-100"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3.5">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {}}
                                                    className="mt-1 w-4 h-4 rounded text-gold-500 focus:ring-gold-400 cursor-pointer accent-gold-500"
                                                />
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                            reg.status === "ACTIVE"
                                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                                                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                                        }`}>
                                                            {reg.status === "ACTIVE" ? "BERLAKU" : "DIUBAH SEBAGIAN"}
                                                        </span>

                                                        {isFlagship && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                                                                Pemutakhiran Terbaru
                                                            </span>
                                                        )}

                                                        <span className="text-xs text-oxford-400 font-medium">
                                                            Tahun {reg.docYear} • No. {reg.docNumber}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-sm font-bold text-oxford-900 dark:text-white leading-snug">
                                                        {reg.title}
                                                    </h3>
                                                    <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-0.5">
                                                        Penerbit: {reg.issuer}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                                {reg.pdfUrl && (
                                                    <a
                                                        href={reg.pdfUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-oxford-700 dark:text-oxford-300 bg-oxford-100 dark:bg-oxford-800 hover:bg-oxford-200 dark:hover:bg-oxford-700 rounded-lg transition-colors"
                                                    >
                                                        <FileText size={12} />
                                                        <span>Naskah Asli</span>
                                                        <ExternalLink size={10} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between pt-4 border-t border-oxford-100 dark:border-oxford-800">
                        <button
                            type="button"
                            onClick={() => setActiveTab("identity")}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-300 text-sm font-medium hover:bg-oxford-100 dark:hover:bg-oxford-800 cursor-pointer"
                        >
                            <ArrowLeft size={16} />
                            <span>Kembali ke Identitas</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("syllabus")}
                            className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-xl transition-all shadow-md shadow-gold-500/10 cursor-pointer"
                        >
                            <span>Lanjut ke Buat Kurikulum</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 3: BUAT KURIKULUM */}
            {activeTab === "syllabus" && (
                <div className="bg-white dark:bg-[#161B2A] rounded-2xl p-6 md:p-8 border border-oxford-200 dark:border-oxford-800 shadow-sm space-y-6">
                    <div className="border-b border-oxford-100 dark:border-oxford-800 pb-4">
                        <h2 className="text-xl font-bold text-oxford-900 dark:text-white flex items-center gap-2">
                            <Scale size={20} className="text-gold-500" />
                            <span>3. Buat Kurikulum</span>
                        </h2>
                        <p className="text-sm text-oxford-500 dark:text-oxford-400 mt-1">
                            Uraikan tantangan kerja nyata ASN untuk menyintesis modul kurikulum dan kalkulasi jam pelajaran.
                        </p>
                    </div>

                    {/* Workplace Problem Input */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-bold text-oxford-900 dark:text-white">
                                Uraian Masalah Tempat Kerja Riil ASN
                            </label>
                            <button
                                type="button"
                                onClick={() => setWorkplaceProblem(DEFAULT_PROBLEM)}
                                className="text-xs text-gold-600 dark:text-gold-400 font-semibold hover:underline cursor-pointer"
                            >
                                Gunakan Contoh Kasus PPK PBJ
                            </button>
                        </div>
                        <textarea
                            rows={4}
                            value={workplaceProblem}
                            onChange={(e) => setWorkplaceProblem(e.target.value)}
                            className="w-full p-4 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 text-oxford-900 dark:text-white leading-relaxed font-sans"
                            placeholder="Saya baru ditunjuk sebagai Pejabat Pembuat Komitmen (PPK) dan harus menyusun Harga Perkiraan Sendiri (HPS) serta dokumen spesifikasi teknis pengadaan barang/jasa di instansi daerah agar akuntabel, tidak terjadi penguncian merek yang melanggar hukum, dan sesuai dengan Perpres PBJ terbaru (Perpres 46/2025 jo. Perpres 16/2018 jo. 12/2021 serta Perka LKPP 4/2024)."
                        />
                    </div>

                    {/* Action Button: Diposisikan ke Kanan */}
                    <div className="flex justify-end items-center gap-4">
                        {isGenerating && (
                            <span className="text-xs text-oxford-500 dark:text-oxford-400 animate-pulse">
                                {generationStep}
                            </span>
                        )}

                        <button
                            type="button"
                            onClick={handleGenerateCourse}
                            disabled={isGenerating}
                            className="flex items-center justify-center gap-3 px-8 py-3.5 bg-gradient-to-r from-oxford-950 via-oxford-900 to-oxford-950 text-white font-bold rounded-xl border border-gold-500/50 hover:border-gold-400 shadow-xl shadow-oxford-950/20 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={18} className="animate-spin text-gold-400" />
                                    <span>Memproses</span>
                                </>
                            ) : (
                                <>
                                    <Cpu size={18} className="text-gold-400 group-hover:rotate-12 transition-transform" />
                                    <span>Buat</span>
                                </>
                            )}
                        </button>
                    </div>

                    {generationError && (
                        <div className="p-4 rounded-xl bg-crimson-50 dark:bg-crimson-950/40 border border-crimson-200 dark:border-crimson-800 text-crimson-800 dark:text-crimson-300 text-sm flex items-center gap-3">
                            <AlertTriangle size={20} className="shrink-0" />
                            <span>{generationError}</span>
                        </div>
                    )}

                    {/* Dynamic JP Calculator Results Card */}
                    {generatedCourse && (
                        <div className="space-y-6 pt-4 border-t border-oxford-100 dark:border-oxford-800 animate-fadeIn">
                            {/* JP Metric Box (Tanpa Banner 'Hasil Kalkulasi Dinamis Standar LAN RI') */}
                            <div className="bg-gradient-to-br from-oxford-900 to-oxford-950 text-white p-6 rounded-2xl border border-gold-500/30 shadow-lg relative overflow-hidden">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <h3 className="text-xl md:text-2xl font-serif font-bold text-white">
                                            {generatedCourse.curriculumMeta.title}
                                        </h3>
                                        <p className="text-sm text-oxford-300 mt-1">
                                            Sasaran: <strong>{generatedCourse.curriculumMeta.targetAudience}</strong> • Kompetensi: <strong>{generatedCourse.curriculumMeta.competencyLevel}</strong>
                                        </p>
                                    </div>

                                    {/* Big JP Badge */}
                                    <div className="bg-oxford-800/80 p-4 rounded-xl border border-gold-500/40 text-center shrink-0 min-w-[180px]">
                                        <div className="text-3xl md:text-4xl font-serif font-black text-gold-400">
                                            {generatedCourse.curriculumMeta.equivalentJp} JP
                                        </div>
                                        <div className="text-xs text-oxford-300 font-medium mt-1">
                                            Ekuivalensi Pembelajaran
                                        </div>
                                        <div className="text-[11px] text-oxford-400 mt-0.5">
                                            ({generatedCourse.curriculumMeta.estimatedDurationMinutes} Menit Efektif)
                                        </div>
                                    </div>
                                </div>

                                {/* JP Breakdown Metric Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-oxford-800">
                                    <div className="bg-oxford-950/60 p-3 rounded-lg border border-oxford-800">
                                        <div className="text-xs text-oxford-400">Durasi Baca & Bedah Modul</div>
                                        <div className="text-base font-bold text-white mt-1">
                                            {generatedCourse.modules.length} Modul Terapan
                                        </div>
                                    </div>
                                    <div className="bg-oxford-950/60 p-3 rounded-lg border border-oxford-800">
                                        <div className="text-xs text-oxford-400">Verifikasi Checklist SOP</div>
                                        <div className="text-base font-bold text-white mt-1">
                                            {generatedCourse.actionableToolkits?.selfVerificationChecklist?.length || 4} Checkpoint Kritis
                                        </div>
                                    </div>
                                    <div className="bg-oxford-950/60 p-3 rounded-lg border border-oxford-800">
                                        <div className="text-xs text-oxford-400">Simulasi Kertas Kerja HPS</div>
                                        <div className="text-base font-bold text-white mt-1">
                                            {generatedCourse.actionableToolkits?.hpsWorksheetStructure?.components?.length || 5} Komponen Biaya
                                        </div>
                                    </div>
                                    <div className="bg-oxford-950/60 p-3 rounded-lg border border-oxford-800">
                                        <div className="text-xs text-oxford-400">Uji Situasional (SJT)</div>
                                        <div className="text-base font-bold text-white mt-1">
                                            {generatedCourse.situationalJudgmentQuiz?.length || 3} Kasus Dilema C3-C4
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Learning Objectives & Sources Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Objectives */}
                                <div className="p-5 rounded-xl border border-oxford-200 dark:border-oxford-800 bg-oxford-50/50 dark:bg-oxford-950">
                                    <h4 className="text-sm font-bold text-oxford-900 dark:text-white flex items-center gap-2 mb-3">
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                        <span>Tujuan Pembelajaran (Bloom C3-C4)</span>
                                    </h4>
                                    <ul className="space-y-2 text-xs md:text-sm text-oxford-700 dark:text-oxford-300">
                                        {generatedCourse.curriculumMeta.learningObjectives.map((obj, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="font-bold text-gold-600 dark:text-gold-400">{i + 1}.</span>
                                                <span>{obj}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Sources (Menggantikan Jangkar Regulasi Terverifikasi) */}
                                <div className="p-5 rounded-xl border border-oxford-200 dark:border-oxford-800 bg-oxford-50/50 dark:bg-oxford-950">
                                    <h4 className="text-sm font-bold text-oxford-900 dark:text-white flex items-center gap-2 mb-3">
                                        <ShieldCheck size={16} className="text-blue-500" />
                                        <span>Sumber</span>
                                    </h4>
                                    <div className="space-y-3">
                                        {generatedCourse.curriculumMeta.regulatoryGrounding.map((ground, i) => (
                                            <div key={i} className="text-xs bg-white dark:bg-[#161B2A] p-3 rounded-lg border border-oxford-200 dark:border-oxford-800">
                                                <div className="font-bold text-oxford-900 dark:text-white">{ground.regulation}</div>
                                                <div className="text-gold-600 dark:text-gold-400 font-semibold mt-0.5">{ground.relevantArticles}</div>
                                                <div className="text-oxford-500 dark:text-oxford-400 mt-1">{ground.relevanceExplanation}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between pt-4 border-t border-oxford-100 dark:border-oxford-800">
                        <button
                            type="button"
                            onClick={() => setActiveTab("regulations")}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-300 text-sm font-medium hover:bg-oxford-100 dark:hover:bg-oxford-800 cursor-pointer"
                        >
                            <ArrowLeft size={16} />
                            <span>Kembali ke Dokumen Sumber</span>
                        </button>

                        <button
                            type="button"
                            disabled={!generatedCourse}
                            onClick={() => setActiveTab("modules")}
                            className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-xl transition-all shadow-md shadow-gold-500/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <span>Lanjut ke Modul</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 4: MODUL */}
            {activeTab === "modules" && (
                <div className="bg-white dark:bg-[#161B2A] rounded-2xl p-6 md:p-8 border border-oxford-200 dark:border-oxford-800 shadow-sm space-y-6">
                    <div className="border-b border-oxford-100 dark:border-oxford-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-bold text-oxford-900 dark:text-white flex items-center gap-2">
                                <BookOpen size={20} className="text-gold-500" />
                                <span>4. Modul</span>
                            </h2>
                        </div>

                        {generatedCourse && (
                            <button
                                type="button"
                                onClick={() => setIsEditingModules(!isEditingModules)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isEditingModules
                                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                                        : "bg-oxford-100 dark:bg-oxford-800 text-oxford-800 dark:text-oxford-200 hover:bg-gold-500 hover:text-oxford-950"
                                }`}
                            >
                                <Edit3 size={14} />
                                <span>{isEditingModules ? "Selesai Mengedit" : "Edit Konten Modul"}</span>
                            </button>
                        )}
                    </div>

                    {!generatedCourse ? (
                        <div className="p-8 text-center text-oxford-400">
                            Silakan lakukan sintesis kurikulum pada Tab 3 terlebih dahulu.
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Module Selector Tabs */}
                            <div className="flex flex-wrap gap-2 border-b border-oxford-200 dark:border-oxford-800 pb-3">
                                {generatedCourse.modules.map((m, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveModuleIdx(idx)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            activeModuleIdx === idx
                                                ? "bg-oxford-950 text-gold-400 dark:bg-gold-500 dark:text-oxford-950 shadow-sm"
                                                : "bg-oxford-100 dark:bg-oxford-900 text-oxford-600 dark:text-oxford-400 hover:bg-oxford-200"
                                        }`}
                                    >
                                        Modul {m.moduleOrder}: {m.moduleTitle}
                                    </button>
                                ))}
                            </div>

                            {/* Active Module Body */}
                            {generatedCourse.modules[activeModuleIdx] && (
                                <div className="space-y-6 bg-oxford-50/60 dark:bg-oxford-950 p-6 rounded-2xl border border-oxford-200 dark:border-oxford-800">
                                    <div>
                                        <div className="text-xs font-bold text-gold-600 dark:text-gold-400 uppercase tracking-wider">
                                            Modul {generatedCourse.modules[activeModuleIdx].moduleOrder}
                                        </div>

                                        {isEditingModules ? (
                                            <input
                                                type="text"
                                                value={generatedCourse.modules[activeModuleIdx].moduleTitle}
                                                onChange={(e) => handleUpdateModuleTitle(activeModuleIdx, e.target.value)}
                                                className="w-full px-3 py-2 mt-1 bg-white dark:bg-[#161B2A] border border-gold-500 rounded-xl text-lg font-bold text-oxford-900 dark:text-white"
                                            />
                                        ) : (
                                            <h3 className="text-xl font-bold text-oxford-900 dark:text-white mt-1">
                                                {generatedCourse.modules[activeModuleIdx].moduleTitle}
                                            </h3>
                                        )}
                                    </div>

                                    {/* Narrative Content */}
                                    <div className="bg-white dark:bg-[#161B2A] p-6 rounded-xl border border-oxford-200 dark:border-oxford-800 space-y-2">
                                        <h4 className="text-sm font-bold text-oxford-900 dark:text-white">
                                            Narasi Instruksional
                                        </h4>
                                        {isEditingModules ? (
                                            <textarea
                                                rows={8}
                                                value={generatedCourse.modules[activeModuleIdx].contentBody}
                                                onChange={(e) => handleUpdateModuleContent(activeModuleIdx, e.target.value)}
                                                className="w-full p-3 bg-oxford-50 dark:bg-oxford-950 border border-gold-500 rounded-xl text-xs leading-relaxed text-oxford-900 dark:text-white font-sans"
                                            />
                                        ) : (
                                            <div className="text-sm text-oxford-700 dark:text-oxford-300 leading-relaxed whitespace-pre-line">
                                                {generatedCourse.modules[activeModuleIdx].contentBody}
                                            </div>
                                        )}
                                    </div>

                                    {/* Indikator Kompetensi & Fokus Materi */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Indikator Kompetensi */}
                                        <div className="bg-white dark:bg-[#161B2A] p-5 rounded-xl border border-oxford-200 dark:border-oxford-800 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    <CheckCircle2 size={16} />
                                                    <span>Indikator Kompetensi</span>
                                                </h4>
                                                {isEditingModules && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddLearningPoint(activeModuleIdx)}
                                                        className="text-[11px] text-emerald-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <Plus size={12} /> Tambah
                                                    </button>
                                                )}
                                            </div>
                                            <ul className="space-y-2 text-xs text-oxford-700 dark:text-oxford-300">
                                                {generatedCourse.modules[activeModuleIdx].learningPoints.map((pt, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <span className="text-emerald-500 font-bold mt-1">•</span>
                                                        {isEditingModules ? (
                                                            <div className="flex-1 flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={pt}
                                                                    onChange={(e) => handleUpdateLearningPoint(activeModuleIdx, i, e.target.value)}
                                                                    className="flex-1 px-2 py-1 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded text-xs text-oxford-900 dark:text-white"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveLearningPoint(activeModuleIdx, i)}
                                                                    className="text-crimson-500 hover:text-crimson-700"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span>{pt}</span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Fokus materi */}
                                        <div className="bg-white dark:bg-[#161B2A] p-5 rounded-xl border border-oxford-200 dark:border-oxford-800 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    <AlertTriangle size={16} />
                                                    <span>Fokus materi</span>
                                                </h4>
                                                {isEditingModules && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddPitfall(activeModuleIdx)}
                                                        className="text-[11px] text-amber-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <Plus size={12} /> Tambah
                                                    </button>
                                                )}
                                            </div>
                                            <ul className="space-y-2 text-xs text-oxford-700 dark:text-oxford-300">
                                                {generatedCourse.modules[activeModuleIdx].commonPitfalls.map((pf, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <span className="text-amber-500 font-bold mt-1">⚠️</span>
                                                        {isEditingModules ? (
                                                            <div className="flex-1 flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={pf}
                                                                    onChange={(e) => handleUpdatePitfall(activeModuleIdx, i, e.target.value)}
                                                                    className="flex-1 px-2 py-1 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded text-xs text-oxford-900 dark:text-white"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemovePitfall(activeModuleIdx, i)}
                                                                    className="text-crimson-500 hover:text-crimson-700"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span>{pf}</span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section: Actionable Toolkits Preview (Checklist Verifikasi Mandiri SOP) */}
                            {generatedCourse.actionableToolkits && (
                                <div className="space-y-4 pt-6 border-t border-oxford-200 dark:border-oxford-800">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <CheckSquare size={20} className="text-gold-500" />
                                            <h3 className="text-lg font-bold text-oxford-900 dark:text-white">
                                                Actionable Toolkits: Checklist Verifikasi Mandiri (SOP)
                                            </h3>
                                        </div>
                                        <span className="text-xs text-oxford-400">
                                            Instrumen kertas kerja kepatuhan mandiri bagi pejabat teknis ASN
                                        </span>
                                    </div>

                                    <div className="overflow-x-auto rounded-xl border border-oxford-200 dark:border-oxford-800">
                                        <table className="w-full text-left text-xs text-oxford-800 dark:text-oxford-200">
                                            <thead className="bg-oxford-100 dark:bg-oxford-950 font-bold uppercase text-[10px] text-oxford-600 dark:text-oxford-400">
                                                <tr>
                                                    <th className="p-3">No</th>
                                                    <th className="p-3">Checkpoint SOP</th>
                                                    <th className="p-3">Dasar Regulasi</th>
                                                    <th className="p-3">Metode Verifikasi</th>
                                                    <th className="p-3">Risiko Pelanggaran</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-oxford-200 dark:divide-oxford-800 bg-white dark:bg-[#161B2A]">
                                                {generatedCourse.actionableToolkits.selfVerificationChecklist.map((c, i) => (
                                                    <tr key={i} className="hover:bg-oxford-50 dark:hover:bg-oxford-900/40">
                                                        <td className="p-3 font-bold">{i + 1}</td>
                                                        <td className="p-3 font-semibold text-oxford-900 dark:text-white">
                                                            {isEditingModules ? (
                                                                <input
                                                                    type="text"
                                                                    value={c.checkpoint}
                                                                    onChange={(e) => handleUpdateChecklistRow(i, "checkpoint", e.target.value)}
                                                                    className="w-full px-2 py-1 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded"
                                                                />
                                                            ) : (
                                                                c.checkpoint
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-blue-600 dark:text-blue-400 font-medium">
                                                            {isEditingModules ? (
                                                                <input
                                                                    type="text"
                                                                    value={c.regulatoryBasis}
                                                                    onChange={(e) => handleUpdateChecklistRow(i, "regulatoryBasis", e.target.value)}
                                                                    className="w-full px-2 py-1 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded"
                                                                />
                                                            ) : (
                                                                c.regulatoryBasis
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            {isEditingModules ? (
                                                                <input
                                                                    type="text"
                                                                    value={c.verificationMethod}
                                                                    onChange={(e) => handleUpdateChecklistRow(i, "verificationMethod", e.target.value)}
                                                                    className="w-full px-2 py-1 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded"
                                                                />
                                                            ) : (
                                                                c.verificationMethod
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-crimson-600 dark:text-crimson-400 font-medium">
                                                            {isEditingModules ? (
                                                                <input
                                                                    type="text"
                                                                    value={c.riskIfNotCompliant}
                                                                    onChange={(e) => handleUpdateChecklistRow(i, "riskIfNotCompliant", e.target.value)}
                                                                    className="w-full px-2 py-1 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded"
                                                                />
                                                            ) : (
                                                                c.riskIfNotCompliant
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between pt-4 border-t border-oxford-100 dark:border-oxford-800">
                        <button
                            type="button"
                            onClick={() => setActiveTab("syllabus")}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-300 text-sm font-medium hover:bg-oxford-100 dark:hover:bg-oxford-800 cursor-pointer"
                        >
                            <ArrowLeft size={16} />
                            <span>Kembali ke Buat Kurikulum</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("evaluation")}
                            className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-xl transition-all shadow-md shadow-gold-500/10 cursor-pointer"
                        >
                            <span>Lanjut ke Evaluasi Kasus (SJT)</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 5: EVALUASI KASUS (SITUATIONAL JUDGMENT TEST) */}
            {activeTab === "evaluation" && (
                <div className="bg-white dark:bg-[#161B2A] rounded-2xl p-6 md:p-8 border border-oxford-200 dark:border-oxford-800 shadow-sm space-y-6">
                    <div className="border-b border-oxford-100 dark:border-oxford-800 pb-4">
                        <h2 className="text-xl font-bold text-oxford-900 dark:text-white flex items-center gap-2">
                            <HelpCircle size={20} className="text-gold-500" />
                            <span>5. Evaluasi Kasus: Situational Judgment Test (SJT)</span>
                        </h2>
                        <p className="text-sm text-oxford-500 dark:text-oxford-400 mt-1">
                            Uji keputusan profesional ASN dalam skenario dilema riil (Taksonomi Bloom C3-C4).
                        </p>
                    </div>

                    {!generatedCourse?.situationalJudgmentQuiz ? (
                        <div className="p-8 text-center text-oxford-400">
                            Silakan lakukan sintesis kurikulum pada Tab 3 terlebih dahulu.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {generatedCourse.situationalJudgmentQuiz.map((quiz, qIdx) => (
                                <div
                                    key={qIdx}
                                    className="p-6 rounded-2xl border border-oxford-200 dark:border-oxford-800 bg-oxford-50/50 dark:bg-oxford-950 space-y-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold px-2.5 py-1 rounded bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/20">
                                            Kasus Kasuistik {quiz.questionNumber || qIdx + 1}
                                        </span>
                                        <span className="text-xs text-oxford-400">
                                            Rujukan: <strong>{quiz.regulatoryReference}</strong>
                                        </span>
                                    </div>

                                    {/* Scenario */}
                                    <div className="p-4 bg-white dark:bg-[#161B2A] rounded-xl border border-oxford-200 dark:border-oxford-800 text-sm text-oxford-800 dark:text-oxford-200 leading-relaxed">
                                        <p className="font-semibold text-oxford-900 dark:text-white mb-1">Skenario Dilema Tempat Kerja:</p>
                                        <p>{quiz.scenario}</p>
                                    </div>

                                    {/* Options */}
                                    <div className="space-y-2">
                                        {quiz.options.map((opt) => (
                                            <div
                                                key={opt.key}
                                                className={`p-3 rounded-xl border text-xs flex items-start gap-3 ${
                                                    opt.isCorrect
                                                        ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                                                        : "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-800"
                                                }`}
                                            >
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                                    opt.isCorrect
                                                        ? "bg-emerald-600 text-white"
                                                        : "bg-oxford-100 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-300"
                                                }`}>
                                                    {opt.key}
                                                </span>
                                                <div className="space-y-1">
                                                    <p className="font-medium text-oxford-900 dark:text-white">{opt.text}</p>
                                                    {opt.isCorrect && (
                                                        <p className="text-emerald-700 dark:text-emerald-300 text-[11px] font-medium pt-1">
                                                            <strong>Analisis Akuntabilitas:</strong> {opt.reasoning}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Takeaway */}
                                    {quiz.keyTakeaway && (
                                        <div className="p-3 bg-white dark:bg-[#161B2A] rounded-xl border border-oxford-200 dark:border-oxford-800 text-xs text-oxford-600 dark:text-oxford-300 flex items-center gap-2">
                                            <span className="font-bold text-gold-500">Intisari Akuntabilitas:</span>
                                            <span>{quiz.keyTakeaway}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between pt-4 border-t border-oxford-100 dark:border-oxford-800">
                        <button
                            type="button"
                            onClick={() => setActiveTab("modules")}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-300 text-sm font-medium hover:bg-oxford-100 dark:hover:bg-oxford-800 cursor-pointer"
                        >
                            <ArrowLeft size={16} />
                            <span>Kembali ke Modul</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("publish")}
                            className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-xl transition-all shadow-md shadow-gold-500/10 cursor-pointer"
                        >
                            <span>Lanjut ke Publikasi</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 6: PUBLIKASI KE KATALOG KURSUS */}
            {activeTab === "publish" && (
                <div className="bg-white dark:bg-[#161B2A] rounded-2xl p-6 md:p-8 border border-oxford-200 dark:border-oxford-800 shadow-sm space-y-6">
                    <div className="border-b border-oxford-100 dark:border-oxford-800 pb-4">
                        <h2 className="text-xl font-bold text-oxford-900 dark:text-white flex items-center gap-2">
                            <Send size={20} className="text-gold-500" />
                            <span>6. Publikasi ke Katalog Kursus</span>
                        </h2>
                        <p className="text-sm text-oxford-500 dark:text-oxford-400 mt-1">
                            Periksa kembali ringkasan kursus. Setelah diterbitkan, kursus akan langsung tampil di menu <strong>Kursus</strong>.
                        </p>
                    </div>

                    {!generatedCourse ? (
                        <div className="p-8 text-center text-oxford-400">
                            Silakan lakukan sintesis kurikulum pada Tab 3 terlebih dahulu.
                        </div>
                    ) : publishedResult ? (
                        /* Published Success State */
                        <div className="p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-center space-y-4 animate-fadeIn">
                            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                                <Check size={32} />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-emerald-950 dark:text-emerald-100">
                                Kursus Berhasil Diterbitkan ke Katalog!
                            </h3>
                            <p className="text-sm text-emerald-800 dark:text-emerald-300 max-w-lg mx-auto">
                                Kursus Anda telah terdaftar di database dengan ekuivalensi <strong>{generatedCourse.curriculumMeta.equivalentJp} JP</strong> dan langsung dapat diakses oleh seluruh ASN melalui Menu Kursus.
                            </p>

                            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                                <Link
                                    href={publishedResult.redirectUrl}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-md"
                                >
                                    <Eye size={16} />
                                    <span>Buka Halaman Kursus</span>
                                </Link>

                                <Link
                                    href="/search"
                                    className="flex items-center gap-2 px-6 py-3 bg-oxford-950 hover:bg-oxford-900 text-gold-400 font-bold rounded-xl border border-gold-500/30 transition-all"
                                >
                                    <BookOpen size={16} />
                                    <span>Lihat di Menu Kursus</span>
                                </Link>

                                <Link
                                    href={`${basePath}/courses`}
                                    className="px-5 py-3 rounded-xl border border-oxford-300 dark:border-oxford-700 text-oxford-700 dark:text-oxford-300 font-medium hover:bg-oxford-100 dark:hover:bg-oxford-800"
                                >
                                    Kembali ke Kelola Kursus
                                </Link>
                            </div>
                        </div>
                    ) : (
                        /* Pre-Publish Review Summary: RANCANGAN KURIKULUM LEBIH DETAIL */
                        <div className="space-y-6">
                            {/* Summary Header Card */}
                            <div className="p-6 rounded-2xl border border-oxford-200 dark:border-oxford-800 bg-oxford-50/50 dark:bg-oxford-950 space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-oxford-200 dark:border-oxford-800 pb-4">
                                    <div>
                                        <span className="text-xs font-bold text-gold-600 dark:text-gold-400 uppercase tracking-wider">
                                            Rancangan Kurikulum Siap Terbit
                                        </span>
                                        <h3 className="text-xl font-bold text-oxford-900 dark:text-white mt-0.5">
                                            {title}
                                        </h3>
                                        <p className="text-xs text-oxford-500 mt-1">
                                            Sasaran: <strong>{targetAudience}</strong> • Kategori: <strong>{category}</strong> • Tingkat: <strong>{competencyLevel}</strong>
                                        </p>
                                    </div>

                                    <div className="bg-white dark:bg-[#161B2A] px-5 py-3 rounded-xl border border-oxford-200 dark:border-oxford-800 text-center shrink-0">
                                        <div className="text-2xl font-black text-gold-600 dark:text-gold-400">
                                            {generatedCourse.curriculumMeta.equivalentJp} JP
                                        </div>
                                        <div className="text-[11px] text-oxford-500 font-medium">
                                            ({generatedCourse.curriculumMeta.estimatedDurationMinutes} Menit Efektif)
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Breakdown: Modules & Curriculum Structure */}
                                <div className="space-y-3 pt-2">
                                    <h4 className="text-xs font-bold text-oxford-700 dark:text-oxford-300 uppercase tracking-wider">
                                        Struktur Silabus & Modul Pembelajaran ({generatedCourse.modules.length} Modul)
                                    </h4>
                                    <div className="space-y-3">
                                        {generatedCourse.modules.map((m, idx) => (
                                            <div
                                                key={idx}
                                                className="p-4 rounded-xl bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-800 space-y-2 text-xs"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="font-bold text-oxford-900 dark:text-white text-sm">
                                                        Modul {m.moduleOrder}: {m.moduleTitle}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded bg-oxford-100 dark:bg-oxford-800 text-oxford-600 dark:text-oxford-400 text-[11px]">
                                                        {Math.round(generatedCourse.curriculumMeta.estimatedDurationMinutes / generatedCourse.modules.length)} Menit Belajar
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
                                                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                                                        <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                                                            Indikator Kompetensi ({m.learningPoints.length}):
                                                        </span>
                                                        <ul className="space-y-1 text-oxford-600 dark:text-oxford-300">
                                                            {m.learningPoints.map((pt, pIdx) => (
                                                                <li key={pIdx}>• {pt}</li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div className="bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/50">
                                                        <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">
                                                            Fokus materi & Mitigasi Risiko ({m.commonPitfalls.length}):
                                                        </span>
                                                        <ul className="space-y-1 text-oxford-600 dark:text-oxford-300">
                                                            {m.commonPitfalls.map((pf, pfIdx) => (
                                                                <li key={pfIdx}>⚠️ {pf}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Detailed Breakdown: SOP Toolkits & SJT */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div className="p-4 bg-white dark:bg-[#161B2A] rounded-xl border border-oxford-200 dark:border-oxford-800 space-y-1.5 text-xs">
                                        <span className="font-bold text-oxford-900 dark:text-white flex items-center gap-1.5">
                                            <CheckSquare size={14} className="text-gold-500" />
                                            <span>Instrumen Kertas Kerja & SOP</span>
                                        </span>
                                        <p className="text-oxford-500">
                                            Tersedia <strong>{generatedCourse.actionableToolkits?.selfVerificationChecklist?.length || 4} Checkpoint</strong> verifikasi mandiri kepatuhan prosedur dan lembar kerja teknis.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-white dark:bg-[#161B2A] rounded-xl border border-oxford-200 dark:border-oxford-800 space-y-1.5 text-xs">
                                        <span className="font-bold text-oxford-900 dark:text-white flex items-center gap-1.5">
                                            <HelpCircle size={14} className="text-gold-500" />
                                            <span>Instrumen Evaluasi Kasuistik (SJT)</span>
                                        </span>
                                        <p className="text-oxford-500">
                                            Tersedia <strong>{generatedCourse.situationalJudgmentQuiz?.length || 3} Skenario Kasus</strong> dilema nyata berstandar Taksonomi Bloom C3-C4.
                                        </p>
                                    </div>
                                </div>

                                {/* Sources Grounding List */}
                                <div className="pt-2 text-xs">
                                    <span className="font-bold text-oxford-700 dark:text-oxford-300 block mb-1">
                                        Dokumen Sumber / Regulasi Rujukan:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {generatedCourse.curriculumMeta.regulatoryGrounding.map((r, i) => (
                                            <span
                                                key={i}
                                                className="px-2.5 py-1 rounded bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-800 text-oxford-700 dark:text-oxford-300 text-[11px]"
                                            >
                                                {r.regulation} {r.relevantArticles ? `(${r.relevantArticles})` : ""}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Status Selection */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-oxford-900 dark:text-white">
                                    Status Penerbitan
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div
                                        onClick={() => setPublishStatus("active")}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                            publishStatus === "active"
                                                ? "bg-gold-50/50 dark:bg-gold-500/10 border-gold-500"
                                                : "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-800"
                                        }`}
                                    >
                                        <div className="font-bold text-sm text-oxford-900 dark:text-white flex items-center justify-between">
                                            <span>Terbitkan Langsung (Active)</span>
                                            {publishStatus === "active" && <CheckCircle2 size={16} className="text-gold-500" />}
                                        </div>
                                        <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-1">
                                            Kursus langsung dapat dilihat di katalog umum dan siap diikuti ASN.
                                        </p>
                                    </div>

                                    <div
                                        onClick={() => setPublishStatus("draft")}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                            publishStatus === "draft"
                                                ? "bg-gold-50/50 dark:bg-gold-500/10 border-gold-500"
                                                : "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-800"
                                        }`}
                                    >
                                        <div className="font-bold text-sm text-oxford-900 dark:text-white flex items-center justify-between">
                                            <span>Simpan Sebagai Draf</span>
                                            {publishStatus === "draft" && <CheckCircle2 size={16} className="text-gold-500" />}
                                        </div>
                                        <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-1">
                                            Hanya terlihat oleh Anda di dashboard instruktur untuk revisi lebih lanjut.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {publishError && (
                                <div className="p-4 rounded-xl bg-crimson-50 dark:bg-crimson-950/40 border border-crimson-200 dark:border-crimson-800 text-crimson-800 dark:text-crimson-300 text-sm flex items-center gap-3">
                                    <AlertTriangle size={20} className="shrink-0" />
                                    <span>{publishError}</span>
                                </div>
                            )}

                            {/* Publish Action Button */}
                            <div className="pt-4 border-t border-oxford-100 dark:border-oxford-800 flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("evaluation")}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-300 text-sm font-medium hover:bg-oxford-100 dark:hover:bg-oxford-800 cursor-pointer"
                                >
                                    <ArrowLeft size={16} />
                                    <span>Kembali ke Evaluasi</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handlePublishCourse}
                                    disabled={isPublishing}
                                    className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isPublishing ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin text-white" />
                                            <span>Menerbitkan ke Database...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            <span>Terbitkan ke Katalog Kursus Sekarang</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
