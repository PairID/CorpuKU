"use server";

import { sql } from "@/lib/db";
import { getAuthSession } from "./auth";

interface LessonDiscussionRecord {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    name: string;
    image?: string | null;
    parent_id?: string | null;
}

export async function getLessonDiscussions(lessonId: string): Promise<LessonDiscussionRecord[]> {
    try {
        const discussions = await sql`
            SELECT d.*, u.name, u.image 
            FROM lesson_discussions d
            JOIN users u ON d.user_id = u.id
            WHERE d.lesson_id = ${lessonId}
            ORDER BY d.created_at DESC
        `;
        return discussions as unknown as LessonDiscussionRecord[];
    } catch (err) {
        console.error("Failed to get discussions:", err);
        return [];
    }
}

export async function addDiscussion(lessonId: string, content: string, parentId: string | null = null) {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Silakan login terlebih dahulu." };

    try {
        const id = `disc_${Date.now()}`;
        await sql`
            INSERT INTO lesson_discussions (id, lesson_id, user_id, content, parent_id)
            VALUES (${id}, ${lessonId}, ${session.user.id}, ${content}, ${parentId})
        `;
        return { success: true, id };
    } catch (err) {
        console.error("Failed to add discussion:", err);
        return { success: false, error: "Gagal mengirim diskusi." };
    }
}

export async function deleteDiscussion(discussionId: string) {
    const session = await getAuthSession();
    if (!session) return { success: false, error: "Unauthorized" };

    try {
        // Authenticate as owner or admin
        const discussion = await sql`SELECT user_id FROM lesson_discussions WHERE id = ${discussionId}`;
        const user = await sql`SELECT role FROM users WHERE id = ${session.user.id}`;
        
        if (discussion[0]?.user_id !== session.user.id && user[0]?.role !== 'admin') {
            return { success: false, error: "Hanya pemilik atau admin yang bisa menghapus." };
        }

        await sql`DELETE FROM lesson_discussions WHERE id = ${discussionId} OR parent_id = ${discussionId}`;
        return { success: true };
    } catch {
        return { success: false, error: "Gagal menghapus diskusi." };
    }
}
