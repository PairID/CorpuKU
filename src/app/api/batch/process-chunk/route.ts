import { NextRequest, NextResponse } from "next/server";
import { processBatchJobChunk } from "@/app/actions/bangkom";

import { requireAdminSession } from "@/app/actions/auth";

export async function POST(req: NextRequest) {
    try {
        try {
            await requireAdminSession();
        } catch {
            return NextResponse.json({ success: false, message: "Unauthorized. Admin role required." }, { status: 401 });
        }

        const body = await req.json();
        const { jobId, limit } = body;

        if (!jobId) {
            return NextResponse.json({ success: false, message: "Missing jobId parameter" }, { status: 400 });
        }

        const result = await processBatchJobChunk(jobId, limit || 100);

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json(result, { status: 500 });
        }
    } catch (error: unknown) {
        console.error("API Batch Process Chunk Error:", error);
        return NextResponse.json({ success: false, message: "Gagal memproses batch." }, { status: 500 });
    }
}
