import type { NewsArticle } from "@/lib/types";

export function normalizeNewsArticle(value: unknown): NewsArticle | null {
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    if (!row.id || !row.title) return null;
    const createdAt = typeof row.createdAt === "string" && row.createdAt
        ? row.createdAt
        : new Date(0).toISOString();
    return {
        id: String(row.id),
        title: String(row.title),
        summary: String(row.summary || ""),
        content: String(row.content || ""),
        category: String(row.category || "Umum"),
        authorId: String(row.authorId || ""),
        imageUrl: String(row.imageUrl || ""),
        tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
        views: Number(row.views || 0),
        status: row.status === "draft" ? "draft" : "published",
        publishedAt: typeof row.publishedAt === "string" && row.publishedAt ? row.publishedAt : createdAt,
        createdAt,
    };
}
