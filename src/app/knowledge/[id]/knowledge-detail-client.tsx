"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Edit, ThumbsUp, MessageSquare, Eye, Clock, Share2, Bookmark, FileText } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toggleKnowledgeLike, postKnowledgeComment } from "@/app/actions/knowledge";
import type { AuthUser } from "@/lib/session";

export interface KnowledgeComment {
    id: string;
    authorId: string;
    authorName?: string;
    authorInstansi?: string;
    content: string;
    createdAt: string;
}

export interface KnowledgeAttachment {
    name?: string;
    url?: string;
    createdAt?: string;
}

export interface KnowledgeDetailItem {
    id: string;
    title: string;
    description: string | null;
    category: string;
    tags: string[];
    thumbnailUrl: string | null;
    authorId: string;
    authorName?: string;
    authorInstansi?: string;
    views: number;
    likes: number;
    likedBy: string[];
    privacy: "public" | "internal";
    status: "published" | "draft" | "archived";
    createdAt: string;
    updatedAt: string;
    comments: KnowledgeComment[];
    attachments: KnowledgeAttachment[];
}

export default function KnowledgeDetailClient({ item, serverUser }: { item: KnowledgeDetailItem; serverUser: AuthUser | null }) {
    const { data: sessionData } = authClient.useSession();
    // Use serverUser for initial hydration, then sessionData if it updates
    const user = sessionData?.user || serverUser;
    
    const [likes, setLikes] = useState(item.likes);
    const [likedBy, setLikedBy] = useState<string[]>(item.likedBy || []);
    const [comments, setComments] = useState<KnowledgeComment[]>(item.comments || []);
    
    const [commentText, setCommentText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const hasLiked = user && likedBy.includes(user.id);
    const isAuthor = user && user.id === item.authorId;

    const handleLike = async () => {
        if (!user) {
            alert("Silakan login untuk memberikan like.");
            return;
        }
        const res = await toggleKnowledgeLike(item.id);
        if (res.success) {
            setLikes(res.likes);
            setLikedBy(res.hasLiked 
                ? [...likedBy, user.id] 
                : likedBy.filter(id => id !== user.id)
            );
        }
    };

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return alert("Silakan login untuk berkomentar.");
        if (!commentText.trim()) return;

        setIsSubmitting(true);
        const res = await postKnowledgeComment(item.id, commentText);
        if (res.success) {
            setCommentText("");
            // Optimistic prepend
            setComments([{
                id: "temp_" + Date.now().toString(),
                authorId: user.id,
                authorName: user.name,
                authorInstansi: user.instansiAsal,
                content: commentText.trim(),
                createdAt: new Date().toISOString()
            }, ...comments]);
        } else {
            alert(res.error || "Gagal mengirim komentar");
        }
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 pb-24 font-sans">
            {/* HER0 & HEADER */}
            <div className="bg-white dark:bg-[#161B2A] border-b border-oxford-200 dark:border-oxford-700 sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/knowledge" className="flex items-center text-oxford-500 dark:text-oxford-400 hover:text-gold-600 transition-colors py-2 group">
                        <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium hidden sm:inline">Kembali ke Knowledge Space</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-3 py-1.5 text-oxford-600 dark:text-oxford-300 hover:bg-oxford-50 dark:hover:bg-oxford-950 rounded-lg transition-colors border border-oxford-200 dark:border-oxford-700 shadow-sm text-sm font-bold">
                            <Share2 size={16} /> <span className="hidden sm:inline">Bagikan</span>
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 text-oxford-600 dark:text-oxford-300 hover:bg-oxford-50 dark:hover:bg-oxford-950 rounded-lg transition-colors border border-oxford-200 dark:border-oxford-700 shadow-sm text-sm font-bold">
                            <Bookmark size={16} /> <span className="hidden sm:inline">Simpan</span>
                        </button>
                        {(isAuthor || (user && user.role === 'admin')) && (
                            <Link href={`/knowledge/${item.id}/edit`} className="flex items-center gap-2 px-4 py-1.5 bg-oxford-900 text-white rounded-lg transition-colors shadow-sm text-sm font-bold hover:bg-oxford-800">
                                <Edit size={16} /> Edit Dokumen
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
                
                {/* METADATA TAGS */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    <span className="inline-block bg-gold-50 text-gold-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border border-gold-200">
                        {item.category}
                    </span>
                    {item.privacy === "internal" && (
                        <span className="inline-flex items-center gap-1 bg-crimson-50 text-crimson-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border border-crimson-200">
                            Internal Terbatas
                        </span>
                    )}
                    {item.tags?.map((tag: string) => (
                        <span key={tag} className="inline-block bg-oxford-100 dark:bg-[#161B2A] text-oxford-600 dark:text-oxford-300 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border border-oxford-200 dark:border-oxford-700">
                            #{tag}
                        </span>
                    ))}
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-oxford-900 dark:text-white leading-tight mb-8">
                    {item.title}
                </h1>

                {/* AUTHOR & METRICS */}
                <div className="flex flex-col sm:flex-row pb-8 border-b border-oxford-200 dark:border-oxford-700 gap-6 justify-between items-start sm:items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-oxford-200 dark:bg-oxford-800 rounded-full flex items-center justify-center font-bold text-oxford-600 dark:text-oxford-300 text-lg">
                            {item.authorName?.charAt(0) || "U"}
                        </div>
                        <div>
                            <p className="font-bold text-oxford-900 dark:text-white">{item.authorName}</p>
                            <p className="text-sm text-oxford-500 dark:text-oxford-400">{item.authorInstansi}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 text-oxford-500 dark:text-oxford-400 text-sm font-medium">
                        <div className="flex items-center gap-2">
                            <Clock size={16} />
                            {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2">
                            <Eye size={16} /> {item.views} Dilihat
                        </div>
                        <div className="flex items-center gap-2">
                            <MessageSquare size={16} /> {comments.length} Komentar
                        </div>
                    </div>
                </div>

                {/* THUMBNAIL (IF ANY) */}
                {item.thumbnailUrl && (
                    <div className="relative mt-8 h-[400px] rounded-2xl overflow-hidden shadow-sm border border-oxford-100 dark:border-oxford-800">
                        <Image src={item.thumbnailUrl} fill sizes="(min-width: 1024px) 896px, 100vw" unoptimized className="object-cover" alt={`Sampul ${item.title}`} />
                    </div>
                )}

                {/* CONTENT */}
                <article className="prose prose-lg prose-oxford max-w-none mt-10 text-oxford-700 dark:text-oxford-200 bg-white dark:bg-[#161B2A] p-8 sm:p-12 rounded-3xl shadow-sm border border-oxford-200 dark:border-oxford-700">
                    <p className="lead text-xl text-oxford-900 dark:text-white font-medium">{item.description}</p>
                    
                    {/* Placeholder for complex rendering. Real app would have WYSIWYG HTML here */}
                    <div className="whitespace-pre-line mt-6 leading-relaxed">
                        Dokumen ini adalah ringkasan yang disediakan oleh CorpuKU Knowledge Space. 
                        Isi teknis bisa diakses melalui lampiran (jika ada).
                        <br/><br/>
                        Pemerintah Daerah terus mendorong kapasitas literasi digital ASN. Dengan adanya {item.title}, 
                        diharapkan pelayanan kepada masyarakat menjadi lebih prima dan terukur.
                    </div>
                </article>

                {/* ATTACHMENTS */}
                {item.attachments && item.attachments.length > 0 && (
                    <div className="mt-10">
                        <h3 className="font-bold text-lg text-oxford-900 dark:text-white mb-4">Lampiran ({item.attachments.length})</h3>
                        <div className="space-y-3">
                            {item.attachments.map((file, i) => (
                                <a key={i} href="#" className="flex items-center gap-4 p-4 bg-white dark:bg-[#161B2A] rounded-xl border border-oxford-200 dark:border-oxford-700 hover:border-gold-400 shadow-sm transition-colors group">
                                    <div className="bg-oxford-50 dark:bg-oxford-950 p-3 rounded-lg text-oxford-600 dark:text-oxford-300 group-hover:bg-gold-50 group-hover:text-gold-600 transition-colors">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-oxford-900 dark:text-white group-hover:text-gold-600 transition-colors">{file.name || "Dokumen Lampiran"}</p>
                                        <p className="text-xs text-oxford-500 dark:text-oxford-400">PDF Document • 2.4 MB</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* LIKE ENGAGEMENT BAR */}
                <div className="mt-12 flex justify-center border-b border-oxford-200 dark:border-oxford-700 pb-12">
                    <button 
                        onClick={handleLike}
                        className={`group relative flex items-center gap-3 px-8 py-4 rounded-full font-bold transition-all shadow-sm
                        ${hasLiked 
                            ? 'bg-gold-500 text-oxford-950 hover:bg-gold-400' 
                            : 'bg-white dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 border border-oxford-200 dark:border-oxford-700 hover:gold-50 hover:border-gold-400 hover:text-gold-700'}`}
                    >
                        <ThumbsUp size={24} className={`${hasLiked ? 'fill-oxford-950' : ''} group-hover:-translate-y-1 transition-transform`} /> 
                        <span className="text-lg">Bermanfaat ({likes})</span>
                    </button>
                </div>

                {/* COMMENTS / Q&A SECTION */}
                <div className="mt-12">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-oxford-100 dark:bg-[#161B2A] text-oxford-900 dark:text-white flex items-center justify-center rounded-xl">
                            <MessageSquare size={20} />
                        </div>
                        <h2 className="text-2xl font-bold font-serif text-oxford-900 dark:text-white">Diskusi & Tanya Jawab</h2>
                    </div>

                    {/* Comment Input */}
                    {user ? (
                        <form onSubmit={handlePostComment} className="flex gap-4 items-start mb-10 bg-white dark:bg-[#161B2A] p-6 rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm">
                            <div className="w-10 h-10 bg-oxford-900 text-white rounded-full flex flex-shrink-0 items-center justify-center font-bold">
                                {user.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <textarea 
                                    className="w-full border border-oxford-200 dark:border-oxford-700 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-oxford-50 dark:bg-oxford-950 mb-3 min-h-[100px]"
                                    placeholder="Bagikan pandangan atau ajukan pertanyaan ke penulis..."
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    disabled={isSubmitting}
                                />
                                <div className="flex justify-end">
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting || !commentText.trim()}
                                        className="bg-oxford-900 hover:bg-oxford-800 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-sm"
                                    >
                                        {isSubmitting ? "Mengirim..." : "Kirim Komentar"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="mb-10 bg-oxford-50 dark:bg-oxford-950 p-6 rounded-2xl border border-dashed border-oxford-300 dark:border-oxford-600 text-center">
                            <p className="text-oxford-600 dark:text-oxford-300 mb-4 font-medium">Bantu tingkatkan kualitas dokumen ini dengan memberi tanggapan.</p>
                            <a href="/login" className="bg-gold-500 text-oxford-950 font-bold px-6 py-2 rounded-lg inline-block hover:bg-gold-400">Login untuk Berkomentar</a>
                        </div>
                    )}

                    {/* Comments List */}
                    <div className="space-y-6">
                        {comments.length === 0 ? (
                            <p className="text-center text-oxford-400 py-6 border border-oxford-100 dark:border-oxford-800 bg-white dark:bg-[#161B2A] rounded-2xl border-dashed">Belum ada diskusi untuk dokumen ini. Jadilah yang pertama!</p>
                        ) : (
                            comments.map((c) => (
                                <div key={c.id} className="flex gap-4">
                                    <div className="w-10 h-10 border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] text-oxford-600 dark:text-oxford-300 rounded-full flex flex-shrink-0 items-center justify-center font-bold text-sm">
                                        {c.authorName?.charAt(0) || "U"}
                                    </div>
                                    <div className="flex-1 bg-white dark:bg-[#161B2A] p-5 rounded-2xl border border-oxford-100 dark:border-oxford-800 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-bold text-oxford-900 dark:text-white leading-tight">{c.authorName}</p>
                                                <p className="text-xs text-oxford-500 dark:text-oxford-400">{c.authorInstansi}</p>
                                            </div>
                                            <span className="text-xs text-oxford-400 font-medium">
                                                {new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <p className="text-oxford-700 dark:text-oxford-200 text-sm whitespace-pre-wrap">{c.content}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
