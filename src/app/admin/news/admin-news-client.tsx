"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getAdminNews, createNews, updateNews, deleteNews } from "@/app/actions/news";
import type { NewsArticle } from "@/lib/types";
import { Plus, Edit2, Trash2, Search, Loader2 } from "lucide-react";

export default function AdminNewsClient() {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<NewsArticle | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        summary: "",
        content: "",
        category: "Pelatihan",
        imageUrl: "",
        tags: "",
        status: "draft" as "draft" | "published"
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const data = await getAdminNews();
        setNews(data as unknown as NewsArticle[]);
        setLoading(false);
    };

    const handleOpenModal = (item?: NewsArticle) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                title: item.title,
                summary: item.summary,
                content: item.content,
                category: item.category,
                imageUrl: item.imageUrl || "",
                tags: item.tags.join(", "),
                status: item.status
            });
        } else {
            setEditingItem(null);
            setFormData({
                title: "",
                summary: "",
                content: "",
                category: "Pelatihan",
                imageUrl: "",
                tags: "",
                status: "draft"
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        
        const tagsArray = formData.tags.split(",").map(t => t.trim()).filter(t => t);
        
        const payload = {
            title: formData.title,
            summary: formData.summary,
            content: formData.content,
            category: formData.category,
            imageUrl: formData.imageUrl || null,
            tags: tagsArray,
            status: formData.status,
            authorId: editingItem ? editingItem.authorId : "",
            views: editingItem ? editingItem.views : 0,
            publishedAt: formData.status === "published" && (!editingItem || editingItem.status === "draft") 
                         ? new Date() 
                         : (editingItem ? editingItem.publishedAt : new Date())
        };

        let result;
        if (editingItem) {
            result = await updateNews(editingItem.id, payload);
        } else {
            result = await createNews(payload);
        }

        if (result.success) {
            await fetchData();
            setIsModalOpen(false);
        } else {
            alert(result.error || "Terjadi kesalahan saat menyimpan berita.");
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus artikel ini?")) {
            await deleteNews(id);
            await fetchData();
        }
    };

    const filteredNews = news.filter(n => 
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        n.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-oxford-900 dark:text-white mb-2">Manajemen Berita</h1>
                    <p className="text-oxford-500 dark:text-oxford-400 text-sm">Kelola artikel pusat pengetahuan, pengumuman, dan berita resmi.</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-xl transition-colors shadow-sm"
                >
                    <Plus size={18} /> Tambah Artikel
                </button>
            </div>

            <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-border-base shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border-base flex items-center justify-between bg-oxford-50 dark:bg-oxford-950/50">
                    <div className="relative w-full max-w-[280px] hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-oxford-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari berita berdasarkan judul..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-1.5 border border-border-base rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-oxford-50 dark:bg-oxford-950 text-oxford-600 dark:text-oxford-300 font-medium">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 border-l border-border-base">Judul & Kategori</th>
                                <th className="px-6 py-4 border-l border-border-base">Dibaca</th>
                                <th className="px-6 py-4 border-l border-border-base">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-base">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-oxford-400">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                        Memuat data...
                                    </td>
                                </tr>
                            ) : filteredNews.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-oxford-400">
                                        Tidak ada berita ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                filteredNews.map((item) => (
                                    <tr key={item.id} className="hover:bg-oxford-50 dark:hover:bg-oxford-950/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                item.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-oxford-100 dark:bg-[#161B2A] text-oxford-600 dark:text-oxford-300'
                                            }`}>
                                                {item.status === 'published' ? 'Publik' : 'Draft'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 border-l border-border-base">
                                            <div className="font-bold text-oxford-900 dark:text-white mb-1 truncate max-w-[300px] lg:max-w-md">{item.title}</div>
                                            <div className="text-xs text-gold-600 font-bold uppercase">{item.category}</div>
                                        </td>
                                        <td className="px-6 py-4 border-l border-border-base text-oxford-600 dark:text-oxford-300 font-medium">
                                            {item.views}
                                        </td>
                                        <td className="px-6 py-4 border-l border-border-base">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleOpenModal(item)}
                                                    className="p-1.5 text-oxford-400 hover:text-gold-600 hover:bg-gold-50 rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-1.5 text-oxford-400 hover:text-crimson-600 hover:bg-crimson-50 rounded transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Editor */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-oxford-950/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-[#161B2A] rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col my-8">
                        <div className="shrink-0 p-6 border-b border-border-base flex items-center justify-between">
                            <h2 className="text-xl font-bold text-oxford-900 dark:text-white">{editingItem ? "Edit Artikel" : "Tambah Artikel Baru"}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-300">✕</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6">
                            <form id="news-form" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-sm font-bold text-oxford-900 dark:text-white block">Judul Artikel *</label>
                                        <input 
                                            required
                                            type="text" 
                                            value={formData.title}
                                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                                            className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-oxford-900 dark:text-white block">Kategori *</label>
                                        <select 
                                            value={formData.category}
                                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                                            className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                                        >
                                            <option value="Pelatihan">Pelatihan</option>
                                            <option value="Regulasi">Regulasi</option>
                                            <option value="Kerjasama">Kerjasama</option>
                                            <option value="Kelembagaan">Kelembagaan</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-oxford-900 dark:text-white block">Status Publikasi *</label>
                                        <select 
                                            value={formData.status}
                                            onChange={(e) => setFormData({...formData, status: e.target.value as "draft" | "published"})}
                                            className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                                        >
                                            <option value="draft">Draft (Sembunyikan)</option>
                                            <option value="published">Publik (Tampilkan)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-sm font-bold text-oxford-900 dark:text-white block">Ringkasan (Summary) *</label>
                                        <textarea 
                                            required
                                            value={formData.summary}
                                            onChange={(e) => setFormData({...formData, summary: e.target.value})}
                                            rows={2}
                                            className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 resize-none"
                                            placeholder="Ringkasan singkat untuk ditampilkan di thumbnail..."
                                        />
                                    </div>
                                    
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-sm font-bold text-oxford-900 dark:text-white block">Konten Lengkap (HTML Didukung) *</label>
                                        <textarea 
                                            required
                                            value={formData.content}
                                            onChange={(e) => setFormData({...formData, content: e.target.value})}
                                            rows={8}
                                            className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 font-mono"
                                            placeholder="<p>Mulai menulis paragraf pertama...</p>"
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-oxford-900 dark:text-white block">Gambar Artikel (Cloud Storage)</label>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                            {formData.imageUrl ? (
                                                <div className="relative w-full sm:w-48 aspect-video rounded-xl overflow-hidden border border-border-base group">
                                                    <Image fill unoptimized src={formData.imageUrl} alt="Preview" className="object-cover" />
                                                    <button 
                                                        type="button"
                                                        onClick={() => setFormData({...formData, imageUrl: ""})}
                                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs"
                                                    >
                                                        Hapus Gambar
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center justify-center w-full sm:w-48 aspect-video border-2 border-dashed border-oxford-200 dark:border-oxford-700 rounded-xl cursor-pointer hover:border-gold-500 hover:bg-gold-50/50 transition-all">
                                                    <Plus className="text-oxford-400 mb-1" size={20} />
                                                    <span className="text-[10px] font-bold text-oxford-500 dark:text-oxford-400 uppercase">Upload Gambar</span>
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            setSaving(true);
                                                            try {
                                                                const fd = new FormData();
                                                                fd.append("file", file);
                                                                const res = await fetch("/api/upload", { method: "POST", body: fd });
                                                                const result = await res.json();
                                                                if (result.success) {
                                                                    setFormData({...formData, imageUrl: result.url});
                                                                }
                                                            } catch {
                                                                alert("Gagal upload gambar.");
                                                            } finally {
                                                                setSaving(false);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            )}
                                            <div className="flex-1">
                                                <p className="text-[10px] text-oxford-400 mb-2 italic">Rekomendasi ukuran: 1200x630px (Aspek rasio 1.91:1). Maks 5MB.</p>
                                                <input 
                                                    type="text" 
                                                    value={formData.imageUrl}
                                                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                                                    className="w-full px-3 py-2 border rounded-lg text-[10px] bg-oxford-50 dark:bg-oxford-950 focus:outline-none"
                                                    placeholder="Atau tempel URL gambar di sini..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-bold text-oxford-900 dark:text-white block">Tags (Pisahkan dengan koma)</label>
                                        <input 
                                            type="text" 
                                            value={formData.tags}
                                            onChange={(e) => setFormData({...formData, tags: e.target.value})}
                                            className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                                            placeholder="PKA, Latsar, CPNS..."
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="shrink-0 p-6 border-t border-border-base bg-oxford-50 dark:bg-oxford-950 flex justify-end gap-3 rounded-b-2xl">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2.5 text-sm font-bold text-oxford-600 dark:text-oxford-300 hover:bg-oxford-100 dark:hover:bg-[#161B2A] rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button 
                                type="submit" 
                                form="news-form"
                                disabled={saving}
                                className="px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-oxford-950 text-sm font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center min-w-[120px]"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : "Simpan Artikel"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
