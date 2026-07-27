"use server";

import { sql } from "@/lib/db";
import { getAuthSession } from "@/app/actions/auth";
import { sanitizePlainText } from "@/lib/content-security";

// --- Queries ---

interface KnowledgeInput {
    title: string;
    description: string;
    category?: string;
    tags?: unknown[];
    thumbnailUrl?: string | null;
    videoUrl?: string | null;
    privacy?: string;
    status?: string;
    attachments?: unknown[];
}

interface KnowledgeComment {
    id?: string;
    authorId: string;
    content?: string;
    createdAt: string;
    [key: string]: unknown;
}

interface KnowledgeItemRecord {
    id: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
    thumbnailUrl: string | null;
    videoUrl: string | null;
    authorId: string;
    views: number;
    likes: number;
    likedBy: string[];
    privacy: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

function parseKnowledgeComments(value: unknown): KnowledgeComment[] {
    let parsed = value;
    if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed) as unknown; } catch { return []; }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((comment): comment is KnowledgeComment => {
        if (!comment || typeof comment !== "object") return false;
        const item = comment as Record<string, unknown>;
        return typeof item.authorId === "string" && typeof item.createdAt === "string";
    });
}

export async function getAllKnowledgeItems(query?: string, category?: string) {
    const auth = await getAuthSession();
    const user = auth?.user;
    const isGuest = !user;

    try {
        // Base query with author join
        let baseQuery = `
            SELECT k.id, k.title, k.description, k.category, k.tags, 
                   k.thumbnail_url as "thumbnailUrl", k.video_url as "videoUrl", 
                   k.author_id as "authorId", k.views, k.likes, 
                   k.liked_by as "likedBy", k.privacy, k.status, 
                   k.created_at as "createdAt", k.updated_at as "updatedAt",
                   u.name as "authorName", u.instansi_asal as "authorInstansi"
            FROM knowledge_items k
            LEFT JOIN users u ON k.author_id = u.id
            WHERE 1=1
        `;
        const params: string[] = [];
        let counter = 1;

        // 1. Privacy & Status filtering
        if (isGuest) {
            baseQuery += ` AND k.privacy = 'public'`;
        }
        if (!user || user.role !== 'admin') {
            baseQuery += ` AND k.status = 'published'`;
        }

        // 2. Search query
        if (query) {
            const searchQuery = `%${query}%`;
            baseQuery += ` AND (k.title ILIKE $${counter} OR k.description ILIKE $${counter})`;
            params.push(searchQuery);
            counter++;
        }

        // 3. Category filter
        if (category && category !== "Semua") {
            baseQuery += ` AND k.category = $${counter}`;
            params.push(category);
            counter++;
        }

        baseQuery += ` ORDER BY k.created_at DESC`;
        
        const results = await sql.query(baseQuery, params);
        return results;
    } catch (err) {
        console.error("Knowledge fetch error:", err);
        return [];
    }
}

export async function getKnowledgeItemById(id: string): Promise<(KnowledgeItemRecord & { comments: Array<KnowledgeComment & { authorName: string; authorInstansi: string }> }) | null> {
    const auth = await getAuthSession();
    const user = auth?.user;
    
    try {
        const itemRes = await sql`
            SELECT k.id, k.title, k.description, k.category, k.tags, 
                   k.thumbnail_url as "thumbnailUrl", k.video_url as "videoUrl", 
                   k.author_id as "authorId", k.views, k.likes, 
                   k.liked_by as "likedBy", k.privacy, k.status, 
                   k.created_at as "createdAt", k.updated_at as "updatedAt",
                   u.name as "authorName", u.instansi_asal as "authorInstansi"
            FROM knowledge_items k
            LEFT JOIN users u ON k.author_id = u.id
            WHERE k.id = ${id}
        `;
        const item = itemRes[0];
        
        if (!item) return null;
        
        // Privacy guard
        if (item.privacy === "internal" && !user) {
            throw new Error("Anda harus login untuk membaca dokumen internal ini.");
        }
        if (item.status === "draft" && (!user || (user.role !== "admin" && user.id !== item.authorId))) {
            throw new Error("Dokumen ini masih berstatus draft.");
        }

        // Populate comments authors manually since it's JSONB
        const comments = parseKnowledgeComments(item.comments);

        const populatedComments = await Promise.all(comments.map(async (c) => {
            const authorRes = await sql`SELECT name, instansi_asal FROM users WHERE id = ${c.authorId}`;
            const author = authorRes[0];
            return {
                ...c,
                authorName: author ? author.name : "Pengguna Tidak Dikenal",
                authorInstansi: author ? author.instansi_asal : "Instansi"
            };
        }));

        return {
            ...(item as unknown as KnowledgeItemRecord),
            comments: populatedComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        };
    } catch (err: unknown) {
        console.error("Failed to get knowledge item:", err);
        throw err;
    }
}

// --- Mutations ---

export async function createKnowledgeItem(data: KnowledgeInput) {
    const auth = await getAuthSession();
    const user = auth?.user;
    if (!user) throw new Error("Unauthorized");

    try {
        if (!data?.title || !data?.description || !["public", "internal"].includes(data.privacy || "public")) {
            return { success: false, error: "Data pengetahuan tidak valid." };
        }
        const id = "know_" + Date.now();
        const now = new Date().toISOString();
        const status = user.role === "admin" && data.status === "published" ? "published" : "draft";

        await sql`
            INSERT INTO knowledge_items (id, title, description, category, tags, thumbnail_url, video_url, author_id, views, likes, liked_by, privacy, status, created_at, updated_at, attachments, comments)
            VALUES (${id}, ${sanitizePlainText(String(data.title)).slice(0, 255)}, ${sanitizePlainText(String(data.description)).slice(0, 5000)}, ${sanitizePlainText(String(data.category || "Umum")).slice(0, 100)}, ${Array.isArray(data.tags) ? data.tags.slice(0, 20).map((tag: unknown) => sanitizePlainText(String(tag)).slice(0, 50)) : []}, ${data.thumbnailUrl}, ${data.videoUrl}, ${user.id}, 0, 0, '[]', ${data.privacy || 'public'}, ${status}, ${now}, ${now}, '[]', '[]')
        `;
        return { success: true, id };
    } catch (err) {
        console.error("Create knowledge error:", err);
        return { success: false, error: "Gagal membuat item." };
    }
}

export async function updateKnowledgeItem(id: string, data: KnowledgeInput) {
    const auth = await getAuthSession();
    const user = auth?.user;
    if (!user) throw new Error("Unauthorized");

    try {
        const existing = await sql`SELECT author_id AS "authorId" FROM knowledge_items WHERE id = ${id}`;
        if (!existing[0]) return { success: false, error: "Item tidak ditemukan." };
        if (user.role !== "admin" && String(existing[0].authorId) !== user.id) {
            return { success: false, error: "Anda tidak memiliki akses untuk mengubah item ini." };
        }
        if (!data?.title || !data?.description || !["public", "internal"].includes(data.privacy || "public")) {
            return { success: false, error: "Data pengetahuan tidak valid." };
        }
        const now = new Date().toISOString();
        const status = user.role === "admin" && data.status === "published" ? "published" : "draft";
        await sql`
            UPDATE knowledge_items SET
                title = ${sanitizePlainText(String(data.title)).slice(0, 255)},
                description = ${sanitizePlainText(String(data.description)).slice(0, 5000)},
                category = ${sanitizePlainText(String(data.category || "Umum")).slice(0, 100)},
                video_url = ${data.videoUrl},
                privacy = ${data.privacy || 'public'},
                status = ${status},
                updated_at = ${now}
            WHERE id = ${id}
        `;
        return { success: true };
    } catch (err) {
        console.error("Update knowledge error:", err);
        return { success: false, error: "Gagal memperbarui item." };
    }
}

export async function incrementKnowledgeView(id: string) {
    try {
        await sql`UPDATE knowledge_items SET views = views + 1 WHERE id = ${id}`;
        return true;
    } catch { return false; }
}

export async function toggleKnowledgeLike(id: string) {
    const auth = await getAuthSession();
    const user = auth?.user;
    if (!user) return { success: false, error: "Harus login untuk menyukai" };

    try {
        const itemRes = await sql`SELECT liked_by, likes FROM knowledge_items WHERE id = ${id}`;
        if (itemRes.length === 0) return { success: false, error: "Not found" };
        
        const storedLikedBy: unknown = itemRes[0].liked_by;
        let likedBy: string[] = [];
        if (Array.isArray(storedLikedBy)) likedBy = storedLikedBy.map(String);
        if (typeof storedLikedBy === 'string') {
            try {
                const parsed: unknown = JSON.parse(storedLikedBy);
                likedBy = Array.isArray(parsed) ? parsed.map(String) : [];
            } catch { likedBy = []; }
        }
        
        const hasLiked = likedBy.includes(user.id);
        let updatedLikes = itemRes[0].likes;

        if (hasLiked) {
            likedBy = likedBy.filter((uid: string) => uid !== user.id);
            updatedLikes -= 1;
        } else {
            likedBy.push(user.id);
            updatedLikes += 1;
        }
        
        await sql`UPDATE knowledge_items SET liked_by = ${JSON.stringify(likedBy)}, likes = ${updatedLikes} WHERE id = ${id}`;
        return { success: true, likes: updatedLikes, hasLiked: !hasLiked };
    } catch { return { success: false, error: "Gagal memproses like." }; }
}

export async function postKnowledgeComment(id: string, content: string) {
    const auth = await getAuthSession();
    const user = auth?.user;
    if (!user) return { success: false, error: "Harus login untuk komentar." };
    if (!content || content.trim() === "") return { success: false, error: "Komentar kosong." };

    try {
        const itemRes = await sql`SELECT comments FROM knowledge_items WHERE id = ${id}`;
        if (itemRes.length === 0) return { success: false, error: "Not found" };
        
        const comments = parseKnowledgeComments(itemRes[0].comments);

        const newComment = {
            id: "comment_" + Date.now().toString(),
            authorId: user.id,
            content: sanitizePlainText(content).slice(0, 2000),
            createdAt: new Date().toISOString()
        };

        comments.push(newComment);
        await sql`UPDATE knowledge_items SET comments = ${JSON.stringify(comments)} WHERE id = ${id}`;
        return { success: true };
    } catch { return { success: false, error: "Gagal memposting komentar." }; }
}
