"use server";

import { sql } from '@/lib/db';
import { ExternalBangkom } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { requireAdminSession, requireUserSession } from "./auth";

interface BatchJobSummary {
    file_name: string;
    total_rows: number;
    success_count: number;
    failed_count: number;
}

interface BatchItemDetail {
    id: string;
    nip: string;
    rawData: Record<string, string | number | undefined>;
    status: "PENDING" | "SUCCESS" | "FAILED";
    actionTaken?: "INSERTED" | "UPDATED" | "SKIPPED" | "ERROR";
    errorMessage?: string;
}

interface BatchJobDetails {
    job: BatchJobSummary;
    items: BatchItemDetail[];
}

// Mapping functions
function mapExternalBangkomRow(row: Record<string, unknown>): ExternalBangkom {
    const status = ['pending', 'approved', 'rejected'].includes(String(row.status))
        ? String(row.status) as ExternalBangkom['status']
        : 'pending';
    return {
        id: String(row.id),
        userId: String(row.user_id),
        title: String(row.title),
        provider: String(row.provider),
        dateCompleted: new Date(String(row.date_completed)).toISOString(),
        jp: Number(row.jp),
        certificateUrl: row.certificate_url ? String(row.certificate_url) : undefined,
        certificateNo: row.certificate_no ? String(row.certificate_no) : undefined,
        dateStarted: row.date_started ? new Date(String(row.date_started)).toISOString() : undefined,
        status,
        createdAt: new Date(String(row.created_at)).toISOString(),
        updatedAt: new Date(String(row.updated_at)).toISOString(),
    };
}

// 1. Submit External Bangkom
export async function submitExternalBangkom(userId: string, data: Omit<ExternalBangkom, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>) {
    try {
        const session = await requireUserSession();
        if (session.user.id !== userId && session.user.role !== 'admin') {
            return { success: false, error: "Unauthorized" };
        }

        const id = uuidv4();
        await sql`
            INSERT INTO external_bangkom (id, user_id, title, provider, date_completed, jp, certificate_url, status)
            VALUES (${id}, ${userId}, ${data.title}, ${data.provider}, ${data.dateCompleted}, ${data.jp}, ${data.certificateUrl || null}, 'pending')
        `;
        revalidatePath('/dashboard');
        return { success: true, id };
    } catch (error: unknown) {
        console.error("Failed to submit external bangkom:", error);
        return { success: false, error: error instanceof Error ? error.message : "Gagal mengirimkan pengajuan Bangkom eksternal." };
    }
}

// 2. Get External Bangkom by User
export async function getExternalBangkomByUser(userId: string): Promise<ExternalBangkom[]> {
    try {
        const session = await requireUserSession();
        if (session.user.id !== userId && session.user.role !== 'admin') {
            return [];
        }

        const rows = await sql`
            SELECT * FROM external_bangkom 
            WHERE user_id = ${userId} 
            ORDER BY date_completed DESC
        `;
        return rows.map(mapExternalBangkomRow);
    } catch (error) {
        console.error("Failed to fetch user external bangkom:", error);
        return [];
    }
}

// 3. Get All External Bangkom (Admin)
export async function getAllExternalBangkom(status?: string): Promise<ExternalBangkom[]> {
    try {
        await requireAdminSession();

        let rows;
        if (status) {
            rows = await sql`SELECT * FROM external_bangkom WHERE status = ${status} ORDER BY created_at DESC`;
        } else {
            rows = await sql`SELECT * FROM external_bangkom ORDER BY created_at DESC`;
        }
        return rows.map(mapExternalBangkomRow);
    } catch (error) {
        console.error("Failed to fetch all external bangkom:", error);
        return [];
    }
}

// 4. Update External Bangkom Status (Admin)
export async function updateExternalBangkomStatus(id: string, status: 'approved' | 'rejected') {
    try {
        await requireAdminSession();

        await sql`
            UPDATE external_bangkom 
            SET status = ${status}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ${id}
        `;
        revalidatePath('/admin/bangkom/verifikasi');
        return { success: true };
    } catch (error) {
        console.error("Failed to update external bangkom status:", error);
        return { success: false };
    }
}

// 5. Update User Metadata (Target, Kategori, Instansi)
export async function updateUserBangkomMetadata(userId: string, data: { targetJpTahunan?: number, kategoriPegawai?: string, namaInstansi?: string }) {
    try {
        const session = await requireUserSession();
        if (session.user.id !== userId && session.user.role !== 'admin') {
            return { success: false };
        }

        await sql`
            UPDATE users 
            SET 
                target_jp_tahunan = COALESCE(${data.targetJpTahunan}, target_jp_tahunan),
                kategori_pegawai = COALESCE(${data.kategoriPegawai}, kategori_pegawai),
                nama_instansi = COALESCE(${data.namaInstansi}, nama_instansi)
            WHERE id = ${userId}
        `;
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error("Failed to update user bangkom metadata:", error);
        return { success: false };
    }
}

// 6. Get Comprehensive User Bangkom Summary
export async function getUserBangkomSummary(userId: string) {
    try {
        const session = await requireUserSession();
        if (session.user.id !== userId && session.user.role !== 'admin') {
            return { internalJp: 0, externalJp: 0, totalJp: 0 };
        }

        // Internal JP from course enrollments
        const courseRows = await sql`
            SELECT SUM(c.jp) as total_jp
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.user_id = ${userId} AND e.status = 'completed'
        `;
        
        // Internal JP from webinar attendance
        const webinarRows = await sql`
            SELECT COUNT(*) * 2 as total_jp
            FROM webinar_registrations
            WHERE user_id = ${userId} AND attended = true
        `;
        // Catatan: Asumsi standar webinar adalah 2 JP jika tidak ditentukan lain.

        // External JP (Approved only)
        const externalRows = await sql`
            SELECT SUM(jp) as total_jp
            FROM external_bangkom
            WHERE user_id = ${userId} AND status = 'approved'
        `;

        const internalCourseJp = parseInt(courseRows[0]?.total_jp || 0);
        const internalWebinarJp = parseInt(webinarRows[0]?.total_jp || 0);
        const externalJp = parseInt(externalRows[0]?.total_jp || 0);

        return {
            internalJp: internalCourseJp + internalWebinarJp,
            externalJp,
            totalJp: internalCourseJp + internalWebinarJp + externalJp
        };
    } catch (error) {
        console.error("Failed to get user bangkom summary:", error);
        return { internalJp: 0, externalJp: 0, totalJp: 0 };
    }
}

// 7. Admin Reporting Statistics
export async function getAdminBangkomStats() {
    try {
        await requireAdminSession();

        // Aggregate by category
        const stats = await sql`
            SELECT 
                kategori_pegawai,
                COUNT(*) as total_users,
                AVG(target_jp_tahunan) as avg_target
            FROM users
            WHERE role = 'student'
            GROUP BY kategori_pegawai
        `;
        
        return stats;
    } catch (error) {
        console.error("Failed to fetch admin bangkom stats:", error);
        return [];
    }
}

// 8. Get All Users with Bangkom Summary (Admin Tracking)
export async function getAllUsersWithBangkomSummary() {
    try {
        await requireAdminSession();

        const users = await sql`
            SELECT 
                u.id, u.name, u.nip, u.jabatan, u.kategori_pegawai, u.nama_instansi, u.target_jp_tahunan,
                COALESCE(internal_courses.jp, 0) as internal_course_jp,
                COALESCE(internal_webinars.jp, 0) as internal_webinar_jp,
                COALESCE(external_approved.jp, 0) as external_jp
            FROM users u
            LEFT JOIN (
                SELECT e.user_id, SUM(c.jp) as jp
                FROM enrollments e
                JOIN courses c ON e.course_id = c.id
                WHERE e.status = 'completed'
                GROUP BY e.user_id
            ) internal_courses ON u.id = internal_courses.user_id
            LEFT JOIN (
                SELECT user_id, COUNT(*) * 2 as jp
                FROM webinar_registrations
                WHERE attended = true
                GROUP BY user_id
            ) internal_webinars ON u.id = internal_webinars.user_id
            LEFT JOIN (
                SELECT user_id, SUM(jp) as jp
                FROM external_bangkom
                WHERE status = 'approved'
                GROUP BY user_id
            ) external_approved ON u.id = external_approved.user_id
            WHERE u.role = 'student'
            ORDER BY u.created_at DESC
        `;
        return users;
    } catch (error) {
        console.error("Failed to fetch users with bangkom summary:", error);
        return [];
    }
}

// 9. Get Detailed Report Data (Admin Reporting)
export async function getAdminBangkomReportData() {
    try {
        await requireAdminSession();

        // Fetch compliance stats aggregated by category
        const categoryStats = await sql`
            WITH user_jp AS (
                SELECT 
                    u.id, 
                    u.kategori_pegawai,
                    u.target_jp_tahunan,
                    (
                        COALESCE((SELECT SUM(c.jp) FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.user_id = u.id AND e.status = 'completed'), 0) +
                        COALESCE((SELECT COUNT(*) * 2 FROM webinar_registrations WHERE user_id = u.id AND attended = true), 0) +
                        COALESCE((SELECT SUM(jp) FROM external_bangkom WHERE user_id = u.id AND status = 'approved'), 0)
                    ) as total_jp
                FROM users u
                WHERE u.role = 'student'
            )
            SELECT 
                COALESCE(kategori_pegawai, 'Lainnya') as category,
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE total_jp >= target_jp_tahunan) as compliant_users,
                SUM(total_jp) as total_jp_category
            FROM user_jp
            GROUP BY kategori_pegawai
        `;

        // Fetch top instansi compliance
        const instansiStats = await sql`
            WITH user_jp AS (
                SELECT 
                    u.id, 
                    u.nama_instansi,
                    u.target_jp_tahunan,
                    (
                        COALESCE((SELECT SUM(c.jp) FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.user_id = u.id AND e.status = 'completed'), 0) +
                        COALESCE((SELECT COUNT(*) * 2 FROM webinar_registrations WHERE user_id = u.id AND attended = true), 0) +
                        COALESCE((SELECT SUM(jp) FROM external_bangkom WHERE user_id = u.id AND status = 'approved'), 0)
                    ) as total_jp
                FROM users u
                WHERE u.role = 'student' AND u.nama_instansi IS NOT NULL
            )
            SELECT 
                nama_instansi,
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE total_jp >= target_jp_tahunan) as compliant_users,
                AVG(total_jp) as avg_jp
            FROM user_jp
            GROUP BY nama_instansi
            ORDER BY compliant_users DESC
            LIMIT 10
        `;

        // Fetch monthly trends (JP accumulated per month in current year)
        const monthlyTrends = await sql`
            SELECT 
                EXTRACT(MONTH FROM date_completed) as month,
                SUM(jp) as jp
            FROM (
                SELECT date_completed, jp FROM external_bangkom WHERE status = 'approved' AND EXTRACT(YEAR FROM date_completed) = EXTRACT(YEAR FROM CURRENT_DATE)
                UNION ALL
                SELECT enrolled_at, c.jp FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.status = 'completed' AND EXTRACT(YEAR FROM enrolled_at) = EXTRACT(YEAR FROM CURRENT_DATE)
                UNION ALL
                SELECT registered_at, 2 FROM webinar_registrations WHERE attended = true AND EXTRACT(YEAR FROM registered_at) = EXTRACT(YEAR FROM CURRENT_DATE)
            ) combined
            GROUP BY month
            ORDER BY month
        `;

        // JP Type Breakdown
        const typeBreakdown = await sql`
            SELECT 'Internal Courses' as type, SUM(c.jp) as jp FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.status = 'completed'
            UNION ALL
            SELECT 'Webinars' as type, COUNT(*) * 2 as jp FROM webinar_registrations WHERE attended = true
            UNION ALL
            SELECT 'External' as type, SUM(jp) as jp FROM external_bangkom WHERE status = 'approved'
        `;

        // Top Performers
        const topPerformers = await sql`
            WITH user_jp AS (
                SELECT 
                    u.id, u.name, u.nama_instansi,
                    (
                        COALESCE((SELECT SUM(c.jp) FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.user_id = u.id AND e.status = 'completed'), 0) +
                        COALESCE((SELECT COUNT(*) * 2 FROM webinar_registrations WHERE user_id = u.id AND attended = true), 0) +
                        COALESCE((SELECT SUM(jp) FROM external_bangkom WHERE user_id = u.id AND status = 'approved'), 0)
                    ) as total_jp
                FROM users u
                WHERE u.role = 'student'
            )
            SELECT * FROM user_jp ORDER BY total_jp DESC LIMIT 5
        `;

        return {
            categoryStats,
            instansiStats,
            monthlyTrends,
            typeBreakdown,
            topPerformers
        };
    } catch (error) {
        console.error("Failed to fetch admin bangkom report data:", error);
        return { categoryStats: [], instansiStats: [], monthlyTrends: [], typeBreakdown: [], topPerformers: [] };
    }
}

// 10. Batch Import External Bangkom
export async function importExternalBangkomBatch(rows: {
    nip: string;
    title: string;
    jp: number;
    certificateNo?: string;
    dateStarted?: string;
    dateCompleted: string;
    provider: string;
}[]) {
    try {
        await requireAdminSession();

        let successCount = 0;
        let failedCount = 0;
        const errors: { row: number; nip: string; reason: string }[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 1;

            if (!row.nip || !row.title || !row.jp || !row.dateCompleted || !row.provider) {
                failedCount++;
                errors.push({
                    row: rowNum,
                    nip: row.nip || 'N/A',
                    reason: 'Kolom wajib tidak lengkap (NIP, Judul, JP, Tanggal Selesai, Penyelenggara wajib diisi).'
                });
                continue;
            }

            // Find user ID by NIP (case-insensitive & trim whitespace)
            const nipStr = String(row.nip).trim();
            const users = await sql`SELECT id FROM users WHERE TRIM(nip) = ${nipStr}`;
            
            if (users.length === 0) {
                failedCount++;
                errors.push({
                    row: rowNum,
                    nip: nipStr,
                    reason: `Pegawai dengan NIP "${nipStr}" tidak ditemukan di sistem.`
                });
                continue;
            }

            const userId = users[0].id;
            const recordId = uuidv4();

            // Handle optional dateStarted
            const dateStartedVal = row.dateStarted ? new Date(row.dateStarted) : null;
            const dateCompletedVal = new Date(row.dateCompleted);

            // Insert into external_bangkom as APPROVED directly (uploaded by Admin)
            await sql`
                INSERT INTO external_bangkom (
                    id, user_id, title, provider, date_completed, jp, status, certificate_no, date_started
                ) VALUES (
                    ${recordId}, ${userId}, ${row.title}, ${row.provider}, ${dateCompletedVal}, ${Number(row.jp)}, 'approved', ${row.certificateNo || null}, ${dateStartedVal}
                )
            `;
            successCount++;
        }

        revalidatePath('/admin/bangkom');
        revalidatePath('/admin/bangkom/reports');

        return {
            success: true,
            summary: {
                total: rows.length,
                success: successCount,
                failed: failedCount,
            },
            errors
        };
    } catch (error: unknown) {
        console.error("Batch import failed:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Gagal melakukan batch import."
        };
    }
}

// 11. Initiate Asynchronous Batch Job
export async function initiateBatchJob(fileName: string, totalRows: number, rows: Record<string, unknown>[]) {
    try {
        await requireAdminSession();

        const jobId = uuidv4();
        
        // Create job
        await sql`
            INSERT INTO bangkom_batch_jobs (id, file_name, total_rows, status)
            VALUES (${jobId}, ${fileName}, ${totalRows}, 'PENDING')
        `;

        // Bulk insert items (staging)
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const itemId = uuidv4();
            const nip = String(row.nip || row["NIP"] || "").trim();
            const rawData = JSON.stringify(row);

            await sql`
                INSERT INTO bangkom_batch_items (id, job_id, nip, raw_data, status)
                VALUES (${itemId}, ${jobId}, ${nip}, ${rawData})
            `;
        }

        revalidatePath('/admin/bangkom/upload');
        return { success: true, jobId };
    } catch (error: unknown) {
        console.error("Failed to initiate batch job:", error);
        return { success: false, message: error instanceof Error ? error.message : "Gagal membuat batch job." };
    }
}

// 12. Process a Batch Job Chunk
export async function processBatchJobChunk(jobId: string, limit: number = 100) {
    try {
        await requireAdminSession();

        // Update job status to PROCESSING if it's PENDING
        await sql`
            UPDATE bangkom_batch_jobs 
            SET status = 'PROCESSING', updated_at = CURRENT_TIMESTAMP
            WHERE id = ${jobId} AND status = 'PENDING'
        `;

        // Fetch next pending items
        const items = await sql`
            SELECT id, nip, raw_data 
            FROM bangkom_batch_items 
            WHERE job_id = ${jobId} AND status = 'PENDING'
            LIMIT ${limit}
        `;

        if (items.length === 0) {
            // Check if all items processed for this job
            const remaining = await sql`
                SELECT COUNT(*) as count 
                FROM bangkom_batch_items 
                WHERE job_id = ${jobId} AND status = 'PENDING'
            `;
            
            if (parseInt(remaining[0].count) === 0) {
                await sql`
                    UPDATE bangkom_batch_jobs 
                    SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ${jobId}
                `;
            }
            return { success: true, processed: 0, remaining: 0 };
        }

        for (const item of items) {
            const raw = typeof item.raw_data === 'string' ? JSON.parse(item.raw_data) : item.raw_data;
            const nip = String(item.nip).trim();
            const title = String(raw.title || raw["Judul"] || "").trim();
            const jp = Number(raw.jp || raw["JP"] || 0);
            const provider = String(raw.provider || raw["Penyelenggara"] || "").trim();
            const dateCompletedStr = String(raw.dateCompleted || raw["Tanggal Selesai"] || "").trim();
            const dateStartedStr = raw.dateStarted || raw["Tanggal Mulai"] ? String(raw.dateStarted || raw["Tanggal Mulai"]).trim() : null;
            const certificateNo = raw.certificateNo || raw["Nomor Sertifikat"] ? String(raw.certificateNo || raw["Nomor Sertifikat"]).trim() : null;

            if (!nip || !title || !jp || !dateCompletedStr || !provider) {
                await sql`
                    UPDATE bangkom_batch_items 
                    SET status = 'FAILED', action_taken = 'ERROR', error_message = 'Kolom wajib tidak lengkap.'
                    WHERE id = ${item.id}
                `;
                continue;
            }

            // 1. Find user by NIP
            const users = await sql`SELECT id FROM users WHERE TRIM(nip) = ${nip}`;
            if (users.length === 0) {
                await sql`
                    UPDATE bangkom_batch_items 
                    SET status = 'FAILED', action_taken = 'ERROR', error_message = 'Pegawai dengan NIP ini tidak terdaftar di sistem.'
                    WHERE id = ${item.id}
                `;
                continue;
            }

            const userId = users[0].id;
            const dateCompleted = new Date(dateCompletedStr);
            const dateStarted = dateStartedStr ? new Date(dateStartedStr) : null;

            // 2. Check existing Bangkom record for Deduplication (Upsert Logic)
            const existing = await sql`
                SELECT id, jp, provider, certificate_no, date_started 
                FROM external_bangkom 
                WHERE user_id = ${userId} AND title = ${title} AND date_completed = ${dateCompleted}
            `;

            if (existing.length > 0) {
                const ext = existing[0];
                
                // Compare to see if exactly identical
                const extDateStartedStr = ext.date_started ? new Date(ext.date_started).toISOString().split('T')[0] : null;
                const reqDateStartedStr = dateStarted ? dateStarted.toISOString().split('T')[0] : null;
                
                const isIdentical = 
                    ext.jp === jp && 
                    ext.provider === provider && 
                    ext.certificate_no === certificateNo && 
                    extDateStartedStr === reqDateStartedStr;

                if (isIdentical) {
                    // Skip duplicates
                    await sql`
                        UPDATE bangkom_batch_items 
                        SET status = 'SUCCESS', action_taken = 'SKIPPED'
                        WHERE id = ${item.id}
                    `;
                } else {
                    // Update differing fields
                    await sql`
                        UPDATE external_bangkom 
                        SET jp = ${jp}, provider = ${provider}, certificate_no = ${certificateNo}, date_started = ${dateStarted}, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ${ext.id}
                    `;
                    await sql`
                        UPDATE bangkom_batch_items 
                        SET status = 'SUCCESS', action_taken = 'UPDATED'
                        WHERE id = ${item.id}
                    `;
                }
            } else {
                // 3. Insert new record (directly APPROVED)
                const newId = uuidv4();
                await sql`
                    INSERT INTO external_bangkom (
                        id, user_id, title, provider, date_completed, jp, status, certificate_no, date_started
                    ) VALUES (
                        ${newId}, ${userId}, ${title}, ${provider}, ${dateCompleted}, ${jp}, 'approved', ${certificateNo}, ${dateStarted}
                    )
                `;
                await sql`
                    UPDATE bangkom_batch_items 
                    SET status = 'SUCCESS', action_taken = 'INSERTED'
                    WHERE id = ${item.id}
                `;
            }
        }

        // Aggregate statistics back into job
        const counts = await sql`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'SUCCESS') as success,
                COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
                COUNT(*) FILTER (WHERE status != 'PENDING') as processed
            FROM bangkom_batch_items 
            WHERE job_id = ${jobId}
        `;

        const totalProcessed = parseInt(counts[0].processed);
        const successCount = parseInt(counts[0].success);
        const failedCount = parseInt(counts[0].failed);

        const jobInfo = await sql`SELECT total_rows FROM bangkom_batch_jobs WHERE id = ${jobId}`;
        const isFinished = totalProcessed >= parseInt(jobInfo[0].total_rows);

        await sql`
            UPDATE bangkom_batch_jobs 
            SET processed_rows = ${totalProcessed}, 
                success_count = ${successCount}, 
                failed_count = ${failedCount}, 
                status = ${isFinished ? 'COMPLETED' : 'PROCESSING'},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${jobId}
        `;

        revalidatePath('/admin/bangkom');
        revalidatePath('/admin/bangkom/reports');

        return { 
            success: true, 
            processed: items.length, 
            remaining: parseInt(jobInfo[0].total_rows) - totalProcessed 
        };
    } catch (error: unknown) {
        console.error("Failed to process batch chunk:", error);
        return { success: false, message: error instanceof Error ? error.message : "Gagal memproses batch." };
    }
}

// 13. Get All Batch Jobs (History)
export async function getBatchJobs() {
    try {
        await requireAdminSession();

        const jobs = await sql`
            SELECT id, file_name, total_rows, processed_rows, success_count, failed_count, status, created_at, updated_at
            FROM bangkom_batch_jobs
            ORDER BY created_at DESC
        `;
        return jobs;
    } catch (error) {
        console.error("Failed to fetch batch jobs:", error);
        return [];
    }
}

// 14. Get Batch Job Details & Items
export async function getBatchJobDetails(jobId: string): Promise<BatchJobDetails | null> {
    try {
        await requireAdminSession();

        const job = await sql`
            SELECT id, file_name, total_rows, processed_rows, success_count, failed_count, status, created_at
            FROM bangkom_batch_jobs
            WHERE id = ${jobId}
        `;
        
        if (job.length === 0) return null;

        const items = await sql`
            SELECT id, nip, raw_data, status, action_taken, error_message
            FROM bangkom_batch_items
            WHERE job_id = ${jobId}
            ORDER BY status DESC, id ASC
        `;

        return {
            job: job[0] as unknown as BatchJobSummary,
            items: items.map(item => ({
                id: String(item.id),
                nip: String(item.nip),
                rawData: (typeof item.raw_data === 'string' ? JSON.parse(item.raw_data) : item.raw_data) as Record<string, string | number | undefined>,
                status: String(item.status) as BatchItemDetail['status'],
                actionTaken: item.action_taken ? String(item.action_taken) as BatchItemDetail['actionTaken'] : undefined,
                errorMessage: item.error_message ? String(item.error_message) : undefined,
            }))
        };
    } catch (error) {
        console.error("Failed to fetch job details:", error);
        return null;
    }
}

// 15. Retry Single Staged Batch Item
export async function retryBatchItem(itemId: string, updatedNip?: string) {
    try {
        await requireAdminSession();

        // Fetch the item
        const items = await sql`
            SELECT id, job_id, nip, raw_data 
            FROM bangkom_batch_items 
            WHERE id = ${itemId}
        `;

        if (items.length === 0) return { success: false, message: "Item tidak ditemukan." };
        const item = items[0];

        const finalNip = updatedNip ? updatedNip.trim() : item.nip;
        
        // Update NIP in staging if edited
        if (updatedNip) {
            await sql`
                UPDATE bangkom_batch_items 
                SET nip = ${finalNip}
                WHERE id = ${itemId}
            `;
        }

        const raw = typeof item.raw_data === 'string' ? JSON.parse(item.raw_data) : item.raw_data;
        const title = String(raw.title || raw["Judul"] || "").trim();
        const jp = Number(raw.jp || raw["JP"] || 0);
        const provider = String(raw.provider || raw["Penyelenggara"] || "").trim();
        const dateCompletedStr = String(raw.dateCompleted || raw["Tanggal Selesai"] || "").trim();
        const dateStartedStr = raw.dateStarted || raw["Tanggal Mulai"] ? String(raw.dateStarted || raw["Tanggal Mulai"]).trim() : null;
        const certificateNo = raw.certificateNo || raw["Nomor Sertifikat"] ? String(raw.certificateNo || raw["Nomor Sertifikat"]).trim() : null;

        const users = await sql`SELECT id FROM users WHERE TRIM(nip) = ${finalNip}`;
        
        if (users.length === 0) {
            await sql`
                UPDATE bangkom_batch_items 
                SET status = 'FAILED', action_taken = 'ERROR', error_message = 'Pegawai dengan NIP ini tetap tidak terdaftar.'
                WHERE id = ${itemId}
            `;
            return { success: false, message: "Pegawai tetap tidak ditemukan." };
        }

        const userId = users[0].id;
        const dateCompleted = new Date(dateCompletedStr);
        const dateStarted = dateStartedStr ? new Date(dateStartedStr) : null;

        // Upsert
        const existing = await sql`
            SELECT id, jp, provider, certificate_no, date_started 
            FROM external_bangkom 
            WHERE user_id = ${userId} AND title = ${title} AND date_completed = ${dateCompleted}
        `;

        if (existing.length > 0) {
            const ext = existing[0];
            await sql`
                UPDATE external_bangkom 
                SET jp = ${jp}, provider = ${provider}, certificate_no = ${certificateNo}, date_started = ${dateStarted}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ${ext.id}
            `;
            await sql`
                UPDATE bangkom_batch_items 
                SET status = 'SUCCESS', action_taken = 'UPDATED', error_message = NULL
                WHERE id = ${itemId}
            `;
        } else {
            const newId = uuidv4();
            await sql`
                INSERT INTO external_bangkom (
                    id, user_id, title, provider, date_completed, jp, status, certificate_no, date_started
                ) VALUES (
                    ${newId}, ${userId}, ${title}, ${provider}, ${dateCompleted}, ${jp}, 'approved', ${certificateNo}, ${dateStarted}
                )
            `;
            await sql`
                UPDATE bangkom_batch_items 
                SET status = 'SUCCESS', action_taken = 'INSERTED', error_message = NULL
                WHERE id = ${itemId}
            `;
        }

        // Recalculate job stats
        const counts = await sql`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'SUCCESS') as success,
                COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
                COUNT(*) FILTER (WHERE status != 'PENDING') as processed
            FROM bangkom_batch_items 
            WHERE job_id = ${item.job_id}
        `;

        await sql`
            UPDATE bangkom_batch_jobs 
            SET processed_rows = ${parseInt(counts[0].processed)}, 
                success_count = ${parseInt(counts[0].success)}, 
                failed_count = ${parseInt(counts[0].failed)},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${item.job_id}
        `;

        revalidatePath('/admin/bangkom');
        revalidatePath('/admin/bangkom/reports');

        return { success: true };
    } catch (error: unknown) {
        console.error("Retry failed:", error);
        return { success: false, message: error instanceof Error ? error.message : "Gagal mengulang item." };
    }
}
