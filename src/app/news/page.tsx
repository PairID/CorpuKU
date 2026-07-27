"use client";

import { useEffect, useState } from "react";
import { getAllNews } from "@/app/actions/news";
import type { NewsArticle } from "@/lib/types";
import { NewsCard } from "@/components/news/NewsCard";
import { Loader2, TrendingUp, Newspaper } from "lucide-react";
import { normalizeNewsArticle } from "@/lib/news-normalize";

const CATEGORIES = ["Semua", "Pelatihan", "Regulasi", "Kerjasama", "Kelembagaan"];

export default function NewsPage() {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("Semua");

    useEffect(() => {
        const fetchNews = async () => {
            const data = await getAllNews();
            const published = data
                .map(normalizeNewsArticle)
                .filter((article): article is NewsArticle => article?.status === "published");
            setArticles(published);
            setLoading(false);
        };
        fetchNews();
    }, []);

    const filteredArticles = selectedCategory === "Semua" 
        ? articles 
        : articles.filter(a => a.category === selectedCategory);

    const topStory = filteredArticles[0];
    const secondaryStories = filteredArticles.slice(1, 4); // Max 3 items
    const remainingStories = filteredArticles.slice(4);

    return (
        <div className="bg-oxford-50 dark:bg-oxford-950 min-h-screen pb-16">
            {/* Header / Title Area */}
            <div className="bg-white dark:bg-[#161B2A] border-b border-border-base">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center gap-3 text-gold-500 mb-2">
                        <Newspaper size={24} />
                        <span className="font-bold tracking-wide uppercase text-sm">Media Center</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground">Berita & Pers</h1>
                    <p className="mt-3 text-oxford-500 dark:text-oxford-400 max-w-2xl text-lg">Informasi terbaru seputar kegiatan, kebijakan, dan inovasi pengembangan SDM Aparatur.</p>
                </div>
                
                {/* Category Navigation (Google News style tabs) */}
                <div className="container mx-auto px-4 mt-6">
                    <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-px border-b border-transparent">
                        {CATEGORIES.map(category => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`whitespace-nowrap px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                                    selectedCategory === category 
                                    ? "border-gold-500 text-gold-600" 
                                    : "border-transparent text-oxford-400 hover:text-foreground"
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 pt-8">
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center text-oxford-400">
                        <Loader2 size={32} className="animate-spin mb-4" />
                        <p>Memuat berita terbaru...</p>
                    </div>
                ) : filteredArticles.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-oxford-400">
                        <Newspaper size={48} className="mb-4 opacity-50" />
                        <p className="text-lg">Belum ada berita di kategori ini.</p>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Main Feed Column */}
                        <div className="flex-1 w-full space-y-10">
                            
                            {/* Headline Section (Top Story + 3 Side Stories) */}
                            {topStory && (
                                <section>
                                    <div className="flex items-center gap-2 mb-6 pb-2 border-b-2 border-oxford-900 inline-flex">
                                        <h2 className="font-bold text-xl uppercase tracking-wider text-oxford-900 dark:text-white">Sorotan Utama</h2>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                        <div className="md:col-span-12 lg:col-span-8">
                                            <NewsCard {...topStory} variant="hero" />
                                        </div>
                                        {secondaryStories.length > 0 && (
                                            <div className="md:col-span-12 lg:col-span-4 flex flex-col gap-6">
                                                {secondaryStories.map(story => (
                                                    <div key={story.id} className="flex-1">
                                                        <NewsCard {...story} variant="list" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Feed Section */}
                            {remainingStories.length > 0 && (
                                <section className="pt-4 border-t border-border-base">
                                     <div className="flex items-center gap-2 mb-6 pb-2 border-b-2 border-oxford-900 inline-flex">
                                        <h2 className="font-bold text-xl uppercase tracking-wider text-oxford-900 dark:text-white">Berita Lainnya</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {remainingStories.map(story => (
                                            <NewsCard key={story.id} {...story} variant="grid" />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Sidebar */}
                        <aside className="w-full lg:w-80 shrink-0 space-y-8 sticky top-24">
                            <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-border-base shadow-sm p-6">
                                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border-base">
                                    <TrendingUp className="text-gold-500" size={20} />
                                    <h3 className="font-bold text-lg text-oxford-900 dark:text-white">Terpopuler</h3>
                                </div>
                                <div className="space-y-6">
                                    {/* Pick top 4 by views overall (bypassing category filter to show site-wide trends) */}
                                    {articles.slice().sort((a,b) => (b.views || 0) - (a.views || 0)).slice(0, 4).map((story, i) => (
                                        <a href={`/news/${story.id}`} key={story.id} className="flex gap-4 group items-start">
                                            <span className="text-3xl font-serif font-black text-oxford-200 group-hover:text-gold-200 transition-colors leading-none">
                                                {i + 1}
                                            </span>
                                            <div>
                                                <h4 className="font-bold text-sm text-foreground group-hover:text-gold-600 transition-colors line-clamp-2 mb-1 leading-snug">
                                                    {story.title}
                                                </h4>
                                                <span className="text-xs text-oxford-400 font-medium">
                                                    {new Intl.DateTimeFormat('id-ID', {day: 'numeric', month: 'short'}).format(new Date(story.publishedAt || story.createdAt))}
                                                </span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
}
