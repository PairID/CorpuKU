"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { UploadCloud, X, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { createKnowledgeItem } from "@/app/actions/knowledge";
import { useRouter } from "next/navigation";
import { KNOWLEDGE_CATEGORIES } from "@/lib/constants";

interface FileWithPreview {
    file: File;
    id: string;
}


export default function KMSUploadClient() {
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => ({
                file,
                id: Math.random().toString(36).substring(7)
            }));
            setSelectedFiles(prev => [...prev, ...newFiles].slice(0, 20)); // Increased to Max 20 files
        }
    };

    const removeFile = (id: string) => {
        setSelectedFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !category) {
            setError("Judul dan Kategori wajib diisi.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        // Actual file upload to Cloudinary
        const attachments = [];
        for (const f of selectedFiles) {
            try {
                const formData = new FormData();
                formData.append("file", f.file);
                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData
                });
                const result = await res.json();
                if (result.success) {
                    attachments.push({
                        fileName: f.file.name,
                        fileUrl: result.url,
                        fileSize: (f.file.size / 1024).toFixed(2) + " KB"
                    });
                }
            } catch (err) {
                console.error("Failed to upload", f.file.name, err);
            }
        }

        const result = await createKnowledgeItem({
            title,
            category,
            description,
            videoUrl,
            attachments: attachments
        });

        if (result.error) {
            setError(result.error);
            setIsSubmitting(false);
        } else {
            router.push(`/knowledge/${result.id}`);
        }
    };

    return (
        <div className="bg-white dark:bg-[#161B2A] min-h-screen py-24">
            <div className="container mx-auto px-4 max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-serif text-center font-bold text-oxford-900 dark:text-white mb-16">
                    Bagikan Pengetahuan
                </h1>

                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8 p-4 bg-crimson-50 border border-crimson-200 text-crimson-700 rounded-xl flex items-center gap-3 font-sans"
                        >
                            <AlertCircle size={20} />
                            {error}
                        </motion.div>
                    )}

                    {/* File Upload Area */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full mb-8 sm:mb-12">
                        {selectedFiles.map((f) => (
                            <div key={f.id} className="relative aspect-square">
                                <div className="w-full h-full bg-gold-50 border-2 border-gold-200 rounded-2xl flex flex-col items-center justify-center text-center p-3 shadow-sm">
                                    <FileText className="w-8 h-8 text-gold-600 mb-2" />
                                    <span className="font-sans text-[10px] sm:text-xs font-bold text-oxford-900 dark:text-white line-clamp-2 px-2">
                                        {f.file.name}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeFile(f.id)}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-crimson-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-crimson-600 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}

                        {selectedFiles.length < 20 && (
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square bg-oxford-50 dark:bg-oxford-950 border-2 border-dashed border-oxford-200 dark:border-oxford-700 rounded-2xl flex flex-col items-center justify-center text-center p-3 sm:p-4 cursor-pointer hover:border-gold-500 hover:bg-gold-50/30 transition-colors group"
                            >
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-[#161B2A] rounded-full flex items-center justify-center mb-2 sm:mb-3 shadow-sm group-hover:text-gold-600 group-hover:shadow-gold-500/20 text-oxford-700 dark:text-oxford-200 transition-all">
                                    <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <span className="font-sans text-xs sm:text-sm font-semibold text-oxford-700 dark:text-oxford-200 group-hover:text-oxford-900 dark:group-hover:text-white leading-tight text-center">
                                    Unggah<br />file
                                </span>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    multiple
                                />
                            </motion.div>
                        )}
                    </div>

                    {/* Form Inputs */}
                    <div className="w-full space-y-4 sm:space-y-6 mb-10 sm:mb-16">
                        <div>
                            <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2 font-sans uppercase tracking-widest">Judul Pengetahuan</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Misal: Panduan Keamanan Siber 2026"
                                className="w-full px-5 py-3 sm:px-6 sm:py-4 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl font-sans text-oxford-900 dark:text-white placeholder:text-oxford-400 focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-sm sm:text-base"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2 font-sans uppercase tracking-widest">Kategori</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-5 py-3 sm:px-6 sm:py-4 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl font-sans text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-sm sm:text-base appearance-none"
                            >
                                <option value="" disabled>Pilih Kategori</option>
                                {KNOWLEDGE_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2 font-sans uppercase tracking-widest">Link Video (Opsional)</label>
                            <input
                                type="url"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                placeholder="https://youtube.com/..."
                                className="w-full px-5 py-3 sm:px-6 sm:py-4 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl font-sans text-oxford-900 dark:text-white placeholder:text-oxford-400 focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-sm sm:text-base"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2 font-sans uppercase tracking-widest">Deskripsi</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Berikan penjelasan singkat mengenai item pengetahuan ini..."
                                rows={5}
                                className="w-full px-5 py-3 sm:px-6 sm:py-4 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl font-sans text-oxford-900 dark:text-white placeholder:text-oxford-400 focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all resize-y text-sm sm:text-base"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-center">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-16 py-4 rounded-full font-sans font-bold text-lg transition-all active:scale-95 flex items-center gap-3 shadow-xl ${isSubmitting ? 'bg-oxford-200 dark:bg-oxford-800 text-oxford-400' : 'bg-oxford-950 text-white hover:bg-gold-500 hover:text-oxford-950 hover:shadow-gold-500/30'}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={24} /> Memproses...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={24} /> Selesaikan Upload
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
