"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Image as ImageIcon, FileText, File, Loader2, X, Grid, List, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

interface MediaAsset {
    id: string;
    hash: string;
    url: string;
    filename: string;
    mimetype: string;
    size: number;
    createdAt: string;
}

interface MediaPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
    title?: string;
    allowedTypes?: string[]; // e.g. ["image/", "application/pdf"]
}

export function MediaPicker({ isOpen, onClose, onSelect, title = "Pilih Aset Media", allowedTypes }: MediaPickerProps) {
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const fetchAssets = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/media");
            const data = await res.json();
            if (data.success) {
                setAssets(data.assets || []);
            }
        } catch (err) {
            console.error("Failed to fetch media assets:", err);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const timer = window.setTimeout(() => void fetchAssets(), 0);
        return () => window.clearTimeout(timer);
    }, [fetchAssets, isOpen]);

    const isAllowed = (mimetype: string) => {
        if (!allowedTypes || allowedTypes.length === 0) return true;
        return allowedTypes.some(type => mimetype.startsWith(type));
    };

    const filteredAssets = assets.filter(a => {
        const matchesSearch = searchQuery === "" || 
            a.filename?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = isAllowed(a.mimetype);
        return matchesSearch && matchesType;
    });

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / 1048576).toFixed(1) + " MB";
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-oxford-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-oxford-200 dark:border-oxford-700 flex items-center justify-between bg-white dark:bg-[#161B2A] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gold-100 text-gold-600 rounded-lg">
                            <ImageIcon size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-oxford-900 dark:text-white">{title}</h2>
                            <p className="text-xs text-oxford-500 dark:text-oxford-400">Pilih dari aset yang sudah diunggah sebelumnya.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-oxford-100 dark:hover:bg-[#161B2A] rounded-full transition-colors">
                        <X size={20} className="text-oxford-400" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-oxford-100 dark:border-oxford-800 bg-oxford-50 dark:bg-oxford-950/50 flex flex-col sm:flex-row gap-3 items-center shrink-0">
                    <div className="relative flex-1 w-full">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-oxford-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari file..."
                            className="w-full pl-10 pr-4 py-2 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white dark:bg-[#161B2A] shadow text-gold-600' : 'text-oxford-400'}`}>
                            <Grid size={18} />
                        </button>
                        <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white dark:bg-[#161B2A] shadow text-gold-600' : 'text-oxford-400'}`}>
                            <List size={18} />
                        </button>
                        <button onClick={fetchAssets} className="p-2 text-oxford-400 hover:text-oxford-900 dark:hover:text-white">
                            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
                            <Loader2 size={32} className="animate-spin text-gold-500" />
                            <p className="text-sm text-oxford-400">Memuat aset...</p>
                        </div>
                    ) : filteredAssets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <ImageIcon size={48} className="text-oxford-200 mb-4" />
                            <p className="font-bold text-oxford-600 dark:text-oxford-300">Pustaka Kosong</p>
                            <p className="text-sm text-oxford-400">Tidak ada aset yang ditemukan dengan kriteria tersebut.</p>
                        </div>
                    ) : viewMode === "grid" ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredAssets.map((asset) => (
                                <div 
                                    key={asset.id}
                                    onClick={() => onSelect(asset.url)}
                                    className="group relative bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl overflow-hidden hover:border-gold-500 hover:shadow-lg transition-all cursor-pointer aspect-square"
                                >
                                    <div className="absolute inset-0 bg-oxford-50 dark:bg-oxford-950 flex items-center justify-center">
                                        {asset.mimetype?.startsWith("image/") ? (
                                            <Image src={asset.url} alt={asset.filename} fill sizes="160px" unoptimized className="object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="p-3 bg-white dark:bg-[#161B2A] rounded-lg shadow-sm">
                                                    {asset.mimetype?.includes("pdf") ? <FileText className="text-red-500" /> : <File className="text-oxford-400" />}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-gold-600/0 group-hover:bg-gold-600/10 transition-colors" />
                                    <div className="absolute bottom-0 inset-x-0 p-2 bg-white dark:bg-[#161B2A]/90 backdrop-blur-sm border-t border-oxford-100 dark:border-oxford-800">
                                        <p className="text-[10px] font-bold text-oxford-900 dark:text-white truncate">{asset.filename}</p>
                                        <p className="text-[8px] text-oxford-500 dark:text-oxford-400">{formatSize(asset.size)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-oxford-50 dark:bg-oxford-950 border-b border-oxford-200 dark:border-oxford-700">
                                    <tr>
                                        <th className="px-4 py-2 font-bold text-oxford-600 dark:text-oxford-300 text-[10px] uppercase">File</th>
                                        <th className="px-4 py-2 font-bold text-oxford-600 dark:text-oxford-300 text-[10px] uppercase">Nama</th>
                                        <th className="px-4 py-2 font-bold text-oxford-600 dark:text-oxford-300 text-[10px] uppercase">Ukuran</th>
                                        <th className="px-4 py-2 font-bold text-oxford-600 dark:text-oxford-300 text-[10px] uppercase text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-oxford-100">
                                    {filteredAssets.map((asset) => (
                                        <tr key={asset.id} className="hover:bg-oxford-50 dark:hover:bg-oxford-950 transition-colors">
                                            <td className="px-4 py-2">
                                                <div className="w-10 h-10 rounded bg-oxford-100 dark:bg-[#161B2A] flex items-center justify-center">
                                                    {asset.mimetype?.startsWith("image/") ? <Image src={asset.url} alt={asset.filename} width={40} height={40} unoptimized className="w-full h-full object-cover rounded" /> : <File size={16} />}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 font-medium text-oxford-800 dark:text-oxford-100 truncate max-w-[200px]">{asset.filename}</td>
                                            <td className="px-4 py-2 text-xs text-oxford-500 dark:text-oxford-400">{formatSize(asset.size)}</td>
                                            <td className="px-4 py-2 text-right">
                                                <button 
                                                    onClick={() => onSelect(asset.url)}
                                                    className="px-3 py-1.5 bg-gold-100 text-gold-700 rounded-lg text-xs font-bold hover:bg-gold-500 hover:text-oxford-950 transition-all"
                                                >
                                                    Pilih
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-oxford-50 dark:bg-oxford-950 border-t border-oxford-200 dark:border-oxford-700 flex justify-end shrink-0">
                    <button onClick={onClose} className="px-5 py-2 text-xs font-bold text-oxford-600 dark:text-oxford-300 hover:text-oxford-900 dark:hover:text-white">Batal</button>
                </div>
            </motion.div>
        </div>
    );
}
