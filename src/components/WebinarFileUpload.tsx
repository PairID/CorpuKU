"use client";

import { useState, useEffect } from "react";
import { Upload, X, FileText, CheckCircle, Loader2, Link as LinkIcon, FileUp } from "lucide-react";
import Image from "next/image";

interface WebinarFileUploadProps {
    onUploadComplete: (url: string) => void;
    label: string;
    accept?: string;
    currentUrl?: string;
}

export default function WebinarFileUpload({ onUploadComplete, label, accept = "image/*,application/pdf", currentUrl }: WebinarFileUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(currentUrl);
    const [mode, setMode] = useState<"upload" | "link">("upload");
    const [tempUrl, setTempUrl] = useState("");

    useEffect(() => {
        setPreview(currentUrl);
        // If currentUrl exists and doesn't look like a Cloudinary/internal upload, default to link mode
        if (currentUrl && !currentUrl.includes("cloudinary.com") && !currentUrl.includes("/api/")) {
            setMode("link");
            setTempUrl(currentUrl);
        }
    }, [currentUrl]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setPreview(data.url);
                onUploadComplete(data.url);
            } else {
                alert("Upload gagal: " + data.error);
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("Terjadi kesalahan saat mengunggah file.");
        } finally {
            setUploading(false);
        }
    };

    const handleUrlSubmit = () => {
        if (tempUrl.trim()) {
            setPreview(tempUrl);
            onUploadComplete(tempUrl);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-oxford-900 dark:text-white">{label}</label>
                <div className="flex bg-oxford-100 dark:bg-[#161B2A] p-1 rounded-lg">
                    <button 
                        type="button"
                        onClick={() => setMode("upload")}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1.5 ${mode === 'upload' ? 'bg-white dark:bg-[#161B2A] text-gold-600 shadow-sm' : 'text-oxford-500 dark:text-oxford-400 hover:text-oxford-700 dark:hover:text-oxford-200'}`}
                    >
                        <FileUp size={12} /> UPLOAD
                    </button>
                    <button 
                        type="button"
                        onClick={() => setMode("link")}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1.5 ${mode === 'link' ? 'bg-white dark:bg-[#161B2A] text-gold-600 shadow-sm' : 'text-oxford-500 dark:text-oxford-400 hover:text-oxford-700 dark:hover:text-oxford-200'}`}
                    >
                        <LinkIcon size={12} /> LINK
                    </button>
                </div>
            </div>
            
            {preview ? (
                <div className="relative group rounded-xl border border-oxford-200 dark:border-oxford-700 overflow-hidden bg-oxford-50 dark:bg-oxford-950 p-4 flex items-center gap-4 animate-in fade-in zoom-in duration-200">
                    {preview.match(/\.(jpeg|jpg|gif|png|webp)$/) || preview.includes("cloudinary.com") ? (
                        <div className="w-16 h-16 rounded-lg bg-white dark:bg-[#161B2A] border border-oxford-100 dark:border-oxford-800 overflow-hidden shrink-0">
                            <Image src={preview} alt="Preview" width={64} height={64} unoptimized className="w-full h-full object-cover" onError={(e) => {
                                e.currentTarget.src = "https://placehold.co/100x100?text=File";
                            }} />
                        </div>
                    ) : (
                        <div className="w-16 h-16 bg-white dark:bg-[#161B2A] rounded-lg flex items-center justify-center text-gold-600 border border-oxford-100 dark:border-oxford-800 shrink-0">
                            <FileText size={32} />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-oxford-500 dark:text-oxford-400 truncate font-mono">{preview}</p>
                        <div className="flex items-center gap-1 text-green-600 text-[10px] font-bold uppercase mt-1">
                            <CheckCircle size={12} /> {preview.startsWith("http") && !preview.includes("cloudinary") ? "Tautan Aktif" : "Terunggah"}
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => { setPreview(""); onUploadComplete(""); setTempUrl(""); }}
                        className="p-2 hover:bg-red-50 text-oxford-400 hover:text-red-500 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            ) : mode === "upload" ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-oxford-200 dark:border-oxford-700 rounded-xl cursor-pointer hover:bg-oxford-50 dark:hover:bg-oxford-950 hover:border-gold-500 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploading ? (
                            <Loader2 className="w-8 h-8 mb-3 text-gold-500 animate-spin" />
                        ) : (
                            <Upload className="w-8 h-8 mb-3 text-oxford-300 group-hover:text-gold-500" />
                        )}
                        <p className="mb-2 text-sm text-oxford-500 dark:text-oxford-400"><span className="font-semibold">Klik untuk upload</span> atau drag and drop</p>
                        <p className="text-xs text-oxford-400 text-center px-4">
                            {accept.includes("pdf") ? "Gambar, PDF, PPT, DOC (Maks. 50MB)" : "Gambar (Maks. 50MB)"}
                        </p>
                    </div>
                    <input 
                        type="file" 
                        className="hidden" 
                        accept={accept} 
                        onChange={handleFileChange} 
                        disabled={uploading}
                    />
                </label>
            ) : (
                <div className="flex gap-2 animate-in slide-in-from-top-1 duration-200">
                    <div className="relative flex-1">
                        <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-400" />
                        <input 
                            type="url" 
                            value={tempUrl}
                            onChange={(e) => setTempUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlSubmit())}
                            placeholder="Masukkan tautan eksternal (https://...)" 
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-oxford-200 dark:border-oxford-700 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all bg-oxford-50 dark:bg-oxford-950/50 text-sm"
                        />
                    </div>
                    <button 
                        type="button"
                        onClick={handleUrlSubmit}
                        disabled={!tempUrl.trim()}
                        className="px-6 py-3 bg-oxford-900 text-white font-bold rounded-xl hover:bg-oxford-800 transition-colors disabled:opacity-50"
                    >
                        Terapkan
                    </button>
                </div>
            )}
        </div>
    );
}
