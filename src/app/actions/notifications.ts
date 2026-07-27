"use server";

import { sql } from "@/lib/db";
import { requireUserSession } from "./auth";
import { sanitizePlainText } from "@/lib/content-security";

interface NotificationInput {
    userId: string;
    title: string;
    message: string;
    type?: string;
    link?: string;
}

export async function getUserNotifications(userId: string) {
    try {
        const session = await requireUserSession();
        if (session.user.id !== userId && session.user.role !== 'admin') {
            return [];
        }

        const data = await sql`
            SELECT id, title, message, type, is_read as "isRead", link, created_at as "createdAt"
            FROM notifications
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
            LIMIT 20
        `;
        return data;
    } catch { return []; }
}

export async function createNotification(data: NotificationInput) {
    try {
        const session = await requireUserSession();
        if (!data?.userId || (session.user.id !== data.userId && session.user.role !== "admin")) {
            return { success: false };
        }
        if (!data.title || !data.message) return { success: false };

        const id = `n_${Date.now()}`;
        const now = new Date().toISOString();
        const notificationType = data.type && ['info', 'success', 'warning', 'error'].includes(data.type)
            ? data.type
            : 'info';
        
        await sql`
            INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
            VALUES (${id}, ${data.userId}, ${sanitizePlainText(String(data.title)).slice(0, 200)}, ${sanitizePlainText(String(data.message)).slice(0, 1000)}, ${notificationType}, false, ${typeof data.link === 'string' && data.link.startsWith('/') ? data.link.slice(0, 500) : null}, ${now})
        `;
        return { success: true };
    } catch (err) {
        console.error("Failed to create notification:", err);
        return { success: false };
    }
}

export async function markNotificationAsRead(id: string) {
    try {
        const session = await requireUserSession();
        const notification = await sql`SELECT user_id FROM notifications WHERE id = ${id}`;
        
        if (notification.length === 0) return { success: false };
        if (notification[0].user_id !== session.user.id && session.user.role !== 'admin') {
            return { success: false };
        }

        await sql`UPDATE notifications SET is_read = true WHERE id = ${id}`;
        return { success: true };
    } catch { return { success: false }; }
}

export async function markAllNotificationsAsRead(userId: string) {
    try {
        const session = await requireUserSession();
        if (session.user.id !== userId && session.user.role !== 'admin') {
            return { success: false };
        }

        await sql`UPDATE notifications SET is_read = true WHERE user_id = ${userId}`;
        return { success: true };
    } catch { return { success: false }; }
}
