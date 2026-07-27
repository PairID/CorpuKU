"use server";

import { sql } from "@/lib/db";
import { requireUserSession } from "./auth";

interface UserBadge {
    id: string;
    name: string;
    description: string;
    icon?: string;
}

interface UserGamification {
    points: number;
    badges: UserBadge[];
}

export async function getUserGamification(userId: string): Promise<UserGamification> {
    try {
        const session = await requireUserSession();
        if (session.user.id !== userId && session.user.role !== 'admin') {
            throw new Error("Unauthorized");
        }

        const pointsRes = await sql`SELECT points FROM users WHERE id = ${userId}`;
        const badgesRes = await sql`
            SELECT b.*, ub.earned_at 
            FROM user_badges ub
            JOIN badges b ON ub.badge_id = b.id
            WHERE ub.user_id = ${userId}
            ORDER BY ub.earned_at DESC
        `;
        return {
            points: Number(pointsRes[0]?.points || 0),
            badges: badgesRes.map((badge) => ({
                id: String(badge.id),
                name: String(badge.name),
                description: String(badge.description || ""),
                icon: badge.icon ? String(badge.icon) : undefined,
            })),
        };
    } catch (err) {
        console.error("Failed to get user gamification:", err);
        return { points: 0, badges: [] };
    }
}
