"use server";

import { sql } from "@/lib/db";
import { requireAdminSession } from "./auth";
import { sanitizePlainText, sanitizeRichText } from "@/lib/content-security";
import type { NewsArticle } from "@/lib/types";

interface NewsInput {
    title: string;
    summary: string;
    content: string;
    category?: string;
    imageUrl?: string | null;
    tags?: unknown[];
    status?: string;
}

export async function getAllNews() {
    try {
        const data = await sql`
            SELECT id, title, summary, content, category, 
                   author_id as "authorId", image_url as "imageUrl", 
                   tags, status, views,
                   published_at as "publishedAt", 
                   created_at as "createdAt", 
                   updated_at as "updatedAt" 
            FROM news
            WHERE status = 'published'
            ORDER BY published_at DESC
        `;
        return data;
    } catch { return []; }
}

export async function getAdminNews() {
    try {
        await requireAdminSession();
        return await sql`
            SELECT id, title, summary, content, category,
                   author_id as "authorId", image_url as "imageUrl",
                   tags, status, views, published_at as "publishedAt",
                   created_at as "createdAt", updated_at as "updatedAt"
            FROM news ORDER BY created_at DESC
        `;
    } catch {
        return [];
    }
}

export async function getNewsById(id: string): Promise<NewsArticle | null> {
    try {
        const data = await sql`
            SELECT id, title, summary, content, category, 
                   author_id as "authorId", image_url as "imageUrl", 
                   tags, status, views,
                   published_at as "publishedAt", 
                   created_at as "createdAt", 
                   updated_at as "updatedAt" 
            FROM news 
            WHERE id = ${id} AND status = 'published'
        `;
        return data[0] ? {
            ...(data[0] as unknown as NewsArticle),
            content: sanitizeRichText(String(data[0].content || "")),
        } : null;
    } catch { return null; }
}

export async function createNews(data: NewsInput) {
    try {
        const session = await requireAdminSession();
        if (!data?.title || !data?.summary || !data?.content || !["draft", "published"].includes(data.status || "draft")) {
            return { success: false, error: "Data berita tidak valid." };
        }
        const id = `news_${Date.now()}`;
        const now = new Date().toISOString();
        
        await sql`
            INSERT INTO news (id, title, summary, content, category, author_id, image_url, tags, status, views, published_at, created_at, updated_at)
            VALUES (${id}, ${sanitizePlainText(String(data.title)).slice(0, 255)}, ${sanitizePlainText(String(data.summary)).slice(0, 1000)}, ${sanitizeRichText(String(data.content))}, ${sanitizePlainText(String(data.category || "Umum")).slice(0, 100)}, ${session.user.id}, ${data.imageUrl}, ${Array.isArray(data.tags) ? data.tags.slice(0, 20).map((tag: unknown) => sanitizePlainText(String(tag)).slice(0, 50)) : []}, ${data.status || 'draft'}, 0, ${data.status === 'published' ? now : null}, ${now}, ${now})
        `;
        return { success: true };
    } catch (err) {
        console.error("News create error:", err);
        return { success: false, error: "Gagal membuat berita." };
    }
}

export async function updateNews(id: string, data: NewsInput) {
    try {
        await requireAdminSession();
        if (!data?.title || !data?.summary || !data?.content || !["draft", "published"].includes(data.status || "draft")) {
            return { success: false, error: "Data berita tidak valid." };
        }
        const now = new Date().toISOString();
        await sql`
            UPDATE news SET 
                title = ${sanitizePlainText(String(data.title)).slice(0, 255)},
                summary = ${sanitizePlainText(String(data.summary)).slice(0, 1000)},
                content = ${sanitizeRichText(String(data.content))},
                category = ${sanitizePlainText(String(data.category || "Umum")).slice(0, 100)},
                image_url = ${data.imageUrl}, 
                tags = ${data.tags || []},
                status = ${data.status || 'draft'},
                published_at = CASE WHEN ${data.status || 'draft'} = 'published' THEN COALESCE(published_at, ${now}) ELSE published_at END,
                updated_at = ${now}
            WHERE id = ${id}
        `;
        return { success: true };
    } catch {
        return { success: false, error: "Berita tidak ditemukan." };
    }
}

export async function deleteNews(id: string) {
    try {
        await requireAdminSession();
        await sql`DELETE FROM news WHERE id = ${id}`;
        return { success: true };
    } catch {
        return { success: false, error: "Berita tidak ditemukan." };
    }
}
