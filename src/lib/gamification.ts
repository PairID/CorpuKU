import { sql } from "@/lib/db";

export async function awardPoints(userId: string, points: number) {
    try {
        await sql`UPDATE users SET points = points + ${points} WHERE id = ${userId}`;
        const user = await sql`SELECT points FROM users WHERE id = ${userId}`;
        
        // After awarding points, check for badges
        await checkBadges(userId, 'points', user[0].points);
        
        return { success: true, newPoints: user[0].points };
    } catch (err) {
        console.error("Failed to award points:", err);
        return { success: false };
    }
}

export async function checkBadges(userId: string, type: string, value: number) {
    try {
        // Find badges of this type that the user doesn't have yet
        const eligibleBadges = await sql`
            SELECT * FROM badges 
            WHERE requirement_type = ${type} 
            AND requirement_value <= ${value}
            AND id NOT IN (SELECT badge_id FROM user_badges WHERE user_id = ${userId})
        `;

        for (const badge of eligibleBadges) {
            await sql`
                INSERT INTO user_badges (user_id, badge_id)
                VALUES (${userId}, ${badge.id})
                ON CONFLICT DO NOTHING
            `;
            console.log(`User ${userId} earned badge: ${badge.name}`);
        }
    } catch (err) {
        console.error("Failed to check badges:", err);
    }
}
