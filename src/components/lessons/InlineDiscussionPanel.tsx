"use client";

import { useState, useCallback } from "react";
import { MessageSquare, Send, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { getLessonDiscussions, addDiscussion, deleteDiscussion } from "@/app/actions/discussions";
import { optimizeAvatar } from "@/lib/utils";

interface LessonDiscussion {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    name: string;
    image?: string | null;
}

interface InlineDiscussionPanelProps {
    lessonId: string;
    currentUserId: string;
    currentUserRole: string;
}

export default function InlineDiscussionPanel({
    lessonId,
    currentUserId,
    currentUserRole,
}: InlineDiscussionPanelProps) {
    const [open, setOpen] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [discussions, setDiscussions] = useState<LessonDiscussion[]>([]);
    const [commentText, setCommentText] = useState("");
    const [isFetching, setIsFetching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadDiscussions = useCallback(async () => {
        setIsFetching(true);
        const data = await getLessonDiscussions(lessonId);
        setDiscussions(data);
        setLoaded(true);
        setIsFetching(false);
    }, [lessonId]);

    const toggleOpen = () => {
        const next = !open;
        setOpen(next);
        if (next && !loaded) {
            void loadDiscussions();
        }
    };

    const handleAddComment = async () => {
        if (!commentText.trim()) return;
        setIsSubmitting(true);
        const res = await addDiscussion(lessonId, commentText);
        if (res.success) {
            setCommentText("");
            await loadDiscussions();
            toast.success("Diskusi berhasil ditambahkan!");
        } else {
            toast.error(res.error || "Gagal menambahkan diskusi");
        }
        setIsSubmitting(false);
    };

    const handleDeleteComment = async (id: string) => {
        if (!confirm("Hapus diskusi ini?")) return;
        const res = await deleteDiscussion(id);
        if (res.success) {
            await loadDiscussions();
            toast.success("Diskusi berhasil dihapus!");
        } else {
            toast.error(res.error || "Gagal menghapus diskusi");
        }
    };

    return (
        <div className="mt-4 border-t border-oxford-100 dark:border-oxford-800/80 pt-3">
            <button
                type="button"
                onClick={toggleOpen}
                className="inline-flex items-center gap-2 text-xs font-bold text-oxford-600 dark:text-oxford-300 hover:text-oxford-900 dark:hover:text-white transition-colors py-1"
            >
                <MessageSquare size={14} />
                <span>Diskusi Materi {loaded ? `(${discussions.length})` : ""}</span>
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {open && (
                <div className="mt-3 bg-oxford-50/70 dark:bg-oxford-950/40 rounded-xl border border-oxford-100 dark:border-oxford-800 p-4 space-y-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !isSubmitting) handleAddComment();
                            }}
                            placeholder="Tulis pertanyaan atau komentar untuk materi ini..."
                            className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] text-oxford-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                        />
                        <button
                            type="button"
                            onClick={handleAddComment}
                            disabled={isSubmitting || !commentText.trim()}
                            className="px-4 py-2 rounded-xl bg-oxford-900 text-gold-400 hover:bg-oxford-800 disabled:opacity-40 text-xs font-bold flex items-center gap-1.5 shrink-0"
                        >
                            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            <span>Kirim</span>
                        </button>
                    </div>

                    {isFetching ? (
                        <div className="flex items-center gap-2 text-xs text-oxford-500 py-2">
                            <Loader2 size={14} className="animate-spin" /> Memuat diskusi...
                        </div>
                    ) : discussions.length === 0 ? (
                        <p className="text-xs text-oxford-400">Belum ada diskusi pada materi ini.</p>
                    ) : (
                        <div className="space-y-3">
                            {discussions.map((d) => (
                                <div key={d.id} className="flex items-start gap-2.5 bg-white dark:bg-[#161B2A] p-3 rounded-xl border border-oxford-100 dark:border-oxford-800">
                                    {d.image ? (
                                        <Image
                                            src={optimizeAvatar(d.image, 64) || d.image}
                                            alt={d.name}
                                            width={28}
                                            height={28}
                                            className="w-7 h-7 rounded-full object-cover shrink-0"
                                        />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-oxford-200 dark:bg-oxford-800 flex items-center justify-center text-xs font-bold text-oxford-700 dark:text-oxford-200 shrink-0">
                                            {d.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold text-oxford-900 dark:text-white truncate">{d.name}</span>
                                            {(d.user_id === currentUserId || currentUserRole === "admin") && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteComment(d.id)}
                                                    className="text-oxford-400 hover:text-red-500 transition-colors"
                                                    title="Hapus komentar"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-oxford-700 dark:text-oxford-200 mt-1 whitespace-pre-line">{d.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
