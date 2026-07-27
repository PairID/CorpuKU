"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { updateKnowledgeItem } from "@/app/actions/knowledge";
import { useRouter } from "next/navigation";
import { KNOWLEDGE_CATEGORIES } from "@/lib/constants";
import Link from "next/link";

export interface EditableKnowledgeItem {
    id: string;
    title: string;
    category: string;
    description: string | null;
    videoUrl: string | null;
    privacy: "public" | "internal";
    status: "published" | "draft" | "archived";
    createdAt: string | null;
    updatedAt: string | null;
}

export default function KMSEditClient({ item }: { item: EditableKnowledgeItem }) {
    const [title, setTitle] = useState(item.title);
    const [category, setCategory] = useState(item.category);
    const [description, setDescription] = useState(item.description || "");
    const [videoUrl, setVideoUrl] = useState(item.videoUrl || "");
    const [privacy, setPrivacy] = useState(item.privacy || "public");
    const [status, setStatus] = useState(item.status || "published");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !category) {
            setError("Judul dan Kategori wajib diisi.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const result = await updateKnowledgeItem(item.id, {
            title,
            category,
            description,
            videoUrl,
            privacy,
            status
        });

        if (result.error) {
            setError(result.error);
            setIsSubmitting(false);
        } else {
            router.push(`/knowledge/${item.id}`);
            router.refresh();
        }
    };

    return (
        <div className="bg-oxford-50 dark:bg-oxford-950 min-h-screen py-16 sm:py-24">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="mb-8">
                    <Link href={`/knowledge/${item.id}`} className="inline-flex items-center gap-2 text-oxford-600 dark:text-oxford-300 hover:text-gold-600 font-bold transition-colors">
                        <ArrowLeft size={18} /> Kembali ke Detail
                    </Link>
                </div>

                <div className="bg-white dark:bg-[#161B2A] rounded-3xl shadow-xl shadow-oxford-950/5 border border-oxford-100 dark:border-oxford-800 overflow-hidden">
                    <div className="bg-oxford-950 p-8 sm:p-12 text-center text-white">
                        <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-4">Edit Pengetahuan</h1>
                        <p className="text-oxford-300 font-sans tracking-wide">Perbarui informasi naskah atau dokumen yang telah Anda bagikan.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 sm:p-12">

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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2 font-sans uppercase tracking-widest">Judul Pengetahuan</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Misal: Panduan Keamanan Siber 2026"
                                    className="w-full px-5 py-3 sm:px-6 sm:py-4 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl font-sans text-oxford-900 dark:text-white placeholder:text-oxford-400 focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2 font-sans uppercase tracking-widest">Kategori</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-5 py-3 sm:px-6 sm:py-4 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl font-sans text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all appearance-none"
                                >
                                    <option value="" disabled>Pilih Kategori</option>
                                    {KNOWLEDGE_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2 font-sans uppercase tracking-widest">Link Video (YouTube/Vimeo)</label>
                                <input
                                    type="url"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-5 py-3 sm:px-6 sm:py-4 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl font-sans text-oxford-900 dark:text-white placeholder:text-oxford-400 focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2 font-sans uppercase tracking-widest">Aksesibilitas</label>
                                <select
                                    value={privacy}
                                    onChange={(e) => setPrivacy(e.target.value === "internal" ? "internal" : "public")}
                                    className="w-full px-5 py-3 sm:px-6 sm:py-4 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl font-sans text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all appearance-none"
                                >
                                    <option value="public">Publik (Tamu bisa lihat)</option>
                                    <option value="internal">Internal (Wajib Login)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2 font-sans uppercase tracking-widest">Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(
                                        e.target.value === "draft" || e.target.value === "archived" ? e.target.value : "published"
                                    )}
                                    className="w-full px-5 py-3 sm:px-6 sm:py-4 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl font-sans text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all appearance-none"
                                >
                                    <option value="published">Dipublikasikan</option>
                                    <option value="draft">Simpan Draft</option>
                                    <option value="archived">Arsip</option>
                                </select>
                            </div>
                        </div>

                        <div className="mb-12">
                            <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2 font-sans uppercase tracking-widest">Deskripsi Ringkas</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Jelaskan secara singkat mengenai dokumen ini..."
                                rows={5}
                                className="w-full px-5 py-3 sm:px-6 sm:py-4 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl font-sans text-oxford-900 dark:text-white placeholder:text-oxford-400 focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all resize-none"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-oxford-50 dark:bg-oxford-950 p-6 rounded-2xl">
                            <p className="text-xs text-oxford-500 dark:text-oxford-400 max-w-xs font-medium">Pastikan semua informasi sudah benar sebelum disimpan. Perubahan akan langsung terlihat oleh pengguna.</p>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full sm:w-auto px-10 py-4 rounded-xl font-sans font-bold transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg ${isSubmitting ? 'bg-oxford-200 dark:bg-oxford-800 text-oxford-400' : 'bg-gold-500 text-oxford-950 hover:bg-gold-400 hover:shadow-gold-500/20'}`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} /> Memproses...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={20} /> Simpan Perubahan
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
