"use server";

import { sql } from "@/lib/db";
import { getAuthSession } from "./auth";

export async function getDetailedStudentReport() {
    const session = await getAuthSession();
    if (!session || session.user.role !== 'admin') {
        throw new Error("Bukan admin.");
    }

    try {
        const report = await sql`
            SELECT 
                u.name as "Nama Lengkap",
                u.nip as "NIP",
                u.instansi_asal as "Instansi",
                u.jabatan as "Jabatan",
                c.title as "Judul Kursus",
                e.progress as "Progress (%)",
                e.status as "Status",
                e.enrolled_at as "Tanggal Daftar",
                e.completed_at as "Tanggal Selesai"
            FROM enrollments e
            JOIN users u ON e.user_id = u.id
            JOIN courses c ON e.course_id = c.id
            ORDER BY e.enrolled_at DESC
        `;
        return report;
    } catch (err) {
        console.error("Failed to fetch report:", err);
        return [];
    }
}
