"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    Database,
    Search,
    Plus,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    FileText,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Trash2,
    ArrowLeft,
    Globe
} from "lucide-react";
import {
    getRegistryDocumentsWithStatsAction,
    crawlAndSyncBpkAction,
    createManualDocumentAction,
    deleteRegistryDocumentAction,
    RegistryDocumentItem,
    RegistryStats
} from "@/app/actions/regulations";
import { RegulationStatus } from "@/lib/regulatory-registry";
import { showToast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface RegulationRegistryManagerProps {
    basePath?: string;
}

export default function RegulationRegistryManager({ basePath = "/instructor" }: RegulationRegistryManagerProps) {
    const [documents, setDocuments] = useState<RegistryDocumentItem[]>([]);
    const [stats, setStats] = useState<RegistryStats>({
        totalDocuments: 0,
        activeCount: 0,
        amendedCount: 0,
        repealedCount: 0,
        totalArticles: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    
    // Modal states
    const [showCrawlerModal, setShowCrawlerModal] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
    const [docPendingDelete, setDocPendingDelete] = useState<{ id: string; title: string } | null>(null);
    const [isDeletingDoc, setIsDeletingDoc] = useState(false);

    // Form states: Auto Crawler
    const [crawlerUrl, setCrawlerUrl] = useState("");
    const [isCrawling, setIsCrawling] = useState(false);
    const [crawlerMessage, setCrawlerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Form states: Manual Document
    const [manualForm, setManualForm] = useState({
        docType: "SOP_INSTANSI",
        docNumber: "01",
        docYear: new Date().getFullYear(),
        title: "",
        issuer: "Pemerintah Daerah / BPSDM",
        status: "ACTIVE" as RegulationStatus,
        effectiveDate: new Date().toISOString().split("T")[0],
        pdfUrl: "",
        abstract: "",
        articleNumber: "Pasal 1",
        articleTitle: "Ketentuan Umum",
        articleSubstance: ""
    });
    const [isSavingManual, setIsSavingManual] = useState(false);
    const [manualMessage, setManualMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Load data
    const loadDocuments = async () => {
        setIsLoading(true);
        try {
            const res = await getRegistryDocumentsWithStatsAction();
            if (res.success && res.documents) {
                setDocuments(res.documents);
                setStats(res.stats);
            }
        } catch (err) {
            console.error("Failed to load registry documents:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDocuments();
    }, []);

    // Handle Crawl & Sync
    const handleCrawl = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!crawlerUrl.trim()) return;

        setIsCrawling(true);
        setCrawlerMessage(null);

        try {
            const res = await crawlAndSyncBpkAction(crawlerUrl.trim());
            if (res.success) {
                setCrawlerMessage({
                    type: "success",
                    text: `Dokumen "${res.title}" berhasil ditarik dan disinkronkan ke Document Registry.`
                });
                setCrawlerUrl("");
                await loadDocuments();
            } else {
                setCrawlerMessage({
                    type: "error",
                    text: res.error || "Gagal menarik data dari portal BPK."
                });
            }
        } catch (err: unknown) {
            setCrawlerMessage({
                type: "error",
                text: err instanceof Error ? err.message : "Terjadi kesalahan saat crawling."
            });
        } finally {
            setIsCrawling(false);
        }
    };

    // Handle Manual Save
    const handleSaveManual = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualForm.title.trim()) {
            setManualMessage({ type: "error", text: "Judul dokumen wajib diisi." });
            return;
        }

        setIsSavingManual(true);
        setManualMessage(null);

        try {
            const articles = manualForm.articleSubstance.trim() ? [{
                articleNumber: manualForm.articleNumber,
                articleTitle: manualForm.articleTitle,
                substance: manualForm.articleSubstance
            }] : [];

            const res = await createManualDocumentAction({
                docType: manualForm.docType,
                docNumber: String(manualForm.docNumber),
                docYear: Number(manualForm.docYear),
                title: manualForm.title,
                issuer: manualForm.issuer,
                status: manualForm.status,
                effectiveDate: manualForm.effectiveDate,
                pdfUrl: manualForm.pdfUrl,
                abstract: manualForm.abstract,
                articles
            });

            if (res.success) {
                setManualMessage({
                    type: "success",
                    text: "Dokumen berhasil disimpan ke Document Registry."
                });
                setManualForm({
                    docType: "SOP_INSTANSI",
                    docNumber: "02",
                    docYear: new Date().getFullYear(),
                    title: "",
                    issuer: "Pemerintah Daerah / BPSDM",
                    status: "ACTIVE",
                    effectiveDate: new Date().toISOString().split("T")[0],
                    pdfUrl: "",
                    abstract: "",
                    articleNumber: "Pasal 1",
                    articleTitle: "Ketentuan Umum",
                    articleSubstance: ""
                });
                await loadDocuments();
            } else {
                setManualMessage({
                    type: "error",
                    text: res.error || "Gagal menyimpan dokumen."
                });
            }
        } catch (err: unknown) {
            setManualMessage({
                type: "error",
                text: err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan dokumen."
            });
        } finally {
            setIsSavingManual(false);
        }
    };

    // Handle Delete
    const confirmDeleteDoc = async () => {
        if (!docPendingDelete) return;
        setIsDeletingDoc(true);
        try {
            const res = await deleteRegistryDocumentAction(docPendingDelete.id);
            if (res.success) {
                showToast.success("Dokumen Dihapus", `"${docPendingDelete.title}" telah dihapus.`);
                setDocPendingDelete(null);
                await loadDocuments();
            } else {
                showToast.error("Gagal Menghapus", res.error || "Gagal menghapus dokumen dari registry.");
            }
        } catch (err) {
            console.error("Delete error:", err);
            showToast.error("Kesalahan Jaringan", "Terjadi kesalahan saat menghapus dokumen.");
        } finally {
            setIsDeletingDoc(false);
        }
    };

    // Filtered documents
    const filteredDocs = documents.filter((doc) => {
        const matchesSearch = 
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.docNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.issuer.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = 
            statusFilter === "ALL" || doc.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="bg-gradient-to-r from-oxford-950 via-oxford-900 to-oxford-950 text-white rounded-2xl p-6 md:p-8 border border-oxford-800 shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gold-500/15 text-gold-400 text-xs font-semibold mb-3 border border-gold-500/30">
                            <Database size={14} className="text-gold-400" />
                            <span>Document Registry • Sumber Kebenaran Otentik (Grounding)</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-tight">
                            Bank Data Regulasi & Dokumen Hukum
                        </h1>
                        <p className="text-oxford-300 text-sm mt-1 max-w-2xl leading-relaxed">
                            Pusat penyimpanan regulasi resmi dan instrumen SOP yang digunakan oleh AI Course Creator untuk menjamin kepatuhan hukum tanpa fabrikasi data.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href={`${basePath}/courses/creator`}
                            className="flex items-center gap-2 px-4 py-2.5 bg-oxford-800/80 hover:bg-oxford-800 text-oxford-200 hover:text-white font-medium rounded-xl border border-oxford-700 text-xs transition-colors"
                        >
                            <ArrowLeft size={15} />
                            <span>Buka Course Creator</span>
                        </Link>

                        <button
                            onClick={() => {
                                setShowCrawlerModal(true);
                                setCrawlerMessage(null);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-oxford-800 hover:bg-oxford-700 text-white font-medium rounded-xl border border-oxford-700 text-xs transition-colors cursor-pointer"
                        >
                            <Globe size={16} className="text-blue-400" />
                            <span>Tarik dari JDIH BPK</span>
                        </button>

                        <button
                            onClick={() => {
                                setShowManualModal(true);
                                setManualMessage(null);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-xl text-xs transition-colors shadow-md cursor-pointer"
                        >
                            <Plus size={16} />
                            <span>Tambah Dokumen Manual</span>
                        </button>
                    </div>
                </div>

                {/* Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-oxford-800">
                    <div className="bg-oxford-950/60 p-3 rounded-lg border border-oxford-800">
                        <div className="text-xs text-oxford-400">Total Dokumen Terdaftar</div>
                        <div className="text-xl font-bold text-white mt-1">{stats.totalDocuments}</div>
                    </div>
                    <div className="bg-oxford-950/60 p-3 rounded-lg border border-oxford-800">
                        <div className="text-xs text-emerald-400">Regulasi Berlaku (Active)</div>
                        <div className="text-xl font-bold text-emerald-300 mt-1">{stats.activeCount}</div>
                    </div>
                    <div className="bg-oxford-950/60 p-3 rounded-lg border border-oxford-800">
                        <div className="text-xs text-amber-400">Diubah Sebagian</div>
                        <div className="text-xl font-bold text-amber-300 mt-1">{stats.amendedCount}</div>
                    </div>
                    <div className="bg-oxford-950/60 p-3 rounded-lg border border-oxford-800">
                        <div className="text-xs text-blue-400">Pasal Otentik Terindeks</div>
                        <div className="text-xl font-bold text-blue-300 mt-1">{stats.totalArticles}</div>
                    </div>
                </div>
            </div>

            {/* Controls Bar: Search & Status Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#161B2A] p-4 rounded-xl border border-oxford-200 dark:border-oxford-800 shadow-sm">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-oxford-400" size={16} />
                    <input
                        type="text"
                        placeholder="Cari judul, nomor, atau penerbit..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-lg text-xs focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                    {[
                        { key: "ALL", label: "Semua" },
                        { key: "ACTIVE", label: "Berlaku" },
                        { key: "AMENDED_PARTIALLY", label: "Diubah Sebagian" },
                        { key: "REPEALED", label: "Dicabut" }
                    ].map((btn) => (
                        <button
                            key={btn.key}
                            onClick={() => setStatusFilter(btn.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                statusFilter === btn.key
                                    ? "bg-oxford-950 text-white dark:bg-gold-500 dark:text-oxford-950"
                                    : "bg-oxford-100 dark:bg-oxford-900 text-oxford-600 dark:text-oxford-400 hover:bg-oxford-200"
                            }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Document List */}
            {isLoading ? (
                <div className="p-12 text-center bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-800">
                    <Loader2 size={32} className="animate-spin text-gold-500 mx-auto mb-2" />
                    <p className="text-sm text-oxford-500">Memuat data Document Registry dari PostgreSQL Neon...</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-800 text-oxford-500 text-sm">
                    Tidak ada dokumen yang sesuai dengan filter pencarian.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredDocs.map((doc) => {
                        const isExpanded = expandedDocId === doc.id;
                        const isRepealed = doc.status === "REPEALED";

                        return (
                            <div
                                key={doc.id}
                                className={`bg-white dark:bg-[#161B2A] rounded-xl border p-5 transition-all ${
                                    isRepealed
                                        ? "border-crimson-200 dark:border-crimson-900/40 bg-crimson-50/20"
                                        : "border-oxford-200 dark:border-oxford-800 hover:border-gold-500/40 shadow-sm"
                                }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                                doc.status === "ACTIVE"
                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                                                    : doc.status === "AMENDED_PARTIALLY"
                                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                                                    : "bg-crimson-100 text-crimson-800 dark:bg-crimson-950 dark:text-crimson-300 border border-crimson-300"
                                            }`}>
                                                {doc.status === "ACTIVE" ? "BERLAKU (ACTIVE)" : doc.status === "AMENDED_PARTIALLY" ? "DIUBAH SEBAGIAN" : "DICABUT (REPEALED)"}
                                            </span>

                                            <span className="text-xs font-semibold text-oxford-500 dark:text-oxford-400">
                                                {doc.docType} No. {doc.docNumber} Tahun {doc.docYear}
                                            </span>

                                            <span className="text-xs text-oxford-400">
                                                • Penerbit: {doc.issuer}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-bold text-oxford-900 dark:text-white leading-snug">
                                            {doc.title}
                                        </h3>

                                        {doc.abstract && (
                                            <p className="text-xs text-oxford-600 dark:text-oxford-300 bg-oxford-50 dark:bg-oxford-950 p-3 rounded-lg leading-relaxed">
                                                {doc.abstract}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap items-center gap-4 text-xs text-oxford-500 pt-1">
                                            <span>Tanggal Berlaku: <strong>{doc.effectiveDate || "30 April 2025"}</strong></span>
                                            <span>Pasal Terindeks: <strong>{doc.articleCount} Pasal</strong></span>
                                            {doc.amendedBy && (
                                                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                                    Diubah oleh: {doc.amendedBy}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                                        {doc.pdfUrl && (
                                            <a
                                                href={doc.pdfUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-oxford-700 dark:text-oxford-300 bg-oxford-100 dark:bg-oxford-800 hover:bg-oxford-200 dark:hover:bg-oxford-700 rounded-lg transition-colors"
                                            >
                                                <span>PDF JDIH</span>
                                                <ExternalLink size={12} />
                                            </a>
                                        )}

                                        {doc.articleCount > 0 && (
                                            <button
                                                onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gold-600 dark:text-gold-400 bg-gold-50 dark:bg-gold-500/10 hover:bg-gold-100 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <span>{isExpanded ? "Tutup Pasal" : "Lihat Pasal"}</span>
                                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setDocPendingDelete({ id: doc.id, title: doc.title })}
                                            className="p-1.5 text-oxford-400 hover:text-crimson-600 dark:hover:text-crimson-400 rounded-lg transition-colors cursor-pointer"
                                            title="Hapus Dokumen"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Articles View */}
                                {isExpanded && doc.articles && (
                                    <div className="mt-4 pt-4 border-t border-oxford-100 dark:border-oxford-800 space-y-2 animate-fadeIn">
                                        <div className="text-xs font-bold text-oxford-900 dark:text-white">
                                            Daftar Pasal Terindeks untuk Validasi Sitasi (Zero Fabrication):
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {doc.articles.map((art) => (
                                                <div
                                                    key={art.id}
                                                    className="p-3 rounded-lg bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 text-xs"
                                                >
                                                    <div className="font-bold text-oxford-900 dark:text-white flex items-center justify-between">
                                                        <span>{art.articleNumber} • {art.articleTitle}</span>
                                                    </div>
                                                    <p className="text-oxford-600 dark:text-oxford-300 mt-1 whitespace-pre-line leading-relaxed">
                                                        {art.substance}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL 1: TARIK OTOMATIS DARI JDIH BPK */}
            {showCrawlerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#161B2A] rounded-2xl max-w-xl w-full p-6 border border-oxford-200 dark:border-oxford-800 shadow-2xl space-y-4 animate-scaleIn">
                        <div className="flex items-center justify-between border-b border-oxford-100 dark:border-oxford-800 pb-3">
                            <h3 className="text-lg font-bold text-oxford-900 dark:text-white flex items-center gap-2">
                                <Globe size={18} className="text-blue-500" />
                                <span>Tarik Otomatis dari Portal JDIH BPK</span>
                            </h3>
                            <button
                                onClick={() => setShowCrawlerModal(false)}
                                className="text-oxford-400 hover:text-oxford-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-xs text-oxford-600 dark:text-oxford-300 leading-relaxed">
                            Masukkan URL detail peraturan dari portal <strong>peraturan.bpk.go.id</strong>. Bot crawler otonom akan mengekstrak judul, nomor, tahun, status keberlakuan, abstrak materi pokok, dan tautan PDF naskah resmi.
                        </p>

                        <form onSubmit={handleCrawl} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-oxford-900 dark:text-white mb-1.5">
                                    URL Halaman Peraturan BPK
                                </label>
                                <input
                                    type="url"
                                    required
                                    value={crawlerUrl}
                                    onChange={(e) => setCrawlerUrl(e.target.value)}
                                    placeholder="Contoh: https://peraturan.bpk.go.id/Details/318647/perpres-no-46-tahun-2025"
                                    className="w-full px-3.5 py-2.5 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-xs focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white font-mono"
                                />
                            </div>

                            {/* Quick Presets */}
                            <div className="space-y-1.5">
                                <span className="text-[11px] font-semibold text-oxford-400 block">Pilihan Cepat Regulasi PBJ:</span>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCrawlerUrl("https://peraturan.bpk.go.id/Details/318647/perpres-no-46-tahun-2025")}
                                        className="text-[11px] px-2.5 py-1 rounded bg-oxford-100 dark:bg-oxford-800 hover:bg-gold-500/20 text-oxford-700 dark:text-oxford-300 transition-colors cursor-pointer"
                                    >
                                        Perpres 46/2025 (ID: 318647)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCrawlerUrl("https://peraturan.bpk.go.id/Details/314291/peraturan-lkpp-no-4-tahun-2024")}
                                        className="text-[11px] px-2.5 py-1 rounded bg-oxford-100 dark:bg-oxford-800 hover:bg-gold-500/20 text-oxford-700 dark:text-oxford-300 transition-colors cursor-pointer"
                                    >
                                        Perka LKPP 4/2024 (ID: 314291)
                                    </button>
                                </div>
                            </div>

                            {crawlerMessage && (
                                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                                    crawlerMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                        : "bg-crimson-50 text-crimson-800 dark:bg-crimson-950 dark:text-crimson-300"
                                }`}>
                                    {crawlerMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                    <span>{crawlerMessage.text}</span>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2 border-t border-oxford-100 dark:border-oxford-800">
                                <button
                                    type="button"
                                    onClick={() => setShowCrawlerModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-oxford-600 hover:bg-oxford-100 rounded-lg"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCrawling}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-oxford-950 dark:bg-gold-500 text-gold-400 dark:text-oxford-950 text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {isCrawling ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Menelusuri Portal JDIH BPK...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Globe size={14} />
                                            <span>Tarik & Sinkronkan Sekarang</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: INPUT DOKUMEN MANUAL / SOP INSTANSI */}
            {showManualModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-[#161B2A] rounded-2xl max-w-2xl w-full p-6 border border-oxford-200 dark:border-oxford-800 shadow-2xl space-y-4 my-8 animate-scaleIn">
                        <div className="flex items-center justify-between border-b border-oxford-100 dark:border-oxford-800 pb-3">
                            <h3 className="text-lg font-bold text-oxford-900 dark:text-white flex items-center gap-2">
                                <FileText size={18} className="text-gold-500" />
                                <span>Input / Unggah Dokumen Regulasi atau SOP Manual</span>
                            </h3>
                            <button
                                onClick={() => setShowManualModal(false)}
                                className="text-oxford-400 hover:text-oxford-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveManual} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-oxford-900 dark:text-white mb-1">
                                        Judul Dokumen / Nama Regulasi / SOP *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={manualForm.title}
                                        onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                                        placeholder="Contoh: Standar Operasional Prosedur Pengadaan Langsung BPSDM Tahun 2025"
                                        className="w-full px-3.5 py-2 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-xs text-oxford-900 dark:text-white font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-oxford-900 dark:text-white mb-1">
                                        Tipe Dokumen
                                    </label>
                                    <select
                                        value={manualForm.docType}
                                        onChange={(e) => setManualForm({ ...manualForm, docType: e.target.value })}
                                        className="w-full px-3.5 py-2 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-xs text-oxford-900 dark:text-white"
                                    >
                                        <option value="SOP_INSTANSI">SOP Instansi / Internal</option>
                                        <option value="PEDOMAN_TEKNIS">Pedoman Teknis / KAK</option>
                                        <option value="PERATURAN_DAERAH">Peraturan Daerah (Perda)</option>
                                        <option value="PERBUP">Peraturan Bupati (Perbup)</option>
                                        <option value="PERGUB">Peraturan Gubernur (Pergub)</option>
                                        <option value="PERATURAN_LKPP">Peraturan LKPP</option>
                                        <option value="PERPRES">Peraturan Presiden</option>
                                        <option value="UNDANG_UNDANG">Undang-Undang</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-oxford-900 dark:text-white mb-1">
                                        Nomor & Tahun Dokumen
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={manualForm.docNumber}
                                            onChange={(e) => setManualForm({ ...manualForm, docNumber: e.target.value })}
                                            placeholder="Nomor"
                                            className="w-1/2 px-3 py-2 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-xs text-oxford-900 dark:text-white"
                                        />
                                        <input
                                            type="number"
                                            value={manualForm.docYear}
                                            onChange={(e) => setManualForm({ ...manualForm, docYear: Number(e.target.value) })}
                                            placeholder="Tahun"
                                            className="w-1/2 px-3 py-2 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-xs text-oxford-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-oxford-900 dark:text-white mb-1">
                                        Instansi Penerbit
                                    </label>
                                    <input
                                        type="text"
                                        value={manualForm.issuer}
                                        onChange={(e) => setManualForm({ ...manualForm, issuer: e.target.value })}
                                        className="w-full px-3.5 py-2 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-xs text-oxford-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-oxford-900 dark:text-white mb-1">
                                        Status Keberlakuan Hukum
                                    </label>
                                    <select
                                        value={manualForm.status}
                                        onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as "ACTIVE" | "AMENDED_PARTIALLY" | "REPEALED" })}
                                        className="w-full px-3.5 py-2 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-xs text-oxford-900 dark:text-white"
                                    >
                                        <option value="ACTIVE">Berlaku (Active)</option>
                                        <option value="AMENDED_PARTIALLY">Diubah Sebagian (Amended)</option>
                                        <option value="REPEALED">Dicabut / Tidak Berlaku (Repealed)</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-oxford-900 dark:text-white mb-1">
                                        Tautan Berkas PDF / Naskah Digital
                                    </label>
                                    <input
                                        type="url"
                                        value={manualForm.pdfUrl}
                                        onChange={(e) => setManualForm({ ...manualForm, pdfUrl: e.target.value })}
                                        placeholder="https://... naskah resmi atau Google Drive"
                                        className="w-full px-3.5 py-2 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-xs text-oxford-900 dark:text-white font-mono"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-oxford-900 dark:text-white mb-1">
                                        Ringkasan / Abstrak Dokumen
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={manualForm.abstract}
                                        onChange={(e) => setManualForm({ ...manualForm, abstract: e.target.value })}
                                        placeholder="Ringkasan materi pokok dan maksud ditetapkannya regulasi/SOP ini..."
                                        className="w-full px-3.5 py-2 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800 rounded-xl text-xs text-oxford-900 dark:text-white"
                                    />
                                </div>

                                {/* Article Sub-entry */}
                                <div className="md:col-span-2 p-3 bg-oxford-50 dark:bg-oxford-950 rounded-xl border border-oxford-200 dark:border-oxford-800 space-y-2">
                                    <span className="text-xs font-bold text-oxford-900 dark:text-white block">
                                        Tambah Butir Pasal / Ketentuan Kunci untuk Verifikasi Sitasi (Opsional)
                                    </span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={manualForm.articleNumber}
                                            onChange={(e) => setManualForm({ ...manualForm, articleNumber: e.target.value })}
                                            placeholder="Nomor Pasal (misal: Pasal 12)"
                                            className="px-3 py-1.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-800 rounded-lg text-xs"
                                        />
                                        <input
                                            type="text"
                                            value={manualForm.articleTitle}
                                            onChange={(e) => setManualForm({ ...manualForm, articleTitle: e.target.value })}
                                            placeholder="Judul Pasal (misal: Kewajiban Verifikasi HPS)"
                                            className="px-3 py-1.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-800 rounded-lg text-xs"
                                        />
                                    </div>
                                    <textarea
                                        rows={2}
                                        value={manualForm.articleSubstance}
                                        onChange={(e) => setManualForm({ ...manualForm, articleSubstance: e.target.value })}
                                        placeholder="Bunyi substansi pasal/ketentuan..."
                                        className="w-full px-3 py-1.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-800 rounded-lg text-xs"
                                    />
                                </div>
                            </div>

                            {manualMessage && (
                                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                                    manualMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                        : "bg-crimson-50 text-crimson-800 dark:bg-crimson-950 dark:text-crimson-300"
                                }`}>
                                    {manualMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                    <span>{manualMessage.text}</span>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2 border-t border-oxford-100 dark:border-oxford-800">
                                <button
                                    type="button"
                                    onClick={() => setShowManualModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-oxford-600 hover:bg-oxford-100 rounded-lg"
                                >
                                    Tutup
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingManual}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 hover:bg-gold-400 text-oxford-950 text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {isSavingManual ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Menyimpan ke Database...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FileText size={14} />
                                            <span>Simpan Dokumen ke Bank Data</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Delete Document Dialog */}
            <ConfirmDialog
                isOpen={!!docPendingDelete}
                onClose={() => !isDeletingDoc && setDocPendingDelete(null)}
                onConfirm={confirmDeleteDoc}
                title="Hapus Dokumen Sumber?"
                itemName={docPendingDelete?.title}
                description="Dokumen ini akan dihapus dari Document Registry dan bank data sistem."
                warningText="PERINGATAN: Modul kursus atau grounding RAG yang merujuk dokumen ini tidak lagi memiliki jangkar verifikasi aktif."
                confirmText="Hapus Dokumen"
                cancelText="Batal"
                variant="danger"
                isLoading={isDeletingDoc}
            />
        </div>
    );
}
