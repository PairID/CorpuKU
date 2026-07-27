"use server";

import { sql } from "@/lib/db";
import { requireAdminSession } from "./auth";

interface ComplianceRow {
    name: string;
    totalJp: number;
    compliance: number;
}

export async function getAnalyticsMetrics() {
    try {
        await requireAdminSession();

        // 1. Total Students
        const studentsRes = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'student'`;
        const totalUsers = parseInt(studentsRes[0].count);

        // 2. Total JP
        const jpRes = await sql`SELECT SUM(jp) as total FROM enrollments WHERE status = 'completed'`;
        const totalJp = parseInt(jpRes[0].total || "0");

        // 3. Compliance Rate (% of users with >= 20 JP)
        const complianceRes = await sql`
            WITH UserJP AS (
                SELECT user_id, SUM(jp) as total_jp
                FROM enrollments
                WHERE status = 'completed'
                GROUP BY user_id
            )
            SELECT COUNT(*) as compliant_count
            FROM UserJP
            WHERE total_jp >= 20
        `;
        const compliantCount = parseInt(complianceRes[0].compliant_count);
        const complianceRate = totalUsers > 0 ? Math.round((compliantCount / totalUsers) * 100) : 0;

        // 4. Average Score
        const scoreRes = await sql`SELECT AVG(score) as avg_score FROM quiz_attempts`;
        const avgScore = scoreRes[0].avg_score ? parseFloat(scoreRes[0].avg_score).toFixed(1) : 0;

        return {
            totalUsers,
            totalJp,
            complianceRate,
            avgScore
        };
    } catch (err) {
        console.error("Failed to get analytics metrics:", err);
        return { totalUsers: 0, totalJp: 0, complianceRate: 0, avgScore: 0 };
    }
}

export async function getInstansiCompliance() {
    try {
        await requireAdminSession();

        const data = await sql`
            WITH InstansiUsers AS (
                SELECT instansi_asal, COUNT(*) as user_count
                FROM users
                WHERE role = 'student'
                GROUP BY instansi_asal
            ),
            UserJP AS (
                SELECT user_id, SUM(jp) as total_jp
                FROM enrollments
                WHERE status = 'completed'
                GROUP BY user_id
            ),
            InstansiCompliance AS (
                SELECT 
                    u.instansi_asal as name,
                    COUNT(uj) FILTER (WHERE uj.total_jp >= 20) as compliant_users,
                    COALESCE(SUM(uj.total_jp), 0) as total_jp,
                    iu.user_count
                FROM users u
                JOIN InstansiUsers iu ON u.instansi_asal = iu.instansi_asal
                LEFT JOIN UserJP uj ON u.id = uj.user_id
                WHERE u.role = 'student'
                GROUP BY u.instansi_asal, iu.user_count
            )
            SELECT 
                name,
                total_jp as "totalJp",
                CASE WHEN user_count > 0 THEN ROUND((compliant_users::float / user_count) * 100) ELSE 0 END as compliance
            FROM InstansiCompliance
            ORDER BY compliance DESC, name ASC
        `;

        const transformed: ComplianceRow[] = data.map((d) => ({
            name: String(d.name || "Unknown"),
            totalJp: Number(d.totalJp || 0),
            compliance: Number(d.compliance || 0)
        }));

        return {
            top: transformed.filter((d) => d.compliance >= 50),
            bottom: transformed.filter((d) => d.compliance < 50)
        };
    } catch (err) {
        console.error("Failed to get instansi compliance:", err);
        return { top: [], bottom: [] };
    }
}

export async function getEngagementStats() {
    try {
        await requireAdminSession();

        // Group activity by hour from enrollments and quiz_attempts
        const activityRes = await sql`
            WITH Activity AS (
                SELECT EXTRACT(HOUR FROM enrolled_at) as hour FROM enrollments
                UNION ALL
                SELECT EXTRACT(HOUR FROM created_at) as hour FROM quiz_attempts
            )
            SELECT hour, COUNT(*) as count 
            FROM Activity 
            GROUP BY hour 
            ORDER BY hour
        `;

        // Map to 24 hours array (or 12 for the current chart's simplified look)
        const hourBins = new Array(12).fill(0);
        activityRes.forEach((row) => {
            const h = parseInt(row.hour);
            // Simple mapping to 12 slots (every 2 hours)
            const index = Math.floor(h / 2);
            if (index < 12) hourBins[index] += parseInt(row.count);
        });

        return {
            activityByHour: hourBins,
        };
    } catch (err) {
        console.error("Engagement stats error:", err);
        return { activityByHour: [] };
    }
}

export async function getEfficacyStats() {
    try {
        await requireAdminSession();

        // Find courses with the most drop-offs (people enrolled but low progress)
        const dropOffs = await sql`
            SELECT title, COUNT(*) as drop_count
            FROM enrollments
            WHERE progress < 50 AND status = 'active'
            GROUP BY title
            ORDER BY drop_count DESC
            LIMIT 3
        `;

        const dropOffPoints = dropOffs.map((d) => ({
            module: d.title,
            rate: Math.min(parseInt(d.drop_count) * 10, 100) // Weighted rate for visual
        }));

        return {
            dropOffPoints
        };
    } catch {
        return { dropOffPoints: [] };
    }
}

export async function getLeaderboardData() {
    try {
        await requireAdminSession();

        const data = await sql`
            SELECT 
                u.id,
                u.name,
                u.instansi_asal as instansi,
                SUM(e.jp) as jp
            FROM users u
            JOIN enrollments e ON u.id = e.user_id
            WHERE e.status = 'completed'
            GROUP BY u.id, u.name, u.instansi_asal
            ORDER BY jp DESC
            LIMIT 10
        `;
        return data.map((d) => ({
            id: String(d.id),
            name: String(d.name),
            instansi: String(d.instansi || ""),
            jp: Number(d.jp || 0)
        }));
    } catch (err) {
        console.error("Failed to get leaderboard data:", err);
        return [];
    }
}
