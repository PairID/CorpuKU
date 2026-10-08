"use server";

import { sql } from "@/lib/db";

export type SearchResultType = "course" | "knowledge" | "news" | "webinar" | "path";

export interface GlobalSearchResult {
    id: string;
    type: SearchResultType;
    title: string;
    description: string;
    category: string;
    imageUrl?: string | null;
    score: number;
    url: string;
}

export async function globalSearch(query: string): Promise<GlobalSearchResult[]> {
    const normalizedQuery = query?.trim().slice(0, 100);
    if (!normalizedQuery || normalizedQuery.length < 2) return [];

    try {
        const q = `%${normalizedQuery.replace(/[\\%_]/g, "\\$&")}%`;
        
        const [courseResults, knowledgeResults, newsResults, webinarResults, pathResults] = await Promise.all([
            sql`
                SELECT id, title, description, category, thumbnail_url as "imageUrl"
                FROM courses 
                WHERE status = 'active' AND (title ILIKE ${q} OR description ILIKE ${q})
                LIMIT 5
            `,
            sql`
                SELECT id, title, description, category, thumbnail_url as "imageUrl"
                FROM knowledge_items
                WHERE status = 'published' AND privacy = 'public'
                  AND (title ILIKE ${q} OR description ILIKE ${q})
                LIMIT 5
            `,
            sql`
                SELECT id, title, summary as description, category, image_url as "imageUrl"
                FROM news
                WHERE status = 'published' AND (title ILIKE ${q} OR summary ILIKE ${q} OR content ILIKE ${q})
                LIMIT 5
            `,
            sql`
                SELECT id, title, description, 'Webinar' AS category, thumbnail_url as "imageUrl"
                FROM webinars
                WHERE (title ILIKE ${q} OR description ILIKE ${q}) AND status = 'published'
                LIMIT 5
            `,
            sql`
                SELECT id, slug, title, description, 'Learning Path' AS category, thumbnail_url AS "imageUrl"
                FROM learning_paths
                WHERE status = 'published' AND visibility = 'public'
                  AND (title ILIKE ${q} OR description ILIKE ${q})
                LIMIT 5
            `,
        ]);

        type SearchRow = Record<string, unknown>;
        const text = (value: unknown) => value ? String(value) : "";

        const results: GlobalSearchResult[] = [
            ...courseResults.map((r: SearchRow) => ({
                id: text(r.id),
                type: "course" as SearchResultType,
                title: text(r.title), description: text(r.description), category: text(r.category),
                imageUrl: r.imageUrl ? text(r.imageUrl) : null, score: 100, url: `/courses/${text(r.id)}`,
            })),
            ...knowledgeResults.map((r: SearchRow) => ({
                id: text(r.id),
                type: "knowledge" as SearchResultType,
                title: text(r.title), description: text(r.description), category: text(r.category),
                imageUrl: r.imageUrl ? text(r.imageUrl) : null, score: 90, url: `/knowledge/${text(r.id)}`,
            })),
            ...newsResults.map((r: SearchRow) => ({
                id: text(r.id),
                type: "news" as SearchResultType,
                title: text(r.title), description: text(r.description), category: text(r.category),
                imageUrl: r.imageUrl ? text(r.imageUrl) : null, score: 80, url: `/news/${text(r.id)}`,
            })),
            ...webinarResults.map((r: SearchRow) => ({
                id: text(r.id),
                type: "webinar" as SearchResultType,
                title: text(r.title), description: text(r.description), category: text(r.category),
                imageUrl: r.imageUrl ? text(r.imageUrl) : null, score: 95, url: `/webinars/${text(r.id)}`,
            })),
            ...pathResults.map((r: SearchRow) => ({
                id: text(r.id), type: "path" as SearchResultType, title: text(r.title),
                description: text(r.description), category: "Learning Path",
                imageUrl: r.imageUrl ? text(r.imageUrl) : null, score: 98, url: `/paths/${text(r.slug)}`,
            })),
        ];

        return results.sort((a, b) => b.score - a.score).slice(0, 10);
    } catch (err) {
        console.error("Global search error:", err);
        return [];
    }
}
