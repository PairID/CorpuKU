"use server";

import { sql } from "@/lib/db";
import { requireAdminSession } from "./auth";

export interface BatchJob {
    id: string;
    userId: string;
    filename: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    totalItems: number;
    processedItems: number;
    successCount: number;
    failureCount: number;
    errorLog: unknown[];
    dataPayload?: unknown;
    createdAt: string;
    updatedAt: string;
}

export async function createBatchJob(data: {
    filename: string,
    type: string,
    totalItems: number,
    dataPayload: unknown
}) {
    const auth = await requireAdminSession();

    const id = `batch_${Date.now()}`;
    const now = new Date().toISOString();

    await sql`
        INSERT INTO batch_uploads (
            id, user_id, filename, type, total_items, data_payload, status, created_at, updated_at
        ) VALUES (
            ${id}, ${auth.user.id}, ${data.filename}, ${data.type}, ${data.totalItems}, 
            ${JSON.stringify(data.dataPayload)}, 'processing', ${now}, ${now}
        )
    `;

    return { id };
}

export async function updateBatchJobProgress(id: string, updates: {
    processedItems?: number,
    successCount?: number,
    failureCount?: number,
    status?: BatchJob['status'],
    errorLog?: unknown[]
}) {
    await requireAdminSession();
    if (updates.status && !['pending', 'processing', 'completed', 'failed'].includes(updates.status)) {
        return { success: false };
    }
    const jobRes = await sql`SELECT * FROM batch_uploads WHERE id = ${id}`;
    if (jobRes.length === 0) return { success: false };

    const now = new Date().toISOString();
    
    // Merge error log if provided
    let finalErrorLog: unknown[] = Array.isArray(jobRes[0].error_log) ? jobRes[0].error_log : [];
    if (updates.errorLog) {
        finalErrorLog = [...finalErrorLog, ...updates.errorLog];
    }

    await sql`
        UPDATE batch_uploads SET
            processed_items = COALESCE(${updates.processedItems}, processed_items),
            success_count = COALESCE(${updates.successCount}, success_count),
            failure_count = COALESCE(${updates.failureCount}, failure_count),
            status = COALESCE(${updates.status}, status),
            error_log = ${JSON.stringify(finalErrorLog)},
            updated_at = ${now}
        WHERE id = ${id}
    `;

    return { success: true };
}

export async function getActiveBatchJobs() {
    const auth = await requireAdminSession();

    const jobs = await sql`
        SELECT 
            id, user_id as "userId", filename, type, status, 
            total_items as "totalItems", processed_items as "processedItems", 
            success_count as "successCount", failure_count as "failureCount",
            error_log as "errorLog", data_payload as "dataPayload",
            created_at as "createdAt", updated_at as "updatedAt"
        FROM batch_uploads 
        WHERE user_id = ${auth.user.id} 
        AND status IN ('pending', 'processing')
        ORDER BY created_at DESC
    `;

    return jobs as BatchJob[];
}

export async function finishBatchJob(id: string, finalStatus: 'completed' | 'failed') {
    await requireAdminSession();
    const now = new Date().toISOString();
    await sql`
        UPDATE batch_uploads 
        SET status = ${finalStatus}, updated_at = ${now}
        WHERE id = ${id}
    `;
    return { success: true };
}

export async function deleteBatchJob(id: string) {
    await requireAdminSession();
    await sql`DELETE FROM batch_uploads WHERE id = ${id}`;
    return { success: true };
}
