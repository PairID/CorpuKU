import { NextRequest, NextResponse } from "next/server";
import { getBatchJobDetails } from "@/app/actions/bangkom";

import { requireAdminSession } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
    try {
        try {
            await requireAdminSession();
        } catch {
            return NextResponse.json({ success: false, message: "Unauthorized. Admin role required." }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const jobId = searchParams.get("jobId");

        if (!jobId) {
            return NextResponse.json({ success: false, message: "Missing jobId parameter" }, { status: 400 });
        }

        const details = await getBatchJobDetails(jobId);

        if (details) {
            return NextResponse.json({ success: true, ...details });
        } else {
            return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 });
        }
    } catch (error: unknown) {
        console.error("API Batch Details Error:", error);
        return NextResponse.json({ success: false, message: "Gagal mengambil detail batch." }, { status: 500 });
    }
}
