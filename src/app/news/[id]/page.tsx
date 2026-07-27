"use client";

import { useEffect, useState, use } from "react";
import { getNewsById } from "@/app/actions/news";
import type { NewsArticle } from "@/lib/types";
import { normalizeNewsArticle } from "@/lib/news-normalize";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, Calendar, Eye, Share2, Printer, Loader2 } from "lucide-react";

export default function NewsArticlePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;
    const [article, setArticle] = useState<NewsArticle | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchArticle = async () => {
            const data = normalizeNewsArticle(await getNewsById(id));
            if (data?.status === "published") {
                setArticle(data);
            } else {
                setArticle(null);
            }
            setLoading(false);
        };
        fetchArticle();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-oxford-50 dark:bg-oxford-950">
                <div className="flex flex-col items-center text-oxford-400">
                    <Loader2 size={48} className="animate-spin mb-4" />
                    <p className="text-xl">Memuat artikel...</p>
                </div>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-oxford-50 dark:bg-oxford-950 px-4 text-center">
                <h1 className="font-serif text-5xl font-bold text-oxford-900 dark:text-white mb-4">Artikel Tidak Ditemukan</h1>
                <p className="text-oxford-500 dark:text-oxford-400 mb-8 max-w-md mx-auto">Kami tidak dapat menemukan berita yang Anda cari. Mungkin artikel tersebut telah dihapus atau ditarik (unpublish).</p>
                <button 
                    onClick={() => router.push("/news")}
                    className="px-6 py-3 bg-gold-500 text-oxford-950 font-bold rounded-xl hover:bg-gold-400 transition-colors"
                >
                    Kembali ke Berita Utama
                </button>
            </div>
        );
    }

    const formattedDate = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit'
    }).format(new Date(article.publishedAt || article.createdAt));

    return (
        <article className="min-h-screen bg-oxford-50 dark:bg-oxford-950 pb-20">
            {/* Top Navigation Bar / Breadcrumb */}
            <div className="bg-white dark:bg-[#161B2A] border-b border-border-base sticky top-20 z-40">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <button 
                        onClick={() => router.push("/news")}
                        className="flex items-center gap-2 text-sm font-semibold text-oxford-500 dark:text-oxford-400 hover:text-gold-600 transition-colors"
                    >
                        <ChevronLeft size={18} /> Kembali ke Media Center
                    </button>
                    
                    <div className="flex items-center gap-4">
                        <button className="text-oxford-400 hover:text-gold-600 transition-colors p-2 rounded-full hover:bg-gold-50" title="Bagikan">
                            <Share2 size={18} />
                        </button>
                        <button className="text-oxford-400 hover:text-gold-600 transition-colors p-2 rounded-full hover:bg-gold-50" title="Cetak">
                            <Printer size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 pt-10 md:pt-16 max-w-4xl">
                
                {/* Article Header */}
                <header className="mb-10 lg:text-center">
                    <span className="inline-block px-4 py-1.5 bg-gold-500/10 text-gold-600 font-bold uppercase tracking-wider text-xs rounded-full mb-6 border border-gold-500/20">
                        {article.category}
                    </span>
                    
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-black text-foreground leading-tight md:leading-tight mb-6 lg:mx-auto">
                        {article.title}
                    </h1>

                    <p className="text-lg md:text-xl text-oxford-500 dark:text-oxford-400 font-medium leading-relaxed mb-8 max-w-3xl lg:mx-auto">
                        {article.summary}
                    </p>

                    <div className="flex flex-wrap items-center lg:justify-center gap-4 md:gap-8 text-sm text-oxford-400 py-6 border-y border-border-base/50">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} /> <span>{formattedDate} WIB</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Eye size={16} /> <span>{(article.views || 0).toLocaleString('id-ID')} Pembaca</span>
                        </div>
                    </div>
                </header>

                {/* Main Hero Image */}
                {article.imageUrl && (
                    <figure className="mb-12">
                        <div className="relative w-full h-[300px] md:h-[500px] rounded-2xl overflow-hidden bg-oxford-100 dark:bg-[#161B2A] shadow-sm border border-border-base">
                            <Image src={article.imageUrl} alt={article.title} fill priority sizes="(min-width: 1024px) 896px, 100vw" unoptimized className="object-cover" />
                        </div>
                        <figcaption className="text-sm text-oxford-400 mt-3 text-center italic">
                            Dokumentasi - CorpuKU / BPSDM Kaltara
                        </figcaption>
                    </figure>
                )}

                {/* Article Content */}
                <div 
                    className="prose prose-lg md:prose-xl max-w-none prose-headings:font-serif prose-headings:font-bold prose-headings:text-oxford-900 dark:prose-headings:text-white prose-p:text-oxford-700 dark:prose-p:text-oxford-200 prose-a:text-gold-600 hover:prose-a:text-gold-500 prose-strong:text-oxford-900 dark:prose-strong:text-white font-serif leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: article.content }}
                />

                {/* Article Footer & Tags */}
                <div className="mt-16 pt-8 border-t border-border-base">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-oxford-500 dark:text-oxford-400 mr-2">Tag:</span>
                        {article.tags.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-oxford-100 dark:bg-[#161B2A] text-oxford-600 dark:text-oxford-300 text-sm font-medium rounded-lg hover:bg-oxford-200 dark:hover:bg-oxford-800 transition-colors cursor-pointer">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>

            </main>
        </article>
    );
}
