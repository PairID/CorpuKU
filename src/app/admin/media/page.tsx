"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Menu, Image as ImageIcon, Search, Trash2, Copy, Check, ExternalLink, Grid, List, Upload, RefreshCcw, FileText, Film, File, HardDrive, Loader2, X } from "lucide-react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { motion, AnimatePresence } from "framer-motion";

interface MediaAsset {
    id: string;
    hash: string;
    url: string;
    filename: string;
    mimetype: string;
    size: number;
    userId: string;
    createdAt: string;
    usageCount?: number;
}

export default function MediaGalleryPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"all" | "image" | "document" | "other">("all");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [stats, setStats] = useState({ total: 0, totalSize: 0, images: 0, documents: 0 });

    const fetchAssets = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/media");
            const data = await res.json();
            if (data.success) {
                setAssets(data.assets || []);
                setStats(data.stats || { total: 0, totalSize: 0, images: 0, documents: 0 });
            }
        } catch (err) {
            console.error("Failed to fetch media assets:", err);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void fetchAssets(), 0);
        return () => window.clearTimeout(timer);
    }, [fetchAssets]);

    const copyToClipboard = async (url: string, id: string) => {
        await navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const result = await res.json();
            if (result.success) {
                fetchAssets(); // Refresh the list
            } else {
                alert("Upload gagal: " + result.error);
            }
        } catch {
            alert("Error saat mengunggah file.");
        }
        setIsUploading(false);
        e.target.value = ""; // Reset input
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus aset ini? URL yang sudah digunakan di konten lain akan menjadi broken.")) return;
        try {
            const res = await fetch(`/api/media?id=${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                setAssets(prev => prev.filter(a => a.id !== id));
                setSelectedAsset(null);
            } else {
                alert(data.error || "Gagal menghapus.");
            }
        } catch {
            alert("Error saat menghapus aset.");
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / 1048576).toFixed(1) + " MB";
    };

    const getFileIcon = (mimetype: string) => {
        if (mimetype?.startsWith("image/")) return <ImageIcon size={16} className="text-blue-500" />;
        if (mimetype?.includes("pdf")) return <FileText size={16} className="text-red-500" />;
        if (mimetype?.startsWith("video/")) return <Film size={16} className="text-purple-500" />;
        return <File size={16} className="text-oxford-400" />;
    };

    const isImage = (mimetype: string) => mimetype?.startsWith("image/");

    // Filter & search
    const filteredAssets = assets.filter(a => {
        const matchesSearch = searchQuery === "" || 
            a.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.url?.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (filterType === "image") return matchesSearch && a.mimetype?.startsWith("image/");
        if (filterType === "document") return matchesSearch && (a.mimetype?.includes("pdf") || a.mimetype?.includes("word") || a.mimetype?.includes("document"));
        if (filterType === "other") return matchesSearch && !a.mimetype?.startsWith("image/") && !a.mimetype?.includes("pdf");
        return matchesSearch;
    });

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            <AdminSidebar activePage="media" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="flex-1 flex flex-col min-h-screen relative">
                {/* Mobile sidebar toggle button (floating) */}
                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gold-500 text-oxford-950 rounded-full shadow-2xl hover:bg-gold-400 transition-all active:scale-95"
                >
                    <Menu size={24} />
                </button>

                {/* Stats Bar */}
                <div className="px-6 md:px-8 pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Total Aset", value: stats.total, icon: <HardDrive size={18} />, color: "text-oxford-600 dark:text-oxford-300 bg-oxford-100 dark:bg-[#161B2A]" },
                            { label: "Ukuran Total", value: formatSize(stats.totalSize), icon: <HardDrive size={18} />, color: "text-blue-600 bg-blue-100" },
                            { label: "Gambar", value: stats.images, icon: <ImageIcon size={18} />, color: "text-emerald-600 bg-emerald-100" },
                            { label: "Dokumen", value: stats.documents, icon: <FileText size={18} />, color: "text-amber-600 bg-amber-100" },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl p-4 flex items-center gap-3">
                                <div className={`p-2.5 rounded-lg ${stat.color}`}>{stat.icon}</div>
                                <div>
                                    <div className="text-lg font-bold text-oxford-900 dark:text-white">{stat.value}</div>
                                    <div className="text-[10px] text-oxford-500 dark:text-oxford-400 uppercase tracking-wider font-bold">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-6 md:px-8 pt-5 pb-2">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                        {/* Search */}
                        <div className="relative flex-1 w-full">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-oxford-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari berdasarkan nama file atau URL..."
                                className="w-full pl-10 pr-4 py-2.5 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 bg-white dark:bg-[#161B2A]"
                            />
                        </div>

                        {/* Filter */}
                        <div className="flex bg-oxford-100 dark:bg-[#161B2A] p-1 rounded-lg">
                            {([
                                { id: "all", label: "Semua" },
                                { id: "image", label: "Gambar" },
                                { id: "document", label: "Dokumen" },
                                { id: "other", label: "Lainnya" },
                            ] as const).map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilterType(f.id)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === f.id ? 'bg-white dark:bg-[#161B2A] text-oxford-900 dark:text-white shadow-sm' : 'text-oxford-500 dark:text-oxford-400 hover:text-oxford-700 dark:hover:text-oxford-200'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* View Toggle */}
                        <div className="flex bg-oxford-100 dark:bg-[#161B2A] p-1 rounded-lg">
                            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#161B2A] text-oxford-900 dark:text-white shadow-sm' : 'text-oxford-400'}`}>
                                <Grid size={16} />
                            </button>
                            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#161B2A] text-oxford-900 dark:text-white shadow-sm' : 'text-oxford-400'}`}>
                                <List size={16} />
                            </button>
                        </div>

                        {/* Refresh */}
                        <button onClick={fetchAssets} className="p-2.5 border border-oxford-200 dark:border-oxford-700 rounded-lg text-oxford-500 dark:text-oxford-400 hover:text-oxford-900 dark:hover:text-white hover:border-oxford-300 dark:hover:border-oxford-600 transition-colors">
                            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>

                        {/* Upload Button Restored */}
                        <div className="flex items-center gap-3 ml-auto">
                            <input type="file" id="gallery-upload" className="hidden" onChange={handleUpload} />
                            <label 
                                htmlFor="gallery-upload"
                                className={`px-4 py-2.5 bg-gold-500 text-oxford-950 rounded-xl font-bold text-sm cursor-pointer hover:bg-gold-400 transition-all shadow-sm flex items-center gap-2 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                {isUploading ? "Uploading..." : "Upload"}
                            </label>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 md:px-8 py-4 flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={32} className="animate-spin text-gold-500" />
                        </div>
                    ) : filteredAssets.length === 0 ? (
                        <div className="text-center py-20">
                            <ImageIcon size={48} className="mx-auto mb-4 text-oxford-300" />
                            <p className="font-bold text-oxford-600 dark:text-oxford-300 mb-1">Belum ada aset media.</p>
                            <p className="text-sm text-oxford-400">Upload file baru untuk memulai.</p>
                        </div>
                    ) : viewMode === "grid" ? (
                        /* GRID VIEW */
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {filteredAssets.map((asset) => (
                                <motion.div
                                    key={asset.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="group bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl overflow-hidden hover:shadow-lg hover:border-gold-300 transition-all cursor-pointer"
                                    onClick={() => setSelectedAsset(asset)}
                                >
                                    {/* Preview */}
                                    <div className="aspect-square bg-oxford-50 dark:bg-oxford-950 flex items-center justify-center overflow-hidden relative">
                                        {isImage(asset.mimetype) ? (
                                            <Image
                                                fill
                                                unoptimized
                                                src={asset.url} 
                                                alt={asset.filename}
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-oxford-400">
                                                {getFileIcon(asset.mimetype)}
                                                <span className="text-[10px] font-bold uppercase">{asset.mimetype?.split("/")[1] || "file"}</span>
                                            </div>
                                        )}
                                        {/* Quick copy overlay */}
                                        <div className="absolute inset-0 bg-oxford-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(asset.url, asset.id); }}
                                                className="p-2 bg-white dark:bg-[#161B2A] rounded-lg text-oxford-700 dark:text-oxford-200 hover:bg-gold-50 transition-colors"
                                                title="Salin URL"
                                            >
                                                {copiedId === asset.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                            </button>
                                            <a
                                                href={asset.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 bg-white dark:bg-[#161B2A] rounded-lg text-oxford-700 dark:text-oxford-200 hover:bg-gold-50 transition-colors"
                                                title="Buka di tab baru"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    </div>
                                    {/* Info */}
                                    <div className="p-2.5">
                                        <p className="text-[11px] font-bold text-oxford-800 dark:text-oxford-100 truncate">{asset.filename || "Unnamed"}</p>
                                        <p className="text-[10px] text-oxford-400 mt-0.5">{formatSize(asset.size)}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        /* LIST VIEW */
                        <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-950">
                                        <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-oxford-500 dark:text-oxford-400 font-bold">Preview</th>
                                        <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-oxford-500 dark:text-oxford-400 font-bold">Nama File</th>
                                        <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-oxford-500 dark:text-oxford-400 font-bold hidden md:table-cell">Tipe</th>
                                        <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-oxford-500 dark:text-oxford-400 font-bold hidden sm:table-cell">Ukuran</th>
                                        <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-oxford-500 dark:text-oxford-400 font-bold hidden lg:table-cell">Tanggal</th>
                                        <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-oxford-500 dark:text-oxford-400 font-bold">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-oxford-100">
                                    {filteredAssets.map((asset) => (
                                        <tr key={asset.id} className="hover:bg-oxford-50 dark:hover:bg-oxford-950/50 transition-colors cursor-pointer" onClick={() => setSelectedAsset(asset)}>
                                            <td className="px-4 py-3">
                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-oxford-100 dark:bg-[#161B2A] flex items-center justify-center">
                                                    {isImage(asset.mimetype) ? (
                                                        <Image unoptimized src={asset.url} alt="" width={40} height={40} className="w-full h-full object-cover" />
                                                    ) : (
                                                        getFileIcon(asset.mimetype)
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-oxford-800 dark:text-oxford-100 truncate max-w-[200px]">{asset.filename || "Unnamed"}</p>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <span className="text-[10px] font-bold uppercase bg-oxford-100 dark:bg-[#161B2A] text-oxford-600 dark:text-oxford-300 px-2 py-1 rounded">{asset.mimetype?.split("/")[1] || "?"}</span>
                                            </td>
                                            <td className="px-4 py-3 text-oxford-500 dark:text-oxford-400 hidden sm:table-cell">{formatSize(asset.size)}</td>
                                            <td className="px-4 py-3 text-oxford-400 text-xs hidden lg:table-cell">
                                                {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(asset.url, asset.id); }}
                                                        className="p-1.5 rounded-lg border border-oxford-200 dark:border-oxford-700 text-oxford-500 dark:text-oxford-400 hover:text-gold-600 hover:border-gold-300 transition-colors"
                                                        title="Salin URL"
                                                    >
                                                        {copiedId === asset.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(asset.id); }}
                                                        className="p-1.5 rounded-lg border border-oxford-200 dark:border-oxford-700 text-oxford-500 dark:text-oxford-400 hover:text-crimson-500 hover:border-crimson-300 transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Detail Panel (Modal) */}
            <AnimatePresence>
                {selectedAsset && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-oxford-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedAsset(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Preview */}
                            <div className="bg-oxford-50 dark:bg-oxford-950 border-b border-oxford-200 dark:border-oxford-700 flex items-center justify-center min-h-[200px] max-h-[320px] overflow-hidden relative">
                                {isImage(selectedAsset.mimetype) ? (
                                    <Image unoptimized src={selectedAsset.url} alt={selectedAsset.filename} width={512} height={320} className="max-w-full max-h-[320px] object-contain" />
                                ) : (
                                    <div className="py-16 flex flex-col items-center gap-3 text-oxford-400">
                                        {getFileIcon(selectedAsset.mimetype)}
                                        <span className="text-xs font-bold uppercase">{selectedAsset.mimetype}</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => setSelectedAsset(null)}
                                    className="absolute top-3 right-3 p-2 bg-white dark:bg-[#161B2A]/90 rounded-full text-oxford-600 dark:text-oxford-300 hover:text-oxford-900 dark:hover:text-white shadow-sm"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Details */}
                            <div className="p-6 space-y-4">
                                <div>
                                    <h3 className="font-bold text-lg text-oxford-900 dark:text-white break-all">{selectedAsset.filename || "Unnamed"}</h3>
                                    <p className="text-xs text-oxford-400 mt-1">ID: {selectedAsset.id}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-oxford-50 dark:bg-oxford-950 rounded-lg p-3">
                                        <p className="text-[10px] text-oxford-500 dark:text-oxford-400 uppercase font-bold tracking-wider">Ukuran</p>
                                        <p className="font-bold text-oxford-800 dark:text-oxford-100">{formatSize(selectedAsset.size)}</p>
                                    </div>
                                    <div className="bg-oxford-50 dark:bg-oxford-950 rounded-lg p-3">
                                        <p className="text-[10px] text-oxford-500 dark:text-oxford-400 uppercase font-bold tracking-wider">Tipe</p>
                                        <p className="font-bold text-oxford-800 dark:text-oxford-100">{selectedAsset.mimetype}</p>
                                    </div>
                                    <div className="bg-oxford-50 dark:bg-oxford-950 rounded-lg p-3 col-span-2">
                                        <p className="text-[10px] text-oxford-500 dark:text-oxford-400 uppercase font-bold tracking-wider mb-1">Hash (Deduplikasi)</p>
                                        <p className="font-mono text-[11px] text-oxford-600 dark:text-oxford-300 break-all">{selectedAsset.hash}</p>
                                    </div>
                                </div>

                                {/* URL Copy */}
                                <div className="bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 rounded-xl p-3">
                                    <p className="text-[10px] text-oxford-500 dark:text-oxford-400 uppercase font-bold tracking-wider mb-2">URL Aset</p>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            readOnly 
                                            value={selectedAsset.url} 
                                            className="flex-1 text-xs bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg p-2 text-oxford-600 dark:text-oxford-300 font-mono truncate"
                                        />
                                        <button
                                            onClick={() => copyToClipboard(selectedAsset.url, selectedAsset.id)}
                                            className="px-3 py-2 bg-gold-500 text-oxford-950 rounded-lg font-bold text-xs hover:bg-gold-400 transition-colors flex items-center gap-1.5"
                                        >
                                            {copiedId === selectedAsset.id ? <Check size={14} /> : <Copy size={14} />}
                                            {copiedId === selectedAsset.id ? "Tersalin!" : "Salin"}
                                        </button>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <a
                                        href={selectedAsset.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 py-2.5 border-2 border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-200 font-bold text-sm rounded-xl hover:bg-oxford-50 dark:hover:bg-oxford-950 transition-all flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink size={14} /> Buka
                                    </a>
                                    <button
                                        onClick={() => handleDelete(selectedAsset.id)}
                                        className="px-5 py-2.5 border-2 border-crimson-200 text-crimson-600 font-bold text-sm rounded-xl hover:bg-crimson-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={14} /> Hapus
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
